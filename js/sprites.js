import { box, gunRay, label, line, pixels } from "./pixels.js";

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

  box(ctx, "#15241ded", x - 17, y - 36, 34, 12);
  label(ctx, player.hp + " HP", x, y - 35, "#f0eadb", 7);
  box(ctx, "#653b39", x - 14, y - 27, 28, 2);
  box(ctx, player.hp > 35 ? "#8fd39b" : "#fa8d79", x - 14, y - 27, Math.ceil(28 * player.hp / 100), 2);
}

export function drawWeapon(ctx, player, aim, laser) {
  const { x, y, dx, dy, muzzleX, muzzleY } = gunRay(player, aim);
  if (laser) {
    if (!aim.visible || Math.hypot(aim.x - x, aim.y - y) < 15) return;
    line(ctx, "#ff404490", muzzleX, muzzleY, aim.x, aim.y);
    pixels(ctx, "#ff625f", aim.x - 1, aim.y - 1, 3);
    return;
  }
  line(ctx, "#161d1b", x - dx * 3 - 1, y - dy * 3 - 1, x + dx * 7 - 1, y + dy * 7 - 1, 4);
  line(ctx, "#89958a", x - dx * 2, y - dy * 2, x + dx * 7, y + dy * 7, 3);
  line(ctx, "#a8b7a5", x + dx * 6, y + dy * 6, muzzleX, muzzleY);
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
  const size = small ? 5 : 9;
  const centerY = y - (small ? 4 : 8);
  const metal = white ? "#faf9e3" : small ? "#b89a78" : "#b9aca2";
  const eye = small ? "#f6a071" : "#ff7761";
  box(ctx, "#14231bd0", x - size - 4, y - 2, (size + 4) * 2, 4);
  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 4; leg++) {
      const stride = Math.round(walk * (leg % 2 === 0 ? 3 : -3));
      const tip = x + side * (size + 4 + (leg % 2) * 2);
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

export function drawEffects(ctx, action, time) {
  for (const { station, remaining } of action.pending) {
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
  for (const shot of action.shots) {
    ctx.globalAlpha = Math.min(1, shot.life * 13);
    line(ctx, "#ffe9a4", shot.x, shot.y, shot.endX, shot.endY);
    pixels(ctx, "#fff6ce", shot.x - 2, shot.y - 2, 5);
  }
  ctx.globalAlpha = 1;
}
