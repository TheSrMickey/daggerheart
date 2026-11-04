"use client";

import { useEffect, useRef, useState } from "react";
import { makeCosmicMaterial, makeMarbleMaterial, makeResinMaterial } from "./DiceSkins";

// Dados en 3D (cristal): los de dualidad y los auxiliares (ventaja, bonos…) se tiran con física real (cannon-es) desde un
// punto, una velocidad y un giro aleatorios. Cada tirada ya está decidida; la física no la cambia: al terminar se
// renumeran las caras para que la de arriba muestre el valor que toca. Al quedar quietos, cada dado se gira para que su
// número se lea derecho y se atenúan los demás. Después los dados se acercan a la pantalla, el borde se anima según sea
// Esperanza, Miedo o crítico y se muestra la suma con todas las bonificaciones. Se queda así hasta que el jugador toca
// la pantalla; solo entonces (onReveal + onEnd) se cierra y aparece el resultado en la ficha.
let glOk = null;
export function canDice3d() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (glOk === null) {
    // Crear un contexto WebGL es caro (y se llamaba en cada tirada): se comprueba una sola vez y se libera.
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      glOk = !!gl;
      const lose = gl && gl.getExtension && gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    } catch {
      glOk = false;
    }
  }
  return glOk;
}
export const DICE3D_SIDES = [4, 6, 8, 10, 12, 20];

// Logo de la página (public/logo.svg), en su sistema de coordenadas de 200 × 340.
const LOGO_PATH = "M100 0C101.5 66 106 109 200 115C106 121 102 164 100 340C98 164 94 121 0 115C94 109 98.5 66 100 0Z";
const DT = 1 / 120;
const rngOf = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// Colores por tipo de dado: [color, color de atenuación (tinte), color del número]
const TINTS = {
  hope: [0xffe9a0, 0xf0a010, "#fff1b8"],
  fear: [0xd9c4ff, 0x6a2bd6, "#efe3ff"],
  adv: [0xc8f5d2, 0x2fae5a, "#e6ffec"],
  dis: [0xffd0c8, 0xd0402e, "#fff0ec"],
  bonus: [0xcfeeff, 0x3a9bd6, "#eaf7ff"],
  dmg: [0xffd6c8, 0xd9482a, "#fff0ea"],
  crit: [0xd2f5d0, 0x2f9e44, "#eaffe8"],
};


