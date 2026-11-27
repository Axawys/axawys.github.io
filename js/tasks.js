export const tasks = [
  { system: "Gentoo", title: "Обновить Gentoo", command: "sudo emerge -avuDN @world", event: "explosion", achievement: "Сборка с огоньком" },
  { system: "Ubuntu", title: "Удалить snapd из Ubuntu", command: "sudo apt purge snapd", event: "spider", achievement: "Canonical негодует" },
  { system: "ALT Linux", title: "Установить VPN на ALT Linux", command: "apt-get install vpn", setup: "su -", event: "walker", achievement: "Вы потревожили РКН" },
  { system: "Fedora", title: "Обновить Fedora", command: "sudo dnf upgrade", event: "visitor", achievement: "Ядро в порядке" },
  { system: "Omarchy", title: "Удалить систему Omarchy", command: "sudo rm -rf /", event: "swarm", achievement: "Атака ИИ-агентов" },
  { system: "NixOS", title: "Удалить хранилище NixOS", command: "sudo rm -rf /nix/store", event: "furry", achievement: "Пушистая ярость" },
];
