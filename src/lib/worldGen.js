import { cellsInRadius, hexPos, WORLD_RADIUS } from "@/lib/worldCatalog";

// Generador de mapas de mundo aleatorios: continentes e islas con costas, bosques, desiertos, colinas y montañas,
// más lugares con nombre repartidos por la tierra. Rellena todo el campo disponible (el mar ocupa el resto).
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Ruido de valores suave (con la semilla) y su suma por capas.
function makeNoise(seed) {
  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  const value = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = smooth(x - xi), fy = smooth(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y) => {
    let amp = 1, f = 1, sum = 0, norm = 0;
    for (let o = 0; o < 4; o++) {
      sum += value(x * f, y * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  };
}

const PRE = ["Alba", "Bran", "Cael", "Dun", "Elm", "Fen", "Gar", "Hal", "Iron", "Kel", "Lor", "Mar", "Nor", "Oak", "Pyr", "Rav", "Sol", "Thorn", "Umb", "Vel", "Wyn", "Zar"];
const SUF = ["wick", "mere", "holm", "ford", "stead", "haven", "ridge", "fall", "vale", "mont", "gard", "moor", "rest", "peak"];
const name = (rand) => PRE[Math.floor(rand() * PRE.length)] + SUF[Math.floor(rand() * SUF.length)];

export function generateWorld(seed = Math.floor(Math.random() * 1e9)) {
  const rand = mulberry32(seed);
  const eN = makeNoise(seed + 1), mN = makeNoise(seed + 7), cN = makeNoise(seed + 13);
  const R = WORLD_RADIUS;
  const cells = cellsInRadius(R);
  const grid = {};
  const at = (q, r) => grid[q + "," + r];
  const hexD = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
  // Varios centros de tierra para que salgan continentes e islas y no un único círculo.
  const centers = Array.from({ length: 3 + Math.floor(rand() * 3) }, () => {
    const a = rand() * Math.PI * 2, rad = rand() * R * 0.62;
    return { x: Math.cos(a) * rad, z: Math.sin(a) * rad * 0.9, s: 3.2 + rand() * 3.4 };
  });
  for (const [q, r] of cells) {
    const [x, z] = hexPos(q, r);
    let land = 0;
    for (const c of centers) land = Math.max(land, Math.max(0, 1 - Math.hypot(x - c.x, z - c.z) / c.s));
    const edge = Math.pow(hexD(q, r) / R, 2.4);
    const e = eN(x * 0.33 + 5, z * 0.33 + 5) * 0.5 + land * 0.62 - edge * 0.42;
    const m = mN(x * 0.27 + 40, z * 0.27 + 40);
    grid[q + "," + r] = { q, r, x, z, e, m, t: "water", d: undefined, n: undefined };
  }
  const SEA = 0.36;
  const isLand = (c) => c && c.e >= SEA;
  for (const c of Object.values(grid)) {
    if (c.e < SEA) {
      const k = rand();
      c.t = c.e > SEA - 0.05 && k < 0.14 ? "water-rocks" : c.e > SEA - 0.025 && k > 0.93 ? "water-island" : "water";
      continue;
    }
    const coast = DIRS.some(([dq, dr]) => { const o = at(c.q + dq, c.r + dr); return o && !isLand(o); });
    const el = c.e - SEA;
    if (coast && el < 0.07) c.t = rand() < 0.12 ? "sand-rocks" : "sand";
    else if (el > 0.5) c.t = "stone-mountain";
    else if (el > 0.4) c.t = c.m < 0.55 ? "stone-hill" : rand() < 0.5 ? "stone-rocks" : "stone-hill";
    else if (el > 0.3) c.t = c.m < 0.3 ? "stone-hill" : "grass-hill";
    else if (c.m < 0.28 && cN(c.x * 0.4, c.z * 0.4) > 0.45) c.t = rand() < 0.35 ? "sand-rocks" : "sand-desert";
    else if (c.m < 0.34) c.t = "sand";
    else if (c.m > 0.58) c.t = rand() < 0.1 ? "dirt-lumber" : "grass-forest";
    else c.t = rand() < 0.08 ? "dirt" : "grass";
    if (c.t === "grass" && rand() < 0.16) c.d = "unit-tree";
  }

  // Ríos: nacen en las zonas altas y bajan por el terreno hasta el mar. Las piezas del kit unen casillas vecinas:
  // recta (W–E), curva (W–NE) y nacimiento (solo W). Con el giro de la pieza se orientan hacia cada vecina.
  // Direcciones en el sentido de las agujas del reloj: E, SE, SW, W, NW, NE.
  const IDX = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  const used = new Set();
  const coastal = (c) => DIRS.some(([dq, dr]) => { const o = at(c.q + dq, c.r + dr); return o && !isLand(o); });
  const sources = Object.values(grid).filter((c) => isLand(c) && c.e - SEA > 0.26 && !coastal(c));
  const want = 2 + Math.floor(rand() * 3);
  let made = 0;
  for (let tries = 0; tries < 60 && made < want && sources.length; tries++) {
    const start = sources[Math.floor(rand() * sources.length)];
    if (used.has(start.q + "," + start.r)) continue;
    const path = [start], dirs = [];
    let cur = start, f = null, sea = false;
    for (let step = 0; step < 24; step++) {
      const choices = f === null ? [0, 1, 2, 3, 4, 5] : [f, (f + 1) % 6, (f + 5) % 6];
      const opts = choices
        .map((d) => ({ d, c: at(cur.q + IDX[d][0], cur.r + IDX[d][1]) }))
        .filter((o) => o.c && !used.has(o.c.q + "," + o.c.r) && !path.includes(o.c));
      if (!opts.length) break;
      opts.sort((x, y) => x.c.e - y.c.e + (rand() - 0.5) * 0.04);
      const o = opts[0];
      if (o.c.e > cur.e + 0.04) break;
      dirs.push(o.d);
      path.push(o.c);
      f = o.d;
      cur = o.c;
      if (!isLand(o.c)) { sea = true; break; }
    }
    if (!sea || path.length < 5) continue;
    for (let i = 0; i < path.length - 1; i++) {
      const c = path[i];
      c.d = undefined;
      c.n = undefined;
      if (i === 0) {
        c.t = "river-start";
        c.rot = (dirs[0] - 3 + 6) % 6;
      } else {
        const aa = (dirs[i - 1] + 3) % 6, bb = dirs[i], dd = (bb - aa + 6) % 6;
        if (dd === 3) { c.t = "river-straight"; c.rot = (aa - 3 + 6) % 6; }
        else if (dd === 2) { c.t = "river-corner"; c.rot = (aa - 3 + 6) % 6; }
        else { c.t = "river-corner"; c.rot = (bb - 3 + 6) % 6; }
      }
      used.add(c.q + "," + c.r);
    }
    made++;
  }

  // Lugares: se reparten por la tierra con una distancia mínima entre sí.
  const placed = [];
  const far = (c, min) => placed.every((p) => hexDist(c, p) >= min);
  const hexDist = (a, b) => Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.q + a.r - b.q - b.r));
  const pick = (test, min = 3) => {
    const list = Object.values(grid).filter((c) => !used.has(c.q + "," + c.r) && test(c) && far(c, min));
    return list.length ? list[Math.floor(rand() * list.length)] : null;
  };
  const put = (c, t, label, keepDetail = false) => {
    if (!c) return;
    c.t = t;
    c.rot = Math.floor(rand() * 6);
    if (!keepDetail) c.d = undefined;
    c.n = label;
    placed.push(c);
  };
  const nearWater = (c) => DIRS.some(([dq, dr]) => { const o = at(c.q + dq, c.r + dr); return o && !isLand(o); });
  const flat = (c) => ["grass", "dirt", "grass-forest"].includes(c.t);
  put(pick((c) => flat(c) && !nearWater(c), 4), "building-castle", "Castillo de " + name(rand));
  put(pick((c) => flat(c) && !nearWater(c), 4), "building-village", "Aldea " + name(rand));
  put(pick((c) => flat(c) && !nearWater(c), 4), "building-village", "Aldea " + name(rand));
  put(pick((c) => flat(c), 3), "building-house", name(rand));
  put(pick((c) => nearWater(c) && isLand(c), 4), "building-port", "Puerto " + name(rand));
  put(pick((c) => nearWater(c) && isLand(c), 4), "building-port", "Puerto " + name(rand));
  put(pick((c) => c.t === "stone-mountain" || c.t === "stone-hill", 3), "building-mine", "Mina " + name(rand));
  put(pick((c) => c.t === "stone-hill" || c.t === "grass-hill", 3), "building-wizard-tower", "Torre de " + name(rand));
  put(pick((c) => flat(c), 3), "building-farm", "Granja " + name(rand));
  put(pick((c) => c.t === "grass-forest" || c.t === "grass", 3), "building-cabin", "Cabaña de " + name(rand));
  put(pick((c) => c.t === "sand-desert" || c.t === "sand-rocks", 3), "building-tower", "Atalaya de " + name(rand));

  // Algunos barcos en alta mar.
  const sea = Object.values(grid).filter((c) => c.t === "water" && c.e < SEA - 0.06 && far(c, 3));
  for (let i = 0; i < 4 && sea.length; i++) {
    const c = sea.splice(Math.floor(rand() * sea.length), 1)[0];
    if (!far(c, 3)) continue;
    c.d = rand() < 0.35 ? "unit-ship-large" : "unit-ship";
    c.dr = Math.floor(rand() * 6);
    placed.push(c);
  }

  const tiles = {};
  for (const c of Object.values(grid)) {
    const t = { t: c.t, r: c.rot ?? Math.floor(rand() * 6) };
    if (c.d) {
      t.d = c.d;
      t.dr = c.dr ?? Math.floor(rand() * 6);
    }
    if (c.n) t.n = c.n;
    tiles[c.q + "," + c.r] = t;
  }
  return tiles;
}
