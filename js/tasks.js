export const tasks = [
  { system: "Gentoo", title: "Обновить Gentoo", command: "sudo emerge -avuDN @world", event: "explosion" },
  { system: "Ubuntu", title: "Удалить snapd из Ubuntu", command: "sudo apt purge snapd", event: "spider" },
  { system: "ALT Linux", title: "Установить VPN на ALT Linux", command: "apt-get install vpn", setup: "su -", event: "walker" },
  { system: "Fedora", title: "Обновить Fedora", command: "sudo dnf upgrade", event: "visitor" },
  { system: "Omarchy", title: "Удалить систему Omarchy", command: "sudo rm -rf /", event: "swarm" },
];
