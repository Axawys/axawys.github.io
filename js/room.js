import { label } from "./pixel-font.js";
import { box } from "./pixels.js";
import { drawAlly, drawBlastZones, drawBurningRobot, drawEffects, drawPlayer, drawRobot, drawRobotTags, drawSupply, drawVisitor, drawWeapon } from "./sprites.js";

export const width = 1220;
export const height = 966;
const centerX = width / 2;
const floor = { left: 15, right: width - 15, top: 49, bottom: height - 32 };
export const door = { x: centerX, y: floor.bottom - 9 };
const breakAreaTop = 702;
export const playerStart = { x: centerX, y: breakAreaTop + 40 };

const deskColumns = [326, 506, 686, 866];
const deskRows = [126, 270, 414, 558];
const screens = ["#80dbc1", "#b4a6e2", "#83bedc", "#91d7ad", "#e0bd84", "#8faadd"];
export const stations = deskRows.flatMap(y => {
  const columns = y === deskRows.at(-1) ? deskColumns.slice(1, -1) : deskColumns;
  return columns.map(x => ({ x, y }));
}).map((position, index) => {
  const number = index + 1;
  return { ...position, number, id: "PC-" + String(number).padStart(2, "0"), screen: screens[index % screens.length], hintSide: 1 };
});

export const player = { ...playerStart, facing: "north", moving: false, stride: 0, hp: 100, maxHp: 100, armor: 0, maxArmor: 100, radius: 4 };
export const noteSpots = [
  [573, 5], [655, 23], [566, 69], [654, 91], [610, -50], [608, 149],
].map(([x, offset]) => ({ x, y: breakAreaTop + offset, kind: "note" }));

export const supplySpots = [
  { x: 635, y: 695, weaponId: "rifle", rounds: 12, unlock: true },
  { x: 179, y: 254, weaponId: "launcher", rounds: 4, unlock: true },
  { x: 907, y: 644, weaponId: "grenade", rounds: 2, unlock: true },
  { x: 1021, y: 481, weaponId: "flame", rounds: 10, unlock: true },
  { x: 1114, y: 266, weaponId: "bfg", rounds: 1, unlock: true },
  { x: 408, y: 523, weaponId: "rifle", rounds: 16 },
  { x: 272, y: 305, weaponId: "rifle", rounds: 16 },
  { x: 768, y: 82, weaponId: "rifle", rounds: 16 },
  { x: 150, y: 474, weaponId: "launcher", rounds: 6 },
  { x: 762, y: 498, weaponId: "launcher", rounds: 6 },
  { x: 970, y: 103, weaponId: "launcher", rounds: 6 },
  { x: 1074, y: 601, weaponId: "grenade", rounds: 2 },
  { x: 450, y: 74, weaponId: "grenade", rounds: 2 },
  { x: 1002, y: 288, weaponId: "flame", rounds: 12 },
  { x: 766, y: 653, weaponId: "flame", rounds: 12 },
  { x: 246, y: 601, weaponId: "flame", rounds: 12 },
  { x: 550, y: 696, kind: "armor", amount: 25 },
  { x: 197, y: 479, kind: "armor", amount: 25 },
  { x: 611, y: 107, kind: "armor", amount: 50 },
  { x: 1110, y: 330, kind: "armor", amount: 50 },
  { x: 958, y: 792, kind: "armor", amount: 25 },
  { x: 301, y: 824, kind: "armor", amount: 25 },
  { x: 652, y: 755, kind: "medkit", amount: 10 },
  { x: 339, y: 518, kind: "medkit", amount: 25 },
  { x: 951, y: 538, kind: "medkit", amount: 50 },
  { x: 179, y: 692, kind: "medkit", amount: 50 },
  { x: 1008, y: 825, kind: "medkit", amount: 25 },
  { x: 607, y: 306, kind: "medkit", amount: 10 },
  { x: 253, y: 165, kind: "medkit", amount: 25 },
];

function item(kind, x, y, box) {
  return { kind, x, y, box: box.map((side, index) => side + (index % 2 ? y : x)) };
}

