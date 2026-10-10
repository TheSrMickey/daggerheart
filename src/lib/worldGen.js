import { cellsInRadius, hexPos, WORLD_RADIUS } from "@/lib/worldCatalog";

// Generador de mapas de mundo aleatorios: continentes e islas con costas, bosques, desiertos, colinas y montañas,
// ríos que cruzan la tierra de costa a costa, caminos entre los lugares con puentes sobre los ríos, lugares con nombre
// y una variante de estilo (verano, invierno u otoño). Rellena todo el campo disponible (el mar ocupa el resto).
// Direcciones en el sentido de las agujas del reloj: 0 E, 1 SE, 2 SW, 3 W, 4 NW, 5 NE.
const IDX = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

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

// Pieza de río o camino que une dos lados de una casilla (a = hacia la anterior, b = hacia la siguiente).
// Rectas: lados 3 y 0; curvas: lados 3 y 5 (con el giro de la pieza se orientan).
const shapeFor = (a, b) => {
  const dd = (b - a + 6) % 6;
  if (dd === 3) return { shape: "straight", rot: (a - 3 + 6) % 6 };
  if (dd === 2) return { shape: "corner", rot: (a - 3 + 6) % 6 };
  if (dd === 4) return { shape: "corner", rot: (b - 3 + 6) % 6 };
  return null;
};

