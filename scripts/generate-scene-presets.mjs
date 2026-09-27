// Genera las ilustraciones de las plantillas de escena (SVG 1600×900, estilo de siluetas por capas).
// Uso: node scripts/generate-scene-presets.mjs public/escenas
import fs from "fs";
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const W = 1600, H = 900;

// Aleatorio con semilla para que cada archivo salga siempre igual.
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

let gid = 0;
const lin = (stops, x2 = 0, y2 = 1) => {
  const id = "g" + ++gid;
  return { id, def: `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, op = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/>`).join("")}</linearGradient>` };
};
const rad = (stops, cx = 0.5, cy = 0.5, r = 0.5) => {
  const id = "r" + ++gid;
  return { id, def: `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, op = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/>`).join("")}</radialGradient>` };
};
const svg = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs.map((d) => d.def).join("")}</defs>${body}</svg>`;

// Cordillera: línea quebrada suave de izquierda a derecha y cierre por abajo.
const ridge = (r, base, amp, step, color, op = 1, jag = 0.5) => {
  let d = `M0 ${H} L0 ${base}`;
  for (let x = 0; x <= W + step; x += step) {
    const y = base - amp * (0.35 + r() * 0.65) * (r() < jag ? 1 : 0.55);
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return `<path d="${d} L${W} ${H} Z" fill="${color}" opacity="${op}"/>`;
};
const hills = (r, base, amp, n, color, op = 1) => {
  let d = `M0 ${H} L0 ${base}`;
  const seg = W / n;
  for (let i = 0; i < n; i++) {
    const x1 = i * seg + seg / 2, x2 = (i + 1) * seg;
    d += ` Q${x1.toFixed(0)} ${(base - amp * (0.4 + r() * 0.6)).toFixed(0)} ${x2.toFixed(0)} ${(base - amp * r() * 0.3).toFixed(0)}`;
  }
  return `<path d="${d} L${W} ${H} Z" fill="${color}" opacity="${op}"/>`;
};
const pine = (x, y, h, color) => {
  const w = h * 0.42;
  return `<path d="M${x} ${y - h} L${x + w * 0.35} ${y - h * 0.62} L${x + w * 0.2} ${y - h * 0.62} L${x + w * 0.5} ${y - h * 0.28} L${x + w * 0.3} ${y - h * 0.28} L${x + w * 0.62} ${y} L${x - w * 0.62} ${y} L${x - w * 0.3} ${y - h * 0.28} L${x - w * 0.5} ${y - h * 0.28} L${x - w * 0.2} ${y - h * 0.62} L${x - w * 0.35} ${y - h * 0.62} Z" fill="${color}"/><rect x="${x - h * 0.02}" y="${y - 2}" width="${h * 0.04}" height="${h * 0.08}" fill="${color}"/>`;
};
const pines = (r, y, hMin, hMax, gap, color) => {
  let s = "";
  for (let x = -40; x < W + 60; x += gap * (0.6 + r() * 0.8)) s += pine(x, y + r() * 14, hMin + r() * (hMax - hMin), color);
  return s;
};
// Pinos solo en los laterales, para enmarcar sin tapar el centro.
const pinesEdges = (r, y, hMin, hMax, gap, color, leftMax, rightMin) => {
  let s = "";
  for (let x = -60; x < W + 80; x += gap * (0.6 + r() * 0.8)) if (x < leftMax || x > rightMin) s += pine(x, y + r() * 14, hMin + r() * (hMax - hMin), color);
  return s;
};
const stars = (r, n, maxY, op = 0.8) => {
  let s = "";
  for (let i = 0; i < n; i++) s += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * maxY).toFixed(0)}" r="${(0.6 + r() * 1.6).toFixed(1)}" fill="#fff" opacity="${(0.3 + r() * op).toFixed(2)}"/>`;
  return s;
};
const fog = (y, h, color, op) => {
  const g = lin([[0, color, 0], [0.5, color, op], [1, color, 0]]);
  return { def: g, body: `<rect x="0" y="${y}" width="${W}" height="${h}" fill="url(#${g.id})"/>` };
};
const glow = (cx, cy, r, color, op = 0.8) => {
  const g = rad([[0, color, op], [0.35, color, op * 0.45], [1, color, 0]]);
  return { def: g, body: `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${g.id})"/>` };
};
const vignette = () => {
  const g = rad([[0.55, "#000", 0], [1, "#000", 0.55]], 0.5, 0.45, 0.75);
  return { def: g, body: `<rect width="${W}" height="${H}" fill="url(#${g.id})"/>` };
};
const window_ = (x, y, w, h, lit) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${lit ? "#F6C868" : "#2A2230"}" opacity="${lit ? 0.95 : 0.8}"/>`;
const build = (parts) => {
  const defs = [], body = [];
  for (const p of parts) {
    if (typeof p === "string") body.push(p);
    else {
      if (p.def) defs.push(p.def);
      if (p.defs) defs.push(...p.defs);
      body.push(p.body || "");
    }
  }
  return svg(defs, body.join(""));
};
const bg = (stops) => {
  const g = lin(stops);
  return { def: g, body: `<rect width="${W}" height="${H}" fill="url(#${g.id})"/>` };
};

