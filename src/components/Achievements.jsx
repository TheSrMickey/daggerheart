"use client";

import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ACHIEVEMENTS } from "@/lib/achievements";

// Insignia hexagonal con marco por nivel y aviso al conseguir un logro. Solo se ven en el perfil y en el aviso.
const TIERS = {
  bronce: ["#e2a679", "#8a5530", "#3a2314"],
  plata: ["#f1f3f8", "#9aa1b3", "#2a2d3a"],
  oro: ["#ffe08a", "#d39a2c", "#3b2a08"],
  legendario: ["#e6d2ff", "#8f5be8", "#24123f"],
  bloqueado: ["#6d6d80", "#3c3c4d", "#1a1a26"],
};
const ICONS = {
  dado: <><path d="M12 2.5l8 4.6v9.8l-8 4.6-8-4.6V7.1z" /><path d="M12 2.5v19M4 7.1l8 4.6 8-4.6" /></>,
  espadas: <path d="M5 19L18 6M15 4h5v5M19 19L6 6M9 4H4v5M4 20l3-3M20 20l-3-3" />,
  libro: <><path d="M4 5.5C7 4 9.5 4.3 12 6c2.5-1.7 5-2 8-.5V19c-3-1.5-5.5-1.2-8 .5-2.5-1.7-5-2-8-.5z" /><path d="M12 6v13.5" /></>,
  mapa: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  estrella: <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />,
  corona: <path d="M3.5 18h17l1-10-5 4-4.5-7-4.5 7-5-4z" />,
  calavera: <><path d="M12 3c4.4 0 7.5 3 7.5 7 0 2.4-1.2 4-2.5 5v3.5H7V15c-1.3-1-2.5-2.6-2.5-5C4.5 6 7.6 3 12 3z" /><circle cx="9" cy="10.5" r="1.2" /><circle cx="15" cy="10.5" r="1.2" /><path d="M10.5 18.5v-2M13.5 18.5v-2" /></>,
  amanecer: <path d="M3 18h18M7 18a5 5 0 0110 0M12 5v3M5.6 9.6l2 2M18.4 9.6l-2 2M3 13.5h2M19 13.5h2" />,
  estandarte: <path d="M6 21V3M6 4h12l-3 4.5 3 4.5H6" />,
  corazon: <path d="M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0112 7.5 4.3 4.3 0 0119.5 10C19.5 15.5 12 20 12 20z" />,
  estaciones: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></>,
};

const reduced = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const AUTO_SPIN = 42; // grados por segundo al abrir una insignia (una vuelta cada ~8,5 s)
const REST = -14; // ángulo de reposo: un poco girada para que se note el grosor

