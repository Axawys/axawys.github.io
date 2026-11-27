import { createFastfetch } from "./systems.js";
import { tasks } from "./tasks.js";

const byId = id => document.getElementById(id);

export function createTerminal(stations, systems, onMaintenance) {
  const dialog = byId("computer");
  const terminal = byId("terminal-screen");
  const output = byId("terminal-output");
  const form = byId("terminal-form");
  const input = byId("command");
  const promptLabel = byId("prompt");
  const visited = new Set();
  let active;

  const sessions = stations.map((station, index) => {
    const system = systems[index];
    const id = station.id;
    const intro = document.createElement("p");
    intro.className = "terminal-intro";
    const command = document.createElement("code");
    command.textContent = "fastfetch";
    intro.append("Введите ", command, ", чтобы посмотреть сведения о системе.");
    return { id, system, station, lines: [intro], history: [], cursor: 0, draft: "", root: false, completed: false };
  });

  function prompt() {
    const hostname = active.id.toLowerCase();
    return active.root ? "root@" + hostname + ":~#" : "operator@" + hostname + ":~$";
  }

  function focus() {
    input.focus({ preventScroll: true });
    terminal.scrollTop = terminal.scrollHeight;
  }

  function open(station) {
    if (active || station.offline) return;
    active = sessions[station.number - 1];
    active.cursor = active.history.length;
    active.draft = "";
    input.value = "";
    byId("computer-name").textContent = active.id;
    promptLabel.textContent = prompt();
    output.replaceChildren(...active.lines);
    dialog.showModal();
    focus();
  }

  function close() {
    if (!active) return;
    active = undefined;
    dialog.close();
    byId("room").focus({ preventScroll: true });
  }

  function addLine(node) {
    active.lines.push(node);
    output.append(node);
    if (active.lines.length > 120) active.lines.shift().remove();
  }

  function print(text, prefix) {
    const row = document.createElement("p");
    row.className = "terminal-line";
    if (prefix) {
      const tag = document.createElement("span");
      tag.className = "terminal-prompt";
      tag.textContent = prefix + " ";
      row.append(tag);
    }
    row.append(text);
    addLine(row);
  }

  function clear() {
    active.lines.length = 0;
    output.replaceChildren();
    focus();
  }

  function maintenance(command) {
    const task = tasks.find(item => item.command === command);
    if (!task) return false;
    if (task.system !== active.system.name) {
      print("Эта операция предназначена для " + task.system + ".");
    } else if (task.setup && !active.root) {
      print("E: Недостаточно прав. Сначала выполните su -.");
    } else if (active.completed) {
      print("Ничего не изменилось. Задание уже выполнено.");
    } else {
      active.completed = true;
      const station = active.station;
      close();
      onMaintenance(task, station);
    }
    return true;
  }

  function execute(command) {
    const text = command.trim();
    input.value = "";
    if (!text) {
      print("", prompt());
      focus();
      return;
    }

    if (active.history.at(-1) !== text) {
      active.history.push(text);
      if (active.history.length > 80) active.history.shift();
    }
    active.cursor = active.history.length;
    active.draft = "";

    const normalized = text.replace(/\s+/g, " ");
    if (normalized === "clear") {
      clear();
      return;
    }

    print(text, prompt());
    switch (normalized) {
      case "exit":
        if (active.root) {
          active.root = false;
          promptLabel.textContent = prompt();
        } else {
          close();
          return;
        }
        break;
      case "fastfetch":
        addLine(createFastfetch(active.system, active.id.toLowerCase(), active.root ? "root" : "operator"));
        visited.add(active.station.number);
        break;
      case "whoami":
        print(active.root ? "root" : "operator");
        break;
      case "pwd":
        print(active.root ? "/root" : "/home/operator");
        break;
      case "help":
        print("Команды: fastfetch, clear, exit, whoami, pwd, help. Задания с командами записаны на листке в офисе.");
        break;
      case "su -":
        if (active.system.name === "ALT Linux") {
          active.root = true;
          promptLabel.textContent = prompt();
        } else {
          print("su: доступ запрещён");
        }
        break;
      default:
        if (!maintenance(normalized)) print("bash: " + normalized.split(" ", 1)[0] + ": command not found");
    }
    if (active) focus();
  }

  function handleKey(event) {
    if (event.ctrlKey && event.code === "KeyL") {
      event.preventDefault();
      clear();
    } else if (event.target === input && ["ArrowUp", "ArrowDown"].includes(event.code)) {
      event.preventDefault();
      const { history, cursor } = active;
      if (cursor === history.length) active.draft = input.value;
      const direction = event.code === "ArrowUp" ? -1 : 1;
      active.cursor = Math.max(0, Math.min(history.length, cursor + direction));
      input.value = active.cursor === history.length ? active.draft : history[active.cursor];
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  byId("leave").addEventListener("click", close);
  byId("clear-terminal").addEventListener("click", clear);
  byId("run-fastfetch").addEventListener("click", () => execute("fastfetch"));
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    close();
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    execute(input.value);
  });

  return { open, handleKey, visited, get isOpen() { return Boolean(active); } };
}
