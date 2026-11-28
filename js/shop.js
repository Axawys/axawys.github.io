import { medkits } from "./action.js";
import { weapons } from "./weapons.js";

export function createShop(action, player, restoreFocus) {
  const dialog = document.getElementById("kiosk-shop");
  const title = document.getElementById("shop-title");
  const balance = document.getElementById("shop-coins");
  const health = document.getElementById("shop-health");
  const status = document.getElementById("shop-status");
  const list = document.getElementById("shop-offers");
  const catalogs = {
    ammo: {
      title: "Киоск боеприпасов",
      full: "Боезапас полон",
      unit: "боеприпасов",
      offer: action.ammoOffer,
      buy: action.buyAmmo,
      products: weapons.flatMap((weapon, index) => weapon.shop ? [{
        index, name: weapon.name,
        stock: () => "В запасе " + action.state.ammo[index] + "/" + weapon.capacity,
      }] : []),
    },
    medkits: {
      title: "Киоск аптечек",
      full: "Здоровье полное",
      unit: "HP",
      offer: action.medkitOffer,
      buy: action.buyMedkit,
      products: medkits.map((medkit, index) => ({
        index, name: "Аптечка +" + medkit.hp + " HP",
      })),
    },
  };

  function open(catalog) {
    const store = catalogs[catalog];
    title.textContent = store.title;
    health.hidden = catalog !== "medkits";
    status.textContent = "";
    const offers = store.products.map(product => {
      const row = document.createElement("li");
      const description = document.createElement("div");
      const name = document.createElement("strong");
      const stock = product.stock && document.createElement("span");
      const buy = document.createElement("button");
      name.textContent = product.name;
      buy.type = "button";
      buy.addEventListener("click", () => {
        const purchase = store.buy(product.index);
        if (!purchase) return;
        status.textContent = "Получено +" + purchase.quantity + " " + store.unit;
        update();
      });
      description.append(name);
      if (stock) description.append(stock);
      row.append(description, buy);
      return { product, row, stock, buy };
    });
    list.replaceChildren(...offers.map(offer => offer.row));

    function update() {
      balance.value = String(action.state.coins);
      if (!health.hidden) health.textContent = "Здоровье " + player.hp + "/" + player.maxHp;
      for (const { product, stock, buy } of offers) {
        const { cost, quantity } = store.offer(product.index);
        if (stock) stock.textContent = product.stock();
        buy.disabled = !quantity || cost > action.state.coins;
        buy.textContent = quantity ? "+" + quantity + " за " + cost : store.full;
        buy.setAttribute("aria-label", quantity
          ? "Купить " + product.name + " · " + quantity + " " + store.unit + " за " + cost + " монет"
          : product.name + " · " + store.full);
      }
    }

    update();
    dialog.showModal();
  }

  document.getElementById("shop-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", restoreFocus);
  return { open, get isOpen() { return dialog.open; } };
}