const SCENES = {};

/* Bosque: mañana dorada entre pinos, con niebla y un sendero */
{
  const r = rng(11);
  const path = lin([[0, "#8B7A55"], [1, "#5E5238"]]);
  const rays = lin([[0, "#FFF3C4", 0.55], [1, "#FFF3C4", 0]], 0.3, 1);
  let beams = "";
  for (let i = 0; i < 6; i++) beams += `<path d="M${1050 + i * 70} -20 L${780 + i * 130} ${H} L${840 + i * 130} ${H} L${1090 + i * 70} -20 Z" fill="url(#${rays.id})" opacity="${0.25 + r() * 0.3}"/>`;
  const f1 = fog(420, 160, "#E9F0D8", 0.7), f2 = fog(560, 140, "#DDE8C8", 0.55);
  SCENES.bosque = build([
    bg([[0, "#F6E7B8"], [0.45, "#CFDDAF"], [1, "#7E9B6A"]]),
    glow(1180, 170, 380, "#FFF6D2", 0.9),
    ridge(r, 470, 120, 90, "#A9BE94", 0.9),
    pines(r, 520, 120, 190, 38, "#8FAA7C"),
    f1, pines(r, 640, 150, 240, 60, "#5E7F52"),
    { def: rays, body: beams },
    f2,
    { def: path, body: `<path d="M720 ${H} Q780 760 760 700 Q740 660 800 640 L830 640 Q800 670 830 710 Q880 780 900 ${H} Z" fill="url(#${path.id})"/>` },
    pinesEdges(r, 910, 420, 600, 110, "#2F4A2E", 330, 1280),
    vignette(),
  ]);
}

/* Ciudad: atardecer sobre una ciudad amurallada con torres y ventanas encendidas */
{
  const r = rng(23);
  let city = "";
  for (let x = 40; x < W; x += 50 + r() * 60) {
    const w = 50 + r() * 70, h = 110 + r() * 170, y = 690 - h;
    city += `<rect x="${x}" y="${y}" width="${w}" height="${h + 40}" fill="#3B2C45"/><path d="M${x - 8} ${y} L${x + w / 2} ${y - 40 - r() * 40} L${x + w + 8} ${y} Z" fill="#33253D"/>`;
    for (let wy = y + 20; wy < 660; wy += 34) for (let wx = x + 10; wx < x + w - 14; wx += 22) city += window_(wx, wy, 9, 14, r() < 0.35);
  }
  const towers = [[260, 330], [760, 250], [1240, 300]].map(([x, top]) => `<rect x="${x}" y="${top}" width="70" height="${700 - top}" fill="#2E2238"/><path d="M${x - 14} ${top} L${x + 35} ${top - 130} L${x + 84} ${top} Z" fill="#291E33"/>${window_(x + 27, top + 40, 16, 26, true)}`).join("");
  const wall = `<path d="M0 700 ${Array.from({ length: 41 }, (_, i) => `L${i * 40} ${i % 2 ? 700 : 680} L${i * 40 + 20} ${i % 2 ? 700 : 680}`).join(" ")} L${W} 700 L${W} ${H} L0 ${H} Z" fill="#241A2C"/>`;
  SCENES.ciudad = build([
    bg([[0, "#3C2F5C"], [0.45, "#B45F6E"], [0.75, "#F0A262"], [1, "#F7D08A"]]),
    glow(800, 640, 520, "#FFD58A", 0.55),
    ridge(r, 600, 90, 120, "#6E4A67", 0.8),
    city,
    towers,
    fog(640, 120, "#F6B87A", 0.25),
    wall,
    vignette(),
  ]);
}

