export function box(ctx, color, x, y, width, height) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

export function pixels(ctx, color, x, y, size = 1) {
  box(ctx, color, Math.round(x), Math.round(y), size, size);
}

export function line(ctx, color, x0, y0, x1, y1, size = 1) {
  if (![x0, y0, x1, y1].every(Number.isFinite)) return;
  let x = Math.round(x0);
  let y = Math.round(y0);
  const endX = Math.round(x1);
  const endY = Math.round(y1);
  const dx = Math.abs(endX - x);
  const dy = -Math.abs(endY - y);
  const sx = x < endX ? 1 : -1;
  const sy = y < endY ? 1 : -1;
  let error = dx + dy;
  ctx.fillStyle = color;
  while (true) {
    ctx.fillRect(x, y, size, size);
    if (x === endX && y === endY) return;
    const twice = 2 * error;
    if (twice >= dy) {
      error += dy;
      x += sx;
    }
    if (twice <= dx) {
      error += dx;
      y += sy;
    }
  }
}

export function gunRay(player, aim, reach) {
  const x = player.x;
  const y = player.y - 9;
  let dx = aim.x - x;
  let dy = aim.y - y;
  const length = Math.hypot(dx, dy);
  if (length < 1) {
    dx = 0;
    dy = -1;
  } else {
    dx /= length;
    dy /= length;
  }
  return { x, y, dx, dy, muzzleX: x + dx * reach, muzzleY: y + dy * reach };
}
