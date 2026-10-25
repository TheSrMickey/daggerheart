"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Sparkles, RotateCw, X, Eye, Pause, Play, Lock } from "lucide-react";
import { useSocial } from "./Social";
import { getAchievements } from "@/lib/social";
import { CardFace } from "./Cards";
import { DicePage } from "./DiceSkins";

// Reversos de carta. Sin texto: solo el logo de la plataforma (la estrella de cuatro puntas) sobre los colores de Enaris.
export const CARD_BACKS = [
  { key: "noche", label: "Noche y oro", desc: "Azul noche liso con la estrella dorada y un único filete. Sobrio, como el resto de la interfaz. Es el reverso por defecto.", color: "#6f9bff" },
  { key: "clasico", label: "Clásico Enaris", desc: "El logo dorado sobre un emblema, con marco doble y trama de rombos. Se adapta al modo claro y al oscuro.", color: "#E3B04B", req: "founder", reward: "Desde los comienzos" },
];
export const DEFAULT_BACK = "noche";
export const CARD_BACK_KEYS = CARD_BACKS.map((b) => b.key);

const STAR = "M100 0C101.5 66 106 109 200 115C106 121 102 164 100 340C98 164 94 121 0 115C94 109 98.5 66 100 0Z";

// Modo claro u oscuro de la aplicación (atributo del <html>).
function useLight() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setLight(el.getAttribute("data-mh-theme") === "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["data-mh-theme"] });
    return () => mo.disconnect();
  }, []);
  return light;
}

