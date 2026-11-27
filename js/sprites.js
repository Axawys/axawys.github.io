import { label, textWidth } from "./pixel-font.js";
import { box, gunRay, line, pixels } from "./pixels.js";

const robotTopOffset = { swarm: 10, spider: 17, agent: 26, walker: 33, furry: 36 };
const weaponIcons = {
  pistol: [
    "....................",
    "....................",
    "....oooooo..........",
    "...o++++++oooooo....",
    "...oxxxxxxxxxxxo....",
    "....oooxxxxoooo.....",
    "......oxxoo.........",
    ".....oxxo...........",
    ".....oxxo...........",
    ".....oooo...........",
  ],
  launcher: [
    "....................",
    ".....oooo.......oo..",
    "..oooxxxoooooooooxo.",
    ".ox++++++++++++++++o",
    ".oxxxxxxxxxxxxxxxxxo",
    "..oooooxxxxxooooooo.",
    "......oxooxo........",
    ".....oxxo.oxo.......",
    ".....oooo..oo.......",
    "....................",
  ],
  grenade: [
    "..........ooo.......",
    "........ooo+oo......",
    ".......o++o.oo......",
    "......oxxxxo........",
    ".....o++++xxo.......",
    ".....oxxxoxxo.......",
    ".....ooxooxxo.......",
    ".....oxxxoxxo.......",
    "......oxxxoo........",
    ".......oooo.........",
  ],
  flame: [
    "....................",
    ".....oooo...........",
    "....o++++o......o...",
    "..oooxxxxo...ooo+o..",
    ".ox+xxxxxxoooxx++xo.",
    ".oxxxxxxxxxxxxxxooo.",
    "..ooooxxooooxooo....",
    ".....oxxo..oo.......",
    ".....oooo...........",
    "....................",
  ],
  rifle: [
    "....................",
    "........ooo.........",
    "....oooo+++oooooo...",
    ".oooo+++++++++oo+oo.",
    ".oxxxxxxxxxxxxxxxxxo",
    ".oxoooxxxxxxooooooo.",
    "..oo..oxooxo........",
    ".....oxxo.oxo.......",
    ".....oooo..oxo......",
    "............oo......",
  ],
};

export function drawWeaponIcon(ctx, weapon) {
  const palette = { o: "#0b1811", x: weapon.color, "+": "#f0e8cd" };
  for (const [y, row] of weaponIcons[weapon.id].entries()) {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (color) box(ctx, color, x + 1, y + 1, 1, 1);
    }
  }
}

export function drawSupply(ctx, { x, y, unlock, weapon }) {
  const edge = unlock ? "#add5ba" : "#e1b573";
  box(ctx, "#101b16af", x - 10, y - 1, 22, 7);
  box(ctx, "#142820", x - 12, y - 10, 24, 14);
  box(ctx, edge, x - 12, y - 10, 24, 1);
  box(ctx, edge, x - 12, y + 3, 24, 1);
  box(ctx, edge, x - 12, y - 9, 1, 12);
  box(ctx, edge, x + 11, y - 9, 1, 12);
  if (unlock) {
    ctx.save();
    ctx.translate(x - 11, y - 9);
    drawWeaponIcon(ctx, weapon);
    ctx.restore();
    return;
  }
  for (const offset of [-6, 0, 6]) {
    box(ctx, weapon.color, x + offset - 1, y - 7, 3, 8);
    box(ctx, "#f7d593", x + offset, y - 8, 1, 2);
    box(ctx, "#835f38", x + offset - 1, y, 3, 1);
  }
}

function playerStatus(player, weapon) {
  const height = weapon ? 27 : 16;
  const half = weapon ? Math.max(21, Math.ceil(textWidth(weapon.name) / 2) + 4) : 21;
  return { x: Math.round(player.x), y: Math.round(player.y) - 24 - height, half, height };
}

