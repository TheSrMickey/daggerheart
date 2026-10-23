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

const findClearing = () => {
  let best = null, bs = 1e9;
  for (let x = -24; x <= 14; x += 2) for (let z = 8; z <= 34; z += 2) {
    const h = H(x, z);
    if (h < 1.8 || h > 7) continue;
    if (PLOTS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + 7)) continue;
    if (fieldAt(x, z)) continue;
    if (riverInfo(x, z).d < 6) continue;
    const sl = Math.hypot(H(x + 2, z) - h, H(x, z + 2) - h) + Math.hypot(H(x - 2, z) - h, H(x, z - 2) - h);
    const forest = fbm(x * 0.07 + 20, z * 0.07 + 8, 3);
    const sc = sl * 3 - forest * 4 + Math.hypot(x + 8, z - 20) * 0.02;
    if (sc < bs) { bs = sc; best = { x, z }; }
  }
  return best || { x: -8, z: 22 };
};
const FIGHT = findClearing();

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
  const [tab, setTab] = useState("tiempo"); // tiempo = escena three.js · blender = renders hechos en Blender
  const [bl, setBl] = useState("pixel");
  const paused = useRef(false);
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
          if (Math.hypot(x - FIGHT.x, z - FIGHT.z) < 9.5) continue;
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
          boat(46, 22, 0.1); boat(47, 28, -0.5, 0.9); boat(43, 32, 0.3, 1.1); boat(51, 17, 1.2, 0.8); boat(49, 38, -0.2, 1);
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

        // ---------- efectos (fuego, chispas, magia, espuma, humo) ----------
        const actors = [];
        const FXN = 1100;
        const fxMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), FXN);
        fxMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        fxMesh.frustumCulled = false;
        const fx = { p: new Float32Array(FXN * 3), v: new Float32Array(FXN * 3), age: new Float32Array(FXN).fill(9), life: new Float32Array(FXN).fill(1), s0: new Float32Array(FXN), s1: new Float32Array(FXN), kind: new Uint8Array(FXN), g: new Float32Array(FXN), n: 0 };
        const pal = [["#fff6b0", "#ffb52e", "#ff5a1f", "#4a2418"], ["#ffffff", "#ffe66e", "#ffb02e", "#c9741a"], ["#d6fbff", "#4fd8ff", "#9a5cff", "#4a2a8a"], ["#ffffff", "#eaf6ff", "#bfe4ff", "#bfe4ff"], ["#8a7f72", "#6f665c", "#4d4740", "#3a352f"]].map((a) => a.map((c) => new THREE.Color(c)));
        const tmpO = new THREE.Object3D(), tmpC = new THREE.Color();
        for (let i = 0; i < FXN; i++) { tmpO.scale.setScalar(0); tmpO.updateMatrix(); fxMesh.setMatrixAt(i, tmpO.matrix); fxMesh.setColorAt(i, tmpC.set(0xffffff)); }
        scene.add(fxMesh);
        const emit = (x, y, z, vx, vy, vz, life, s0, s1, kind, g = 0) => {
          const i = fx.n++ % FXN;
          fx.p[i * 3] = x; fx.p[i * 3 + 1] = y; fx.p[i * 3 + 2] = z;
          fx.v[i * 3] = vx; fx.v[i * 3 + 1] = vy; fx.v[i * 3 + 2] = vz;
          fx.age[i] = 0; fx.life[i] = life; fx.s0[i] = s0; fx.s1[i] = s1; fx.kind[i] = kind; fx.g[i] = g;
        };
        const updateFx = (dt) => {
          for (let i = 0; i < FXN; i++) {
            if (fx.age[i] >= fx.life[i]) { if (fx.s0[i] !== 0) { fx.s0[i] = 0; fx.s1[i] = 0; tmpO.position.set(0, -50, 0); tmpO.scale.setScalar(0); tmpO.updateMatrix(); fxMesh.setMatrixAt(i, tmpO.matrix); } continue; }
            fx.age[i] += dt;
            const u = Math.min(1, fx.age[i] / fx.life[i]);
            fx.v[i * 3 + 1] += fx.g[i] * dt;
            fx.p[i * 3] += fx.v[i * 3] * dt; fx.p[i * 3 + 1] += fx.v[i * 3 + 1] * dt; fx.p[i * 3 + 2] += fx.v[i * 3 + 2] * dt;
            const sz = lerp(fx.s0[i], fx.s1[i], u);
            tmpO.position.set(fx.p[i * 3], fx.p[i * 3 + 1], fx.p[i * 3 + 2]);
            tmpO.rotation.set(u * 3, u * 4, 0);
            tmpO.scale.setScalar(Math.max(0.01, sz));
            tmpO.updateMatrix();
            fxMesh.setMatrixAt(i, tmpO.matrix);
            const P = pal[fx.kind[i]], k = Math.min(2.999, u * 3), k0 = Math.floor(k);
            tmpC.copy(P[k0]).lerp(P[k0 + 1], k - k0);
            fxMesh.setColorAt(i, tmpC);
          }
          fxMesh.instanceMatrix.needsUpdate = true;
          if (fxMesh.instanceColor) fxMesh.instanceColor.needsUpdate = true;
        };
        const rr = (a, b) => a + Math.random() * (b - a);
        const lm = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra });
        const bx = (par, w, h, d, m, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; par.add(b); return b; };

        // ---------- dragón que lanza fuego al castillo ----------
        const CASTLE = { x: 35, z: -26 };
        const castleY = H(CASTLE.x, CASTLE.z);
        const dragon = new THREE.Group();
        {
          const red = lm(0xa32d2d), dark = lm(0x6b1b22), belly = lm(0xdba35e), wingM = lm(0x7d2433, { side: THREE.DoubleSide }), horn = lm(0xf0e4c4);
          const eye = new THREE.MeshBasicMaterial({ color: 0xffe066 });
          bx(dragon, 2.4, 2.0, 5.4, red); bx(dragon, 1.8, 0.5, 4.8, belly, 0, -1.0, 0.1);
          for (let k = 0; k < 4; k++) bx(dragon, 1.25 - k * 0.1, 1.25 - k * 0.1, 1.6, red, 0, 0.9 + k * 0.6, 2.8 + k * 0.85);
          for (let k = 0; k < 7; k++) bx(dragon, 0.28, 0.5, 0.5, dark, 0, 1.2 + (k < 4 ? k * 0.6 : 0) + (k >= 4 ? -0.9 + (k - 4) * -0.15 : 0), k < 4 ? 2.4 + k * 0.85 : -1.2 - (k - 4) * 1.3);
          const head = new THREE.Group(); head.position.set(0, 3.5, 6.2); dragon.add(head);
          bx(head, 1.6, 1.3, 2.0, red); bx(head, 1.1, 0.8, 1.5, red, 0, -0.15, 1.5);
          const jaw = new THREE.Group(); jaw.position.set(0, -0.5, 0.6); head.add(jaw); bx(jaw, 1.0, 0.35, 1.7, dark, 0, 0, 0.9);
          [-1, 1].forEach((sd) => { const h1 = bx(head, 0.25, 0.25, 1.3, horn, sd * 0.55, 0.85, -0.6); h1.rotation.x = -0.6; bx(head, 0.2, 0.2, 0.1, eye, sd * 0.72, 0.28, 0.75); bx(head, 0.1, 0.1, 0.1, dark, sd * 0.3, 0.1, 2.25); });
          const mouth = new THREE.Object3D(); mouth.position.set(0, -0.2, 2.4); head.add(mouth);
          const wings = [-1, 1].map((sd) => {
            const piv = new THREE.Group(); piv.position.set(sd * 1.1, 1.0, 0.6); dragon.add(piv);
            bx(piv, 6.2, 0.25, 0.5, dark, sd * 3.1, 0, 0);
            bx(piv, 5.6, 0.08, 3.4, wingM, sd * 3.0, -0.06, -1.9); bx(piv, 2.4, 0.08, 2.6, wingM, sd * 6.2, -0.06, -1.3);
            bx(piv, 0.2, 0.2, 3.6, dark, sd * 2.4, 0, -1.9); bx(piv, 0.2, 0.2, 3.2, dark, sd * 4.6, 0, -1.7);
            return { piv, sd };
          });
          const tail = [];
          let cur = new THREE.Group(); cur.position.set(0, -0.1, -2.7); dragon.add(cur);
          for (let k = 0; k < 8; k++) {
            bx(cur, Math.max(0.35, 1.5 - k * 0.17), Math.max(0.35, 1.3 - k * 0.15), 1.5, k % 2 ? red : dark === red ? red : red, 0, 0, -0.75);
            const nx = new THREE.Group(); nx.position.set(0, 0, -1.45); cur.add(nx); tail.push(cur); cur = nx;
          }
          bx(cur, 0.3, 1.4, 1.0, dark, 0, 0, 0.2);
          [[-1, 1.7], [1, 1.7], [-1, -1.7], [1, -1.7]].forEach(([sd, z]) => { bx(dragon, 0.7, 1.3, 0.8, red, sd * 1.0, -1.45, z); bx(dragon, 0.8, 0.25, 1.0, horn, sd * 1.0, -2.15, z + 0.15); });
          dragon.scale.setScalar(1.45);
          const BASE = new THREE.Vector3(15, castleY + 12.5, -24);
          const target = new THREE.Vector3(CASTLE.x, castleY + 3.5, CASTLE.z);
          dragon.position.copy(BASE);
          scene.add(dragon);
          const fireLight = new THREE.PointLight(0xff7a2a, 0, 38, 1.4); fireLight.position.set(CASTLE.x, castleY + 8, CASTLE.z); scene.add(fireLight);
          const burn = [[-5, 5.5, 0], [5, 6.5, 2], [1.5, 6.6, -5.5], [0, 8.5, 0], [-3, 3, 4]].map(([dx, dy, dz]) => new THREE.Vector3(CASTLE.x + dx, castleY + dy, CASTLE.z + dz));
          let acc = 0, accB = 0, intensity = 0;
          const mw = new THREE.Vector3(), dir = new THREE.Vector3();
          actors.push((t, dt) => {
            dragon.position.set(BASE.x + Math.sin(t * 0.5) * 1.5, BASE.y + Math.sin(t * 1.7) * 1.0, BASE.z + Math.cos(t * 0.4) * 1.2);
            dragon.rotation.y = Math.atan2(target.x - dragon.position.x, target.z - dragon.position.z);
            dragon.rotation.x = Math.sin(t * 1.7 + 1) * 0.04;
            const ph = t % 6.6, firing = ph > 2.0 && ph < 4.6;
            const flap = Math.sin(t * 5.2) * 0.55 + 0.1;
            wings.forEach(({ piv, sd }) => { piv.rotation.z = sd * flap; });
            tail.forEach((g, k) => { g.rotation.y = Math.sin(t * 2.2 - k * 0.55) * 0.2; g.rotation.x = -0.05; });
            const open = firing ? 0.55 + Math.sin(t * 20) * 0.06 : 0.12 + Math.sin(t * 1.3) * 0.04;
            jaw.rotation.x = open; head.rotation.x = firing ? -0.12 : 0.05; head.rotation.y = Math.sin(t * 0.9) * 0.08;
            if (firing) {
              acc += dt * 150;
              mouth.getWorldPosition(mw);
              dir.copy(target).sub(mw).normalize();
              while (acc >= 1) {
                acc -= 1;
                emit(mw.x + rr(-0.2, 0.2), mw.y + rr(-0.2, 0.2), mw.z + rr(-0.2, 0.2), dir.x * 27 + rr(-2.2, 2.2), dir.y * 27 + rr(-1.6, 2.4), dir.z * 27 + rr(-2.2, 2.2), rr(0.7, 0.95), 0.5, 1.7, 0, 1.2);
              }
              if (Math.random() < dt * 14) emit(mw.x, mw.y + 0.3, mw.z, dir.x * 10, dir.y * 10 + 3, dir.z * 10, 1.6, 0.8, 2.2, 4, 0.5);
            }
            intensity = firing ? Math.min(1, intensity + dt * 1.5) : Math.max(0.12, intensity - dt * 0.28);
            accB += dt * (6 + intensity * 38);
            while (accB >= 1) {
              accB -= 1;
              const b = burn[Math.floor(Math.random() * burn.length)];
              emit(b.x + rr(-0.7, 0.7), b.y + rr(-0.2, 0.3), b.z + rr(-0.7, 0.7), rr(-0.6, 0.6), rr(2.4, 5.2) * (0.5 + intensity), rr(-0.6, 0.6), rr(0.5, 0.95), 0.9, 0.2, 0, 0);
              if (Math.random() < 0.18) emit(b.x, b.y + 0.8, b.z, rr(-1, 1), rr(3, 6), rr(-1, 1), rr(1.1, 1.9), 0.9, 2.2, 4, 0.2);
            }
            fireLight.intensity = intensity * (34 + Math.sin(t * 31) * 7 + Math.sin(t * 17) * 5);
          });
        }

        // ---------- aventureros peleando en el claro del bosque ----------
        {
          const gy = (x, z) => H(x, z);
          const skin = lm(0xf0c29a), goblinSkin = lm(0x6fae3a), trollSkin = lm(0x7d8f70), steel = lm(0xcfd6df), gold = lm(0xe3b04b), wood = lm(0x6e4a2a);
          const person = (o) => {
            const g = new THREE.Group();
            const sc = (o.scale || 1) * 1.4;
            const sk = o.skin || skin;
            bx(g, 0.34, 0.9, 0.38, lm(o.pants), -0.2, 0.45, 0); bx(g, 0.34, 0.9, 0.38, lm(o.pants), 0.2, 0.45, 0);
            bx(g, 0.82, o.robe ? 1.5 : 1.0, 0.5, lm(o.tunic), 0, o.robe ? 1.25 : 1.4, 0);
            if (o.robe) bx(g, 1.1, 0.7, 0.7, lm(o.tunic), 0, 0.55, 0);
            bx(g, 0.62, 0.62, 0.62, sk, 0, 2.2, 0); bx(g, 0.12, 0.12, 0.08, lm(0x201810), -0.15, 2.25, 0.32); bx(g, 0.12, 0.12, 0.08, lm(0x201810), 0.15, 2.25, 0.32);
            if (o.hair) bx(g, 0.7, 0.26, 0.7, lm(o.hair), 0, 2.58, -0.02);
            if (o.ears) { bx(g, 0.34, 0.14, 0.1, sk, -0.45, 2.3, 0); bx(g, 0.34, 0.14, 0.1, sk, 0.45, 2.3, 0); }
            const mkArm = (sd) => { const p = new THREE.Group(); p.position.set(sd * 0.56, 1.85, 0); g.add(p); bx(p, 0.26, 0.85, 0.26, lm(o.tunic), 0, -0.4, 0); bx(p, 0.22, 0.22, 0.22, sk, 0, -0.9, 0); return p; };
            const armR = mkArm(1), armL = mkArm(-1);
            g.scale.setScalar(sc);
            scene.add(g);
            return { g, armR, armL };
          };
          const C = FIGHT;
          const place = (a, dx, dz, faceX, faceZ) => { a.base = { x: C.x + dx * 1.35, z: C.z + dz * 1.35 }; a.face = { x: C.x + faceX, z: C.z + faceZ }; a.g.position.set(a.base.x, gy(a.base.x, a.base.z), a.base.z); a.g.rotation.y = Math.atan2(a.face.x - a.base.x, a.face.z - a.base.z); return a; };
          // héroes
          const warrior = place(person({ pants: 0x3b3f58, tunic: 0x2f6fd0, hair: 0xb8c0cc, scale: 1.25 }), -1.9, 0.4, 1.6, 0.2);
          bx(warrior.g, 0.12, 0.6, 0.12, lm(0xd23a2f), 0, 2.95, -0.1); bx(warrior.g, 0.78, 0.2, 0.78, steel, 0, 2.52, 0);
          const sword = new THREE.Group(); sword.position.set(0, -0.9, 0.1); warrior.armR.add(sword); bx(sword, 0.12, 1.5, 0.06, steel, 0, 0.8, 0); bx(sword, 0.5, 0.1, 0.12, gold, 0, 0.05, 0);
          const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 10), lm(0xe3b04b)); shield.rotation.z = Math.PI / 2; shield.position.set(-0.2, -0.5, 0.1); shield.castShadow = true; warrior.armL.add(shield);
          const mage = place(person({ pants: 0x2a2140, tunic: 0x7a4fc4, robe: true, scale: 1.2 }), -4.0, 2.6, 1.6, 0.2);
          const hat = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 5), lm(0x5a35a8)); hat.position.set(0, 3.1, 0); hat.castShadow = true; mage.g.add(hat);
          bx(mage.g, 1.1, 0.07, 1.1, lm(0x5a35a8), 0, 2.55, 0);
          const staff = new THREE.Group(); staff.position.set(0, -0.9, 0.1); mage.armR.add(staff); bx(staff, 0.1, 2.6, 0.1, wood, 0, 0.9, 0);
          const orbMat = new THREE.MeshBasicMaterial({ color: 0x66e6ff }); const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), orbMat); orb.position.set(0, 2.3, 0); staff.add(orb);
          const rogue = place(person({ pants: 0x2d2d33, tunic: 0x2f8a4a, hair: 0x3a2a1c, scale: 1.1 }), -2.3, -2.5, 0.8, -2.0);
          const hood = bx(rogue.g, 0.78, 0.5, 0.8, lm(0x1f6a38), 0, 2.45, -0.05);
          const dagR = bx(rogue.armR, 0.08, 0.75, 0.05, steel, 0, -1.2, 0.1), dagL = bx(rogue.armL, 0.08, 0.75, 0.05, steel, 0, -1.2, 0.1);
          // enemigos
          const troll = place(person({ pants: 0x4a3a2a, tunic: 0x8a5a3a, skin: trollSkin, scale: 1.9, ears: true }), 1.9, 0.2, -1.9, 0.4);
          const clubT = bx(troll.armR, 0.34, 1.7, 0.34, wood, 0, -1.0, 0.25);
          const gob1 = place(person({ pants: 0x5a2a2a, tunic: 0x7a3a2a, skin: goblinSkin, scale: 0.95, ears: true }), 0.6, -2.5, -1.2, -1.8);
          const gob2 = place(person({ pants: 0x5a2a2a, tunic: 0x6a4a2a, skin: goblinSkin, scale: 0.95, ears: true }), 1.4, 3.0, -1.0, 1.9);
          bx(gob1.armR, 0.2, 1.0, 0.2, wood, 0, -1.0, 0.2); bx(gob2.armR, 0.2, 1.0, 0.2, wood, 0, -1.0, 0.2);
          const sparks = (x, y, z, n, kind = 1) => { for (let i = 0; i < n; i++) emit(x, y, z, rr(-5, 5), rr(2, 8), rr(-5, 5), rr(0.25, 0.5), 0.4, 0.05, kind, -22); };
          const ease = (u) => 1 - Math.pow(1 - u, 3);
          const wPos = new THREE.Vector3();
          let hitA = -1, hitC = -1, castA = -1;
          const mp = new THREE.Vector3();
          actors.push((t, dt) => {
            // guerrero: ataca al trol cada 1,1 s
            const T1 = 1.1, p1 = (t % T1) / T1, cyc = Math.floor(t / T1);
            const sw = p1 < 0.3 ? ease(p1 / 0.3) : 1 - (p1 - 0.3) / 0.7;
            warrior.armR.rotation.x = lerp(-2.7, -0.3, p1 < 0.3 ? ease(p1 / 0.3) : 1 - ease((p1 - 0.3) / 0.7));
            warrior.armL.rotation.x = -0.9 + Math.sin(t * 3) * 0.1;
            const fwdW = { x: Math.sin(warrior.g.rotation.y), z: Math.cos(warrior.g.rotation.y) };
            warrior.g.position.set(warrior.base.x + fwdW.x * sw * 0.9, gy(warrior.base.x, warrior.base.z), warrior.base.z + fwdW.z * sw * 0.9);
            if (p1 > 0.3 && cyc !== hitA) { hitA = cyc; troll.hit = 1; sparks(troll.base.x - 1.1, gy(troll.base.x, troll.base.z) + 3.6, troll.base.z + 0.1, 12); }
            // trol: golpea de vuelta cada 2 s y retrocede al ser golpeado
            troll.hit = Math.max(0, (troll.hit || 0) - dt * 3.2);
            const T2 = 2.0, p2 = (t % T2) / T2;
            troll.armR.rotation.x = lerp(-2.9, -0.2, p2 < 0.25 ? ease(p2 / 0.25) : 1 - ease((p2 - 0.25) / 0.75) * 0.4 - 0.6 * ((p2 - 0.25) / 0.75));
            troll.g.position.set(troll.base.x + (troll.hit || 0) * 0.7, gy(troll.base.x, troll.base.z) + Math.max(0, Math.sin(t * 6)) * 0.05, troll.base.z);
            troll.g.rotation.z = (troll.hit || 0) * 0.14;
            if (p2 > 0.25 && p2 < 0.27 && Math.random() < 0.9) emit(troll.base.x - 2.6, gy(troll.base.x, troll.base.z) + 0.3, troll.base.z + 0.4, rr(-2, 2), rr(0.5, 2), rr(-2, 2), 0.6, 0.7, 1.5, 4, 0);
            // maga: lanza un rayo a un goblin cada 2,4 s
            const T3 = 2.4, p3 = (t % T3) / T3, cy3 = Math.floor(t / T3);
            mage.armR.rotation.x = p3 < 0.3 ? lerp(-0.6, -2.3, ease(p3 / 0.3)) : lerp(-2.3, -0.6, ease((p3 - 0.3) / 0.7));
            orb.scale.setScalar(1 + Math.sin(t * 9) * 0.15 + (p3 < 0.4 ? p3 * 1.2 : 0));
            orb.getWorldPosition(mp);
            if (p3 > 0.32 && cy3 !== castA) {
              castA = cy3;
              const tg = gob1.g.position;
              for (let i = 0; i < 26; i++) { const u = i / 26; emit(mp.x, mp.y, mp.z, (tg.x - mp.x) * 3.2 + rr(-1, 1), (tg.y + 1.6 - mp.y) * 3.2 + rr(-1, 1), (tg.z - mp.z) * 3.2 + rr(-1, 1), 0.28 + u * 0.12, 0.5, 0.18, 2, 0); }
              gob1.hit = 1; sparks(tg.x, tg.y + 1.6, tg.z, 10, 2);
            }
            // bribón: da saltitos alrededor del goblin 2 y apuñala
            rogue.g.position.set(rogue.base.x + Math.sin(t * 1.4) * 1.3, gy(rogue.base.x, rogue.base.z) + Math.abs(Math.sin(t * 4.6)) * 0.55, rogue.base.z + Math.cos(t * 1.4) * 1.0);
            rogue.g.rotation.y = Math.atan2(gob1.g.position.x - rogue.g.position.x, gob1.g.position.z - rogue.g.position.z);
            rogue.armR.rotation.x = -1.3 + Math.sin(t * 9) * 0.7; rogue.armL.rotation.x = -1.3 + Math.sin(t * 9 + Math.PI) * 0.7;
            // goblins: saltan y agitan los garrotes
            [gob1, gob2].forEach((gb, k) => {
              gb.hit = Math.max(0, (gb.hit || 0) - dt * 2.6);
              gb.g.position.set(gb.base.x + (k ? 0.15 : -0.1) * Math.sin(t * 3) + (gb.hit || 0) * -0.6, gy(gb.base.x, gb.base.z) + Math.abs(Math.sin(t * 5 + k * 1.7)) * 0.5, gb.base.z + (gb.hit || 0) * (k ? 0.4 : -0.5));
              gb.armR.rotation.x = -1.6 + Math.sin(t * 7 + k) * 0.9;
              gb.g.rotation.z = (gb.hit || 0) * 0.3;
            });
            // polvo del combate
            if (Math.random() < dt * 5) emit(C.x + rr(-1.2, 1.2), gy(C.x, C.z) + 0.2, C.z + rr(-1.5, 1.5), rr(-1, 1), rr(0.4, 1.4), rr(-1, 1), 0.9, 0.5, 1.4, 4, 0);
          });
        }

        // ---------- nubes de bloques (modo pixel) ----------
        const pxClouds = new THREE.Group();
        {
          const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x3a3f48, flatShading: true });
          [[-46, 27, -22], [-24, 31, -40], [8, 33, -36], [46, 29, -28], [52, 25, 10], [-52, 23, 14], [-40, 23, 38], [-10, 27, 46], [38, 27, 42], [14, 30, 6]].forEach(([x, y, z], i) => {
            const g = new THREE.Group();
            const n = 6 + (i % 3);
            for (let k = 0; k < n; k++) { const b = bx(g, rr(3, 6.5), rr(1.6, 2.8), rr(3, 5.5), cm, rr(-6.5, 6.5), rr(-0.5, 1.0) + (k % 3 === 0 ? 1 : 0), rr(-3, 3)); b.receiveShadow = false; }
            g.position.set(x, y, z); pxClouds.add(g);
          });
        }
        scene.add(pxClouds);
        actors.push((t, dt) => { pxClouds.children.forEach((c, i) => { c.position.x += dt * (0.9 + (i % 4) * 0.25); if (c.position.x > 78) c.position.x = -78; }); });

        // ---------- barcos: navegan en elipses y dejan estela ----------
        {
          const bs = api.current?.boats || [];
          const routes = [{ cx: 46, cz: 22, rx: 3, rz: 2.6, sp: 0.22, ph: 0 }, { cx: 47, cz: 28, rx: 4, rz: 3, sp: -0.18, ph: 2 }, { cx: 43, cz: 32, rx: 3.6, rz: 3, sp: 0.25, ph: 4 }, { cx: 51, cz: 17, rx: 4, rz: 3, sp: -0.2, ph: 1 }, { cx: 49, cz: 38, rx: 5, rz: 3.6, sp: 0.16, ph: 3 }];
          const wake = bs.map(() => 0);
          actors.push((t, dt) => {
            bs.forEach((b, i) => {
              const r = routes[i]; if (!r) return;
              const a = t * r.sp + r.ph;
              const x = r.cx + r.rx * Math.cos(a), z = r.cz + r.rz * Math.sin(a);
              if (H(x, z) < -0.4) {
                const vx = -r.rx * Math.sin(a) * r.sp, vz = r.rz * Math.cos(a) * r.sp;
                b.position.set(x, 0.1 + Math.sin(t * 1.2 + i) * 0.1, z);
                b.rotation.y = Math.atan2(vx, vz);
                b.rotation.z = Math.sin(t * 1.0 + i * 2) * 0.05;
                wake[i] += dt;
                if (wake[i] > 0.09) { wake[i] = 0; const sx = x - Math.sin(b.rotation.y) * 2.4 * b.scale.x, sz = z - Math.cos(b.rotation.y) * 2.4 * b.scale.x; emit(sx + rr(-0.3, 0.3), 0.16, sz + rr(-0.3, 0.3), rr(-0.2, 0.2), 0, rr(-0.2, 0.2), 1.1, 0.8, 0.15, 3, 0); }
              }
            });
          });
        }

        // ---------- modos ----------
        const applyMode = (m) => {
          const pixel = m === "pixel";
          const dpr = window.devicePixelRatio || 1;
          renderer.setPixelRatio(pixel ? 1 / 2.6 : Math.min(dpr, 2));
          renderer.setSize(el.clientWidth, el.clientHeight, false);
          renderer.domElement.style.imageRendering = pixel ? "pixelated" : "auto";
          renderer.shadowMap.type = pixel ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
          renderer.toneMapping = pixel ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.05;
          tPixel.visible = pixel; tSmooth.visible = !pixel;
          clouds.visible = !pixel;
          pxClouds.visible = pixel;
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
        let lastT = 0;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (paused.current) return;
          const t = clock.getElapsedTime();
          const dt = Math.min(0.05, t - lastT); lastT = t;
          waterUniforms.uTime.value = t;
          sea.material.uniforms.uTime.value = t;
          lake.material.uniforms.uTime.value = t;
          actors.forEach((fn) => fn(t, dt));
          updateFx(dt);
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
  useEffect(() => { paused.current = tab !== "tiempo"; }, [tab]);

  const pill = (on) => ({ all: "unset", cursor: "pointer", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: on ? "#1c1405" : "#e8ecf8", background: on ? "#E3B04B" : "rgba(14,16,40,.78)", border: "1px solid rgba(255,255,255,.18)" });
  const bar = { background: "rgba(14,16,40,.78)", borderRadius: 12, padding: 6, display: "flex", gap: 6, border: "1px solid rgba(255,255,255,.12)" };
  const blender = tab === "blender";
  return (
    <div style={{ position: "fixed", inset: 0, background: blender ? (bl === "pixel" ? "#d5d5d5" : "#cddbe6") : "#0b0d22", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div ref={host} style={{ position: "absolute", inset: 0, visibility: blender ? "hidden" : "visible" }} />
      {blender && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={bl}
            src={bl === "pixel" ? "/prueba-mapa/blender-pixel.png" : "/prueba-mapa/blender-realista.jpg"}
            alt={bl === "pixel" ? "Mapa isométrico en estilo pixel, renderizado en Blender" : "Mapa isométrico en estilo realista, renderizado en Blender"}
            style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: bl === "pixel" ? "pixelated" : "auto" }}
          />
        </div>
      )}
      <div style={{ position: "absolute", left: 16, top: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", zIndex: 2 }}>
        <div style={bar} role="tablist" aria-label="Origen del mapa">
          <button type="button" role="tab" aria-selected={!blender} style={pill(!blender)} onClick={() => setTab("tiempo")}>Tiempo real</button>
          <button type="button" role="tab" aria-selected={blender} style={pill(blender)} onClick={() => setTab("blender")}>Blender</button>
        </div>
        {!blender ? (
          <div style={bar}>
            <button type="button" style={pill(mode === "pixel")} onClick={() => setMode("pixel")}>Pixel · propuesta propia</button>
            <button type="button" style={pill(mode === "pintado")} onClick={() => setMode("pintado")}>Pintado · estilo de la imagen</button>
          </div>
        ) : (
          <div style={bar}>
            <button type="button" style={pill(bl === "pixel")} onClick={() => setBl("pixel")}>Pixel</button>
            <button type="button" style={pill(bl === "realista")} onClick={() => setBl("realista")}>Realista</button>
          </div>
        )}
        <a href="/" style={{ color: "#e8ecf8", fontSize: 13, textDecoration: "none", padding: "10px 14px", background: "rgba(14,16,40,.78)", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)" }}>Volver</a>
      </div>
      <div style={{ position: "absolute", left: 16, bottom: 14, color: "#e8ecf8", fontSize: 12, background: "rgba(14,16,40,.78)", padding: "7px 11px", borderRadius: 10, zIndex: 2 }}>
        {blender ? "Prueba temporal · imágenes renderizadas en Blender con el mismo mapa" : "Prueba temporal · arrastra para mover la vista, rueda para acercar, clic derecho para desplazar"}
      </div>
      {err && <div style={{ position: "absolute", left: 16, top: 70, color: "#ffb4a8", fontSize: 13, zIndex: 3 }}>No se pudo cargar la escena 3D: {err}</div>}
    </div>
  );
}
