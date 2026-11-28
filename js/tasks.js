export const tasks = [
  { system: "Gentoo", title: "Обновить Gentoo", command: "sudo emerge -avuDN @world", event: "explosion", achievement: "Сборка с огоньком" },
  { system: "Ubuntu", title: "Удалить snapd из Ubuntu", command: "sudo apt purge snapd", event: "spider", achievement: "Canonical негодует" },
  {
    system: "ALT Linux", title: "На ALT Linux после su - выполнить одну из двух команд",
    noteTitle: "Установить впн или гигакод на альт",
    command: "apt-get install vpn", setup: "su -", event: "walker", achievement: "Вы потревожили РКН",
    alternative: { command: "apt-get install gigacode", event: "gigacode" },
  },
  { system: "Fedora", title: "Обновить Fedora", command: "sudo dnf upgrade", event: "visitor", achievement: "Ядро в порядке" },
  {
    system: "Omarchy", title: "Удалить систему Omarchy", noteTitle: "Удалить Omarchy",
    command: "sudo rm -rf /", event: "swarm", achievement: "Атака ИИ-агентов",
  },
  {
    system: "NixOS", title: "Выполнить одну из двух команд на NixOS",
    noteTitle: "Удалить nix или обновиться",
    command: "sudo rm -rf /nix/store", event: "furry", achievement: "Пушистая ярость",
    alternative: { command: "sudo nixos-rebuild switch --upgrade", event: "ally" },
  },
  { system: "Debian", title: "Обновить Debian", command: "sudo apt update && sudo apt upgrade", event: "elder" },
  { system: "Kali Linux", title: "Провести пентест", command: "sudo apt install opsec", event: "opsec" },
  {
    system: "Arch Linux", title: "Полюбоваться фетчем", command: "fastfetch", repeats: 5, event: "arch-outfit",
    achievement: "Настоящий райсер", finale: false,
  },
  {
    system: "Windows 11", title: "Удалить ПК", instruction: "Перетащить «Этот ПК» в корзину", event: "windows-delete",
    achievement: "Аче всмысле", icon: "cat", finale: false,
  },
];

export const finaleAchievement = { system: "Linux Lab", event: "linux-user", achievement: "Настоящий линуксоид" };
