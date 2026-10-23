// Exporta el mapa de IsoWorldTest.jsx (alturas, colores, árboles, río) a JSON para reconstruirlo en Blender con exactamente la misma forma.
const fs = require("fs");
const src = fs.readFileSync("src/components/IsoWorldTest.jsx", "utf8").split("\r\n").join("\n");
const a = src.indexOf("const SIZE = 120;");
const b = src.indexOf("// ---------- utilidades de escena ----------");
const code = src.slice(a, b);
const lib = new Function(code + "; return { SIZE, HALF, LAKE, RIVER, PLOTS, FIELDS, hash, fbm, H, colorAt, fieldAt, riverInfo, clamp, lerp };")();
const { SIZE, HALF, LAKE, RIVER, PLOTS, H, colorAt, fieldAt, riverInfo, fbm, lerp } = lib;

const N = 201; // vértices por lado
const heights = new Array(N * N);
const colors = new Array(N * N * 3);
for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    const x = -HALF + (SIZE * i) / (N - 1), z = -HALF + (SIZE * j) / (N - 1);
    const h = H(x, z);
    const sl = Math.hypot(H(x + 0.4, z) - h, H(x, z + 0.4) - h) / 0.4;
    const c = colorAt(x, z, h, sl, true);
    const k = j * N + i;
    heights[k] = +h.toFixed(3);
    colors[k * 3] = +c[0].toFixed(3); colors[k * 3 + 1] = +c[1].toFixed(3); colors[k * 3 + 2] = +c[2].toFixed(3);
  }
}
// árboles (mismo generador que en la escena three.js)
const rnd = (() => { let s = 12345; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967295); })();
const spots = [];
for (let i = 0; i < 9000 && spots.length < 2400; i++) {
  const x = (rnd() - 0.5) * (SIZE - 4), z = (rnd() - 0.5) * (SIZE - 4);
  const h = H(x, z);
  if (h < 0.9 || h > 14) continue;
  const sl = Math.hypot(H(x + 0.8, z) - h, H(x, z + 0.8) - h) / 0.8;
  if (sl > 0.75) continue;
  const forest = fbm(x * 0.07 + 20, z * 0.07 + 8, 3);
  if (forest < 0.5 && rnd() > 0.1) continue;
  if (PLOTS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r * 0.95)) continue;
  if (fieldAt(x, z)) continue;
  if (riverInfo(x, z).d < 2.4) continue;
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 1.3) continue;
  spots.push([+x.toFixed(2), +h.toFixed(2), +z.toFixed(2), +(0.75 + rnd() * 0.8).toFixed(2), +forest.toFixed(2)]);
}
const pines = spots.filter((t) => t[4] > 0.5 || t[1] > 6);
const rounds = spots.filter((t) => !(t[4] > 0.5 || t[1] > 6));
// cinta del río
const pts = [];
for (let i = 0; i <= 90; i++) {
  const t = (i / 90) * (RIVER.length - 1);
  const k = Math.min(RIVER.length - 2, Math.floor(t));
  const f = t - k;
  const x = lerp(RIVER[k][0], RIVER[k + 1][0], f), z = lerp(RIVER[k][1], RIVER[k + 1][1], f);
  pts.push([+x.toFixed(2), +(riverInfo(x, z).bed + 0.28).toFixed(2), +z.toFixed(2)]);
}
fs.writeFileSync(process.argv[2] || "scripts/mapa-blender/mapdata.json", JSON.stringify({ N, SIZE, heights, colors, pines, rounds, river: pts, lake: LAKE, plots: PLOTS, hs: [H(4, -4), H(-36, 11), H(35, -26), H(52, 31), H(-4, -38.5)] }));
console.log("ok", pines.length, rounds.length, heights.length);
