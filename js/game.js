import { createAction } from "./action.js";
import { createAchievements } from "./achievements.js";
import { createJoystick } from "./joystick.js";
import { createRenderer, movePlayer, nearestInteraction, noteSpots, player, stations } from "./room.js";
import { createShop } from "./shop.js";
import { drawWeaponIcon } from "./sprites.js";
import { shuffleSystems } from "./systems.js";
import { finaleAchievement, tasks } from "./tasks.js";
import { createTerminal } from "./terminal.js";
import { weapons } from "./weapons.js";

const byId = id => document.getElementById(id);
const canvas = byId("room");
const interactButton = byId("interact");
const interactText = interactButton.querySelector("span");
const controlsDialog = byId("controls");
const noteDialog = byId("note");
const noteList = byId("tasks");
const hintPanel = byId("station-hint");
const hintCommands = byId("hint-command");
const hintCopyStatus = byId("hint-copy-status");
const health = byId("health");
const armor = byId("armor");
const coins = byId("coins");
const death = byId("death");
const weaponSlots = byId("weapon-slots");
const allyTimers = byId("ally-timers");
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
const moveStick = createJoystick(canvas, byId("move-joystick"), "left");
const aimStick = createJoystick(canvas, byId("aim-joystick"), "right");
const achievementTasks = tasks.filter(task => task.achievement);
const achievements = createAchievements([...achievementTasks, finaleAchievement], () => canvas.focus({ preventScroll: true }));
const action = createAction(showNotice, () => achievements.unlock(finaleAchievement));
const shop = createShop(action, player, () => canvas.focus({ preventScroll: true }));
action.state.medal = achievements.has(finaleAchievement.event);
const terminal = createTerminal(stations, systems, (task, station, event) => {
  taskRows.get(task).classList.add("done");
  action.trigger(event, station, renderer.camera);
  if (task.achievement) achievements.unlock(task);
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
  const { armed, weapon, ammo, owned } = action.state;
  if (weaponSlots.hidden === armed) weaponSlots.hidden = !armed;
  if (!armed) return;
  for (const [index, button] of slotButtons.entries()) {
    if (weapon !== shownWeapon) button.slot.setAttribute("aria-pressed", String(weapons[index] === weapon));
    const remaining = ammo[index];
    const locked = !owned[index];
    const unlimited = remaining === Infinity;
    const count = unlimited ? "∞" : locked && !remaining ? "—" : String(remaining);
    if (button.ammo.textContent === count && button.slot.disabled === locked) continue;
    button.slot.disabled = locked;
    button.ammo.textContent = count;
    button.slot.classList.toggle("empty", !locked && remaining === 0);
    const ammoLabel = unlimited ? "бесконечный боезапас" : "боезапас " + remaining;
    const availability = locked ? " · ещё не подобрано" : "";
    button.slot.setAttribute("aria-label", weapons[index].name + availability + " · " + ammoLabel);
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
  if (task.alternative) {
    const alternative = document.createElement("code");
    alternative.textContent = task.alternative.command;
    instruction.append(document.createElement("br"), "или ", alternative);
  }
  return instruction;
}

function hintCommand(text) {
  const row = document.createElement("div");
  const command = document.createElement("code");
  const copy = document.createElement("button");
  row.className = "hint-command";
  command.textContent = text;
  copy.type = "button";
  copy.className = "copy-command";
  copy.textContent = "Скопировать";
  copy.setAttribute("aria-label", "Скопировать команду " + text);
  copy.addEventListener("click", async () => {
    let copied;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(command);
        selection.removeAllRanges();
        selection.addRange(range);
        copied = document.execCommand("copy");
        if (copied) selection.removeAllRanges();
      }
    }
    if (!copy.isConnected) return;
    copy.textContent = copied ? "Скопировано" : "Выделено";
    hintCopyStatus.textContent = copied ? "Скопировано: " + text : "Команда выделена для ручного копирования.";
  });
  row.append(command, copy);
  return row;
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
const movement = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]);
let nearby;
let previousTime;
let pointer;
let shootingPointer;
let shotRequest;
let interactionKeyHeld = false;

function gamePaused() {
  return controlsDialog.open || terminal.isOpen || noteDialog.open || achievements.isOpen || shop.isOpen;
}

function interact() {
  if (action.state.dead || gamePaused()) return false;
  const target = nearestInteraction(notes);
  if (!target) return false;

  resetInput();
  if (target.kind === "note") openNote(target);
  else if (target.kind === "kiosk") shop.open(target.catalog);
  else terminal.open(target);
  return true;
}

