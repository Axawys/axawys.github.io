import { gunRay } from "./pixels.js";
import { isWalkable } from "./room.js";

export const weapons = [
  { id: "pistol", kind: "bullet", name: "Пистолет", capacity: Infinity, length: 8, thickness: 2, color: "#d8d6bd", range: 430, damage: 38, cooldown: 0.26 },
  { id: "launcher", kind: "rocket", name: "Гранатомёт", capacity: 20, length: 18, thickness: 5, color: "#d7a67d", range: 320, radius: 44, damage: 108, cooldown: 0.7, shop: { rounds: 3, cost: 12 } },
  { id: "grenade", kind: "grenade", name: "Гранаты", capacity: 6, length: 7, color: "#aaca88", range: 155, radius: 55, damage: 128, cooldown: 0.78, shop: { rounds: 2, cost: 12 } },
  { id: "flame", kind: "flame", name: "Огнемёт", capacity: 40, length: 15, thickness: 4, color: "#f9b06e", range: 96, damage: 12, cooldown: 0.09, automatic: true, shop: { rounds: 12, cost: 10 } },
  { id: "rifle", kind: "bullet", name: "Автомат", capacity: 50, length: 13, thickness: 3, color: "#a8b7a5", range: 560, damage: 24, cooldown: 0.105, automatic: true, shop: { rounds: 20, cost: 12 } },
  { id: "bfg", kind: "rocket", name: "BFG", capacity: 1, refillable: false, length: 21, thickness: 6, color: "#9aee8f", range: 440, radius: 150, damage: 10000, cooldown: 0.9 },
];

const burnDuration = 3;
const burnInterval = 0.5;
const burnDamage = 18;
const flameStartWidth = 8;
const flameSpread = 0.31;

// Bounds relative to the sprite's feet, including the outer frames of its walk cycle.
const hitboxes = {
  spider: [[-17, -21, 17, 7]],
  walker: [[-16, -34, 16, 4]],
  swarm: [[-14, -15, 14, 7]],
  agent: [[-25, -27, 25, 7]],
  furry: [[-11, -37, 11, 3], [5, -22, 22, 1]],
  homingRocket: [[-8, -7, 8, 7]],
  server: [[-13, -22, 13, 15]],
};

export function traceHitbox({ dx, dy }, left, top, right, bottom, range) {
  if ((dx === 0 && (left > 0 || right < 0)) || (dy === 0 && (top > 0 || bottom < 0))) return null;
  let entry = 0;
  let exit = range;
  if (dx !== 0) {
    const first = left / dx;
    const second = right / dx;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }
  if (dy !== 0) {
    const first = top / dy;
    const second = bottom / dy;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }
  return entry <= exit ? entry : null;
}

function flameOverlaps({ dx, dy }, left, top, right, bottom, range) {
  const farWidth = flameStartWidth + range * flameSpread;
  const endX = range * dx;
  const endY = range * dy;
  const offsetX = Math.abs(dy);
  const offsetY = Math.abs(dx);
  if (right < Math.min(-offsetX * flameStartWidth, endX - offsetX * farWidth)
    || left > Math.max(offsetX * flameStartWidth, endX + offsetX * farWidth)
    || bottom < Math.min(-offsetY * flameStartWidth, endY - offsetY * farWidth)
    || top > Math.max(offsetY * flameStartWidth, endY + offsetY * farWidth)) return false;

  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const halfWidth = (right - left) / 2;
  const halfHeight = (bottom - top) / 2;
  const depth = centerX * dx + centerY * dy;
  const depthExtent = halfWidth * offsetY + halfHeight * offsetX;
  if (depth + depthExtent < 0 || depth - depthExtent > range) return false;

  // A rectangle must overlap both sloping sides of the flame cone.
  for (const side of [-1, 1]) {
    const normalX = -dy * side - dx * flameSpread;
    const normalY = dx * side - dy * flameSpread;
    const nearest = centerX * normalX + centerY * normalY - halfWidth * Math.abs(normalX) - halfHeight * Math.abs(normalY);
    if (nearest > flameStartWidth) return false;
  }
  return true;
}

export function wallDistance(x, y, dx, dy, range, ignoredObstacle) {
  const steps = Math.max(1, Math.ceil(range / 3));
  const step = range / steps;
  for (let i = 1; i <= steps; i++) {
    if (!isWalkable(x + dx * step * i, y + dy * step * i, 0, ignoredObstacle)) return step * (i - 1);
  }
  return range;
}

