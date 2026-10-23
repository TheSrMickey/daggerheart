"use client";

import { useEffect, useRef, useState } from "react";

// PRUEBA TEMPORAL · mapa de mundo isométrico con dos estilos:
//  - «Pixel»: propuesta propia, escena 3D dibujada a baja resolución y ampliada sin suavizar, caras planas y paleta corta.
//  - «Pintado»: imita una vista aérea fantástica pintada (montañas nevadas, río, lago, aldea, castillo, puerto y niebla).
// Para quitarla: borrar este archivo y src/app/prueba-mapa (y la línea de /prueba-mapa en src/lib/supabase/proxy.ts).

const SIZE = 120; // el mapa mide SIZE × SIZE unidades, centrado en el origen
const HALF = SIZE / 2;
const LAKE = { x: -15, z: -17, r: 8.5, y: 3.4 };
const RIVER = [[-4, -39], [-9, -29], [-13, -23], [-15, -12], [-8, -4], [2, 1], [12, 6], [23, 11], [33, 15], [41, 19]];
const PLOTS = [
  { x: 4, z: -4, r: 8 }, // casa señorial
  { x: -36, z: 11, r: 7 }, // iglesia y aldea
  { x: 35, z: -26, r: 11 }, // castillo en ruinas
  { x: 33, z: 24, r: 9 }, // puerto
];
const FIELDS = [
  { x: -22, z: 6, w: 9, d: 6, rot: 0.3, c: [0.86, 0.72, 0.28] },
  { x: -28, z: 21, w: 10, d: 7, rot: -0.2, c: [0.45, 0.6, 0.22] },
  { x: -44, z: 24, w: 8, d: 6, rot: 0.1, c: [0.8, 0.66, 0.26] },
  { x: 14, z: 5, w: 10, d: 7, rot: 0.15, c: [0.85, 0.7, 0.27] },
  { x: 10, z: -16, w: 9, d: 6, rot: -0.35, c: [0.82, 0.68, 0.26] },
  { x: -8, z: 16, w: 8, d: 6, rot: 0.2, c: [0.5, 0.62, 0.24] },
];

// ---------- ruido ----------
const hash = (x, z) => {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const sm = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => sm(clamp((v - a) / (b - a), 0, 1));
const vnoise = (x, z) => {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  const u = sm(fx), v = sm(fz);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, z, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, z * f); f *= 2; a *= 0.5; } return s; };
const ridged = (x, z, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { const n = 1 - Math.abs(vnoise(x * f, z * f) * 2 - 1); s += a * n * n; f *= 2; a *= 0.5; } return s; };

// ---------- terreno ----------
const riverInfo = (x, z) => {
  // distancia al río y altura del cauce (baja del lago al mar)
  let best = 1e9, bt = 0, total = 0;
  const lens = [];
  for (let i = 0; i < RIVER.length - 1; i++) { const l = Math.hypot(RIVER[i + 1][0] - RIVER[i][0], RIVER[i + 1][1] - RIVER[i][1]); lens.push(l); total += l; }
  let acc = 0;
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [x1, z1] = RIVER[i], [x2, z2] = RIVER[i + 1];
    const dx = x2 - x1, dz = z2 - z1;
    const t = clamp(((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz), 0, 1);
    const d = Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));
    if (d < best) { best = d; bt = (acc + lens[i] * t) / total; }
    acc += lens[i];
  }
  return { d: best, bed: lerp(2.7, 0.15, Math.pow(bt, 0.8)) };
};
const rawH = (x, z) => {
  const u = x / HALF, v = z / HALF;
  const coast = 0.46 + 0.1 * Math.sin(v * 5 + 1) + (fbm(x * 0.05 + 9, z * 0.05 + 3, 4) - 0.5) * 0.32;
  const s = Math.max(u - coast, (u + v) * 0.55 - 0.42);
  let h;
  if (s > 0) h = Math.max(1.1 - s * 26, -7.5);
  else h = 1.1 + smooth(0, 0.3, -s) * 1.6;
  h += (fbm(x * 0.045, z * 0.045, 4) - 0.5) * 3.8 * smooth(-0.02, -0.25, s);
  const m = smooth(-0.1, -0.78, v);
  h += m * (ridged(x * 0.034 + 3, z * 0.034 + 1, 5) * 44 + 4) * smooth(0.05, -0.2, s);
  // colina del castillo y roca del faro
  h += 11 * Math.exp(-(((x - 35) ** 2 + (z + 26) ** 2) / 120));
  h += 8.5 * Math.exp(-(((x - 52) ** 2 + (z - 31) ** 2) / 14));
  h += 5 * Math.exp(-(((x + 48) ** 2 + (z - 36) ** 2) / 20)) * 0.6;
  // lago
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (dl < LAKE.r * 1.9) {
    h = Math.max(h, lerp(LAKE.y + 0.6, h, smooth(LAKE.r * 1.2, LAKE.r * 1.9, dl)) * smooth(LAKE.r * 1.9, LAKE.r * 1.05, dl) + h * (1 - smooth(LAKE.r * 1.9, LAKE.r * 1.05, dl)));
    h = lerp(h, LAKE.y - 1.7, smooth(LAKE.r * 1.0, LAKE.r * 0.55, dl));
  }
  // río
  const ri = riverInfo(x, z);
  const w = 1.9;
  if (ri.d < w * 2.6 && s < 0.05) h = lerp(h, Math.min(h, ri.bed + 0.1), smooth(w * 2.6, w * 0.8, ri.d));
  return h;
};
const PLOT_H = PLOTS.map((p) => rawH(p.x, p.z));
const H = (x, z) => {
  let h = rawH(x, z);
  for (let i = 0; i < PLOTS.length; i++) {
    const p = PLOTS[i];
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r * 1.7) h = lerp(h, PLOT_H[i], smooth(p.r * 1.7, p.r * 0.75, d));
  }
  return h;
};

