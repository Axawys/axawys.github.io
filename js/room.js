export const width = 360;
export const height = 224;

export const stations = [
  { number: 1, x: 82, y: 60, screen: "#80dbc1" },
  { number: 2, x: 180, y: 60, screen: "#b4a6e2" },
  { number: 3, x: 278, y: 60, screen: "#83bedc" },
  { number: 4, x: 82, y: 128, screen: "#91d7ad" },
  { number: 5, x: 278, y: 128, screen: "#e0bd84" },
];

const spawn = { x: 180, y: 184, facing: "north", moving: false, stride: 0 };
export const player = { ...spawn };

const furniture = [
  { x: 31, y: 55, kind: "rack", depth: 74, box: [20, 48, 44, 75] },
  { x: 329, y: 55, kind: "rack", depth: 74, box: [316, 48, 341, 75] },
  { x: 31, y: 110, kind: "plant", depth: 115, box: [24, 105, 38, 116] },
  { x: 328, y: 111, kind: "plant", depth: 116, box: [321, 106, 336, 118] },
  { x: 30, y: 181, kind: "crate", depth: 190, box: [21, 178, 40, 191] },
  { x: 330, y: 181, kind: "crate", depth: 190, box: [320, 178, 339, 191] },
];
const obstacles = [
  ...furniture.map(({ box }) => box),
  ...stations.flatMap(({ x, y }) => [
    [x - 33, y - 3, x + 33, y + 20],
    [x - 7, y + 19, x + 7, y + 32],
  ]),
];
const layers = [
  ...furniture,
  ...stations.map(station => ({ kind: "desk", station, depth: station.y + 28 })),
].sort((a, b) => a.depth - b.depth);

export function movePlayer(dx, dy, elapsed) {
  player.moving = Boolean(dx || dy);
  if (!player.moving) return;

  player.facing = dy < 0 ? "north" : dy > 0 ? "south" : dx < 0 ? "west" : "east";
  const step = elapsed * 87 / Math.hypot(dx, dy);
  const x = Math.max(15, Math.min(345, player.x + dx * step));
  const y = Math.max(48, Math.min(205, player.y + dy * step));
  const blocked = (atX, atY) => obstacles.some(([left, top, right, bottom]) =>
    atX + 3 > left && atX - 3 < right && atY > top && atY - 3 < bottom);

  if (!blocked(x, player.y)) player.x = x;
  if (!blocked(player.x, y)) player.y = y;
  player.stride += elapsed;
}

export function nearestStation() {
  return stations.find(({ x, y }) => Math.abs(player.x - x) <= 28
    && player.y >= y + 19 && player.y <= y + 48);
}

export function createRenderer(canvas) {
  const context = canvas.getContext("2d");
  const backdrop = document.createElement("canvas");
  backdrop.width = width;
  backdrop.height = height;
  drawRoom(backdrop.getContext("2d"));

  return (nearby, visited, time) => {
    context.drawImage(backdrop, 0, 0);
    let drawnPlayer = false;
    for (const layer of layers) {
      if (!drawnPlayer && player.y < layer.depth) {
        drawPlayer(context);
        drawnPlayer = true;
      }
      if (layer.kind === "desk") {
        const station = layer.station;
        drawDesk(context, station, station === nearby, visited.has(station.number), time);
      } else {
        drawFurniture(context, layer, time);
      }
    }
    if (!drawnPlayer) drawPlayer(context);
  };
}

function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function pixelLabel(ctx, words, x, y, color, size = 7) {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  ctx.fillText(words, x, y);
}

