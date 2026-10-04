// Generador determinista de mapas de cuadrícula para cada localización del mundo.
export const GRID_W = 28;
export const GRID_H = 18;

// Colores de cada tipo de casilla.
export const TILE_STYLE = {
  ".": { fill: "#6E9B4F", alt: "#678F49" }, // hierba
  r: { fill: "#B79A63", alt: "#AD915B" }, // camino
  p: { fill: "#C9BFA6", alt: "#BFB59B" }, // plaza / muelle
  f: { fill: "#6A6671", alt: "#625E69" }, // suelo de piedra
  w: { fill: "#2F78A8", alt: "#2A6E9C" }, // agua
  m: { fill: "#566B3D", alt: "#4F6337" }, // barro
  s: { fill: "#E4EEF2", alt: "#D7E4EA" }, // nieve
  t: { fill: "#2F6B3A", alt: "#2A6034" }, // árbol
  "#": { fill: "#4A4650", alt: "#4A4650" }, // muro
  b: { fill: "#8C5A3A", alt: "#8C5A3A" }, // edificio
  d: { fill: "#E3B04B", alt: "#E3B04B" }, // puerta
  o: { fill: "#8A8A94", alt: "#80808A" }, // roca
  x: { fill: "#D8662B", alt: "#D8662B" }, // hoguera
};
const BLOCKED = new Set(["#", "b", "o", "w", "t", "x"]);
export const isWalkable = (grid, x, y) => y >= 0 && y < GRID_H && x >= 0 && x < GRID_W && !BLOCKED.has(grid[y][x]);

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rngFrom(seed) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const blank = (ch) => Array.from({ length: GRID_H }, () => Array(GRID_W).fill(ch));
const rect = (g, x, y, w, h, ch) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= 0 && j < GRID_H && i >= 0 && i < GRID_W) g[j][i] = ch;
};
const set = (g, x, y, ch) => {
  if (y >= 0 && y < GRID_H && x >= 0 && x < GRID_W) g[y][x] = ch;
};

const SHOPS = {
  capital: ["Palacio real", "Cuartel", "Templo", "Mercado", "Posada", "Herrería", "Gremio de magos", "Archivos"],
  city: ["Ayuntamiento", "Gremio", "Templo", "Mercado", "Posada", "Herrería", "Biblioteca", "Cuartel"],
  town: ["Posada", "Herrería", "Herbolario", "Granero", "Casa del alcalde", "Capilla", "Establo", "Taberna"],
  port: ["Taberna del puerto", "Capitanía", "Almacén", "Astillero", "Mercado", "Posada"],
};

function settlement(type, rng) {
  const g = blank(".");
  const walled = type === "capital" || type === "city";
  const port = type === "port";
  // Árboles dispersos.
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (rng() < 0.05) g[y][x] = "t";
  rect(g, 0, 9, GRID_W, 1, "r");
  rect(g, 13, 0, 2, GRID_H, "r");
  rect(g, 11, 7, 6, 5, "p");
  set(g, 13, 9, "o"); set(g, 14, 9, "o"); // fuente
  const pois = [{ x: 13.5, y: 9, label: "Plaza" }];
  const slots = [[3, 2], [8, 2], [17, 2], [22, 2], [3, 12], [8, 12], [17, 12], [22, 12]].filter(([, y]) => !(port && y === 12));
  const names = [...SHOPS[type]];
  slots.forEach(([sx, sy], i) => {
    const w = 5, h = 4;
    rect(g, sx - 1, sy - 1, w + 2, h + 2, "."); // despeja árboles
    rect(g, sx, sy, w, h, "b");
    const top = sy < 9;
    const dx = sx + 2, dy = top ? sy + h - 1 : sy;
    set(g, dx, dy, "d");
    if (top) rect(g, dx, sy + h, 1, 9 - (sy + h), "r");
    else rect(g, dx, 10, 1, sy - 10, "r");
    pois.push({ x: dx + 0.5, y: top ? sy + 1.5 : sy + 2.5, label: names[i % names.length] });
  });
  if (port) {
    rect(g, 0, 14, GRID_W, 4, "w");
    for (const px of [5, 13, 21]) rect(g, px, 12, 2, 4, "p");
    rect(g, 13, 9, 2, 5, "r");
    set(g, 13, 14, "p"); set(g, 14, 14, "p");
    pois.push({ x: 14, y: 16.5, label: "Muelles" });
  }
  let spawn = { x: 13, y: port ? 12 : GRID_H - 2 };
  if (walled) {
    rect(g, 0, 0, GRID_W, 1, "#"); rect(g, 0, GRID_H - 1, GRID_W, 1, "#");
    rect(g, 0, 0, 1, GRID_H, "#"); rect(g, GRID_W - 1, 0, 1, GRID_H, "#");
    for (const [x, y] of [[13, 0], [14, 0], [13, GRID_H - 1], [14, GRID_H - 1], [0, 9], [GRID_W - 1, 9]]) set(g, x, y, "d");
    spawn = { x: 13, y: GRID_H - 2 };
  }
  return { grid: g, pois, spawn };
}