export function createWeapons(state, player, burst, shock, damageAlly = () => {}, onDestroyed = () => {}) {
  const owned = weapons.map(weapon => weapon.id === "pistol");
  const ammo = weapons.map((weapon, index) => owned[index] ? weapon.capacity : 0);
  let selected = 0;
  let cooldown = 0;

  function refill() {
    for (const [index, weapon] of weapons.entries()) {
      if (owned[index] && weapon.refillable !== false) ammo[index] = weapon.capacity;
    }
    cooldown = 0;
  }

  function collect(index, rounds, unlock) {
    const newlyOwned = Boolean(unlock && !owned[index]);
    const gained = Math.min(rounds, weapons[index].capacity - ammo[index]);
    if (!newlyOwned && gained <= 0) return null;
    if (newlyOwned) owned[index] = true;
    ammo[index] += gained;
    return { newlyOwned, rounds: gained };
  }

  function select(index) {
    if (!state.armed || !Number.isInteger(index) || !owned[index]) return;
    selected = index;
  }

  function cycle(direction) {
    if (!direction || !state.armed) return;
    const step = Math.sign(direction);
    let next = selected;
    do {
      next = (next + step + weapons.length) % weapons.length;
    } while (!owned[next]);
    select(next);
  }

  function damageRobot(robot, damage, x, y, { colors = [robot.color, "#ffe6b1"], finish = false } = {}) {
    if (robot.reviveAt && !finish) return;
    robot.flash = state.time + 0.11;
    robot.hp = Math.max(0, robot.hp - damage);
    burst(x, y, colors, 8, 83);
    if (robot.hp > 0) return;

    if (robot.phase === 1 && !finish) {
      robot.reviveAt = state.time + 1;
      delete robot.burn;
      burst(robot.x, robot.y - robot.eye, ["#ed9e6f", "#81928a"], 12, 50);
      return;
    }

    state.robots.splice(state.robots.indexOf(robot), 1);
    shock(robot.x, robot.y - 3, 22, robot.color, 0.22);
    burst(robot.x, robot.y - robot.eye, ["#d9c491", "#f5a46b", "#687e72"], 16, 95);
    onDestroyed(robot);
  }

  function damageServer(server, damage, x, y) {
    if (server.hp <= 0) return;
    server.hp = Math.max(0, server.hp - damage);
    server.flash = state.time + 0.12;
    burst(x, y, ["#ffe2a5", "#91b6a7"], 6, 73);
    if (server.hp > 0) return;

    delete server.burn;
    shock(server.x, server.y, 24, "#ffba85", 0.32);
    burst(server.x, server.y - 9, ["#ffbf76", "#687f75", "#cf8662"], 26, 94);
    burst(server.x, server.y - 6, ["#64736a", "#3b4941"], 8, 45, true);
    onDestroyed(server);
  }

  function damageRocket(rocket, damage) {
    rocket.hp = Math.max(0, rocket.hp - damage);
    if (rocket.hp > 0) {
      rocket.flash = state.time + 0.12;
      burst(rocket.x, rocket.y, ["#ffd5a2", "#ff936f"], 5, 60);
      return;
    }
    state.hostileRockets.splice(state.hostileRockets.indexOf(rocket), 1);
    shock(rocket.x, rocket.y, 18, "#ffab85", 0.28);
    burst(rocket.x, rocket.y, ["#fff1bd", "#ff936f", "#9f5c56"], 18, 108);
  }

  function damageTarget(target, damage, x, y, options) {
    if (target.kind === "homingRocket") damageRocket(target, damage);
    else if (target.kind === "server") damageServer(target, damage, x, y);
    else damageRobot(target, damage, x, y, options);
  }

  function damageableTargets() {
    return [...state.robots, ...(state.hostileRockets ?? []), ...(state.servers ?? []).filter(server => server.hp > 0)];
  }

  function firstTarget(ray, range, wallLimit, includeDowned = false) {
    let result = null;
    for (const target of damageableTargets()) {
      if (target.reviveAt && !includeDowned) continue;
      const x = Math.round(target.x) - ray.x;
      const y = Math.round(target.y) - ray.y;
      for (const [left, top, right, bottom] of hitboxes[target.kind]) {
        const distance = traceHitbox(ray, x + left, y + top, x + right, y + bottom, range);
        if (distance === null || (result && distance >= range)) continue;
        if (distance > wallLimit && (target.kind !== "server"
          || wallDistance(ray.x, ray.y + 9, ray.dx, ray.dy, distance, target.box) < distance)) continue;
        result = { target, distance };
        range = distance;
      }
    }
    return result;
  }

  function fireBullet(ray, weapon) {
    const { x, y, dx, dy } = ray;
    const limit = wallDistance(x, y + 9, dx, dy, weapon.range);
    const impact = firstTarget(ray, weapon.range, limit);
    const distance = impact?.distance ?? limit;
    const endX = x + dx * distance;
    const endY = y + dy * distance;
    const muzzle = Math.min(weapon.length, distance);
    state.shots.push({
      x: x + dx * muzzle, y: y + dy * muzzle,
      endX, endY, life: 0.075,
    });
    if (impact) damageTarget(impact.target, weapon.damage, endX, endY);
    else if (limit < weapon.range) burst(endX, endY, ["#fedcab", "#877d5e"], 4, 56);
  }

  function explode(x, y, weapon, directHit = null) {
    const bfg = weapon.id === "bfg";
    const colors = bfg ? ["#e9ffd0", "#bbf89c", "#74d983", "#3f9a66"] : ["#fff0bc", "#ffc47d", "#ef8450", "#ba593c"];
    shock(x, y, weapon.radius, bfg ? "#9aee8f" : "#ffbe74", bfg ? 0.9 : 0.43);
    if (bfg) shock(x, y, weapon.radius * 0.64, "#e3ffc0", 0.58);
    burst(x, y - 4, colors, bfg ? 105 : 35, bfg ? 233 : 142);
    burst(x, y, ["#60544b", "#49443d"], bfg ? 15 : 8, 48, true);
    state.shake = Math.max(state.shake, bfg ? 0.75 : 0.32);
    for (const target of damageableTargets()) {
      if (target === directHit) {
        damageTarget(target, weapon.damage, x, y - 9, { finish: bfg });
        continue;
      }
      const dx = target.x - x;
      const dy = target.y + (target.kind === "homingRocket" ? 9 : 0) - y;
      const distance = Math.hypot(dx, dy);
      if (distance > weapon.radius) continue;
      if (!bfg && distance > 1 && wallDistance(x, y, dx / distance, dy / distance, distance, target.box) < distance) continue;
      const damage = bfg ? weapon.damage : Math.round(weapon.damage * (1 - distance / weapon.radius * 0.48));
      damageTarget(target, damage, target.x, target.y - target.eye, { finish: bfg });
    }
    if (bfg) {
      for (const ally of [...(state.allies ?? [])]) {
        if (Math.hypot(ally.x - x, ally.y - y) <= weapon.radius) damageAlly(ally, weapon.damage);
      }
    }
  }

  function launchRocket(ray, weapon) {
    const clear = wallDistance(ray.x, ray.y + 9, ray.dx, ray.dy, weapon.length);
    const near = firstTarget(ray, weapon.length, clear, weapon.id === "bfg");
    if (near || clear < weapon.length) {
      const distance = near?.distance ?? clear;
      explode(ray.x + ray.dx * distance, ray.y + ray.dy * distance + 9, weapon, near?.target);
      return;
    }
    state.projectiles.push({ x: ray.muzzleX, y: ray.muzzleY, dx: ray.dx, dy: ray.dy, remaining: weapon.range, weapon });
  }

  function throwGrenade(weapon) {
    const dx = state.aim.x - player.x;
    const dy = state.aim.y - player.y;
    const aimDistance = Math.hypot(dx, dy);
    const directionX = aimDistance ? dx / aimDistance : 0;
    const directionY = aimDistance ? dy / aimDistance : 0;
    let distance = Math.min(aimDistance, weapon.range);
    let endX = player.x + directionX * distance;
    let endY = player.y + directionY * distance;
    while (distance > 0 && !isWalkable(endX, endY, 1)) {
      distance = Math.max(0, distance - 6);
      endX = player.x + directionX * distance;
      endY = player.y + directionY * distance;
    }
    state.projectiles.push({
      x: player.x, y: player.y, startX: player.x, startY: player.y, endX, endY,
      flight: 0.32 + 0.25 * distance / weapon.range, age: 0, lift: 8, weapon,
    });
  }

  function fireFlame(ray, weapon) {
    const { x, y, dx, dy } = ray;
    for (let i = 0; i < 12; i++) {
      const spread = (Math.random() - 0.5) * 0.64;
      const length = weapon.range * (0.2 + Math.random() * 0.8);
      const angle = Math.atan2(dy, dx) + spread;
      const vx = Math.cos(angle);
      const vy = Math.sin(angle);
      const distance = wallDistance(x, y + 9, vx, vy, length);
      if (distance < 7) continue;
      const life = 0.12 + distance / 560;
      const start = Math.min(weapon.length, distance / 2);
      state.particles.push({
        x: x + vx * start, y: y + vy * start,
        vx: vx * (distance - start) / life, vy: vy * (distance - start) / life,
        size: 3 + Math.random() * 4, life, total: life, smoke: false,
        color: ["#ffe2a0", "#ffb05d", "#ed7647"][i % 3],
      });
    }
    for (const target of damageableTargets()) {
      if (target.reviveAt) continue;
      const vx = target.x - x;
      const spriteX = Math.round(target.x) - x;
      const spriteY = Math.round(target.y) - y;
      if (!hitboxes[target.kind].some(([left, top, right, bottom]) =>
        flameOverlaps(ray, spriteX + left, spriteY + top, spriteX + right, spriteY + bottom, weapon.range))) continue;
      const groundY = target.y + (target.kind === "homingRocket" ? 9 : 0) - player.y;
      const distance = Math.hypot(vx, groundY);
      if (distance > 1 && wallDistance(x, player.y, vx / distance, groundY / distance, distance, target.box) < distance) continue;
      damageTarget(target, weapon.damage, target.x, target.y - target.eye);
      if (target.hp <= 0 || target.kind === "homingRocket") continue;
      target.burn ??= { nextTick: state.time + burnInterval };
      target.burn.until = state.time + burnDuration;
    }
  }

  function advanceBurns() {
    for (const robot of damageableTargets()) {
      const burn = robot.burn;
      if (!burn) continue;
      const end = Math.min(state.time, burn.until);
      while (burn.nextTick <= end + 1e-9 && robot.hp > 0) {
        damageTarget(robot, burnDamage, robot.x, robot.y - robot.eye, { colors: ["#ffd68a", "#ee7541"] });
        burn.nextTick += burnInterval;
      }
      if (state.time >= burn.until) delete robot.burn;
    }
  }

  function advanceProjectile(projectile, elapsed) {
    const { weapon } = projectile;
    if (weapon.kind === "grenade") {
      projectile.age += elapsed;
      const progress = Math.min(1, projectile.age / projectile.flight);
      projectile.x = projectile.startX + (projectile.endX - projectile.startX) * progress;
      projectile.y = projectile.startY + (projectile.endY - projectile.startY) * progress;
      projectile.lift = progress === 1 ? 0 : (1 - progress) * 8 + Math.sin(Math.PI * progress) * 26;
      if (projectile.age < projectile.flight + 0.55) return true;
      explode(projectile.x, projectile.y, weapon);
      return false;
    }

    const { x, y, dx, dy } = projectile;
    const step = Math.min(projectile.remaining, elapsed * 305);
    const clear = wallDistance(x, y + 9, dx, dy, step);
    const impact = firstTarget(projectile, step, clear, weapon.id === "bfg");
    const travel = impact?.distance ?? clear;
    projectile.x += dx * travel;
    projectile.y += dy * travel;
    projectile.remaining -= travel;
    if (!impact && clear === step && projectile.remaining > 0) return true;
    explode(projectile.x, projectile.y + 9, weapon, impact?.target);
    return false;
  }

  function update(elapsed, holding, pressed) {
    cooldown -= elapsed;
    state.projectiles = state.projectiles.filter(projectile => advanceProjectile(projectile, elapsed));
    advanceBurns();
    if (!state.armed || cooldown > 0 || ammo[selected] === 0) return;
    const weapon = weapons[selected];
    if (!pressed && !(holding && weapon.automatic)) return;

    const ray = gunRay(player, state.aim, weapon.length);
    if (ammo[selected] !== Infinity) ammo[selected]--;
    switch (weapon.kind) {
      case "bullet": fireBullet(ray, weapon); break;
      case "rocket": launchRocket(ray, weapon); break;
      case "grenade": throwGrenade(weapon); break;
      case "flame": fireFlame(ray, weapon); break;
    }
    cooldown = weapon.cooldown;
  }

  return { ammo, owned, collect, cycle, damageRobot, damageRocket, damageServer, refill, select, update, get equipped() { return weapons[selected]; } };
}
