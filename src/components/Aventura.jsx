"use client";
// Modo aventura · Fase 1: bienvenida a Brumaria y elección o creación del personaje de aventura (ficha ligera, separada de la hoja tradicional).
import { useEffect, useState } from "react";
import { Backpack, Check, Coins, Compass, Plus, Sparkles, Users } from "lucide-react";
import { Avatar } from "./Social";
import { loadTraveller, loadTravellers, enterBrumaria } from "@/lib/social";

function Skyline() {
  const lights = [[118, 214], [168, 190], [226, 176], [292, 150], [356, 168], [452, 140], [540, 120], [610, 134], [688, 162], [772, 150], [834, 188], [880, 176]];
  return (
    <svg className="adv-sky" viewBox="0 0 960 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="advSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b0b24" /><stop offset=".55" stopColor="#2a2358" /><stop offset="1" stopColor="#6d5aa8" /></linearGradient>
        <linearGradient id="advFog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c9c2ee" stopOpacity="0" /><stop offset="1" stopColor="#c9c2ee" stopOpacity=".55" /></linearGradient>
        <radialGradient id="advBeam" cx="0" cy="0.5" r="1"><stop offset="0" stopColor="#ffe9a8" stopOpacity=".85" /><stop offset="1" stopColor="#ffe9a8" stopOpacity="0" /></radialGradient>
        <radialGradient id="advMoon" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff7d6" /><stop offset="1" stopColor="#fff7d6" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="960" height="420" fill="url(#advSky)" />
      {Array.from({ length: 38 }, (_, i) => <circle key={i} cx={(i * 197) % 960} cy={(i * 61) % 190} r={i % 5 === 0 ? 1.6 : 1} fill="#fff" opacity={0.35 + (i % 4) * 0.15} className="adv-star" style={{ animationDelay: (i % 7) * 0.6 + "s" }} />)}
      <circle cx="170" cy="86" r="46" fill="url(#advMoon)" opacity=".7" />
      <circle cx="170" cy="86" r="17" fill="#fff7d6" />
      {/* terrazas lejanas */}
      <path d="M0 300 L70 262 L120 262 L150 232 L210 232 L240 206 L320 206 L350 226 L420 226 L450 196 L520 196 L560 170 L640 170 L670 198 L740 198 L780 224 L850 224 L880 250 L960 262 L960 420 L0 420Z" fill="#3a3070" />
      {/* faro */}
      <g transform="translate(560 84)">
        <path d="M-14 86 L-9 10 L9 10 L14 86Z" fill="#2a2358" stroke="#5b4ea0" strokeWidth="1.2" />
        <rect x="-12" y="-2" width="24" height="12" fill="#ffe9a8" />
        <path d="M-15 -2 L0 -16 L15 -2Z" fill="#1c1744" />
        <path d="M12 4 L420 -50 L420 60Z" fill="url(#advBeam)" className="adv-beam" />
      </g>
      {/* terrazas cercanas con ventanas */}
      <path d="M0 340 L60 318 L130 318 L170 292 L260 292 L300 268 L380 268 L420 290 L500 290 L540 262 L640 262 L690 286 L770 286 L820 306 L900 306 L960 326 L960 420 L0 420Z" fill="#241d52" />
      {lights.map(([x, y], i) => <rect key={i} x={x} y={y + 90} width="7" height="10" rx="1.5" fill="#ffd36a" opacity=".85" className="adv-win" style={{ animationDelay: (i % 5) * 0.8 + "s" }} />)}
      <path d="M0 372 L90 350 L180 350 L230 332 L350 332 L400 350 L520 350 L580 330 L700 330 L760 350 L880 350 L960 366 L960 420 L0 420Z" fill="#17123a" />
      <rect x="0" y="260" width="960" height="160" fill="url(#advFog)" />
    </svg>
  );
}