export function CardBack({ kind = "clasico", edge }) {
  const uid = useId().replace(/[^a-z0-9]/gi, "");
  const light = useLight();
  const u = (n) => n + uid;
  const star = (x, y, sc, fill, extra = {}) => (
    <use href={"#" + u("st")} fill={fill} transform={"translate(" + x + " " + y + ") scale(" + sc + ") translate(-100 -170)"} {...extra} />
  );
  const defs = (
    <defs>
      <path id={u("st")} d={STAR} />
      <linearGradient id={u("gd")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFF1C4" />
        <stop offset=".5" stopColor="#E3B04B" />
        <stop offset="1" stopColor="#A9791F" />
      </linearGradient>
      <linearGradient id={u("gl")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#E9C46A" />
        <stop offset=".55" stopColor="#B8892F" />
        <stop offset="1" stopColor="#7A5416" />
      </linearGradient>
      <radialGradient id={u("bgd")} cx=".5" cy=".42" r=".85">
        <stop offset="0" stopColor="#2a1f58" />
        <stop offset=".55" stopColor="#15122f" />
        <stop offset="1" stopColor="#0a091c" />
      </radialGradient>
      <radialGradient id={u("bgl")} cx=".5" cy=".42" r=".85">
        <stop offset="0" stopColor="#FFFDF7" />
        <stop offset=".6" stopColor="#F6EEDC" />
        <stop offset="1" stopColor="#E7DCC3" />
      </radialGradient>
      <linearGradient id={u("bgn")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#131329" />
        <stop offset="1" stopColor="#0a0a1c" />
      </linearGradient>
      <pattern id={u("lat")} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M0 0H22M0 0V22" stroke={light ? "#B8892F" : "#E3B04B"} strokeOpacity={light ? 0.16 : 0.1} strokeWidth="1" />
      </pattern>
      <radialGradient id={u("fade")} cx=".5" cy=".5" r=".62">
        <stop offset=".25" stopColor="#000" />
        <stop offset="1" stopColor="#fff" />
      </radialGradient>
      <mask id={u("mk")}>
        <rect width="300" height="420" fill={"url(#" + u("fade") + ")"} />
      </mask>
      <radialGradient id={u("glow")} cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor="#E3B04B" stopOpacity={light ? 0.35 : 0.45} />
        <stop offset="1" stopColor="#E3B04B" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
  let body;
  if (kind === "noche") {
    body = (
      <>
        <rect width="300" height="420" rx="22" fill={"url(#" + u("bgn") + ")"} />
        <rect x="1" y="1" width="298" height="418" rx="21" fill="none" stroke={edge || "#E3B04B"} strokeOpacity=".8" strokeWidth="2" />
        <rect x="12" y="12" width="276" height="396" rx="14" fill="none" stroke="#24244a" strokeWidth="1.5" />
        {star(150, 210, 0.42, "url(#" + u("gd") + ")", { style: { filter: "drop-shadow(0 0 10px #E3B04B88)" } })}
      </>
    );
  } else {
    const k = light ? "#B8892F" : "#E3B04B";
    body = (
      <>
        <rect width="300" height="420" rx="22" fill={"url(#" + u(light ? "bgl" : "bgd") + ")"} />
        <rect width="300" height="420" rx="22" fill={"url(#" + u("lat") + ")"} mask={"url(#" + u("mk") + ")"} />
        <rect x="1" y="1" width="298" height="418" rx="21" fill="none" stroke={edge || k} strokeOpacity=".85" strokeWidth="2" />
        <rect x="14" y="14" width="272" height="392" rx="14" fill="none" stroke={edge || k} strokeOpacity=".55" strokeWidth="1.5" />
        <rect x="21" y="21" width="258" height="378" rx="10" fill="none" stroke={edge || k} strokeOpacity=".22" />
        {[[34, 34], [266, 34], [34, 386], [266, 386]].map(([x, y]) => <g key={x + "-" + y}>{star(x, y, 0.055, k)}</g>)}
        <circle cx="150" cy="210" r="124" fill={"url(#" + u("glow") + ")"} />
        <circle cx="150" cy="210" r="96" fill="none" stroke={k} strokeOpacity={light ? 0.4 : 0.28} strokeDasharray="2 6" strokeWidth="1.5" />
        <path d="M150 104v10M150 306v10M44 210h10M246 210h10" stroke={k} strokeOpacity=".55" strokeWidth="1.5" />
        <circle cx="150" cy="210" r="72" fill={light ? "#FFFCF3" : "#0d0b21"} stroke={k} strokeWidth="3.5" />
        <circle cx="150" cy="210" r="65" fill="none" stroke={k} strokeOpacity=".38" />
        {star(150, 210, 0.31, "url(#" + u(light ? "gl" : "gd") + ")", { style: { filter: light ? "drop-shadow(0 2px 4px #7A541655)" : "drop-shadow(0 0 8px #E3B04Bcc)" } })}
      </>
    );
  }
  return (
    <svg className="mh-cback" viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {defs}
      {body}
    </svg>
  );
}

const THICK = 3; // grosor de la carta en píxeles (una carta real mide ~0,3 mm de 63: aquí algo exagerado para que el canto se vea)
const STEP = 0.5; // un corte cada medio píxel: sin huecos entre cortes aunque el canto se vea casi de lado

// Carta con dos caras y canto que se puede girar en 3D: arrastrando, con giro automático o saltando al frente / reverso.
export function FlipCard({ front, back, startBack = true }) {
  const inRef = useRef(null);
  const st = useRef({ x: -8, y: startBack ? 180 : 0, vy: 0, vx: 0, drag: false, lx: 0, ly: 0, auto: true, target: null });
  const [auto, setAuto] = useState(true);
  const paint = () => {
    const s = st.current;
    if (inRef.current) inRef.current.style.transform = "rotateX(" + s.x + "deg) rotateY(" + s.y + "deg)";
  };
  useEffect(() => {
    let raf;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      const s = st.current;
      if (s.target !== null) {
        s.y += (s.target - s.y) * 0.14;
        s.x += (-8 - s.x) * 0.14;
        if (Math.abs(s.target - s.y) < 0.4) { s.y = s.target; s.target = null; }
      } else if (!s.drag) {
        if (Math.abs(s.vy) > 0.02 || Math.abs(s.vx) > 0.02) {
          s.y += s.vy; s.x = Math.max(-24, Math.min(24, s.x + s.vx));
          s.vy *= 0.94; s.vx *= 0.9;
        } else if (s.auto && !reduce) s.y += 0.6;
      }
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const down = (e) => {
    const s = st.current;
    s.drag = true; s.target = null; s.lx = e.clientX; s.ly = e.clientY; s.vy = 0; s.vx = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const s = st.current;
    if (!s.drag) return;
    const dx = e.clientX - s.lx, dy = e.clientY - s.ly;
    s.lx = e.clientX; s.ly = e.clientY;
    s.y += dx * 0.7; s.x = Math.max(-24, Math.min(24, s.x - dy * 0.35));
    s.vy = dx * 0.7; s.vx = -dy * 0.35;
  };
  const up = () => { st.current.drag = false; };
  const turn = (deg) => { const s = st.current; const base = Math.round(s.y / 360) * 360; s.target = base + deg; s.vy = 0; s.vx = 0; };
  const toggleAuto = () => { st.current.auto = !st.current.auto; setAuto(st.current.auto); };
  return (
    <div className="mh-flip3d-wrap">
      <div className="mh-flip3d" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img" aria-label="Carta que puedes girar arrastrando">
        <div className="mh-flip3d-in" ref={inRef}>
          {Array.from({ length: Math.round(THICK / STEP) + 1 }, (_, i) => (
            <div key={i} className={"mh-flip3d-sl" + (i % 2 ? " is-alt" : "")} style={{ transform: "translateZ(" + (i * STEP - THICK / 2) + "px)" }} />
          ))}
          <div className="mh-flip3d-f">{front}</div>
          <div className="mh-flip3d-f is-back">{back}</div>
        </div>
      </div>
      <div className="mh-flip3d-ctl">
        <button type="button" className="mh-btn-ghost" onClick={() => turn(0)}><Eye size={14} /> Frente</button>
        <button type="button" className="mh-btn-ghost" onClick={() => turn(180)}><RotateCw size={14} /> Reverso</button>
        <button type="button" className="mh-btn-ghost" onClick={toggleAuto} aria-pressed={auto}>{auto ? <Pause size={14} /> : <Play size={14} />} Giro automático</button>
      </div>
      <p className="mh-flip3d-hint">Arrastra la carta para girarla en 3D.</p>
    </div>
  );
}

function Preview({ back, sample, icons, FitTitle, FitBox, equipped, locked, onEquip, onClose, cardBorder }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const front = sample ? <CardFace c={sample} I={icons[sample.domain]} FitTitle={FitTitle} FitBox={FitBox} /> : <div className="mh-flip3d-nofront" />;
  return createPortal(
    <div className="mh-cbp-bg" onClick={onClose}>
      <div className="mh-cbp" role="dialog" aria-label={"Previsualización de " + back.label} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mh-cbp-x" onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
        <h3 className="mh-serif">{back.label}</h3>
        <FlipCard front={front} back={<CardBack kind={back.key} edge={cardBorder === "domain" && sample ? sample.color : undefined} />} />
        {locked && <p className="mh-cb-lock"><Lock size={13} /> Recompensa del logro legendario «{back.reward}».</p>}
        <button type="button" className="mh-btn mh-dice-btn" disabled={equipped || locked} onClick={() => onEquip(back.key)}>
          {equipped ? <><Check size={15} /> Equipado</> : locked ? <><Lock size={15} /> Bloqueado</> : <><Sparkles size={15} /> Equipar este reverso</>}
        </button>
      </div>
    </div>,
    document.querySelector(".mh-root") || document.body
  );
}

function BacksGrid({ back, onEquip, owned, items, icons, FitTitle, FitBox, cardBorder, onCardBorder }) {
  const [view, setView] = useState(null);
  const sample = (items || []).find((c) => c.kind === "dominio" && c.image) || null;
  const cur = CARD_BACKS.find((b) => b.key === view);
  return (
    <>
      <div className="mh-dice-h">
        <p>Elige el reverso de tus cartas. Pulsa «Previsualizar» para girar una carta en 3D y ver cómo queda.</p>
      </div>
      <div className="mh-cbd" role="group" aria-label="Borde de las cartas">
        <div className="mh-cbd-t">
          <b>Borde de las cartas</b>
          <small>{cardBorder === "domain" ? "Cada carta lleva el borde del color de su dominio. En la previsualización, el reverso se pinta del mismo color que el frente." : "Frente y reverso llevan el mismo marco dorado."}</small>
        </div>
        <div className="mh-pers-tabs" role="radiogroup" aria-label="Color del borde">
          <button type="button" role="radio" aria-checked={cardBorder !== "domain"} className={cardBorder !== "domain" ? "is-on" : ""} onClick={() => onCardBorder && onCardBorder("gold")}>Dorado</button>
          <button type="button" role="radio" aria-checked={cardBorder === "domain"} className={cardBorder === "domain" ? "is-on" : ""} onClick={() => onCardBorder && onCardBorder("domain")}>Color del dominio</button>
        </div>
      </div>
      <div className="mh-dice-grid mh-cb-grid">
        {CARD_BACKS.map((b) => {
          const on = back === b.key;
          const locked = !!b.req && !owned.has(b.req);
          return (
            <div key={b.key} className={"mh-dice-card mh-cb-card" + (on ? " is-on" : "") + (locked ? " is-locked" : "")} style={{ "--dc": b.color }}>
              <button type="button" className="mh-cb-thumb" onClick={() => setView(b.key)} aria-label={"Previsualizar " + b.label}>
                <span className="mh-cb-art"><CardBack kind={b.key} /></span>
                {on && <span className="mh-dice-badge"><Check size={12} strokeWidth={3} /> Equipado</span>}
                {locked && <span className="mh-dice-badge is-lock"><Lock size={12} strokeWidth={2.5} /> Bloqueado</span>}
              </button>
              <div className="mh-dice-body">
                <h3 className="mh-serif">{b.label}</h3>
                <p>{b.desc}</p>
                {b.req && <p className="mh-cb-lock"><Lock size={12} /> {locked ? "Se desbloquea con el logro legendario «" + b.reward + "»." : "Desbloqueado con el logro «" + b.reward + "»."}</p>}
                <div className="mh-cb-btns">
                  <button type="button" className="mh-btn-ghost" onClick={() => setView(b.key)}><RotateCw size={15} /> Previsualizar</button>
                  <button type="button" className={"mh-btn mh-dice-btn" + (on ? " is-on" : "")} disabled={on || locked} onClick={() => onEquip(b.key)}>
                    {on ? <><Check size={15} /> Equipado</> : locked ? <><Lock size={15} /> Bloqueado</> : <><Sparkles size={15} /> Equipar</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {cur && <Preview cardBorder={cardBorder} back={cur} sample={sample} icons={icons} FitTitle={FitTitle} FitBox={FitBox} equipped={back === cur.key} locked={!!cur.req && !owned.has(cur.req)} onEquip={onEquip} onClose={() => setView(null)} />}
    </>
  );
}

// Logros desbloqueados de la cuenta (para los reversos que son recompensa).
function useOwned() {
  const me = useSocial().me;
  const [owned, setOwned] = useState(null);
  useEffect(() => {
    if (!me) return undefined;
    let live = true;
    const load = () => getAchievements(me.id).then((a) => live && setOwned(new Set(Object.keys(a.unlocked || {})))).catch(() => live && setOwned(new Set()));
    load();
    window.addEventListener("mh-achievement", load);
    return () => { live = false; window.removeEventListener("mh-achievement", load); };
  }, [me?.id]);
  return owned;
}

// Reverso que se usa de verdad: si el equipado es una recompensa que la cuenta no tiene, vale el de por defecto.
export const effectiveBack = (key, owned) => {
  const b = CARD_BACKS.find((x) => x.key === key);
  return !b || (b.req && owned && !owned.has(b.req)) ? DEFAULT_BACK : key;
};

// Pestaña «Personalización»: dados y reversos de carta.
export function Personalizacion({ skin, onEquip, back, onEquipBack, items, icons, FitTitle, FitBox, cardBorder, onCardBorder }) {
  const [tab, setTab] = useState("dados");
  const owned = useOwned();
  const own = owned || new Set();
  return (
    <div className="mh-dice-page">
      <div className="mh-dice-h">
        <h1 className="mh-serif">Personalización</h1>
      </div>
      <div className="mh-pers-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "dados"} className={tab === "dados" ? "is-on" : ""} onClick={() => setTab("dados")}>Dados</button>
        <button type="button" role="tab" aria-selected={tab === "reversos"} className={tab === "reversos" ? "is-on" : ""} onClick={() => setTab("reversos")}>Reversos de cartas</button>
      </div>
      {tab === "dados" ? <DicePage skin={skin} onEquip={onEquip} embedded /> : <BacksGrid cardBorder={cardBorder} onCardBorder={onCardBorder} back={effectiveBack(back, owned)} onEquip={onEquipBack} owned={own} items={items} icons={icons} FitTitle={FitTitle} FitBox={FitBox} />}
    </div>
  );
}