function drawRoom(ctx) {
  rect(ctx, "#101915", 0, 0, width, height);
  rect(ctx, "#21352c", 10, 2, 340, 23);
  rect(ctx, "#172820", 10, 4, 340, 2);
  for (let x = 16; x < 350; x += 19) {
    rect(ctx, "#2a4036", x, 7, 2, 14);
    rect(ctx, "#1c2d25", x + 2, 7, 1, 14);
  }
  rect(ctx, "#3e5a4b", 10, 24, 340, 2);
  rect(ctx, "#263b30", 10, 26, 340, 13);
  rect(ctx, "#15251d", 10, 37, 340, 3);

  for (const x of [32, 260]) {
    rect(ctx, "#15241c", x - 2, 12, 72, 11);
    rect(ctx, "#315040", x, 14, 68, 6);
    rect(ctx, "#638c74", x + 3, 15, 62, 3);
    rect(ctx, "#addbb5", x + 5, 15, 58, 1);
    rect(ctx, "#4d6c56", x + 1, 26, 66, 1);
  }
  rect(ctx, "#13251e", 149, 9, 62, 19);
  rect(ctx, "#4c715a", 150, 10, 60, 14);
  rect(ctx, "#253f33", 151, 11, 58, 12);
  pixelLabel(ctx, "LINUX LAB", 180, 13, "#a0d8ab", 7);
  for (const x of [119, 230]) {
    rect(ctx, "#192b22", x, 22, 11, 13);
    rect(ctx, "#536354", x + 2, 23, 7, 8);
    rect(ctx, "#b1916b", x + 3, 24, 4, 2);
    rect(ctx, "#394b40", x + 3, 27, 5, 1);
  }

  const tileColors = ["#23362e", "#253930", "#263a31", "#24372f", "#273b32"];
  rect(ctx, "#1a2c25", 10, 40, 340, 170);
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 17; col++) {
      const x = 10 + col * 20;
      const y = 40 + row * 19;
      const index = (row * row + col * 3 + row * col) % tileColors.length;
      rect(ctx, tileColors[index], x + 1, y + 1, 19, 18);
      rect(ctx, "#31473c", x + 2, y + 1, 17, 1);
      rect(ctx, "#2c4237", x + 3 + index * 2, y + 6 + (col + row) % 7, 3, 1);
      if ((col + row * 3) % 7 === 0) rect(ctx, "#1e3229", x + 14, y + 13, 2, 1);
    }
  }
  rect(ctx, "#12271c55", 10, 40, 340, 9);
  rect(ctx, "#12271c25", 10, 49, 340, 7);

  // Mark the central aisle and the door threshold.
  for (const x of [157, 201]) {
    for (let y = 118; y < 202; y += 9) rect(ctx, "#566d55", x, y, 2, 4);
  }
  for (const y of [98, 170]) {
    const last = y === 98 ? 296 : 112;
    for (let x = 64; x < last; x += 6) rect(ctx, "#3b5547", x, y, 2, 1);
    if (y === 170) {
      for (let x = 250; x < 299; x += 6) rect(ctx, "#3b5547", x, y, 2, 1);
    }
  }
  rect(ctx, "#23372d", 147, 202, 66, 10);
  rect(ctx, "#52614d", 147, 205, 66, 2);
  rect(ctx, "#13241c", 13, 212, 334, 12);
  rect(ctx, "#3a5144", 10, 210, 340, 3);
  rect(ctx, "#172c23", 2, 27, 8, 190);
  rect(ctx, "#415b49", 7, 28, 3, 183);
  rect(ctx, "#172c23", 350, 27, 8, 190);
  rect(ctx, "#415b49", 350, 28, 3, 183);
  for (const x of [10, 347]) {
    for (const y of [53, 119, 187]) {
      rect(ctx, "#14271c", x - 1, y, 5, 12);
      rect(ctx, "#547360", x, y + 3, 3, 6);
      rect(ctx, "#91bd9d", x + 1, y + 4, 1, 3);
    }
  }
  rect(ctx, "#506a58", 147, 210, 66, 7);
  rect(ctx, "#263c30", 150, 211, 60, 13);
  rect(ctx, "#17271f", 153, 213, 54, 11);
  rect(ctx, "#759282", 150, 211, 60, 1);
  for (let x = 157; x < 204; x += 7) rect(ctx, "#a69b68", x, 214, 3, 2);
  for (const x of [42, 297]) {
    rect(ctx, "#101e16", x, 213, 21, 8);
    rect(ctx, "#2e4839", x + 2, 214, 17, 4);
    for (let slat = 0; slat < 5; slat++) rect(ctx, "#121e17", x + 3 + slat * 3, 215, 1, 2);
  }
}