export function AventuraPage({ chars, classColor, onCreate }) {
  const [sel, setSel] = useState(null);
  const [me, setMe] = useState(undefined); // undefined: cargando · null: aún sin viajero
  const [crowd, setCrowd] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    const pull = () => {
      loadTraveller().then((t) => alive && setMe(t)).catch(() => alive && setMe((m) => (m === undefined ? null : m)));
      loadTravellers().then((l) => alive && setCrowd(l)).catch(() => {});
    };
    pull();
    const t = setInterval(pull, 6000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  const picked = chars.find((x) => x.id === sel) || null;
  const c = me || picked;
  const enter = async () => {
    if (!picked || busy) return;
    setBusy(true);
    const t = await enterBrumaria({ name: picked.name, cls: picked.cls, anc: picked.anc, lvl: picked.lvl }).catch(() => null);
    setBusy(false);
    if (t) {
      setMe(t);
      setCrowd((l) => [t, ...l.filter((x) => x.uid !== t.uid)]);
    }
  };
  const shown = crowd.slice(0, 4);
  return (
    <div className="adv">
      <style>{CSS}</style>
      <section className="adv-hero">
        <Skyline />
        <div className="adv-fog is-a" />
        <div className="adv-fog is-b" />
        <div className="adv-hi">
          <span className="adv-k"><Compass size={13} /> Modo aventura · Una ciudad para todos</span>
          <h1 className="mh-serif">Brumaria</h1>
          <p>La ciudad sobre la niebla. Viajeros de todas partes llegan a sus terrazas, y lo que hagas aquí lo verán también los demás.</p>
          <div className="adv-here">
            {shown.length > 0 && <span className="adv-av">{shown.map((t) => <Avatar key={t.uid} name={t.username} size={28} />)}</span>}
            {crowd.length > 0 ? <><b>{crowd.length}</b> {crowd.length === 1 ? "viajero ha llegado hoy" : "viajeros han llegado hoy"}</> : "Aún no ha llegado nadie hoy: puedes ser el primero"}
          </div>
        </div>
      </section>

      <div className={"adv-g" + (me ? " is-in" : "")}>
        {!me && (
          <section className="adv-p">
            <header><i>1</i><div><h2>Tu personaje de aventura</h2><p>Se queda aquí, aparte de tu hoja tradicional: es una copia ligera y lo que pase en la ciudad no cambia tu hoja. Solo puedes tener un viajero por cuenta.</p></div></header>
            {me === undefined ? (
              <div className="adv-empty"><b>Abriendo las puertas de la ciudad…</b></div>
            ) : (
              <div className="adv-list">
                {chars.map((x) => (
                  <button key={x.id} type="button" className={"adv-c" + (sel === x.id ? " is-on" : "")} style={{ "--cc": classColor(x.cls) }} onClick={() => setSel(x.id)} aria-pressed={sel === x.id}>
                    <span className="adv-cav">{(x.name || "?").charAt(0).toUpperCase()}</span>
                    <span className="adv-ct"><b>{x.name}</b><small>{[x.cls || "Sin clase", x.anc, "Nv " + x.lvl].filter(Boolean).join(" · ")}</small></span>
                    {sel === x.id && <Check size={16} className="adv-ck" />}
                  </button>
                ))}
                <button type="button" className="adv-c is-new" onClick={onCreate}><span className="adv-cav"><Plus size={18} /></span><span className="adv-ct"><b>Crear un personaje nuevo</b><small>Con el asistente de creación de siempre</small></span></button>
              </div>
            )}
          </section>
        )}

        <aside className={"adv-p adv-sheet" + (c ? " is-set" : "")} style={c ? { "--cc": classColor(c.cls) } : undefined}>
          <header><i>{me ? "✓" : "2"}</i><div><h2>{me ? "Tu viajero" : "Tu ficha de viajero"}</h2><p>{me ? "Ya estás en Brumaria. Solo hay un viajero por cuenta." : "Lo que llevarás contigo a la ciudad."}</p></div></header>
          {c ? (
            <div className="adv-card">
              <div className="adv-portrait"><span>{((me ? me.name : c.name) || "?").charAt(0).toUpperCase()}</span></div>
              <h3 className="mh-serif">{me ? me.name : c.name}</h3>
              <p className="adv-sub">{[c.cls, c.anc].filter(Boolean).join(" · ") || "Viajero"}</p>
              <div className="adv-stats">
                <div><Coins size={15} /><b>{me ? me.gold : 25}</b><small>Monedas de plata</small></div>
                <div><Backpack size={15} /><b>{me ? me.items.length : 3}</b><small>Objetos en la mochila</small></div>
                <div><Sparkles size={15} /><b>Nv {c.lvl}</b><small>Nivel de tu personaje</small></div>
              </div>
              {me ? (
                <>
                  <div className="adv-where"><Compass size={14} /><span>Estás en la <b>Plaza del Faro</b>, al amanecer</span></div>
                  <small className="adv-note">El mapa de la ciudad y los distritos llegan en la siguiente fase.</small>
                </>
              ) : (
                <>
                  <button type="button" className="adv-go mh-btn" disabled={busy} onClick={enter}>{busy ? "Entrando…" : "Entrar en Brumaria"}</button>
                  <small className="adv-note">Empiezas en la Plaza del Faro, al amanecer. Después no podrás cambiar de viajero.</small>
                </>
              )}
            </div>
          ) : (
            <div className="adv-empty"><Users size={26} /><b>Elige un personaje</b><small>Aquí verás tu ficha de viajero antes de entrar.</small></div>
          )}
        </aside>
      </div>
    </div>
  );
}

const CSS = `
.adv { display: flex; flex-direction: column; gap: 20px; padding-bottom: 24px; color: var(--mh-ink); }
.adv-hero { position: relative; min-height: 330px; border-radius: 26px; overflow: hidden; display: flex; align-items: flex-end; background: #0b0b24; color: #f4f0fa; }
.adv-sky { position: absolute; inset: 0; width: 100%; height: 100%; }
.adv-star { animation: adv-tw 4s ease-in-out infinite; } @keyframes adv-tw { 50% { opacity: .15; } }
.adv-win { animation: adv-tw 5s ease-in-out infinite; }
.adv-beam { transform-origin: 12px 4px; animation: adv-sweep 7s ease-in-out infinite alternate; } @keyframes adv-sweep { from { transform: rotate(-4deg); opacity: .55; } to { transform: rotate(5deg); opacity: .9; } }
.adv-fog { position: absolute; left: -10%; right: -10%; height: 90px; bottom: 0; background: radial-gradient(60% 100% at 50% 100%, rgba(220,214,250,.35), transparent); filter: blur(10px); animation: adv-drift 16s ease-in-out infinite alternate; }
.adv-fog.is-b { bottom: 24px; opacity: .6; animation-duration: 22s; animation-direction: alternate-reverse; } @keyframes adv-drift { from { transform: translateX(-4%); } to { transform: translateX(4%); } }
.adv-hi { position: relative; padding: 30px 34px; max-width: 620px; text-shadow: 0 2px 16px #000b; }
.adv-k { display: inline-flex; align-items: center; gap: 7px; font: 700 11px var(--font-body), 'Inter', system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #ffd36a; }
.adv-hi h1 { margin: 6px 0 4px; font-size: clamp(40px, 7vw, 68px); line-height: 1; letter-spacing: .02em; }
.adv-hi p { margin: 0 0 14px; font-size: 14.5px; line-height: 1.5; max-width: 520px; color: #e6e0f2; }
.adv-here { display: inline-flex; align-items: center; gap: 9px; font-size: 13px; padding: 6px 14px 6px 8px; border-radius: 99px; background: rgba(10,8,30,.55); border: 1px solid rgba(255,255,255,.14); backdrop-filter: blur(6px); }
.adv-av { display: inline-flex; } .adv-av > * { margin-left: -8px; box-shadow: 0 0 0 2px #1b1640; border-radius: 50%; } .adv-av > *:first-child { margin-left: 0; }
.adv-g { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 20px; align-items: start; }
.adv-p { border-radius: 22px; padding: 20px; background: var(--mh-panel); border: 1px solid var(--mh-line); }
.adv-p > header { display: flex; gap: 12px; margin-bottom: 14px; } .adv-p > header i { flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font: 800 13px var(--font-body), 'Inter', system-ui, sans-serif; font-style: normal; background: #E3B04B; color: #1a1408; }
.adv-p h2 { margin: 0; font-size: 17px; } .adv-p header p { margin: 3px 0 0; font-size: 12.5px; color: var(--mh-muted); line-height: 1.4; }
.adv-list { display: flex; flex-direction: column; gap: 8px; }
.adv-c { appearance: none; display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 11px 13px; border-radius: 14px; border: 1px solid var(--mh-line); background: var(--mh-panel2); color: inherit; font: inherit; cursor: pointer; transition: border-color .15s, background .15s, transform .15s; }
.adv-c:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--cc, #E3B04B) 60%, var(--mh-line)); }
.adv-c.is-on { border-color: var(--cc); background: color-mix(in srgb, var(--cc) 16%, var(--mh-panel2)); box-shadow: 0 0 0 1px var(--cc); }
.adv-cav { flex: none; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; font: 800 17px var(--font-body), 'Inter', system-ui, sans-serif; background: var(--cc, var(--mh-panel3)); color: #14111f; }
.adv-ct { flex: 1; min-width: 0; display: flex; flex-direction: column; } .adv-ct b { font-size: 14.5px; } .adv-ct small { font-size: 12px; color: var(--mh-muted); } .adv-ck { color: var(--cc); }
.adv-c.is-new { border-style: dashed; } .adv-c.is-new .adv-cav { background: color-mix(in srgb, #E3B04B 20%, transparent); color: #E3B04B; }
.adv-sheet { position: sticky; top: 8px; }
.adv-g.is-in { grid-template-columns: minmax(0, 520px); justify-content: center; }
.adv-where { display: flex; align-items: center; gap: 7px; width: 100%; justify-content: center; padding: 11px; border-radius: 12px; background: color-mix(in srgb, #E3B04B 14%, transparent); color: var(--mh-ink2); font-size: 13px; } .adv-where svg { color: #E3B04B; }
.adv-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 34px 10px; text-align: center; color: var(--mh-muted); border: 1px dashed var(--mh-line); border-radius: 16px; } .adv-empty b { color: var(--mh-ink); margin-top: 6px; } .adv-empty small { font-size: 12px; }
.adv-card { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding: 18px 14px 14px; border-radius: 18px; border: 1px solid color-mix(in srgb, var(--cc) 50%, var(--mh-line)); background: radial-gradient(90% 70% at 50% 0%, color-mix(in srgb, var(--cc) 24%, transparent), transparent 70%), var(--mh-panel2); animation: adv-in .4s both; }
@keyframes adv-in { from { opacity: 0; transform: translateY(8px); } }
.adv-portrait { width: 92px; height: 92px; border-radius: 50%; display: grid; place-items: center; font: 800 38px var(--font-body), 'Inter', system-ui, sans-serif; color: #14111f; background: var(--cc); box-shadow: 0 0 0 4px color-mix(in srgb, var(--cc) 30%, transparent), 0 12px 28px -10px var(--cc); margin-bottom: 8px; }
.adv-card h3 { margin: 0; font-size: 22px; } .adv-sub { margin: 0 0 8px; font-size: 13px; color: var(--mh-muted); }
.adv-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; margin: 6px 0 12px; }
.adv-stats > div { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 9px 4px; border-radius: 12px; background: color-mix(in srgb, var(--mh-ink) 6%, transparent); color: var(--cc); } .adv-stats b { font-size: 16px; color: var(--mh-ink); } .adv-stats small { font-size: 10px; line-height: 1.2; color: var(--mh-muted); }
.adv-go { width: 100%; padding: 12px; font-weight: 700; font-size: 14.5px; } .adv-note { margin-top: 6px; font-size: 11.5px; color: var(--mh-muted); }
@media (max-width: 900px) { .adv-g { grid-template-columns: 1fr; } .adv-sheet { position: static; } .adv-hi { padding: 22px 20px; } .adv-hero { min-height: 300px; } }
@media (prefers-reduced-motion: reduce) { .adv * { animation: none !important; } }
`;
