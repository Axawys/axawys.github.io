import { height, isWalkable, moveBody, nearFree, networkRacks, player, playerStart, removeWorkstation, supplySpots, tokenComputer, tokenSpots, width } from "./room.js";
import { createHostileFire } from "./hostile-fire.js";
import { clearPath, fieldFor, pursue, walkOut } from "./navigation.js";
import { createVisitors } from "./visitors.js";
import { createWeapons, weapons } from "./weapons.js";

const robotTypes = {
  spider: { name: "Паук Ubuntu", radius: 5, meleeReach: 19, eye: 8, maxHp: 1100, speed: 88, damage: 24, color: "#ff947a", phase: 1, coins: 23, tokens: 22 },
  walker: { name: "Робот ALT Linux", radius: 6, eye: 21, maxHp: 1920, speed: 70, damage: 38, color: "#f6c786", phase: 1, coins: 33, tokens: 32 },
  swarm: { name: "ИИ-агент", radius: 3, meleeReach: 14, eye: 4, maxHp: 440, speed: 87, damage: 12, color: "#e6ac76", coins: 4, tokens: 4 },
  agent: { radius: 6, meleeReach: 24, eye: 13, maxHp: 1440, speed: 74, damage: 25, coins: 16, tokens: 16 },
  furry: { name: "Фурри", radius: 6, eye: 17, maxHp: 500, speed: 98, damage: 28, color: "#a8c8ff", coins: 18 },
};

const gentooOverheat = 2;
const gentooFire = 3;
const gentooRadius = 106;
const gentooMobDamage = 500;
const allyDuration = 60;
const allySpeed = 138;
const allyColor = "#91e6b2";
const allyGift = 8;
const outfitDuration = 30;
const rackRepairTime = 0.85;
const serverHp = 150;
const serverTokens = 10;
export const medkits = [
  { hp: 10, cost: 5 },
  { hp: 25, cost: 10 },
  { hp: 50, cost: 18 },
];
const allyTypes = {
  ally: { kind: "furry", name: "Фурри-союзник", maxHp: 500, side: 1 },
  gigacode: { kind: "agent", name: "gigacode", maxHp: robotTypes.agent.maxHp / 2, side: -1, repairsServers: true },
};
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
};

function availableOffer(quantity, price, space) {
  const available = Math.min(quantity, space);
  return { quantity: available, cost: Math.ceil(price * available / quantity) };
}