// ---- Recursos compartidos entre tiradas ----
// Crear un renderer WebGL, el entorno y compilar los shaders del cristal en cada tirada tardaba entre 0,3 y 1 s (y los contextos
// WebGL se iban acumulando). Se crean una sola vez y se reutilizan; las geometrías, los materiales y las texturas de los números
// también se guardan, para que los programas ya compilados no se tiren al terminar cada tirada.
// ---------- Geometrías de los dados ----------
const polyGeo = (THREE, sides) => {
  if (sides === 4) return new THREE.TetrahedronGeometry(1);
  if (sides === 6) {
    const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    g.scale(2 / Math.sqrt(3), 2 / Math.sqrt(3), 2 / Math.sqrt(3));
    return g;
  }
  if (sides === 8) return new THREE.OctahedronGeometry(1);
  if (sides === 12) return new THREE.DodecahedronGeometry(1);
  if (sides === 20) return new THREE.IcosahedronGeometry(1);
  // d10: trapezoedro pentagonal (10 caras en cometa)
  const c = 0.105;
  const U = (i) => new THREE.Vector3(Math.cos((i * 2 * Math.PI) / 5), c, Math.sin((i * 2 * Math.PI) / 5));
  const L = (i) => new THREE.Vector3(Math.cos(((i * 2 + 1) * Math.PI) / 5), -c, Math.sin(((i * 2 + 1) * Math.PI) / 5));
  const n = new THREE.Vector3().crossVectors(U(1).clone().sub(U(0)), L(0).clone().sub(U(0)));
  const h = c + (n.x * U(0).x + n.z * U(0).z) / n.y;
  const T = new THREE.Vector3(0, h, 0);
  const B = new THREE.Vector3(0, -h, 0);
  const pts = [];
  const tri = (a, b, d) => {
    const nn = new THREE.Vector3().crossVectors(b.clone().sub(a), d.clone().sub(a));
    const ctr = a.clone().add(b).add(d).divideScalar(3);
    if (nn.dot(ctr) < 0) pts.push(a, d, b);
    else pts.push(a, b, d);
  };
  for (let i = 0; i < 5; i++) {
    tri(T, U(i), L(i));
    tri(T, L(i), U(i + 1));
    tri(B, L(i), U(i + 1));
    tri(B, U(i + 1), L(i + 1));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = Math.max(...pts.map((p) => p.length()));
  g.scale(1 / m, 1 / m, 1 / m);
  return g;
};

// Caras agrupadas (triángulos coplanares) + «ranuras» de número. Un d4 se lee por el vértice de arriba.
const buildType = (THREE, sides) => {
  const geo = polyGeo(THREE, sides);
  const pos = geo.attributes.position;
  const tris = [];
  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const nrm = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    tris.push({ pts: [a, b, c], nrm, key: nrm.toArray().map((v) => Math.round(v * 200)).join(",") });
  }
  const byKey = new Map();
  tris.forEach((t) => {
    if (!byKey.has(t.key)) byKey.set(t.key, []);
    byKey.get(t.key).push(t);
  });
  const uniq = [];
  const idx = (p) => {
    const i = uniq.findIndex((u) => u.distanceTo(p) < 1e-4);
    if (i >= 0) return i;
    uniq.push(p.clone());
    return uniq.length - 1;
  };
  const faces = [];
  byKey.forEach((ts) => {
    const ids = [...new Set(ts.flatMap((t) => t.pts.map(idx)))];
    const ctr = ids.reduce((s, i) => s.add(uniq[i]), new THREE.Vector3()).divideScalar(ids.length);
    const n = ts[0].nrm.clone();
    const u = uniq[ids[0]].clone().sub(ctr).normalize();
    const w = new THREE.Vector3().crossVectors(n, u);
    const ang = (p) => Math.atan2(uniq[p].clone().sub(ctr).dot(w), uniq[p].clone().sub(ctr).dot(u));
    const order = [...ids].sort((a, b) => ang(a) - ang(b));
    // radio interior de la cara (para el tamaño del número)
    let inr = 9;
    for (let i = 0; i < order.length; i++) {
      const p = uniq[order[i]];
      const q = uniq[order[(i + 1) % order.length]];
      const e = q.clone().sub(p).normalize();
      const v = ctr.clone().sub(p);
      inr = Math.min(inr, v.clone().sub(e.clone().multiplyScalar(v.dot(e))).length());
    }
    faces.push({ ids, order, ctr, n, inr, u });
  });
  // Ranuras: una por cara; en el d4, tres por vértice (cerca del vértice, en cada cara que lo toca).
  let groups;
  if (sides === 4) {
    groups = uniq.map((v) => ({
      dir: v.clone().normalize(),
      slots: faces
        .filter((f) => f.ids.some((i) => uniq[i] === v))
        .map((f) => ({ pos: f.ctr.clone().add(v.clone().sub(f.ctr).multiplyScalar(0.5)), n: f.n, up: v.clone().sub(f.ctr).normalize(), size: f.inr * 0.8 })),
    }));
  } else {
    groups = faces.map((f) => ({ dir: f.n.clone(), slots: [{ pos: f.ctr.clone(), n: f.n, up: f.u.clone(), size: Math.min(f.inr * 1.35, 0.7) }] }));
  }
  return { geo, uniq, faces, groups };
};

