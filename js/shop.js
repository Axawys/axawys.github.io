import { weapons } from "./weapons.js";

export function createAmmoShop(action, restoreFocus) {
  const dialog = document.getElementById("ammo-shop");
  const balance = document.getElementById("shop-coins");
  const status = document.getElementById("shop-status");
  const list = document.getElementById("shop-offers");
  const offers = [];

  for (const [index, weapon] of weapons.entries()) {
    if (!weapon.shop) continue;
    const row = document.createElement("li");
    const description = document.createElement("div");
    const name = document.createElement("strong");
    const stock = document.createElement("span");
    const buy = document.createElement("button");
    name.textContent = weapon.name;
    buy.type = "button";
    buy.addEventListener("click", () => {
      const purchase = action.buyAmmo(index);
      if (!purchase) return;
      status.textContent = weapon.name + " · +" + purchase.rounds;
      update();
    });
    description.append(name, stock);
    row.append(description, buy);
    list.append(row);
    offers.push({ index, weapon, stock, buy });
  }

  function update() {
    balance.value = String(action.state.coins);
    for (const { index, weapon, stock, buy } of offers) {
      const { cost, rounds } = action.ammoOffer(index);
      stock.textContent = "В запасе " + action.state.ammo[index] + "/" + weapon.capacity;
      buy.disabled = !rounds || cost > action.state.coins;
      buy.textContent = rounds ? "+" + rounds + " за " + cost : "Боезапас полон";
      buy.setAttribute("aria-label", rounds
        ? "Купить " + weapon.name + " · " + rounds + " боеприпасов за " + cost + " монет"
        : weapon.name + " · боезапас полон");
    }
  }

  function open() {
    status.textContent = "";
    update();
    dialog.showModal();
  }

  document.getElementById("shop-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", restoreFocus);
  return { open, get isOpen() { return dialog.open; } };
}