/* Posada: interior cálido con chimenea, vigas, mesas y barriles */
{
  const r = rng(37);
  const fire = rad([[0, "#FFE7A0"], [0.35, "#FF9A3D"], [1, "#C2411E", 0]], 0.5, 0.75, 0.6);
  let planks = "";
  for (let x = 0; x < W; x += 80) planks += `<rect x="${x}" y="0" width="78" height="${H}" fill="${r() < 0.5 ? "#5A3A26" : "#523422"}"/>`;
  const beams = [140, 300].map((y) => `<rect x="0" y="${y}" width="${W}" height="34" fill="#3A2416"/>`).join("") + [120, 700, 1300].map((x) => `<rect x="${x}" y="0" width="44" height="${H}" fill="#3F2819"/>`).join("");
  const fireplace = `<path d="M560 330 L1040 330 L1040 740 L560 740 Z" fill="#6E6259"/><path d="M540 310 L1060 310 L1060 350 L540 350 Z" fill="#4A2E1C"/><path d="M640 740 L640 520 Q800 420 960 520 L960 740 Z" fill="#1A120E"/><ellipse cx="800" cy="700" rx="150" ry="120" fill="url(#${fire.id})"/><path d="M740 740 Q760 640 790 690 Q800 600 830 680 Q860 620 870 740 Z" fill="#FFC45A"/><path d="M770 740 Q790 680 805 710 Q815 660 835 740 Z" fill="#FFF0B0"/>` + Array.from({ length: 16 }, (_, i) => `<rect x="${560 + (i % 8) * 60}" y="${360 + Math.floor(i / 8) * 190}" width="56" height="30" fill="#5E534B" opacity=".6"/>`).join("");
  const lamp = (x) => `<line x1="${x}" y1="174" x2="${x}" y2="250" stroke="#2A1A10" stroke-width="3"/><rect x="${x - 14}" y="250" width="28" height="34" rx="4" fill="#FFD27A"/>`;
  const lamps = [300, 1260, 1480].map(lamp).join("");
  const table = (x, y, s) => `<rect x="${x}" y="${y}" width="${260 * s}" height="${22 * s}" rx="4" fill="#2C1B11"/><rect x="${x + 20 * s}" y="${y + 20 * s}" width="${16 * s}" height="${110 * s}" fill="#24160E"/><rect x="${x + 224 * s}" y="${y + 20 * s}" width="${16 * s}" height="${110 * s}" fill="#24160E"/><rect x="${x + 60 * s}" y="${y - 34 * s}" width="${22 * s}" height="${34 * s}" rx="3" fill="#C9A45A" opacity=".85"/>`;
  const barrel = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="58" ry="80" fill="#3A2415"/><rect x="${x - 58}" y="${y - 30}" width="116" height="8" fill="#1E130B"/><rect x="${x - 58}" y="${y + 24}" width="116" height="8" fill="#1E130B"/>`;
  const win = `<rect x="1220" y="380" width="200" height="220" rx="6" fill="#1E2A48"/><path d="M1320 380 V600 M1220 490 H1420" stroke="#3A2416" stroke-width="10"/>${stars(rng(5), 12, 0).replace(/cy="[\d.]+"/g, () => `cy="${400 + Math.random() * 180}"`).replace(/cx="[\d.]+"/g, () => `cx="${1230 + Math.random() * 180}"`)}`;
  SCENES.posada = build([
    `<rect width="${W}" height="${H}" fill="#4A2F1F"/>`,
    planks,
    beams,
    win,
    glow(800, 620, 700, "#FF9A3D", 0.45),
    { def: fire, body: fireplace },
    lamps,
    ...[300, 1260, 1480].map((x) => glow(x, 270, 160, "#FFD27A", 0.5)),
    `<rect x="0" y="760" width="${W}" height="140" fill="#2E1D12"/>`,
    table(80, 700, 1.3),
    table(1150, 720, 1.15),
    barrel(1500, 780),
    barrel(1380, 810),
    vignette(),
  ]);
}

/* Mazmorra: pasillo de piedra en perspectiva con antorchas */
{
  const r = rng(41);
  let bricks = "";
  for (let y = 0; y < H; y += 46) for (let x = (y / 46) % 2 ? -60 : 0; x < W; x += 120) bricks += `<rect x="${x + 2}" y="${y + 2}" width="116" height="42" rx="3" fill="${r() < 0.5 ? "#3B3642" : "#35303C"}"/>`;
  const arch = (s, op) => {
    const cx = 800, w = 900 * s, h = 760 * s, top = 450 - h * 0.62;
    return `<path d="M${cx - w / 2} ${H} L${cx - w / 2} ${top + w / 2} A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${top + w / 2} L${cx + w / 2} ${H}" fill="none" stroke="#1C1822" stroke-width="${70 * s}" opacity="${op}"/>`;
  };
  const torch = (x, y) => `<rect x="${x - 6}" y="${y}" width="12" height="60" fill="#2A1C12"/><path d="M${x - 16} ${y} Q${x} ${y - 70} ${x + 16} ${y} Z" fill="#FF9A3D"/><path d="M${x - 8} ${y} Q${x} ${y - 40} ${x + 8} ${y} Z" fill="#FFE6A0"/>`;
  const dark = rad([[0, "#000", 0.95], [0.5, "#000", 0.6], [1, "#000", 0]], 0.5, 0.5, 0.5);
  SCENES.mazmorra = build([
    `<rect width="${W}" height="${H}" fill="#2A2530"/>`,
    bricks,
    `<path d="M0 ${H} L560 520 L1040 520 L${W} ${H} Z" fill="#23202A"/>`,
    { def: dark, body: `<ellipse cx="800" cy="470" rx="330" ry="260" fill="url(#${dark.id})"/>` },
    arch(0.45, 0.9),
    arch(0.7, 0.95),
    arch(1.05, 1),
    glow(330, 420, 320, "#FF8A3A", 0.55),
    glow(1270, 420, 320, "#FF8A3A", 0.55),
    torch(330, 420),
    torch(1270, 420),
    vignette(),
  ]);
}