export function generateWorld(seed = Math.floor(Math.random() * 1e9)) {
  const rand = mulberry32(seed);
  const eN = makeNoise(seed + 1), mN = makeNoise(seed + 7), cN = makeNoise(seed + 13);
  const R = WORLD_RADIUS;
  const cells = cellsInRadius(R);
  const grid = {};
  const kk = (c) => c.q + "," + c.r;
  const at = (q, r) => grid[q + "," + r];
  const nb = (c, d) => at(c.q + IDX[d][0], c.r + IDX[d][1]);
  const hexD = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
  const hexDist = (a, b) => Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.q + a.r - b.q - b.r));
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
    const e = eN(x * 0.33 + 5, z * 0.33 + 5) * 0.5 + land * 0.98 - edge * 0.34;
    const m = mN(x * 0.27 + 40, z * 0.27 + 40);
    grid[q + "," + r] = { q, r, x, z, e, m, t: "water", d: undefined, n: undefined };
  }
  const SEA = 0.36;
  const isLand = (c) => !!c && c.e >= SEA;
  const coastal = (c) => IDX.some((_, d) => { const o = nb(c, d); return o && !isLand(o); });
  for (const c of Object.values(grid)) {
    if (c.e < SEA) {
      const k = rand();
      c.t = c.e > SEA - 0.05 && k < 0.14 ? "water-rocks" : c.e > SEA - 0.025 && k > 0.93 ? "water-island" : "water";
      continue;
    }
    const el = c.e - SEA;
    if (coastal(c) && el < 0.07) c.t = rand() < 0.12 ? "sand-rocks" : "sand";
    else if (el > 0.7) c.t = "stone-mountain";
    else if (el > 0.58) c.t = c.m < 0.55 ? "stone-hill" : rand() < 0.5 ? "stone-rocks" : "stone-hill";
    else if (el > 0.44) c.t = c.m < 0.3 ? "stone-hill" : "grass-hill";
    else if (c.m < 0.28 && cN(c.x * 0.4, c.z * 0.4) > 0.45) c.t = rand() < 0.35 ? "sand-rocks" : "sand-desert";
    else if (c.m < 0.34) c.t = "sand";
    else if (c.m > 0.58) c.t = rand() < 0.1 ? "dirt-lumber" : "grass-forest";
    else c.t = rand() < 0.08 ? "dirt" : "grass";
    if (c.t === "grass" && rand() < 0.16) c.d = "unit-tree";
  }
  const jit = new Map(Object.values(grid).map((c) => [kk(c), 1 + rand() * 0.9]));

  // Búsqueda del camino más barato entre casillas con rumbo: en cada paso se puede seguir recto o girar 60°.
  // `bridgeOk(n, d)` permite saltar una casilla (un puente) cuando la siguiente casilla es un río cruzable.
  function search(starts, passable, goal, bridgeOk, costOf) {
    const meta = new Map();
    const open = [];
    const key = (c, f) => kk(c) + "," + f;
    for (const s of starts) {
      const k = key(s.c, s.f);
      meta.set(k, { c: s.c, f: s.f, g: 0, pk: null, via: null });
      open.push(k);
    }
    const done = new Set();
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (meta.get(open[i]).g < meta.get(open[bi]).g) bi = i;
      const k = open.splice(bi, 1)[0];
      if (done.has(k)) continue;
      done.add(k);
      const cur = meta.get(k);
      const end = goal(cur.c, cur.f);
      if (end !== null && end !== undefined) {
        const steps = [];
        for (let p = k; p; p = meta.get(p).pk) steps.unshift(meta.get(p));
        // Un camino que pasara dos veces por la misma casilla se descarta.
        if (new Set(steps.map((st) => kk(st.c))).size !== steps.length) return null;
        return { steps, endDir: end };
      }
      for (const d of [cur.f, (cur.f + 1) % 6, (cur.f + 5) % 6]) {
        let n = nb(cur.c, d);
        if (!n) continue;
        let via = null;
        if (bridgeOk && bridgeOk(n, d)) {
          via = n;
          n = nb(n, d);
          if (!n) continue;
        }
        if (!passable(n)) continue;
        const g = cur.g + (costOf ? costOf(n) : (jit.get(kk(n)) ?? 1)) + (d !== cur.f ? 0.25 : 0) + (via ? 1.2 : 0);
        const nk = key(n, d);
        if (!meta.has(nk) || g < meta.get(nk).g) {
          meta.set(nk, { c: n, f: d, g, pk: k, via });
          open.push(nk);
        }
      }
    }
    return null;
  }

  const riverCells = new Set();
  const roadCells = new Set();
  const placeCell = (c) => c.t.startsWith("building-");
  const setRiver = (c, a, b) => {
    const p = shapeFor(a, b);
    if (!p) return false;
    c.t = "river-" + p.shape;
    c.rot = p.rot;
    c.d = undefined;
    c.n = undefined;
    riverCells.add(kk(c));
    return true;
  };

  // Ríos que cruzan la tierra de una costa a otra.
  const wantCross = 1 + (rand() < 0.75 ? 1 : 0) + (rand() < 0.3 ? 1 : 0);
  let crossed = 0;
  const coastLand = Object.values(grid).filter((c) => isLand(c) && coastal(c));
  for (let tries = 0; tries < 40 && crossed < wantCross && coastLand.length; tries++) {
    const s0 = coastLand[Math.floor(rand() * coastLand.length)];
    if (riverCells.has(kk(s0))) continue;
    const seaDirs = [0, 1, 2, 3, 4, 5].filter((d) => { const n = nb(s0, (d + 3) % 6); return n && !isLand(n); });
    if (!seaDirs.length) continue;
    const d0 = seaDirs[Math.floor(rand() * seaDirs.length)];
    const res = search(
      [{ c: s0, f: d0 }],
      (c) => isLand(c) && !riverCells.has(kk(c)),
      (c, f) => {
        if (hexDist(c, s0) < 6) return null;
        for (const d of [f, (f + 1) % 6, (f + 5) % 6]) { const n = nb(c, d); if (n && !isLand(n)) return d; }
        return null;
      },
    );
    if (!res || res.steps.length < 6) continue;
    const last = res.steps.length - 1;
    const ok = res.steps.every((st, i) => !!shapeFor((st.f + 3) % 6, i < last ? res.steps[i + 1].f : res.endDir));
    if (!ok) continue;
    res.steps.forEach((st, i) => setRiver(st.c, (st.f + 3) % 6, i < last ? res.steps[i + 1].f : res.endDir));
    crossed++;
  }

  // Ríos más pequeños: nacen en las zonas altas y bajan hasta el mar.
  const sources = Object.values(grid).filter((c) => isLand(c) && c.e - SEA > 0.3 && !coastal(c));
  const want = 1 + Math.floor(rand() * 3);
  let made = 0;
  for (let tries = 0; tries < 60 && made < want && sources.length; tries++) {
    const start = sources[Math.floor(rand() * sources.length)];
    if (riverCells.has(kk(start))) continue;
    const path = [start], dirs = [];
    let cur = start, f = null, seaReached = false;
    for (let step = 0; step < 24; step++) {
      const choices = f === null ? [0, 1, 2, 3, 4, 5] : [f, (f + 1) % 6, (f + 5) % 6];
      const opts = choices.map((d) => ({ d, c: nb(cur, d) })).filter((o) => o.c && !riverCells.has(kk(o.c)) && !path.includes(o.c));
      if (!opts.length) break;
      opts.sort((x, y) => x.c.e - y.c.e + (rand() - 0.5) * 0.04);
      const o = opts[0];
      if (o.c.e > cur.e + 0.04) break;
      dirs.push(o.d);
      path.push(o.c);
      f = o.d;
      cur = o.c;
      if (!isLand(o.c)) { seaReached = true; break; }
    }
    if (!seaReached || path.length < 5) continue;
    for (let i = 0; i < path.length - 1; i++) {
      const c = path[i];
      if (i === 0) {
        c.t = "river-start";
        c.rot = (dirs[0] - 3 + 6) % 6;
        c.d = undefined;
        c.n = undefined;
        riverCells.add(kk(c));
      } else setRiver(c, (dirs[i - 1] + 3) % 6, dirs[i]);
    }
    made++;
  }

  // Lugares: se reparten por la tierra con una distancia mínima entre sí.
  const placed = [];
  const far = (c, min) => placed.every((p) => hexDist(c, p) >= min);
  const pick = (test, min = 3) => {
    const list = Object.values(grid).filter((c) => !riverCells.has(kk(c)) && test(c) && far(c, min));
    return list.length ? list[Math.floor(rand() * list.length)] : null;
  };
  const put = (c, t, label) => {
    if (!c) return;
    c.t = t;
    c.rot = Math.floor(rand() * 6);
    c.d = undefined;
    c.n = label;
    placed.push(c);
  };
  const flat = (c) => ["grass", "dirt", "grass-forest"].includes(c.t);
  put(pick((c) => flat(c) && !coastal(c), 4), "building-castle", "Castillo de " + name(rand));
  put(pick((c) => flat(c) && !coastal(c), 4), "building-village", "Aldea " + name(rand));
  put(pick((c) => flat(c) && !coastal(c), 4), "building-village", "Aldea " + name(rand));
  put(pick((c) => flat(c), 3), "building-house", name(rand));
  put(pick((c) => coastal(c) && isLand(c), 4), "building-port", "Puerto " + name(rand));
  put(pick((c) => coastal(c) && isLand(c), 4), "building-port", "Puerto " + name(rand));
  put(pick((c) => c.t === "stone-mountain" || c.t === "stone-hill", 3), "building-mine", "Mina " + name(rand));
  put(pick((c) => c.t === "stone-hill" || c.t === "grass-hill", 3), "building-wizard-tower", "Torre de " + name(rand));
  put(pick((c) => flat(c), 3), "building-farm", "Granja " + name(rand));
  put(pick((c) => c.t === "grass-forest" || c.t === "grass", 3), "building-cabin", "Cabaña de " + name(rand));
  put(pick((c) => c.t === "sand-desert" || c.t === "sand-rocks", 3), "building-tower", "Atalaya de " + name(rand));

  // Caminos entre los lugares (cada uno se une al más cercano ya conectado). Sobre un río recto se coloca un puente.
  // Los caminos prefieren terreno llano; si cruzan bosque, colinas o desierto, la casilla se allana.
  const ROADABLE = new Set(["grass", "dirt", "sand", "stone"]);
  const roadPass = (c) => isLand(c) && !riverCells.has(kk(c)) && !roadCells.has(kk(c)) && c.t !== "stone-mountain" && !placeCell(c);
  const roadCost = (c) => (jit.get(kk(c)) ?? 1) + (ROADABLE.has(c.t) ? 0 : 1.6);
  const bridgeOk = (n, d) => riverCells.has(kk(n)) && n.t === "river-straight" && (d === (1 + n.rot) % 6 || d === (4 + n.rot) % 6);
  // Construye un camino entre dos lugares (con puentes sobre los ríos rectos). Devuelve si se pudo.
  const buildRoad = (A, B) => {
    const starts = [];
    for (let d0 = 0; d0 < 6; d0++) { const n = nb(A, d0); if (n && roadPass(n)) starts.push({ c: n, f: d0 }); }
    const res = starts.length
      ? search(starts, roadPass, (c, f) => { for (const d of [f, (f + 1) % 6, (f + 5) % 6]) if (nb(c, d) === B) return d; return null; }, bridgeOk, roadCost)
      : null;
    if (!res) return false;
    const last = res.steps.length - 1;
    res.steps.forEach((st, i) => {
      const p = shapeFor((st.f + 3) % 6, i < last ? res.steps[i + 1].f : res.endDir);
      if (!p) return;
      if (!ROADABLE.has(st.c.t)) st.c.t = st.c.t.startsWith("sand") ? "sand" : "grass";
      st.c.d = "path-" + p.shape;
      st.c.dr = p.rot;
      st.c.n = undefined;
      roadCells.add(kk(st.c));
      if (st.via) {
        st.via.t = "bridge";
        st.via.d = undefined;
        roadCells.add(kk(st.via));
      }
    });
    return true;
  };
  // Para que haya al menos un puente: dos lugares a cada lado de un tramo recto de río, unidos por un camino.
  let linked = [];
  const spots = [...riverCells].map((k) => grid[k]).filter((n) => n.t === "river-straight").sort(() => rand() - 0.5);
  for (const n of spots) {
    const d1 = (1 + n.rot) % 6, d2 = (4 + n.rot) % 6;
    const p = nb(n, d1), q = nb(n, d2);
    if (!p || !q || !roadPass(p) || !roadPass(q)) continue;
    const p2 = nb(p, d1), q2 = nb(q, d2);
    if (!p2 || !q2 || !roadPass(p2) || !roadPass(q2) || !far(p2, 2) || !far(q2, 2)) continue;
    put(p2, "building-village", "Aldea " + name(rand));
    put(q2, "building-market", "Mercado de " + name(rand));
    if (buildRoad(p2, q2)) linked = [p2, q2];
    break;
  }
  const sites = placed.filter((c) => placeCell(c) && c.t !== "building-mine" && c.t !== "building-wizard-tower" && !linked.includes(c));
  if (!linked.length && sites.length) linked.push(sites.shift());
  const rest = sites;
  let roads = 0;
  while (rest.length && roads < 9) {
    let best = null;
    for (const a of linked) for (const b of rest) { const dd = hexDist(a, b); if (!best || dd < best.dd) best = { a, b, dd }; }
    rest.splice(rest.indexOf(best.b), 1);
    linked.push(best.b);
    if (buildRoad(best.a, best.b)) roads++;
  }

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
  const k = rand();
  const theme = k < 0.5 ? "verano" : k < 0.75 ? "invierno" : "otono";
  const home = placed.find((c) => c.t === "building-village") || placed.find((c) => placeCell(c)) || Object.values(grid).find((c) => isLand(c));
  return { tiles, theme, party: home ? { q: home.q, r: home.r } : null };
}
