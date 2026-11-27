import { createRenderer, height, movePlayer, nearestStation, stations, width } from "./room.js";
import { createFastfetch, shuffleSystems } from "./systems.js";

const byId = id => document.getElementById(id);
const canvas = byId("room");
const interactButton = byId("interact");
const interactionTitle = byId("interaction-title");
const interactionDetail = byId("interaction-detail");
const stationList = byId("station-list");
const score = byId("score");
const progressSegments = [...byId("progress-track").children];

const dialog = byId("computer");
const terminal = byId("terminal-screen");
const output = byId("terminal-output");
const form = byId("terminal-form");
const input = byId("command");
const promptLabel = byId("prompt");

const render = createRenderer(canvas);
const systems = shuffleSystems();
const visited = new Set();
const keys = new Set();
const pointers = new Map();
const movement = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]);
let nearby;
let active;
let previousTime;

const sessions = stations.map((station, index) => {
  const system = systems[index];
  const id = "PC-" + String(station.number).padStart(2, "0");
  const row = document.createElement("li");
  const number = document.createElement("span");
  const name = document.createElement("span");
  const mark = document.createElement("i");
  row.className = "station";
  row.style.setProperty("--system-color", system.color);
  number.className = "station-id";
  number.textContent = id;
  name.className = "station-name";
  name.textContent = "Неизвестно";
  mark.className = "station-mark";
  mark.setAttribute("aria-hidden", "true");
  row.append(number, name, mark);
  stationList.append(row);

  const intro = document.createElement("p");
  intro.className = "terminal-intro";
  const command = document.createElement("code");
  command.textContent = "fastfetch";
  intro.append("Введите ", command, ", чтобы посмотреть сведения о системе.");
  return { id, row, name, system, station, lines: [intro], history: [], cursor: 0, draft: "" };
});

function setNearby(station) {
  if (station === nearby) return;
  nearby = station;
  const session = nearby && sessions[nearby.number - 1];
  for (const item of sessions) item.row.classList.toggle("near", item === session);

  interactButton.disabled = !session;
  if (session) {
    interactionTitle.textContent = session.id + " · в зоне доступа";
    interactionDetail.textContent = "Нажмите E или кнопку, чтобы сесть за компьютер.";
  } else {
    interactionTitle.textContent = "Подойдите к компьютеру";
    interactionDetail.textContent = "Введите fastfetch, чтобы узнать, какая система установлена.";
  }
}

function discover(session) {
  const { number } = session.station;
  if (visited.has(number)) return;
  visited.add(number);
  session.name.textContent = session.system.name;
  session.row.classList.add("found");
  score.value = visited.size + " / " + stations.length;
  progressSegments[visited.size - 1].classList.add("filled");
}

function openComputer() {
  const station = nearestStation();
  if (!station || active) return;

  active = sessions[station.number - 1];
  resetMovement();
  active.cursor = active.history.length;
  active.draft = "";
  input.value = "";
  byId("computer-name").textContent = active.id;
  promptLabel.textContent = activePrompt();
  output.replaceChildren(...active.lines);
  dialog.showModal();
  focusTerminal();
}

function closeComputer() {
  if (!active) return;
  active = undefined;
  dialog.close();
  canvas.focus({ preventScroll: true });
}

function activePrompt() {
  return "operator@" + active.id.toLowerCase() + ":~$";
}

function focusTerminal() {
  input.focus({ preventScroll: true });
  terminal.scrollTop = terminal.scrollHeight;
}

function addLine(node) {
  active.lines.push(node);
  output.append(node);
  if (active.lines.length > 120) active.lines.shift().remove();
}

function print(text, prompt) {
  const line = document.createElement("p");
  line.className = "terminal-line";
  if (prompt) {
    const prefix = document.createElement("span");
    prefix.className = "terminal-prompt";
    prefix.textContent = prompt + " ";
    line.append(prefix);
  }
  line.append(text);
  addLine(line);
}

function clearTerminal() {
  active.lines.length = 0;
  output.replaceChildren();
  focusTerminal();
}

function execute(command) {
  const text = command.trim();
  input.value = "";
  if (!text) {
    print("", activePrompt());
    focusTerminal();
    return;
  }

  if (active.history.at(-1) !== text) {
    active.history.push(text);
    if (active.history.length > 80) active.history.shift();
  }
  active.cursor = active.history.length;
  active.draft = "";

  if (text === "clear") {
    clearTerminal();
    return;
  }

  print(text, activePrompt());
  switch (text) {
    case "exit":
      closeComputer();
      return;
    case "fastfetch":
      addLine(createFastfetch(active.system, active.id.toLowerCase()));
      discover(active);
      break;
    case "whoami":
      print("operator");
      break;
    case "pwd":
      print("/home/operator");
      break;
    case "help":
      print("Команды: fastfetch, clear, exit, whoami, pwd, help");
      break;
    default:
      print("bash: " + text.split(/\s+/, 1)[0] + ": command not found");
  }
  focusTerminal();
}

function navigateHistory(direction) {
  const { history, cursor } = active;
  if (cursor === history.length) active.draft = input.value;
  active.cursor = Math.max(0, Math.min(history.length, cursor + direction));
  input.value = active.cursor === history.length ? active.draft : history[active.cursor];
  input.setSelectionRange(input.value.length, input.value.length);
}

function resetMovement() {
  keys.clear();
  pointers.clear();
}

function isHeld(...codes) {
  return codes.some(code => keys.has(code) || [...pointers.values()].includes(code));
}

interactButton.addEventListener("click", openComputer);
byId("leave").addEventListener("click", closeComputer);
byId("clear-terminal").addEventListener("click", clearTerminal);
byId("run-fastfetch").addEventListener("click", () => execute("fastfetch"));
dialog.addEventListener("cancel", event => {
  event.preventDefault();
  closeComputer();
});
form.addEventListener("submit", event => {
  event.preventDefault();
  execute(input.value);
});

window.addEventListener("keydown", event => {
  if (active) {
    if (event.ctrlKey && event.code === "KeyL") {
      event.preventDefault();
      clearTerminal();
    } else if (event.target === input && ["ArrowUp", "ArrowDown"].includes(event.code)) {
      event.preventDefault();
      navigateHistory(event.code === "ArrowUp" ? -1 : 1);
    }
    return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (movement.has(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  } else if (event.code === "KeyE" && !event.repeat) {
    openComputer();
  }
});

window.addEventListener("keyup", event => keys.delete(event.code));
window.addEventListener("blur", resetMovement);
document.addEventListener("visibilitychange", resetMovement);

for (const button of document.querySelectorAll("[data-direction]")) {
  button.addEventListener("pointerdown", event => {
    if (event.button !== 0 || active) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.direction);
  });
  for (const eventType of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventType, event => pointers.delete(event.pointerId));
  }
}

canvas.addEventListener("click", event => {
  const station = nearestStation();
  if (!station) return;

  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * width / bounds.width;
  const y = (event.clientY - bounds.top) * height / bounds.height;
  if (Math.abs(x - station.x) <= 34 && y >= station.y - 16 && y <= station.y + 34) openComputer();
});

function frame(time) {
  const elapsed = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.033);
  previousTime = time;

  const dx = Number(isHeld("KeyD", "ArrowRight")) - Number(isHeld("KeyA", "ArrowLeft"));
  const dy = Number(isHeld("KeyS", "ArrowDown")) - Number(isHeld("KeyW", "ArrowUp"));
  movePlayer(active ? 0 : dx, active ? 0 : dy, elapsed);
  setNearby(nearestStation());
  render(nearby, visited, time);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