/* Camino: llanura soleada con colinas, un camino que se pierde y nubes */
{
  const r = rng(53);
  const cloud = (x, y, s) => `<g fill="#fff" opacity=".85"><ellipse cx="${x}" cy="${y}" rx="${90 * s}" ry="${34 * s}"/><ellipse cx="${x + 60 * s}" cy="${y - 20 * s}" rx="${70 * s}" ry="${40 * s}"/><ellipse cx="${x - 60 * s}" cy="${y - 8 * s}" rx="${60 * s}" ry="${30 * s}"/></g>`;
  const road = lin([[0, "#D9C38F"], [1, "#B79B62"]]);
  let fence = "";
  for (let i = 0; i < 9; i++) {
    const x = 1000 + i * 80, y = 740 + i * 18;
    fence += `<rect x="${x}" y="${y - 50}" width="8" height="60" fill="#6B5334"/>`;
  }
  fence += `<path d="M1000 710 L1648 872 M1000 730 L1648 892" stroke="#6B5334" stroke-width="6"/>`;
  SCENES.camino = build([
    bg([[0, "#6FA8DC"], [0.55, "#BFE0F2"], [1, "#E9F2D8"]]),
    glow(300, 160, 260, "#FFFBE0", 0.9),
    cloud(520, 180, 1.2), cloud(1150, 130, 0.9), cloud(1380, 260, 0.7),
    ridge(r, 470, 90, 110, "#9FB7C6", 0.8),
    hills(r, 560, 110, 4, "#9CC27A"),
    hills(r, 650, 120, 3, "#7FAE5C"),
    { def: road, body: `<path d="M620 ${H} C700 780 900 740 820 660 C770 610 800 580 860 565 L880 565 C830 590 820 620 860 660 C960 750 820 800 900 ${H} Z" fill="url(#${road.id})"/>` },
    hills(r, 800, 90, 2, "#5E8E45"),
    fence,
    pine(180, 820, 300, "#3F6A34"), pine(260, 850, 240, "#355C2C"),
    vignette(),
  ]);
}

