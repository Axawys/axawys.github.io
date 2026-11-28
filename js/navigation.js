import { door, height, isWalkable, moveBody, width } from "./room.js";

const tile = 10;
const columns = Math.ceil(width / tile);
const rows = Math.ceil(height / tile);
const neighbors = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const passable = Uint8Array.from({ length: columns * rows }, (_, index) => {
  const point = center(index);
  return Number(isWalkable(point.x, point.y, 6));
});
const offsets = neighbors.map(([dx, dy]) => dx + dy * columns);
const edges = Uint8Array.from(passable, (free, index) => {
  if (!free) return 0;
  const { x, y } = center(index);
  let mask = 0;
  for (let i = 0; i < neighbors.length; i++) {
    const [dx, dy] = neighbors[i];
    if (passable[index + offsets[i]] && isWalkable(x + dx * tile / 2, y + dy * tile / 2, 6)) mask |= 1 << i;
  }
  return mask;
});

function center(index) {
  return { x: (index % columns + 0.5) * tile, y: (Math.floor(index / columns) + 0.5) * tile };
}

export function nearestCell(x, y) {
  const column = Math.floor(x / tile);
  const row = Math.floor(y / tile);
  let best = -1;
  let bestDistance = Infinity;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const nextColumn = column + dx;
      const nextRow = row + dy;
      if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows) continue;
      const index = nextRow * columns + nextColumn;
      if (!passable[index]) continue;
      const point = center(index);
      const distance = (x - point.x) ** 2 + (y - point.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
  }
  return best;
}

export function makeField(start) {
  const parent = new Int32Array(passable.length).fill(-1);
  if (start < 0) return parent;

  const queue = new Int32Array(passable.length);
  let end = 1;
  queue[0] = start;
  parent[start] = start;
  for (let head = 0; head < end; head++) {
    const index = queue[head];
    for (let i = 0; i < offsets.length; i++) {
      const next = index + offsets[i];
      if (!(edges[index] & (1 << i)) || parent[next] !== -1) continue;
      parent[next] = index;
      queue[end++] = next;
    }
  }
  return parent;
}

export function clearPath(body, target, radius = body.radius) {
  const dx = target.x - body.x;
  const dy = target.y - body.y;
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6));
  for (let step = 1; step <= count; step++) {
    if (!isWalkable(body.x + dx * step / count, body.y + dy * step / count, radius)) return false;
  }
  return true;
}

export function pursue(body, target, field, distance) {
  let next = target;
  if (!clearPath(body, target)) {
    const cell = nearestCell(body.x, body.y);
    if (cell < 0 || field[cell] < 0) return false;
    const following = field[cell];
    next = center(following);
    if (following === cell || !clearPath(body, next)) next = center(cell);
  }
  const dx = next.x - body.x;
  const dy = next.y - body.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.05) return false;
  const speed = Math.min(1, distance / length);
  return moveBody(body, dx * speed, dy * speed);
}

const doorCell = nearestCell(door.x, door.y);
const doorField = makeField(doorCell);
const exitY = height + 28;

export function exitDistance(actor) {
  const outside = exitY - door.y;
  if (actor.phase === "exit") return Math.max(0, exitY - actor.y);
  if (clearPath(actor, door)) return Math.hypot(door.x - actor.x, door.y - actor.y) + outside;

  let cell = nearestCell(actor.x, actor.y);
  if (cell < 0 || doorField[cell] < 0) return Math.hypot(door.x - actor.x, door.y - actor.y) + outside;
  const start = center(cell);
  let distance = Math.hypot(start.x - actor.x, start.y - actor.y);
  for (; cell !== doorCell; cell = doorField[cell]) distance += tile;
  const end = center(doorCell);
  return distance + Math.hypot(end.x - door.x, end.y - door.y) + outside;
}

export function walkOut(actor, elapsed, speed) {
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
  return actor.y >= exitY;
}