const furniture = [
  // Archives and supply storage.
  item("shelf", 91, 130, [-34, -7, 34, 18]),
  item("shelf", 181, 130, [-34, -7, 34, 18]),
  item("crate", 74, 174, [-10, -5, 12, 10]),
  item("crate", 98, 174, [-10, -5, 12, 10]),
  item("plant", 215, 177, [-7, -2, 7, 7]),
  item("partition", 137, 209, [-76, -4, 76, 8]),
  item("shelf", 112, 358, [-34, -7, 34, 18]),
  item("shelf", 172, 400, [-34, -7, 34, 18]),
  item("crate", 82, 401, [-10, -5, 12, 10]),
  item("crate", 106, 401, [-10, -5, 12, 10]),
  item("plant", 198, 352, [-7, -2, 7, 7]),

  // Server racks and maintenance benches.
  item("rack", 1029, 148, [-13, -13, 13, 15]),
  item("rack", 1061, 148, [-13, -13, 13, 15]),
  item("rack", 1093, 148, [-13, -13, 13, 15]),
  item("rack", 1125, 148, [-13, -13, 13, 15]),
  item("rack", 1111, 201, [-13, -13, 13, 15]),
  item("rack", 1143, 201, [-13, -13, 13, 15]),
  item("crate", 1012, 210, [-10, -5, 12, 10]),
  item("table", 1038, 383, [-27, -10, 27, 17]),
  item("table", 1126, 383, [-27, -10, 27, 17]),
  item("shelf", 1115, 434, [-34, -7, 34, 18]),
  item("plant", 1013, 439, [-7, -2, 7, 7]),

  // Break area and entryway.
  item("sofa", 362, breakAreaTop + 32, [-36, -10, 36, 15]),
  item("sofa", 478, breakAreaTop + 32, [-36, -10, 36, 15]),
  item("table", 421, breakAreaTop + 83, [-27, -10, 27, 17]),
  item("plant", 323, breakAreaTop + 109, [-7, -2, 7, 7]),
  item("plant", 518, breakAreaTop + 109, [-7, -2, 7, 7]),
  item("sofa", 738, breakAreaTop + 32, [-36, -10, 36, 15]),
  item("sofa", 853, breakAreaTop + 32, [-36, -10, 36, 15]),
  item("table", 794, breakAreaTop + 83, [-27, -10, 27, 17]),
  item("plant", 897, breakAreaTop + 109, [-7, -2, 7, 7]),
  item("sofa", 139, door.y - 60, [-36, -10, 36, 15]),
  item("plant", 88, door.y - 53, [-7, -2, 7, 7]),
  item("shelf", 1072, door.y - 50, [-34, -7, 34, 18]),
  item("crate", 1131, door.y - 49, [-10, -5, 12, 10]),
  item("crate", 1154, door.y - 49, [-10, -5, 12, 10]),
  item("plant", 553, door.y - 28, [-7, -2, 7, 7]),
  item("plant", 667, door.y - 28, [-7, -2, 7, 7]),
];

const obstacles = [
  ...furniture.map(({ box: bounds }) => bounds),
  ...stations.flatMap(({ x, y }) => [
    [x - 34, y - 4, x + 34, y + 20],
    [x - 8, y + 20, x + 8, y + 34],
  ]),
];

const fixedLayers = [
  ...furniture.map(prop => ({ depth: prop.box[3], draw: (ctx, time) => drawFurniture(ctx, prop, time) })),
];

export function isWalkable(x, y, radius = 4) {
  return x - radius >= floor.left && x + radius <= floor.right
    && y - radius >= floor.top && y + radius <= floor.bottom
    && !obstacles.some(([left, top, right, bottom]) =>
      x + radius > left && x - radius < right && y + radius > top && y - radius < bottom);
}

export function moveBody(body, dx, dy) {
  const x = body.x;
  const y = body.y;
  if (isWalkable(x + dx, y, body.radius)) body.x += dx;
  if (isWalkable(body.x, y + dy, body.radius)) body.y += dy;
  return x !== body.x || y !== body.y;
}

export function movePlayer(dx, dy, elapsed) {
  player.moving = false;
  if (!dx && !dy) return;

  player.facing = dy < 0 ? "north" : dy > 0 ? "south" : dx < 0 ? "west" : "east";
  const step = elapsed * 107 / Math.max(1, Math.hypot(dx, dy));
  player.moving = moveBody(player, dx * step, dy * step);
  if (player.moving) player.stride += elapsed;
}

