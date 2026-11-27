import { door, height, isWalkable, moveBody, player, width } from "./room.js";
import { makeField, nearestCell, pursue } from "./navigation.js";
import { tasks } from "./tasks.js";
import { createWeapons } from "./weapons.js";

const robotTypes = {
  spider: { name: "Паук Ubuntu", radius: 5, hitRadius: 10, eye: 8, maxHp: 110, speed: 88, damage: 24, color: "#ff947a" },
  walker: { name: "Робот ALT Linux", radius: 6, hitRadius: 15, eye: 21, maxHp: 192, speed: 70, damage: 38, color: "#f6c786" },
  swarm: { name: "ИИ-агент", radius: 3, hitRadius: 6, eye: 4, maxHp: 44, speed: 87, damage: 12, color: "#e6ac76" },
  agent: { radius: 6, hitRadius: 15, eye: 13, maxHp: 144, speed: 74, damage: 25 },
  furry: { name: "Фурри", radius: 6, hitRadius: 13, eye: 17, maxHp: 156, speed: 98, damage: 28, color: "#a8c8ff" },
};

const gentooOverheat = 2;
const gentooFire = 3;
const gentooRadius = 106;
const celebrationDuration = 10;
const fireworkColors = ["#ffb578", "#92c9ff", "#f7dc8e", "#e9a1df", "#9af0bd"];

const swarmMembers = [
  { kind: "agent", name: "Claude Code", color: "#f3ae91", dx: -47, dy: 43 },
  { kind: "agent", name: "Codex", color: "#c3acf5", dx: 0, dy: 48 },
  { kind: "agent", name: "Cursor", color: "#8adad1", dx: 47, dy: 43 },
  ...Array.from({ length: 7 }, (_, index) => ({
    kind: "swarm", dx: (index - 3) * 13, dy: 59 + index % 2 * 11,
  })),
];