export function drawPlayer(ctx, player, action, time) {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  if (action.dead) {
    box(ctx, "#182820", x - 11, y - 5, 22, 6);
    box(ctx, "#936444", x - 7, y - 7, 11, 7);
    box(ctx, "#c08e68", x + 4, y - 6, 6, 5);
    return;
  }

  const bob = player.moving && Math.floor(player.stride * 10) % 2 ? -1 : 0;
  const hit = action.invulnerable > 0 && Math.floor(time * 14) % 2;
  box(ctx, "#122419", x - 6, y - 1, 12, 3);
  box(ctx, "#182820", x - 5, y - 6, 10, 7);
  box(ctx, "#3d4c46", x - 4, y - 5 + bob, 3, 5);
  box(ctx, "#486157", x + 1, y - 5 - bob, 3, 5);
  box(ctx, "#9b603a", x - 6, y - 12 + bob, 12, 7);
  box(ctx, hit ? "#f6ddd0" : "#d29659", x - 4, y - 13 + bob, 8, 8);
  box(ctx, "#a66a40", x - 5, y - 5 + bob, 10, 1);
  box(ctx, "#eab177", x - 5, y - 11 + bob, 2, 5);
  box(ctx, "#b27a53", x + 3, y - 11 + bob, 2, 5);
  box(ctx, "#422d25", x - 4, y - 19 + bob, 8, 7);
  box(ctx, "#785745", x - 3, y - 20 + bob, 6, 2);
  box(ctx, "#a27452", x - 4, y - 18 + bob, 7, 2);
  if (player.facing === "north") {
    box(ctx, "#694536", x - 3, y - 16 + bob, 6, 3);
    box(ctx, "#edb981", x - 2, y - 13 + bob, 4, 1);
  } else {
    const face = player.facing === "west" ? x - 4 : x - 2;
    box(ctx, "#f0c096", face, y - 16 + bob, 6, 4);
    box(ctx, "#483328", face + 1, y - 15 + bob, 1, 1);
    box(ctx, "#483328", face + 4, y - 15 + bob, 1, 1);
  }

  if (action.medal) {
    line(ctx, "#c66c59", x - 3, y - 13 + bob, x, y - 9 + bob);
    line(ctx, "#e69b76", x + 3, y - 13 + bob, x, y - 9 + bob);
    box(ctx, "#845527", x - 2, y - 10 + bob, 5, 4);
    box(ctx, "#f4c45d", x - 1, y - 10 + bob, 3, 3);
    box(ctx, "#ffefaa", x, y - 10 + bob, 1, 1);
  }

  const weapon = action.armed ? action.weapon : null;
  const status = playerStatus(player, weapon);
  box(ctx, "#111e17", x - status.half, status.y, status.half * 2, status.height);
  if (weapon) label(ctx, weapon.name, x, status.y + 2, weapon.color);
  label(ctx, player.hp + " HP", x, y - 37, "#fff3d8");
  box(ctx, "#653b39", x - 17, y - 28, 34, 3);
  box(ctx, player.hp > 35 ? "#8fd39b" : "#fa8d79", x - 17, y - 28, Math.ceil(34 * player.hp / 100), 3);
}

export function drawWeapon(ctx, player, aim, weapon, laser) {
  const { x, y, dx, dy, muzzleX, muzzleY } = gunRay(player, aim, weapon.length);
  if (laser) {
    if (!aim.visible || weapon.kind === "grenade") return;
    const aimDistance = Math.hypot(aim.x - x, aim.y - y);
    if (aimDistance < weapon.length + 2) return;
    const distance = weapon.kind === "flame" ? Math.min(weapon.range, aimDistance) : aimDistance;
    const endX = x + dx * distance;
    const endY = y + dy * distance;
    line(ctx, "#ff404490", muzzleX, muzzleY, endX, endY);
    pixels(ctx, "#ff625f", endX - 1, endY - 1, 3);
    return;
  }
  if (weapon.kind === "grenade") {
    pixels(ctx, "#1b261d", muzzleX - 2, muzzleY - 2, 6);
    pixels(ctx, weapon.color, muzzleX - 1, muzzleY - 1, 4);
    return;
  }
  const stock = weapon.length > 9 ? -3 : 0;
  const body = weapon.length * 0.6;
  line(ctx, "#161d1b", x + dx * stock - 1, y + dy * stock - 1, x + dx * body - 1, y + dy * body - 1, weapon.thickness + 1);
  line(ctx, weapon.color, x + dx * stock, y + dy * stock, x + dx * body, y + dy * body, weapon.thickness);
  line(ctx, "#a8b7a5", x + dx * body, y + dy * body, muzzleX, muzzleY, weapon.kind === "rocket" ? 3 : 1);
  pixels(ctx, "#e44948", muzzleX, muzzleY, 2);
}