export function nearestInteraction(notes) {
  return notes.find(note => Math.hypot(player.x - note.x, player.y - note.y) < 23)
    ?? stations.find(station => !station.offline && !station.busy && Math.abs(player.x - station.x) <= 29
    && player.y >= station.y + 20 && player.y <= station.y + 53);
}

export function createRenderer(canvas) {
  const context = canvas.getContext("2d");
  const backdrop = document.createElement("canvas");
  backdrop.width = width;
  backdrop.height = height;
  drawOffice(backdrop.getContext("2d"));

  const camera = { x: 0, y: 0, w: 0, h: 0 };
  let cssWidth = 0;
  let cssHeight = 0;
  function follow(elapsed, snap) {
    if (canvas.clientWidth !== cssWidth || canvas.clientHeight !== cssHeight) {
      cssWidth = canvas.clientWidth;
      cssHeight = canvas.clientHeight;
      const scale = Math.max(2, Math.ceil(Math.max(cssWidth / 490, cssHeight / 460)));
      camera.w = canvas.width = Math.max(1, Math.round(cssWidth / scale));
      camera.h = canvas.height = Math.max(1, Math.round(cssHeight / scale));
      snap = true;
    }
    const targetX = Math.max(0, Math.min(width - camera.w, player.x - camera.w / 2));
    const targetY = Math.max(0, Math.min(height - camera.h, player.y - camera.h / 2 - 8));
    const followRate = snap ? 1 : 1 - Math.exp(-12 * elapsed);
    camera.x += (targetX - camera.x) * followRate;
    camera.y += (targetY - camera.y) * followRate;
  }

  function worldPoint(clientX, clientY) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.round(camera.x) + (clientX - bounds.left) * camera.w / bounds.width,
      y: Math.round(camera.y) + (clientY - bounds.top) * camera.h / bounds.height,
    };
  }

  function screenPoint(x, y) {
    return {
      x: (x - Math.round(camera.x)) * cssWidth / camera.w,
      y: (y - Math.round(camera.y)) * cssHeight / camera.h,
    };
  }

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  function draw({ nearby, visited, notes, action, time }) {
    const shake = reduceMotion.matches ? 0 : action.shake * 7;
    const offsetX = Math.round(Math.sin(time * 74) * shake);
    const offsetY = Math.round(Math.cos(time * 59) * shake);
    box(context, "#101915", 0, 0, camera.w, camera.h);
    context.save();
    context.translate(-Math.round(camera.x) + offsetX, -Math.round(camera.y) + offsetY);
    context.drawImage(backdrop, 0, 0);
    if (action.pending.some(event => event.blast)) {
      context.save();
      context.beginPath();
      context.rect(floor.left, floor.top, floor.right - floor.left, floor.bottom - floor.top);
      context.clip();
      drawBlastZones(context, action.pending);
      context.restore();
    }
    const weapon = action.armed ? action.weapon : null;
    const layers = [...fixedLayers];
    for (const station of stations) {
      const hot = action.pending.some(event => event.station === station && event.phase);
      layers.push({
        depth: station.y + 30,
        draw: () => drawDesk(context, station, station === nearby, visited.has(station.number), time * 1000, hot),
      });
    }
    for (const note of notes) layers.push({ depth: note.y, draw: () => drawNote(context, note, nearby === note) });
    for (const supply of action.supplies) layers.push({ depth: supply.y, draw: () => drawSupply(context, supply) });
    for (const robot of action.robots) layers.push({ depth: robot.y, draw: () => {
      if (robot.reviveAt) context.globalAlpha = 0.58;
      drawRobot(context, robot, time);
      context.globalAlpha = 1;
      drawBurningRobot(context, robot, time);
    } });
    const ally = action.ally;
    if (ally) layers.push({ depth: ally.y, draw: () => drawAlly(context, ally, time) });
    if (action.visitor) layers.push({ depth: action.visitor.y, draw: () => drawVisitor(context, action.visitor, time, player) });
    layers.push({ depth: player.y, draw: () => {
      drawPlayer(context, player, action, time);
      if (weapon) drawWeapon(context, player, action.aim, weapon, false);
    } });
    for (const layer of layers.sort((a, b) => a.depth - b.depth)) layer.draw(context, time * 1000);
    if (weapon) drawWeapon(context, player, action.aim, weapon, true);
    drawEffects(context, action, time);
    drawRobotTags(context, action.robots, action.dead ? null : player, camera, weapon, ally);
    context.restore();
  }
  return { camera, follow, worldPoint, screenPoint, draw };
}

