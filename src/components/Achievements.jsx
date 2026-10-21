"use client";

import { useEffect, useRef, useState } from "react";
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

const HEX = "M50 6l38 22v44L50 94 12 72V28z";
const reduced = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const AUTO_SPIN = 42; // grados por segundo al abrir una insignia (una vuelta cada ~8,5 s)
const REST = -14; // ángulo de reposo: un poco girada para que se note el grosor

// Cara de la insignia (plana). La parte 3D la compone `Badge` apilando rebanadas para dar grosor.
let uid = 0;
function Face({ a, locked, size, back }) {
  const [id] = useState(() => "ab" + ++uid);
  const t = locked ? "bloqueado" : a.tier;
  const [c1, c2, c3] = TIERS[t];
  const glow = !locked && a.tier === "legendario" && !back;
  return (
    <svg className="ach3d-face" style={back ? { transform: "rotateY(180deg)" } : undefined} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient>
        {glow && <filter id={id + "f"} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5" /></filter>}
      </defs>
      {glow && <g filter={`url(#${id}f)`} opacity=".85"><circle cx="50" cy="50" r="38" fill={c2} /></g>}
      <path d={HEX} fill={`url(#${id})`} />
      <path d="M50 14l31 18v36L50 86 19 68V32z" fill={c3} stroke={c1} strokeOpacity=".55" strokeWidth="1.5" />
      {back && <path transform="translate(38.5 30.45) scale(0.115)" d="M100 0C101.5 66 106 109 200 115C106 121 102 164 100 340C98 164 94 121 0 115C94 109 98.5 66 100 0Z" fill={locked ? "#8a8a9c" : c1} fillOpacity=".92" />}
      {!back && <g transform="translate(34 34) scale(1.333)" fill="none" stroke={locked ? "#8a8a9c" : c1} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[a.icon]}</g>}
    </svg>
  );
}

// Insignia en 3D con grosor. Solo con `rotatable` (el detalle abierto) gira sobre su eje vertical al deslizar a izquierda y derecha; detrás lleva el logo de la plataforma.
export function Badge({ a, locked, size = 84, rotatable = false }) {
  const t = locked ? "bloqueado" : a.tier;
  const rim = TIERS[t][1];
  const thick = Math.max(5, Math.round(size * 0.14));
  const half = thick / 2;
  const el = useRef(null);
  const st = useRef({ ang: REST, v: 0, down: false, x: 0, dist: 0, moved: false, raf: 0, timer: 0 });
  const apply = () => { if (el.current) el.current.style.transform = `rotateY(${st.current.ang}deg)`; };
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
        // Gira más deprisa al pasar de canto (cuando la insignia se queda en una tira) y más despacio de cara, para que no parezca que se encoge.
        s.ang += s.v + AUTO_SPIN * dt * (0.45 + 1.3 * Math.abs(Math.sin((s.ang * Math.PI) / 180)));
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
  const slices = Array.from({ length: thick }, (_, i) => i);
  return (
    <span
      className={"ach3d" + (locked ? " is-lock" : "") + (rotatable ? " is-rot" : "")}
      style={{ width: size, height: size, perspective: size * 5 }}
      {...(rotatable ? { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up } : {})}
      aria-hidden="true"
    >
      <span className="ach3d-in" ref={el}>
        {slices.map((i) => (
          <svg key={i} className="ach3d-slice" style={{ transform: `translateZ(${-half + i + 0.5}px)` }} viewBox="0 0 100 100" width={size} height={size}>
            <path d={HEX} fill={rim} style={{ filter: `brightness(${0.78 + (i / thick) * 0.22})` }} />
          </svg>
        ))}
        <span className="ach3d-f" style={{ transform: `translateZ(${half + 0.5}px)` }}><Face a={a} locked={locked} size={size} /></span>
        <span className="ach3d-f" style={{ transform: `translateZ(${-half - 0.5}px) rotateY(180deg)` }}><Face a={a} locked={locked} size={size} back /></span>
      </span>
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
