import { box, label, pixels } from "./pixels.js";
import { drawEffects, drawPlayer, drawRobot, drawVisitor, drawWeapon } from "./sprites.js";

export const width = 980;
export const height = 670;
export const door = { x: 490, y: 629 };
const floor = { left: 15, right: width - 15, top: 49, bottom: 638 };

export const stations = [
  { number: 1, x: 153, y: 117, screen: "#80dbc1" },
  { number: 2, x: 459, y: 112, screen: "#b4a6e2" },
  { number: 3, x: 804, y: 133, screen: "#83bedc" },
  { number: 4, x: 152, y: 418, screen: "#91d7ad" },
  { number: 5, x: 813, y: 410, screen: "#e0bd84" },
];

export const player = { x: 490, y: 471, facing: "north", moving: false, stride: 0, hp: 100, radius: 4 };
export const noteSpots = [
  { x: 454, y: 438 }, { x: 538, y: 458 }, { x: 459, y: 502 },
  { x: 523, y: 520 }, { x: 490, y: 407 }, { x: 494, y: 540 },
].map(spot => ({ ...spot, kind: "note" }));

function item(kind, x, y, box) {
  return { kind, x, y, box: box.map((side, index) => side + (index % 2 ? y : x)) };
}

const furniture = [
  item("rack", 57, 111, [-13, -13, 13, 15]),
  item("rack", 82, 111, [-13, -13, 13, 15]),
  item("shelf", 260, 114, [-35, -7, 35, 18]),
  item("partition", 215, 248, [-82, -4, 82, 8]),
  item("partition", 768, 253, [-83, -4, 83, 8]),
  item("shelf", 555, 116, [-35, -7, 35, 18]),
  item("rack", 882, 122, [-13, -13, 13, 15]),
  item("rack", 908, 122, [-13, -13, 13, 15]),
  item("rack", 933, 122, [-13, -13, 13, 15]),
  item("crate", 895, 180, [-10, -5, 12, 10]),
  item("crate", 917, 180, [-10, -5, 12, 10]),
  item("plant", 336, 125, [-7, -2, 7, 7]),
  item("plant", 635, 128, [-7, -2, 7, 7]),
  item("plant", 102, 251, [-7, -2, 7, 7]),
  item("plant", 877, 254, [-7, -2, 7, 7]),
  item("crate", 57, 324, [-10, -5, 12, 10]),
  item("shelf", 100, 382, [-34, -7, 34, 18]),
  item("crate", 196, 497, [-10, -5, 12, 10]),
  item("crate", 219, 497, [-10, -5, 12, 10]),
  item("shelf", 831, 480, [-34, -7, 34, 18]),
  item("shelf", 920, 424, [-34, -7, 34, 18]),
  item("plant", 343, 377, [-7, -2, 7, 7]),
  item("plant", 631, 374, [-7, -2, 7, 7]),
  item("sofa", 347, 446, [-36, -10, 36, 15]),
  item("sofa", 638, 446, [-36, -10, 36, 15]),
  item("table", 348, 500, [-27, -10, 27, 17]),
  item("table", 637, 500, [-27, -10, 27, 17]),
  item("plant", 276, 485, [-7, -2, 7, 7]),
  item("plant", 705, 485, [-7, -2, 7, 7]),
  item("plant", 406, 592, [-7, -2, 7, 7]),
  item("plant", 574, 592, [-7, -2, 7, 7]),
  item("sofa", 213, 607, [-36, -10, 36, 15]),
  item("sofa", 767, 607, [-36, -10, 36, 15]),
  item("crate", 40, 599, [-10, -5, 12, 10]),
  item("crate", 935, 599, [-10, -5, 12, 10]),
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
  const step = elapsed * 107 / Math.hypot(dx, dy);
  player.moving = moveBody(player, dx * step, dy * step);
  if (player.moving) player.stride += elapsed;
}

