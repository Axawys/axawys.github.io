const help = "Перетащите «Этот ПК» в корзину или выберите оба ярлыка по очереди.";

export function createWindowsDesktop(onDelete, restoreFocus) {
  const dialog = document.getElementById("windows-desktop");
  const computer = document.getElementById("desktop-this-pc");
  const trash = document.getElementById("desktop-trash");
  const status = document.getElementById("desktop-status");
  const panel = document.getElementById("desktop-panel");
  const panelTitle = document.getElementById("desktop-panel-title");
  const panelText = document.getElementById("desktop-panel-text");
  const panelClose = document.getElementById("close-desktop-panel");
  let station;
  let drag;
  let selected = false;
  let suppressClick = false;
  let panelTrigger;

  function select(value) {
    selected = value;
    computer.setAttribute("aria-pressed", String(value));
    status.textContent = value ? "Выбрано «Этот ПК». Откройте корзину, чтобы удалить его." : help;
  }

  function resetDrag() {
    const pointerId = drag?.id;
    drag = undefined;
    computer.style.transform = "";
    computer.classList.remove("dragging");
    trash.classList.remove("drop-target");
    if (pointerId !== undefined && computer.hasPointerCapture(pointerId)) computer.releasePointerCapture(pointerId);
  }

  function open(target) {
    if (station || target.offline || target.busy) return;
    station = target;
    document.getElementById("desktop-pc-name").textContent = station.id;
    panel.hidden = true;
    panelTrigger = undefined;
    suppressClick = false;
    select(false);
    dialog.showModal();
  }

  function close() {
    if (!station) return;
    resetDrag();
    station = undefined;
    dialog.close();
    restoreFocus();
  }

  function deleteComputer() {
    if (station && onDelete(station)) close();
  }

  function overTrash(event) {
    const { left, right, top, bottom } = trash.getBoundingClientRect();
    return event.clientX >= left && event.clientX <= right && event.clientY >= top && event.clientY <= bottom;
  }

  computer.addEventListener("pointerdown", event => {
    if (event.button !== 0 || drag) return;
    suppressClick = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    computer.setPointerCapture(event.pointerId);
  });

  window.addEventListener("pointermove", event => {
    if (drag?.id !== event.pointerId) return;
    if (event.pointerType === "mouse" && !event.buttons) {
      resetDrag();
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    computer.classList.add("dragging");
    computer.style.transform = "translate(" + dx + "px, " + dy + "px)";
    trash.classList.toggle("drop-target", overTrash(event));
  });

  window.addEventListener("pointerup", event => {
    if (drag?.id !== event.pointerId) return;
    const dropped = drag.moved && overTrash(event);
    suppressClick = drag.moved;
    resetDrag();
    if (dropped) deleteComputer();
    else if (suppressClick) select(false);
  });

  window.addEventListener("pointercancel", event => {
    if (drag?.id === event.pointerId) resetDrag();
  });
  window.addEventListener("blur", resetDrag);

  computer.addEventListener("click", event => {
    if (!station || (suppressClick && event.detail > 0)) return;
    panel.hidden = true;
    select(!selected);
  });

  trash.addEventListener("click", () => {
    if (selected) deleteComputer();
    else status.textContent = "Корзина пуста. " + help;
  });

  function showPanel(event, title, text) {
    select(false);
    panelTrigger = event.currentTarget;
    panelTitle.textContent = title;
    panelText.textContent = text;
    panel.hidden = false;
    panelClose.focus();
  }

  document.getElementById("desktop-notepad").addEventListener("click", event => {
    showPanel(event, "Блокнот", "Удалить ПК. Перетащить «Этот ПК» в корзину.");
  });
  document.getElementById("desktop-info").addEventListener("click", event => {
    showPanel(event, "Сведения", station.id + " · Windows 11 · 64-разрядная система · 16 ГБ ОЗУ");
  });
  panelClose.addEventListener("click", () => {
    panel.hidden = true;
    panelTrigger?.focus();
  });
  document.getElementById("leave-desktop").addEventListener("click", close);
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    close();
  });

  return { open, get isOpen() { return dialog.open; } };
}