function drawFurry(ctx, robot, time) {
  const x = Math.round(robot.x);
  const y = Math.round(robot.y);
  const step = Math.round(Math.sin(robot.stride * 1.45) * 2);
  const tail = Math.round(Math.sin(robot.stride * 0.85) * 3);
  const outline = "#293446";
  const fur = time < robot.flash ? "#f1effb" : "#7f9dcf";
  const fluff = "#dbe4f5";

  box(ctx, "#14231bd0", x - 9, y - 1, 21, 4);
  box(ctx, outline, x + 5, y - 11 + tail, 11, 7);
  box(ctx, outline, x + 11, y - 18 + tail, 10, 11);
  box(ctx, "#6884b3", x + 9, y - 10 + tail, 8, 4);
  box(ctx, fur, x + 12, y - 17 + tail, 8, 9);
  box(ctx, fluff, x + 17, y - 17 + tail, 3, 5);
  box(ctx, fluff, x + 15, y - 17 + tail, 2, 3);

  for (const side of [-1, 1]) {
    const leg = x + side * 5 - 2;
    box(ctx, outline, leg - 1, y - 9 + side * step, 6, 8);
    box(ctx, "#627dab", leg, y - 8 + side * step, 4, 6);
    box(ctx, fluff, leg, y - 3 + side * step, 4, 2);
  }
  box(ctx, outline, x - 9, y - 19, 18, 13);
  box(ctx, fur, x - 7, y - 18, 14, 11);
  box(ctx, fluff, x - 3, y - 16, 6, 7);
  box(ctx, "#627dab", x - 10, y - 17 - step, 4, 8);
  box(ctx, "#627dab", x + 6, y - 17 + step, 4, 8);
  box(ctx, "#f7ae79", x - 7, y - 19, 14, 3);
  box(ctx, "#b86c5d", x + 4, y - 16, 3, 4);

  for (const side of [-1, 1]) {
    const ear = x + side * 7 - 2;
    box(ctx, outline, ear, y - 36, 5, 10);
    box(ctx, fur, ear + 1, y - 34, 3, 8);
    box(ctx, "#c78eae", ear + 2, y - 31, 2, 5);
  }
  box(ctx, outline, x - 9, y - 30, 18, 13);
  box(ctx, fur, x - 8, y - 29, 16, 10);
  box(ctx, fluff, x - 9, y - 23, 5, 4);
  box(ctx, fluff, x + 4, y - 23, 5, 4);
  box(ctx, fluff, x - 4, y - 22, 8, 5);
  box(ctx, outline, x - 6, y - 26, 4, 2);
  box(ctx, outline, x + 2, y - 26, 4, 2);
  box(ctx, "#ffcc88", x - 5, y - 25, 2, 1);
  box(ctx, "#ffcc88", x + 3, y - 25, 2, 1);
  box(ctx, outline, x - 2, y - 22, 4, 2);
  if (time < robot.attackUntil) {
    for (const offset of [0, 4, 8]) line(ctx, "#f6d9ac", x - 16 + offset, y - 14, x - 12 + offset, y - 20);
  }
}

