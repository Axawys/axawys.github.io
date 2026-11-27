import { createAction } from "./action.js";
import { createRenderer, movePlayer, nearestInteraction, noteSpots, player, stations } from "./room.js";
import { shuffleSystems } from "./systems.js";
import { tasks } from "./tasks.js";
import { createTerminal } from "./terminal.js";

const byId = id => document.getElementById(id);
const canvas = byId("room");
const interactButton = byId("interact");
const interactText = interactButton.querySelector("span");
const noteDialog = byId("note");
const noteList = byId("tasks");
const hintPanel = byId("station-hint");
const health = byId("health");
const death = byId("death");
const eventNotices = byId("event-notices");
const activeNotices = [];
const note = noteSpots[Math.floor(Math.random() * noteSpots.length)];
const systems = shuffleSystems();
const notes = [note, ...stations.map((station, index) => ({
  kind: "note",
  x: station.x + station.hintSide * 58,
  y: station.y + 44,
  station,
  task: tasks.find(task => task.system === systems[index].name),
}))];

const renderer = createRenderer(canvas);
const action = createAction(showNotice);
const terminal = createTerminal(stations, systems, (task, station) => {
  taskRows.get(task).classList.add("done");
  action.trigger(task.event, station, renderer.camera);
});

function showNotice(message, warning = false) {
  const element = document.createElement("p");
  element.textContent = message;
  element.classList.toggle("warning", warning);
  eventNotices.append(element);
  activeNotices.push({ element, expires: action.state.time + 4.5 });
}

function commandSequence(task) {
  const instruction = document.createDocumentFragment();
  if (task.setup) {
    const setup = document.createElement("code");
    setup.textContent = task.setup;
    instruction.append(setup, " → ");
  }
  const command = document.createElement("code");
  command.textContent = task.command;
  instruction.append(command);
  return instruction;
}

const taskRows = new Map(tasks.map(task => {
  const row = document.createElement("li");
  const title = document.createElement("strong");
  title.textContent = task.title;
  const instruction = document.createElement("span");
  instruction.append(commandSequence(task));
  row.append(title, instruction);
  noteList.append(row);
  return [task, row];
}));

const keys = new Set();
const directions = new Map();
const movement = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]);
let nearby;
let previousTime;
let pointer;
let shootingPointer;
let canvasPressArmed = false;
let shotRequest;
let interactionKeyHeld = false;

function interact() {
  if (action.state.dead || terminal.isOpen || noteDialog.open) return false;
  const target = nearestInteraction(notes);
  if (!target) return false;

  resetInput();
  if (target.kind === "note") openNote(target);
  else terminal.open(target);
  return true;
}

function openNote(target) {
  const hint = target.task;
  noteList.hidden = Boolean(hint);
  byId("note-controls").hidden = Boolean(hint);
  hintPanel.hidden = !hint;
  byId("note-title").textContent = hint ? "Подсказка для PC-0" + target.station.number : "Список дел";
  if (hint) {
    byId("hint-task").textContent = hint.title;
    byId("hint-command").replaceChildren(commandSequence(hint));
  }
  noteDialog.showModal();
}

function closeNote() {
  noteDialog.close();
  canvas.focus({ preventScroll: true });
}

function resetInput() {
  keys.clear();
  directions.clear();
  stopShooting();
  shotRequest = undefined;
  interactionKeyHeld = false;
}

function updateInteraction(paused) {
  const target = paused || action.state.dead ? undefined : nearestInteraction(notes);
  if (target !== nearby) {
    nearby = target;
    interactButton.hidden = !target;
    interactText.textContent = target?.task ? "Читать подсказку" : target === note ? "Читать записку" : "Сесть за ПК";
  }
  if (!target) return;

  const point = renderer.screenPoint(target.x, target.y - (target.kind === "note" ? 37 : 20));
  const half = interactButton.offsetWidth / 2 + 5;
  interactButton.style.left = Math.max(half, Math.min(canvas.clientWidth - half, point.x)) + "px";
  interactButton.style.top = Math.max(interactButton.offsetHeight + 5, point.y) + "px";
}

interactButton.addEventListener("click", interact);
byId("close-note").addEventListener("click", closeNote);
noteDialog.addEventListener("cancel", event => {
  event.preventDefault();
  closeNote();
});

