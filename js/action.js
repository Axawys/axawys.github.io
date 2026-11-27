import { gunRay } from "./pixels.js";
import { door, height, isWalkable, moveBody, player, width } from "./room.js";
import { makeField, nearestCell, pursue } from "./navigation.js";

const robotTypes = {
  spider: { radius: 5, hitRadius: 10, eye: 8, hp: 65, speed: 88, damage: 24, color: "#ff947a" },
  walker: { radius: 6, hitRadius: 15, eye: 21, hp: 120, speed: 70, damage: 38, color: "#f6c786" },
  swarm: { radius: 3, hitRadius: 6, eye: 4, hp: 20, speed: 87, damage: 12, color: "#e6ac76" },
};

function nearFree(x, y, radius) {
  if (isWalkable(x, y, radius)) return { x, y };
  for (let distance = 8; distance <= 56; distance += 8) {
    for (let index = 0; index < 8; index++) {
      const angle = index * Math.PI / 4;
      const point = { x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance };
      if (isWalkable(point.x, point.y, radius)) return point;
    }
  }
  return null;
}

export function createAction() {
  const state = {
    time: 0, aim: { x: player.x, y: player.y - 48, visible: false },
    robots: [], particles: [], shocks: [], shots: [], pending: [], visitor: null,
    armed: false, dead: false, invulnerable: 0, shake: 0,
  };
  let reviveIn = 0;
  let reload = 0;
  let playerCell = -1;
  let playerField;
  const doorField = makeField(nearestCell(door.x, door.y));

  function burst(x, y, colors, count, force, smoke = false) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = force * (0.22 + Math.random() * 0.78);
      const life = smoke ? 0.55 + Math.random() * 1.1 : 0.16 + Math.random() * 0.49;
      state.particles.push({
        x: x + Math.random() * 5 - 2, y: y + Math.random() * 5 - 2,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.77,
        size: smoke ? 4 + Math.random() * 9 : 1.4 + Math.random() * 4,
        color: colors[i % colors.length], life, total: life, smoke,
      });
    }
  }

  function shock(x, y, radius, color, duration) {
    state.shocks.push({ x, y, radius, color, life: duration, total: duration });
  }

  function hitPlayer(damage, fatal = false) {
    if (state.dead || (state.invulnerable > 0 && !fatal)) return;
    player.hp = Math.max(0, player.hp - damage);
    state.invulnerable = 0.65;
    state.shake = Math.max(state.shake, 0.22);
    if (player.hp > 0) return;

    state.dead = true;
    reviveIn = fatal ? 1.55 : 1.2;
    player.moving = false;
    burst(player.x, player.y - 6, ["#f9ce9a", "#d6815f", "#884a42"], 18, 65);
  }

  function respawn() {
    const hazards = [{ ...player }, ...state.robots, ...state.pending.map(event => event.station)];
    let point;
    let clearance = -1;
    for (let attempt = 0; attempt < 90; attempt++) {
      const x = 29 + Math.random() * (width - 58);
      const y = 58 + Math.random() * (height - 109);
      if (!isWalkable(x, y, player.radius + 2)) continue;
      const distance = Math.min(...hazards.map(hazard => Math.hypot(x - hazard.x, y - hazard.y)));
      if (distance > clearance) {
        point = { x, y };
        clearance = distance;
        if (distance > 140) break;
      }
    }
    Object.assign(player, point ?? { x: 490, y: 471 }, { hp: 100, moving: false, facing: "north" });
    state.dead = false;
    state.invulnerable = 1.25;
    state.shake = 0;
  }

  function callVisitor(view) {
    const candidates = [];
    for (const ratio of [0.17, 0.4, 0.67, 0.87]) {
      candidates.push(
        { x: view.x - 56, y: view.y + view.h * ratio },
        { x: view.x + view.w + 56, y: view.y + view.h * ratio },
        { x: view.x + view.w * ratio, y: view.y - 54 },
        { x: view.x + view.w * ratio, y: view.y + view.h + 42 },
      );
    }
    const target = nearFree(player.x + 17, player.y + 10, 6) ?? nearFree(player.x, player.y, 6);
    const field = makeField(nearestCell(target.x, target.y));
    const start = candidates
      .map(({ x, y }) => nearFree(x, y, 6))
      .filter(point => point && field[nearestCell(point.x, point.y)] >= 0
        && (point.x < view.x - 16 || point.x > view.x + view.w + 16
          || point.y < view.y - 4 || point.y > view.y + view.h + 42))
      .sort((a, b) => (Math.hypot(a.x - target.x, a.y - target.y) + Math.max(0, a.y - target.y) * 0.4)
        - (Math.hypot(b.x - target.x, b.y - target.y) + Math.max(0, b.y - target.y) * 0.4))[0];
    if (!start) return;
    state.visitor = { ...start, radius: 6, stride: 0, phase: "visit", target, field, labelUntil: 0 };
  }

  function trigger(event, station, view) {
    if (event === "visitor") {
      callVisitor(view);
      return;
    }
    station.busy = true;
    state.pending.push({ event, station, remaining: event === "explosion" ? 0.48 : 0.32 });
  }

  function finishEvent({ event, station }) {
    station.offline = true;
    const { x, y } = station;
    if (event === "explosion") {
      shock(x, y + 5, 106, "#ffb86b", 0.67);
      shock(x, y + 4, 65, "#ffe1a2", 0.4);
      burst(x, y - 5, ["#fff1bb", "#ffc277", "#ff914f", "#de673c", "#6e4a3e"], 107, 265);
      burst(x, y + 2, ["#554b46", "#716054", "#353c38"], 35, 75, true);
      hitPlayer(100, true);
      state.shake = 1;
      return;
    }

    const kind = robotTypes[event];
    const count = event === "swarm" ? 8 : 1;
    for (let index = 0; index < count; index++) {
      const offset = (index - (count - 1) / 2) * 11;
      const point = nearFree(x + offset, y + 44 + index % 3 * 8, kind.radius);
      if (!point) continue;
      const speed = kind.speed + (count > 1 ? (index % 4) * 4 - 6 : 0);
      state.robots.push({ ...kind, ...point, kind: event, speed, stride: 0, flash: 0, ready: state.time + 0.45 });
    }
    shock(x, y + 16, 43, kind.color, 0.35);
    burst(x, y + 5, [kind.color, "#efcd9d", "#8c6b5d"], count * 5 + 20, 116);
    state.shake = Math.max(0.27, state.shake);
    if (event === "spider") state.armed = true;
  }

  function advanceVisitor(elapsed) {
    const visitor = state.visitor;
    if (!visitor) return;
    if (visitor.phase === "exit") {
      visitor.y += 101 * elapsed;
      if (visitor.y > height + 28) state.visitor = null;
    } else {
      const { target, field } = visitor;
      const distance = Math.hypot(visitor.x - target.x, visitor.y - target.y);
      if (distance < 8) {
        if (visitor.phase === "visit") {
          visitor.phase = "door";
          visitor.target = door;
          visitor.field = doorField;
          visitor.labelUntil = state.time + 2.5;
        } else {
          visitor.x = door.x;
          visitor.phase = "exit";
        }
      }
      pursue(visitor, visitor.target, visitor.field, 101 * elapsed);
    }
    visitor.stride += elapsed * 11;
  }

  function advanceRobots(elapsed) {
    const target = nearestCell(player.x, player.y);
    if (target !== playerCell || !playerField) {
      playerCell = target;
      playerField = makeField(target);
    }
    for (const robot of state.robots) {
      if (state.time < robot.ready) continue;
      const gap = Math.hypot(player.x - robot.x, player.y - robot.y);
      if (gap < robot.radius + player.radius + 1) {
        hitPlayer(robot.damage);
        continue;
      }
      if (pursue(robot, player, playerField, robot.speed * elapsed)) robot.stride += elapsed * 13;
    }
    for (let i = 0; i < state.robots.length; i++) {
      const first = state.robots[i];
      for (let j = i + 1; j < state.robots.length; j++) {
        const second = state.robots[j];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const gap = Math.hypot(dx, dy);
        const overlap = first.radius + second.radius + 6 - gap;
        if (overlap <= 0) continue;
        const push = Math.min(overlap / 2, 31 * elapsed);
        const x = gap > 0.01 ? push * dx / gap : push;
        const y = gap > 0.01 ? push * dy / gap : 0;
        moveBody(first, -x, -y);
        moveBody(second, x, y);
      }
    }
  }

  function fire() {
    const { x, y, dx, dy, muzzleX, muzzleY } = gunRay(player, state.aim);
    let range = 560;
    let obstacleDistance = 0;
    for (let step = 3; step < range; step += 3) {
      if (!isWalkable(x + dx * step, y + dy * step + 9, 0)) {
        obstacleDistance = step;
        break;
      }
    }
    if (obstacleDistance) range = obstacleDistance;

    let victim;
    for (const robot of state.robots) {
      const vx = robot.x - x;
      const vy = robot.y - robot.eye - y;
      const longitudinal = vx * dx + vy * dy;
      const lateral = Math.abs(vx * dy - vy * dx);
      if (longitudinal < 0 || longitudinal > range || lateral > robot.hitRadius) continue;
      range = longitudinal;
      victim = robot;
    }

    const endX = x + dx * range;
    const endY = y + dy * range;
    state.shots.push({ x: muzzleX, y: muzzleY, endX, endY, life: 0.075 });
    if (victim) {
      victim.flash = state.time + 0.11;
      victim.hp -= 24;
      burst(endX, endY, [victim.color, "#ffe6b1"], 8, 83);
      if (victim.hp <= 0) {
        state.robots.splice(state.robots.indexOf(victim), 1);
        shock(victim.x, victim.y - 3, 22, victim.color, 0.22);
        burst(victim.x, victim.y - victim.eye, ["#d9c491", "#f5a46b", "#687e72"], 16, 95);
      }
    } else if (obstacleDistance) {
      burst(endX, endY, ["#fedcab", "#877d5e"], 4, 56);
    }
    reload = 0.105;
  }

  function update(elapsed, shooting) {
    state.time += elapsed;
    state.invulnerable = Math.max(0, state.invulnerable - elapsed);
    state.shake = Math.max(0, state.shake - elapsed * 2.7);
    reload -= elapsed;
    for (const event of state.pending) {
      event.remaining -= elapsed;
      if (event.remaining <= 0) finishEvent(event);
    }
    state.pending = state.pending.filter(event => event.remaining > 0);

    for (const particle of state.particles) {
      particle.x += particle.vx * elapsed;
      particle.y += particle.vy * elapsed;
      particle.vx *= 1 - elapsed * 1.9;
      particle.vy += (particle.smoke ? -25 : 190) * elapsed;
    }
    for (const list of [state.particles, state.shocks, state.shots]) {
      for (const effect of list) effect.life -= elapsed;
    }
    state.particles = state.particles.filter(particle => particle.life > 0);
    state.shocks = state.shocks.filter(effect => effect.life > 0);
    state.shots = state.shots.filter(shot => shot.life > 0);
    advanceVisitor(elapsed);

    if (state.dead) {
      reviveIn -= elapsed;
      if (reviveIn <= 0) {
        respawn();
        return true;
      }
      return false;
    }
    if (state.armed && shooting && reload <= 0) fire();
    if (state.robots.length) advanceRobots(elapsed);
    return false;
  }

  return { state, trigger, update };
}
