const storagePrefix = "linux-lab:achievement:";
const resetStorageKey = "linux-lab:progress-reset";

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
  const heading = document.getElementById("achievement-title");
  const pauseHeading = document.getElementById("pause-achievements");
  const pauseActions = document.getElementById("pause-actions");
  const closeButton = document.getElementById("close-achievements");
  const resetDialog = document.getElementById("reset-progress-dialog");
  const list = document.getElementById("achievement-list");
  const empty = document.getElementById("achievement-empty");
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
    const system = document.createElement("span");
    card.className = "achievement-card";
    icon.className = "achievement-mark";
    icon.setAttribute("aria-hidden", "true");
    title.textContent = task.achievement;
    system.className = "achievement-system";
    system.textContent = task.system;
    text.append(title, system);
    card.append(icon, text);
    return [task.event, card];
  }));

  function render() {
    summary.textContent = "Получено " + unlocked.size + "/" + cards.size + " достижений";
    progress.max = cards.size;
    progress.value = unlocked.size;
    const visibleCards = [];
    for (const [event, card] of cards) {
      if (unlocked.has(event)) visibleCards.push(card);
    }
    list.replaceChildren(...visibleCards);
    empty.hidden = visibleCards.length > 0;
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

  function toggle(pause = false) {
    if (resetDialog.open) return;
    if (dialog.open) {
      close();
      return;
    }
    heading.textContent = pause ? "Пауза" : "Достижения";
    pauseHeading.hidden = !pause;
    pauseActions.hidden = !pause;
    closeButton.querySelector("kbd").textContent = pause ? "Esc" : "O";
    closeButton.querySelector("span").textContent = pause ? "Продолжить" : "Закрыть";
    dialog.showModal();
  }

  closeButton.addEventListener("click", close);
  document.getElementById("reset-progress").addEventListener("click", () => resetDialog.showModal());
  document.getElementById("confirm-reset-progress").addEventListener("click", () => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(storagePrefix)) localStorage.removeItem(key);
      }
      localStorage.setItem(resetStorageKey, String(Date.now()));
    } catch {
      // Reloading still clears progress made in this session if storage is unavailable.
    }
    window.location.reload();
  });
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    close();
  });
  window.addEventListener("storage", event => {
    if (event.key === resetStorageKey && event.newValue !== null) {
      window.location.reload();
      return;
    }
    if (event.newValue !== "1" || !event.key?.startsWith(storagePrefix)) return;
    const id = event.key.slice(storagePrefix.length);
    if (!cards.has(id) || unlocked.has(id)) return;
    unlocked.add(id);
    render();
  });
  render();
  return { unlock, toggle, has: event => unlocked.has(event), get isOpen() { return dialog.open; } };
}