window.addEventListener("keydown", event => {
  if (event.code === "KeyE" && event.repeat && interactionKeyHeld) {
    event.preventDefault();
    return;
  }
  if (terminal.isOpen) {
    terminal.handleKey(event);
    return;
  }
  if (noteDialog.open || action.state.dead || event.altKey || event.ctrlKey || event.metaKey) return;
  if (movement.has(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  } else if (event.code === "KeyE" && !event.repeat) {
    event.preventDefault();
    interactionKeyHeld = interact();
  }
});

window.addEventListener("keyup", event => {
  keys.delete(event.code);
  if (event.code === "KeyE") interactionKeyHeld = false;
});
window.addEventListener("blur", resetInput);
document.addEventListener("visibilitychange", () => {
  resetInput();
  previousTime = undefined;
});

byId("game").addEventListener("wheel", event => {
  if (!action.state.armed || terminal.isOpen || noteDialog.open || event.ctrlKey || !event.deltaY) return;
  event.preventDefault();
  action.cycleWeapon(event.deltaY);
}, { passive: false });

for (const button of document.querySelectorAll("[data-direction]")) {
  button.addEventListener("pointerdown", event => {
    if (event.button !== 0 || action.state.dead) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    directions.set(event.pointerId, button.dataset.direction);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(type, event => directions.delete(event.pointerId));
  }
}

function aim(event) {
  if (event.pointerType === "touch" && event.pointerId !== shootingPointer) return;
  pointer = { x: event.clientX, y: event.clientY, type: event.pointerType };
}

function stopShooting() {
  if (shootingPointer === undefined) return;
  if (canvas.hasPointerCapture(shootingPointer)) canvas.releasePointerCapture(shootingPointer);
  shootingPointer = undefined;
  if (pointer?.type === "touch") pointer = undefined;
}

canvas.addEventListener("pointermove", aim);
canvas.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  canvasPressArmed = action.state.armed;
  if (!canvasPressArmed || shootingPointer !== undefined) return;
  shootingPointer = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  aim(event);
  shotRequest = pointer;
  event.preventDefault();
});
function releaseAim(event) {
  if (event.pointerId !== shootingPointer && event.type !== "pointerleave") return;
  if (event.type !== "pointerleave") shootingPointer = undefined;
  if (event.pointerType === "touch" || event.type === "pointerleave") pointer = undefined;
}
for (const type of ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"]) {
  canvas.addEventListener(type, releaseAim);
}
canvas.addEventListener("click", event => {
  if (canvasPressArmed || action.state.armed || !nearby) return;
  const point = renderer.worldPoint(event.clientX, event.clientY);
  if (Math.abs(point.x - nearby.x) < 34 && Math.abs(point.y - nearby.y) < 33) interact();
});

function frame(time) {
  const frameElapsed = previousTime === undefined ? 0 : (time - previousTime) / 1000;
  const elapsed = Math.min(frameElapsed, 0.033);
  previousTime = time;
  const paused = terminal.isOpen || noteDialog.open;
  const canMove = !paused && !action.state.dead;
  const pressed = new Set([...keys, ...directions.values()]);
  const dx = Number(pressed.has("KeyD") || pressed.has("ArrowRight")) - Number(pressed.has("KeyA") || pressed.has("ArrowLeft"));
  const dy = Number(pressed.has("KeyS") || pressed.has("ArrowDown")) - Number(pressed.has("KeyW") || pressed.has("ArrowUp"));
  movePlayer(canMove ? dx : 0, canMove ? dy : 0, elapsed);
  renderer.follow(elapsed, false);
  const target = pointer ?? shotRequest;
  if (target) {
    Object.assign(action.state.aim, renderer.worldPoint(target.x, target.y), {
      visible: Boolean(pointer) && target.x >= 0 && target.x <= canvas.clientWidth
        && target.y >= 0 && target.y <= canvas.clientHeight,
    });
  } else {
    action.state.aim.visible = false;
  }
  const respawned = !paused && action.update(elapsed, shootingPointer !== undefined, Boolean(shotRequest), frameElapsed);
  shotRequest = undefined;
  if (!action.state.armed) stopShooting();
  if (respawned) {
    resetInput();
    renderer.follow(elapsed, true);
  }
  updateInteraction(paused);
  if (health.value !== String(player.hp)) health.value = String(player.hp);
  if (death.hidden === action.state.dead) death.hidden = !action.state.dead;
  while (activeNotices[0]?.expires <= action.state.time) activeNotices.shift().element.remove();
  canvas.classList.toggle("armed", action.state.armed);
  renderer.draw({ nearby, visited: terminal.visited, notes, action: action.state, time: action.state.time });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
