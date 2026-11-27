export const tasks = [
  { system: "Gentoo", title: "Обновить Gentoo", command: "sudo emerge -avuDN @world", event: "explosion", achievement: "Сборка с огоньком" },
  { system: "Ubuntu", title: "Удалить snapd из Ubuntu", command: "sudo apt purge snapd", event: "spider", achievement: "Canonical негодует" },
  {
    system: "ALT Linux", title: "На ALT Linux после su - выполнить одну из двух команд",
    command: "apt-get install vpn", setup: "su -", event: "walker", achievement: "Вы потревожили РКН",
    alternative: { command: "apt-get install gigacode", event: "gigacode", once: true },
  },
  { system: "Fedora", title: "Обновить Fedora", command: "sudo dnf upgrade", event: "visitor", achievement: "Ядро в порядке" },
  { system: "Omarchy", title: "Удалить систему Omarchy", command: "sudo rm -rf /", event: "swarm", achievement: "Атака ИИ-агентов" },
  {
    system: "NixOS", title: "Выполнить одну из двух команд на NixOS",
    command: "sudo rm -rf /nix/store", event: "furry", achievement: "Пушистая ярость",
    alternative: { command: "sudo nixos-rebuild switch --upgrade", event: "ally", once: true },
  },
  { system: "Debian", title: "Обновить Debian", command: "sudo apt update && sudo apt upgrade", event: "elder" },
];

export const finaleAchievement = { system: "Linux Lab", event: "linux-user", achievement: "Настоящий линуксоид" };