function drawOffice(ctx) {
  const floorTop = 41;
  const floorBottom = height - 26;
  box(ctx, "#101915", 0, 0, width, height);
  box(ctx, "#24372e", 10, 2, width - 20, 38);
  box(ctx, "#172820", 10, 4, width - 20, 2);
  for (let x = 16; x < width - 10; x += 19) {
    box(ctx, "#2c4337", x, 7, 2, 17);
    box(ctx, "#1c2d25", x + 2, 7, 1, 17);
  }
  box(ctx, "#446353", 10, 26, width - 20, 2);
  box(ctx, "#2b4034", 10, 28, width - 20, 10);
  box(ctx, "#15251d", 10, 38, width - 20, 3);

  for (const x of [107, 275, 443, centerX, 777, 945, 1113]) {
    box(ctx, "#15241c", x - 36, 12, 72, 11);
    box(ctx, "#315040", x - 34, 14, 68, 6);
    box(ctx, "#638c74", x - 31, 15, 62, 3);
    box(ctx, "#addbb5", x - 29, 15, 58, 1);
  }
  box(ctx, "#89ab90", centerX - 41, 25, 82, 16);
  box(ctx, "#354f40", centerX - 40, 26, 80, 14);
  label(ctx, "LINUX LAB", centerX, 29, "#c4e0bc");

  const tileColors = ["#23362e", "#253930", "#263a31", "#24372f", "#273b32"];
  box(ctx, "#1a2c25", 10, floorTop, width - 20, floorBottom - floorTop);
  ctx.save();
  ctx.beginPath();
  ctx.rect(10, floorTop, width - 20, floorBottom - floorTop);
  ctx.clip();
  for (let row = 0, y = floorTop; y < floorBottom; row++, y += 19) {
    for (let col = 0, x = 10; x < width - 10; col++, x += 20) {
      const index = (row * row + col * 3 + row * col) % tileColors.length;
      box(ctx, tileColors[index], x + 1, y + 1, 19, 18);
      box(ctx, "#31473c", x + 2, y + 1, 17, 1);
      box(ctx, "#2c4237", x + 3 + index * 2, y + 6 + (col + row) % 7, 3, 1);
      if ((col + row * 3) % 7 === 0) box(ctx, "#1e3229", x + 14, y + 13, 2, 1);
    }
  }
  ctx.restore();
  box(ctx, "#12271c70", 10, floorTop, width - 20, 9);
  box(ctx, "#12271c30", 10, floorTop + 9, width - 20, 7);

  const serviceZones = [
    [38, 80, 202, 153, "#5a6d4740", "#8394628c", "ARCHIVES"],
    [54, 308, 172, 130, "#7160473e", "#a18a6088", "SUPPLIES"],
    [989, 81, 187, 154, "#40657256", "#6c9ba78f", "NETWORK"],
    [983, 327, 190, 137, "#655c7042", "#95849c87", "OPERATIONS"],
  ];
  for (const [x, y, w, h, shade, trim, title] of serviceZones) {
    drawZone(ctx, x, y, w, h, shade, trim);
    label(ctx, title, x + Math.floor(w / 2), y + 12, "#bed1b0bc");
  }
  for (const x of [300, 674]) {
    drawZone(ctx, x, breakAreaTop, 246, 126, "#75744c33", "#92996a75");
  }
  for (const station of stations) drawStationZone(ctx, station);

  const aisleStart = 78;
  const aisleEnd = door.y - 42;
  box(ctx, "#8da98a12", centerX - 25, aisleStart, 50, aisleEnd - aisleStart);
  for (const x of [centerX - 27, centerX + 26]) {
    for (let y = aisleStart; y < aisleEnd; y += 15) box(ctx, "#78906d88", x, y, 2, 6);
  }
  for (const y of deskRows.slice(0, -1)) {
    for (let x = 282; x < 939; x += 16) {
      if (Math.abs(x - centerX) > 36) box(ctx, "#6f866b75", x, y + 89, 6, 1);
    }
  }
  label(ctx, "BREAK AREA", centerX, breakAreaTop - 25, "#bed1b0bc");
  label(ctx, "EXIT", door.x, door.y - 21, "#bed1b0bc");

  for (const [x, y, shade] of [
    [136, 148, "#adbd8332"], [1080, 155, "#87bdcf35"],
    [421, breakAreaTop + 68, "#d7d5a732"], [794, breakAreaTop + 68, "#d7d5a732"], [door.x, door.y, "#bdcda22b"],
  ]) {
    const glow = ctx.createRadialGradient(x, y, 1, x, y, 104);
    glow.addColorStop(0, shade);
    glow.addColorStop(1, "#0000");
    box(ctx, glow, x - 104, y - 104, 208, 208);
  }

  box(ctx, "#15271e", 2, 28, 8, height - 48);
  box(ctx, "#415b49", 7, 28, 3, floorBottom - 28);
  box(ctx, "#15271e", width - 10, 28, 8, height - 48);
  box(ctx, "#415b49", width - 10, 28, 3, floorBottom - 28);
  for (const x of [9, width - 12]) {
    for (let y = 78; y < floor.bottom; y += 72) {
      box(ctx, "#13231c", x - 1, y, 5, 13);
      box(ctx, "#547360", x, y + 3, 3, 6);
      box(ctx, "#91bd9d", x + 1, y + 4, 1, 3);
    }
  }
  box(ctx, "#13241c", 10, floorBottom + 5, width - 20, 21);
  box(ctx, "#3a5144", 10, floorBottom - 1, width - 20, 5);
  box(ctx, "#506a58", door.x - 33, floorBottom - 2, 66, 9);
  box(ctx, "#263c30", door.x - 30, floorBottom, 60, 26);
  box(ctx, "#17271f", door.x - 26, floorBottom + 3, 52, 23);
  box(ctx, "#759282", door.x - 30, floorBottom, 60, 1);
  for (let x = door.x - 23; x <= door.x + 23; x += 7) box(ctx, "#a69b68", x, floorBottom + 4, 3, 2);
  for (const x of [69, 287, 415, 774, 902, 1120]) {
    box(ctx, "#101e16", x, floorBottom + 9, 30, 10);
    box(ctx, "#2e4839", x + 2, floorBottom + 11, 26, 6);
    for (let slat = 0; slat < 8; slat++) box(ctx, "#121e17", x + 4 + slat * 3, floorBottom + 12, 1, 3);
  }
}