export function drawRobot(ctx, robot, time) {
  if (robot.kind === "furry") {
    drawFurry(ctx, robot, time);
    return;
  }

  const x = Math.round(robot.x);
  const y = Math.round(robot.y);
  const walk = Math.sin(robot.stride * 1.2);
  const white = time < robot.flash;
  if (robot.kind === "walker") {
    const leg = Math.round(walk * 3);
    const body = white ? "#fbfff0" : "#c2ad73";
    box(ctx, "#14221b", x - 13, y - 2, 26, 4);
    for (const side of [-1, 1]) {
      const dx = side * 7;
      const step = side * leg;
      line(ctx, "#293833", x + dx, y - 15, x + dx + side, y - 5 + step, 5);
      box(ctx, "#8e9c88", x + dx - 1, y - 8 + step, 5, 3);
      box(ctx, "#52675e", x + dx - 3, y - 3 + step, 8, 3);
    }
    box(ctx, "#384640", x - 14, y - 31, 28, 19);
    box(ctx, body, x - 11, y - 33, 22, 19);
    box(ctx, "#61766a", x - 15, y - 27, 5, 13);
    box(ctx, "#61766a", x + 10, y - 27, 5, 13);
    box(ctx, "#38463c", x - 9, y - 29, 18, 8);
    box(ctx, "#ff795f", x - 6, y - 26, 12, 2);
    box(ctx, "#697569", x - 7, y - 18, 14, 2);
    return;
  }

  const small = robot.kind === "swarm";
  const agent = robot.kind === "agent";
  const size = agent ? 13 : small ? 5 : 9;
  const centerY = y - (size - 1);
  const metal = white ? "#faf9e3" : small ? "#b89a78" : "#b9aca2";
  const eye = agent ? robot.color : small ? "#f6a071" : "#ff7761";
  box(ctx, "#14231bd0", x - size - 4, y - 2, (size + 4) * 2, 4);
  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 4; leg++) {
      const stride = Math.round(walk * (leg % 2 === 0 ? 3 : -3));
      const tip = x + side * (size + (agent ? 7 : 4) + (leg % 2) * 2);
      const joint = centerY + leg * (small ? 1 : 3) - size / 2;
      const foot = y + leg * 2 - 3 + stride;
      line(ctx, "#879b8b", x + side * (size - 2), joint, tip, joint - 4 + stride);
      line(ctx, "#5d776a", tip, joint - 4 + stride, tip + side * 2, foot);
    }
  }
  box(ctx, "#2a3a33", x - size, centerY - size + 1, size * 2, size * 2);
  box(ctx, metal, x - size + 1, centerY - size, size * 2 - 2, size + 3);
  box(ctx, "#38443c", x - size + 2, centerY - size + 2, size * 2 - 4, small ? 3 : 7);
  box(ctx, eye, x - size + 4, centerY - size + (small ? 3 : 4), size * 2 - 8, small ? 1 : 2);
  box(ctx, "#769384", x - 2, centerY + 2, 4, 1);
  if (agent) {
    box(ctx, eye, x - size + 2, centerY + 4, 3, 3);
    box(ctx, eye, x + size - 5, centerY + 4, 3, 3);
  }
}

function findSpareTagPosition(occupied, view, center, above, half, height, alignedRows) {
  const rows = alignedRows ? [...alignedRows] : [view.top, ...occupied.flatMap(tag => [tag.y + tag.height + 2, tag.y - height - 2])];
  rows.sort((a, b) => Math.abs(a - above) - Math.abs(b - above));
  const columns = [...occupied].sort((a, b) => (a.x - a.half) - (b.x - b.half));
  const right = view.right - half;
  for (const y of rows) {
    if (y < view.top || y + height > view.bottom) continue;
    let left = view.left + half;
    let bestX;
    for (const tag of columns) {
      if (tag.y >= y + height + 2 || y >= tag.y + tag.height + 2) continue;
      const end = Math.min(right, tag.x - tag.half - half - 2);
      if (left <= end) {
        if (alignedRows) return { x: left, y };
        const x = Math.max(left, Math.min(end, center));
        if (bestX === undefined || Math.abs(x - center) < Math.abs(bestX - center)) bestX = x;
      }
      left = Math.max(left, tag.x + tag.half + half + 2);
    }
    if (left <= right) {
      if (alignedRows) return { x: left, y };
      const x = Math.max(left, Math.min(right, center));
      if (bestX === undefined || Math.abs(x - center) < Math.abs(bestX - center)) bestX = x;
    }
    if (bestX !== undefined) return { x: bestX, y };
  }
  return { x: center, y: above };
}