function openNote(target) {
  const hint = target.task;
  noteList.hidden = Boolean(hint);
  hintPanel.hidden = !hint;
  byId("note-title").textContent = hint ? "Подсказка для " + target.station.id : "Список дел";
  if (hint) {
    byId("hint-task").textContent = hint.title;
    hintCopyStatus.textContent = "";
    const commands = [hint.setup, hint.command, hint.alternative?.command].filter(Boolean);
    hintCommands.replaceChildren(...commands.map(hintCommand));
  }
  noteDialog.showModal();
}

function closeNote() {
  noteDialog.close();
  canvas.focus({ preventScroll: true });
}

function toggleAchievements(pause = false) {
  if (!achievements.isOpen) resetInput();
  achievements.toggle(pause);
}

function resetInput() {
  keys.clear();
  moveStick.reset();
  aimStick.reset();
  stopShooting();
  shotRequest = undefined;
  interactionKeyHeld = false;
}

function updateInteraction(paused) {
  const target = paused || action.state.dead ? undefined : nearestInteraction(notes);
  if (target !== nearby) {
    nearby = target;
    interactButton.hidden = !target;
    if (target?.kind === "kiosk") {
      interactText.textContent = target.catalog === "medkits" ? "Купить аптечку" : "Купить боеприпасы";
    } else {
      interactText.textContent = target?.task ? "Читать подсказку" : target === note ? "Читать записку" : "Сесть за ПК";
    }
    interactButton.classList.toggle("below", target?.kind === "note" || target?.kind === "kiosk");
  }
  if (!target) return;

  const below = target.kind === "note" || target.kind === "kiosk";
  const offset = target.kind === "kiosk" ? 15 : below ? 8 : -32;
  const point = renderer.screenPoint(target.x, target.y + offset);
  const half = interactButton.offsetWidth / 2 + 5;
  const buttonHeight = interactButton.offsetHeight;
  const minY = below ? 5 : buttonHeight + 5;
  const maxY = canvas.clientHeight - (below ? buttonHeight : 0) - 5;
  interactButton.style.left = Math.max(half, Math.min(canvas.clientWidth - half, point.x)) + "px";
  interactButton.style.top = Math.max(minY, Math.min(maxY, point.y)) + "px";
}

interactButton.addEventListener("click", interact);
byId("start-game").addEventListener("click", () => controlsDialog.close());
controlsDialog.addEventListener("close", () => canvas.focus({ preventScroll: true }));
byId("open-pause").addEventListener("click", () => toggleAchievements(true));
byId("close-note").addEventListener("click", closeNote);
noteDialog.addEventListener("cancel", event => {
  event.preventDefault();
  closeNote();
});