const eventText = {
  spider: "Canonical негодует",
  walker: "Вы потревожили РКН",
  swarm: "На вас напали ИИ-агенты",
  furry: "Пушистая ярость",
  visitor: "Линус Торвальдс прошёл мимо. Ядро в порядке.",
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

export function createAction(onNotice = () => {}, onCelebrated = () => {}) {
  const state = {
    time: 0, aim: { x: player.x, y: player.y - 48, visible: false },
    robots: [], particles: [], shocks: [], shots: [], projectiles: [], pending: [], visitor: null,
    dead: false, invulnerable: 0, shake: 0, celebration: null, medal: false,
    get ammo() { return arsenal.ammo; },
    get weapon() { return arsenal.equipped; },
    get armed() { return !this.dead && this.robots.length > 0; },
  };
  let reviveIn = 0;
  const arsenal = createWeapons(state, player, burst, shock);
  let playerCell = -1;
  let playerField;
  const queuedVisitors = [];
  const encountered = new Set();
  let celebrated = false;
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
    arsenal.refill();
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
    encountered.add(event);
    if (event === "visitor") {
      if (state.visitor) queuedVisitors.push(view);
      else callVisitor(view);
      return;
    }
    station.busy = true;
    if (event === "explosion") {
      state.pending.push({
        event, station, phase: "overheat", remaining: gentooOverheat + gentooFire,
        blast: { x: station.x, y: station.y + 5, radius: gentooRadius },
      });
    } else {
      state.pending.push({ event, station, remaining: 0.32 });
    }
  }

  function finishEvent({ event, station, blast }) {
    station.offline = true;
    const { x, y } = station;
    if (event === "explosion") {
      shock(blast.x, blast.y, blast.radius, "#ffb86b", 0.67);
      shock(x, y + 4, 65, "#ffe1a2", 0.4);
      burst(x, y - 5, ["#fff1bb", "#ffc277", "#ff914f", "#de673c", "#6e4a3e"], 107, 265);
      burst(x, y + 2, ["#554b46", "#716054", "#353c38"], 35, 75, true);
      const distance = Math.hypot(player.x - blast.x, player.y - blast.y);
      if (distance <= blast.radius) hitPlayer(100, true);
      const shake = Math.min(1, Math.max(0, 1 - (distance - blast.radius) / 130));
      state.shake = Math.max(state.shake, shake);
      return;
    }

    const frontOffset = event === "furry" ? (player.x < x ? 25 : -25) : 0;
    const members = event === "swarm" ? swarmMembers : [{ kind: event, dx: frontOffset, dy: 44 }];
    for (const [index, { kind, dx, dy, ...identity }] of members.entries()) {
      const type = robotTypes[kind];
      const point = nearFree(x + dx, y + dy, type.radius);
      if (!point) continue;
      const speed = type.speed + (kind === "swarm" ? (index % 4) * 4 - 6 : 0);
      state.robots.push({ ...type, ...identity, ...point, kind, speed, hp: type.maxHp, stride: 0, flash: 0, ready: state.time + 0.45 });
    }
    const color = robotTypes[event].color;
    shock(x, y + 16, 43, color, 0.35);
    burst(x, y + 5, [color, "#efcd9d", "#8c6b5d"], members.length * 5 + 20, 116);
    state.shake = Math.max(0.27, state.shake);
    onNotice(eventText[event], true);
  }

  function advanceVisitor(elapsed) {
    const visitor = state.visitor;
    if (!visitor) return;
    if (visitor.phase === "exit") {
      visitor.y += 101 * elapsed;
      if (visitor.y > height + 28) {
        state.visitor = null;
        if (queuedVisitors.length) callVisitor(queuedVisitors.shift());
      }
    } else {
      const { target, field } = visitor;
      const distance = Math.hypot(visitor.x - target.x, visitor.y - target.y);
      if (distance < 8) {
        if (visitor.phase === "visit") {
          visitor.phase = "door";
          visitor.target = door;
          visitor.field = doorField;
          visitor.labelUntil = state.time + 2.5;
          onNotice(eventText.visitor);
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
        if (robot.kind === "furry" && !state.invulnerable && !state.dead) robot.attackUntil = state.time + 0.19;
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

  function advanceCelebration(elapsed) {
    if (celebrated) return;
    if (!state.celebration) {
      if (encountered.size !== tasks.length || state.dead || state.robots.length
        || state.pending.length || state.visitor || queuedVisitors.length) return;
      state.celebration = { elapsed: 0, nextLaunch: 0, launches: [], count: 0 };
      elapsed = 0;
    }
    const show = state.celebration;
    show.elapsed += elapsed;
    if (show.elapsed >= celebrationDuration) {
      state.celebration = null;
      state.medal = true;
      celebrated = true;
      onCelebrated();
      return;
    }

    show.launches = show.launches.filter(launch => show.elapsed - launch.start < 1.45);
    while (show.nextLaunch <= show.elapsed && show.nextLaunch < celebrationDuration - 0.6) {
      const side = show.count % 2 ? 1 : -1;
      const x = Math.max(32, Math.min(width - 32, player.x + side * (29 + Math.random() * 53)));
      const y = Math.max(57, Math.min(height - 52, player.y - 63 + Math.random() * 82));
      show.launches.push({
        x, y, start: show.nextLaunch, radius: 26 + Math.random() * 17,
        color: fireworkColors[show.count % fireworkColors.length], spin: Math.random(),
      });
      show.count++;
      show.nextLaunch += 0.44;
    }
  }

  function update(elapsed, holding, pressed = false, sceneElapsed = elapsed) {
    state.time += elapsed;
    state.invulnerable = Math.max(0, state.invulnerable - elapsed);
    state.shake = Math.max(0, state.shake - elapsed * 2.7);
    for (const event of state.pending) {
      event.remaining -= event.blast ? sceneElapsed : elapsed;
      if (event.remaining <= 0) finishEvent(event);
      else if (event.phase === "overheat" && event.remaining <= gentooFire) event.phase = "fire";
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
    arsenal.update(elapsed, holding, pressed);
    advanceCelebration(sceneElapsed);

    if (state.dead) {
      reviveIn -= elapsed;
      if (reviveIn <= 0) {
        respawn();
        return true;
      }
      return false;
    }
    if (state.robots.length) advanceRobots(elapsed);
    return false;
  }

  return { state, trigger, update, cycleWeapon: arsenal.cycle, selectWeapon: arsenal.select };
}