function findTagPosition(occupied, view, anchorX, anchorY, feetY, half, height, alignedRows) {
  const clampX = x => Math.max(view.left + half, Math.min(view.right - half, x));
  const clampY = y => Math.max(view.top, Math.min(view.bottom - height, y));
  const center = clampX(anchorX);
  const above = clampY(anchorY - height - 3);
  if (alignedRows) return findSpareTagPosition(occupied, view, center, above, half, height, alignedRows);
  const below = clampY(feetY + 5);
  const spacing = half * 2 + 4;
  const columns = [center, clampX(anchorX - spacing), clampX(anchorX + spacing)];
  for (let offset = 0; above - offset >= view.top || below + offset + height <= view.bottom; offset += height + 2) {
    for (const y of [above - offset, below + offset]) {
      if (y < view.top || y + height > view.bottom) continue;
      for (const x of columns) {
        const overlap = occupied.some(tag => Math.abs(tag.x - x) < tag.half + half + 2
          && tag.y < y + height + 2 && y < tag.y + tag.height + 2);
        if (!overlap) return { x, y };
      }
    }
  }
  return findSpareTagPosition(occupied, view, center, above, half, height);
}

export function drawRobotTags(ctx, robots, livingPlayer, camera, weapon = null) {
  if (!robots.length) return;
  const left = Math.round(camera.x);
  const top = Math.round(camera.y);
  const view = { left: left + 3, right: left + camera.w - 3, top: top + 3, bottom: top + camera.h - 3 };
  const tags = [];
  const visible = [];
  const tagHeight = 23;
  const occupied = livingPlayer ? [playerStatus(livingPlayer, weapon)] : [];
  for (const robot of robots) {
    if (robot.x < left - 12 || robot.x > view.right + 15 || robot.y < top || robot.y > view.bottom + 33) continue;
    const anchorX = Math.round(robot.x);
    const feetY = Math.round(robot.y);
    const anchorY = feetY - robotTopOffset[robot.kind];
    const hp = robot.hp + " HP";
    const half = Math.ceil(Math.max(textWidth(robot.name), textWidth(hp)) / 2) + 4;
    visible.push({ anchorX, anchorY, feetY, half, hp, robot });
  }
  visible.sort((a, b) => b.half - a.half);
  let rows;
  if (visible.length >= 18) {
    // Shared baselines leave usable gaps when both copies of an encounter are active.
    rows = [];
    for (let row = view.top; row + tagHeight <= view.bottom; row += tagHeight + 2) rows.push(row);
  }
  for (const entry of visible) {
    const { anchorX, anchorY, feetY, half } = entry;
    const { x, y } = findTagPosition(occupied, view, anchorX, anchorY, feetY, half, tagHeight, rows);
    const tag = { ...entry, x, y, height: tagHeight };
    tags.push(tag);
    occupied.push(tag);
  }
  for (const { x, y, height, anchorX, anchorY, feetY, robot } of tags) {
    const above = y < anchorY;
    line(ctx, robot.color + "79", x, above ? y + height : y, anchorX, above ? anchorY : feetY + 2);
  }
  for (const { x, y, half, height, hp, robot } of tags) {
    const barLeft = x - 17;
    box(ctx, "#17251ff0", x - half, y, 2 * half, height);
    label(ctx, robot.name, x, y + 2, robot.color);
    label(ctx, hp, x, y + 10, "#fff3d8");
    box(ctx, "#634442", barLeft, y + 18, 34, 3);
    box(ctx, "#ee8a75", barLeft, y + 18, Math.max(1, Math.floor(34 * robot.hp / robot.maxHp)), 3);
  }
}

function drawElder(ctx, visitor, time, player, x, y, step) {
  const side = player.x >= x ? 1 : -1;
  const striking = time < visitor.swingUntil;
  const raised = visitor.phase === "swing";
  box(ctx, "#352e27", x - 5, y - 6 - step, 4, 6);
  box(ctx, "#40362c", x + 1, y - 6 + step, 4, 6);
  box(ctx, "#554538", x - 7, y - 15, 14, 10);
  box(ctx, "#9a7557", x - 5, y - 16, 10, 9);
  box(ctx, "#d3b890", x - 3, y - 16, 6, 2);
  box(ctx, "#e6ba92", x - 4, y - 23, 9, 8);
  box(ctx, "#e1ded0", x - 5, y - 25, 10, 4);
  box(ctx, "#eee8dc", x - 3, y - 19, 7, 3);
  box(ctx, "#5d463b", x + side * 2, y - 21, 2, 1);
  const handX = x + side * 7;
  const handY = y - (raised ? 17 : 10);
  const tipX = handX + side * (striking ? 14 : raised ? 5 : 3);
  const tipY = striking ? y - 12 : raised ? y - 28 : y;
  box(ctx, "#dab18d", handX - 1, handY, 3, 3);
  line(ctx, "#5f412e", handX, handY + 1, tipX, tipY, 2);
  line(ctx, "#d2ac75", handX, handY, tipX, tipY);
  if (striking) line(ctx, "#f3d5a7", tipX - side * 5, tipY - 4, tipX, tipY - 3);
}