function drawZone(ctx, x, y, w, h, shade, trim) {
  box(ctx, shade, x, y, w, h);
  box(ctx, trim, x, y, w, 2);
  box(ctx, trim, x, y + h - 2, w, 2);
  box(ctx, trim, x, y + 2, 2, h - 4);
  box(ctx, trim, x + w - 2, y + 2, 2, h - 4);
}

function drawStationZone(ctx, { x, y, screen }) {
  const left = x - 42;
  const top = y - 24;
  const width = 112;
  const height = 83;
  const right = left + width - 1;
  const bottom = top + height - 1;
  box(ctx, screen + "19", left, top, width, height);
  const light = ctx.createRadialGradient(x, y, 2, x, y, 59);
  light.addColorStop(0, screen + "2b");
  light.addColorStop(1, screen + "00");
  box(ctx, light, left, top, width, height);
  const edge = screen + "60";
  box(ctx, edge, left, top, width, 1);
  box(ctx, edge, left, bottom, width, 1);
  box(ctx, edge, left, top + 1, 1, height - 2);
  box(ctx, edge, right, top + 1, 1, height - 2);
  const corner = screen + "9b";
  for (const edgeY of [top, bottom]) {
    box(ctx, corner, left, edgeY, 7, 1);
    box(ctx, corner, right - 6, edgeY, 7, 1);
  }
}
function drawDesk(ctx, { number, id, x, y, screen, offline }, near, discovered, time, hot) {
  box(ctx, "#13261db0", x - 33, y + 10, 70, 21);
  box(ctx, "#142820", x - 32, y + 14, 6, 12);
  box(ctx, "#405b4e", x - 31, y + 16, 3, 9);
  box(ctx, "#142820", x + 27, y + 14, 6, 12);
  box(ctx, "#405b4e", x + 29, y + 16, 3, 9);

  box(ctx, "#162920", x - 34, y - 3, 68, 21);
  box(ctx, "#587767", x - 33, y - 3, 66, 15);
  box(ctx, "#456253", x - 33, y, 66, 12);
  box(ctx, "#3a5145", x - 32, y + 10, 64, 3);
  box(ctx, near ? "#82d6a4" : "#668578", x - 33, y + 13, 66, 2);
  box(ctx, "#273c32", x - 33, y + 15, 66, 5);
  box(ctx, "#314c3e", x - 30, y + 16, 25, 2);

  if (!offline) {
    // CRT case, screen and reflections.
    box(ctx, "#283e34", x - 14, y + 6, 30, 5);
    box(ctx, "#1b2b23", x - 16, y - 15, 32, 23);
    const casing = hot ? "#bc443e" : near ? "#9ebaaa" : "#6a8b7e";
    const phosphor = hot ? "#ffb3a0" : screen;
    box(ctx, casing, x - 15, y - 16, 30, 20);
    box(ctx, hot ? "#793230" : "#3d5a4f", x - 15, y + 2, 30, 5);
    box(ctx, hot ? "#f98d77" : "#a0b4a8", x - 13, y - 15, 25, 1);
    box(ctx, hot ? "#4c211f" : "#172a23", x - 11, y - 13, 22, 14);
    box(ctx, hot ? "#8c302d" : "#254739", x - 9, y - 11, 18, 10);
    box(ctx, phosphor, x - 7, y - 9, 2, 1);
    box(ctx, phosphor, x - 5, y - 8, 1, 1);
    box(ctx, phosphor, x - 7, y - 7, 2, 1);
    if (time % 1100 < 700) box(ctx, phosphor, x - 3, y - 6, 3, 1);
    box(ctx, hot ? "#d45a4d" : "#426f57", x + 2, y - 3, 6, 1);
    box(ctx, discovered && !hot ? "#baffbe" : phosphor, x + 10, y + 4, 2, 1);

    // Tower case and status light.
    const tower = x + (number % 2 ? 20 : -29);
    box(ctx, "#202e29", tower - 1, y - 3, 11, 14);
    box(ctx, hot ? "#9c3f36" : "#53685d", tower, y - 5, 9, 13);
    box(ctx, hot ? "#793230" : "#3a5147", tower + 1, y, 7, 9);
    box(ctx, "#202f27", tower + 2, y + 1, 5, 2);
    box(ctx, hot ? phosphor : "#91dfa8", tower + 2, y + 5, 1, 1);
  } else {
    box(ctx, "#27382f", x - 14, y - 4, 28, 10);
    box(ctx, "#354c3e", x - 9, y - 2, 19, 6);
    box(ctx, "#644735", x + 2, y + 2, 8, 3);
  }
  box(ctx, "#23362d", x - 10, y + 9, 21, 5);
  box(ctx, "#a2b3a5", x - 9, y + 9, 19, 3);
  for (let key = x - 8; key < x + 9; key += 3) box(ctx, "#586e61", key, y + 10, 1, 1);
  box(ctx, "#a2b3a5", x + 14, y + 9, 3, 3);
  box(ctx, "#182d23", x - 31, y + 11, 9, 1);
  box(ctx, "#192d23", x - 18, y + 15, 36, 12);
  box(ctx, near ? "#355d45" : "#2a4638", x - 17, y + 16, 34, 10);
  label(ctx, id, x, y + 17, near ? "#c5f1d2" : "#afd0bc");

  box(ctx, "#162a21", x - 8, y + 26, 16, 8);
  box(ctx, "#395346", x - 6, y + 26, 12, 3);
  box(ctx, "#506b5b", x - 6, y + 29, 12, 2);
  box(ctx, "#293f34", x - 5, y + 31, 10, 3);
}


