"use client";

import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { getAchievements } from "@/lib/social";

// Insignias hexagonales con marco por nivel. Solo se ven en el perfil y en el aviso al conseguirlas.
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
  corazon: <path d="M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0112 7.5 4.3 4.3 0 0119.5 10C19.5 15.5 12 20 12 20z" />,
  estaciones: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></>,
};

let uid = 0;
export function Badge({ a, locked, size = 84 }) {
  const [id] = useState(() => "ab" + ++uid);
  const t = locked ? "bloqueado" : a.tier;
  const [c1, c2, c3] = TIERS[t];
  const glow = !locked && a.tier === "legendario";
  return (
    <svg className={"ach-badge" + (locked ? " is-lock" : "")} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient>
        {glow && <filter id={id + "f"} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5" /></filter>}
      </defs>
      {glow && <g filter={`url(#${id}f)`} opacity=".85"><circle cx="50" cy="50" r="38" fill={c2} /></g>}
      <path d="M50 6l38 22v44L50 94 12 72V28z" fill={`url(#${id})`} />
      <path d="M50 14l31 18v36L50 86 19 68V32z" fill={c3} stroke={c1} strokeOpacity=".55" strokeWidth="1.5" />
      <g transform="translate(34 34) scale(1.333)" fill="none" stroke={locked ? "#8a8a9c" : c1} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[a.icon]}</g>
    </svg>
  );
}

const dayEs = (t) => new Date(t).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

// Cuadrícula del perfil: todos los logros, los conseguidos en color y el resto en gris con su progreso.
export function AchievementGrid({ uid: who }) {
  const [st, setSt] = useState(null);
  useEffect(() => {
    let live = true;
    getAchievements(who).then((v) => live && setSt(v)).catch(() => live && setSt({ stats: {}, unlocked: {} }));
    return () => { live = false; };
  }, [who]);
  if (!st) return null;
  const got = ACHIEVEMENTS.filter((a) => st.unlocked[a.id]).length;
  return (
    <>
      <div className="so-lab">Logros · {got} de {ACHIEVEMENTS.length}</div>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const on = !!st.unlocked[a.id];
          const cur = Math.min(st.stats[a.stat] || 0, a.goal);
          return (
            <div key={a.id} className={"ach-it" + (on ? " is-on" : "")} title={a.desc}>
              <Badge a={a} locked={!on} />
              <b>{a.name}</b>
              <small>{on ? dayEs(st.unlocked[a.id]) : a.goal > 1 ? cur + " de " + a.goal : "Bloqueado"}</small>
            </div>
          );
        })}
      </div>
    </>
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