export function drawVisitor(ctx, visitor, time, player) {
  const x = Math.round(visitor.x);
  const y = Math.round(visitor.y);
  const step = Math.round(Math.sin(visitor.stride * 1.4));
  box(ctx, "#13241bcc", x - 7, y - 1, 14, 4);
  if (visitor.kind === "elder") {
    drawElder(ctx, visitor, time, player, x, y, step);
  } else {
    box(ctx, "#435c71", x - 5, y - 7 - step, 4, 7);
    box(ctx, "#3d5061", x + 1, y - 7 + step, 4, 7);
    box(ctx, "#693d47", x - 7, y - 16, 14, 10);
    box(ctx, "#9b6570", x - 5, y - 17, 10, 10);
    for (const pixel of [-4, 0, 4]) box(ctx, "#5c4753", x + pixel, y - 16, 1, 9);
    box(ctx, "#aa8080", x - 5, y - 13, 10, 1);
    box(ctx, "#dec2ae", x - 4, y - 25, 8, 8);
    box(ctx, "#afa294", x - 5, y - 26, 10, 3);
    box(ctx, "#3c3a3e", x - 4, y - 22, 8, 1);
    box(ctx, "#f2e3c3", x - 3, y - 21, 6, 1);
  }

  if (Math.hypot(x - player.x, y - player.y) < 94 || time < visitor.labelUntil) {
    const name = visitor.kind === "elder" ? "Старик" : "Линус Торвальдс";
    const half = Math.ceil(textWidth(name) / 2) + 4;
    const abovePlayer = visitor.kind === "elder" && Math.abs(x - player.x) < half + 37;
    const tagY = abovePlayer ? Math.min(y - 40, Math.round(player.y) - 65) : y - 40;
    box(ctx, "#192921f5", x - half, tagY, half * 2, 11);
    label(ctx, name, x, tagY + 2, "#f2e3c3");
  }
}

function drawGentooFire(ctx, x, y, time) {
  const glow = ctx.createRadialGradient(x, y - 14, 1, x, y - 14, 52);
  glow.addColorStop(0, "#ff9f496e");
  glow.addColorStop(1, "#f36f2800");
  box(ctx, glow, x - 52, y - 66, 104, 104);
  const frame = Math.floor(time * 14);
  for (let i = 0; i < 7; i++) {
    const left = x - 17 + i * 5;
    const base = y + 2 - Math.abs(i - 3);
    const flame = 12 + (3 - Math.abs(i - 3)) * 4 + (frame * (i % 3 + 1) + i * 3) % 9;
    box(ctx, "#b64b32", left, base - flame + 3, 5, flame - 3);
    box(ctx, "#ec7137", left + 1, base - flame, 3, flame);
    box(ctx, "#fbb55f", left + 1, base - Math.floor(flame * 0.68), 4, Math.floor(flame * 0.68));
    box(ctx, "#fff0b4", left + 2, base - Math.floor(flame * 0.4), 2, Math.floor(flame * 0.4));
    pixels(ctx, "#ffc576", left + (i % 3), base - flame - 3 - frame % 5, 2);
  }
  for (let i = 0; i < 4; i++) {
    const rise = (frame + i * 6) % 22;
    box(ctx, "#53504bb0", x - 9 + i * 5 + Math.floor(rise / 4), y - 28 - rise, 4 + i, 3 + i);
  }
}

