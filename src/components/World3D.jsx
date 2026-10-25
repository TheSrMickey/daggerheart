"use client";

import { useEffect, useRef, useState } from "react";
import { Hand, Eraser, Trees, Castle, Waves } from "lucide-react";

// Mapa de mundo en 3D con las losas hexagonales de KayKit (Medieval Hexagon Pack, CC0).
// Cada losa se guarda como «q,r» → { t: "g" | "w", o?: "n:mountain_A" | "b:castle:blue", r?: 0..5 }.
const BASE = "/modelos/hex/";
const R = 2 / Math.sqrt(3); // radio de la losa (esquina a esquina = 2R)
const GRID_R = 13; // alcance del tablero editable

const hexToWorld = (q, r) => ({ x: 2 * q + r, z: 1.5 * R * r });
const worldToHex = (x, z) => {
  const r = z / (1.5 * R);
  const q = x / (R * Math.sqrt(3)) - r / 2;
  // redondeo cúbico
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

export const NATURE = [
  ["trees_A_small", "Arbolillos"], ["trees_A_medium", "Bosque"], ["trees_A_large", "Bosque denso"], ["trees_B_medium", "Bosque (B)"], ["trees_B_large", "Bosque denso (B)"],
  ["tree_single_A", "Árbol"], ["hills_A", "Colinas"], ["hills_B", "Colinas (B)"], ["hills_C_trees", "Colinas con árboles"],
  ["mountain_A", "Montaña"], ["mountain_B", "Montaña (B)"], ["mountain_C", "Montaña (C)"], ["mountain_A_grass_trees", "Montaña verde"], ["mountain_B_grass", "Montaña verde (B)"],
  ["rock_single_A", "Roca"], ["rock_single_C", "Roca (C)"],
];
export const BUILDINGS = [
  ["castle", "Castillo"], ["church", "Iglesia"], ["home_A", "Casa"], ["home_B", "Casa (B)"], ["tavern", "Taberna"], ["market", "Mercado"], ["blacksmith", "Herrería"],
  ["mine", "Mina"], ["lumbermill", "Aserradero"], ["windmill", "Molino"], ["watermill", "Molino de agua"], ["tower_A", "Torre"], ["barracks", "Cuartel"], ["well", "Pozo"],
];
export const FACTIONS = [["blue", "#4F86D6"], ["red", "#D9544E"], ["green", "#5FAE5B"], ["yellow", "#E3B04B"]];
const OBJ_H = { n: 1.3, b: 2.6 };

const objUrl = (o) => {
  const p = o.split(":");
  return p[0] === "b" ? BASE + "build/building_" + p[1] + "_" + (p[2] || "blue") + ".gltf" : BASE + "nature/" + p[1] + ".gltf";
};
const tileUrl = (t) => BASE + "tiles/" + (t === "w" ? "hex_water" : "hex_grass") + ".gltf";

// Isla inicial para que el tablero no empiece vacío.
export const starterTiles = () => {
  const t = {};
  for (let q = -6; q <= 6; q++)
    for (let r = -6; r <= 6; r++) {
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > 6) continue;
      const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      t[keyOf(q, r)] = { t: d <= 3 ? "g" : "w" };
    }
  return t;
};