let S3 = null;
let S3p = null;
async function getShared() {
  if (S3) return S3;
  if (!S3p) {
    S3p = (async () => {
      const [THREE, CANNON, { RoomEnvironment }] = await Promise.all([import("three"), import("cannon-es"), import("three/examples/jsm/environments/RoomEnvironment.js")]);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const pm = new THREE.PMREMGenerator(renderer);
      const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.radius = 4;
      const catcher = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.42 }));
      catcher.rotation.x = -Math.PI / 2;
      catcher.receiveShadow = true;
      const glassC = {};
      const edgeC = {};
      const skinC = {};
      const sh = {
        THREE,
        CANNON,
        renderer,
        pm,
        env,
        key,
        catcher,
        types: {},
        texCache: new Map(),
        glass: (kind) => {
          const tint = TINTS[kind] || TINTS.bonus;
          return (glassC[kind] = glassC[kind] || new THREE.MeshPhysicalMaterial({ color: new THREE.Color(tint[1]).lerp(new THREE.Color(tint[0]), 0.06), roughness: 0.62, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.6, envMapIntensity: 0.28, emissive: new THREE.Color(tint[1]), emissiveIntensity: 0.16 }));
        },
        edgeMat: (o) => (edgeC[o] = edgeC[o] || new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: o })),
        skinMat: (k, make) => (skinC[k] = skinC[k] || make()),
      };
      // Si el navegador pierde el contexto (falta de memoria de vídeo, cambio de GPU…), la siguiente tirada lo vuelve a crear.
      renderer.domElement.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        S3 = null;
        S3p = null;
      });
      S3 = sh;
      return sh;
    })().catch((e) => {
      S3p = null;
      throw e;
    });
  }
  return S3p;
}
// Aspecto de dado (cósmico u oficial) para un dado concreto; null = cristal. Los materiales se crean una vez.
function skinFor(sh, skin, kind, sides) {
  const duality = sides === 12 && (kind === "hope" || kind === "fear");
  if (skin === "cosmico")
    return sh.skinMat("cos" + (kind === "hope" ? 1 : 0), () => {
      const m = makeCosmicMaterial(sh.THREE, kind === "hope" ? 0.75 : 0);
      m.mat.envMapIntensity = 0.55;
      return m;
    });
  if (skin === "oficial") return sh.skinMat(duality ? "res" + kind : "mar", () => (duality ? makeResinMaterial(sh.THREE, kind) : makeMarbleMaterial(sh.THREE)));
  return null;
}
// Precarga: con el navegador libre se crea el renderer y se compilan los shaders (cristal y el aspecto elegido) para que la primera tirada no se atasque.
let warmedKey = "";
export function warmDice3D(skin) {
  if (typeof window === "undefined" || warmedKey === String(skin)) return;
  if (!canDice3d()) return;
  warmedKey = String(skin);
  const go = async () => {
    try {
      const sh = await getShared();
      const { THREE } = sh;
      const scene = new THREE.Scene();
      scene.environment = sh.env;
      const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
      cam.position.set(0, 16, 11);
      cam.lookAt(0, 0, 0);
      const T12 = (sh.types[12] = sh.types[12] || buildType(THREE, 12));
      const combos = [["bonus", 6], ["hope", 12], ["fear", 12]];
      const made = [];
      combos.forEach(([kind, sides], i) => {
        const cm = skinFor(sh, skin, kind, sides);
        const mat = cm ? cm.mat : sh.glass(kind);
        const m = new THREE.Mesh(T12.geo, mat);
        m.position.set(i * 2 - 2, 1, 0);
        m.castShadow = true;
        scene.add(m);
        made.push(m);
      });
      if (!sh.anchorPlane) {
        const c = document.createElement("canvas");
        c.width = c.height = 8;
        const tex = new THREE.CanvasTexture(c);
        sh.anchorPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.95 }));
        sh.anchorEdges = new THREE.LineSegments(new THREE.EdgesGeometry(T12.geo), sh.edgeMat(0.55));
      }
      scene.add(sh.anchorPlane, sh.anchorEdges, sh.key, sh.catcher);
      sh.renderer.setSize(96, 96);
      sh.renderer.render(scene, cam);
      scene.remove(sh.anchorPlane, sh.anchorEdges, sh.key, sh.catcher);
      made.forEach((m) => scene.remove(m));
    } catch (e) {
      warmedKey = "";
    }
  };
  if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 1500);
}

