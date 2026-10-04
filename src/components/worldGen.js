// Generador de mapas de localización con las mismas piezas que el tablero de campaña
// (terrenos y decorados de MAP_TERRAINS / MAP_PROPS), en la misma cuadrícula de 16 × 9.
export const GRID_COLS = 16;
export const GRID_ROWS = 9;

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

// Decorados que bloquean el paso (el resto: arbusto, puerta, puente y estandarte se pueden pisar).
const BLOCKING_PROPS = new Set(["arbol", "pino", "roca", "tronco", "barril", "caja", "cofre", "antorcha", "muro", "carro", "torre", "hoguera"]);
const BLOCKING_TERRAIN = new Set(["agua", "roca"]);

class Builder {
  constructor(seed) {
    this.rng = rngFrom(seed);
    this.terrain = new Map(); // "x,y" -> { x, y, kind, lvl? }
    this.props = new Map(); // "x,y" -> lista de decorados (de abajo arriba)
    this.pois = [];
  }
  inside(x, y) {
    return x >= 0 && y >= 0 && x < GRID_COLS && y < GRID_ROWS;
  }
  ter(kind, x, y, lvl) {
    if (!this.inside(x, y)) return;
    this.terrain.set(x + "," + y, { x, y, kind, ...(lvl > 1 ? { lvl } : {}) });
  }
  terRect(kind, x, y, w, h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.ter(kind, i, j);
  }
  prop(kind, x, y, rot) {
    if (!this.inside(x, y)) return;
    const k = x + "," + y;
    const list = this.props.get(k) || [];
    list.push({ kind, x, y, ...(rot ? { rot } : {}) });
    this.props.set(k, list);
  }
  clear(x, y) {
    this.props.delete(x + "," + y);
  }
  free(x, y) {
    return this.inside(x, y) && !this.props.has(x + "," + y) && !BLOCKING_TERRAIN.has(this.terrain.get(x + "," + y)?.kind);
  }
  // Casa: bloque de muros con una puerta al frente.
  house(x, y, w, doorX, doorY, label) {
    for (let i = x; i < x + w; i++) this.prop("muro", i, y);
    this.clear(doorX, doorY);
    this.prop("puerta", doorX, doorY);
    if (label) this.pois.push({ label, x: doorX, y: doorY < 4 ? doorY + 1 : doorY - 1 });
  }
  // Árboles repartidos al azar por las casillas libres que no estén en la lista "keep".
  scatter(kinds, chance, keep = () => false) {
    for (let y = 0; y < GRID_ROWS; y++)
      for (let x = 0; x < GRID_COLS; x++) {
        if (!this.free(x, y) || keep(x, y) || this.terrain.get(x + "," + y)?.kind === "camino") continue;
        if (this.rng() < chance) this.prop(kinds[Math.floor(this.rng() * kinds.length)], x, y);
      }
  }
  build(spawn) {
    const props = [];
    this.props.forEach((list) => list.forEach((p) => props.push(p)));
    return { terrain: [...this.terrain.values()], props, pois: this.pois, spawn };
  }
}

const SHOPS = {
  capital: ["Palacio real", "Cuartel", "Templo", "Mercado", "Posada", "Herrería", "Gremio de magos", "Archivos"],
  city: ["Ayuntamiento", "Gremio", "Templo", "Mercado", "Posada", "Herrería", "Biblioteca", "Cuartel"],
  town: ["Posada", "Herrería", "Herbolario", "Granero", "Casa del alcalde", "Capilla", "Establo"],
  port: ["Taberna del puerto", "Capitanía", "Almacén", "Astillero"],
};

