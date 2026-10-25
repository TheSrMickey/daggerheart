"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Hand, RotateCw, ChevronsUp, ChevronsDown, ChevronsLeft, Eraser, Trash2, Undo2, Search } from "lucide-react";
import { HEX_CATALOG, HEX_COLORS } from "@/lib/hexCatalog";

// Mapa de mundo en 3D con las losas hexagonales de KayKit (Medieval Hexagon Pack, CC0).
// Cada losa se guarda como «q,r» → { t: losa, tr?: giro de la losa, h?: altura, o?: objeto encima, r?: giro del objeto }.
const BASE = "/modelos/hex/";
const R = 2 / Math.sqrt(3); // radio de la losa (esquina a esquina = 2R)
const GRID_R = 13; // alcance del tablero editable
const MAX_H = 8;

const hexToWorld = (q, r) => ({ x: 2 * q + r, z: 1.5 * R * r });
const worldToHex = (x, z) => {
  const r = z / (1.5 * R);
  const q = x / (R * Math.sqrt(3)) - r / 2;
  let cx = q, cz = r, cy = -q - r;
  let rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
  const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
};
const keyOf = (q, r) => q + "," + r;
const inGrid = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= GRID_R;

// Identificadores antiguos («g», «w», «x:coast_A», «n:…», «b:…») y nuevos (ruta dentro del pack).
const tileId = (t) => {
  if (!t || t === "g") return "tiles/base/hex_grass";
  if (t === "w") return "tiles/base/hex_water";
  if (t.startsWith("x:")) {
    const n = t.slice(2);
    const d = n.startsWith("coast") ? "coast" : n.startsWith("river") ? "rivers" : n.startsWith("road") ? "roads" : "base";
    return "tiles/" + d + "/hex_" + n;
  }
  return t;
};
const objId = (o) => {
  if (!o) return null;
  if (o.startsWith("n:")) return "decoration/nature/" + o.slice(2);
  if (o.startsWith("b:")) {
    const [, n, c] = o.split(":");
    return "buildings/" + (c || "blue") + "/building_" + n + "_" + (c || "blue");
  }
  return o;
};
const isWater = (t) => tileId(t).endsWith("hex_water");
const modelUrl = (id) => BASE + id + ".gltf";
const FLAG_COLORS = { blue: "#2f6fe0", red: "#d6352f", green: "#2fae4f", yellow: "#f2b822" };
// Banderín de mesa: base redonda, asta y bandera triangular, como las fichas de un juego de tablero.
function makeProc(THREE, id) {
  const m = /^proc\/flag_(\w+)$/.exec(id);
  if (!m) return null;
  const col = FLAG_COLORS[m[1]] || FLAG_COLORS.blue;
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.32, metalness: 0.05 });
  const g = new THREE.Group();
  const add = (geo, x, y, z) => { const me = new THREE.Mesh(geo, mat); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
  add(new THREE.CylinderGeometry(0.3, 0.34, 0.12, 28), 0, 0.06, 0);
  add(new THREE.SphereGeometry(0.17, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.12, 0).scale.y = 0.8;
  add(new THREE.CylinderGeometry(0.04, 0.05, 1.0, 12), 0, 0.62, 0);
  add(new THREE.SphereGeometry(0.075, 14, 10), 0, 1.13, 0);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(0.62, 0.17); shape.lineTo(0, 0.4); shape.lineTo(0, 0);
  const flag = add(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }), 0.03, 0.66, -0.025);
  flag.rotation.y = 0;
  g.scale.setScalar(1.45);
  return g;
}
const objUp = (id) => (/cloud/.test(id) ? 3 : 0);
const objHeight = (id) => (/proc\/flag/.test(id) ? 1.3 : /buildings\/(blue|red|green|yellow)\//.test(id) ? 2.6 : /mountain/.test(id) ? 1.5 : 1.2);

// Isla inicial para que el tablero no empiece vacío.
export const starterTiles = () => {
  const t = {};
  for (let q = -6; q <= 6; q++)
    for (let r = -6; r <= 6; r++) {
      const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      if (d > 6) continue;
      t[keyOf(q, r)] = { t: d <= 3 ? "g" : "w" };
    }
  // un poco de paisaje de ejemplo para que no empiece plano (se puede quitar con la goma y la papelera)
  t["0,0"] = { t: "g", h: 1, o: "buildings/blue/building_castle_blue", r: 0 };
  t["-1,-1"] = { t: "g", h: 1 };
  t["1,-2"] = { t: "g", o: "decoration/nature/mountain_A_grass_trees", r: 2 };
  t["2,-1"] = { t: "g", o: "decoration/nature/hills_A_trees", r: 1 };
  t["-2,1"] = { t: "g", o: "decoration/nature/trees_A_large", r: 0 };
  t["-1,2"] = { t: "g", o: "decoration/nature/trees_B_medium", r: 3 };
  t["1,1"] = { t: "g", o: "buildings/blue/building_home_A_blue", r: 4 };
  t["2,0"] = { t: "g", o: "buildings/blue/building_windmill_blue", r: 1 };
  return t;
};

// ---- miniaturas de la paleta: cada modelo se dibuja una vez en un lienzo pequeño ----
let T3 = null;
const thumbCache = new Map();
let thumbChain = Promise.resolve();
async function getThree() {
  if (!T3) {
    const [THREE, { GLTFLoader }] = await Promise.all([import("three"), import("three/examples/jsm/loaders/GLTFLoader.js")]);
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(160, 160, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#ffffff", "#7a8a6a", 1.1));
    const sun = new THREE.DirectionalLight("#fff3dd", 1.7);
    sun.position.set(3, 6, 4);
    scene.add(sun);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
    T3 = { THREE, loader: new GLTFLoader(), r, scene, cam };
  }
  return T3;
}
async function renderThumb(id) {
  const { THREE, loader, r, scene, cam } = await getThree();
  const m = id.startsWith("proc/") ? makeProc(THREE, id) : (await loader.loadAsync(modelUrl(id))).scene;
  scene.add(m);
  const box = new THREE.Box3().setFromObject(m);
  const c = box.getCenter(new THREE.Vector3());
  const rad = box.getSize(new THREE.Vector3()).length() / 2;
  const half = rad * 0.82;
  cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
  cam.position.copy(c).add(new THREE.Vector3(1, 0.95, 1).normalize().multiplyScalar(rad * 3));
  cam.lookAt(c);
  cam.updateProjectionMatrix();
  r.setClearColor(0x000000, 0);
  r.render(scene, cam);
  const url = r.domElement.toDataURL("image/png");
  scene.remove(m);
  return url;
}
function getThumb(id) {
  if (!thumbCache.has(id)) thumbCache.set(id, new Promise((res) => { thumbChain = thumbChain.then(() => renderThumb(id).then(res, () => res(""))); }));
  return thumbCache.get(id);
}
function Thumb({ id }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let on = true;
    getThumb(id).then((u) => on && setSrc(u));
    return () => { on = false; };
  }, [id]);
  return src ? <img src={src} alt="" draggable={false} /> : <span className="mh-wm3-ph" />;
}

