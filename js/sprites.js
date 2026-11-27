import { box, gunRay, label, line, pixels } from "./pixels.js";

const robotTopOffset = { swarm: 10, spider: 17, agent: 26, walker: 33 };
const healthGlyphs = {
  0: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "10000", "11110", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
};
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

function playerStatus(player, weapon) {
  const height = weapon ? 27 : 16;
  const half = weapon ? Math.max(21, Math.ceil(weapon.name.length * 2.2) + 4) : 21;
  return { x: Math.round(player.x), y: Math.round(player.y) - 24 - height, half, height };
}

function drawHealthText(ctx, hp, x, y) {
  const digits = String(hp);
  const width = (digits.length + 2) * 6 + 3;
  let left = x - Math.floor(width / 2);
  ctx.fillStyle = "#fff3d8";
  for (const character of digits + " HP") {
    if (character === " ") {
      left += 4;
      continue;
    }
    const glyph = healthGlyphs[character];
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === "1") ctx.fillRect(left + col, y + row, 1, 1);
      }
    }
    left += 6;
  }
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

  const weapon = action.armed ? action.weapon : null;
  const status = playerStatus(player, weapon);
  box(ctx, "#111e17", x - status.half, status.y, status.half * 2, status.height);
  if (weapon) label(ctx, weapon.name, x, status.y + 2, weapon.color, 7);
  drawHealthText(ctx, player.hp, x, y - 37);
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

export function drawRobot(ctx, robot, time) {
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

function findTagPosition(occupied, view, anchorX, anchorY, feetY, half, height) {
  const clampX = x => Math.max(view.left + half, Math.min(view.right - half, x));
  const clampY = y => Math.max(view.top, Math.min(view.bottom - height, y));
  const center = clampX(anchorX);
  const above = clampY(anchorY - height - 3);
  const below = clampY(feetY + 5);
  const columns = [center, clampX(anchorX - half - 5), clampX(anchorX + half + 5)];
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
  return { x: center, y: above };
}

export function drawRobotTags(ctx, robots, livingPlayer, camera, weapon = null) {
  if (!robots.length) return;
  const left = Math.round(camera.x);
  const top = Math.round(camera.y);
  const view = { left: left + 3, right: left + camera.w - 3, top: top + 3, bottom: top + camera.h - 3 };
  const tags = [];
  const occupied = livingPlayer ? [playerStatus(livingPlayer, weapon)] : [];
  for (const robot of robots) {
    if (robot.x < left - 12 || robot.x > view.right + 15 || robot.y < top || robot.y > view.bottom + 33) continue;
    const size = robot.kind === "swarm" ? 7 : 8;
    const anchorX = Math.round(robot.x);
    const feetY = Math.round(robot.y);
    const anchorY = feetY - robotTopOffset[robot.kind];
    const half = Math.ceil(robot.name.length * size * 0.3) + 4;
    const height = size + 7;
    const { x, y } = findTagPosition(occupied, view, anchorX, anchorY, feetY, half, height);
    const tag = { x, y, anchorX, anchorY, feetY, half, size, height, robot };
    tags.push(tag);
    occupied.push(tag);
  }
  for (const { x, y, height, anchorX, anchorY, feetY, robot } of tags) {
    const above = y < anchorY;
    line(ctx, robot.color + "79", x, above ? y + height : y, anchorX, above ? anchorY : feetY + 2);
  }
  for (const { x, y, half, size, height, robot } of tags) {
    const barWidth = robot.kind === "swarm" ? 18 : 30;
    const barLeft = x - barWidth / 2;
    box(ctx, "#17251ff0", x - half, y, 2 * half, height);
    label(ctx, robot.name, x, y + 1, robot.color, size);
    box(ctx, "#634442", barLeft, y + height - 5, barWidth, 3);
    box(ctx, "#ee8a75", barLeft, y + height - 5, Math.ceil(barWidth * robot.hp / robot.maxHp), 3);
  }
}

export function drawVisitor(ctx, visitor, time, player) {
  const x = Math.round(visitor.x);
  const y = Math.round(visitor.y);
  const step = Math.round(Math.sin(visitor.stride * 1.4));
  box(ctx, "#13241bcc", x - 7, y - 1, 14, 4);
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

  if (Math.hypot(x - player.x, y - player.y) < 94 || time < visitor.labelUntil) {
    box(ctx, "#192921f5", x - 45, y - 40, 90, 11);
    label(ctx, "Линус Торвальдс", x, y - 38, "#f2e3c3", 8);
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
}