export default function World3D({ tiles, edit = false, onTiles, pins = [], renderPin, placing = false, onPlace, onGround, apiRef, onBackground }) {
  const host = useRef(null);
  const S = useRef({}); // estado de three.js
  const pinEls = useRef({});
  const [brush, setBrush] = useState(null); // null = mover cámara
  const [tab, setTab] = useState("terreno");
  const [faction, setFaction] = useState("blue");
  const [ready, setReady] = useState(false);
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

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#9fc9e8");
      scene.fog = new THREE.Fog("#9fc9e8", 45, 110);
      const cam = new THREE.PerspectiveCamera(38, 1, 0.5, 200);
      cam.position.set(0, 17, 17);
      scene.add(new THREE.HemisphereLight("#ffffff", "#6a8a5a", 0.75));
      const sun = new THREE.DirectionalLight("#fff3dd", 1.5);
      sun.position.set(14, 26, 10);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const sc = sun.shadow.camera;
      sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 80;
      sun.shadow.bias = -0.0004;
      scene.add(sun);

      // mar bajo el tablero
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: "#4b8fc4", roughness: 0.6 }));
      sea.rotation.x = -Math.PI / 2;
      sea.position.y = -0.3;
      sea.receiveShadow = true;
      scene.add(sea);

      // suelo invisible para apuntar con el ratón y rejilla tenue al editar
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ visible: false }));
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      const cursor = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 0.98, R * 0.98, 0.06, 6),
        new THREE.MeshBasicMaterial({ color: "#ffd86b", transparent: true, opacity: 0.45, depthWrite: false })
      );
      cursor.visible = false;
      scene.add(cursor);
      const gridPts = [];
      for (let q = -GRID_R; q <= GRID_R; q++)
        for (let r = -GRID_R; r <= GRID_R; r++) {
          if (!inGrid(q, r)) continue;
          const c = hexToWorld(q, r);
          for (let i = 0; i < 6; i++) {
            const a1 = Math.PI / 6 + (i * Math.PI) / 3, a2 = Math.PI / 6 + ((i + 1) * Math.PI) / 3;
            gridPts.push(c.x + Math.cos(a1) * R, 0.03, c.z + Math.sin(a1) * R, c.x + Math.cos(a2) * R, 0.03, c.z + Math.sin(a2) * R);
          }
        }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute("position", new THREE.Float32BufferAttribute(gridPts, 3));
      const grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.1 }));
      grid.visible = false;
      scene.add(grid);

      const controls = new OrbitControls(cam, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.09;
      controls.maxPolarAngle = 1.25;
      controls.minDistance = 7;
      controls.maxDistance = 60;
      controls.screenSpacePanning = false;
      controls.target.set(0, 0, 0);

      // ---- carga de modelos ----
      const loader = new GLTFLoader();
      const cache = new Map();
      const getModel = (url) => {
        if (!cache.has(url)) cache.set(url, new Promise((res) => loader.load(url, (g) => res(g.scene), undefined, () => res(null))));
        return cache.get(url);
      };
      const world = new THREE.Group();
      scene.add(world);
      const placed = new Map(); // clave → { sig, group }
      let dirty = true;
      const shade = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

      const sync = async () => {
        const tl = live.current.tiles || {};
        const seen = new Set();
        for (const k of Object.keys(tl)) {
          const t = tl[k];
          seen.add(k);
          const sig = (t.t || "g") + "|" + (t.o || "") + "|" + (t.r || 0);
          const cur = placed.get(k);
          if (cur && cur.sig === sig) continue;
          if (cur) world.remove(cur.group);
          const grp = new THREE.Group();
          const [q, r] = k.split(",").map(Number);
          const w = hexToWorld(q, r);
          grp.position.set(w.x, 0, w.z);
          placed.set(k, { sig, group: grp });
          world.add(grp);
          const base = await getModel(tileUrl(t.t));
          if (base) { const m = base.clone(true); shade(m); grp.add(m); }
          if (t.o) {
            const om = await getModel(objUrl(t.o));
            if (om) { const m = om.clone(true); shade(m); m.rotation.y = ((t.r || 0) * Math.PI) / 3; grp.add(m); }
          }
          dirty = true;
        }
        for (const [k, v] of placed) if (!seen.has(k)) { world.remove(v.group); placed.delete(k); dirty = true; }
      };

      const centre = () => {
        const ks = Object.keys(live.current.tiles || {});
        if (!ks.length) return;
        let sx = 0, sz = 0;
        ks.forEach((k) => { const [q, r] = k.split(",").map(Number); const w = hexToWorld(q, r); sx += w.x; sz += w.z; });
        controls.target.set(sx / ks.length, 0, sz / ks.length);
        cam.position.set(sx / ks.length, 17, sz / ks.length + 17);
      };

      // ---- ratón ----
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const groundAt = (cx, cy) => {
        const b = renderer.domElement.getBoundingClientRect();
        ndc.set(((cx - b.left) / b.width) * 2 - 1, -((cy - b.top) / b.height) * 2 + 1);
        ray.setFromCamera(ndc, cam);
        const h = ray.intersectObject(ground)[0];
        return h ? { x: h.point.x, z: h.point.z } : null;
      };
      S.current.groundAt = groundAt;
      if (apiRef) apiRef.current = { groundAt, tileTop: (x, z) => tileTop(x, z) };
      const tileTop = (x, z) => {
        const { q, r } = worldToHex(x, z);
        const t = (live.current.tiles || {})[keyOf(q, r)];
        return t && t.o ? OBJ_H[t.o[0]] || 1 : t && t.t === "w" ? -0.1 : 0.15;
      };

      const paint = (q, r) => {
        const { edit: ed, brush: br, faction: fc, onTiles: set } = live.current;
        if (!ed || !br || !set || !inGrid(q, r)) return;
        const k = keyOf(q, r);
        set((cur) => {
          const base = cur && Object.keys(cur).length ? cur : starterTiles();
          const old = base[k];
          let nt;
          if (br.kind === "terrain") nt = { t: br.t };
          else if (br.kind === "erase") nt = old ? { t: old.t } : null;
          else {
            if (old && old.t === "w") return base; // nada de edificios sobre el agua
            const o = br.kind === "build" ? "b:" + br.name + ":" + fc : "n:" + br.name;
            nt = { t: old ? old.t : "g", o, r: old && old.o === o ? ((old.r || 0) + 1) % 6 : old && old.r ? old.r : 0 };
          }
          if (!nt) return base;
          if (old && old.t === nt.t && old.o === nt.o && (old.r || 0) === (nt.r || 0)) return base;
          return { ...base, [k]: nt };
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
          if (g) { const h = worldToHex(g.x, g.z); lastKey = keyOf(h.q, h.r); paint(h.q, h.r); }
        }
      };
      const onMove = (e) => {
        const L = live.current;
        const g = L.edit && (L.brush || L.placing) ? groundAt(e.clientX, e.clientY) : null;
        if (g) {
          const h = worldToHex(g.x, g.z);
          if (inGrid(h.q, h.r)) {
            const w = hexToWorld(h.q, h.r);
            if (cursor.position.x !== w.x || cursor.position.z !== w.z || !cursor.visible) { cursor.position.set(w.x, 0.05, w.z); cursor.visible = true; dirty = true; }
          } else if (cursor.visible) { cursor.visible = false; dirty = true; }
          if (down && e.buttons === 1 && L.brush && !L.placing) {
            const k = keyOf(h.q, h.r);
            if (k !== lastKey) { lastKey = k; paint(h.q, h.r); }
          }
        } else if (cursor.visible) { cursor.visible = false; dirty = true; }
        if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.moved = true;
      };
      const onUp = (e) => {
        const L = live.current;
        if (down && !down.moved && e.button === 0) {
          if (L.placing && L.onPlace) {
            const g = groundAt(e.clientX, e.clientY);
            if (g) L.onPlace({ wx: +g.x.toFixed(2), wz: +g.z.toFixed(2) });
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

      // ---- bucle ----
      const v = new THREE.Vector3();
      let raf = 0;
      let lastSig = "";
      let pinSig = "";
      let first = true;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const L = live.current;
        const sig = L.tiles ? Object.keys(L.tiles).length + ":" + Object.values(L.tiles).map((t) => (t.t || "g") + (t.o || "") + (t.r || 0)).join("") : "0";
        if (sig !== lastSig) {
          lastSig = sig;
          sync().then(() => { if (first && Object.keys(L.tiles || {}).length) { first = false; centre(); } setReady(true); dirty = true; });
        }
        const ps = L.pins.map((p) => p.id + ":" + p.wx + ":" + p.wz).join("|") + "#" + Object.keys(pinEls.current).length;
        if (ps !== pinSig) { pinSig = ps; dirty = true; }
        controls.mouseButtons.LEFT = L.edit && L.brush ? -1 : THREE.MOUSE.ROTATE;
        controls.mouseButtons.RIGHT = L.edit && L.brush ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
        grid.visible = !!(L.edit && (L.brush || L.placing));
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

  const tabs = [["terreno", "Terreno", Waves], ["natura", "Naturaleza", Trees], ["edificios", "Edificios", Castle]];
  const pick = (b) => setBrush((cur) => (cur && JSON.stringify(cur) === JSON.stringify(b) ? null : b));
  const isOn = (b) => brush && JSON.stringify(brush) === JSON.stringify(b);

  return (
    <div className="mh-wm3" ref={host} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {err && <div className="mh-wm3-err">{err}</div>}
      {!ready && !err && <div className="mh-wm3-load">Cargando el mundo…</div>}
      <div className="mh-wm3-pins">
        {pins.map((p) => (
          <div key={p.id} className="mh-wm3-pin" ref={(n) => { if (n) pinEls.current[p.id] = n; else delete pinEls.current[p.id]; }}>
            {renderPin(p)}
          </div>
        ))}
      </div>
      {edit && (
        <div className="mh-wm3-pal" onPointerDown={(e) => e.stopPropagation()}>
          <div className="mh-wm3-tools">
            <button type="button" className={!brush ? "is-on" : ""} onClick={() => setBrush(null)} title="Mover la cámara"><Hand size={14} /></button>
            <button type="button" className={brush?.kind === "erase" ? "is-on" : ""} onClick={() => pick({ kind: "erase" })} title="Quitar el objeto de una losa"><Eraser size={14} /></button>
          </div>
          <div className="mh-wm3-tabs">
            {tabs.map(([k, l, Ic]) => (
              <button key={k} type="button" className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}><Ic size={13} /> {l}</button>
            ))}
          </div>
          <div className="mh-wm3-list">
            {tab === "terreno" && (
              <>
                <button type="button" className={isOn({ kind: "terrain", t: "g" }) ? "is-on" : ""} onClick={() => pick({ kind: "terrain", t: "g" })}>Hierba</button>
                <button type="button" className={isOn({ kind: "terrain", t: "w" }) ? "is-on" : ""} onClick={() => pick({ kind: "terrain", t: "w" })}>Agua</button>
              </>
            )}
            {tab === "natura" && NATURE.map(([k, l]) => (
              <button key={k} type="button" className={isOn({ kind: "nature", name: k }) ? "is-on" : ""} onClick={() => pick({ kind: "nature", name: k })}>{l}</button>
            ))}
            {tab === "edificios" && (
              <>
                <div className="mh-wm3-fac">
                  {FACTIONS.map(([k, c]) => <button key={k} type="button" className={faction === k ? "is-on" : ""} style={{ "--fc": c }} onClick={() => setFaction(k)} aria-label={"Color " + k} />)}
                </div>
                {BUILDINGS.map(([k, l]) => (
                  <button key={k} type="button" className={isOn({ kind: "build", name: k }) ? "is-on" : ""} onClick={() => pick({ kind: "build", name: k })}>{l}</button>
                ))}
              </>
            )}
          </div>
          <p className="mh-wm3-hint">{brush ? "Clic o arrastra sobre el tablero · clic otra vez en un objeto para girarlo · botón derecho para orbitar" : "Elige una pieza para construir"}</p>
        </div>
      )}
    </div>
  );
}