window.addEventListener("keydown", event => {
  if (event.key === "Escape" && event.repeat) {
    event.preventDefault();
    return;
  }
  if (event.code === "KeyE" && event.repeat && interactionKeyHeld) {
    event.preventDefault();
    return;
  }
  if (terminal.isOpen) {
    terminal.handleKey(event);
    return;
  }
  if (controlsDialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
  if (shop.isOpen) return;
  if (noteDialog.open) {
    if (event.code === "KeyE") {
      event.preventDefault();
      if (!event.repeat) closeNote();
    }
    return;
  }
  if (event.key === "Escape" && !achievements.isOpen) {
    event.preventDefault();
    toggleAchievements(true);
    return;
  }
  if (event.code === "KeyO") {
    event.preventDefault();
    if (!event.repeat) toggleAchievements();
    return;
  }
  if (achievements.isOpen || action.state.dead) return;
  const weaponKey = /^(?:Digit|Numpad)([1-6])$/.exec(event.code);
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
  if (!action.state.armed || gamePaused() || event.ctrlKey || !event.deltaY) return;
  event.preventDefault();
  action.cycleWeapon(event.deltaY);
}, { passive: false });

function stopShooting() {
  if (shootingPointer === undefined) return;
  if (canvas.hasPointerCapture(shootingPointer)) canvas.releasePointerCapture(shootingPointer);
  shootingPointer = undefined;
}

canvas.addEventListener("pointermove", event => {
  if (event.pointerType === "touch") {
    if (!moveStick.move(event)) aimStick.move(event);
    return;
  }
  pointer = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener("pointerdown", event => {
  if (action.state.dead || gamePaused()) return;
  if (event.pointerType === "touch") {
    pointer = undefined;
    if (!moveStick.start(event) && action.state.armed) aimStick.start(event);
    return;
  }
  if (event.button !== 0 || !action.state.armed || shootingPointer !== undefined) return;
  shootingPointer = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  pointer = { x: event.clientX, y: event.clientY };
  shotRequest = pointer;
  event.preventDefault();
});
function releaseAim(event) {
  if (moveStick.release(event) || aimStick.release(event) || event.pointerType === "touch") return;
  if (event.pointerId !== shootingPointer && event.type !== "pointerleave") return;
  if (event.type !== "pointerleave") shootingPointer = undefined;
  if (event.type === "pointerleave") pointer = undefined;
}
for (const type of ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"]) {
  canvas.addEventListener(type, releaseAim);
}
canvas.addEventListener("click", event => {
  if (action.state.armed || !nearby || moveStick.blocksClick(event) || aimStick.blocksClick(event)) return;
  const point = renderer.worldPoint(event.clientX, event.clientY);
  if (Math.abs(point.x - nearby.x) < 34 && Math.abs(point.y - nearby.y) < 33) interact();
});

function updateAim() {
  const { aim, weapon } = action.state;
  const deflection = Math.hypot(aimStick.x, aimStick.y);
  if (deflection > 0) {
    const { w, h } = renderer.camera;
    const grenade = weapon.kind === "grenade";
    const distance = grenade ? 24 + (weapon.range - 24) * deflection : Math.min(weapon.range, Math.max(26, Math.min(w, h) * 0.46));
    aim.x = player.x + aimStick.x * distance / deflection;
    aim.y = player.y - (grenade ? 0 : 9) + aimStick.y * distance / deflection;
    aim.visible = true;
    return true;
  }
  const target = pointer ?? shotRequest;
  if (target) {
    Object.assign(aim, renderer.worldPoint(target.x, target.y), {
      visible: Boolean(pointer) && target.x >= 0 && target.x <= canvas.clientWidth
        && target.y >= 0 && target.y <= canvas.clientHeight,
    });
  } else {
    aim.visible = false;
  }
  return false;
}

let shownAllies = [];
function updateAllyTimers() {
  const active = action.state.allies.filter(ally => ally.remaining > 0);
  if (active.length !== shownAllies.length || active.some((ally, index) => ally !== shownAllies[index])) {
    shownAllies = active;
    allyTimers.hidden = !active.length;
    byId("game").style.setProperty("--ally-timer-height", active.length * 40 + "px");
    allyTimers.replaceChildren(...active.map(ally => {
      const timer = document.createElement("div");
      const name = document.createElement("span");
      timer.className = "ally-timer";
      timer.setAttribute("role", "timer");
      name.textContent = ally.name;
      timer.append(name, document.createElement("span"));
      return timer;
    }));
  }
  for (const [index, ally] of active.entries()) {
    const remaining = Math.ceil(ally.remaining);
    const label = Math.floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0");
    const time = allyTimers.children[index].lastElementChild;
    if (time.textContent !== label) time.textContent = label;
  }
}

function frame(time) {
  const frameElapsed = previousTime === undefined ? 0 : (time - previousTime) / 1000;
  const elapsed = Math.min(frameElapsed, 0.033);
  previousTime = time;
  const paused = gamePaused();
  const canMove = !paused && !action.state.dead;
  const dx = moveStick.x + Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  const dy = moveStick.y + Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"));
  movePlayer(canMove ? dx : 0, canMove ? dy : 0, elapsed);
  renderer.follow(elapsed, false);
  const touchFiring = updateAim();
  const respawned = !paused && action.update(elapsed, shootingPointer !== undefined, Boolean(shotRequest) || touchFiring, frameElapsed);
  shotRequest = undefined;
  if (!action.state.armed) {
    stopShooting();
    aimStick.reset();
  }
  if (action.state.dead) moveStick.reset();
  if (respawned) {
    resetInput();
    renderer.follow(elapsed, true);
  }
  moveStick.draw();
  aimStick.draw();
  updateInteraction(paused);
  if (health.value !== String(player.hp)) health.value = String(player.hp);
  if (armor.value !== String(player.armor)) armor.value = String(player.armor);
  if (coins.value !== String(action.state.coins)) coins.value = String(action.state.coins);
  if (death.hidden === action.state.dead) death.hidden = !action.state.dead;
  while (activeNotices[0]?.expires <= action.state.time) activeNotices.shift().element.remove();
  canvas.classList.toggle("armed", action.state.armed);
  if (!action.state.medal && !action.state.celebration) {
    if (achievements.has(finaleAchievement.event)) action.state.medal = true;
    else if (!paused && achievementTasks.every(task => achievements.has(task.event))) action.startCelebration();
  }
  updateWeaponSlots();
  updateAllyTimers();
  renderer.draw({ nearby, visited: terminal.visited, notes, action: action.state, time: action.state.time });
  requestAnimationFrame(frame);
}

controlsDialog.showModal();
requestAnimationFrame(frame);
