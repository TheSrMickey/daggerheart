"use client";

// El Oráculo: respuestas aleatorias para el DJ («¿lo hace?», «¿hay alguien dentro?»…). Un anillo de luz «habla» con el DJ y contesta al pulsar el botón.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, RotateCcw, MessageSquare, Check } from "lucide-react";

const TONES = {
  idle: ["#6FE3FF", "#A596FF"],
  yes: ["#5EE6A0", "#9CF5C9"],
  no: ["#FF6F7D", "#FFA8B0"],
  maybe: ["#FFC66B", "#FFE2A8"],
};

// peso: probabilidad relativa; hint: pista para el DJ.
const NUANCE = [
  { label: "Sí, y además…", tone: "yes", w: 10, hint: "Ocurre algo extra a su favor.", say: ["Los hilos se tensan a tu favor, y aún hay más.", "Sí, con regalo."] },
  { label: "Sí", tone: "yes", w: 22, hint: "Sin complicaciones.", say: ["Los hilos del destino se inclinan a tu favor.", "La respuesta es clara: sí."] },
  { label: "Sí, pero…", tone: "yes", w: 18, hint: "Sale bien, con una complicación.", say: ["Sí, aunque algo se interpone.", "Se puede, pero tendrá un precio."] },
  { label: "Quizá", tone: "maybe", w: 10, hint: "Decide el DJ o tira un dado.", say: ["Las brumas no deciden: queda en tus manos.", "Ni sí ni no. Ahora te toca a ti."] },
  { label: "No, pero…", tone: "no", w: 18, hint: "Falla, aunque hay una salida.", say: ["No, aunque queda una rendija abierta.", "No tal como lo pides… pero hay otro camino."] },
  { label: "No", tone: "no", w: 22, hint: "Sin más.", say: ["Las brumas se cierran: no.", "La respuesta es no."] },
  { label: "No, y además…", tone: "no", w: 10, hint: "Algo se complica: añade una consecuencia.", say: ["No, y las cosas empeoran.", "Un no rotundo, con consecuencias."] },
];
const YN = [
  { label: "Sí", tone: "yes", hint: "", say: ["Los hilos del destino se inclinan a tu favor.", "La respuesta es clara: sí."] },
  { label: "No", tone: "no", hint: "", say: ["Las brumas se cierran: no.", "La respuesta es no."] },
];
// 1d100 → tramo.
const FATE = [
  [10, 6], [35, 5], [45, 4], [55, 3], [65, 2], [90, 1], [100, 0],
].map(([max, i]) => ({ max, a: NUANCE[i] }));

export const ORACLE_MODES = [
  { key: "yn", label: "Sí / No" },
  { key: "nuance", label: "Sí / No con matices" },
  { key: "fate", label: "Destino (1d100)" },
];

const rnd = (n) => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }
  return Math.floor(Math.random() * n);
};
const pick = (list) => list[rnd(list.length)];

export function consultOracle(mode) {
  if (mode === "fate") {
    const n = rnd(100) + 1;
    const a = FATE.find((f) => n <= f.max).a;
    return { ...a, n, mode, text: pick(a.say) };
  }
  let a;
  if (mode === "yn") a = pick(YN);
  else {
    let r = rnd(NUANCE.reduce((s, x) => s + x.w, 0));
    a = NUANCE.find((x) => (r -= x.w) < 0) || NUANCE[1];
  }
  return { ...a, mode, text: pick(a.say) };
}