function settlement(type, b) {
  const walled = type === "capital" || type === "city";
  const port = type === "port";
  const names = SHOPS[type];
  // Calles.
  for (let x = 0; x < GRID_COLS; x++) b.ter("camino", x, 4);
  for (let y = 0; y < GRID_ROWS; y++) b.ter("camino", 7, y);
  b.terRect("camino", 6, 3, 3, 3);

  // Casas arriba (puerta hacia la calle) y abajo.
  const top = [[1, 3], [4, 2], [9, 3], [12, 3]];
  const bottom = port ? [] : [[1, 2], [3, 3], [9, 2], [11, 4]];
  top.forEach(([x, w], i) => b.house(x, 2, w, x + Math.floor(w / 2), 2, names[i]));
  bottom.forEach(([x, w], i) => b.house(x, 6, w, x + Math.floor(w / 2), 6, names[4 + i]));
  // Torres de vigía sobre algunas casas y detalles en las calles.
  b.prop("torre", 1, 2); if (!port) b.prop("torre", 14, 6);
  b.prop("barril", 3, 3); b.prop("caja", 11, 3); b.prop("arbusto", 5, 3);

  // Plaza: puestos de mercado y estandartes.
  b.prop("estandarte", 6, 3);
  b.prop("estandarte", 8, 3);
  b.prop("caja", 6, 5);
  b.prop("barril", 8, 5);
  b.prop("carro", 3, 4, 1);
  b.pois.push({ label: "Plaza", x: 7, y: 4 });

  if (walled) {
    for (let x = 0; x < GRID_COLS; x++) {
      b.clear(x, 0); b.clear(x, GRID_ROWS - 1);
      b.prop("muro", x, 0); b.prop("muro", x, GRID_ROWS - 1);
    }
    for (let y = 1; y < GRID_ROWS - 1; y++) { b.clear(0, y); b.clear(GRID_COLS - 1, y); b.prop("muro", 0, y); b.prop("muro", GRID_COLS - 1, y); }
    for (const [x, y] of [[0, 0], [GRID_COLS - 1, 0], [0, GRID_ROWS - 1], [GRID_COLS - 1, GRID_ROWS - 1]]) { b.clear(x, y); b.prop("torre", x, y); }
    for (const [x, y, rot] of [[7, 0, 0], [7, GRID_ROWS - 1, 0], [0, 4, 1], [GRID_COLS - 1, 4, 1]]) { b.clear(x, y); b.prop("puerta", x, y, rot); }
    if (type === "capital") {
      b.prop("estandarte", 5, 4); b.prop("estandarte", 9, 4);
      b.prop("antorcha", 6, 6); b.prop("antorcha", 8, 6);
    }
    b.scatter(["arbusto", "arbol"], 0.3, (x, y) => !(y === 1 || y === 7) || x < 1 || x > 14);
  }

  if (port) {
    b.terRect("agua", 0, 6, GRID_COLS, 3);
    for (let y = 5; y < GRID_ROWS; y++) { b.ter("camino", 7, y); }
    b.prop("puente", 7, 6); b.prop("puente", 7, 7);
    b.prop("barril", 6, 5); b.prop("caja", 8, 5); b.prop("cofre", 9, 5);
    b.prop("antorcha", 6, 6);
    b.pois.push({ label: "Muelles", x: 7, y: 7 });
    b.scatter(["arbol", "pino", "arbusto"], 0.3, (x, y) => y >= 2);
    return b.build({ x: 7, y: 5 });
  }
  if (!walled) b.scatter(["arbol", "pino", "arbusto"], 0.35, (x, y) => (y >= 2 && y <= 6) || x === 7);
  return b.build({ x: 7, y: GRID_ROWS - (walled ? 2 : 1) });
}

