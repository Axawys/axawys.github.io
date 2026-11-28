import { createFastfetch } from "./systems.js";
import { tasks } from "./tasks.js";

const byId = id => document.getElementById(id);

export function createTerminal(stations, systems, { onMaintenance, opsec }) {
  const dialog = byId("computer");
  const terminal = byId("terminal-screen");
  const output = byId("terminal-output");
  const form = byId("terminal-form");
  const input = byId("command");
  const promptLabel = byId("prompt");
  const fastfetchButton = byId("run-fastfetch");
  const visited = new Set();
  const usedCommands = new Set();
  let active;
  let selection;

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
    clearSelection();
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
    clearSelection();
    active.lines.length = 0;
    output.replaceChildren();
    focus();
  }

  function complete(task, option, closeTerminal = true) {
    active.completed = true;
    if (option.once) usedCommands.add(option.command);
    const station = active.station;
    if (closeTerminal) close();
    onMaintenance(task, station, option.event);
  }

  function clearSelection() {
    if (!selection) return;
    selection.group.remove();
    selection = undefined;
    form.hidden = false;
    fastfetchButton.disabled = false;
  }

  function runOpsec(task) {
    const targets = opsec.targets;
    if (!targets.length) {
      opsec.destroyServers();
      print("взлом датацентров, успех");
      complete(task, task, false);
      return;
    }
    if (opsec.conversionUsed) {
      print("Один противник уже перешёл на вашу сторону.");
      return;
    }

    const group = document.createElement("div");
    const instructions = document.createElement("p");
    const list = document.createElement("div");
    instructions.className = "terminal-line";
    instructions.textContent = "Выберите робота стрелками ↑ и ↓ и нажмите Enter или коснитесь строки.";
    list.className = "terminal-targets";
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", "Враждебные роботы");
    const buttons = targets.map(robot => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = robot.name + " · " + (robot.reviveAt ? "перезапуск" : robot.hp + " HP");
      button.addEventListener("click", () => {
        if (!opsec.convert(robot)) return;
        clearSelection();
        print(robot.name + " теперь на вашей стороне.");
        complete(task, task, false);
        focus();
      });
      return button;
    });
    list.append(...buttons);
    group.append(instructions, list);
    selection = { group, buttons };
    form.hidden = true;
    fastfetchButton.disabled = true;
    output.append(group);
    buttons[0].focus();
  }

  function maintenance(command) {
    const task = tasks.find(item => item.command === command || item.alternative?.command === command);
    if (!task) return false;
    const option = task.alternative?.command === command ? task.alternative : task;
    if (task.system !== active.system.name) {
      print("Эта операция предназначена для " + task.system + ".");
    } else if (task.setup && !active.root) {
      print("E: Недостаточно прав. Сначала выполните su -.");
    } else if (option.once && usedCommands.has(command)) {
      print("Этого союзника можно вызвать только один раз за игру.");
    } else if (active.completed) {
      print("Ничего не изменилось. Задание уже выполнено.");
    } else if (option.event === "opsec") {
      runOpsec(task);
    } else {
      complete(task, option);
    }
    return true;
  }

  function execute(command) {
    if (selection) return;
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
    if (active && !selection) focus();
  }

  function handleKey(event) {
    if (event.ctrlKey && event.code === "KeyL") {
      event.preventDefault();
      clear();
    } else if (selection && ["ArrowUp", "ArrowDown"].includes(event.code)) {
      event.preventDefault();
      const { buttons } = selection;
      const current = buttons.indexOf(document.activeElement);
      const direction = event.code === "ArrowUp" ? -1 : 1;
      const next = current < 0 ? 0 : (current + direction + buttons.length) % buttons.length;
      buttons[next].focus();
    } else if (selection && event.code === "Enter" && selection.buttons.includes(event.target)) {
      event.preventDefault();
      if (!event.repeat) event.target.click();
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
  fastfetchButton.addEventListener("click", () => execute("fastfetch"));
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