/* Montañas: picos nevados, cielo frío */
{
  const r = rng(67);
  const peak = (x, y, w, h, c, snow) => `<path d="M${x - w} ${y} L${x} ${y - h} L${x + w} ${y} Z" fill="${c}"/><path d="M${x - w * 0.28} ${y - h * 0.72} L${x} ${y - h} L${x + w * 0.28} ${y - h * 0.72} L${x + w * 0.12} ${y - h * 0.66} L${x} ${y - h * 0.74} L${x - w * 0.14} ${y - h * 0.64} Z" fill="${snow}"/>`;
  SCENES.montanas = build([
    bg([[0, "#2F4A73"], [0.5, "#7FA3C7"], [1, "#DCE8F2"]]),
    glow(1250, 200, 260, "#FFFFFF", 0.5),
    peak(400, 640, 420, 440, "#6D84A0", "#EEF4FA"),
    peak(1000, 660, 520, 520, "#5F7693", "#F5F9FC"),
    peak(1450, 640, 380, 360, "#6D84A0", "#EEF4FA"),
    fog(500, 180, "#E6EEF6", 0.7),
    ridge(r, 700, 120, 80, "#465C78"),
    pines(r, 800, 90, 160, 30, "#2C3E55"),
    ridge(r, 860, 60, 60, "#223246"),
    vignette(),
  ]);
}

/* Puerto: atardecer sobre el mar con muelles y barcos */
{
  const r = rng(79);
  const sea = lin([[0, "#E9A56B"], [0.3, "#8C6C8E"], [1, "#2D3552"]]);
  let shimmer = "";
  for (let i = 0; i < 40; i++) {
    const y = 560 + r() * 300, w = 20 + r() * 90;
    shimmer += `<rect x="${1000 + (r() - 0.5) * (y - 500) * 1.6}" y="${y}" width="${w}" height="3" rx="1.5" fill="#FFD9A0" opacity="${0.3 + r() * 0.5}"/>`;
  }
  const ship = (x, y, s) => `<g fill="#241B2A"><path d="M${x - 130 * s} ${y} L${x + 140 * s} ${y} L${x + 100 * s} ${y + 40 * s} L${x - 100 * s} ${y + 40 * s} Z"/><rect x="${x - 4 * s}" y="${y - 230 * s}" width="${8 * s}" height="${230 * s}"/><rect x="${x - 74 * s}" y="${y - 170 * s}" width="${6 * s}" height="${170 * s}"/><path d="M${x + 8 * s} ${y - 210 * s} Q${x + 100 * s} ${y - 150 * s} ${x + 8 * s} ${y - 40 * s} Z" fill="#E8D8C0" opacity=".9"/><path d="M${x - 66 * s} ${y - 150 * s} Q${x - 10 * s} ${y - 110 * s} ${x - 66 * s} ${y - 40 * s} Z" fill="#E8D8C0" opacity=".85"/></g>`;
  let dock = `<rect x="0" y="700" width="700" height="24" fill="#2A1E22"/>`;
  for (let x = 20; x < 700; x += 70) dock += `<rect x="${x}" y="700" width="14" height="200" fill="#231920"/>`;
  let houses = "";
  for (let x = 0; x < 520; x += 90) {
    const h = 120 + r() * 120;
    houses += `<rect x="${x}" y="${700 - h}" width="84" height="${h}" fill="#35263A"/><path d="M${x - 6} ${700 - h} L${x + 42} ${660 - h} L${x + 90} ${700 - h} Z" fill="#2E2033"/>${window_(x + 30, 720 - h, 12, 18, r() < 0.6)}`;
  }
  SCENES.puerto = build([
    bg([[0, "#4A3A6A"], [0.4, "#D07B6A"], [0.62, "#F6C27A"], [0.63, "#E9A56B"]]),
    glow(1000, 560, 300, "#FFE3A0", 0.9),
    `<circle cx="1000" cy="560" r="80" fill="#FFE9B0"/>`,
    { def: sea, body: `<rect x="0" y="560" width="${W}" height="340" fill="url(#${sea.id})"/>${shimmer}` },
    ship(1250, 640, 1), ship(760, 610, 0.55),
    houses,
    dock,
    vignette(),
  ]);
}

