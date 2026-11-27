const storagePrefix = "linux-lab:achievement:";

function saved(event) {
  try {
    return localStorage.getItem(storagePrefix + event) === "1";
  } catch {
    return false;
  }
}

function save(event) {
  try {
    localStorage.setItem(storagePrefix + event, "1");
  } catch {
    // The current session still tracks progress when storage is unavailable.
  }
}

export function createAchievements(tasks, restoreFocus) {
  const dialog = document.getElementById("achievements");
  const list = document.getElementById("achievement-list");
  const summary = document.getElementById("achievement-summary");
  const progress = document.getElementById("achievement-progress");
  const toast = document.getElementById("achievement-notice");
  const unlocked = new Set(tasks.filter(task => saved(task.event)).map(task => task.event));
  let toastTimer;

  const cards = new Map(tasks.map(task => {
    const card = document.createElement("li");
    const icon = document.createElement("span");
    const text = document.createElement("div");
    const title = document.createElement("strong");
    const status = document.createElement("span");
    card.className = "achievement-card";
    icon.className = "achievement-mark";
    icon.setAttribute("aria-hidden", "true");
    title.textContent = task.achievement;
    status.className = "achievement-status";
    text.append(title, status);
    card.append(icon, text);
    list.append(card);
    return [task.event, { card, status, system: task.system }];
  }));

  function render() {
    summary.textContent = "Получено " + unlocked.size + "/" + cards.size + " достижений";
    progress.max = cards.size;
    progress.value = unlocked.size;
    for (const [event, { card, status, system }] of cards) {
      const complete = unlocked.has(event);
      card.classList.toggle("unlocked", complete);
      status.textContent = system + " · " + (complete ? "Получено" : "Не открыто");
    }
  }

  function unlock(task) {
    if (unlocked.has(task.event)) return;
    const alreadySaved = saved(task.event);
    unlocked.add(task.event);
    render();
    if (alreadySaved) return;

    save(task.event);
    const details = document.createElement("div");
    const title = document.createElement("strong");
    const tally = document.createElement("span");
    title.textContent = task.achievement;
    tally.textContent = summary.textContent;
    details.append(title, tally);
    toast.replaceChildren(details);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.replaceChildren(), 4500);
  }

  function close() {
    dialog.close();
    restoreFocus();
  }

  function toggle() {
    if (dialog.open) close();
    else dialog.showModal();
  }

  document.getElementById("close-achievements").addEventListener("click", close);
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    close();
  });
  window.addEventListener("storage", event => {
    if (event.newValue !== "1" || !event.key?.startsWith(storagePrefix)) return;
    const id = event.key.slice(storagePrefix.length);
    if (!cards.has(id) || unlocked.has(id)) return;
    unlocked.add(id);
    render();
  });
  render();
  return { unlock, toggle, has: event => unlocked.has(event), get isOpen() { return dialog.open; } };
}
