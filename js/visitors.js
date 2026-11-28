import { clearPath, exitDistance, makeField, nearestCell, pursue, walkOut } from "./navigation.js";
import { door, isWalkable, nearFree, player } from "./room.js";

const visitDuration = 10;
const handshakeDuration = 0.9;
const elderLine = "Ну и зачем ты это сделал? Оно же работало";

function handshakePlaces(near) {
  for (const [dx, dy] of [[9, 0], [0, 9]]) {
    const first = { x: near.x - dx, y: near.y - dy };
    const second = { x: near.x + dx, y: near.y + dy };
    if (isWalkable(first.x, first.y, 6) && clearPath(first, second, 6)) return [first, second];
  }
  return [near, near];
}

export function createVisitors(state, { hitPlayer, onNotice, burst }) {
  let chase;

  function remove(visitor) {
    state.visitors.splice(state.visitors.indexOf(visitor), 1);
  }

  function call(kind, view) {
    const target = nearFree(player.x + 17, player.y + 10, 6) ?? nearFree(player.x, player.y, 6);
    if (!target) return;
    const field = makeField(nearestCell(target.x, target.y));
    const distance = point => Math.hypot(point.x - target.x, point.y - target.y)
      + Math.max(0, point.y - target.y) * 0.4
      + (state.visitors.some(visitor => Math.hypot(point.x - visitor.x, point.y - visitor.y) < 26) ? 90 : 0);
    const candidates = [0.17, 0.4, 0.67, 0.87].flatMap(ratio => [
      [view.x - 56, view.y + view.h * ratio],
      [view.x + view.w + 56, view.y + view.h * ratio],
      [view.x + view.w * ratio, view.y - 54],
      [view.x + view.w * ratio, view.y + view.h + 42],
    ]);
    const start = candidates.map(([x, y]) => nearFree(x, y, 6))
      .filter(point => point && field[nearestCell(point.x, point.y)] >= 0
        && (point.x < view.x - 16 || point.x > view.x + view.w + 16
          || point.y < view.y - 4 || point.y > view.y + view.h + 42))
      .sort((a, b) => distance(a) - distance(b))[0]
      ?? nearFree(player.x - 34, player.y - 25, 6) ?? target;
    const visitor = {
      ...start, kind, radius: 6, stride: 0, phase: "visit", target, remaining: visitDuration,
      labelUntil: 0,
    };
    if (kind === "elder") {
      visitor.hp = 1;
      visitor.damage = state.outfitRemaining > 0 ? 25 : 1;
    }
    state.visitors.push(visitor);
    if (kind !== "elder" || state.handshake) return;

    const linus = state.visitors.find(actor => actor.kind === "visitor" && !actor.metElder);
    if (!linus) return;
    if (linus.phase === "exit") Object.assign(linus, door);
    linus.phase = visitor.phase = "meeting";
    const [left, right] = handshakePlaces(nearFree(player.x + 45, player.y + 12, 6) ?? target);
    const [linusTarget, elderTarget] = linus.x <= visitor.x ? [left, right] : [right, left];
    state.handshake = { linus, elder: visitor, linusTarget, elderTarget };
  }

  function follow(actor, target, elapsed, speed) {
    actor.facingX = target.x;
    const cell = nearestCell(target.x, target.y);
    if (actor.targetCell !== cell) {
      actor.targetCell = cell;
      actor.field = makeField(cell);
    }
    if (pursue(actor, target, actor.field, speed * elapsed)) actor.stride += elapsed * 11;
  }

  function advanceElder(elder, elapsed) {
    const target = nearFree(player.x, player.y, elder.radius);
    if (state.dead || Math.hypot(elder.x - player.x, elder.y - player.y) > 17) {
      if (target) follow(elder, target, elapsed, 122);
      return;
    }
    if (elder.phase === "visit") {
      elder.phase = "swing";
      elder.swingAt = state.time + 0.5;
      elder.labelUntil = state.time + 2.5;
      onNotice(elderLine);
    } else if (state.time >= elder.swingAt) {
      hitPlayer(elder.damage, { ignoreProtection: true, ignoreArmor: true });
      elder.swingUntil = state.time + 0.24;
      elder.phase = "door";
    }
  }

  function advanceVisit(visitor, elapsed, sceneElapsed) {
    const remaining = visitor.remaining;
    visitor.remaining -= sceneElapsed;
    const distance = exitDistance(visitor);
    if (visitor.phase !== "exit" && distance > 160 * visitor.remaining) visitor.phase = "door";
    if (visitor.phase === "exit" || visitor.phase === "door") {
      const speed = distance / Math.max(elapsed, remaining);
      if (walkOut(visitor, elapsed, speed) || visitor.remaining <= 1e-6) remove(visitor);
    } else if (visitor.kind === "elder") {
      advanceElder(visitor, elapsed);
    } else if (Math.hypot(visitor.x - visitor.target.x, visitor.y - visitor.target.y) < 8) {
      visitor.phase = "door";
      visitor.labelUntil = state.time + 2.5;
      onNotice("Линус Торвальдс прошёл мимо. Ядро в порядке.");
    } else {
      follow(visitor, visitor.target, elapsed, 101);
    }
  }

  function endHandshake() {
    const { linus, elder } = state.handshake;
    for (const actor of [linus, elder]) {
      actor.phase = "door";
      actor.remaining = Math.max(2.5, actor.remaining);
    }
    state.handshake = null;
  }

  function advanceHandshake(elapsed) {
    if (!state.handshake) return;
    const { linus, elder, started, linusTarget, elderTarget } = state.handshake;
    if (started !== undefined) {
      if (state.time - started < handshakeDuration) return;
      linus.metElder = true;
      endHandshake();
      state.coins += 250;
      onNotice("Линус Торвальдс и старик пожали руки · +250 монет");
      return;
    }
    if (Math.hypot(linus.x - linusTarget.x, linus.y - linusTarget.y) < 2
      && Math.hypot(elder.x - elderTarget.x, elder.y - elderTarget.y) < 2) {
      state.handshake.started = state.time;
      linus.labelUntil = elder.labelUntil = state.time + handshakeDuration;
      return;
    }
    follow(linus, linusTarget, elapsed, 154);
    follow(elder, elderTarget, elapsed, 145);
  }

  function startChase() {
    const elder = state.visitors.find(visitor => visitor.kind === "elder"
      && visitor.phase !== "meeting" && visitor.phase !== "exit");
    if (!elder) return;
    const canFlee = actor => actor.kind === "furry" && actor.phase !== "exit";
    const actors = state.allies.some(canFlee) ? state.allies : state.robots;
    const furry = actors.find(canFlee);
    if (!furry) return;
    elder.phase = "chase";
    furry.phase = "door";
    chase = { elder, furry, actors, furryExited: false, elderExited: false };
    onNotice("Старик погнался за фурри");
  }

  function advanceChase(elapsed) {
    if (!chase) startChase();
    if (!chase) return;
    const { elder, furry, actors } = chase;
    if (!chase.furryExited) {
      const index = actors.indexOf(furry);
      if (index < 0) {
        elder.phase = "door";
        chase = undefined;
        return;
      }
      if (walkOut(furry, elapsed, 205)) {
        actors.splice(index, 1);
        chase.furryExited = true;
      }
    }
    if (state.visitors.includes(elder)) {
      if (furry.phase === "door") {
        if (Math.hypot(elder.x - furry.x, elder.y - furry.y) > 18) follow(elder, furry, elapsed, 226);
        return;
      }
      if (elder.phase === "chase") elder.phase = "door";
      if (walkOut(elder, elapsed, 226)) {
        remove(elder);
        chase.elderExited = true;
      }
    }
    if (chase.furryExited && !state.visitors.includes(elder)) {
      if (chase.elderExited) {
        state.coins += 150;
        onNotice("Старик и фурри скрылись за дверью · +150 монет");
      }
      chase = undefined;
    }
  }

  function damageFromGentoo(blast) {
    for (const elder of state.visitors.filter(visitor => visitor.kind === "elder")) {
      if (Math.hypot(elder.x - blast.x, elder.y - blast.y) > blast.radius) continue;
      elder.hp = 0;
      if (state.handshake?.elder === elder) endHandshake();
      remove(elder);
      burst(elder.x, elder.y - 12, ["#ede2c7", "#d58c62", "#6e6455"], 24, 93);
      onNotice("Старика задел взрыв Gentoo", true);
    }
  }

  function update(elapsed, sceneElapsed) {
    advanceHandshake(elapsed);
    advanceChase(elapsed);
    for (const visitor of [...state.visitors]) {
      if (visitor.phase !== "meeting" && visitor !== chase?.elder) advanceVisit(visitor, elapsed, sceneElapsed);
    }
  }

  return { call, update, damageFromGentoo, isFleeing: actor => chase?.furry === actor };
}