function drawDesk(ctx, { number, x, y, screen }, near, discovered, time) {
  rect(ctx, "#13261db0", x - 33, y + 10, 70, 21);
  rect(ctx, "#142820", x - 32, y + 14, 6, 12);
  rect(ctx, "#405b4e", x - 31, y + 16, 3, 9);
  rect(ctx, "#142820", x + 27, y + 14, 6, 12);
  rect(ctx, "#405b4e", x + 29, y + 16, 3, 9);

  rect(ctx, "#162920", x - 34, y - 3, 68, 21);
  rect(ctx, "#587767", x - 33, y - 3, 66, 15);
  rect(ctx, "#456253", x - 33, y, 66, 12);
  rect(ctx, "#3a5145", x - 32, y + 10, 64, 3);
  rect(ctx, near ? "#82d6a4" : "#668578", x - 33, y + 13, 66, 2);
  rect(ctx, "#273c32", x - 33, y + 15, 66, 5);
  rect(ctx, "#314c3e", x - 30, y + 16, 25, 2);

  // CRT case, screen and reflections.
  rect(ctx, "#283e34", x - 14, y + 6, 30, 5);
  rect(ctx, "#1b2b23", x - 16, y - 15, 32, 23);
  rect(ctx, near ? "#9ebaaa" : "#6a8b7e", x - 15, y - 16, 30, 20);
  rect(ctx, "#3d5a4f", x - 15, y + 2, 30, 5);
  rect(ctx, "#a0b4a8", x - 13, y - 15, 25, 1);
  rect(ctx, "#172a23", x - 11, y - 13, 22, 14);
  rect(ctx, "#254739", x - 9, y - 11, 18, 10);
  rect(ctx, screen, x - 7, y - 9, 2, 1);
  rect(ctx, screen, x - 5, y - 8, 1, 1);
  rect(ctx, screen, x - 7, y - 7, 2, 1);
  if (time % 1100 < 700) rect(ctx, screen, x - 3, y - 6, 3, 1);
  rect(ctx, "#426f57", x + 2, y - 3, 6, 1);
  rect(ctx, discovered ? "#baffbe" : screen, x + 10, y + 4, 2, 1);

  // Tower, keyboard, mouse and a nameplate.
  const tower = x + (number % 2 ? 20 : -29);
  rect(ctx, "#202e29", tower - 1, y - 3, 11, 14);
  rect(ctx, "#53685d", tower, y - 5, 9, 13);
  rect(ctx, "#3a5147", tower + 1, y, 7, 9);
  rect(ctx, "#202f27", tower + 2, y + 1, 5, 2);
  rect(ctx, "#91dfa8", tower + 2, y + 5, 1, 1);
  rect(ctx, "#23362d", x - 10, y + 9, 21, 5);
  rect(ctx, "#a2b3a5", x - 9, y + 9, 19, 3);
  for (let key = x - 8; key < x + 9; key += 3) rect(ctx, "#586e61", key, y + 10, 1, 1);
  rect(ctx, "#a2b3a5", x + 14, y + 9, 3, 3);
  rect(ctx, "#182d23", x - 31, y + 11, 9, 1);
  rect(ctx, "#192d23", x - 13, y + 16, 26, 10);
  rect(ctx, near ? "#355d45" : "#2a4638", x - 12, y + 17, 24, 8);
  pixelLabel(ctx, `PC-0${number}`, x, y + 17, near ? "#c5f1d2" : "#afd0bc");

  rect(ctx, "#162a21", x - 8, y + 26, 16, 8);
  rect(ctx, "#395346", x - 6, y + 26, 12, 3);
  rect(ctx, "#506b5b", x - 6, y + 29, 12, 2);
  rect(ctx, "#293f34", x - 5, y + 31, 10, 3);
}