export function drawBlastZones(ctx, pending) {
  for (const { blast, phase } of pending) {
    if (!blast) continue;
    const { x, y, radius } = blast;
    ctx.fillStyle = phase === "fire" ? "#e7794e26" : "#e7794e17";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    const color = phase === "fire" ? "#f5a474" : "#bd765a";
    for (let i = 0; i < 48; i++) {
      const angle = i * Math.PI / 24;
      const end = angle + 0.077;
      line(ctx, color, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius,
        x + Math.cos(end) * radius, y + Math.sin(end) * radius, 2);
    }
  }
}

function drawCelebration(ctx, show) {
  if (!show) return;
  for (const { x, y, start, radius, color, spin } of show.launches) {
    const age = show.elapsed - start;
    if (age < 0.32) {
      const tip = y + 43 * (1 - age / 0.32);
      line(ctx, color + "8e", x, tip + 13, x, tip + 2);
      pixels(ctx, "#fff1ba", x - 1, tip, 3);
      continue;
    }
    const progress = (age - 0.32) / 1.13;
    const growth = 1 - (1 - progress) ** 2;
    ctx.globalAlpha = (1 - progress) ** 0.7;
    for (let i = 0; i < 38; i++) {
      const angle = (i / 38 + spin) * Math.PI * 2;
      const spread = radius * growth * (i % 3 === 0 ? 0.64 : 1);
      const px = x + Math.cos(angle) * spread;
      const py = y + Math.sin(angle) * spread + progress ** 2 * 16;
      if (i % 2 === 0) {
        line(ctx, color + "88", px - Math.cos(angle) * 5, py - Math.sin(angle) * 5, px, py);
      }
      pixels(ctx, i % 6 === 0 ? "#fff1ba" : color, px, py, progress < 0.48 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }
}

export function drawEffects(ctx, action, time) {
  for (const { station, remaining, phase: heat } of action.pending) {
    if (heat === "fire") {
      drawGentooFire(ctx, station.x, station.y, time);
      continue;
    }
    if (heat === "overheat") continue;
    const pulse = Math.round((1 - remaining) * 6);
    const phase = Math.round(time * 25) % 3;
    box(ctx, "#ffab6140", station.x - 12, station.y - 13, 24, 15);
    for (const dx of [-14, -5, 6, 13]) pixels(ctx, "#ffdf98", station.x + dx, station.y - 9 - (dx + 15 + phase * 2) % 8, pulse > 4 ? 2 : 1);
  }

  for (const shock of action.shocks) {
    const progress = 1 - shock.life / shock.total;
    const radius = Math.ceil(shock.radius * (1 - (1 - progress) ** 2));
    ctx.globalAlpha = (1 - progress) * 0.9;
    for (let index = 0; index < 48; index++) {
      const angle = index * Math.PI / 24;
      pixels(ctx, shock.color, shock.x + Math.cos(angle) * radius, shock.y + Math.sin(angle) * radius * 0.72, progress < 0.48 ? 3 : 2);
    }
  }
  for (const particle of action.particles) {
    const fade = particle.life / particle.total;
    ctx.globalAlpha = Math.min(1, fade * 2);
    const size = Math.max(1, Math.ceil(particle.size * (particle.smoke ? 1.2 - fade * 0.5 : fade)));
    pixels(ctx, particle.color, particle.x, particle.y, size);
  }
  ctx.globalAlpha = 1;
  for (const projectile of action.projectiles) {
    const { x, y, weapon } = projectile;
    if (weapon.kind === "rocket") {
      line(ctx, "#e879456e", x - projectile.dx * 15, y - projectile.dy * 15, x, y, 2);
      pixels(ctx, "#fff0ab", x - 1, y - 1, 4);
    } else {
      pixels(ctx, "#14211bc0", x - 2, y - 1, 5);
      pixels(ctx, "#718650", x - 2, y - projectile.lift - 2, 5);
      pixels(ctx, projectile.lift < 1 && Math.floor(time * 16) % 2 ? "#ff9159" : "#d2d793", x, y - projectile.lift - 2, 2);
    }
  }
  for (const shot of action.shots) {
    ctx.globalAlpha = Math.min(1, shot.life * 13);
    line(ctx, "#ffe9a4", shot.x, shot.y, shot.endX, shot.endY);
    pixels(ctx, "#fff6ce", shot.x - 2, shot.y - 2, 5);
  }
  ctx.globalAlpha = 1;
  drawCelebration(ctx, action.celebration);
}
