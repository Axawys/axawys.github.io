import { door, height, isWalkable, moveBody, networkRacks, player, playerStart, supplySpots, width } from "./room.js";
import { createHostileFire } from "./hostile-fire.js";
import { clearPath, makeField, nearestCell, pursue } from "./navigation.js";
import { createWeapons, weapons } from "./weapons.js";

const robotTypes = {
  spider: { name: "Паук Ubuntu", radius: 5, meleeReach: 19, eye: 8, maxHp: 1100, speed: 88, damage: 24, color: "#ff947a", phase: 1, coins: 45 },
  walker: { name: "Робот ALT Linux", radius: 6, eye: 21, maxHp: 1920, speed: 70, damage: 38, color: "#f6c786", phase: 1, coins: 65 },
  swarm: { name: "ИИ-агент", radius: 3, meleeReach: 14, eye: 4, maxHp: 440, speed: 87, damage: 12, color: "#e6ac76", coins: 8 },
  agent: { radius: 6, meleeReach: 24, eye: 13, maxHp: 1440, speed: 74, damage: 25, coins: 32 },
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
const serverHp = 150;
const serverCoins = 10;
export const medkits = [
  { hp: 10, cost: 5 },
  { hp: 25, cost: 10 },
  { hp: 50, cost: 18 },
];
const allyTypes = {
  ally: { kind: "furry", name: "Фурри-союзник", maxHp: 500, side: 1 },
  gigacode: { kind: "agent", name: "gigacode", maxHp: robotTypes.agent.maxHp / 2, side: -1 },
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
  visitor: "Линус Торвальдс прошёл мимо. Ядро в порядке.",
  elder: "Ну и зачем ты это сделал? Оно же работало",
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

function availableOffer(quantity, price, space) {
  const available = Math.min(quantity, space);
  return { quantity: available, cost: Math.ceil(price * available / quantity) };
}

export function createAction(onNotice = () => {}, onCelebrated = () => {}) {
  let weaponsUnlocked = false;
  const state = {
    time: 0, aim: { x: player.x, y: player.y - 48, visible: false },
    robots: [], particles: [], shocks: [], shots: [], projectiles: [], pending: [], visitor: null, allies: [],
    hostileBullets: [], hostileRockets: [],
    coins: 0, coinDrops: [],
    servers: networkRacks.map(rack => ({ ...rack, hp: serverHp, maxHp: serverHp, eye: 9, color: "#80aba5", coins: serverCoins })),
    supplies: supplySpots.map(spot => {
      if (!spot.weaponId) return { ...spot };
      const index = weapons.findIndex(weapon => weapon.id === spot.weaponId);
      return { ...spot, index, weapon: weapons[index] };
    }),
    dead: false, invulnerable: 0, shake: 0, celebration: null, medal: false,
    get ammo() { return arsenal.ammo; },
    get owned() { return arsenal.owned; },
    get weapon() { return arsenal.equipped; },
    get armed() { return weaponsUnlocked && !this.dead; },
  };
  let reviveIn = 0;
  let conversionUsed = false;
  const arsenal = createWeapons(state, player, burst, shock, damageAlly, dropCoins);
  const hostileFire = createHostileFire(state, player, hitPlayer, burst, shock);
  let playerCell = -1;
  let playerField;
  const queuedVisitors = [];
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

  function dropCoins({ x, y, coins }) {
    if (!coins) return;
    const count = Math.min(4, Math.ceil(coins / 8));
    const rotation = Math.random() * Math.PI * 2;
    for (let index = 0; index < count; index++) {
      const angle = rotation + index * Math.PI * 2 / count;
      const point = nearFree(x + Math.cos(angle) * 22, y + Math.sin(angle) * 17, 5) ?? nearFree(x, y, 5);
      if (!point) continue;
      const value = Math.floor(coins / count) + (index < coins % count ? 1 : 0);
      state.coinDrops.push({ ...point, fromX: x, fromY: y, value, landedAt: state.time + 0.25 });
    }
  }

  function collectCoins() {
    let pickedUp = 0;
    state.coinDrops = state.coinDrops.filter(coin => {
      if (state.time < coin.landedAt || Math.hypot(player.x - coin.x, player.y - coin.y) > 15) return true;
      pickedUp += coin.value;
      return false;
    });
    state.coins += pickedUp;
  }

  const opsec = {
    get targets() { return state.robots; },
    get conversionUsed() { return conversionUsed; },
    convert(robot) {
      const index = state.robots.indexOf(robot);
      if (conversionUsed || index < 0) return false;
      const { kind, name, x, y, radius, stride } = robot;
      const maxHp = robot.reviveAt ? robot.maxHp * 2 : robot.maxHp;
      state.robots.splice(index, 1);
      state.allies.push({
        kind, name, x, y, radius, stride, maxHp, hp: robot.reviveAt ? maxHp : robot.hp,
        color: allyColor, phase: "guard", robotPhase: robot.reviveAt ? 2 : robot.phase,
        side: x <= player.x ? -1 : 1, nextAttack: state.time,
      });
      conversionUsed = true;
      shock(x, y - 5, 23, allyColor, 0.32);
      burst(x, y - robot.eye, [allyColor, "#e0f8d8"], 16, 66);
      onNotice(name + " теперь на вашей стороне");
      return true;
    },
    destroyServers() {
      if (state.robots.length) return false;
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

  function callVisitor({ kind, view }) {
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
    if (!target) return;
    const field = makeField(nearestCell(target.x, target.y));
    const start = candidates
      .map(({ x, y }) => nearFree(x, y, 6))
      .filter(point => point && field[nearestCell(point.x, point.y)] >= 0
        && (point.x < view.x - 16 || point.x > view.x + view.w + 16
          || point.y < view.y - 4 || point.y > view.y + view.h + 42))
      .sort((a, b) => (Math.hypot(a.x - target.x, a.y - target.y) + Math.max(0, a.y - target.y) * 0.4)
        - (Math.hypot(b.x - target.x, b.y - target.y) + Math.max(0, b.y - target.y) * 0.4))[0];
    if (!start) return;
    state.visitor = { ...start, kind, radius: 6, stride: 0, phase: "visit", target, field, labelUntil: 0 };
  }

  function trigger(event, station, view) {
    const allyType = allyTypes[event];
    if (allyType) {
      if (state.allies.some(ally => ally.kind === allyType.kind)) return;
      const point = nearFree(station.x + allyType.side * 25, station.y + 45, 6) ?? nearFree(player.x, player.y, 6);
      if (!point) return;
      state.allies.push({
        ...point, ...allyType, color: allyColor, radius: 6, hp: allyType.maxHp,
        stride: 0, phase: "guard", remaining: allyDuration, nextAttack: state.time,
      });
      state.coins += allyGift;
      burst(point.x, point.y - 12, [allyColor, "#e0f8d8"], 16, 66);
      onNotice(allyType.name + " пришёл на помощь · +" + allyGift + " монет");
      return;
    }
    if (event === "visitor" || event === "elder") {
      const visit = { kind: event, view };
      if (state.visitor) queuedVisitors.push(visit);
      else callVisitor(visit);
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
      weaponsUnlocked = true;
    }
    const color = robotTypes[event].color;
    shock(x, y + 16, 43, color, 0.35);
    burst(x, y + 5, [color, "#efcd9d", "#8c6b5d"], members.length * 5 + 20, 116);
    state.shake = Math.max(0.27, state.shake);
    onNotice(eventText[event], true);
  }

  function walkOut(actor, elapsed, speed) {
    if (actor.phase === "door") {
      if (Math.hypot(actor.x - door.x, actor.y - door.y) >= 8) {
        if (pursue(actor, door, doorField, speed * elapsed)) actor.stride += elapsed * 11;
        return false;
      }
      actor.x = door.x;
      actor.phase = "exit";
    }
    actor.y += speed * elapsed;
    actor.stride += elapsed * 11;
    return actor.y > height + 28;
  }

  function advanceElder(visitor, elapsed) {
    if (state.dead || Math.hypot(visitor.x - player.x, visitor.y - player.y) > 17) {
      const target = nearFree(player.x, player.y, visitor.radius);
      if (target && pursue(visitor, target, fieldTowardPlayer(target), 122 * elapsed)) visitor.stride += elapsed * 9;
      return;
    }
    if (visitor.phase === "visit") {
      visitor.phase = "swing";
      visitor.swingAt = state.time + 0.5;
      visitor.labelUntil = state.time + 2.5;
      onNotice(eventText.elder);
    } else if (state.time >= visitor.swingAt) {
      hitPlayer(1, { ignoreProtection: true, ignoreArmor: true });
      visitor.swingUntil = state.time + 0.24;
      visitor.phase = "door";
    }
  }

  function advanceVisitor(elapsed) {
    const visitor = state.visitor;
    if (!visitor) return;
    if (visitor.kind === "elder" && (visitor.phase === "visit" || visitor.phase === "swing")) {
      advanceElder(visitor, elapsed);
      return;
    }
    if (visitor.phase === "door" || visitor.phase === "exit") {
      if (walkOut(visitor, elapsed, 101)) {
        state.visitor = null;
        if (queuedVisitors.length) callVisitor(queuedVisitors.shift());
      }
      return;
    }
    if (Math.hypot(visitor.x - visitor.target.x, visitor.y - visitor.target.y) < 8) {
      visitor.phase = "door";
      visitor.labelUntil = state.time + 2.5;
      onNotice(eventText.visitor);
      return;
    }
    if (pursue(visitor, visitor.target, visitor.field, 101 * elapsed)) visitor.stride += elapsed * 11;
  }

  function allyThreat(ally) {
    let nearest;
    let nearestDistance = 144;
    for (const robot of state.robots) {
      if (robot.reviveAt) continue;
      const distance = Math.hypot(robot.x - player.x, robot.y - player.y);
      if (distance >= nearestDistance || Math.hypot(robot.x - ally.x, robot.y - ally.y) > 164) continue;
      nearest = robot;
      nearestDistance = distance;
    }
    return nearest;
  }

  function advanceAlly(ally, elapsed, sceneElapsed) {
    if (ally.phase !== "guard") {
      if (walkOut(ally, elapsed, 110)) removeAlly(ally);
      return;
    }
    if (ally.remaining !== undefined) {
      ally.remaining = Math.max(0, ally.remaining - sceneElapsed);
      if (ally.remaining === 0) {
        ally.phase = "door";
        onNotice(ally.name + " уходит");
        return;
      }
    }

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
    if (!target) return;
    const cell = nearestCell(target.x, target.y);
    if (ally.targetCell !== cell) {
      ally.targetCell = cell;
      ally.field = makeField(cell);
    }
    if (pursue(ally, target, ally.field, allySpeed * elapsed)) ally.stride += elapsed * 13;
  }

  function fieldTowardPlayer({ x, y }) {
    const cell = nearestCell(x, y);
    if (cell !== playerCell || !playerField) {
      playerCell = cell;
      playerField = makeField(cell);
    }
    return playerField;
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
    const field = fieldTowardPlayer(player);
    for (const robot of state.robots) {
      if (robot.reviveAt || state.time < robot.ready) continue;
      const gap = Math.hypot(player.x - robot.x, player.y - robot.y);
      const ranged = robot.phase === 2;
      const clear = ranged && hostileFire.fire(robot, gap);
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
      if (clear && gap <= 138) {
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
      if (first.reviveAt) continue;
      for (let j = i + 1; j < state.robots.length; j++) {
        const second = state.robots[j];
        if (second.reviveAt) continue;
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
    advanceVisitor(elapsed);
    for (const ally of [...state.allies]) advanceAlly(ally, elapsed, sceneElapsed);
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
    collectCoins();
    if (state.robots.length) advanceRobots(elapsed);
    return false;
  }

  return {
    state, opsec, trigger, startCelebration, update, ammoOffer, buyAmmo, medkitOffer, buyMedkit,
    cycleWeapon: arsenal.cycle, selectWeapon: arsenal.select,
  };
}
