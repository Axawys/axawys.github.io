const radius = 33;
const deadZone = 7;

export function createJoystick(canvas, indicator) {
  const thumb = indicator.querySelector("span");
  let active;
  let lastTouch;

  function start(event) {
    if (event.pointerType !== "touch") return false;
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    if (x >= bounds.width / 2) return false;
    event.preventDefault();
    if (active) return true;

    active = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, moved: false };
    lastTouch = active;
    indicator.style.left = x + "px";
    indicator.style.top = event.clientY - bounds.top + "px";
    thumb.style.transform = "";
    indicator.hidden = false;
    canvas.setPointerCapture(active.id);
    return true;
  }

  function move(event) {
    if (active?.id !== event.pointerId) return false;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    const distance = Math.hypot(dx, dy);
    const travel = Math.min(radius, distance);
    const directionX = distance ? dx / distance : 0;
    const directionY = distance ? dy / distance : 0;
    const strength = Math.max(0, travel - deadZone) / (radius - deadZone);
    active.dx = directionX * strength;
    active.dy = directionY * strength;
    active.moved ||= distance > deadZone;
    thumb.style.transform = "translate(" + directionX * travel + "px, " + directionY * travel + "px)";
    return true;
  }

  function reset() {
    if (!active) return;
    const { id } = active;
    active = undefined;
    indicator.hidden = true;
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }

  function release(event) {
    if (active?.id !== event.pointerId) return false;
    if (event.type !== "pointerleave") reset();
    return true;
  }

  function blocksClick(event) {
    return event.pointerType === "touch" && event.pointerId === lastTouch?.id && lastTouch.moved;
  }

  return { start, move, reset, release, blocksClick, get x() { return active?.dx ?? 0; }, get y() { return active?.dy ?? 0; } };
}
