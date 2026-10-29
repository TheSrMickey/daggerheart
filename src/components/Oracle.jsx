"use client";

// El Oráculo: respuestas aleatorias para el Director de Juego («¿lo hace?», «¿hay alguien dentro?»…).
// Un anillo de luz «habla» y contesta cuando el DJ pulsa el botón. Ocupa el espacio de juego (en la pantalla del DJ, sobre el escenario o el mapa;
// a los jugadores les aparece encima de lo que estén viendo, como la X-Card) y solo el DJ lo controla. El resultado solo se ve si el DJ lo muestra.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, RotateCcw, MessageSquare, Check, Eye, EyeOff } from "lucide-react";

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

// Solo lo necesario del resultado para publicarlo a los jugadores.
const pubRes = (r) => ({ label: r.label, tone: r.tone, hint: r.hint || "", text: r.text, mode: r.mode, n: r.n || null });

// Texto que se escribe letra a letra; se reinicia al cambiar de texto (por la key).
function Typed({ text, onTick }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 28);
    return () => clearInterval(id);
  }, [text]);
  const done = n >= text.length;
  useEffect(() => { onTick?.(!done); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{text.slice(0, n)}{!done && <i className="or3-cur" />}</>;
}

// El anillo de luz con la conversación; lo comparten la pantalla del DJ y la de los jugadores.
function Figure({ phase, res, line, sub, head, children, foot }) {
  const [talking, setTalking] = useState(true);
  const [c1, c2] = TONES[phase === "answer" && res ? res.tone : "idle"];
  const big = phase === "answer" && res ? res.label : "";
  const busy = talking || phase === "think";
  return (
    <div className="or3-card" style={{ "--c1": c1, "--c2": c2 }}>
      <div className={"or3-stage is-" + phase} aria-hidden="true">
        <div className="or3-halo" />
        <div className="or3-ringwrap">
          <i className="or3-ring is-a" />
          <i className="or3-ring is-b" />
          <i className="or3-ring is-c" />
          <i className="or3-glow" />
          <span className="or3-orbit"><u /></span>
          <span className="or3-orbit is-2"><u /></span>
          <div className="or3-core">
            {big ? <b className={"or3-big" + (big.length > 6 ? " is-long" : "")}>{big}</b> : <span className={"or3-bars" + (busy ? " is-on" : "")}><i /><i /><i /><i /><i /></span>}
            {res && res.mode === "fate" && phase === "answer" && <small>{res.n}</small>}
          </div>
        </div>
      </div>
      <div className="or3-side">
        {head}
        <div className="or3-msg" aria-live="polite">
          <i className={"or3-dot" + (busy ? " is-on" : "")} />
          <div className="or3-bub">
            <span><Typed key={phase + line} text={line} onTick={setTalking} /></span>
            {sub && <small>{sub}</small>}
          </div>
        </div>
        {children}
        {foot}
      </div>
    </div>
  );
}

// Lo que se recuerda entre cierres de pestaña (el resultado completo solo vive en la pantalla del DJ).
const keep = { sid: 0, res: null, hist: [] };
const remember = (p) => Object.assign(keep, p);

// Pantalla del DJ: encima del escenario o el mapa. o = stage.oracle; onPatch guarda el estado compartido.
export default function OracleDj({ o, onPatch, onPublish, onClose }) {
  const same = keep.sid === o.sid;
  const [res, setRes] = useState(same ? keep.res : null);
  const [hist, setHist] = useState(same ? keep.hist : []);
  const [published, setPublished] = useState(false);
  const go = useRef(null);
  const timer = useRef(null);
  const oRef = useRef(o);
  useEffect(() => { oRef.current = o; });
  useEffect(() => { go.current?.focus(); return () => clearTimeout(timer.current); }, []);
  const patch = (p) => onPatch({ ...oRef.current, ...p });
  const phase = o.phase || "idle";
  const mode = o.mode || "yn";
  const shown = !!o.res;
  const cur = res || o.res || null;

  const ask = () => {
    if (phase === "think") return;
    setPublished(false);
    setRes(null);
    patch({ phase: "think", res: null, answered: false });
    timer.current = setTimeout(() => {
      const r = consultOracle(oRef.current.mode || "yn");
      const h = [r, ...keep.hist].slice(0, 6);
      remember({ sid: oRef.current.sid, res: r, hist: h });
      setRes(r); setHist(h);
      patch({ phase: "answer", answered: true });
    }, 1600 + rnd(700));
  };
  const again = (extra) => { setRes(null); setPublished(false); remember({ res: null }); patch({ phase: "idle", answered: false, res: null, ...(extra || {}) }); setTimeout(() => go.current?.focus(), 0); };
  const toggleShow = () => cur && patch({ res: shown ? null : pubRes(cur) });
  const publish = () => { if (cur && !published) { onPublish(cur); setPublished(true); } };
  const pickMode = (k) => { if (phase === "think") return; if (phase === "answer") again({ mode: k }); else patch({ mode: k }); };

  const line = phase === "idle" ? "Hazme una pregunta y pulsa el botón" : phase === "think" ? "El Oráculo reflexiona…" : cur ? cur.text : "Pregunta de nuevo.";
  const sub = phase === "idle" ? "Dila en voz alta o léela a la mesa. Cuando esté hecha, consúltame." : phase === "think" ? "Las luces se agitan. Un momento." : cur ? [cur.hint, cur.mode === "fate" ? "Tirada " + cur.n + "/100" : ""].filter(Boolean).join(" · ") : "";

  return (
    <div className="or3 is-dj" role="dialog" aria-label="Oráculo">
      <style>{CSS}</style>
      <Figure
        phase={phase}
        res={cur}
        line={line}
        sub={sub}
        head={
          <div className="or3-h">
            <Sparkles size={15} />
            <b>Oráculo</b>
            <span className="or3-chip">Lo ven todos · lo controlas tú</span>
            <button type="button" className="or3-x" aria-label="Cerrar el Oráculo" title="Cerrar el Oráculo (se cierra también para los jugadores)" onClick={onClose}><X size={15} /></button>
          </div>
        }
        foot={
          <>
            <div className="or3-modes" role="radiogroup" aria-label="Tipo de respuesta">
              {ORACLE_MODES.map((m) => (
                <button key={m.key} type="button" role="radio" aria-checked={mode === m.key} className={mode === m.key ? "is-on" : ""} onClick={() => pickMode(m.key)}>{m.label}</button>
              ))}
            </div>
            {hist.length > 0 && (
              <div className="or3-hist" aria-label="Últimas respuestas">
                <span>Historial</span>
                {hist.map((h, i) => <em key={i} className={"is-" + h.tone}>{h.label}{h.mode === "fate" ? " · " + h.n : ""}</em>)}
              </div>
            )}
          </>
        }
      >
        {phase === "answer" ? (
          <div className="or3-acts">
            <button type="button" className={"or3-sec is-show" + (shown ? " is-on" : "")} onClick={toggleShow} aria-pressed={shown} title={shown ? "Los jugadores ven el resultado. Pulsa para ocultarlo" : "Los jugadores aún no ven el resultado"}>
              {shown ? <><Eye size={15} /> Lo ven los jugadores</> : <><EyeOff size={15} /> Mostrar a los jugadores</>}
            </button>
            <button type="button" className={"or3-sec" + (published ? " is-done" : "")} onClick={publish} disabled={published}>
              {published ? <><Check size={15} /> En el chat</> : <><MessageSquare size={15} /> Al chat</>}
            </button>
            <button type="button" className="or3-sec" onClick={() => again()}><RotateCcw size={15} /> Preguntar de nuevo</button>
          </div>
        ) : (
          <button type="button" ref={go} className="or3-go" onClick={ask} disabled={phase === "think"}>
            <Sparkles size={16} /> {phase === "think" ? "Consultando…" : "Consultar al Oráculo"}
          </button>
        )}
      </Figure>
    </div>
  );
}

// Pantalla de los jugadores: solo ven (sin controles) y encima de lo que estén mirando. El resultado solo aparece si el DJ lo muestra.
export function OraclePlayers({ o }) {
  const phase = o.phase || "idle";
  const line = phase === "idle" ? "Hazme una pregunta y pulsa el botón" : phase === "think" ? "El Oráculo reflexiona…" : o.res ? o.res.text : "El Oráculo ha respondido al Director de Juego.";
  const sub = phase === "answer" && o.res ? [o.res.hint, o.res.mode === "fate" ? "Tirada " + o.res.n + "/100" : ""].filter(Boolean).join(" · ") : phase === "idle" ? "El Director de Juego va a consultar al Oráculo." : "";
  const node = (
    <div className="or3 is-players" role="status" aria-live="polite">
      <style>{CSS}</style>
      <Figure
        phase={phase}
        res={o.res || null}
        line={line}
        sub={sub}
        head={<div className="or3-h"><Sparkles size={15} /><b>Oráculo</b><span className="or3-chip">Director de Juego</span></div>}
      />
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
.or3.is-dj { position: absolute !important; inset: 0; }
.or3 { position: absolute; inset: 0; z-index: 60; display: grid; place-items: center; padding: clamp(8px, 2.5cqmin, 28px); container: or3 / size; font-family: 'Inter', system-ui, sans-serif; color: #ECEFFB; background: radial-gradient(70% 70% at 50% 45%, rgba(10,14,40,.72), rgba(4,5,14,.9)); -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px); border-radius: inherit; animation: or3-in .3s ease both; }
.or3.is-players { position: fixed; z-index: 99990; pointer-events: none; padding: 20px; background: radial-gradient(70% 70% at 50% 45%, rgba(10,14,40,.62), rgba(4,5,14,.82)); border-radius: 0; }
@keyframes or3-in { from { opacity: 0; } }
.or3-card { --c1: #6FE3FF; --c2: #A596FF; --rs: clamp(110px, min(46cqh, 30cqw), 250px); width: min(100%, 980px); max-height: 100%; display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: clamp(14px, 3cqw, 36px); padding: clamp(8px, 2cqmin, 24px) clamp(10px, 3cqw, 40px); animation: or3-pop .4s cubic-bezier(.2,1.2,.3,1) both; }
@keyframes or3-pop { from { opacity: 0; transform: translateY(14px) scale(.96); } }
@container or3 (max-width: 640px) { .or3-card { grid-template-columns: minmax(0, 1fr); justify-items: center; text-align: left; --rs: clamp(100px, 30cqh, 190px); } .or3-side { width: 100%; } }
.or3-h { display: flex; align-items: center; gap: 8px; color: var(--c1); transition: color .6s; } .or3-h b { font: 700 14px 'Cinzel', Georgia, serif; letter-spacing: .16em; text-transform: uppercase; color: #fff; }
.or3-chip { font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; padding: 3px 9px; border-radius: 99px; color: var(--c1); background: color-mix(in srgb, var(--c1) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c1) 40%, transparent); }
.or3-x { all: unset; cursor: pointer; margin-left: auto; width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; color: #cfd3f2; background: #ffffff0d; border: 1px solid #ffffff1f; } .or3-x:hover { background: #ffffff1c; } .or3-x:focus-visible, .or3-go:focus-visible, .or3-sec:focus-visible, .or3-modes button:focus-visible { outline: 2px solid var(--c1); outline-offset: 2px; }
.or3-side { min-width: 0; display: flex; flex-direction: column; gap: 10px; }

.or3-stage { position: relative; width: var(--rs); height: var(--rs); display: grid; place-items: center; flex: none; }
.or3-halo { position: absolute; width: 170%; height: 170%; border-radius: 50%; background: radial-gradient(closest-side, color-mix(in srgb, var(--c1) 22%, transparent), transparent 70%); animation: or3-breathe 3.6s ease-in-out infinite; transition: background .6s; }
.or3-ringwrap { position: relative; width: 100%; height: 100%; animation: or3-talk 1.9s ease-in-out infinite; }
.or3-ring, .or3-glow { position: absolute; inset: 0; border-radius: 50%; }
.or3-ring { -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - var(--t)), #000 calc(100% - var(--t) + 1px)); mask: radial-gradient(farthest-side, transparent calc(100% - var(--t)), #000 calc(100% - var(--t) + 1px)); }
.or3-ring.is-a { --t: calc(var(--rs) * .036); background: conic-gradient(from 0deg, transparent 0 8%, var(--c1) 28%, #fff 46%, var(--c2) 64%, transparent 92%); animation: or3-spin 7s linear infinite; }
.or3-ring.is-b { --t: 3px; inset: calc(var(--rs) * -.064); opacity: .75; background: conic-gradient(from 180deg, transparent 0 40%, var(--c2) 62%, transparent 82%); animation: or3-spin 11s linear infinite reverse; }
.or3-ring.is-c { --t: 2px; inset: calc(var(--rs) * .072); opacity: .55; background: conic-gradient(from 90deg, transparent 0 55%, var(--c1) 80%, transparent); animation: or3-spin 5s linear infinite; }
.or3-glow { inset: -4px; background: conic-gradient(from 0deg, transparent 0 8%, var(--c1) 28%, #fff 46%, var(--c2) 64%, transparent 92%); filter: blur(16px); opacity: .55; -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 24px), #000 calc(100% - 23px)); mask: radial-gradient(farthest-side, transparent calc(100% - 24px), #000 calc(100% - 23px)); animation: or3-spin 7s linear infinite; }
.or3-orbit { position: absolute; inset: calc(var(--rs) * -.064); animation: or3-spin 9s linear infinite; } .or3-orbit u { position: absolute; left: 50%; top: -3px; width: 7px; height: 7px; margin-left: -3px; border-radius: 50%; background: #fff; box-shadow: 0 0 12px 3px var(--c1); } .or3-orbit.is-2 { inset: calc(var(--rs) * .088); animation-duration: 6s; animation-direction: reverse; } .or3-orbit.is-2 u { width: 5px; height: 5px; background: var(--c2); box-shadow: 0 0 10px 2px var(--c2); }
.or3-core { position: absolute; inset: 10%; border-radius: 50%; display: grid; place-content: center; text-align: center; background: radial-gradient(closest-side, color-mix(in srgb, var(--c1) 10%, transparent), transparent 80%); }
.or3-big { font: 800 calc(var(--rs) * .21)/1 'Cinzel', Georgia, serif; letter-spacing: .04em; color: #fff; text-shadow: 0 0 22px var(--c1), 0 0 4px #fff; animation: or3-word .5s cubic-bezier(.2,1.4,.3,1) both; } .or3-big.is-long { font-size: calc(var(--rs) * .12); line-height: 1.1; max-width: 62%; margin: 0 auto; } .or3-core small { margin-top: 4px; font: 700 12px 'Inter', sans-serif; letter-spacing: .14em; color: var(--c2); }
@keyframes or3-word { from { opacity: 0; transform: scale(.6); filter: blur(8px); } }
.or3-bars { display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 36px; } .or3-bars i { width: 4px; height: 8px; border-radius: 3px; background: var(--c1); box-shadow: 0 0 8px var(--c1); opacity: .6; } .or3-bars.is-on i { animation: or3-bar .9s ease-in-out infinite; opacity: 1; } .or3-bars i:nth-child(2) { animation-delay: .12s; } .or3-bars i:nth-child(3) { animation-delay: .24s; } .or3-bars i:nth-child(4) { animation-delay: .08s; } .or3-bars i:nth-child(5) { animation-delay: .18s; }
@keyframes or3-bar { 0%, 100% { height: 8px; } 50% { height: 32px; } }
@keyframes or3-spin { to { transform: rotate(360deg); } }
@keyframes or3-talk { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes or3-breathe { 0%, 100% { transform: scale(.94); opacity: .8; } 50% { transform: scale(1.06); opacity: 1; } }
.or3-stage.is-think .or3-ringwrap { animation: or3-think 1s ease-in-out infinite; } .or3-stage.is-think .or3-ring.is-a, .or3-stage.is-think .or3-glow { animation-duration: 1.6s; } .or3-stage.is-think .or3-ring.is-b { animation-duration: 2.4s; } .or3-stage.is-think .or3-ring.is-c { animation-duration: 1.2s; } .or3-stage.is-think .or3-orbit { animation-duration: 2.2s; } .or3-stage.is-think .or3-glow { opacity: .9; }
@keyframes or3-think { 0%, 100% { transform: scale(1.06); } 50% { transform: scale(1.2); } }
.or3-stage.is-answer .or3-ringwrap { animation: or3-settle .9s cubic-bezier(.2,1.3,.3,1) both, or3-talk 4.2s ease-in-out .9s infinite; }
@keyframes or3-settle { from { transform: scale(1.3); } to { transform: scale(1); } }

.or3-msg { display: flex; gap: 11px; align-items: flex-start; }
.or3-dot { flex: none; width: 30px; height: 30px; border-radius: 50%; margin-top: 2px; border: 3px solid var(--c1); box-shadow: 0 0 14px color-mix(in srgb, var(--c1) 70%, transparent), inset 0 0 8px color-mix(in srgb, var(--c1) 50%, transparent); transition: border-color .6s, box-shadow .6s; } .or3-dot.is-on { animation: or3-talk .7s ease-in-out infinite; }
.or3-bub { flex: 1; min-width: 0; border-radius: 6px 18px 18px 18px; padding: 12px 16px; font-size: clamp(14px, 1.9cqw, 17px); line-height: 1.45; background: #ffffff0c; border: 1px solid #ffffff18; } .or3-bub small { display: block; margin-top: 4px; font-size: 12px; color: #a8acd0; }
.or3-cur { display: inline-block; width: 2px; height: 17px; margin-left: 2px; vertical-align: -3px; background: var(--c1); animation: or3-blink .8s steps(2) infinite; } @keyframes or3-blink { 50% { opacity: 0; } }
.or3-go { all: unset; box-sizing: border-box; cursor: pointer; width: 100%; height: 50px; border-radius: 15px; display: flex; align-items: center; justify-content: center; gap: 10px; font: 800 15px 'Inter', sans-serif; color: #04121a; background: linear-gradient(180deg, color-mix(in srgb, var(--c1) 100%, #fff 25%), var(--c1)); box-shadow: 0 12px 30px -10px var(--c1); transition: filter .15s, transform .1s; } .or3-go:hover { filter: brightness(1.08); } .or3-go:active { transform: scale(.99); } .or3-go:disabled { cursor: default; color: #8d92b8; background: #ffffff10; border: 1px solid #ffffff18; box-shadow: none; filter: none; }
.or3-acts { display: flex; gap: 8px; flex-wrap: wrap; } .or3-sec { all: unset; box-sizing: border-box; cursor: pointer; flex: 1 1 auto; min-height: 44px; padding: 0 14px; border-radius: 13px; display: flex; align-items: center; justify-content: center; gap: 7px; white-space: nowrap; font: 700 13px 'Inter', sans-serif; color: #dfe2f8; background: #ffffff0c; border: 1px solid #ffffff1c; } .or3-sec:hover:not(:disabled) { background: #ffffff18; } .or3-sec.is-show { flex-basis: 100%; min-height: 48px; color: #fff; border-color: color-mix(in srgb, var(--c1) 60%, transparent); background: color-mix(in srgb, var(--c1) 12%, transparent); } .or3-sec.is-show.is-on { color: #8ff0bd; border-color: #5EE6A0; background: #5EE6A01a; } .or3-sec.is-done { cursor: default; color: #7ff0b0; border-color: #5EE6A088; background: #5EE6A01a; }
.or3-modes { display: flex; gap: 6px; } .or3-modes button { all: unset; box-sizing: border-box; cursor: pointer; flex: 1; text-align: center; padding: 8px 4px; border-radius: 11px; font: 700 12px 'Inter', sans-serif; color: #a8acd0; background: #ffffff08; border: 1px solid #ffffff18; } .or3-modes button.is-on { color: #fff; background: color-mix(in srgb, var(--c1) 14%, transparent); border-color: var(--c1); }
.or3-hist { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 11.5px; color: #8e92b8; } .or3-hist em { font-style: normal; font-weight: 700; padding: 2px 9px; border-radius: 99px; border: 1px solid; } .or3-hist em.is-yes { color: #8ff0bd; border-color: #5EE6A088; } .or3-hist em.is-no { color: #ff9ba5; border-color: #FF6F7D88; } .or3-hist em.is-maybe { color: #ffd98f; border-color: #FFC66B88; }
@container or3 (max-height: 520px) { .or3-hist, .or3-chip { display: none; } .or3-sec { min-height: 38px; } .or3-go { height: 44px; } }
@container or3 (max-height: 420px) { .or3-bub small { display: none; } .or3-side { gap: 8px; } }
@media (prefers-reduced-motion: reduce) { .or3, .or3-card, .or3-halo, .or3-ringwrap, .or3-ring, .or3-glow, .or3-orbit, .or3-bars i, .or3-dot, .or3-big, .or3-cur { animation: none !important; } }
`;