const fieldAt = (x, z) => {
  for (const f of FIELDS) {
    const dx = x - f.x, dz = z - f.z;
    const c = Math.cos(f.rot), s = Math.sin(f.rot);
    const lx = dx * c + dz * s, lz = -dx * s + dz * c;
    if (Math.abs(lx) < f.w / 2 && Math.abs(lz) < f.d / 2) return { f, stripe: Math.floor((lz + f.d / 2) * 1.6) % 2 };
  }
  return null;
};
const colorAt = (x, z, h, slope, smoothMode) => {
  const n = fbm(x * 0.12, z * 0.12, 3);
  const n2 = fbm(x * 0.5 + 5, z * 0.5, 2);
  let c;
  const snowLine = 21 + (n - 0.5) * 6;
  if (h < -0.25) c = [0.76, 0.7, 0.5]; // fondo arenoso bajo el agua
  else if (h < 0.55) c = [0.9, 0.83, 0.6]; // arena
  else if (h > snowLine && slope < 1.9) c = [0.95, 0.97, 1.0]; // nieve
  else if (slope > 0.95 || h > 15) {
    const t = n2;
    c = [0.46 + t * 0.12, 0.43 + t * 0.1, 0.4 + t * 0.1]; // roca
    if (h > snowLine - 3 && slope < 1.5) c = [lerp(c[0], 0.95, 0.55), lerp(c[1], 0.97, 0.55), lerp(c[2], 1, 0.55)];
  } else {
    const dry = smooth(0.35, 0.7, n);
    c = [lerp(0.33, 0.52, dry) + n2 * 0.06, lerp(0.52, 0.55, dry) + n2 * 0.05, lerp(0.2, 0.2, dry)];
    const forest = smooth(0.5, 0.62, fbm(x * 0.07 + 20, z * 0.07 + 8, 3));
    if (forest > 0.01 && h < 15) c = [lerp(c[0], 0.18, forest * 0.55), lerp(c[1], 0.34, forest * 0.55), lerp(c[2], 0.16, forest * 0.55)];
    const ff = fieldAt(x, z);
    if (ff) c = ff.stripe ? ff.f.c : [ff.f.c[0] * 0.9, ff.f.c[1] * 0.9, ff.f.c[2] * 0.85];
    for (const p of PLOTS) if (Math.hypot(x - p.x, z - p.z) < p.r * 0.62) c = [lerp(c[0], 0.62, 0.55), lerp(c[1], 0.52, 0.55), lerp(c[2], 0.34, 0.55)];
    const ri = riverInfo(x, z);
    if (ri.d < 3.2 && h < 4) c = [lerp(c[0], 0.74, 0.5), lerp(c[1], 0.66, 0.5), lerp(c[2], 0.46, 0.5)];
  }
  if (!smoothMode) {
    // paleta corta: se reparte cada canal en pocos escalones
    const q = 5;
    c = c.map((v) => Math.round(v * q) / q);
  }
  return c;
};