export function nearestInteraction(note) {
  if (Math.hypot(player.x - note.x, player.y - note.y) < 23) return note;
  return stations.find(station => !station.offline && !station.busy && Math.abs(player.x - station.x) <= 29
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
  function draw({ nearby, visited, note, action, time }) {
    const shake = reduceMotion.matches ? 0 : action.shake * 7;
    const offsetX = Math.round(Math.sin(time * 74) * shake);
    const offsetY = Math.round(Math.cos(time * 59) * shake);
    box(context, "#101915", 0, 0, camera.w, camera.h);
    context.save();
    context.translate(-Math.round(camera.x) + offsetX, -Math.round(camera.y) + offsetY);
    context.drawImage(backdrop, 0, 0);
    const layers = [...fixedLayers];
    for (const station of stations) {
      layers.push({
        depth: station.y + 30,
        draw: () => drawDesk(context, station, station === nearby, visited.has(station.number), time * 1000),
      });
    }
    layers.push({ depth: note.y, draw: () => drawNote(context, note, nearby === note, time) });
    for (const robot of action.robots) layers.push({ depth: robot.y, draw: () => drawRobot(context, robot, time) });
    if (action.visitor) layers.push({ depth: action.visitor.y, draw: () => drawVisitor(context, action.visitor, time, player) });
    layers.push({ depth: player.y, draw: () => {
      drawPlayer(context, player, action, time);
      if (!action.dead && action.armed) drawWeapon(context, player, action.aim, false);
    } });
    for (const layer of layers.sort((a, b) => a.depth - b.depth)) layer.draw(context, time * 1000);
    if (!action.dead && action.armed) drawWeapon(context, player, action.aim, true);
    drawEffects(context, action, time);
    context.restore();
  }
  return { camera, follow, worldPoint, screenPoint, draw };
}

function drawOffice(ctx) {
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

  for (const x of [62, 220, 410, 504, 712, 864]) {
    box(ctx, "#15241c", x - 2, 12, 72, 11);
    box(ctx, "#315040", x, 14, 68, 6);
    box(ctx, "#638c74", x + 3, 15, 62, 3);
    box(ctx, "#addbb5", x + 5, 15, 58, 1);
  }
  box(ctx, "#89ab90", 457, 30, 66, 18);
  box(ctx, "#354f40", 458, 31, 64, 16);
  label(ctx, "LINUX LAB", 490, 35, "#c4e0bc", 10);

  const tileColors = ["#23362e", "#253930", "#263a31", "#24372f", "#273b32"];
  box(ctx, "#1a2c25", 10, 41, width - 20, 603);
  ctx.save();
  ctx.beginPath();
  ctx.rect(10, 41, width - 20, 603);
  ctx.clip();
  for (let row = 0; row < 32; row++) {
    for (let col = 0; col < 48; col++) {
      const x = 10 + col * 20;
      const y = 41 + row * 19;
      const index = (row * row + col * 3 + row * col) % tileColors.length;
      box(ctx, tileColors[index], x + 1, y + 1, 19, 18);
      box(ctx, "#31473c", x + 2, y + 1, 17, 1);
      box(ctx, "#2c4237", x + 3 + index * 2, y + 6 + (col + row) % 7, 3, 1);
      if ((col + row * 3) % 7 === 0) box(ctx, "#1e3229", x + 14, y + 13, 2, 1);
    }
  }
  ctx.restore();
  box(ctx, "#12271c70", 10, 41, width - 20, 9);
  box(ctx, "#12271c30", 10, 50, width - 20, 7);

  for (const [x, y, w, h, shade, trim] of [
    [40, 82, 282, 124, "#47675935", "#5c7b6480"],
    [382, 77, 218, 119, "#5c586e30", "#7b718477"],
    [740, 93, 205, 106, "#47667842", "#608a9d88"],
    [46, 367, 226, 167, "#5c6d463f", "#81895680"],
    [744, 369, 212, 163, "#66594245", "#927e5585"],
    [301, 419, 510, 112, "#5c665125", "#7b85604d"],
  ]) drawZone(ctx, x, y, w, h, shade, trim);

  for (const x of [455, 524]) {
    for (let y = 269; y < 623; y += 12) box(ctx, "#78906d88", x, y, 2, 5);
  }
  for (const y of [293, 345]) {
    for (let x = 34; x < 948; x += 15) {
      if (x < 443 || x > 536) box(ctx, "#6f866b65", x, y, 6, 2);
    }
  }
  for (const [x, y, text] of [
    [156, 220, "01 / QA"], [466, 208, "02 / DEVELOPMENT"], [820, 220, "03 / NETWORK"],
    [158, 547, "04 / BUILD"], [827, 547, "05 / OPERATIONS"], [490, 388, "BREAK AREA"], [490, 609, "EXIT"],
  ]) label(ctx, text, x, y, "#b4c8a993", 9);

  for (const [x, y, shade] of [
    [152, 118, "#89d0a532"], [459, 113, "#b2a7e02b"], [815, 141, "#87bdcf35"],
    [152, 418, "#88bc7930"], [813, 410, "#e4c58630"], [490, 453, "#d7d5a740"],
    [490, 635, "#bdcda22b"],
  ]) {
    const glow = ctx.createRadialGradient(x, y, 1, x, y, 104);
    glow.addColorStop(0, shade);
    glow.addColorStop(1, "#0000");
    box(ctx, glow, x - 104, y - 104, 208, 208);
  }

  box(ctx, "#15271e", 2, 28, 8, 622);
  box(ctx, "#415b49", 7, 28, 3, 616);
  box(ctx, "#15271e", width - 10, 28, 8, 622);
  box(ctx, "#415b49", width - 10, 28, 3, 616);
  for (const x of [9, width - 12]) {
    for (let y = 78; y < 638; y += 72) {
      box(ctx, "#13231c", x - 1, y, 5, 13);
      box(ctx, "#547360", x, y + 3, 3, 6);
      box(ctx, "#91bd9d", x + 1, y + 4, 1, 3);
    }
  }
  box(ctx, "#13241c", 10, 649, width - 20, 21);
  box(ctx, "#3a5144", 10, 643, width - 20, 5);
  box(ctx, "#506a58", door.x - 33, 642, 66, 9);
  box(ctx, "#263c30", door.x - 30, 644, 60, 26);
  box(ctx, "#17271f", door.x - 26, 647, 52, 23);
  box(ctx, "#759282", door.x - 30, 644, 60, 1);
  for (let x = door.x - 23; x <= door.x + 23; x += 7) box(ctx, "#a69b68", x, 648, 3, 2);
  for (const x of [70, 293, 666, 898]) {
    box(ctx, "#101e16", x, 653, 30, 10);
    box(ctx, "#2e4839", x + 2, 655, 26, 6);
    for (let slat = 0; slat < 8; slat++) box(ctx, "#121e17", x + 4 + slat * 3, 656, 1, 3);
  }
}

function drawZone(ctx, x, y, w, h, shade, trim) {
  box(ctx, shade, x, y, w, h);
  box(ctx, trim, x, y, w, 2);
  box(ctx, trim, x, y + h - 2, w, 2);
  box(ctx, trim, x, y + 2, 2, h - 4);
  box(ctx, trim, x + w - 2, y + 2, 2, h - 4);
}
function drawDesk(ctx, { number, x, y, screen, offline }, near, discovered, time) {
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
    box(ctx, near ? "#9ebaaa" : "#6a8b7e", x - 15, y - 16, 30, 20);
    box(ctx, "#3d5a4f", x - 15, y + 2, 30, 5);
    box(ctx, "#a0b4a8", x - 13, y - 15, 25, 1);
    box(ctx, "#172a23", x - 11, y - 13, 22, 14);
    box(ctx, "#254739", x - 9, y - 11, 18, 10);
    box(ctx, screen, x - 7, y - 9, 2, 1);
    box(ctx, screen, x - 5, y - 8, 1, 1);
    box(ctx, screen, x - 7, y - 7, 2, 1);
    if (time % 1100 < 700) box(ctx, screen, x - 3, y - 6, 3, 1);
    box(ctx, "#426f57", x + 2, y - 3, 6, 1);
    box(ctx, discovered ? "#baffbe" : screen, x + 10, y + 4, 2, 1);

    // Tower, keyboard, mouse and a nameplate.
    const tower = x + (number % 2 ? 20 : -29);
    box(ctx, "#202e29", tower - 1, y - 3, 11, 14);
    box(ctx, "#53685d", tower, y - 5, 9, 13);
    box(ctx, "#3a5147", tower + 1, y, 7, 9);
    box(ctx, "#202f27", tower + 2, y + 1, 5, 2);
    box(ctx, "#91dfa8", tower + 2, y + 5, 1, 1);
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
  box(ctx, "#192d23", x - 13, y + 16, 26, 10);
  box(ctx, near ? "#355d45" : "#2a4638", x - 12, y + 17, 24, 8);
  label(ctx, `PC-0${number}`, x, y + 17, near ? "#c5f1d2" : "#afd0bc");

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

function drawNote(ctx, note, nearby, time) {
  const x = note.x;
  const y = note.y;
  box(ctx, "#151f18", x - 6, y - 4, 13, 9);
  box(ctx, nearby ? "#fff0bb" : "#e7ce91", x - 6, y - 6, 12, 9);
  box(ctx, "#f3e1ab", x - 6, y - 6, 10, 1);
  for (let row = -4; row <= 0; row += 2) box(ctx, "#8b7144", x - 4, y + row, 6, 1);
  if (Math.sin(time * 2.5) > 0.45) pixels(ctx, "#ffe4a2", x + 9, y - 8, 2);
}