export function createAction(onNotice = () => {}, onCelebrated = () => {}) {
  let weaponsUnlocked = false;
  const state = {
    time: 0, aim: { x: player.x, y: player.y - 48, visible: false },
    robots: [], particles: [], shocks: [], shots: [], projectiles: [], pending: [], visitors: [], handshake: null, allies: [],
    hostileBullets: [], hostileRockets: [],
    coins: 0, tokens: 0,
    currencyDrops: tokenSpots.map(spot => ({ ...spot, currency: "tokens", fromX: spot.x, fromY: spot.y, landedAt: 0 })),
    servers: networkRacks.map(rack => ({ ...rack, hp: serverHp, maxHp: serverHp, eye: 9, color: "#80aba5", tokensDropped: 0 })),
    supplies: supplySpots.map(spot => {
      if (!spot.weaponId) return { ...spot };
      const index = weapons.findIndex(weapon => weapon.id === spot.weaponId);
      return { ...spot, index, weapon: weapons[index] };
    }),
    dead: false, invulnerable: 0, shake: 0, celebration: null, medal: false, outfitRemaining: 0,
    get ammo() { return arsenal.ammo; },
    get owned() { return arsenal.owned; },
    get weapon() { return arsenal.equipped; },
    get armed() { return weaponsUnlocked && !this.dead; },
  };
  let reviveIn = 0;
  const arsenal = createWeapons(state, player, burst, shock, damageAlly, dropRobotLoot, dropServerTokens);
  const hostileFire = createHostileFire(state, player, hitPlayer, burst, shock);
  const playerRoute = {};
  const visitors = createVisitors(state, { hitPlayer, onNotice, burst });

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

  function dropCurrency({ x, y }, currency, amount, rotation = Math.random() * Math.PI * 2) {
    const count = Math.min(4, Math.ceil(amount / 8));
    for (let index = 0; index < count; index++) {
      const angle = rotation + index * Math.PI * 2 / count;
      const point = nearFree(x + Math.cos(angle) * 22, y + Math.sin(angle) * 17, 5) ?? nearFree(x, y, 5);
      if (!point) continue;
      const value = Math.floor(amount / count) + (index < amount % count ? 1 : 0);
      state.currencyDrops.push({ ...point, currency, fromX: x, fromY: y, value, landedAt: state.time + 0.25 });
    }
  }

  function dropRobotLoot(robot) {
    const rotation = Math.random() * Math.PI * 2;
    if (robot.coins) dropCurrency(robot, "coins", robot.coins, rotation);
    if (robot.tokens) dropCurrency(robot, "tokens", robot.tokens, rotation + Math.PI / 4);
  }

  function dropServerTokens(server) {
    const total = Math.ceil(serverTokens * (server.maxHp - server.hp) / server.maxHp);
    const gained = total - server.tokensDropped;
    if (gained <= 0) return;
    server.tokensDropped = total;
    dropCurrency(server, "tokens", gained);
  }

  function collectCurrency() {
    state.currencyDrops = state.currencyDrops.filter(drop => {
      if (state.time < drop.landedAt || Math.hypot(player.x - drop.x, player.y - drop.y) > 15) return true;
      state[drop.currency] += drop.value;
      return false;
    });
  }

  function addAlly(ally) {
    state.allies.push({
      color: allyColor, radius: 6, stride: 0, ...ally,
      phase: "guard", remaining: allyDuration, nextAttack: state.time,
    });
  }

  function activateTokenComputer() {
    if (tokenComputer.offline || state.dead) return;
    const { x, y, cost } = tokenComputer;
    if (state.tokens < cost) {
      onNotice("Для запуска нужно ещё " + (cost - state.tokens) + " токенов");
      return;
    }
    const point = nearFree(x, y + 29, 6);
    if (!point) return;

    state.tokens -= cost;
    removeWorkstation(tokenComputer);
    const hp = robotTypes.agent.maxHp;
    addAlly({ ...point, kind: "crutch", name: "Робот из костылей", hp, maxHp: hp, side: -1 });
    state.coins += allyGift;
    shock(x, y - 9, 44, "#c6a6fa", 0.45);
    burst(x, y - 13, ["#d4bcff", "#b597e5", "#91e6b2"], 46, 119);
    onNotice("Робот из костылей пришёл на помощь · +" + allyGift + " монет");
  }

  const opsec = {
    get targets() { return state.robots.filter(robot => !visitors.isFleeing(robot)); },
    convert(robot) {
      const index = state.robots.indexOf(robot);
      if (index < 0 || visitors.isFleeing(robot)) return false;
      const { kind, name, x, y, radius, stride } = robot;
      const maxHp = robot.reviveAt ? robot.maxHp * 2 : robot.maxHp;
      state.robots.splice(index, 1);
      addAlly({
        kind, name, x, y, radius, stride, maxHp, hp: robot.reviveAt ? maxHp : robot.hp,
        robotPhase: robot.reviveAt ? 2 : robot.phase, side: x <= player.x ? -1 : 1,
      });
      shock(x, y - 5, 23, allyColor, 0.32);
      burst(x, y - robot.eye, [allyColor, "#e0f8d8"], 16, 66);
      onNotice(name + " теперь на вашей стороне");
      return true;
    },
    destroyServers() {
      if (opsec.targets.length) return false;
      for (const server of state.servers) arsenal.damageServer(server, server.hp, server.x, server.y - server.eye);
      return true;
    },
  };

  function ammoOffer(index) {
    const weapon = weapons[index];
    if (!weapon?.shop) return null;
    return availableOffer(weapon.shop.rounds, weapon.shop.cost, weapon.capacity - arsenal.ammo[index]);
  }

  function buyAmmo(index) {
    const offer = ammoOffer(index);
    if (!offer?.quantity || offer.cost > state.coins || state.dead) return null;
    arsenal.collect(index, offer.quantity, false);
    state.coins -= offer.cost;
    return offer;
  }

  function medkitOffer(index) {
    const medkit = medkits[index];
    if (!medkit) return null;
    return availableOffer(medkit.hp, medkit.cost, player.maxHp - player.hp);
  }

  function buyMedkit(index) {
    const offer = medkitOffer(index);
    if (!offer?.quantity || offer.cost > state.coins || state.dead) return null;
    player.hp += offer.quantity;
    state.coins -= offer.cost;
    return offer;
  }

  function hitPlayer(damage, { fatal = false, ignoreProtection = fatal, ignoreArmor = fatal } = {}) {
    if (state.dead || (state.invulnerable > 0 && !ignoreProtection)) return;
    const absorbed = ignoreArmor ? 0 : Math.min(player.armor, damage);
    player.armor -= absorbed;
    player.hp = Math.max(0, player.hp - (damage - absorbed));
    state.invulnerable = Math.max(state.invulnerable, 0.65);
    state.shake = Math.max(state.shake, 0.22);
    if (player.hp > 0) return;

    state.dead = true;
    player.armor = 0;
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
    Object.assign(player, point ?? playerStart, { hp: player.maxHp, armor: 0, moving: false, facing: "north" });
    arsenal.refill();
    state.hostileBullets.length = 0;
    state.hostileRockets.length = 0;
    state.dead = false;
    state.invulnerable = 1.25;
    state.shake = 0;
  }

  function trigger(event, station, view) {
    if (station?.offline || station?.busy) return false;
    if (event === "opsec" || event === "windows-delete") {
      removeWorkstation(station);
      return true;
    }
    if (event === "arch-outfit") {
      removeWorkstation(station);
      state.outfitRemaining = outfitDuration;
      onNotice("Кошачьи ушки и чулки · 30 секунд");
      return true;
    }
    const allyType = allyTypes[event];
    if (allyType) {
      const point = nearFree(station.x + allyType.side * 25, station.y + 45, 6) ?? nearFree(player.x, player.y, 6);
      if (!point) return false;
      removeWorkstation(station);
      addAlly({ ...point, ...allyType, hp: allyType.maxHp });
      state.coins += allyGift;
      burst(point.x, point.y - 12, [allyColor, "#e0f8d8"], 16, 66);
      onNotice(allyType.name + " пришёл на помощь · +" + allyGift + " монет");
      return true;
    }
    if (event === "visitor" || event === "elder") {
      if (!visitors.call(event, view)) return false;
      removeWorkstation(station);
      return true;
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
    return true;
  }

  function finishEvent({ event, station, blast }) {
    removeWorkstation(station);
    const { x, y } = station;
    if (event === "explosion") {
      shock(blast.x, blast.y, blast.radius, "#ffb86b", 0.67);
      shock(x, y + 4, 65, "#ffe1a2", 0.4);
      burst(x, y - 5, ["#fff1bb", "#ffc277", "#ff914f", "#de673c", "#6e4a3e"], 107, 265);
      burst(x, y + 2, ["#554b46", "#716054", "#353c38"], 35, 75, true);
      const distance = Math.hypot(player.x - blast.x, player.y - blast.y);
      if (distance <= blast.radius) hitPlayer(player.maxHp, { fatal: true });
      for (const robot of [...state.robots]) {
        if (Math.hypot(robot.x - blast.x, robot.y - blast.y) <= blast.radius) {
          arsenal.damageRobot(robot, gentooMobDamage, robot.x, robot.y - robot.eye);
        }
      }
      for (const rocket of [...state.hostileRockets]) {
        if (Math.hypot(rocket.x - blast.x, rocket.y + 9 - blast.y) <= blast.radius) arsenal.damageRocket(rocket, gentooMobDamage);
      }
      for (const server of state.servers) {
        if (Math.hypot(server.x - blast.x, server.y - blast.y) <= blast.radius) arsenal.damageServer(server, gentooMobDamage, server.x, server.y - server.eye);
      }
      for (const ally of [...state.allies]) {
        if (Math.hypot(ally.x - blast.x, ally.y - blast.y) <= blast.radius) damageAlly(ally, gentooMobDamage);
      }
      visitors.damageFromGentoo(blast);
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
      const robot = { ...type, ...identity, ...point, kind, speed, hp: type.maxHp, stride: 0, flash: 0, ready: state.time + 0.45 };
      if (kind === "agent") hostileFire.arm(robot, { rockets: false, delay: 0.55 + index * 0.35 });
      state.robots.push(robot);
      weaponsUnlocked = true;
    }
    const color = robotTypes[event].color;
    shock(x, y + 16, 43, color, 0.35);
    burst(x, y + 5, [color, "#efcd9d", "#8c6b5d"], members.length * 5 + 20, 116);
    state.shake = Math.max(0.27, state.shake);
    onNotice(eventText[event], true);
  }

  function allyThreat(ally) {
    let nearest;
    let nearestDistance = 144;
    for (const robot of state.robots) {
      if (robot.reviveAt || visitors.isFleeing(robot)) continue;
      const distance = Math.hypot(robot.x - player.x, robot.y - player.y);
      if (distance >= nearestDistance || Math.hypot(robot.x - ally.x, robot.y - ally.y) > 164) continue;
      nearest = robot;
      nearestDistance = distance;
    }
    return nearest;
  }

  function moveAlly(ally, target, elapsed) {
    if (pursue(ally, target, fieldFor(ally, target), allySpeed * elapsed)) ally.stride += elapsed * 13;
  }

  function repairNetwork(ally, elapsed) {
    if (ally.repair && ally.repair.server.hp === ally.repair.server.maxHp) delete ally.repair;
    if (!ally.repair) {
      let nearest;
      let gap = Infinity;
      for (const server of state.servers) {
        if (server.hp === server.maxHp || state.allies.some(other => other.phase === "guard" && other.repair?.server === server)) continue;
        const point = { x: server.x, y: server.box[3] + ally.radius + 2 };
        const distance = Math.hypot(point.x - ally.x, point.y - ally.y);
        if (distance < gap) {
          nearest = { server, point };
          gap = distance;
        }
      }
      if (!nearest) return false;
      ally.repair = nearest;
    }

    const { point, server } = ally.repair;
    if (Math.hypot(point.x - ally.x, point.y - ally.y) > 4) {
      moveAlly(ally, point, elapsed);
      return true;
    }
    if (ally.repair.readyAt === undefined) {
      ally.repair.readyAt = state.time + rackRepairTime;
      burst(server.x, server.y - 8, ["#a8f4c4", "#ffe6a5"], 7, 45);
    } else if (state.time >= ally.repair.readyAt) {
      server.hp = server.maxHp;
      server.flash = state.time + 0.18;
      delete server.burn;
      delete ally.repair;
      shock(server.x, server.y - 5, 18, allyColor, 0.32);
      burst(server.x, server.y - 8, ["#a8f4c4", "#e7ffe6"], 14, 68);
      if (state.servers.every(rack => rack.hp === rack.maxHp)) onNotice("gigacode восстановил серверы Network");
    }
    return true;
  }

  function advanceAlly(ally, elapsed, sceneElapsed) {
    if (ally.phase !== "guard") {
      if (walkOut(ally, elapsed, 110)) removeAlly(ally);
      return;
    }
    ally.remaining = Math.max(0, ally.remaining - sceneElapsed);
    if (ally.remaining === 0) {
      delete ally.repair;
      ally.phase = "door";
      onNotice(ally.name + " уходит");
      return;
    }
    if (ally.repairsServers && repairNetwork(ally, elapsed)) return;

    const threat = state.dead ? undefined : allyThreat(ally);
    if (threat && Math.hypot(ally.x - threat.x, ally.y - threat.y) < 24 && clearPath(ally, threat)) {
      if (state.time >= ally.nextAttack) {
        ally.nextAttack = state.time + 0.56;
        ally.attackUntil = state.time + 0.24;
        ally.attackSide = threat.x < ally.x ? -1 : 1;
        arsenal.damageRobot(threat, 140, threat.x, threat.y - threat.eye, { colors: [allyColor, "#e7ffe6"] });
      }
      return;
    }

    const target = threat ?? nearFree(player.x + ally.side * 22, player.y + 14, ally.radius);
    if (target) moveAlly(ally, target, elapsed);
  }

  function attackAlly(robot, ally) {
    if (state.time < (robot.nextAllyAttack ?? 0)) return;
    robot.nextAllyAttack = state.time + 0.65;
    if (robot.kind === "furry") {
      robot.attackUntil = state.time + 0.19;
      robot.attackSide = ally.x < robot.x ? -1 : 1;
    }
    damageAlly(ally, robot.damage);
  }

  function damageAlly(ally, damage) {
    ally.hp = Math.max(0, ally.hp - damage);
    ally.flash = state.time + 0.14;
    if (ally.hp > 0) {
      burst(ally.x, ally.y - 15, [allyColor, "#ffba8a"], 5, 58);
      return;
    }

    burst(ally.x, ally.y - 15, [allyColor, "#d9e7d3", "#627dab"], 22, 90);
    removeAlly(ally);
    onNotice(ally.name + " погиб", true);
  }

  function removeAlly(ally) {
    state.allies.splice(state.allies.indexOf(ally), 1);
  }

  function interceptingAlly(robot, playerGap) {
    let closest;
    let gap = 52;
    for (const ally of state.allies) {
      if (ally.phase !== "guard") continue;
      const distance = Math.hypot(ally.x - robot.x, ally.y - robot.y);
      if (distance >= gap || distance >= Math.max(34, playerGap + 6) || !clearPath(robot, ally)) continue;
      closest = ally;
      gap = distance;
    }
    return closest ? { ally: closest, gap } : null;
  }

  function advanceRobots(elapsed) {
    const field = fieldFor(playerRoute, player);
    const cannotMove = robot => robot.reviveAt || robot.frozenUntil > state.time || visitors.isFleeing(robot);
    for (const robot of state.robots) {
      if (cannotMove(robot) || state.time < robot.ready) continue;
      const gap = Math.hypot(player.x - robot.x, player.y - robot.y);
      const ranged = robot.phase === 2;
      const clear = (ranged || robot.nextBullet !== undefined) && hostileFire.fire(robot, gap);
      const interception = interceptingAlly(robot, gap);
      if (interception) {
        const { ally, gap: allyGap } = interception;
        const reach = robot.radius + ally.radius + 1;
        if (allyGap <= reach + 0.1) {
          attackAlly(robot, ally);
        } else {
          const travel = Math.min(robot.speed * elapsed, allyGap - reach) / allyGap;
          if (moveBody(robot, (ally.x - robot.x) * travel, (ally.y - robot.y) * travel)) robot.stride += elapsed * 13;
        }
        continue;
      }
      const contact = gap < robot.radius + player.radius + 1;
      const inMeleeRange = robot.meleeReach ? gap <= robot.meleeReach && clearPath(robot, player, 0) : contact && !ranged;
      if (inMeleeRange) {
        if (robot.kind === "furry" && !state.invulnerable) {
          robot.attackUntil = state.time + 0.19;
          robot.attackSide = player.x < robot.x ? -1 : 1;
        }
        hitPlayer(robot.damage);
        if (!ranged) continue;
      }
      if (ranged && clear && gap <= 138) {
        if (gap > 0 && gap < 87) {
          const travel = Math.min(robot.speed * elapsed, 87 - gap) / gap;
          if (moveBody(robot, (robot.x - player.x) * travel, (robot.y - player.y) * travel)) robot.stride += elapsed * 13;
        }
        continue;
      }
      if (ranged && contact) continue;
      if (pursue(robot, player, field, robot.speed * elapsed)) robot.stride += elapsed * 13;
    }
    for (let i = 0; i < state.robots.length; i++) {
      const first = state.robots[i];
      if (cannotMove(first)) continue;
      for (let j = i + 1; j < state.robots.length; j++) {
        const second = state.robots[j];
        if (cannotMove(second)) continue;
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

  function reviveRobots() {
    for (const robot of state.robots) {
      if (!robot.reviveAt || state.time < robot.reviveAt) continue;
      delete robot.reviveAt;
      delete robot.nextAllyAttack;
      robot.phase = 2;
      robot.maxHp *= 2;
      robot.hp = robot.maxHp;
      robot.flash = state.time + 0.18;
      hostileFire.arm(robot);
      burst(robot.x, robot.y - robot.eye, ["#ff967a", "#fff3c8"], 18, 75);
      shock(robot.x, robot.y, 30, "#ffae81", 0.35);
      onNotice(robot.name + " · фаза 2", true);
    }
  }

  function startCelebration() {
    state.celebration = { elapsed: 0, nextLaunch: 0, launches: [], count: 0 };
  }

  function advanceCelebration(elapsed) {
    const show = state.celebration;
    if (!show) return;
    show.elapsed += elapsed;
    if (show.elapsed >= celebrationDuration) {
      state.celebration = null;
      state.medal = true;
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

  function collectNearbySupplies() {
    state.supplies = state.supplies.filter(supply => {
      if (Math.hypot(player.x - supply.x, player.y - supply.y) > 15) return true;
      if (supply.kind) {
        const armor = supply.kind === "armor";
        const stat = armor ? "armor" : "hp";
        const limit = armor ? player.maxArmor : player.maxHp;
        const taken = Math.min(supply.amount, limit - player[stat]);
        if (taken <= 0) return true;
        player[stat] += taken;
        onNotice((armor ? "Броня +" : "Аптечка +") + taken);
        supply.amount -= taken;
        return armor && supply.amount > 0;
      }
      const loot = arsenal.collect(supply.index, supply.rounds, supply.unlock);
      if (!loot) return true;
      const message = loot.newlyOwned ? "Подобрано оружие · " + supply.weapon.name : "Боеприпасы · " + supply.weapon.name;
      onNotice(loot.rounds > 0 ? message + " +" + loot.rounds : message);
      supply.rounds -= loot.rounds;
      supply.unlock = false;
      return supply.rounds > 0;
    });
  }

  function update(elapsed, holding, pressed = false, sceneElapsed = elapsed) {
    state.time += elapsed;
    state.outfitRemaining = Math.max(0, state.outfitRemaining - sceneElapsed);
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
    reviveRobots();
    visitors.update(elapsed, sceneElapsed);
    for (const ally of [...state.allies]) {
      if (!visitors.isFleeing(ally)) advanceAlly(ally, elapsed, sceneElapsed);
    }
    arsenal.update(elapsed, holding, pressed);
    hostileFire.update(elapsed);
    advanceCelebration(sceneElapsed);

    if (state.dead) {
      reviveIn -= elapsed;
      if (reviveIn <= 0) {
        respawn();
        return true;
      }
      return false;
    }
    collectNearbySupplies();
    collectCurrency();
    if (state.robots.length) advanceRobots(elapsed);
    return false;
  }

  return {
    state, opsec, trigger, startCelebration, update, activateTokenComputer, ammoOffer, buyAmmo, medkitOffer, buyMedkit,
    cycleWeapon: arsenal.cycle, selectWeapon: arsenal.select,
  };
}