// ---------- utilidades de escena ----------
const buildTerrain = (THREE, grid, smoothMode) => {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, grid - 1, grid - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const n = pos.count;
  const hs = new Float32Array(n);
  for (let i = 0; i < n; i++) { const h = H(pos.getX(i), pos.getZ(i)); hs[i] = h; pos.setY(i, h); }
  geo.computeVertexNormals();
  const colorFor = (i, nrm) => colorAt(pos.getX(i), pos.getZ(i), hs[i], Math.sqrt(Math.max(0, 1 / Math.max(0.0001, nrm.y * nrm.y) - 1)), smoothMode);
  if (smoothMode) {
    const colors = new Float32Array(n * 3);
    const nm = geo.attributes.normal;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < n; i++) { tmp.set(nm.getX(i), nm.getY(i), nm.getZ(i)); const c = colorFor(i, tmp); colors.set(c, i * 3); }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }
  const flat = geo.toNonIndexed();
  flat.computeVertexNormals();
  const p2 = flat.attributes.position, nm2 = flat.attributes.normal;
  const colors = new Float32Array(p2.count * 3);
  for (let t = 0; t < p2.count; t += 3) {
    const cx = (p2.getX(t) + p2.getX(t + 1) + p2.getX(t + 2)) / 3, cz = (p2.getZ(t) + p2.getZ(t + 1) + p2.getZ(t + 2)) / 3;
    const ch = (p2.getY(t) + p2.getY(t + 1) + p2.getY(t + 2)) / 3;
    const ny = nm2.getY(t);
    const c = colorAt(cx, cz, ch, Math.sqrt(Math.max(0, 1 / Math.max(0.0001, ny * ny) - 1)), false);
    for (let k = 0; k < 3; k++) colors.set(c, (t + k) * 3);
  }
  flat.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return flat;
};
const buildSkirt = (THREE, steps) => {
  const pos = [], col = [];
  const edge = [];
  for (let i = 0; i <= steps; i++) edge.push([-HALF + (SIZE * i) / steps, -HALF, 0, -1]);
  for (let i = 1; i <= steps; i++) edge.push([HALF, -HALF + (SIZE * i) / steps, 1, 0]);
  const sideDefs = [
    (t) => [-HALF + SIZE * t, -HALF],
    (t) => [HALF, -HALF + SIZE * t],
    (t) => [HALF - SIZE * t, HALF],
    (t) => [-HALF, HALF - SIZE * t],
  ];
  const bottom = -9;
  for (const f of sideDefs) {
    for (let i = 0; i < steps; i++) {
      const a = f(i / steps), b = f((i + 1) / steps);
      const ha = H(a[0], a[1]), hb = H(b[0], b[1]);
      const sea = (ha + hb) / 2 < 0.2;
      const top = sea ? 0 : null;
      const ya = top ?? ha, yb = top ?? hb;
      const c = sea ? [0.1, 0.35, 0.55] : [0.42, 0.3, 0.2];
      const quad = [[a[0], ya, a[1]], [b[0], yb, b[1]], [b[0], bottom, b[1]], [a[0], ya, a[1]], [b[0], bottom, b[1]], [a[0], bottom, a[1]]];
      for (const q of quad) { pos.push(...q); col.push(...c); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
};

export default function IsoWorldTest() {
  const host = useRef(null);
  const api = useRef(null);
  const [mode, setMode] = useState("pixel");
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    let raf = 0;
    let cleanup = () => {};
    (async () => {
      try {
        const [THREE, { OrbitControls }] = await Promise.all([import("three"), import("three/examples/jsm/controls/OrbitControls.js")]);
        if (dead || !host.current) return;
        const el = host.current;
        const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
        renderer.shadowMap.enabled = true;
        renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab";
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#9fc4dc");
        const aspect0 = el.clientWidth / Math.max(1, el.clientHeight);
        const S = 78;
        const cam = new THREE.OrthographicCamera(-S * aspect0, S * aspect0, S, -S, 1, 600);
        cam.position.set(-52, 92, 104);
        cam.zoom = 1;
        const controls = new OrbitControls(cam, renderer.domElement);
        controls.target.set(0, 0, 4);
        controls.enableDamping = true;
        controls.minPolarAngle = 0.62;
        controls.maxPolarAngle = 1.12;
        controls.minAzimuthAngle = -1.1;
        controls.maxAzimuthAngle = 1.1;
        controls.minZoom = 0.8;
        controls.maxZoom = 5;
        controls.screenSpacePanning = false;
        controls.update();

        // luces
        const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x6b5a3a, 0.85);
        scene.add(hemi);
        const sun = new THREE.DirectionalLight(0xfff0d0, 1.9);
        sun.position.set(70, 100, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        const sc = sun.shadow.camera;
        sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 10; sc.far = 300;
        sun.shadow.bias = -0.0006;
        sun.shadow.normalBias = 0.35;
        scene.add(sun);

        // terreno (dos versiones)
        const terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true });
        const terrainFlatMat = new THREE.MeshLambertMaterial({ vertexColors: true });
        const tSmooth = new THREE.Mesh(buildTerrain(THREE, 220, true), terrainMat);
        const tPixel = new THREE.Mesh(buildTerrain(THREE, 96, false), terrainFlatMat);
        for (const t of [tSmooth, tPixel]) { t.receiveShadow = true; t.castShadow = true; scene.add(t); }
        const skirt = new THREE.Mesh(buildSkirt(THREE, 90), new THREE.MeshLambertMaterial({ vertexColors: true }));
        scene.add(skirt);

        // agua con profundidad (la textura de alturas da la costa y la espuma)
        const RES = 256;
        const data = new Uint8Array(RES * RES * 4);
        for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
          const h = H((i / (RES - 1) - 0.5) * SIZE, (j / (RES - 1) - 0.5) * SIZE);
          const v = clamp((h + 12) / 50, 0, 1) * 255;
          const k = (j * RES + i) * 4;
          data[k] = v; data[k + 1] = v; data[k + 2] = v; data[k + 3] = 255;
        }
        const hTex = new THREE.DataTexture(data, RES, RES, THREE.RGBAFormat);
        hTex.needsUpdate = true;
        hTex.magFilter = THREE.LinearFilter;
        hTex.minFilter = THREE.LinearFilter;
        const waterUniforms = { uTime: { value: 0 }, uH: { value: hTex }, uMode: { value: 0 }, uSize: { value: SIZE }, uLevel: { value: 0 } };
        const waterMat = (level) => new THREE.ShaderMaterial({
          uniforms: { ...waterUniforms, uLevel: { value: level } },
          vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
          fragmentShader: `
            varying vec3 vW; uniform sampler2D uH; uniform float uTime, uMode, uSize, uLevel;
            void main(){
              vec2 uv = vW.xz / uSize + 0.5;
              float h = texture2D(uH, uv).r * 50.0 - 12.0;
              float d = max(uLevel - h, 0.0);
              vec3 shallow = vec3(0.38, 0.82, 0.8), mid = vec3(0.1, 0.52, 0.78), deep = vec3(0.04, 0.24, 0.5);
              vec3 c = mix(shallow, mid, smoothstep(0.2, 2.4, d)); c = mix(c, deep, smoothstep(2.0, 8.0, d));
              float wave = sin(vW.x * 0.9 + uTime * 1.3) * sin(vW.z * 0.8 - uTime * 1.1);
              float foam = smoothstep(0.55, 0.0, d + wave * 0.16 + sin(uTime * 1.4 + d * 3.0) * 0.1);
              float sparkle = step(0.93, sin(vW.x * 2.1 + uTime * 0.9) * sin(vW.z * 2.3 - uTime * 0.7) * 0.5 + 0.5) * 0.18;
              if (uMode < 0.5) {
                c = floor(c * 5.0 + 0.5) / 5.0;
                float rip = step(0.55, wave * 0.5 + 0.5) * 0.07;
                c += rip;
                float f = step(0.5, foam);
                c = mix(c, vec3(0.96, 0.98, 1.0), f);
              } else {
                c += sparkle + wave * 0.025;
                c = mix(c, vec3(0.97, 0.99, 1.0), foam * 0.85);
              }
              gl_FragColor = vec4(c, d < 0.02 ? 0.0 : 1.0);
            }`,
          transparent: true,
        });
        const sea = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2), waterMat(0));
        sea.position.y = 0.0;
        scene.add(sea);
        const lake = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r * 1.35, 40).rotateX(-Math.PI / 2), waterMat(LAKE.y));
        lake.position.set(LAKE.x, LAKE.y, LAKE.z);
        scene.add(lake);
        // río: cinta que sigue el cauce
        {
          const pts = [];
          const steps = 90;
          for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * (RIVER.length - 1);
            const k = Math.min(RIVER.length - 2, Math.floor(t));
            const f = t - k;
            const x = lerp(RIVER[k][0], RIVER[k + 1][0], f), z = lerp(RIVER[k][1], RIVER[k + 1][1], f);
            pts.push([x, z]);
          }
          const pos = [], idx = [];
          pts.forEach(([x, z], i) => {
            const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
            let dx = b[0] - a[0], dz = b[1] - a[1];
            const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
            const w = 1.5;
            const y = riverInfo(x, z).bed + 0.28;
            pos.push(x - dz * w, y, z + dx * w, x + dz * w, y, z - dx * w);
            if (i < pts.length - 1) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
          });
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
          g.setIndex(idx);
          const rm = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x2f9fd0, side: THREE.DoubleSide }));
          scene.add(rm);
          api.current = { ...(api.current || {}), river: rm };
        }

        // ---------- árboles ----------
        const rnd = (() => { let s = 12345; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967295); })();
        const treeSpots = [];
        for (let i = 0; i < 9000 && treeSpots.length < 2400; i++) {
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
          treeSpots.push([x, h, z, 0.75 + rnd() * 0.8, forest]);
        }
        const pines = treeSpots.filter((t) => t[4] > 0.5 || t[1] > 6);
        const round = treeSpots.filter((t) => !(t[4] > 0.5 || t[1] > 6));
        const pineGeo = new THREE.ConeGeometry(1.15, 4.4, 6); pineGeo.translate(0, 2.7, 0);
        const roundGeo = new THREE.IcosahedronGeometry(1.35, 0); roundGeo.translate(0, 2.4, 0);
        const trunkGeo = new THREE.CylinderGeometry(0.16, 0.2, 1.2, 5); trunkGeo.translate(0, 0.6, 0);
        const treeMat = new THREE.MeshLambertMaterial({ flatShading: true });
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3b22 });
        const mkInst = (geo, mat, list, cols) => {
          const m = new THREE.InstancedMesh(geo, mat, list.length);
          const o = new THREE.Object3D(), col = new THREE.Color();
          list.forEach((t, i) => {
            o.position.set(t[0], t[1], t[2]);
            o.rotation.y = rnd() * 6.28;
            o.scale.set(t[3], t[3] * (0.9 + rnd() * 0.5), t[3]);
            o.updateMatrix();
            m.setMatrixAt(i, o.matrix);
            col.set(cols[Math.floor(rnd() * cols.length)]);
            if (t[1] > 11) col.lerp(new THREE.Color(0xe8eef4), clamp((t[1] - 11) / 6, 0, 0.7));
            m.setColorAt(i, col);
          });
          m.castShadow = true; m.receiveShadow = true;
          scene.add(m);
          return m;
        };
        mkInst(trunkGeo, trunkMat, treeSpots, ["#5a3b22"]);
        mkInst(pineGeo, treeMat, pines, ["#1f4a2a", "#245532", "#1a3f27", "#2b5d36"]);
        mkInst(roundGeo, treeMat, round, ["#5f8f2e", "#73a038", "#4f7f2a", "#86aa3e"]);

        // ---------- edificios ----------
        const mats = {
          wall: new THREE.MeshLambertMaterial({ color: 0xe3caa0, flatShading: true }),
          wall2: new THREE.MeshLambertMaterial({ color: 0xc9b08a, flatShading: true }),
          roof: new THREE.MeshLambertMaterial({ color: 0xb2512b, flatShading: true }),
          roof2: new THREE.MeshLambertMaterial({ color: 0x8c3f24, flatShading: true }),
          wood: new THREE.MeshLambertMaterial({ color: 0x7b5636, flatShading: true }),
          stone: new THREE.MeshLambertMaterial({ color: 0x9a968c, flatShading: true }),
          stone2: new THREE.MeshLambertMaterial({ color: 0x7e7a72, flatShading: true }),
          white: new THREE.MeshLambertMaterial({ color: 0xf2eee4, flatShading: true }),
          red: new THREE.MeshLambertMaterial({ color: 0xc23b2e, flatShading: true }),
          sail: new THREE.MeshLambertMaterial({ color: 0xf1e6c8, side: THREE.DoubleSide }),
          dark: new THREE.MeshLambertMaterial({ color: 0x0b0b12 }),
        };
        const add = (obj, x, z, rot = 0, y0 = null) => {
          obj.position.set(x, y0 ?? H(x, z), z);
          obj.rotation.y = rot;
          obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          scene.add(obj);
          return obj;
        };
        const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); return b; };
        const roofOf = (w, d, h, m, x = 0, y = 0, z = 0) => {
          const r = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.15, h, 4), m);
          r.rotation.y = Math.atan2(d, w) - 0 + Math.PI / 4 - Math.atan2(d, w) + (w > d ? 0 : 0);
          r.scale.set(w >= d ? 1 : w / d, 1, w >= d ? d / w : 1);
          r.rotation.y = Math.PI / 4 + (w >= d ? 0 : Math.PI / 2);
          r.position.set(x, y + h / 2, z);
          return r;
        };
        const house = (w, d, h, wall, roof) => { const g = new THREE.Group(); g.add(box(w, h, d, wall)); g.add(roofOf(w, d, h * 0.75, roof, 0, h, 0)); g.add(box(0.5, 0.9, 0.12, mats.wood, 0, 0, d / 2 + 0.02)); return g; };
        // casa señorial (con torre)
        {
          const g = new THREE.Group();
          g.add(box(6.5, 2.6, 3.2, mats.wall2)); g.add(roofOf(6.5, 3.2, 2.2, mats.roof2, 0, 2.6, 0));
          g.add(box(3.2, 2.4, 5.2, mats.wall2, -1.6, 0, 0.8)); g.add(roofOf(3.2, 5.2, 2.2, mats.roof2, -1.6, 2.4, 0.8));
          g.add(box(1.7, 5.2, 1.7, mats.wall, 2.6, 0, -0.8)); g.add(roofOf(1.7, 1.7, 2.1, mats.roof, 2.6, 5.2, -0.8));
          add(g, 4, -4, -0.3);
        }
        // iglesia y casas
        {
          const g = new THREE.Group();
          g.add(box(3.2, 2.6, 6, mats.wall)); g.add(roofOf(3.2, 6, 1.9, mats.roof2, 0, 2.6, 0));
          g.add(box(2, 6.4, 2, mats.stone, 0, 0, 3.6)); g.add(roofOf(2, 2, 2.6, mats.roof, 0, 6.4, 3.6));
          add(g, -36, 11, 0.5);
          add(house(2.4, 2.4, 1.8, mats.wall, mats.roof), -41, 16, 0.2);
          add(house(2.6, 2.2, 1.7, mats.wall2, mats.roof2), -31, 17, -0.4);
          add(house(2.2, 2.2, 1.7, mats.wall, mats.roof), -43, 7, 0.9);
        }
        // castillo en ruinas
        {
          const cx = 35, cz = -26, cy = H(cx, cz);
          const g = new THREE.Group();
          const R = 6.5;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * 6.283;
            const hgt = 2.6 + hash(i, 7) * 2.2;
            const w = new THREE.Mesh(new THREE.BoxGeometry(3.6, hgt, 1), i % 4 === 0 ? mats.stone2 : mats.stone);
            w.position.set(Math.cos(a) * R, hgt / 2, Math.sin(a) * R); w.rotation.y = -a + Math.PI / 2;
            g.add(w);
            if (hash(i, 3) > 0.35) { const cr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.1), mats.stone); cr.position.set(Math.cos(a) * R, hgt + 0.3, Math.sin(a) * R); cr.rotation.y = -a + Math.PI / 2; g.add(cr); }
          }
          [[1, 0.8], [-0.7, 0.9], [0.1, -1]].forEach(([dx, dz], i) => {
            const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 5.5 + i * 1.3, 8), mats.stone2);
            t.position.set(dx * R, (5.5 + i * 1.3) / 2, dz * R * 0.9); g.add(t);
            const top = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.5, 0.7, 8), mats.stone); top.position.set(dx * R, 5.5 + i * 1.3 + 0.2, dz * R * 0.9); g.add(top);
          });
          g.add(box(4, 6.5, 4, mats.stone, -0.5, 0, -0.5));
          g.add(box(1.4, 8, 1.4, mats.stone2, 1.2, 0, 0.8));
          add(g, cx, cz, 0.3, cy);
        }
        // puerto: casas, embarcadero, barcos, faro
        {
          const hs = [[27, 20, 0.3, 3, 2.6], [31, 17, -0.2, 2.6, 2.4], [35, 19, 0.6, 3, 2.6], [29, 25, 0.1, 2.4, 2.4], [34, 24, -0.5, 3.2, 2.8], [38, 22, 0.2, 2.4, 2.4], [25, 15, 0.5, 2.4, 2.2]];
          hs.forEach(([x, z, r, w, d], i) => add(house(w, d, 1.9 + (i % 3) * 0.3, i % 2 ? mats.wall2 : mats.wall, i % 3 ? mats.roof : mats.roof2), x, z, r));
          // embarcadero
          const pier = new THREE.Group();
          const deck = (w, d, x, z) => { const m = box(w, 0.25, d, mats.wood, x, 0.1, z); pier.add(m); for (let i = -Math.floor(d / 2.5); i <= Math.floor(d / 2.5); i++) { const p = box(0.3, 0.9, 0.3, mats.wood, x - w / 2, -0.5, z + i * 2.5); pier.add(p); } };
          deck(2.4, 17, 0, 8);
          deck(12, 2.2, 5, 15);
          deck(2.2, 8, 10.5, 19);
          add(pier, 39, 17, 0.4, 0.55);
          // barcos
          const boats = [];
          const boat = (x, z, rot, s = 1) => {
            const g = new THREE.Group();
            const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 4.4), mats.wood); hull.position.y = 0.35; g.add(hull);
            const bow = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 4), mats.wood); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(0, 0.35, 3); g.add(bow);
            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 5), mats.wood); mast.position.y = 2.6; g.add(mast);
            const sl = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 3), mats.sail); sl.position.set(0, 2.7, 0.2); g.add(sl);
            g.scale.setScalar(s);
            add(g, x, z, rot, 0.1);
            boats.push(g);
            return g;
          };
          boat(44, 22, 0.1); boat(46, 27, -0.5, 0.9); boat(42, 31, 0.3, 1.1); boat(50, 16, 1.2, 0.8); boat(48, 38, -0.2, 1);
          api.current = { ...(api.current || {}), boats };
          // faro
          const f = new THREE.Group();
          [[1.5, 1.2, 0.9], [1.1, 1.0, 0.9], [0.95, 0.85, 0.9]].forEach(([r1, r2], i) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r2 * 0.8, r1 * 0.9, 2, 10), i % 2 ? mats.red : mats.white); c.position.y = 1 + i * 2; f.add(c); });
          const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a })); lamp.position.y = 6.5; f.add(lamp);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 8), mats.red); cap.position.y = 7.4; f.add(cap);
          add(f, 52, 31, 0);
          // entrada de cueva
          const cave = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.dark);
          cave.scale.set(1.2, 0.9, 0.8); cave.rotation.x = -0.15;
          add(cave, -4, -38.5, 0, H(-4, -38.5) - 0.3);
        }
        // caminos de tierra (cintas simples entre los puntos)
        {
          const paths = [[[-36, 11], [-24, 12], [-10, 6], [4, -3], [14, 6], [26, 16], [31, 21]], [[4, -4], [16, -14], [28, -22], [34, -26]], [[-36, 11], [-30, 22], [-26, 28]], [[4, -4], [-2, -16], [-8, -26]]];
          paths.forEach((pp) => {
            const pos = [], idx = [];
            const pts = [];
            for (let i = 0; i < pp.length - 1; i++) for (let k = 0; k < 14; k++) { const t = k / 14; pts.push([lerp(pp[i][0], pp[i + 1][0], t) + Math.sin((i * 14 + k) * 0.6) * 0.5, lerp(pp[i][1], pp[i + 1][1], t) + Math.cos((i * 14 + k) * 0.5) * 0.5]); }
            pts.push(pp[pp.length - 1]);
            pts.forEach(([x, z], i) => {
              const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
              let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
              const y = H(x, z) + 0.06;
              pos.push(x - dz * 0.6, y, z + dx * 0.6, x + dz * 0.6, y, z - dx * 0.6);
              if (i < pts.length - 1) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
            });
            const g = new THREE.BufferGeometry();
            g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
            const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xc4a46c, side: THREE.DoubleSide }));
            m.receiveShadow = false;
            scene.add(m);
          });
        }

        // ---------- nubes ----------
        const cc = document.createElement("canvas"); cc.width = cc.height = 128;
        const cx2 = cc.getContext("2d");
        const gr = cx2.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.5, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        cx2.fillStyle = gr; cx2.fillRect(0, 0, 128, 128);
        const cloudTex = new THREE.CanvasTexture(cc);
        const clouds = new THREE.Group();
        const spots = [[-48, 12, -30], [-30, 16, -44], [-8, 22, -42], [24, 14, -40], [48, 18, -34], [-52, 8, 8], [-44, 6, 34], [-20, 7, 44], [8, 9, 48], [52, 14, 6], [30, 10, 46], [-36, 24, -12], [0, 28, -30], [40, 26, -12]];
        spots.forEach(([x, y, z], i) => {
          for (let k = 0; k < 3; k++) {
            const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
            sp.position.set(x + (k - 1) * 7, y + (k % 2) * 1.5, z + ((k * 3) % 5));
            sp.scale.set(24 + k * 5 + (i % 3) * 4, 12 + k * 2, 1);
            clouds.add(sp);
          }
        });
        scene.add(clouds);

        // ---------- modos ----------
        const applyMode = (m) => {
          const pixel = m === "pixel";
          const dpr = window.devicePixelRatio || 1;
          renderer.setPixelRatio(pixel ? 1 / Math.max(2.4, 3.2 / dpr * dpr) : Math.min(dpr, 2));
          renderer.setSize(el.clientWidth, el.clientHeight, false);
          renderer.domElement.style.imageRendering = pixel ? "pixelated" : "auto";
          renderer.shadowMap.type = pixel ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
          renderer.toneMapping = pixel ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.05;
          tPixel.visible = pixel; tSmooth.visible = !pixel;
          clouds.visible = !pixel;
          waterUniforms.uMode.value = pixel ? 0 : 1;
          sea.material.uniforms.uMode.value = pixel ? 0 : 1;
          lake.material.uniforms.uMode.value = pixel ? 0 : 1;
          scene.background = new THREE.Color(pixel ? "#cfe4ef" : "#a9c9de");
          scene.fog = pixel ? null : new THREE.FogExp2(0xbcd3e6, 0.0032);
          hemi.intensity = pixel ? 1.05 : 0.8;
          sun.intensity = pixel ? 1.6 : 2.1;
          sun.color.set(pixel ? 0xffffff : 0xfff0d0);
          scene.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((x) => (x.needsUpdate = true)); } });
        };
        api.current = { ...(api.current || {}), applyMode, resize: () => {} };
        applyMode(mode);

        const resize = () => {
          const w = el.clientWidth, h = Math.max(1, el.clientHeight);
          const a = w / h;
          cam.left = -S * a; cam.right = S * a; cam.top = S; cam.bottom = -S;
          cam.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        };
        const ro = new ResizeObserver(resize);
        ro.observe(el);

        const clock = new THREE.Clock();
        const loop = () => {
          raf = requestAnimationFrame(loop);
          const t = clock.getElapsedTime();
          waterUniforms.uTime.value = t;
          sea.material.uniforms.uTime.value = t;
          lake.material.uniforms.uTime.value = t;
          const boats = api.current?.boats;
          if (boats) boats.forEach((b, i) => { b.position.y = 0.1 + Math.sin(t * 1.2 + i) * 0.1; b.rotation.z = Math.sin(t * 1.0 + i * 2) * 0.04; });
          clouds.children.forEach((c, i) => { c.position.x += Math.sin(t * 0.05 + i) * 0.004 + 0.004; if (c.position.x > 70) c.position.x = -70; });
          controls.update();
          renderer.render(scene, cam);
        };
        loop();

        cleanup = () => {
          ro.disconnect();
          cancelAnimationFrame(raf);
          controls.dispose();
          renderer.dispose();
          scene.traverse((o) => { o.geometry?.dispose?.(); });
          if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        };
      } catch (e) {
        setErr(String(e && e.message ? e.message : e));
      }
    })();
    return () => { dead = true; cleanup(); };
  }, []);

  useEffect(() => { api.current?.applyMode?.(mode); }, [mode]);

  const Btn = ({ k, children }) => (
    <button type="button" onClick={() => setMode(k)} style={{ all: "unset", cursor: "pointer", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: mode === k ? "#1c1405" : "#e8ecf8", background: mode === k ? "#E3B04B" : "rgba(14,16,40,.7)", border: "1px solid rgba(255,255,255,.18)" }}>{children}</button>
  );
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b0d22", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div ref={host} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", left: 16, top: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", zIndex: 2 }}>
        <Btn k="pixel">Pixel · propuesta propia</Btn>
        <Btn k="pintado">Pintado · estilo de la imagen</Btn>
        <a href="/" style={{ color: "#e8ecf8", fontSize: 13, textDecoration: "none", padding: "8px 12px", background: "rgba(14,16,40,.7)", borderRadius: 10, border: "1px solid rgba(255,255,255,.18)" }}>Volver</a>
      </div>
      <div style={{ position: "absolute", left: 16, bottom: 14, color: "#e8ecf8", fontSize: 12, background: "rgba(14,16,40,.7)", padding: "7px 11px", borderRadius: 10, zIndex: 2 }}>
        Prueba temporal · arrastra para mover la vista, rueda para acercar, clic derecho para desplazar
      </div>
      {err && <div style={{ position: "absolute", left: 16, top: 70, color: "#ffb4a8", fontSize: 13, zIndex: 3 }}>No se pudo cargar la escena 3D: {err}</div>}
    </div>
  );
}