// Texturas de las caras: el hueco interior del modelo (62x72 unidades del viewBox de 100). El marco, el grosor y los brillos son el modelo de Blender (public/modelos/insignia.glb).
function faceSvg(a, locked, back) {
  const t = locked ? "bloqueado" : a.tier;
  const [c1, , c3] = TIERS[t];
  const icon = back
    ? `<path transform="translate(38.5 30.45) scale(0.115)" d="M100 0C101.5 66 106 109 200 115C106 121 102 164 100 340C98 164 94 121 0 115C94 109 98.5 66 100 0Z" fill="${locked ? "#8a8a9c" : c1}" fill-opacity=".92"/>`
    : `<g transform="translate(34 34) scale(1.333)" fill="none" stroke="${locked ? "#8a8a9c" : c1}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${renderToStaticMarkup(<>{ICONS[a.icon]}</>)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="19 14 62 72" width="496" height="576"><path d="M50 14l31 18v36L50 86 19 68V32z" fill="${c3}" stroke="${c1}" stroke-opacity=".55" stroke-width="1.5"/>${icon}</svg>`;
}
const texCache = new Map();
function faceTexture(THREE, a, locked, back) {
  const key = (locked ? "L" : a.tier) + "|" + (back ? "back" : a.icon);
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement("canvas");
  cv.width = 496;
  cv.height = 576;
  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const img = new Image();
  img.onload = () => {
    cv.getContext("2d").drawImage(img, 0, 0);
    tex.needsUpdate = true;
    tex.listeners?.forEach((fn) => fn());
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(faceSvg(a, locked, back));
  tex.listeners = new Set();
  texCache.set(key, tex);
  return tex;
}
// Un único renderer WebGL compartido: cada insignia pinta su fotograma y lo copia a su propio canvas 2D (así no se agotan los contextos WebGL).
let glKit = null;
function getKit() {
  if (!glKit) {
    glKit = (async () => {
      const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([import("three"), import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/environments/RoomEnvironment.js")]);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(1);
      const pm = new THREE.PMREMGenerator(renderer);
      const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      const gltf = await new GLTFLoader().loadAsync("/modelos/insignia.glb");
      return { THREE, renderer, env, model: gltf.scene };
    })();
  }
  return glKit;
}

// Insignia en 3D (modelo de Blender). Solo con `rotatable` (el detalle abierto) gira sobre su eje vertical al deslizar a izquierda y derecha; detrás lleva el logo de la plataforma.
export function Badge({ a, locked, size = 84, rotatable = false }) {
  const cv = useRef(null);
  const draw = useRef(null);
  const st = useRef({ ang: REST, v: 0, down: false, x: 0, dist: 0, moved: false, raf: 0 });
  const apply = () => draw.current?.(st.current.ang);
  const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const px = Math.round(size * dpr);
  // Montaje: escena propia con el modelo; los materiales dependen del nivel.
  useEffect(() => {
    let dead = false;
    const disposables = [];
    const redraw = () => draw.current?.(st.current.ang);
    const texs = [];
    getKit().then(({ THREE, renderer, env, model }) => {
      if (dead || !cv.current) return;
      const t = locked ? "bloqueado" : a.tier;
      const [c1, c2] = TIERS[t];
      const scene = new THREE.Scene();
      scene.environment = env;
      const pivot = new THREE.Group();
      const m = model.clone(true);
      m.rotation.x = Math.PI / 2;
      pivot.add(m);
      scene.add(pivot);
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(-2, 3, 4);
      scene.add(key);
      const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      cam.position.set(0, 0, 3.9);
      const body = new THREE.MeshStandardMaterial({ color: new THREE.Color(locked ? "#7b7b8c" : c2).lerp(new THREE.Color(c1), locked ? 0 : 0.25), metalness: locked ? 0.45 : 0.9, roughness: locked ? 0.55 : 0.3, envMapIntensity: 1.1 });
      if (!locked && a.tier === "legendario") {
        body.emissive = new THREE.Color("#8f5be8");
        body.emissiveIntensity = 0.18;
      }
      disposables.push(body);
      const decal = (back) => {
        const map = faceTexture(THREE, a, locked, back);
        map.listeners.add(redraw);
        texs.push(map);
        const mat = new THREE.MeshStandardMaterial({ map, metalness: 0.15, roughness: 0.55, envMapIntensity: 0.5, transparent: true });
        disposables.push(mat);
        return mat;
      };
      m.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.name === "FaceF" ? decal(false) : o.name === "FaceB" ? decal(true) : body;
      });
      const ctx = cv.current.getContext("2d");
      draw.current = (ang) => {
        if (!cv.current) return;
        pivot.rotation.y = (ang * Math.PI) / 180;
        renderer.setSize(px, px, false);
        renderer.render(scene, cam);
        ctx.clearRect(0, 0, px, px);
        ctx.drawImage(renderer.domElement, 0, 0, px, px);
      };
      draw.current(st.current.ang);
    });
    return () => {
      dead = true;
      draw.current = null;
      texs.forEach((tx) => tx.listeners.delete(redraw));
      disposables.forEach((d) => d.dispose());
    };
  }, [a.id, a.tier, a.icon, locked, px]);
  // Al abrir el detalle (`rotatable`) la insignia gira sola a velocidad suave; al arrastrarla se detiene en la mano
  // y, al soltarla, sigue por inercia y retoma el giro. Con «reducir movimiento» no gira sola.
  useEffect(() => {
    const s = st.current;
    apply();
    if (!rotatable || reduced()) return undefined;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(120, now - last) / 1000;
      last = now;
      if (!s.down) {
        s.v *= 0.94;
        if (Math.abs(s.v) < 0.02) s.v = 0;
        s.ang += s.v + AUTO_SPIN * dt;
        apply();
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.raf);
  }, [rotatable]);
  const down = (e) => {
    const s = st.current;
    s.down = true; s.x = e.clientX; s.dist = 0; s.v = 0; s.moved = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const s = st.current;
    if (!s.down) return;
    const dx = e.clientX - s.x;
    s.x = e.clientX;
    s.dist += Math.abs(dx);
    if (s.dist > 4) s.moved = true;
    s.v = dx * 0.9;
    s.ang += dx * 0.9;
    apply();
  };
  const up = () => {
    st.current.down = false;
  };
  return (
    <span
      className={"ach3d" + (rotatable ? " is-rot" : "")}
      style={{ width: size, height: size }}
      {...(rotatable ? { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up } : {})}
      aria-hidden="true"
    >
      <canvas ref={cv} width={px} height={px} style={{ width: size, height: size, display: "block" }} />
    </span>
  );
}

// Aviso al conseguir un logro. Se apilan y desaparecen solos.
export function AchievementToasts() {
  const [list, setList] = useState([]);
  const seq = useRef(0);
  useEffect(() => {
    const on = (e) => {
      (e.detail?.ids || []).forEach((id) => {
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        if (!a) return;
        const key = ++seq.current;
        setList((l) => [...l, { key, a }]);
        setTimeout(() => setList((l) => l.filter((x) => x.key !== key)), 7000);
      });
    };
    window.addEventListener("mh-achievement", on);
    return () => window.removeEventListener("mh-achievement", on);
  }, []);
  if (!list.length) return null;
  return (
    <div className="ach-toasts" role="status" aria-live="polite">
      {list.map(({ key, a }) => (
        <div key={key} className="ach-toast">
          <Badge a={a} size={54} />
          <div><small>Logro conseguido</small><b>{a.name}</b><em>{a.desc}</em></div>
          <button type="button" aria-label="Ver mis logros" onClick={() => { setList((l) => l.filter((x) => x.key !== key)); window.dispatchEvent(new CustomEvent("mh-profile", { detail: { id: "me", name: "" } })); }}>Ver</button>
        </div>
      ))}
    </div>
  );
}