/* Ruinas: luna sobre torres derruidas */
{
  const r = rng(89);
  const ruin = (x, w, h, broken) => `<path d="M${x} 760 L${x} ${760 - h} ${broken ? `L${x + w * 0.3} ${760 - h - 30} L${x + w * 0.55} ${760 - h + 20} L${x + w * 0.8} ${760 - h - 10}` : ""} L${x + w} ${760 - h} L${x + w} 760 Z" fill="#231D2B"/>` + (h > 200 ? `<path d="M${x + w * 0.35} ${760 - h * 0.6} v-60 a${w * 0.15} ${w * 0.15} 0 0 1 ${w * 0.3} 0 v60 Z" fill="#5B6C84" opacity=".6"/>` : "");
  const cols = Array.from({ length: 5 }, (_, i) => `<rect x="${980 + i * 90}" y="${560 + (i % 2) * 70 + r() * 40}" width="36" height="220" fill="#2A2331"/>`).join("");
  SCENES.ruinas = build([
    bg([[0, "#1D2640"], [0.55, "#56677F"], [1, "#B39A7A"]]),
    stars(r, 80, 380, 0.6),
    glow(1220, 170, 240, "#F3E3B8", 0.6),
    `<circle cx="1220" cy="170" r="60" fill="#F3E3B8"/>`,
    ridge(r, 600, 150, 140, "#3F4B5E", 0.9),
    fog(560, 180, "#9FAABB", 0.35),
    ruin(260, 150, 330, true), ruin(460, 110, 220, true), ruin(140, 90, 150, false),
    cols,
    `<path d="M0 760 Q400 720 800 750 T${W} 740 L${W} ${H} L0 ${H} Z" fill="#17131D"/>`,
    vignette(),
  ]);
}

/* Castillo: fortaleza en lo alto de un risco, de noche */
{
  const r = rng(97);
  const tower = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1E1A28"/>` + Array.from({ length: Math.floor(w / 20) }, (_, i) => `<rect x="${x + i * 20}" y="${y - 16}" width="12" height="16" fill="#1E1A28"/>`).join("") + window_(x + w / 2 - 7, y + 40, 14, 22, r() < 0.8);
  SCENES.castillo = build([
    bg([[0, "#141A33"], [0.6, "#3A3F6A"], [1, "#7A6E8E"]]),
    stars(r, 120, 500, 0.7),
    glow(330, 180, 220, "#DCE4FF", 0.5),
    `<circle cx="330" cy="180" r="54" fill="#E8EDFF"/>`,
    ridge(r, 700, 100, 120, "#2E3354", 0.9),
    `<path d="M560 ${H} L640 560 L760 520 L1020 520 L1120 580 L1220 ${H} Z" fill="#1A1624"/>`,
    tower(700, 330, 90, 200), tower(990, 300, 100, 230), tower(820, 390, 160, 140),
    `<path d="M835 390 L900 250 L965 390 Z" fill="#1A1624"/>${window_(893, 330, 14, 24, true)}`,
    ...[[745, 380], [1040, 350], [900, 440]].map(([x, y]) => glow(x, y, 60, "#F6C868", 0.45)),
    fog(760, 140, "#5A5F86", 0.4),
    ridge(r, 850, 60, 70, "#100E18"),
    vignette(),
  ]);
}

/* Campamento: claro nocturno con hoguera, tiendas y estrellas */
{
  const r = rng(113);
  const tent = (x, y, s, c) => `<path d="M${x - 150 * s} ${y} L${x} ${y - 170 * s} L${x + 150 * s} ${y} Z" fill="${c}"/><path d="M${x - 30 * s} ${y} L${x} ${y - 110 * s} L${x + 30 * s} ${y} Z" fill="#1A1410"/>`;
  const fire = `<path d="M760 780 Q775 690 800 740 Q810 650 835 730 Q860 690 850 780 Z" fill="#FF9A3D"/><path d="M785 780 Q800 720 812 745 Q822 700 835 780 Z" fill="#FFE6A0"/><path d="M740 790 L880 770 M745 770 L870 792" stroke="#3A2415" stroke-width="12" stroke-linecap="round"/>`;
  SCENES.campamento = build([
    bg([[0, "#0E1426"], [0.6, "#1F2A44"], [1, "#2B2E3A"]]),
    stars(r, 180, 520, 0.8),
    ridge(r, 560, 80, 90, "#1A2233"),
    pines(r, 640, 160, 280, 45, "#121A26"),
    `<path d="M0 ${H} L0 700 Q800 640 ${W} 700 L${W} ${H} Z" fill="#1B1F24"/>`,
    glow(810, 740, 520, "#FF8A3A", 0.5),
    tent(460, 790, 1, "#6E4B3A"),
    tent(1180, 800, 0.85, "#5A3E54"),
    fire,
    pinesEdges(r, 910, 380, 520, 120, "#0A0F16", 220, 1400),
    vignette(),
  ]);
}

for (const [name, s] of Object.entries(SCENES)) fs.writeFileSync(`${OUT}/${name}.svg`, s);
console.log(Object.keys(SCENES).join(", "));
