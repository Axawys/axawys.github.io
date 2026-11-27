import { createAction } from "./action.js";
import { createAchievements } from "./achievements.js";
import { createRenderer, movePlayer, nearestInteraction, noteSpots, player, stations } from "./room.js";
import { drawWeaponIcon } from "./sprites.js";
import { shuffleSystems } from "./systems.js";
import { finaleAchievement, tasks } from "./tasks.js";
import { createTerminal } from "./terminal.js";
import { weapons } from "./weapons.js";

const byId = id => document.getElementById(id);
const canvas = byId("room");
const interactButton = byId("interact");
const interactText = interactButton.querySelector("span");
const noteDialog = byId("note");
const noteList = byId("tasks");
const hintPanel = byId("station-hint");
const health = byId("health");
const death = byId("death");
const weaponSlots = byId("weapon-slots");
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
const achievements = createAchievements([...tasks, finaleAchievement], () => canvas.focus({ preventScroll: true }));
const action = createAction(showNotice, () => achievements.unlock(finaleAchievement));
action.state.medal = achievements.has(finaleAchievement.event);
const terminal = createTerminal(stations, systems, (task, station) => {
  taskRows.get(task).classList.add("done");
  action.trigger(task.event, station, renderer.camera);
  achievements.unlock(task);
});

const slotButtons = weapons.map((weapon, index) => {
  const slot = document.createElement("button");
  const key = document.createElement("kbd");
  const icon = document.createElement("canvas");
  const name = document.createElement("span");
  const ammo = document.createElement("small");
  const number = String(index + 1);
  slot.className = "weapon-slot";
  slot.type = "button";
  slot.setAttribute("aria-pressed", "false");
  slot.setAttribute("aria-keyshortcuts", number);
  key.setAttribute("aria-hidden", "true");
  key.textContent = number;
  icon.className = "weapon-slot-icon";
  icon.width = 22;
  icon.height = 12;
  icon.setAttribute("aria-hidden", "true");
  drawWeaponIcon(icon.getContext("2d"), weapon);
  name.textContent = weapon.name;
  ammo.className = "weapon-ammo";
  ammo.setAttribute("aria-hidden", "true");
  slot.append(key, ammo, icon, name);
  slot.addEventListener("click", () => action.selectWeapon(index));
  weaponSlots.append(slot);
  return { slot, ammo };
});
let shownWeapon;

function updateWeaponSlots() {
  const { armed, weapon, ammo } = action.state;
  if (weaponSlots.hidden === armed) weaponSlots.hidden = !armed;
  if (!armed) return;
  for (const [index, button] of slotButtons.entries()) {
    if (weapon !== shownWeapon) button.slot.setAttribute("aria-pressed", String(weapons[index] === weapon));
    const count = String(ammo[index]);
    if (button.ammo.textContent === count) continue;
    button.ammo.textContent = count;
    button.slot.classList.toggle("empty", ammo[index] === 0);
    button.slot.setAttribute("aria-label", weapons[index].name + " · боезапас " + count);
  }
  shownWeapon = weapon;
}

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
  if (action.state.dead || terminal.isOpen || noteDialog.open || achievements.isOpen) return false;
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
  byId("note-title").textContent = hint ? "Подсказка для " + target.station.id : "Список дел";
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

function toggleAchievements() {
  if (!achievements.isOpen) resetInput();
  achievements.toggle();
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
    interactButton.classList.toggle("below", target?.kind === "note");
  }
  if (!target) return;

  const below = target.kind === "note";
  const point = renderer.screenPoint(target.x, target.y + (below ? 8 : -32));
  const half = interactButton.offsetWidth / 2 + 5;
  const buttonHeight = interactButton.offsetHeight;
  const minY = below ? 5 : buttonHeight + 5;
  const maxY = canvas.clientHeight - (below ? buttonHeight : 0) - 5;
  interactButton.style.left = Math.max(half, Math.min(canvas.clientWidth - half, point.x)) + "px";
  interactButton.style.top = Math.max(minY, Math.min(maxY, point.y)) + "px";
}

interactButton.addEventListener("click", interact);
byId("open-achievements").addEventListener("click", toggleAchievements);
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
  if (noteDialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === "KeyO") {
    event.preventDefault();
    if (!event.repeat) toggleAchievements();
    return;
  }
  if (achievements.isOpen || action.state.dead) return;
  const weaponKey = /^(?:Digit|Numpad)([1-5])$/.exec(event.code);
  if (weaponKey && action.state.armed) {
    event.preventDefault();
    action.selectWeapon(Number(weaponKey[1]) - 1);
    return;
  }
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
  if (!action.state.armed || terminal.isOpen || noteDialog.open || achievements.isOpen || event.ctrlKey || !event.deltaY) return;
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
  const paused = terminal.isOpen || noteDialog.open || achievements.isOpen;
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
  if (!action.state.medal && achievements.has(finaleAchievement.event)) action.state.medal = true;
  updateWeaponSlots();
  renderer.draw({ nearby, visited: terminal.visited, notes, action: action.state, time: action.state.time });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