function wilds(place, b) {
  const swamp = /pantano/i.test(place.name);
  // Camino sinuoso desde el sur hasta el claro.
  const path = new Set();
  let x = 7;
  for (let y = GRID_ROWS - 1; y >= 3; y--) {
    path.add(x + "," + y);
    if (y > 3 && b.rng() < 0.5) { x = Math.max(3, Math.min(12, x + (b.rng() < 0.5 ? -1 : 1))); path.add(x + "," + y); }
  }
  const clearing = (cx, cy) => Math.abs(cx - 7) <= 2 && cy >= 1 && cy <= 3;
  if (swamp) {
    for (let y = 0; y < GRID_ROWS; y++) for (let cx = 0; cx < GRID_COLS; cx++) if (b.rng() < 0.28 && !path.has(cx + "," + y) && !clearing(cx, y)) b.ter("agua", cx, y);
  }
  path.forEach((k) => { const [px, py] = k.split(",").map(Number); b.ter("camino", px, py); });
  for (let cx = 5; cx <= 9; cx++) for (let cy = 1; cy <= 3; cy++) { if (swamp) b.ter("hierba", cx, cy); b.ter("camino", cx, cy); }
  b.prop("hoguera", 7, 2);
  b.prop("tronco", 5, 2, 1); b.prop("tronco", 9, 2, 1);
  if (swamp) b.prop("cofre", 8, 1);
  b.scatter(swamp ? ["arbol", "arbusto", "tronco"] : ["arbol", "pino", "arbusto"], swamp ? 0.18 : 0.5, (cx, cy) => path.has(cx + "," + cy) || clearing(cx, cy));
  b.pois.push({ label: swamp ? "Isla seca" : "Claro", x: 7, y: 3 });
  b.pois.push({ label: "Entrada", x, y: GRID_ROWS - 1 });
  return b.build({ x: 7, y: GRID_ROWS - 1 });
}

function ruins(place, b) {
  const sunk = /sumergido/i.test(place.name);
  const tower = /torre/i.test(place.name);
  if (sunk) {
    b.terRect("agua", 0, 0, GRID_COLS, GRID_ROWS);
    b.terRect("camino", 4, 2, 8, 5);
    for (let y = 7; y < GRID_ROWS; y++) { b.ter("camino", 7, y); b.prop("puente", 7, y); }
    for (const [x, y] of [[4, 2], [11, 2], [4, 6], [11, 6]]) b.prop("torre", x, y);
    for (const x of [6, 9]) { b.prop("muro", x, 3); b.prop("muro", x, 5); }
    b.prop("cofre", 7, 3); b.prop("antorcha", 6, 4); b.prop("antorcha", 9, 4); b.prop("roca", 5, 3); b.prop("roca", 10, 5);
    b.pois.push({ label: "Altar sumergido", x: 7, y: 4 });
    return b.build({ x: 7, y: GRID_ROWS - 1 });
  }
  b.terRect("camino", 0, 0, GRID_COLS, GRID_ROWS);
  for (let x = 0; x < GRID_COLS; x++) { b.prop("muro", x, 0); b.prop("muro", x, GRID_ROWS - 1); }
  for (let y = 1; y < GRID_ROWS - 1; y++) { b.prop("muro", 0, y); b.prop("muro", GRID_COLS - 1, y); }
  b.clear(7, GRID_ROWS - 1); b.prop("puerta", 7, GRID_ROWS - 1);
  // Muros interiores con pasos: tres cámaras.
  for (const y of [1, 2, 4]) { b.prop("muro", 5, y); b.prop("muro", 10, y); }
  for (const x of [3, 4, 11, 12]) b.prop("muro", x, 5);
  for (const [x, y] of [[0, 0], [15, 0], [0, 8], [15, 8]]) { b.clear(x, y); b.prop("torre", x, y); }
  b.prop("antorcha", 4, 1); b.prop("antorcha", 11, 1); b.prop("antorcha", 6, 6); b.prop("antorcha", 9, 6);
  b.prop("cofre", 13, 2); b.prop("cofre", 2, 2);
  b.prop("barril", 7, 2); b.prop("caja", 8, 2); b.prop("caja", 3, 7); b.prop("barril", 12, 7);
  b.prop("roca", 2, 6); b.prop("roca", 13, 6); b.prop("roca", 8, 1);
  if (tower) { b.prop("torre", 7, 1); b.prop("hoguera", 8, 4); b.prop("hoguera", 6, 4); }
  b.pois.push({ label: "Cámara central", x: 7, y: 3 }, { label: "Tesoro", x: 12, y: 2 }, { label: "Entrada", x: 7, y: 7 });
  return b.build({ x: 7, y: GRID_ROWS - 2 });
}