// Texto que se escribe letra a letra; se reinicia al cambiar de texto (por la key).
function Typed({ text, onTick }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 28);
    return () => clearInterval(id);
  }, [text]);
  const done = n >= text.length;
  useEffect(() => { onTick?.(!done); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{text.slice(0, n)}{!done && <i className="or2-cur" />}</>;
}

export default function Oracle({ onClose, onPublish }) {
  const [mode, setMode] = useState("yn");
  const [phase, setPhase] = useState("idle"); // idle | think | answer
  const [res, setRes] = useState(null);
  const [published, setPublished] = useState(false);
  const [hist, setHist] = useState([]);
  const [talking, setTalking] = useState(true);
  const go = useRef(null);
  const timer = useRef(null);

  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    go.current?.focus();
    const key = (e) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); clearTimeout(timer.current); };
  }, []);

  const ask = () => {
    if (phase === "think") return;
    setPublished(false);
    setRes(null);
    setPhase("think");
    timer.current = setTimeout(() => {
      const r = consultOracle(mode);
      setRes(r);
      setHist((h) => [r, ...h].slice(0, 6));
      setPhase("answer");
    }, 1600 + rnd(700));
  };
  const again = () => { setRes(null); setPublished(false); setPhase("idle"); setTimeout(() => go.current?.focus(), 0); };
  const publish = () => { if (res && !published) { onPublish(res); setPublished(true); } };
  const pickMode = (k) => { if (phase === "think") return; setMode(k); if (phase === "answer") again(); };

  const [c1, c2] = TONES[phase === "answer" && res ? res.tone : "idle"];
  const line = phase === "idle" ? "Hazme una pregunta y pulsa el botón" : phase === "think" ? "El Oráculo reflexiona…" : res ? res.text : "";
  const sub = phase === "idle" ? "Puedes decirla en voz alta o leerla a la mesa. Cuando esté hecha, consúltame." : phase === "think" ? "Las luces se agitan. Un momento." : res ? [res.hint, res.mode === "fate" ? "Tirada " + res.n + "/100" : ""].filter(Boolean).join(" · ") : "";
  const big = phase === "answer" && res ? res.label : "";

  const node = (
    <div className="or2-bd" role="dialog" aria-modal="true" aria-label="Oráculo" onClick={onClose}>
      <style>{CSS}</style>
      <div className="or2-card" onClick={(e) => e.stopPropagation()} style={{ "--c1": c1, "--c2": c2 }}>
        <div className="or2-h">
          <Sparkles size={16} />
          <b>Oráculo</b>
          <span className="or2-chip">Solo DJ</span>
          <button type="button" className="or2-x" aria-label="Cerrar" onClick={onClose}><X size={16} /></button>
        </div>

        <div className={"or2-stage is-" + phase} aria-hidden="true">
          <div className="or2-halo" />
          <div className="or2-ringwrap">
            <i className="or2-ring is-a" />
            <i className="or2-ring is-b" />
            <i className="or2-ring is-c" />
            <i className="or2-glow" />
            <span className="or2-orbit"><u /></span>
            <span className="or2-orbit is-2"><u /></span>
            <div className="or2-core">
              {big ? <b className={"or2-big" + (big.length > 6 ? " is-long" : "")}>{big}</b> : <span className={"or2-bars" + (talking || phase === "think" ? " is-on" : "")}><i /><i /><i /><i /><i /></span>}
              {res && res.mode === "fate" && phase === "answer" && <small>{res.n}</small>}
            </div>
          </div>
        </div>

        <div className="or2-msg" aria-live="polite">
          <i className={"or2-dot" + (talking || phase === "think" ? " is-on" : "")} />
          <div className="or2-bub">
            <span><Typed key={phase + line} text={line} onTick={setTalking} /></span>
            {sub && <small>{sub}</small>}
          </div>
        </div>

        {phase === "answer" ? (
          <div className="or2-row">
            <button type="button" className="or2-sec" onClick={again}><RotateCcw size={15} /> Preguntar de nuevo</button>
            <button type="button" className={"or2-sec is-pub" + (published ? " is-done" : "")} onClick={publish} disabled={published}>
              {published ? <><Check size={15} /> Publicada en el chat</> : <><MessageSquare size={15} /> Publicar en el chat</>}
            </button>
          </div>
        ) : (
          <button type="button" ref={go} className="or2-go" onClick={ask} disabled={phase === "think"}>
            <Sparkles size={16} /> {phase === "think" ? "Consultando…" : "Consultar al Oráculo"}
          </button>
        )}

        <div className="or2-modes" role="radiogroup" aria-label="Tipo de respuesta">
          {ORACLE_MODES.map((m) => (
            <button key={m.key} type="button" role="radio" aria-checked={mode === m.key} className={mode === m.key ? "is-on" : ""} onClick={() => pickMode(m.key)}>{m.label}</button>
          ))}
        </div>

        {hist.length > 0 && (
          <div className="or2-hist" aria-label="Últimas respuestas">
            <span>Historial</span>
            {hist.map((h, i) => <em key={i} className={"is-" + h.tone}>{h.label}{h.mode === "fate" ? " · " + h.n : ""}</em>)}
          </div>
        )}
      </div>
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(node, document.querySelector(".mh-root") || document.body);
}