function drawFurniture(ctx, { x, y, kind }, time) {
  if (kind === "rack") {
    rect(ctx, "#14281fb5", x - 10, y + 6, 24, 16);
    rect(ctx, "#3a5548", x - 9, y - 7, 18, 24);
    rect(ctx, "#688173", x - 9, y - 7, 18, 3);
    rect(ctx, "#162923", x - 7, y - 3, 14, 17);
    for (let slot = 0; slot < 4; slot++) {
      const row = y - 2 + slot * 4;
      rect(ctx, "#425e51", x - 6, row, 12, 3);
      rect(ctx, "#21372c", x - 4, row + 1, 5, 1);
      rect(ctx, (time + slot * 351) % 1700 < 1000 ? "#a6deac" : "#526d5a", x + 4, row + 1, 1, 1);
    }
    return;
  }
  if (kind === "crate") {
    rect(ctx, "#14281fa3", x - 9, y + 5, 21, 7);
    rect(ctx, "#324b3e", x - 9, y - 2, 19, 10);
    rect(ctx, "#597060", x - 9, y - 4, 19, 4);
    rect(ctx, "#223c2f", x - 1, y, 3, 7);
    rect(ctx, "#ad956f", x, y + 2, 1, 2);
    return;
  }
  rect(ctx, "#14281fa3", x - 6, y + 3, 15, 5);
  rect(ctx, "#604d3d", x - 4, y + 1, 8, 4);
  rect(ctx, "#957255", x - 5, y - 1, 10, 3);
  rect(ctx, "#263f2e", x - 5, y - 7, 10, 7);
  rect(ctx, "#45684b", x - 7, y - 7, 4, 3);
  rect(ctx, "#688d5e", x - 5, y - 10, 4, 4);
  rect(ctx, "#597b56", x + 1, y - 12, 4, 5);
  rect(ctx, "#729768", x + 4, y - 8, 3, 4);
  rect(ctx, "#88a97a", x - 1, y - 8, 3, 5);
}

function drawPlayer(ctx) {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const striding = player.moving && Math.floor(player.stride * 9) % 2;
  const bob = striding ? -1 : 0;

  rect(ctx, "#122419", x - 6, y - 1, 12, 3);
  rect(ctx, "#182820", x - 5, y - 6, 10, 7);
  rect(ctx, "#3d4c46", x - 4, y - 5 + bob, 3, 5);
  rect(ctx, "#486157", x + 1, y - 5 - bob, 3, 5);
  rect(ctx, "#9b603a", x - 6, y - 12 + bob, 12, 7);
  rect(ctx, "#d29659", x - 4, y - 13 + bob, 8, 8);
  rect(ctx, "#a66a40", x - 5, y - 5 + bob, 10, 1);
  rect(ctx, "#eab177", x - 5, y - 11 + bob, 2, 5);
  rect(ctx, "#b27a53", x + 3, y - 11 + bob, 2, 5);

  rect(ctx, "#422d25", x - 4, y - 19 + bob, 8, 7);
  rect(ctx, "#785745", x - 3, y - 20 + bob, 6, 2);
  rect(ctx, "#a27452", x - 4, y - 18 + bob, 7, 2);
  if (player.facing === "north") {
    rect(ctx, "#694536", x - 3, y - 16 + bob, 6, 3);
    rect(ctx, "#edb981", x - 2, y - 13 + bob, 4, 1);
  } else {
    const face = player.facing === "west" ? x - 4 : x - 2;
    rect(ctx, "#f0c096", face, y - 16 + bob, 6, 4);
    rect(ctx, "#483328", face + 1, y - 15 + bob, 1, 1);
    rect(ctx, "#483328", face + 4, y - 15 + bob, 1, 1);
  }
}