function wilds(name, rng) {
  const swamp = /pantano/i.test(name);
  const g = blank(".");
  const dense = swamp ? 0.14 : 0.3;
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    const r = rng();
    g[y][x] = swamp ? (r < 0.3 ? "m" : r < 0.4 ? "w" : r < dense + 0.3 ? "t" : ".") : r < dense ? "t" : ".";
  }
  // Camino sinuoso desde el sur hasta el claro central.
  let x = 14;
  for (let y = GRID_H - 1; y >= 6; y--) {
    rect(g, x, y, 1, 1, "r");
    if (rng() < 0.4) { x = Math.max(4, Math.min(GRID_W - 5, x + (rng() < 0.5 ? -1 : 1))); rect(g, x, y, 1, 1, "r"); }
  }
  rect(g, 10, 3, 9, 5, swamp ? "m" : ".");
  rect(g, 12, 4, 5, 3, ".");
  for (let i = 0; i < 4; i++) set(g, 12 + i, 5, "r");
  set(g, 14, 4, "x");
  const pois = [{ x: 14.5, y: 4, label: swamp ? "Isla seca" : "Claro" }, { x: 14, y: 16.5, label: "Entrada" }];
  return { grid: g, pois, spawn: { x, y: GRID_H - 1 } };
}

function ruins(rng) {
  const g = blank("#");
  const rooms = [[11, 12, 6, 4], [3, 7, 7, 4], [18, 7, 7, 4], [10, 1, 8, 5]];
  rooms.forEach(([x, y, w, h]) => rect(g, x, y, w, h, "f"));
  rect(g, 13, 16, 2, 2, "f"); rect(g, 13, 10, 2, 2, "f");
  rect(g, 10, 8, 1, 2, "f"); rect(g, 9, 8, 1, 1, "f"); rect(g, 17, 8, 1, 2, "f");
  rect(g, 13, 6, 2, 3, "f");
  rect(g, 10, 9, 8, 1, "f");
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (g[y][x] === "f" && y < 16 && (x < 12 || x > 15) && rng() < 0.08) g[y][x] = "o";
  set(g, 13, GRID_H - 1, "d"); set(g, 14, GRID_H - 1, "d");
  const pois = [{ x: 14, y: 3.5, label: "Cámara del tesoro" }, { x: 6.5, y: 9, label: "Sala del altar" }, { x: 21.5, y: 9, label: "Osario" }, { x: 14, y: 17.2, label: "Entrada" }];
  return { grid: g, pois, spawn: { x: 13, y: GRID_H - 2 } };
}

function peak(rng) {
  const g = blank("s");
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (rng() < 0.28) g[y][x] = "o";
  let x = 14;
  for (let y = GRID_H - 1; y >= 1; y--) {
    set(g, x, y, "r"); set(g, x + 1, y, "r");
    if (rng() < 0.45) x = Math.max(3, Math.min(GRID_W - 5, x + (rng() < 0.5 ? -1 : 1)));
  }
  rect(g, x - 2, 0, 6, 3, "s");
  rect(g, x, 1, 2, 1, "r");
  rect(g, 11, 13, 6, 3, "s"); rect(g, 13, 13, 2, 3, "r");
  return { grid: g, pois: [{ x: x + 1, y: 0.8, label: "Cima" }, { x: 14, y: 14.5, label: "Campamento base" }], spawn: { x: 14, y: GRID_H - 1 } };
}

function camp() {
  const g = blank(".");
  rect(g, 4, 3, 20, 12, "#");
  rect(g, 5, 4, 18, 10, ".");
  set(g, 13, 14, "d"); set(g, 14, 14, "d");
  rect(g, 13, 15, 2, 3, "r");
  for (const [tx, ty] of [[6, 5], [10, 5], [17, 5], [20, 5], [6, 10], [20, 10]]) { rect(g, tx, ty, 3, 2, "b"); set(g, tx + 1, ty + 1, "d"); }
  set(g, 13, 8, "x");
  rect(g, 12, 7, 4, 3, "r"); set(g, 13, 8, "x");
  const pois = [{ x: 13.5, y: 7, label: "Hoguera" }, { x: 14, y: 16.5, label: "Camino" }, { x: 7.5, y: 4.6, label: "Armería" }, { x: 21.5, y: 4.6, label: "Tienda del capitán" }];
  return { grid: g, pois, spawn: { x: 13, y: GRID_H - 2 } };
}

// Devuelve { grid, pois, spawn } para una localización.
export function generatePlace(place) {
  const rng = rngFrom(place.id);
  let data;
  if (place.type === "wild") data = wilds(place.name, rng);
  else if (place.type === "ruin") data = ruins(rng);
  else if (place.type === "peak") data = peak(rng);
  else if (place.type === "camp") data = camp(rng);
  else data = settlement(place.type, rng);
  const { grid, spawn } = data;
  // Garantiza que el punto de entrada sea transitable.
  if (!isWalkable(grid, spawn.x, spawn.y)) set(grid, spawn.x, spawn.y, "r");
  return data;
}