function drawFurniture(ctx, { x, y, kind, box: bounds }, time) {
  if (kind === "rack") {
    box(ctx, "#14281fb5", x - 11, y + 5, 25, 13);
    box(ctx, "#3a5548", x - 11, y - 20, 22, 35);
    box(ctx, "#688173", x - 11, y - 20, 22, 4);
    box(ctx, "#162923", x - 9, y - 14, 18, 26);
    for (let slot = 0; slot < 6; slot++) {
      const row = y - 13 + slot * 4;
      box(ctx, "#425e51", x - 7, row, 14, 3);
      box(ctx, "#21372c", x - 6, row + 1, 7, 1);
      box(ctx, (time + slot * 351) % 1700 < 1000 ? "#a6deac" : "#526d5a", x + 5, row + 1, 1, 1);
    }
    return;
  }
  if (kind === "partition") {
    const [left, , right] = bounds;
    box(ctx, "#13271eae", left + 3, y, right - left, 13);
    box(ctx, "#415c50", left, y - 15, right - left, 20);
    box(ctx, "#789183", left, y - 15, right - left, 2);
    for (let rail = left + 4; rail < right - 2; rail += 12) box(ctx, "#355145", rail, y - 12, 2, 13);
    box(ctx, "#152b21", left, y + 4, right - left, 4);
    return;
  }
  if (kind === "shelf") {
    box(ctx, "#16291fd0", x - 33, y + 6, 70, 13);
    box(ctx, "#354f42", x - 34, y - 9, 68, 26);
    box(ctx, "#6e8271", x - 34, y - 10, 68, 3);
    box(ctx, "#1a2d23", x - 29, y - 4, 58, 16);
    box(ctx, "#607968", x - 33, y + 4, 66, 2);
    for (const [offset, shade] of [[-27, "#a1875e"], [-16, "#788e83"], [-7, "#8a776f"], [8, "#797a9a"], [17, "#65908c"]]) {
      box(ctx, shade, x + offset, y - 3, 7, 7);
      box(ctx, shade, x + offset + 1, y + 8, 5, 4);
    }
    return;
  }
  if (kind === "sofa") {
    box(ctx, "#17271ecd", x - 34, y + 5, 73, 13);
    box(ctx, "#535b4a", x - 36, y - 16, 72, 29);
    box(ctx, "#87916e", x - 34, y - 16, 68, 4);
    box(ctx, "#6b775b", x - 30, y - 12, 60, 18);
    box(ctx, "#919774", x - 28, y - 2, 56, 10);
    box(ctx, "#637052", x - 1, y - 12, 2, 20);
    box(ctx, "#333f32", x - 33, y + 10, 66, 4);
    return;
  }
  if (kind === "table") {
    box(ctx, "#16271ec0", x - 27, y + 7, 58, 12);
    box(ctx, "#536351", x - 26, y - 12, 52, 22);
    box(ctx, "#838d70", x - 26, y - 12, 52, 2);
    box(ctx, "#3c4c3e", x - 26, y + 10, 52, 4);
    box(ctx, "#a8a184", x + 8, y - 7, 9, 7);
    box(ctx, "#4d5d50", x + 10, y - 5, 5, 1);
    box(ctx, "#a48764", x - 10, y + 1, 7, 5);
    return;
  }
  if (kind === "crate") {
    box(ctx, "#14281fa3", x - 9, y + 5, 21, 7);
    box(ctx, "#324b3e", x - 9, y - 2, 19, 10);
    box(ctx, "#597060", x - 9, y - 4, 19, 4);
    box(ctx, "#223c2f", x - 1, y, 3, 7);
    box(ctx, "#ad956f", x, y + 2, 1, 2);
    return;
  }
  box(ctx, "#14281fa3", x - 6, y + 3, 15, 5);
  box(ctx, "#604d3d", x - 4, y + 1, 8, 4);
  box(ctx, "#957255", x - 5, y - 1, 10, 3);
  box(ctx, "#263f2e", x - 5, y - 7, 10, 7);
  box(ctx, "#45684b", x - 7, y - 7, 4, 3);
  box(ctx, "#688d5e", x - 5, y - 10, 4, 4);
  box(ctx, "#597b56", x + 1, y - 12, 4, 5);
  box(ctx, "#729768", x + 4, y - 8, 3, 4);
  box(ctx, "#88a97a", x - 1, y - 8, 3, 5);
}

function drawNote(ctx, note, nearby) {
  const x = note.x;
  const y = note.y;
  const hint = Boolean(note.station);
  box(ctx, "#151f18", x - 6, y - 4, 13, 9);
  box(ctx, hint ? (nearby ? "#d1f4e3" : "#9ccab9") : (nearby ? "#fff0bb" : "#e7ce91"), x - 6, y - 6, 12, 9);
  box(ctx, hint ? "#c2e3d2" : "#f3e1ab", x - 6, y - 6, 10, 1);
  for (let row = -4; row <= 0; row += 2) box(ctx, hint ? "#496f62" : "#8b7144", x - 4, y + row, 6, 1);
}