export function Dice3D({ dice, summary, skin, onReveal, onEnd }) {
  const host = useRef(null);
  const [edgeOn, setEdgeOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeAt = useRef(0); // al tocar con la suma a la vista: animación de salida antes de cerrar
  const readyRef = useRef(false);
  const shift = useRef(0); // un toque antes de tiempo salta directo a la escena final
  const zoomEndRef = useRef(0);
  const t0Ref = useRef(0);
  const cb = useRef({ onReveal, onEnd });
  useEffect(() => {
    cb.current = { onReveal, onEnd };
  });

  useEffect(() => {
    let dead = false;
    let raf = 0;
    let cleanup = () => {};
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      cb.current.onReveal && cb.current.onReveal();
    };
    (async () => {
      let THREE, CANNON, sh;
      try {
        sh = await getShared();
        THREE = sh.THREE;
        CANNON = sh.CANNON;
      } catch {
        reveal();
        cb.current.onEnd && cb.current.onEnd();
        return;
      }
      if (dead || !host.current) return;
      try {
        const list = (dice || []).filter((d) => DICE3D_SIDES.includes(d.sides)).slice(0, 12);
        if (!list.length) throw new Error("sin dados");
        const W = window.innerWidth || 1280;
        const H = window.innerHeight || 720;
        const aspect = W / H;
        const R = rngOf((Math.random() * 1e9) | 0);
        const rr = (a, b) => a + (b - a) * R();

        // Cámara más cenital (para leer los números) y más lejos en vertical, para que la mesa quepa a lo ancho.
        const FOV = 38;
        const dist = Math.max(20.2, 4.7 / (Math.tan((FOV / 2) * (Math.PI / 180)) * aspect));
        const k = dist / 20.2;
        const camPos = new THREE.Vector3(0, 16.6 * k, 11.5 * k);
        const halfX = Math.min(7.4, 0.44 * 2 * Math.tan((FOV / 2) * (Math.PI / 180)) * dist * aspect * 1.1);
        const halfZ = Math.min(5.2 * k, 8);

        const typeOf = (sides) => (sh.types[sides] = sh.types[sides] || buildType(THREE, sides));

        // ---------- Física: se simula entera por adelantado ----------
        const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -34, 0) });
        world.allowSleep = true;
        const mDie = new CANNON.Material("die");
        const mTab = new CANNON.Material("tab");
        world.addContactMaterial(new CANNON.ContactMaterial(mDie, mTab, { friction: 0.6, restitution: 0.28 }));
        world.addContactMaterial(new CANNON.ContactMaterial(mDie, mDie, { friction: 0.3, restitution: 0.4 }));
        const addBox = (hx, hy, hz, x, y, z) => {
          const w = new CANNON.Body({ mass: 0, material: mTab, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)) });
          w.position.set(x, y, z);
          world.addBody(w);
        };
        addBox(40, 6, 40, 0, -6, 0); // suelo grueso: con uno fino los dados a veces lo atravesaban
        addBox(3, 12, 14, -halfX - 3, 12, 0);
        addBox(3, 12, 14, halfX + 3, 12, 0);
        addBox(14, 12, 3, 0, 12, -halfZ - 3);
        addBox(14, 12, 3, 0, 12, halfZ + 3);

        const items = list.map((d, i) => {
          const T = typeOf(d.sides);
          const scale = d.main ? 1 : 0.78;
          const shape = new CANNON.ConvexPolyhedron({
            vertices: T.uniq.map((v) => new CANNON.Vec3(v.x * scale, v.y * scale, v.z * scale)),
            faces: T.faces.map((f) => f.order),
          });
          const b = new CANNON.Body({ mass: 1, material: mDie, shape, sleepSpeedLimit: 0.35, sleepTimeLimit: 0.5, linearDamping: 0.2, angularDamping: 0.4 });
          b.position.set(rr(-halfX * 0.7, halfX * 0.7), rr(8, 11) + i * rr(1.2, 2.6), rr(-halfZ * 0.6, halfZ * 0.6));
          const dx = -Math.sign(b.position.x || 1) * rr(0.4, 1);
          b.velocity.set(dx * rr(5, 12) + rr(-3, 3), rr(-4, 3), rr(-5, 5));
          b.angularVelocity.set(rr(-14, 14), rr(-14, 14), rr(-14, 14));
          b.quaternion.setFromEuler(rr(0, 6.28), rr(0, 6.28), rr(0, 6.28));
          world.addBody(b);
          return { d, T, scale, b };
        });
        const rec = [];
        let tt = 0;
        let rest = null;
        let calm = 0;
        for (let s = 0; s < 120 * 8; s++) {
          world.step(DT);
          tt += DT;
          rec.push(items.map(({ b }) => [b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w]));
          // Quietos: dormidos, o casi sin velocidad un momento (algunos dados se quedan vibrando y no llegan a dormir).
          calm = items.every(({ b }) => b.sleepState === CANNON.Body.SLEEPING || (b.velocity.length() < 0.3 && b.angularVelocity.length() < 0.6)) ? calm + DT : 0;
          if (rest === null && calm > 0.3) rest = tt;
          if (rest !== null && tt > rest + 0.3) break;
        }
        if (rest === null) rest = tt;
        const last = rec[rec.length - 1];

        // Grupo (cara o vértice) que queda arriba y numeración para que muestre el valor decidido.
        const topGroup = (T, s) => {
          const q = new THREE.Quaternion(s[3], s[4], s[5], s[6]);
          let best = -9;
          let bi = 0;
          T.groups.forEach((g, i) => {
            const y = g.dir.clone().applyQuaternion(q).y;
            if (y > best) {
              best = y;
              bi = i;
            }
          });
          return bi;
        };

        // ---------- Escena ----------
        const renderer = sh.renderer;
        const dpr = Math.min(window.devicePixelRatio || 1, W < 820 ? 1.5 : 2);
        renderer.setPixelRatio(dpr);
        renderer.setSize(W, H);
        renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
        host.current.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        scene.environment = sh.env;
        const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 120);
        cam.position.copy(camPos);
        cam.lookAt(0, 0, 0);
        const key = sh.key;
        key.position.set(-4 * k, 11 * k, 4 * k);
        const sc = 12 * k;
        Object.assign(key.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc, far: 60 });
        scene.add(key);
        const catcher = sh.catcher;
        catcher.visible = true;
        scene.add(catcher);

        const disposables = [];
        const texCache = sh.texCache;
        const numTex = (n, col, logo) => {
          const id = n + col + (logo ? "L" : "");
          if (texCache.has(id)) return texCache.get(id);
          const c = document.createElement("canvas");
          c.width = c.height = 128;
          const g = c.getContext("2d");
          g.font = "bold 80px Georgia, serif";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillStyle = col;
          g.shadowColor = col;
          g.shadowBlur = 10;
          if (logo) {
            // En el dado cósmico, la cara del 12 es el logo de la página (la estrella de cuatro puntas).
            g.translate(64, 64);
            g.scale(0.34, 0.34);
            g.translate(-100, -170);
            g.fill(new Path2D(LOGO_PATH));
          } else g.fillText(String(n), 64, 70);
          // un 6 y un 9 se distinguen con un punto
          if (n === 6 || n === 9) {
            g.shadowBlur = 0;
            g.fillRect(52, 112, 24, 6);
          }
          const t = new THREE.CanvasTexture(c);
          texCache.set(id, t);
          return t;
        };

        const cosmics = []; // dados con el aspecto cósmico: su reloj se actualiza en cada fotograma
        const objs = items.map(({ d, T, scale, b }) => {
          // Aspectos de dado: valen para todos los dados. «cosmico»: nebulosa, el logo en el 12.
          // «oficial»: resina marmoleada (morada y azul, números amarillos), D12 de Esperanza ámbar y de Miedo azul marino (números blancos); logo en el 12 de los D12 y en el 20.
          const duality = d.sides === 12 && (d.kind === "hope" || d.kind === "fear");
          const cm = skinFor(sh, skin, d.kind, d.sides);
          let numCol = null;
          let logoOn = 0;
          if (skin === "cosmico") {
            numCol = "#ffe3a1";
            logoOn = d.sides === 12 ? 12 : 0;
          } else if (skin === "oficial") {
            numCol = duality ? "#ffffff" : "#ffc21a";
            logoOn = duality ? 12 : d.sides === 20 ? 20 : 0;
          }
          const tint = cm ? [0, 0, numCol] : TINTS[d.kind] || TINTS.bonus;
          const group = new THREE.Group();
          if (cm) cosmics.push(cm.uniforms);
          const mat = cm ? cm.mat : sh.glass(d.kind);
          const body = new THREE.Group();
          body.scale.setScalar(scale);
          const mesh = new THREE.Mesh(T.geo, mat);
          mesh.castShadow = true;
          body.add(mesh);
          const edges = new THREE.LineSegments(T.edges || (T.edges = new THREE.EdgesGeometry(T.geo)), sh.edgeMat(cm ? 0.16 : 0.55));
          body.add(edges);
          group.add(body);
          // Numeración: cada grupo lleva un número; el que queda arriba al final recibe el valor decidido.
          const labels = Array.from({ length: d.sides }, (_, i) => i + 1);
          const topI = topGroup(T, last[items.findIndex((x) => x.b === b)]);
          const want = Math.min(d.sides, Math.max(1, d.value));
          const j = labels.indexOf(want);
          [labels[topI], labels[j]] = [labels[j], labels[topI]];
          const planes = [];
          T.groups.forEach((gr, gi) => {
            gr.slots.forEach((sl) => {
              const pmat = new THREE.MeshBasicMaterial({ map: numTex(labels[gi], tint[2], logoOn && labels[gi] === logoOn), transparent: true, depthWrite: false, opacity: 0.95 });
              const pl = new THREE.Mesh(new THREE.PlaneGeometry(sl.size, sl.size), pmat);
              const yAx = sl.up.clone().sub(sl.n.clone().multiplyScalar(sl.up.dot(sl.n))).normalize();
              const xAx = new THREE.Vector3().crossVectors(yAx, sl.n);
              pl.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, yAx, sl.n));
              pl.position.copy(sl.pos.clone().add(sl.n.clone().multiplyScalar(0.012)));
              body.add(pl);
              disposables.push(pmat, pl.geometry);
              planes.push({ pl, gi, sl, yAx });
            });
          });
          scene.add(group);
          return { group, planes, topI, T };
        });

        // Pose final alineada: el número de arriba se lee derecho (con su parte alta hacia el fondo de la mesa).
        const aligned = items.map((it, i) => {
          const o = objs[i];
          const s = last[i];
          const q0 = new THREE.Quaternion(s[3], s[4], s[5], s[6]);
          // la ranura del grupo de arriba que más mira a la cámara
          const cands = o.planes.filter((p) => p.gi === o.topI);
          const toCam = camPos.clone().sub(new THREE.Vector3(s[0], s[1], s[2])).normalize();
          let slot = cands[0];
          let bd = -9;
          cands.forEach((c) => {
            const dd = c.sl.n.clone().applyQuaternion(q0).dot(toCam);
            if (dd > bd) {
              bd = dd;
              slot = c;
            }
          });
          const upW = slot.yAx.clone().applyQuaternion(q0);
          const a = Math.atan2(upW.x, upW.z);
          o.slot = slot;
          return { phi: Math.PI - a, q0 };
        });

        const veil = host.current.querySelector(".d3-veil");
        const t0 = performance.now();
        const alignStart = rest + 0.05;
        const alignDur = 0.55;
        const zoomStart = rest + 0.95;
        const zoomDur = 0.9;
        const zoomEnd = zoomStart + zoomDur;
        zoomEndRef.current = zoomEnd;
        t0Ref.current = t0;
        let edgeFlag = false;
        // Destino de cada dado: delante de la cámara, en filas, con el número mirando al jugador y derecho.
        const zd = 11.5;
        const tanH = Math.tan((FOV / 2) * (Math.PI / 180));
        const visW = 2 * zd * tanH * aspect;
        const visH = 2 * zd * tanH;
        const nD = objs.length;
        const perRow = Math.max(1, Math.min(nD, Math.floor((visW * 0.9) / 2.9)));
        const rowsN = Math.ceil(nD / perRow);
        const sp = Math.min(2.9, (visW * 0.92) / perRow, (visH * 0.5) / rowsN);
        const zs = sp / 2.9;
        cam.updateMatrixWorld();
        const targets = objs.map((o, i) => {
          const r = Math.floor(i / perRow);
          const inRow = Math.min(perRow, nD - r * perRow);
          const c = i % perRow;
          const x = (c - (inRow - 1) / 2) * sp;
          const y = ((rowsN - 1) / 2 - r) * sp + visH * 0.1;
          const p = new THREE.Vector3(x, y, -zd).applyQuaternion(cam.quaternion).add(camPos);
          const nrm = o.slot.sl.n.clone();
          const yA = o.slot.yAx.clone();
          const xA = new THREE.Vector3().crossVectors(yA, nrm);
          const local = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, nrm));
          const q = cam.quaternion.clone().multiply(local.invert());
          return { p, q, sc: (items[i].d.main ? 1.25 : 1) * zs };
        });
        const qY = new THREE.Quaternion();
        const qT = new THREE.Quaternion();
        const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
        const tick = () => {
          if (dead) return;
          cosmics.forEach((u) => (u.uTime.value = performance.now() / 1000));
          const t = typeof window.__d3t === "number" ? window.__d3t : (performance.now() - t0) / 1000 + shift.current;
          const i = Math.min(rec.length - 1, Math.max(0, Math.round(t / DT)));
          const e = ease((t - alignStart) / alignDur);
          objs.forEach((o, di) => {
            const s = rec[i][di];
            o.group.position.set(s[0], s[1], s[2]);
            o.group.quaternion.set(s[3], s[4], s[5], s[6]);
            if (e > 0) {
              qY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), aligned[di].phi * e);
              qT.copy(aligned[di].q0);
              o.group.quaternion.premultiply(qY);
              // los demás números se atenúan y el de arriba crece
              o.planes.forEach((p) => {
                const top = p === o.slot;
                p.pl.material.opacity = top ? 1 : 0.95 - 0.8 * e;
                p.pl.scale.setScalar(top ? 1 + 0.45 * e : 1);
                if (top) p.pl.position.copy(p.sl.pos.clone().add(p.sl.n.clone().multiplyScalar(0.012 + 0.02 * e)));
              });
            }
          });
          // Los dados se acercan a la pantalla.
          const z = ease((t - zoomStart) / zoomDur);
          if (z > 0) {
            catcher.visible = false;
            objs.forEach((o, di) => {
              o.group.position.lerp(targets[di].p, z);
              o.group.quaternion.slerp(targets[di].q, z);
              o.group.scale.setScalar(1 + (targets[di].sc - 1) * z);
            });
          }
          if (t >= zoomStart && !edgeFlag) {
            edgeFlag = true;
            setEdgeOn(true);
          }
          if (t >= zoomEnd && !readyRef.current) {
            readyRef.current = true;
            setReady(true);
          }
          // Salida: los dados se alejan hacia la cámara mientras todo se desvanece.
          let cl = 0;
          if (closeAt.current) {
            cl = Math.min(1, (performance.now() - closeAt.current) / 480);
            const ec = 1 - Math.pow(1 - cl, 3);
            objs.forEach((o, di) => {
              o.group.position.lerp(camPos, 0.22 * ec);
              o.group.scale.setScalar(targets[di].sc * (1 + 0.35 * ec));
            });
          }
          host.current.style.opacity = String(Math.min(1, t / 0.12) * (1 - cl));
          if (veil) veil.style.opacity = String((0.35 + 0.4 * z) * (1 - cl * 0.4));
          renderer.render(scene, cam);
          if (cl >= 1) {
            cb.current.onReveal && cb.current.onReveal();
            cb.current.onEnd && cb.current.onEnd();
            return;
          }
          raf = requestAnimationFrame(tick);
        };
        window.__d3rest = rest;
        raf = requestAnimationFrame(tick);
        cleanup = () => {
          cancelAnimationFrame(raf);
          disposables.forEach((d) => d.dispose && d.dispose());
          objs.forEach((o) => scene.remove(o.group));
          scene.remove(key, catcher);
          renderer.domElement.remove();
        };
      } catch (e) {
        console.warn("Dice3D", e);
        reveal();
        cb.current.onEnd && cb.current.onEnd();
      }
    })();
    return () => {
      dead = true;
      cleanup();
    };
    // La tirada se decide una vez al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un toque antes de tiempo salta a la escena final; con la suma ya a la vista, un toque cierra.
  const tap = () => {
    if (!readyRef.current && t0Ref.current) {
      const raw = (performance.now() - t0Ref.current) / 1000 + shift.current;
      shift.current += Math.max(0, zoomEndRef.current - raw + 0.02);
      return;
    }
    if (closeAt.current) return;
    closeAt.current = performance.now();
    setClosing(true);
  };
  const sm = summary || null;
  const fmt = (p, i) => (p.plain || i === 0 ? String(p.v) : p.v < 0 ? "−" + Math.abs(p.v) : "+" + p.v);
  return (
    <div ref={host} className="d3-host" onClick={tap} role="presentation" style={{ position: "fixed", inset: 0, zIndex: 100050, opacity: 0, cursor: "pointer" }}>
      <style>{D3_CSS}</style>
      <div className="d3-veil" style={{ position: "absolute", inset: 0, background: "rgb(8,6,12)", opacity: 0.35 }} />
      {sm && <div className={"d3-edge is-" + sm.outcome + (edgeOn ? " on" : "")} style={{ "--ec": sm.color }} />}
      {sm && ready && (
        <div className={"d3-sum" + (closing ? " is-out" : "")} style={{ "--ec": sm.color }} role="status">
          <div className="d3-sum-row">
            {sm.parts.map((p, i) => (
              <span key={i} className={"d3-chip k-" + (p.kind || "")} style={{ animationDelay: i * 0.11 + "s" }}>
                <small>{p.label}</small>
                <b>{fmt(p, i)}</b>
              </span>
            ))}
          </div>
          <div className="d3-sum-total" style={{ animationDelay: sm.parts.length * 0.11 + 0.08 + "s" }}>
            <span>=</span>
            <b>{sm.total}</b>
          </div>
          <div className="d3-sum-t" style={{ animationDelay: sm.parts.length * 0.11 + 0.3 + "s" }}>{sm.text}</div>
          {sm.dc && <div className="d3-sum-dc" style={{ animationDelay: sm.parts.length * 0.11 + 0.4 + "s" }}>{sm.dc}</div>}
          {sm.note && <div className="d3-sum-note" style={{ animationDelay: sm.parts.length * 0.11 + 0.5 + "s" }}>{sm.note}</div>}
          <div className="d3-sum-hint" style={{ animationDelay: sm.parts.length * 0.11 + 0.9 + "s" }}>Toca la pantalla para continuar</div>
        </div>
      )}
    </div>
  );
}

