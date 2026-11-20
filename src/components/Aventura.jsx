"use client";
// Modo aventura · Fase 1: bienvenida a Brumaria y elección o creación del personaje de aventura (ficha ligera, separada de la hoja tradicional).
import { useEffect, useState } from "react";
import { Backpack, Check, Clock, Coins, Compass, Lock, MapPin, Plus, ScrollText, Sparkles, Sunrise, Users } from "lucide-react";
import { Avatar } from "./Social";
import { loadTraveller, loadTravellers, enterBrumaria, moveTraveller } from "@/lib/social";

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


// Fase 2: mapa de la ciudad
const DISTRICTS = [
  { id: "faro", name: "Plaza del Faro", x: 450, y: 150, c: "#E8C547", desc: "El corazón de Brumaria. El faro vigila la niebla y el tablón de noticias nunca está vacío." },
  { id: "jardines", name: "Jardines Colgantes", x: 170, y: 120, c: "#6FBF73", desc: "Terrazas verdes suspendidas sobre la niebla, llenas de secretos y flores que brillan de noche." },
  { id: "mercado", name: "Mercado de los Mil Tonos", x: 215, y: 285, c: "#E0823A", desc: "Toldos de mil colores, trueques y rumores que cambian de boca en boca." },
  { id: "gremios", name: "Barrio de los Gremios", x: 700, y: 245, c: "#5E93C9", desc: "Mercenarios, magos y artesanos. Aquí se cierran los trabajos." },
  { id: "linterna", name: "La Linterna Rota", x: 470, y: 330, c: "#D9644E", desc: "La taberna donde se encuentran los viajeros. Siempre hay una mesa libre." },
  { id: "muelles", name: "Muelles de Niebla", x: 160, y: 445, c: "#4FA39A", desc: "Barcos que llegan de ninguna parte y cargas que nadie reclama." },
  { id: "catacumbas", name: "Catacumbas del Faro", x: 720, y: 440, c: "#8E74D8", desc: "Cerradas bajo el faro. Se abrirán cuando la ciudad esté preparada.", locked: true },
];
const ROADS = ["faro:jardines", "faro:mercado", "faro:gremios", "faro:linterna", "linterna:mercado", "mercado:muelles", "linterna:muelles", "gremios:catacumbas", "linterna:catacumbas"];
const SCENES = {
  faro: "La niebla se retira con el primer sol. En el tablón del faro hay clavados tres avisos nuevos y alguien ha dejado una linterna encendida junto a la fuente.",
  jardines: "El camino sube entre helechos y flores que brillan débilmente. Desde la terraza más alta se oye el mar de niebla respirar bajo vuestros pies.",
  mercado: "Los toldos se agitan con el viento. Un vendedor pregona algo que nadie entiende y otro asegura que la niebla de hoy huele a canela.",
  gremios: "Martillos, conjuros y discusiones sobre precios se mezclan en las calles estrechas. En la puerta de cada gremio cuelga una lista de encargos.",
  linterna: "El fuego de la chimenea crepita y huele a pan caliente. Sobre la barra, una linterna rota sigue encendida desde hace años.",
  muelles: "Los barcos llegan de ninguna parte y atracan envueltos en niebla. Un cargamento sin dueño espera a que alguien lo reclame.",
  catacumbas: "Una reja antigua, sellada con el símbolo del faro. Del otro lado llega un frío que no pertenece a este mundo.",
};
// La hora de la ciudad es la misma para todos: cada franja dura dos horas reales.
const FRANJAS = [["Amanecer", Sunrise], ["Tarde", Sparkles], ["Noche", Clock]];
const franjaNow = () => Math.floor(Date.now() / 7200000) % 3;
function CityMap({ at, sel, onSel, crowd, meId }) {
  const pos = (id) => DISTRICTS.find((d) => d.id === id) || DISTRICTS[0];
  return (
    <svg className="adv-map" viewBox="0 0 900 560" role="group" aria-label="Mapa de Brumaria">
      <defs>
        <linearGradient id="mapSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a1642" /><stop offset=".6" stopColor="#3b3178" /><stop offset="1" stopColor="#7a68b6" /></linearGradient>
        <linearGradient id="mapFog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d8d2f5" stopOpacity="0" /><stop offset="1" stopColor="#d8d2f5" stopOpacity=".6" /></linearGradient>
        <filter id="mapGlow"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <rect width="900" height="560" fill="url(#mapSky)" />
      {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={(i * 173) % 900} cy={(i * 47) % 150} r="1.1" fill="#fff" opacity=".5" />)}
      <path d="M0 210 C120 170 220 220 330 190 C450 150 560 210 680 180 C780 160 850 190 900 170 L900 560 L0 560Z" fill="#2c2560" opacity=".7" />
      <path d="M0 300 C140 260 260 320 400 285 C540 250 650 320 780 290 L900 280 L900 560 L0 560Z" fill="#241e52" opacity=".85" />
      <path d="M0 400 C150 370 300 420 450 395 C600 370 750 420 900 390 L900 560 L0 560Z" fill="#1b1642" />
      {ROADS.map((r) => { const [a, b] = r.split(":").map(pos); const lock = a.locked || b.locked; return <path key={r} d={`M${a.x} ${a.y} Q${(a.x + b.x) / 2 + 20} ${(a.y + b.y) / 2 - 30} ${b.x} ${b.y}`} fill="none" stroke={lock ? "#6b5fa0" : "#c9b98a"} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" opacity={lock ? ".45" : ".75"} />; })}
      {DISTRICTS.map((d) => {
        const here = (crowd || []).filter((t) => (t.loc || "faro") === d.id && t.uid !== meId).map((t) => t.username);
        const on = sel === d.id;
        return (
          <g key={d.id} className={"adv-dist" + (on ? " is-on" : "") + (d.locked ? " is-lock" : "")} transform={`translate(${d.x} ${d.y})`} onClick={() => onSel(d.id)} role="button" tabIndex={0} aria-label={d.name} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSel(d.id))} style={{ "--dc": d.c }}>
            <circle r="74" fill={d.c} opacity={on ? ".28" : ".1"} filter="url(#mapGlow)" />
            <circle r="56" fill="none" stroke={d.c} strokeWidth={on ? 3 : 1.5} strokeDasharray={on ? "0" : "3 5"} opacity={on ? 1 : ".6"} />
            {d.id === "faro" && <><path d="M-10 26 L-6 -22 L6 -22 L10 26Z" fill="#2a2358" stroke={d.c} strokeWidth="1.5" /><rect x="-8" y="-34" width="16" height="12" fill="#ffe9a8" /><path d="M-11 -34 L0 -46 L11 -34Z" fill="#1c1744" stroke={d.c} /></>}
            {d.id === "jardines" && [[-30, 8], [-8, -6], [16, 6], [34, -4]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="13" fill="#3f8f55" /><circle cx={x - 4} cy={y - 3} r="6" fill="#6FBF73" /></g>)}
            {d.id === "mercado" && [[-34, 6, "#E0823A"], [-10, -8, "#D9644E"], [14, 4, "#E8C547"], [36, -6, "#A58BE8"]].map(([x, y, col], i) => <g key={i}><path d={`M${x - 12} ${y} L${x} ${y - 14} L${x + 12} ${y}Z`} fill={col} /><rect x={x - 9} y={y} width="18" height="16" fill="#2a2358" stroke={col} /></g>)}
            {d.id === "gremios" && [[-30, 6], [-4, -10], [22, 4]].map(([x, y], i) => <g key={i}><rect x={x - 11} y={y - 8} width="22" height="30" fill="#2a3a6a" stroke={d.c} /><rect x={x - 5} y={y + 2} width="4" height="6" fill="#ffd36a" /><rect x={x + 2} y={y + 2} width="4" height="6" fill="#ffd36a" /></g>)}
            {d.id === "linterna" && <><path d="M-26 6 L0 -24 L26 6Z" fill="#8a4a32" stroke={d.c} /><rect x="-22" y="6" width="44" height="26" fill="#3a2430" stroke={d.c} /><circle cx="0" cy="-4" r="6" fill="#ffd36a" /></>}
            {d.id === "muelles" && <><rect x="-40" y="22" width="80" height="6" fill="#6b4a32" /><path d="M-26 18 L-6 18 L-12 30 L-30 30Z" fill="#2c5a60" stroke={d.c} /><path d="M-18 18 L-18 -8 L2 14Z" fill="#e6e0f2" opacity=".85" /><path d="M14 20 L34 20 L28 30 L10 30Z" fill="#2c5a60" stroke={d.c} /></>}
            {d.id === "catacumbas" && <><path d="M-24 28 L-24 -4 C-24 -26 24 -26 24 -4 L24 28Z" fill="#14112e" stroke={d.c} strokeWidth="1.5" /><rect x="-8" y="2" width="16" height="26" fill="#05040f" /></>}
            <g transform="translate(0 62)"><rect x="-66" y="-12" width="132" height="24" rx="12" fill="rgba(10,8,30,.78)" stroke={d.c} strokeOpacity=".7" /><text y="4" textAnchor="middle" fontSize="12" fontWeight="700" fill="#f4f0fa" fontFamily="Inter, system-ui, sans-serif">{d.name.length > 20 ? d.name.slice(0, 19) + "…" : d.name}</text></g>
            {d.locked && <g transform="translate(0 -8)"><circle r="16" fill="rgba(10,8,30,.85)" stroke={d.c} /><path d="M-6 -2 v-4 a6 6 0 0 1 12 0 v4 M-8 -2 h16 v12 h-16z" fill="none" stroke="#f4f0fa" strokeWidth="2" transform="translate(0 1)" /></g>}
            {here.length > 0 && <g transform="translate(-4 -52)">{here.slice(0, 3).map((n, i) => <g key={n} transform={`translate(${i * 16} 0)`}><circle r="9" fill="#4FA39A" stroke="#14112e" strokeWidth="2" /><text y="3.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="Inter, system-ui, sans-serif">{n.charAt(0)}</text></g>)}</g>}
          </g>
        );
      })}
      <rect y="380" width="900" height="180" fill="url(#mapFog)" pointerEvents="none" />
      {(() => { const d = pos(at); return (
        <g className="adv-you" style={{ transform: `translate(${d.x + 34}px, ${d.y - 44}px)` }} pointerEvents="none"><circle r="14" fill="#E3B04B" opacity=".35" className="adv-pulse" /><circle r="10" fill="#E3B04B" stroke="#14112e" strokeWidth="2.5" /><text y="4" textAnchor="middle" fontSize="11" fontWeight="900" fill="#14112e" fontFamily="Inter, system-ui, sans-serif">TÚ</text></g>
      ); })()}
    </svg>
  );
}
function CityView({ me, crowd, onMoved }) {
  const [sel, setSel] = useState(me.loc || "faro");
  const [walking, setWalking] = useState(false);
  const [fr, setFr] = useState(franjaNow());
  useEffect(() => {
    const t = setInterval(() => setFr(franjaNow()), 30000);
    return () => clearInterval(t);
  }, []);
  const at = me.loc || "faro";
  const d = DISTRICTS.find((x) => x.id === sel);
  const cur = DISTRICTS.find((x) => x.id === at);
  const here = crowd.filter((t) => (t.loc || "faro") === sel && t.uid !== me.uid);
  const [FName, FIcon] = FRANJAS[fr];
  const go = async () => {
    if (walking || d.locked || sel === at) return;
    setWalking(true);
    const t = await moveTraveller(sel).catch(() => null); // el marcador se desliza por el mapa mientras se guarda
    setTimeout(() => {
      if (t) onMoved(t);
      setWalking(false);
    }, 1100);
    if (t) onMoved(t, true);
  };
  return (
    <div className="adv-city">
      <div className="adv-bar">
        <span><FIcon size={14} /> {FName} en Brumaria</span>
        <span><MapPin size={14} /> Estás en <b>{cur.name}</b></span>
        <span className="is-r"><Coins size={14} /> {me.gold} · <Backpack size={14} /> {me.items.length}</span>
      </div>
      <div className="adv-cg">
        <div className="adv-mapw"><CityMap at={at} sel={sel} onSel={setSel} crowd={crowd} meId={me.uid} /></div>
        <aside className="adv-pl" style={{ "--dc": d.c }}>
          <span className="adv-pk">{d.locked ? "Bloqueado" : sel === at ? "Tu ubicación" : "Distrito"}</span>
          <h3 className="mh-serif">{d.name}</h3>
          <p>{d.desc}</p>
          <div className="adv-scene"><ScrollText size={14} /><span>{SCENES[sel]}</span></div>
          <div className="adv-who"><b>Ahora aquí</b>{here.length ? here.map((t) => <span key={t.uid}><Avatar name={t.username} size={22} />{t.username}</span>) : <em>Nadie por ahora</em>}</div>
          <button type="button" className="adv-go mh-btn" disabled={d.locked || sel === at || walking} onClick={go}>{d.locked ? <><Lock size={14} /> Cerrado por ahora</> : walking ? "Caminando…" : sel === at ? "Ya estás aquí" : "Ir allí"}</button>
        </aside>
      </div>
      <div className="adv-ds">{DISTRICTS.map((x) => <button key={x.id} type="button" className={sel === x.id ? "is-on" : ""} style={{ "--dc": x.c }} onClick={() => setSel(x.id)}><i />{x.name}<small>{x.locked ? "🔒" : crowd.filter((t) => (t.loc || "faro") === x.id).length || ""}</small></button>)}</div>
    </div>
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
      <section className={"adv-hero" + (me ? " is-slim" : "")}>
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

      {me && <CityView me={me} crowd={crowd} onMoved={(t) => { setMe(t); setCrowd((l) => l.map((x) => (x.uid === t.uid ? t : x))); }} />}
      <div className={"adv-g" + (me ? " is-in" : "")} style={me ? { display: "none" } : undefined}>
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
.adv-city { display: flex; flex-direction: column; gap: 14px; }
.adv-bar { display: flex; flex-wrap: wrap; gap: 8px; } .adv-bar span { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 99px; font-size: 12.5px; background: var(--mh-panel); border: 1px solid var(--mh-line); color: var(--mh-ink2); } .adv-bar svg { color: #E3B04B; } .adv-bar .is-r { margin-left: auto; }
.adv-hero.is-slim { min-height: 170px; } .adv-hero.is-slim .adv-hi { padding: 18px 28px; } .adv-hero.is-slim h1 { font-size: 40px; margin: 2px 0 0; } .adv-hero.is-slim p, .adv-hero.is-slim .adv-here { display: none; }
.adv-cg { display: grid; grid-template-columns: 1fr; gap: 14px; align-items: start; }
.adv-pl { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto; grid-template-areas: "k k k" "h h h" "p s b" "p w b"; gap: 8px 20px; align-items: start; } .adv-pl > .adv-pk { grid-area: k; justify-self: start; } .adv-pl > h3 { grid-area: h; } .adv-pl > p { grid-area: p; } .adv-pl > .adv-scene { grid-area: s; } .adv-pl > .adv-who { grid-area: w; } .adv-pl > .adv-go { grid-area: b; align-self: center; width: 240px; }
.adv-mapw { border-radius: 22px; overflow: hidden; border: 1px solid var(--mh-line); background: #1a1642; } .adv-map { display: block; width: 100%; height: auto; }
.adv-dist { cursor: pointer; transition: transform .2s; } .adv-dist:hover circle:nth-child(2) { stroke-opacity: 1; } .adv-dist.is-lock { opacity: .75; } .adv-dist:focus-visible { outline: none; }
.adv-you { transition: transform 1s cubic-bezier(.45,0,.2,1); }
.adv-pulse { transform-box: fill-box; transform-origin: center; animation: adv-pl 1.6s ease-in-out infinite; } @keyframes adv-pl { 0%, 100% { transform: scale(1); opacity: .5; } 50% { transform: scale(1.6); opacity: 0; } }
.adv-pl { padding: 18px 20px; border-radius: 20px; background: linear-gradient(160deg, color-mix(in srgb, var(--dc) 16%, var(--mh-panel)), var(--mh-panel) 60%); border: 1px solid color-mix(in srgb, var(--dc) 50%, var(--mh-line)); }
.adv-pk { align-self: flex-start; font: 700 10px var(--font-body), 'Inter', system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; padding: 3px 10px; border-radius: 99px; background: var(--dc); color: #14111f; } .adv-pl h3 { margin: 0; font-size: 22px; } .adv-pl p { margin: 0; font-size: 13px; line-height: 1.5; color: var(--mh-ink2); }
.adv-scene { display: flex; gap: 9px; padding: 11px 12px; border-radius: 13px; font-size: 12.5px; line-height: 1.5; font-style: italic; color: var(--mh-ink2); background: color-mix(in srgb, var(--mh-ink) 6%, transparent); border-left: 3px solid var(--dc); } .adv-scene svg { flex: none; margin-top: 3px; color: var(--dc); }
.adv-who { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12.5px; } .adv-who b { width: 100%; font: 700 10.5px var(--font-body), 'Inter', system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--mh-muted); } .adv-who span { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 4px; border-radius: 99px; background: color-mix(in srgb, var(--mh-ink) 7%, transparent); } .adv-who em { color: var(--mh-muted); }
.adv-ds { display: flex; flex-wrap: wrap; gap: 8px; } .adv-ds button { appearance: none; display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 99px; border: 1px solid var(--mh-line); background: var(--mh-panel); color: var(--mh-ink); font: 600 12.5px var(--font-body), 'Inter', system-ui, sans-serif; cursor: pointer; } .adv-ds button i { width: 9px; height: 9px; border-radius: 50%; background: var(--dc); } .adv-ds button.is-on { border-color: var(--dc); background: color-mix(in srgb, var(--dc) 18%, var(--mh-panel)); } .adv-ds small { color: var(--mh-muted); font-weight: 700; }
@media (max-width: 900px) { .adv-pl { display: flex; flex-direction: column; } .adv-pl > .adv-go { width: 100%; } }
@media (max-width: 900px) { .adv-g { grid-template-columns: 1fr; } .adv-sheet { position: static; } .adv-hi { padding: 22px 20px; } .adv-hero { min-height: 300px; } }
@media (prefers-reduced-motion: reduce) { .adv * { animation: none !important; } }
`;