function peak(place, b) {
  // Ladera: más alta cuanto más al norte.
  for (let y = 0; y < GRID_ROWS; y++)
    for (let x = 0; x < GRID_COLS; x++) {
      const h = (GRID_ROWS - y) / GRID_ROWS + (b.rng() - 0.5) * 0.35;
      if (h > 0.78) b.ter("roca", x, y);
      else if (h > 0.5) b.ter("alto", x, y);
      else if (h > 0.3) b.ter("colina", x, y);
    }
  // Sendero en zigzag hasta la cima.
  let x = 7;
  for (let y = GRID_ROWS - 1; y >= 0; y--) {
    b.ter("camino", x, y);
    if (y % 2 === 0) { x = Math.max(2, Math.min(13, x + (b.rng() < 0.5 ? -1 : 1))); b.ter("camino", x, y); }
  }
  b.scatter(["pino", "roca", "arbusto"], 0.22, (cx, cy) => cy < 3 || b.terrain.get(cx + "," + cy)?.kind === "camino");
  b.prop("hoguera", 6, 7); b.prop("tronco", 5, 7, 1);
  b.prop("estandarte", x, 0);
  b.pois.push({ label: "Campamento base", x: 7, y: 7 }, { label: "Cima", x, y: 0 });
  return b.build({ x: 7, y: GRID_ROWS - 1 });
}

function camp(place, b) {
  // Empalizada de troncos con una entrada al sur.
  for (let x = 3; x <= 12; x++) { b.prop("tronco", x, 1); if (x !== 7 && x !== 8) b.prop("tronco", x, 7); }
  for (let y = 2; y <= 6; y++) { b.prop("tronco", 3, y, 1); b.prop("tronco", 12, y, 1); }
  b.terRect("camino", 4, 2, 8, 5);
  for (let y = 7; y < GRID_ROWS; y++) b.ter("camino", 7, y);
  b.prop("hoguera", 7, 4);
  b.prop("carro", 5, 3); b.prop("carro", 10, 3, 1); b.prop("caja", 5, 5); b.prop("barril", 10, 5);
  b.prop("estandarte", 7, 2); b.prop("antorcha", 6, 6); b.prop("antorcha", 9, 6);
  b.scatter(["pino", "arbol", "arbusto"], 0.4, (x, y) => x >= 2 && x <= 13 && y >= 0 && y <= 7);
  b.pois.push({ label: "Hoguera", x: 7, y: 5 }, { label: "Camino", x: 7, y: 8 });
  return b.build({ x: 7, y: GRID_ROWS - 1 });
}

// Devuelve { terrain, props (con id), pois, spawn } para una localización.
export function generatePlace(place) {
  const b = new Builder(place.id);
  let data;
  if (place.type === "wild") data = wilds(place, b);
  else if (place.type === "ruin") data = ruins(place, b);
  else if (place.type === "peak") data = peak(place, b);
  else if (place.type === "camp") data = camp(place, b);
  else data = settlement(place.type, b);
  // Garantiza que la casilla de entrada esté libre.
  const sk = data.spawn.x + "," + data.spawn.y;
  data.props = data.props.filter((p) => p.x + "," + p.y !== sk || !BLOCKING_PROPS.has(p.kind));
  data.terrain = data.terrain.filter((t) => !(t.x + "," + t.y === sk && BLOCKING_TERRAIN.has(t.kind)));
  data.props = data.props.map((p, i) => ({ id: `w-${place.id}-${i}`, ...p }));
  return data;
}

// ¿Se puede pisar esa casilla? Los puentes cruzan el agua.
export function isWalkable(layout, x, y) {
  if (x < 0 || y < 0 || x >= GRID_COLS || y >= GRID_ROWS) return false;
  const here = layout.props.filter((p) => p.x === x && p.y === y);
  if (here.some((p) => p.kind === "puente")) return true;
  if (here.some((p) => BLOCKING_PROPS.has(p.kind))) return false;
  const t = layout.terrain.find((q) => q.x === x && q.y === y);
  return !(t && BLOCKING_TERRAIN.has(t.kind));
}