const D3_CSS = `
.d3-edge { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity .35s; }
.d3-edge.on { opacity: 1; }
.d3-edge::before { content: ""; position: absolute; inset: 0; box-shadow: inset 0 0 0 3px var(--ec), inset 0 0 60px 8px var(--ec), inset 0 0 150px 24px color-mix(in srgb, var(--ec) 45%, transparent); }
.d3-edge::after { content: ""; position: absolute; inset: 0; }
.d3-edge.is-hope::before { animation: d3-breathe 2.2s ease-in-out infinite; }
.d3-edge.is-hope::after { background: radial-gradient(ellipse 80% 55% at 50% 118%, color-mix(in srgb, var(--ec) 55%, transparent), transparent 70%); animation: d3-rise 2.2s ease-in-out infinite; }
.d3-edge.is-fear::before { animation: d3-flicker 1.5s steps(1, end) infinite; }
.d3-edge.is-fear::after { background: radial-gradient(ellipse 120% 90% at 50% 50%, transparent 55%, color-mix(in srgb, var(--ec) 40%, #000) 130%); animation: d3-creep 3s ease-in-out infinite; }
.d3-edge.is-dmg::before { animation: d3-flicker 1.9s steps(1, end) infinite; }
.d3-edge.is-dmg::after { background: radial-gradient(ellipse 110% 85% at 50% 50%, transparent 52%, color-mix(in srgb, var(--ec) 45%, #000) 135%); animation: d3-creep 1.6s ease-in-out infinite; }
.d3-edge.is-crit::before { animation: d3-breathe 1.1s ease-in-out infinite; }
.d3-edge.is-crit::after { background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--ec) 35%, transparent), transparent 25%, color-mix(in srgb, #E3B04B 35%, transparent), transparent 50%, color-mix(in srgb, var(--ec) 35%, transparent), transparent 75%, color-mix(in srgb, #E3B04B 35%, transparent), transparent); -webkit-mask: radial-gradient(ellipse at center, transparent 62%, #000 100%); mask: radial-gradient(ellipse at center, transparent 62%, #000 100%); animation: d3-spin 6s linear infinite; }
@keyframes d3-breathe { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes d3-rise { 0%, 100% { opacity: .4; transform: translateY(6%); } 50% { opacity: 1; transform: translateY(0); } }
@keyframes d3-flicker { 0% { opacity: 1; } 12% { opacity: .35; } 18% { opacity: .9; } 40% { opacity: .6; } 46% { opacity: 1; } 70% { opacity: .45; } 76% { opacity: .95; } 100% { opacity: 1; } }
@keyframes d3-creep { 0%, 100% { opacity: .5; transform: scale(1.08); } 50% { opacity: 1; transform: scale(1); } }
@keyframes d3-spin { to { transform: rotate(360deg); } }
.d3-sum { position: absolute; left: 0; right: 0; margin: 0 auto; bottom: max(4vh, 22px); width: min(560px, calc(100vw - 28px)); display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 18px 14px; border-radius: 24px; text-align: center; color: #f1ecdf; background: color-mix(in srgb, #14153b 80%, transparent); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); border: 1px solid color-mix(in srgb, var(--ec) 55%, #ffffff22); box-shadow: 0 0 40px -6px color-mix(in srgb, var(--ec) 60%, transparent), 0 18px 34px -18px #000d, inset 0 1px 0 #ffffff1c; animation: d3-in .4s cubic-bezier(.2,.8,.2,1) both; }
.d3-sum.is-out { animation: d3-out .42s cubic-bezier(.4,0,.8,.4) both; }
@keyframes d3-out { to { opacity: 0; transform: translateY(26px) scale(.97); } }
.d3-sum-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.d3-chip { display: inline-flex; flex-direction: column; align-items: center; min-width: 54px; padding: 5px 10px 6px; border-radius: 12px; background: #ffffff0d; border: 1px solid #ffffff1f; animation: d3-pop .35s cubic-bezier(.2,.9,.3,1.3) both; }
.d3-chip small { font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: #b9b2c8; }
.d3-chip b { font: 700 19px Georgia, serif; }
.d3-chip.k-hope { border-color: #E3B04B88; } .d3-chip.k-hope b { color: #F5CF72; }
.d3-chip.k-fear { border-color: #A58BE888; } .d3-chip.k-fear b { color: #C7B3FA; }
.d3-chip.k-adv { border-color: #2fae5a88; } .d3-chip.k-adv b { color: #8be0a4; }
.d3-chip.k-dis { border-color: #d0402e88; } .d3-chip.k-dis b { color: #ff9c8c; }
.d3-sum-total { display: flex; align-items: baseline; gap: 10px; animation: d3-pop .4s cubic-bezier(.2,.9,.3,1.3) both; }
.d3-sum-total span { font-size: 22px; color: #b9b2c8; }
.d3-sum-total b { font: 700 54px/1 Georgia, serif; color: var(--ec); text-shadow: 0 0 24px color-mix(in srgb, var(--ec) 70%, transparent); }
.d3-sum-t { font: 600 17px Georgia, serif; letter-spacing: .06em; text-transform: uppercase; color: var(--ec); animation: d3-in .4s both; }
.d3-sum-dc { font-size: 13px; font-weight: 600; color: #e9e2d4; animation: d3-in .4s both; }
.d3-sum-note { font-size: 12px; color: #b9b2c8; animation: d3-in .4s both; }
.d3-sum-hint { margin-top: 4px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #8c85a0; animation: d3-in .5s both, d3-breathe 2s ease-in-out 1s infinite; }
@keyframes d3-in { from { opacity: 0; transform: translate(0, 10px); } to { opacity: 1; transform: none; } }
@keyframes d3-pop { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }
`;