const TABS = [
  ["terreno", "Terreno"], ["caminos", "Ríos y caminos"], ["relieve", "Relieve"], ["naturaleza", "Naturaleza"], ["edificios", "Edificios"], ["estructuras", "Estructuras"], ["objetos", "Objetos"],
];

export default function World3D({ tiles, edit = false, onTiles, pins = [], renderPin, placing = false, onPlace, onGround, apiRef, onBackground }) {
  const host = useRef(null);
  const pinEls = useRef({});
  const hist = useRef([]);
  const [brush, setBrush] = useState(null); // null = mover la cámara
  const [tab, setTab] = useState("terreno");
  const [faction, setFaction] = useState("blue");
  const [q, setQ] = useState("");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);
  const [sure, setSure] = useState(false);
  const [err, setErr] = useState("");
  const live = useRef({});
  live.current = { tiles, edit, onTiles, pins, brush, faction, placing, onPlace, onGround, onBackground };

  useEffect(() => {
    let dead = false;
    let cleanup = () => {};
    (async () => {
      let THREE, GLTFLoader, OrbitControls;
      try {
        [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([import("three"), import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/controls/OrbitControls.js")]);
      } catch (e) {
        setErr("No se pudo cargar el motor 3D.");
        return;
      }
      if (dead || !host.current) return;
      const el = host.current;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.className = "mh-wm3-cv";
      Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
      el.prepend(renderer.domElement);

      const SKY = "#3d7aa8"; // el horizonte es agua: el mismo azul que las losas lejanas
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(SKY);
      scene.fog = new THREE.Fog(SKY, 60, 150);
      const cam = new THREE.PerspectiveCamera(38, 1, 0.5, 220);
      cam.position.set(0, 17, 17);
      scene.add(new THREE.HemisphereLight("#ffffff", "#6a8a5a", 0.8));
      const sun = new THREE.DirectionalLight("#fff3dd", 1.55);
      sun.position.set(14, 26, 10);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const sc = sun.shadow.camera;
      sc.left = -36; sc.right = 36; sc.top = 36; sc.bottom = -36; sc.near = 1; sc.far = 90;
      sun.shadow.bias = -0.0004;
      scene.add(sun);

      // fondo de agua bajo el tablero, a la altura de la base de las losas
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: "#3a76a2", roughness: 0.7 }));
      sea.rotation.x = -Math.PI / 2;
      sea.position.y = -1;
      sea.receiveShadow = true;
      scene.add(sea);

      const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ visible: false }));
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      const cursor = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 0.98, R * 0.98, 0.08, 6),
        new THREE.MeshBasicMaterial({ color: "#ffd86b", transparent: true, opacity: 0.5, depthWrite: false })
      );
      cursor.visible = false;
      scene.add(cursor);
      const gridPts = [];
      for (let qq = -GRID_R; qq <= GRID_R; qq++)
        for (let rr = -GRID_R; rr <= GRID_R; rr++) {
          if (!inGrid(qq, rr)) continue;
          const c = hexToWorld(qq, rr);
          for (let i = 0; i < 6; i++) {
            const a1 = Math.PI / 6 + (i * Math.PI) / 3, a2 = Math.PI / 6 + ((i + 1) * Math.PI) / 3;
            gridPts.push(c.x + Math.cos(a1) * R, 0.03, c.z + Math.sin(a1) * R, c.x + Math.cos(a2) * R, 0.03, c.z + Math.sin(a2) * R);
          }
        }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute("position", new THREE.Float32BufferAttribute(gridPts, 3));
      const grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.12 }));
      grid.visible = false;
      scene.add(grid);

      const controls = new OrbitControls(cam, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.09;
      controls.maxPolarAngle = 1.3;
      controls.minDistance = 6;
      controls.maxDistance = 70;
      controls.screenSpacePanning = false;

      const loader = new GLTFLoader();
      const cache = new Map();
      const getModel = (id) => {
        if (id.startsWith("proc/")) { if (!cache.has(id)) cache.set(id, Promise.resolve(makeProc(THREE, id))); return cache.get(id); }
        if (!cache.has(id)) cache.set(id, new Promise((res) => loader.load(modelUrl(id), (g) => res(g.scene), undefined, () => res(null))));
        return cache.get(id);
      };
      const world = new THREE.Group();
      scene.add(world);
      const placed = new Map();
      // mar de relleno: una sola malla instanciada con la losa de agua en cada hexágono vacío
      const SEA_R = 30;
      let seaInst = null;
      const seaCells = [];
      for (let qq = -SEA_R; qq <= SEA_R; qq++) for (let rr = -SEA_R; rr <= SEA_R; rr++) if (Math.max(Math.abs(qq), Math.abs(rr), Math.abs(qq + rr)) <= SEA_R) seaCells.push([qq, rr]);
      const fillSea = async (tl) => {
        if (!seaInst) {
          const wm = await getModel("tiles/base/hex_water");
          let mesh = null;
          wm && wm.traverse((o) => { if (!mesh && o.isMesh) mesh = o; });
          if (!mesh) return;
          seaInst = new THREE.InstancedMesh(mesh.geometry, mesh.material, seaCells.length);
          seaInst.receiveShadow = true;
          seaInst.frustumCulled = false;
          scene.add(seaInst);
        }
        const mtx = new THREE.Matrix4();
        let n = 0;
        for (const [qq, rr] of seaCells) {
          if (tl[keyOf(qq, rr)]) continue;
          const w = hexToWorld(qq, rr);
          mtx.makeTranslation(w.x, 0, w.z);
          seaInst.setMatrixAt(n++, mtx);
        }
        seaInst.count = n;
        seaInst.instanceMatrix.needsUpdate = true;
      };
      let dirty = true;
      const shade = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      const addModel = async (grp, id, y, rot) => {
        const base = await getModel(id);
        if (!base) return;
        const m = base.clone(true);
        shade(m);
        m.position.y = y;
        m.rotation.y = (rot * Math.PI) / 3;
        grp.add(m);
      };

      let first = true;
      // animación al colocar: la losa (o solo su objeto) cae y rebota un poco
      const anims = [];
      let animate = false; // la primera carga no se anima
      const buildTile = async (t) => {
        const grp = new THREE.Group();
        const baseG = new THREE.Group();
        const objG = new THREE.Group();
        grp.add(baseG, objG);
        grp.userData = { objG };
        const water = isWater(t.t);
        const h = water ? 0 : Math.min(MAX_H, t.h || 0);
        for (let l = 0; l < h; l++) await addModel(baseG, "tiles/base/hex_grass_bottom", l, 0);
        await addModel(baseG, tileId(t.t), h, t.tr || 0);
        const oid = objId(t.o);
        if (oid) await addModel(objG, oid, h + objUp(oid), t.r || 0);
        return grp;
      };
      const sync = async () => {
        const tl = live.current.tiles || {};
        const seen = new Set();
        // descarga en paralelo todos los modelos distintos antes de montar el mapa
        const need = new Set(["tiles/base/hex_grass_bottom"]);
        for (const k of Object.keys(tl)) { need.add(tileId(tl[k].t)); const o = objId(tl[k].o); if (o) need.add(o); }
        await Promise.all([...need].map(getModel));
        for (const k of Object.keys(tl)) {
          const t = tl[k];
          seen.add(k);
          const sig = (t.t || "g") + "|" + (t.o || "") + "|" + (t.r || 0) + "|" + (t.tr || 0) + "|" + (t.h || 0);
          const cur = placed.get(k);
          if (cur && cur.sig === sig) continue;
          const grp = await buildTile(t);
          const [qq, rr] = k.split(",").map(Number);
          const w = hexToWorld(qq, rr);
          grp.position.set(w.x, 0, w.z);
          if (cur) world.remove(cur.group);
          world.add(grp);
          placed.set(k, { sig, group: grp });
          if (animate) {
            const a0 = cur ? cur.sig.split("|") : null;
            const p = sig.split("|");
            const onlyObj = a0 && a0[0] === p[0] && a0[3] === p[3] && a0[4] === p[4] && p[1];
            anims.push({ node: onlyObj ? grp.userData.objG : grp, t0: performance.now(), drop: onlyObj ? 1.6 : 0.9 });
          }
          dirty = true;
        }
        for (const [k, v] of placed) if (!seen.has(k)) { world.remove(v.group); placed.delete(k); dirty = true; }
        await fillSea(tl);
        dirty = true;
      };
      let syncing = false, again = false;
      const runSync = () => {
        if (syncing) { again = true; return; }
        syncing = true;
        sync().catch(() => {}).finally(() => {
          syncing = false;
          if (again) { again = false; runSync(); return; }
          const L = live.current;
          if (first && Object.keys(L.tiles || {}).length) { first = false; centre(); }
          animate = true;
          setReady(true);
          dirty = true;
        });
      };
      const tickAnims = (now) => {
        for (let i = anims.length - 1; i >= 0; i--) {
          const an = anims[i];
          const p = Math.min(1, (now - an.t0) / 420);
          const c1 = 1.70158, c3 = c1 + 1;
          const back = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
          const sc = 0.45 + 0.55 * back;
          an.node.scale.set(sc, sc, sc);
          an.node.position.y = (1 - (1 - Math.pow(1 - p, 3))) * an.drop;
          if (p >= 1) { an.node.scale.set(1, 1, 1); an.node.position.y = 0; anims.splice(i, 1); }
          dirty = true;
        }
      };

      const centre = () => {
        const ks = Object.keys(live.current.tiles || {});
        if (!ks.length) return;
        let sx = 0, sz = 0;
        ks.forEach((k) => { const [qq, rr] = k.split(",").map(Number); const w = hexToWorld(qq, rr); sx += w.x; sz += w.z; });
        controls.target.set(sx / ks.length, 0, sz / ks.length);
        cam.position.set(sx / ks.length, 17, sz / ks.length + 17);
      };

      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const groundAt = (cx, cy) => {
        const b = renderer.domElement.getBoundingClientRect();
        ndc.set(((cx - b.left) / b.width) * 2 - 1, -((cy - b.top) / b.height) * 2 + 1);
        ray.setFromCamera(ndc, cam);
        const h = ray.intersectObject(ground)[0];
        return h ? { x: h.point.x, z: h.point.z } : null;
      };
      const tileTop = (x, z) => {
        const { q: qq, r: rr } = worldToHex(x, z);
        const t = (live.current.tiles || {})[keyOf(qq, rr)];
        if (!t) return 0.15;
        const water = isWater(t.t);
        const h = water ? -0.2 : t.h || 0;
        const oid = objId(t.o);
        return oid ? h + objHeight(oid) : h + 0.15;
      };
      // los marcadores se colocan siempre en el centro de una losa
      const snap = (x, z) => {
        const h = worldToHex(x, z);
        return inGrid(h.q, h.r) ? hexToWorld(h.q, h.r) : null;
      };
      if (apiRef) apiRef.current = { groundAt, tileTop, snap };

      const paint = (qq, rr) => {
        const { edit: ed, brush: br, faction: fc, onTiles: set } = live.current;
        if (!ed || !br || !set || !inGrid(qq, rr)) return;
        const k = keyOf(qq, rr);
        set((cur) => {
          const base = cur || starterTiles();
          const old = base[k];
          const put = (v) => ({ ...base, [k]: v });
          switch (br.kind) {
            case "tile": {
              let nt;
              if (old && tileId(old.t) === br.id) nt = { ...old, tr: ((old.tr || 0) + 1) % 6 };
              else nt = { ...(old || {}), t: br.id, tr: 0 };
              if (isWater(nt.t)) { delete nt.h; delete nt.o; delete nt.r; }
              return put(nt);
            }
            case "obj": {
              const id = br.id.replace(/\{c\}/g, fc);
              if (old && objId(old.o) === id) return put({ ...old, r: ((old.r || 0) + 1) % 6 });
              return put({ ...(old || { t: "g" }), o: id, r: old && old.r ? old.r : 0 });
            }
            case "rotate": {
              if (!old) return base;
              return put(old.o ? { ...old, r: ((old.r || 0) + 1) % 6 } : { ...old, tr: ((old.tr || 0) + 1) % 6 });
            }
            case "up":
            case "down": {
              if (!old || isWater(old.t)) return base;
              const h = Math.max(0, Math.min(MAX_H, (old.h || 0) + (br.kind === "up" ? 1 : -1)));
              if (h === (old.h || 0)) return base;
              return put({ ...old, h });
            }
            case "eraseObj": {
              if (!old || !old.o) return base;
              const n = { ...old };
              delete n.o; delete n.r;
              return put(n);
            }
            case "eraseTile": {
              if (!old) return base;
              const n = { ...base };
              delete n[k];
              return n;
            }
            default:
              return base;
          }
        });
      };

      let down = null;
      let lastKey = "";
      const onDown = (e) => {
        if (e.button !== 0) return;
        down = { x: e.clientX, y: e.clientY, moved: false };
        const L = live.current;
        if (L.edit && L.brush && !L.placing) {
          const g = groundAt(e.clientX, e.clientY);
          if (g) {
            const h = worldToHex(g.x, g.z);
            lastKey = keyOf(h.q, h.r);
            if (L.tiles) { hist.current.push(L.tiles); if (hist.current.length > 40) hist.current.shift(); }
            paint(h.q, h.r);
          }
        }
      };
      const onMove = (e) => {
        const L = live.current;
        const g = L.edit && (L.brush || L.placing) ? groundAt(e.clientX, e.clientY) : null;
        if (g) {
          const h = worldToHex(g.x, g.z);
          if (inGrid(h.q, h.r)) {
            const w = hexToWorld(h.q, h.r);
            if (cursor.position.x !== w.x || cursor.position.z !== w.z || !cursor.visible) { cursor.position.set(w.x, 0.06, w.z); cursor.visible = true; dirty = true; }
          } else if (cursor.visible) { cursor.visible = false; dirty = true; }
          if (down && e.buttons === 1 && L.brush && !L.placing) {
            const k = keyOf(h.q, h.r);
            if (k !== lastKey && L.brush.kind !== "rotate") { lastKey = k; paint(h.q, h.r); }
          }
        } else if (cursor.visible) { cursor.visible = false; dirty = true; }
        if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.moved = true;
      };
      const onUp = (e) => {
        const L = live.current;
        if (down && !down.moved && e.button === 0) {
          if (L.placing && L.onPlace) {
            const g = groundAt(e.clientX, e.clientY);
            const c = g && snap(g.x, g.z);
            if (c) L.onPlace({ wx: +c.x.toFixed(2), wz: +c.z.toFixed(2) });
          } else if (L.onBackground) L.onBackground();
        }
        down = null;
      };
      const onLeave = () => { if (cursor.visible) { cursor.visible = false; dirty = true; } };
      const cv = renderer.domElement;
      cv.addEventListener("pointerdown", onDown);
      cv.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      cv.addEventListener("pointerleave", onLeave);
      cv.addEventListener("contextmenu", (e) => e.preventDefault());
      controls.addEventListener("change", () => (dirty = true));

      const size = () => {
        const w = el.clientWidth || 600, h = el.clientHeight || 400;
        renderer.setSize(w, h, false);
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
        dirty = true;
      };
      const ro = new ResizeObserver(size);
      ro.observe(el);
      size();

      const v = new THREE.Vector3();
      let raf = 0;
      let lastSig = "";
      let pinSig = "";
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const L = live.current;
        const sig = L.tiles ? Object.keys(L.tiles).length + ":" + Object.values(L.tiles).map((t) => (t.t || "g") + (t.o || "") + (t.r || 0) + (t.tr || 0) + (t.h || 0)).join("") : "0";
        if (sig !== lastSig) {
          lastSig = sig;
          runSync();
        }
        const ps = L.pins.map((p) => p.id + ":" + p.wx + ":" + p.wz).join("|") + "#" + Object.keys(pinEls.current).length;
        if (ps !== pinSig) { pinSig = ps; dirty = true; }
        controls.mouseButtons.LEFT = L.edit && L.brush ? -1 : THREE.MOUSE.ROTATE;
        controls.mouseButtons.RIGHT = L.edit && L.brush ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
        grid.visible = !!(L.edit && (L.brush || L.placing));
        if (anims.length) tickAnims(performance.now());
        const moving = controls.update();
        if (moving || dirty) {
          dirty = false;
          renderer.render(scene, cam);
          const b = renderer.domElement;
          const w = b.clientWidth, h = b.clientHeight;
          for (const p of L.pins) {
            const node = pinEls.current[p.id];
            if (!node) continue;
            v.set(p.wx || 0, tileTop(p.wx || 0, p.wz || 0) + 0.2, p.wz || 0).project(cam);
            const off = v.z > 1 || v.z < -1;
            node.style.display = off ? "none" : "";
            node.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`;
          }
        }
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener("pointerup", onUp);
        controls.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        gg.dispose();
      };
    })();
    return () => { dead = true; cleanup(); if (apiRef) apiRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const facCol = HEX_COLORS.find(([k]) => k === faction)?.[0] || "blue";
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return HEX_CATALOG.filter((i) => (s ? i.label.toLowerCase().includes(s) : i.cat === tab));
  }, [q, tab]);
  const brushKey = brush ? JSON.stringify(brush) : "";
  const pickItem = (i) => {
    const isTile = i.id.startsWith("tiles/");
    const b = isTile ? { kind: "tile", id: i.id } : { kind: "obj", id: i.id };
    setBrush((cur) => (cur && JSON.stringify(cur) === JSON.stringify(b) ? null : b));
  };
  const clearAll = () => {
    if (!sure) { setSure(true); setTimeout(() => setSure(false), 4000); return; }
    setSure(false);
    if (tiles) { hist.current.push(tiles); if (hist.current.length > 40) hist.current.shift(); }
    if (onTiles) onTiles(() => ({}));
  };
  const empty = !!tiles && Object.keys(tiles).length === 0;
  const tool = (kind) => setBrush((cur) => (cur && cur.kind === kind ? null : { kind }));
  const undo = () => {
    const prev = hist.current.pop();
    if (prev && onTiles) onTiles(() => prev);
  };
  const tools = [
    ["rotate", RotateCw, "Girar una losa o su objeto (un clic cada vez)"],
    ["up", ChevronsUp, "Subir la altura de la losa"],
    ["down", ChevronsDown, "Bajar la altura de la losa"],
    ["eraseObj", Eraser, "Quitar el objeto de la losa"],
    ["eraseTile", Trash2, "Quitar la losa"],
  ];

  return (
    <div className="mh-wm3" ref={host} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {err && <div className="mh-wm3-err">{err}</div>}
      {!ready && !err && <div className="mh-wm3-load">Cargando el mundo…</div>}
      {ready && empty && <div className="mh-wm3-load" style={{ pointerEvents: "none" }}>{edit ? "El mapa está vacío. Elige una pieza y pinta sobre el tablero." : "El DJ todavía no ha construido el mapa."}</div>}
      <div className="mh-wm3-pins">
        {pins.map((p) => (
          <div key={p.id} className="mh-wm3-pin" ref={(n) => { if (n) pinEls.current[p.id] = n; else delete pinEls.current[p.id]; }}>
            {renderPin(p)}
          </div>
        ))}
      </div>
      {edit && !open && <button type="button" className="mh-wm3-open" onClick={() => setOpen(true)}>Piezas</button>}
      {edit && open && (
        <div className="mh-wm3-pal" onPointerDown={(e) => e.stopPropagation()}>
          <div className="mh-wm3-tools">
            <button type="button" className={!brush ? "is-on" : ""} onClick={() => setBrush(null)} title="Mover la cámara" aria-label="Mover la cámara"><Hand size={15} /></button>
            {tools.map(([k, Ic, t]) => (
              <button key={k} type="button" className={brush && brush.kind === k ? "is-on" : ""} onClick={() => tool(k)} title={t} aria-label={t}><Ic size={15} /></button>
            ))}
            <button type="button" onClick={undo} title="Deshacer" aria-label="Deshacer"><Undo2 size={15} /></button>
            <button type="button" onClick={() => setOpen(false)} title="Ocultar las piezas" aria-label="Ocultar las piezas"><ChevronsLeft size={15} /></button>
          </div>
          <label className="mh-wm3-search"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pieza…" aria-label="Buscar pieza" /></label>
          {!q && (
            <div className="mh-wm3-tabs">
              {TABS.map(([k, l]) => <button key={k} type="button" className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>{l}</button>)}
            </div>
          )}
          {(tab === "edificios" || tab === "objetos" || q) && (
            <div className="mh-wm3-fac" role="group" aria-label="Color del edificio">
              {HEX_COLORS.map(([k, c]) => <button key={k} type="button" className={faction === k ? "is-on" : ""} style={{ "--fc": c }} onClick={() => setFaction(k)} aria-label={"Color " + k} />)}
            </div>
          )}
          <div className="mh-wm3-list">
            {items.map((i) => {
              const id = i.id.replace(/\{c\}/g, facCol);
              const on = brushKey === JSON.stringify(i.id.startsWith("tiles/") ? { kind: "tile", id: i.id } : { kind: "obj", id: i.id });
              return (
                <button key={i.id} type="button" className={on ? "is-on" : ""} onClick={() => pickItem(i)} title={i.label}>
                  <Thumb id={id} />
                  <span>{i.label}</span>
                </button>
              );
            })}
            {items.length === 0 && <small className="mh-wm3-none">Ninguna pieza coincide.</small>}
          </div>
          <button type="button" className={"mh-wm3-clear" + (sure ? " is-sure" : "")} onClick={clearAll}><Trash2 size={13} /> {sure ? "Pulsa otra vez para vaciar todo" : "Vaciar el mapa"}</button>
          <p className="mh-wm3-hint">{brush ? "Clic o arrastra sobre el tablero. Un clic en una pieza igual la gira. Botón derecho para orbitar." : "Elige una pieza para construir."}</p>
        </div>
      )}
    </div>
  );
}