// Tarjeta del chat con la respuesta publicada.
export function OracleChatBody({ o }) {
  return (
    <div className="or2-chat">
      <b className="mh-serif">{o.label}</b>
      <span>{o.text}</span>
    </div>
  );
}

const CSS = `
.or2-bd { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 20px; background: radial-gradient(60% 60% at 50% 45%, rgba(14,18,44,.6), rgba(4,5,14,.88)); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); animation: or2-in .25s ease both; }
@keyframes or2-in { from { opacity: 0; } }
.or2-card { --c1: #6FE3FF; --c2: #A596FF; width: min(720px, 100%); max-height: calc(100dvh - 40px); overflow: auto; display: flex; flex-direction: column; align-items: center; padding: 22px 32px 26px; border-radius: 28px; color: #ECEFFB; background: linear-gradient(180deg, rgba(20,24,52,.94), rgba(10,12,30,.96)); border: 1px solid color-mix(in srgb, var(--c1) 28%, #2a2d55); box-shadow: 0 40px 120px -30px #000, 0 0 80px -30px var(--c1); animation: or2-pop .35s cubic-bezier(.2,1.2,.3,1) both; transition: border-color .6s, box-shadow .6s; }
@keyframes or2-pop { from { opacity: 0; transform: translateY(14px) scale(.96); } }
.or2-h { width: 100%; display: flex; align-items: center; gap: 9px; color: var(--c1); transition: color .6s; } .or2-h b { font: 700 15px 'Cinzel', Georgia, serif; letter-spacing: .16em; text-transform: uppercase; color: #fff; }
.or2-chip { font-size: 10.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; padding: 3px 10px; border-radius: 99px; color: var(--c1); background: color-mix(in srgb, var(--c1) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c1) 40%, transparent); }
.or2-x { all: unset; cursor: pointer; margin-left: auto; width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; color: #cfd3f2; background: #ffffff0d; border: 1px solid #ffffff1f; } .or2-x:hover { background: #ffffff1c; } .or2-x:focus-visible, .or2-go:focus-visible, .or2-sec:focus-visible, .or2-modes button:focus-visible { outline: 2px solid var(--c1); outline-offset: 2px; }

.or2-stage { position: relative; width: 100%; height: 330px; display: grid; place-items: center; }
.or2-halo { position: absolute; width: 440px; height: 440px; border-radius: 50%; background: radial-gradient(closest-side, color-mix(in srgb, var(--c1) 22%, transparent), transparent 70%); animation: or2-breathe 3.6s ease-in-out infinite; transition: background .6s; }
.or2-ringwrap { position: relative; width: 250px; height: 250px; animation: or2-talk 1.9s ease-in-out infinite; }
.or2-ring, .or2-glow { position: absolute; inset: 0; border-radius: 50%; }
.or2-ring { -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - var(--t)), #000 calc(100% - var(--t) + 1px)); mask: radial-gradient(farthest-side, transparent calc(100% - var(--t)), #000 calc(100% - var(--t) + 1px)); }
.or2-ring.is-a { --t: 9px; background: conic-gradient(from 0deg, transparent 0 8%, var(--c1) 28%, #fff 46%, var(--c2) 64%, transparent 92%); animation: or2-spin 7s linear infinite; }
.or2-ring.is-b { --t: 3px; inset: -16px; opacity: .75; background: conic-gradient(from 180deg, transparent 0 40%, var(--c2) 62%, transparent 82%); animation: or2-spin 11s linear infinite reverse; }
.or2-ring.is-c { --t: 2px; inset: 18px; opacity: .55; background: conic-gradient(from 90deg, transparent 0 55%, var(--c1) 80%, transparent); animation: or2-spin 5s linear infinite; }
.or2-glow { inset: -4px; background: conic-gradient(from 0deg, transparent 0 8%, var(--c1) 28%, #fff 46%, var(--c2) 64%, transparent 92%); filter: blur(18px); opacity: .55; -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 26px), #000 calc(100% - 25px)); mask: radial-gradient(farthest-side, transparent calc(100% - 26px), #000 calc(100% - 25px)); animation: or2-spin 7s linear infinite; }
.or2-orbit { position: absolute; inset: -16px; animation: or2-spin 9s linear infinite; } .or2-orbit u { position: absolute; left: 50%; top: -3px; width: 7px; height: 7px; margin-left: -3px; border-radius: 50%; background: #fff; box-shadow: 0 0 12px 3px var(--c1); } .or2-orbit.is-2 { inset: 22px; animation-duration: 6s; animation-direction: reverse; } .or2-orbit.is-2 u { width: 5px; height: 5px; background: var(--c2); box-shadow: 0 0 10px 2px var(--c2); }
.or2-core { position: absolute; inset: 24px; border-radius: 50%; display: grid; place-content: center; text-align: center; background: radial-gradient(closest-side, color-mix(in srgb, var(--c1) 10%, transparent), transparent 80%); }
.or2-big { font: 800 52px/1 'Cinzel', Georgia, serif; letter-spacing: .04em; color: #fff; text-shadow: 0 0 22px var(--c1), 0 0 4px #fff; animation: or2-word .5s cubic-bezier(.2,1.4,.3,1) both; } .or2-big.is-long { font-size: 30px; line-height: 1.1; max-width: 150px; } .or2-core small { margin-top: 6px; font: 700 13px 'Inter', sans-serif; letter-spacing: .14em; color: var(--c2); }
@keyframes or2-word { from { opacity: 0; transform: scale(.6); filter: blur(8px); } }
.or2-bars { display: inline-flex; align-items: center; gap: 5px; height: 36px; } .or2-bars i { width: 4px; height: 8px; border-radius: 3px; background: var(--c1); box-shadow: 0 0 8px var(--c1); opacity: .6; } .or2-bars.is-on i { animation: or2-bar .9s ease-in-out infinite; opacity: 1; } .or2-bars i:nth-child(2) { animation-delay: .12s; } .or2-bars i:nth-child(3) { animation-delay: .24s; } .or2-bars i:nth-child(4) { animation-delay: .08s; } .or2-bars i:nth-child(5) { animation-delay: .18s; }
@keyframes or2-bar { 0%, 100% { height: 8px; } 50% { height: 32px; } }
@keyframes or2-spin { to { transform: rotate(360deg); } }
@keyframes or2-talk { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes or2-breathe { 0%, 100% { transform: scale(.94); opacity: .8; } 50% { transform: scale(1.06); opacity: 1; } }
.or2-stage.is-think .or2-ringwrap { animation: or2-think 1s ease-in-out infinite; } .or2-stage.is-think .or2-ring.is-a, .or2-stage.is-think .or2-glow { animation-duration: 1.6s; } .or2-stage.is-think .or2-ring.is-b { animation-duration: 2.4s; } .or2-stage.is-think .or2-ring.is-c { animation-duration: 1.2s; } .or2-stage.is-think .or2-orbit { animation-duration: 2.2s; } .or2-stage.is-think .or2-glow { opacity: .9; }
@keyframes or2-think { 0%, 100% { transform: scale(1.06); } 50% { transform: scale(1.2); } }
.or2-stage.is-answer .or2-ringwrap { animation: or2-settle .9s cubic-bezier(.2,1.3,.3,1) both, or2-talk 4.2s ease-in-out .9s infinite; }
@keyframes or2-settle { from { transform: scale(1.3); } to { transform: scale(1); } }

.or2-msg { display: flex; gap: 12px; align-items: flex-start; width: 100%; margin-top: 2px; }
.or2-dot { flex: none; position: relative; width: 34px; height: 34px; border-radius: 50%; margin-top: 2px; border: 3px solid var(--c1); box-shadow: 0 0 14px color-mix(in srgb, var(--c1) 70%, transparent), inset 0 0 8px color-mix(in srgb, var(--c1) 50%, transparent); transition: border-color .6s, box-shadow .6s; } .or2-dot.is-on { animation: or2-talk .7s ease-in-out infinite; }
.or2-bub { flex: 1; min-height: 62px; border-radius: 6px 20px 20px 20px; padding: 14px 18px; font-size: 17px; line-height: 1.45; background: #ffffff0c; border: 1px solid #ffffff18; } .or2-bub small { display: block; margin-top: 4px; font-size: 12.5px; color: #a8acd0; }
.or2-cur { display: inline-block; width: 2px; height: 18px; margin-left: 2px; vertical-align: -3px; background: var(--c1); animation: or2-blink .8s steps(2) infinite; } @keyframes or2-blink { 50% { opacity: 0; } }
.or2-go { all: unset; box-sizing: border-box; cursor: pointer; margin-top: 18px; width: 100%; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; gap: 10px; font: 800 16px 'Inter', sans-serif; color: #04121a; background: linear-gradient(180deg, color-mix(in srgb, var(--c1) 100%, #fff 25%), var(--c1)); box-shadow: 0 12px 30px -10px var(--c1); transition: filter .15s, transform .1s; } .or2-go:hover { filter: brightness(1.08); } .or2-go:active { transform: scale(.99); } .or2-go:disabled { cursor: default; color: #8d92b8; background: #ffffff10; border: 1px solid #ffffff18; box-shadow: none; filter: none; }
.or2-row { display: flex; gap: 10px; width: 100%; margin-top: 18px; } .or2-sec { all: unset; box-sizing: border-box; cursor: pointer; flex: 1; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; font: 700 14px 'Inter', sans-serif; color: #dfe2f8; background: #ffffff0c; border: 1px solid #ffffff1c; } .or2-sec:hover:not(:disabled) { background: #ffffff18; } .or2-sec.is-pub { border-color: color-mix(in srgb, var(--c1) 55%, transparent); color: #fff; } .or2-sec.is-done { cursor: default; color: #7ff0b0; border-color: #5EE6A0; background: #5EE6A01a; }
.or2-modes { width: 100%; margin-top: 12px; display: flex; gap: 8px; } .or2-modes button { all: unset; box-sizing: border-box; cursor: pointer; flex: 1; text-align: center; padding: 10px 6px; border-radius: 12px; font: 700 12.5px 'Inter', sans-serif; color: #a8acd0; background: #ffffff08; border: 1px solid #ffffff18; } .or2-modes button.is-on { color: #fff; background: color-mix(in srgb, var(--c1) 14%, transparent); border-color: var(--c1); }
.or2-hist { width: 100%; margin-top: 14px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12px; color: #8e92b8; } .or2-hist em { font-style: normal; font-weight: 700; padding: 3px 10px; border-radius: 99px; border: 1px solid; } .or2-hist em.is-yes { color: #8ff0bd; border-color: #5EE6A088; } .or2-hist em.is-no { color: #ff9ba5; border-color: #FF6F7D88; } .or2-hist em.is-maybe { color: #ffd98f; border-color: #FFC66B88; }
@media (max-width: 640px) { .or2-card { padding: 18px 16px 20px; } .or2-stage { height: 280px; } .or2-ringwrap { width: 210px; height: 210px; } .or2-modes { flex-direction: column; } }
@media (prefers-reduced-motion: reduce) { .or2-bd, .or2-card, .or2-halo, .or2-ringwrap, .or2-ring, .or2-glow, .or2-orbit, .or2-bars i, .or2-dot, .or2-big, .or2-cur { animation: none !important; } }
`;
