const systems = [
  {
    name: "Ubuntu",
    os: "Ubuntu 24.04.2 LTS x86_64",
    kernel: "Linux 6.8.0-57-generic",
    packages: "1824 (dpkg), 14 (snap)",
    shell: "bash 5.2.21",
    desktop: "GNOME 46.0",
    wm: "Mutter (Wayland)",
    terminal: "GNOME Terminal 3.52.0",
    host: "ThinkCentre M720q",
    cpu: "Intel Core i5-8500T (6) @ 3.50 GHz",
    gpu: "Intel UHD Graphics 630",
    memory: "2.41 GiB / 15.45 GiB (16%)",
    uptime: "48 mins",
    color: "#f6a383",
    logo: [
      "      ▄████▄ ▄█▄",
      "   ▄██▀▀    █████",
      "  ██▀        ▀█▀",
      " ██             ██",
      "▐████          ▐██▌",
      " ███            ██",
      "  ██▄        ▄█▄",
      "   ▀██▄▄    █████",
      "      ▀████▀ ▀█▀",
    ],
  },
  {
    name: "Gentoo",
    os: "Gentoo Linux x86_64",
    kernel: "Linux 6.12.21-gentoo-dist",
    packages: "1073 (emerge)",
    shell: "bash 5.2.37",
    desktop: "KDE Plasma 6.3.4",
    wm: "KWin (Wayland)",
    terminal: "Konsole 24.12.3",
    host: "B550M PRO-VDH WIFI",
    cpu: "AMD Ryzen 5 5600 (12) @ 4.40 GHz",
    gpu: "AMD Radeon RX 6600",
    memory: "3.17 GiB / 31.26 GiB (10%)",
    uptime: "5 hours, 6 mins",
    color: "#c4afff",
    logo: [
      "      ▄▄▄▄▄▄▄",
      "    ▄█████████▄",
      "   ███▀     ▀███▄",
      "    ▀█▄  ▄▄  ▀███▄",
      "      ▄█▀     ████",
      "    ▄█▀      ███▀",
      "  ▄██       ███▀",
      "  ███████████▀",
      "   ▀▀▀▀▀▀▀▀▀",
    ],
  },
  {
    name: "Omarchy",
    os: "Omarchy (Arch Linux) x86_64",
    kernel: "Linux 6.18.7-arch1-1",
    packages: "1028 (pacman)",
    shell: "bash 5.3.9",
    desktop: "Hyprland 0.53.3",
    wm: "Hyprland (Wayland)",
    terminal: "foot 1.25.0",
    host: "Framework Laptop 13 (AMD Ryzen 7040)",
    cpu: "AMD Ryzen 7 7840U (16) @ 5.10 GHz",
    gpu: "AMD Radeon 780M",
    memory: "2.73 GiB / 30.55 GiB (9%)",
    uptime: "1 hour, 23 mins",
    color: "#e9ac83",
    logo: [
      "    ▄▄▄▄▄  ▄▄▄▄▄",
      "  ▄██▀▀██▄██▀▀██▄",
      "  ██    ███    ██",
      "  ██     ▀     ██",
      "  ██           ██",
      "  ██  ██   ██  ██",
      "  ██  ██   ██  ██",
      "  ▀▀  ▀▀   ▀▀  ▀▀",
    ],
  },
  {
    name: "Fedora",
    os: "Fedora Linux 42 (Workstation Edition) x86_64",
    kernel: "Linux 6.14.5-300.fc42.x86_64",
    packages: "2147 (rpm), 8 (flatpak)",
    shell: "bash 5.2.37",
    desktop: "GNOME 48.1",
    wm: "Mutter (Wayland)",
    terminal: "Ptyxis 48.2",
    host: "OptiPlex 7090",
    cpu: "Intel Core i5-11500 (12) @ 4.60 GHz",
    gpu: "Intel UHD Graphics 750",
    memory: "2.96 GiB / 15.35 GiB (19%)",
    uptime: "32 mins",
    color: "#88c9ff",
    logo: [
      "     ▄████████▄",
      "   ▄████████████▄",
      "  ██████▀    ▀████",
      " ██████▌  ▄█▄ ████▌",
      " ███▀      ███████▌",
      " █████▌  █████████",
      " ████▀   ████████▀",
      " █▄   ▄████████▀",
      " ▀▀████████▀▀",
    ],
  },
  {
    name: "ALT Linux",
    os: "ALT Workstation K 11.1 (p11) x86_64",
    kernel: "Linux 6.12.47-6.12-alt1",
    packages: "2038 (rpm)",
    shell: "bash 5.2.37",
    desktop: "KDE Plasma 6.3.6",
    wm: "KWin (Wayland)",
    terminal: "Konsole 25.04.3",
    host: "ThinkStation P350 Tiny",
    cpu: "Intel Core i5-11500T (12) @ 3.90 GHz",
    gpu: "Intel UHD Graphics 750",
    memory: "2.12 GiB / 15.36 GiB (14%)",
    uptime: "2 hours, 11 mins",
    color: "#ffcd7a",
    logo: [
      "   ▄▄▄▄▄▄▄▄▄▄▄▄▄▄",
      "  ███▀▀▀▀▀▀▀▀▀▀███",
      "  ██  ▄█▄ ▄█▄  ██",
      "  ██ ▐███▌███▌ ██",
      "  ██  ▀█▀ ▀█▀  ██",
      "  ██    ▄█▄    ██",
      "  ██   █████   ██",
      "  ███▄▄▄▄▄▄▄▄▄███",
      "   ▀▀▀▀▀▀▀▀▀▀▀▀▀",
    ],
  },
];

export function shuffleSystems() {
  const shuffled = [...systems];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

export function createFastfetch(system, hostname) {
  const result = document.createElement("div");
  result.className = "terminal-result";
  result.style.setProperty("--system-color", system.color);

  const logo = document.createElement("pre");
  logo.className = "fetch-logo";
  logo.setAttribute("aria-hidden", "true");
  logo.textContent = system.logo.join("\n");

  const details = document.createElement("div");
  const host = document.createElement("div");
  host.className = "fetch-host";
  host.textContent = "operator@" + hostname;
  const info = document.createElement("dl");
  info.className = "fetch-info";
  const fields = [
    ["OS", system.os], ["Host", system.host], ["Kernel", system.kernel],
    ["Uptime", system.uptime], ["Packages", system.packages], ["Shell", system.shell],
    ["Display", "1920x1080 @ 60 Hz"], ["DE", system.desktop], ["WM", system.wm],
    ["Terminal", system.terminal], ["CPU", system.cpu], ["GPU", system.gpu],
    ["Memory", system.memory],
  ];
  for (const [label, value] of fields) {
    const row = document.createElement("div");
    const key = document.createElement("dt");
    const item = document.createElement("dd");
    key.textContent = label + ": ";
    item.textContent = value;
    row.append(key, item);
    info.append(row);
  }

  const palette = document.createElement("div");
  palette.className = "fetch-palette";
  palette.setAttribute("aria-hidden", "true");
  for (const color of ["#344044", "#d6736f", "#91ba89", "#e5bf76", "#799ed6", "#c48fcb", "#85c4c4", "#dce3de"]) {
    const swatch = document.createElement("i");
    swatch.style.setProperty("--swatch", color);
    palette.append(swatch);
  }
  details.append(host, info, palette);
  result.append(logo, details);
  return result;
}
