"use client";
// Modo aventura · Fase 1: bienvenida a Brumaria y elección o creación del personaje de aventura (ficha ligera, separada de la hoja tradicional).
import { useEffect, useState } from "react";
import { ArrowLeft, Backpack, Feather, Flame, HandCoins, Check, Clock, Coins, Eye, Compass, Lock, MapPin, Plus, ScrollText, Sparkles, Sunrise, Users } from "lucide-react";
import { Avatar } from "./Social";
import { loadTraveller, loadTravellers, enterBrumaria, moveTraveller, markFound, loadCity, decide } from "@/lib/social";

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
function CityView({ me, crowd, city, onDecided, onMoved }) {
  const [sel, setSel] = useState(me.loc || "faro");
  const [exp, setExp] = useState(null);
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
      {exp ? <Explore id={exp} fr={fr} me={me} city={city} onBack={() => setExp(null)} onFound={onMoved} onDecided={onDecided} /> : (
      <div className="adv-cg">
        <div className="adv-mapw"><CityMap at={at} sel={sel} onSel={setSel} crowd={crowd} meId={me.uid} /></div>
        <aside className="adv-pl" style={{ "--dc": d.c }}>
          <span className="adv-pk">{d.locked ? "Bloqueado" : sel === at ? "Tu ubicación" : "Distrito"}</span>
          <h3 className="mh-serif">{d.name}</h3>
          <p>{d.desc}</p>
          <div className="adv-scene"><ScrollText size={14} /><span>{SCENES[sel]}</span></div>
          <div className="adv-who"><b>Ahora aquí</b>{here.length ? here.map((t) => <span key={t.uid}><Avatar name={t.username} size={22} />{t.username}</span>) : <em>Nadie por ahora</em>}</div>
          <button type="button" className="adv-go mh-btn" disabled={d.locked || (sel === at && !POIS[sel]) || walking} onClick={sel === at ? () => setExp(sel) : go}>{d.locked ? <><Lock size={14} /> Cerrado por ahora</> : walking ? "Caminando…" : sel === at ? (POIS[sel] ? "Explorar el distrito" : "Ya estás aquí") : "Ir allí"}</button>
        </aside>
      </div>)}
      {!exp && <PulsePanel city={city} />}
      <div className="adv-ds">{DISTRICTS.map((x) => <button key={x.id} type="button" className={sel === x.id ? "is-on" : ""} style={{ "--dc": x.c }} onClick={() => setSel(x.id)}><i />{x.name}<small>{x.locked ? "🔒" : crowd.filter((t) => (t.loc || "faro") === x.id).length || ""}</small></button>)}</div>
    </div>
  );
}

// Fase 3: explorar un distrito
const POIS = {
  faro: [
    { id: "tablon", n: "Tablón de noticias", x: 250, y: 300, open: [0, 1, 2], text: "Tres avisos clavados con chinchetas oxidadas: «Se busca a quien devuelva la linterna del farero», «Barco sin nombre atracado en el muelle tres» y «Prohibido bajar a las catacumbas, de nuevo»." },
    { id: "fuente", n: "Fuente de los deseos", x: 520, y: 330, open: [0, 1, 2], text: "El agua de la fuente huele a sal. Dicen que las monedas que se lanzan a medianoche vuelven distintas a quien las tiró." },
    { id: "puerta", n: "Puerta del faro", x: 700, y: 230, open: [0], text: "La puerta del faro solo se abre al amanecer, cuando el farero baja a por pan caliente. Ahora el cerrojo sigue echado." },
    { id: "banco", n: "Banco del mirador", x: 120, y: 360, open: [1, 2], text: "Desde aquí se ve cómo la niebla se mueve como un animal dormido. Alguien ha grabado un nombre en el respaldo." },
  ],
  linterna: [
    { id: "barra", n: "La barra", x: 330, y: 330, open: [0, 1, 2], text: "La tabernera limpia un vaso que ya estaba limpio. «Aquí todo el mundo paga con historias antes que con monedas», dice sin mirarte." },
    { id: "chimenea", n: "La chimenea", x: 690, y: 290, open: [0, 1, 2], text: "El fuego de la chimenea no consume la leña. Los clientes más veteranos aseguran que arde con los recuerdos de quienes se sientan a su lado." },
    { id: "mesa", n: "Mesa de los viajeros", x: 520, y: 360, open: [1, 2], text: "Una mesa larga, siempre medio vacía. Aquí se sientan quienes acaban de llegar a Brumaria y todavía no saben qué buscan." },
    { id: "sotano", n: "Escalera del sótano", x: 130, y: 300, open: [2], text: "Una trampilla tras la barra. Solo se abre de noche, cuando se apaga la última lámpara y el tabernero baja con una vela." },
  ],
};
POIS.jardines = [
  { id: "invernadero", n: "Invernadero de cristal", x: 300, y: 300, open: [0, 1], text: "Tras el cristal empañado crecen flores que no tienen nombre. La jardinera asegura que florecen cuando alguien les cuenta un secreto." },
  { id: "mirador", n: "Mirador de la niebla", x: 640, y: 250, open: [0, 1, 2], text: "Desde la barandilla se ve el mar de niebla ondularse bajo vuestros pies. A veces, algo enorme se mueve muy abajo." },
  { id: "estanque", n: "Estanque de luciérnagas", x: 480, y: 360, open: [2], text: "De noche el estanque se llena de luces que dibujan caminos en el agua. Nadie sabe adónde llevan." },
];
POIS.mercado = [
  { id: "puesto", n: "Puesto de especias", x: 260, y: 300, open: [0, 1], text: "El vendedor ofrece canela de las islas hundidas y pimienta que, según él, solo pica a los mentirosos." },
  { id: "trueque", n: "Rincón del trueque", x: 520, y: 340, open: [0, 1, 2], text: "Aquí no se aceptan monedas: un abanico por una brújula, una historia por un mapa. Alguien intercambia un reloj que no marca ninguna hora." },
  { id: "adivina", n: "Carpa de la adivina", x: 700, y: 280, open: [1, 2], text: "Una carpa de terciopelo púrpura. La adivina baraja cartas en blanco y asegura que cada cual lee en ellas lo que necesita." },
];
POIS.gremios = [
  { id: "herreria", n: "Herrería del gremio", x: 250, y: 300, open: [0, 1], text: "El golpe del martillo marca el compás del barrio. Una armadura a medio forjar espera junto al yunque, con un nombre grabado que nadie ha venido a reclamar." },
  { id: "encargos", n: "Tablón de encargos", x: 520, y: 330, open: [0, 1, 2], text: "Escoltas, rescates, recados. Un cartel sin firma, con letra temblorosa, ofrece una bolsa de oro por recuperar «lo que cayó del faro»." },
  { id: "archivo", n: "Archivo de los magos", x: 720, y: 260, open: [1], text: "Una puerta baja con un candado de sombra. Solo se abre a media tarde, cuando el archivero sale a tomar el té." },
];
POIS.muelles = [
  { id: "barco", n: "Barco sin nombre", x: 300, y: 320, open: [0, 1, 2], text: "Atracado en el muelle tres, sin tripulación ni bandera. Las velas están húmedas, como si acabara de llegar de muy lejos." },
  { id: "cargamento", n: "Cargamento sin dueño", x: 560, y: 360, open: [0, 1], text: "Cajas selladas con cera verde. Una de ellas se mueve sola de vez en cuando." },
  { id: "farol", n: "Farol del embarcadero", x: 700, y: 270, open: [2], text: "Solo se enciende de noche. Su luz atrae a los barcos que no existen en ningún mapa." },
];
const FSTATE = { 0: "al amanecer", 1: "por la tarde", 2: "de noche" };
const SKY = [["#2b2358", "#e9a06a"], ["#3a3a88", "#f0b27a"], ["#0b0b24", "#7a68b6"]]; // amanecer, tarde, noche (arriba, abajo)
function Scene({ id, fr }) {
  const tav = id === "linterna";
  const [c1, c2] = SKY[fr] || SKY[2];
  const night = fr === 2;
  const ground = { faro: "#241e52", jardines: "#1f3a3a", mercado: "#3a2a4a", gremios: "#2a2f4f", muelles: "#1d3440" }[id] || "#241e52";
  return (
    <svg className="adv-scn" viewBox="0 0 900 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id={"scS" + id} x1="0" y1="0" x2="0" y2="1">{tav ? <><stop offset="0" stopColor="#3a2430" /><stop offset="1" stopColor="#1a1018" /></> : <><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></>}</linearGradient><radialGradient id="scG" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ffd36a" stopOpacity=".7" /><stop offset="1" stopColor="#ffd36a" stopOpacity="0" /></radialGradient></defs>
      <rect width="900" height="460" fill={"url(#scS" + id + ")"} />
      {!tav && night && Array.from({ length: 30 }, (_, i) => <circle key={i} cx={(i * 173) % 900} cy={(i * 47) % 200} r="1.1" fill="#fff" opacity=".6" />)}
      {!tav && <><circle cx="170" cy="86" r="40" fill="url(#scG)" opacity=".5" /><circle cx="170" cy="86" r="16" fill={night ? "#fff7d6" : "#ffe3a0"} /><path d="M0 300 L120 250 L260 285 L400 230 L560 280 L720 235 L900 280 L900 460 L0 460Z" fill="#2c2560" opacity={night ? 1 : 0.7} /></>}
      {id === "faro" && <>
        <path d="M672 330 L688 90 L732 90 L748 330Z" fill="#efe9fb" stroke="#9a8fe0" /><path d="M678 250 L742 250 M683 190 L737 190" stroke="#c9486a" strokeWidth="10" /><rect x="676" y="56" width="48" height="34" fill="#ffe9a8" /><path d="M668 56 L700 24 L732 56Z" fill="#1c1744" />{night && <path d="M724 72 L900 20 L900 150Z" fill="#ffe9a8" opacity=".25" />}
        <rect y="330" width="900" height="130" fill={ground} />{Array.from({ length: 6 }, (_, r) => Array.from({ length: 14 }, (_, c) => <rect key={r + "-" + c} x={20 + c * 64 + (r % 2) * 32} y={338 + r * 20} width="52" height="12" rx="4" fill="#31296a" />))}
        <g transform="translate(520 330)"><ellipse rx="78" ry="20" fill="#3d3480" stroke="#8a7fd0" /><ellipse rx="64" ry="14" fill="#5b8fd0" opacity=".8" /><rect x="-6" y="-42" width="12" height="42" fill="#8a7fd0" /><path d="M-22 -42 Q0 -66 22 -42" fill="none" stroke="#9fd0ff" strokeWidth="3" /></g>
        <g transform="translate(250 300)"><rect x="-6" y="-60" width="12" height="90" fill="#6b4a32" /><rect x="-52" y="-62" width="104" height="58" fill="#8a6a44" stroke="#4a3320" strokeWidth="2" /><rect x="-40" y="-52" width="26" height="20" fill="#f1e4c0" /><rect x="-8" y="-52" width="22" height="26" fill="#f1e4c0" /><rect x="20" y="-52" width="24" height="18" fill="#f1e4c0" /></g>
        <rect x="100" y="336" width="60" height="8" fill="#6b4a32" /><rect x="106" y="344" width="6" height="14" fill="#6b4a32" /><rect x="148" y="344" width="6" height="14" fill="#6b4a32" />
      </>}
      {id === "jardines" && <>
        <rect y="330" width="900" height="130" fill={ground} />
        {[[120, 330], [330, 350], [500, 320], [760, 340], [880, 360]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y - 30} r="56" fill={i % 2 ? "#3f8f55" : "#2f7a47"} /><circle cx={x - 18} cy={y - 44} r="26" fill="#6FBF73" opacity=".7" /><rect x={x - 5} y={y} width="10" height="40" fill="#4a3320" /></g>)}
        <g transform="translate(300 300)"><path d="M-70 0 L-70 -60 Q0 -110 70 -60 L70 0Z" fill="#9fd0e0" opacity=".35" stroke="#cfeff7" strokeWidth="2" /><path d="M-70 0 H70" stroke="#cfeff7" strokeWidth="3" />{[-40, -10, 24].map((x) => <circle key={x} cx={x} cy="-16" r="9" fill="#e86ab0" />)}</g>
        <rect x="560" y="268" width="170" height="10" fill="#8a6a44" /><rect x="574" y="278" width="6" height="60" fill="#6b4a32" /><rect x="710" y="278" width="6" height="60" fill="#6b4a32" />
        <ellipse cx="500" cy="372" rx="110" ry="24" fill="#2a5a7a" opacity=".85" />{night && [[440, 366], [490, 376], [540, 364], [520, 382]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill="#fff7a0" />)}
      </>}
      {id === "mercado" && <>
        <rect y="340" width="900" height="120" fill={ground} />
        {[[120, "#E0823A"], [310, "#D9644E"], [500, "#E8C547"], [690, "#A58BE8"]].map(([x, c], i) => <g key={i}><path d={`M${x - 70} 230 L${x} 190 L${x + 70} 230 Z`} fill={c} /><rect x={x - 70} y="230" width="140" height="14" fill={c} opacity=".8" /><rect x={x - 62} y="244" width="6" height="100" fill="#4a3320" /><rect x={x + 56} y="244" width="6" height="100" fill="#4a3320" /><rect x={x - 56} y="300" width="112" height="44" fill="#5a3c28" />{[-34, -8, 18, 40].map((o) => <circle key={o} cx={x + o} cy="296" r="9" fill={["#E8C547", "#D9644E", "#6FBF73", "#A58BE8"][(o + 40) % 4]} />)}</g>)}
        <g transform="translate(790 300)"><path d="M0 60 V-20" stroke="#4a3320" strokeWidth="4" /><path d="M0 -20 Q50 -10 50 20 Q10 30 0 -20" fill="#8a2f6a" /></g>
      </>}
      {id === "gremios" && <>
        <rect y="340" width="900" height="120" fill={ground} />
        {[[110, 150, 160], [300, 130, 190], [500, 160, 150], [690, 120, 210]].map(([x, w, h], i) => <g key={i}><rect x={x} y={340 - h} width={w} height={h} fill="#2a3a6a" stroke="#5E93C9" /><rect x={x + 14} y={340 - h + 20} width="14" height="20" fill="#ffd36a" opacity={night ? 1 : 0.4} /><rect x={x + w - 28} y={340 - h + 20} width="14" height="20" fill="#ffd36a" opacity={night ? 1 : 0.4} /><rect x={x + w / 2 - 12} y="300" width="24" height="40" fill="#1a1f40" /></g>)}
        <g transform="translate(250 330)"><rect x="-30" y="-22" width="60" height="24" fill="#3a3a44" stroke="#8a8aa0" /><path d="M-14 -22 L-14 -42 L14 -42 L14 -22" fill="#5a5a66" /><circle cx="42" cy="-12" r="6" fill="#E0823A" /></g>
      </>}
      {id === "muelles" && <>
        <rect y="320" width="900" height="140" fill="#2a4a5a" opacity=".85" />{Array.from({ length: 6 }, (_, i) => <path key={i} d={`M0 ${340 + i * 20} Q150 ${330 + i * 20} 300 ${340 + i * 20} T600 ${340 + i * 20} T900 ${340 + i * 20}`} fill="none" stroke="#8ab6c4" strokeOpacity=".35" />)}
        <rect x="40" y="300" width="780" height="14" fill="#7b5a3c" />{Array.from({ length: 14 }, (_, i) => <rect key={i} x={50 + i * 56} y="314" width="8" height="46" fill="#5a3c28" />)}
        <g transform="translate(300 300)"><path d="M-90 0 L90 0 L60 40 L-60 40Z" fill="#2c5a60" stroke="#8fbfc0" /><rect x="-4" y="-130" width="8" height="130" fill="#6b4a32" /><path d="M4 -126 L84 -10 L4 -10Z" fill="#e6e0f2" opacity=".9" /></g>
        {[[520, 290], [580, 280], [640, 290]].map(([x, y], i) => <rect key={i} x={x} y={y} width="48" height="30" fill="#6b4a32" stroke="#3a2418" />)}
        <g transform="translate(700 270)"><rect x="-3" y="0" width="6" height="40" fill="#3a3a44" /><rect x="-10" y="-22" width="20" height="22" rx="4" fill={night ? "#ffd36a" : "#6b5a40"} />{night && <circle cy="-10" r="40" fill="url(#scG)" />}</g>
      </>}
      {tav && <>
        <rect y="320" width="900" height="140" fill="#2a1a14" />{Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 78} y="320" width="76" height="140" fill="none" stroke="#1a100c" />)}
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x={i * 92 + 8} y="30" width="76" height="260" fill="none" stroke="#4a2c22" strokeWidth="2" />)}
        <rect x="610" y="170" width="170" height="170" fill="#4a3a38" stroke="#6b5448" strokeWidth="4" /><rect x="640" y="230" width="110" height="110" fill="#1a0e0a" /><path d="M660 340 Q690 250 720 340Z" fill="#E0823A" /><path d="M675 340 Q695 285 715 340Z" fill="#ffd36a" /><circle cx="695" cy="320" r="110" fill="url(#scG)" />
        <rect x="260" y="310" width="300" height="60" fill="#6b4a32" stroke="#3a2418" strokeWidth="3" /><rect x="260" y="300" width="300" height="14" fill="#8a6a44" />
        {[310, 360, 420, 480].map((x) => <rect key={x} x={x} y="276" width="14" height="24" rx="3" fill="#8fbfc0" opacity=".7" />)}
        <rect x="440" y="350" width="180" height="40" rx="6" fill="#5a3c28" /><rect x="450" y="390" width="10" height="40" fill="#3a2418" /><rect x="600" y="390" width="10" height="40" fill="#3a2418" />
        <rect x="90" y="285" width="90" height="12" fill="#5a3c28" /><path d="M90 297 L130 340 L180 340 L180 297Z" fill="#1a0e0a" />
        <g transform="translate(420 60)"><path d="M0 0 V50" stroke="#3a2418" strokeWidth="3" /><rect x="-12" y="50" width="24" height="32" rx="5" fill="#ffd36a" /><circle cy="66" r="52" fill="url(#scG)" /></g>
      </>}
    </svg>
  );
}
function Explore({ id, fr, me, city, onBack, onFound, onDecided }) {
  const [dlg, setDlg] = useState(null);
  const pois = POIS[id] || [];
  const [open, setOpen] = useState(null);
  const d = DISTRICTS.find((x) => x.id === id);
  const cur = pois.find((x) => x.id === open);
  const seen = (me.found || []).filter((k) => k.startsWith(id + ":")).map((k) => k.slice(id.length + 1));
  const pick = (x) => { setOpen(x.id); if (x.open.includes(fr) && !seen.includes(x.id)) markFound(id + ":" + x.id).then((t) => t && onFound(t)).catch(() => {}); };
  const done = pois.filter((x) => x.open.includes(fr));
  return (
    <div className="adv-ex" style={{ "--dc": d.c }}>
      <div className="adv-exh"><button type="button" className="adv-back" onClick={onBack}><ArrowLeft size={15} /> Volver al mapa</button><div><span className="adv-pk">Explorando</span><h3 className="mh-serif">{d.name}</h3></div><div className="adv-prog"><Eye size={14} /> <b>{seen.length}</b> / {pois.length} rincones vistos</div></div>
      <div className="adv-sc">
        <Scene id={id} fr={fr} />
        {pois.map((x) => { const on = x.open.includes(fr); return (
          <button key={x.id} type="button" className={"adv-poi" + (open === x.id ? " is-on" : "") + (on ? "" : " is-off") + (seen.includes(x.id) ? " is-seen" : "")} style={{ left: x.x / 9 + "%", top: x.y / 4.6 + "%" }} onClick={() => pick(x)}>
            <i>{on ? (seen.includes(x.id) ? <Check size={13} /> : <Eye size={13} />) : <Lock size={12} />}</i><span>{x.n}</span>
          </button>); })}
      </div>
      {dlg && <DecisionDlg key={dlg} dk={dlg} me={me} city={city} onClose={() => setDlg(null)} onDone={onDecided} />}
      <div className="adv-txt">
        {cur ? (<><b>{cur.n}</b>{!cur.open.includes(fr) && <em><Clock size={12} /> Solo abierto {cur.open.map((k) => FSTATE[k]).join(" y ")}</em>}<p>{cur.text}</p>{DECISIONS[id + ":" + cur.id] && cur.open.includes(fr) && <button type="button" className="adv-act" onClick={() => setDlg(id + ":" + cur.id)}><HandCoins size={14} /> {(me.decided || {})[id + ":" + cur.id] ? "Recordar lo que decidiste" : "Decidir qué hacer"}</button>}</>) : <p className="is-hint">Toca un rincón del lugar para mirarlo. Algunos solo se abren a ciertas horas.</p>}
      </div>
    </div>
  );
}

// Fase 4: decisiones. Cada una se toma una sola vez por viajero y mueve el Pulso de la ciudad.
const PULSE_COL = { Prosperidad: "#E8C547", Orden: "#5E93C9", Misterio: "#A58BE8" };
const DECISIONS = {
  "faro:tablon": { title: "Los tres avisos del faro", text: "Tres papeles ondean en el tablón. Alguien tiene que hacer algo con ellos antes de que la niebla suba y los borre. Los demás viajeros pasarán por aquí después de ti.", opts: [
    { k: "encargo", t: "Aceptar el encargo del farero", d: "Prometes devolver la linterna perdida.", gold: 15, rep: ["faro", 1], pulse: { Misterio: 1 }, out: "El farero te estrecha la mano con dedos fríos como el hierro. «Búscala antes de la noche», susurra, y te da una llave sin dientes.", log: "aceptó el encargo del farero" },
    { k: "arrancar", t: "Arrancar el aviso del barco sin nombre", d: "Preferirías que nadie sepa que ha llegado.", item: "Aviso arrugado", pulse: { Orden: -1, Misterio: 1 }, out: "El papel se deshace en tu mano. Cuando levantas la vista, alguien en la fuente ya te mira.", log: "arrancó el aviso del barco sin nombre" },
    { k: "nota", t: "Dejar una nota para otros viajeros", d: "Escribes algo y lo clavas junto a los demás.", pulse: { Prosperidad: 1 }, note: true, out: "Tu nota queda clavada entre los avisos. Dentro de unas horas otro viajero la leerá y quizá la conteste.", log: "dejó una nota en el tablón" },
  ] },
  "jardines:estanque": { title: "Las luciérnagas del estanque", text: "Las luces del estanque se agrupan a tu alrededor, como esperando una respuesta.", opts: [
    { k: "seguir", t: "Seguir su camino de luz", d: "Las sigues hasta el final del jardín.", pulse: { Misterio: 2 }, rep: ["jardines", 1], out: "Las luciérnagas te llevan a una verja cubierta de hiedra. Detrás, algo respira dormido.", log: "siguió a las luciérnagas hasta el final del jardín" },
    { k: "frasco", t: "Atrapar unas pocas en un frasco", d: "Quizá sirvan para algo.", item: "Frasco de luciérnagas", pulse: { Orden: -1 }, out: "El frasco brilla en tu mochila. Detrás de ti, las demás luces se apagan una a una.", log: "atrapó luciérnagas en un frasco" },
    { k: "dejar", t: "Dejarlas en paz", d: "Te sientas un rato junto al agua.", pulse: { Prosperidad: 1 }, out: "El jardín parece agradecértelo: una flor se abre a tu lado.", log: "se sentó a contemplar el estanque" },
  ] },
  "mercado:trueque": { title: "El rincón del trueque", text: "Una vendedora te ofrece un cambio extraño: una brújula que no señala el norte.", opts: [
    { k: "cambiar", t: "Cambiar la brújula por 10 de plata", d: "Pagas 10 monedas por ella.", gold: -10, item: "Brújula del revés", pulse: { Prosperidad: 1, Misterio: 1 }, out: "La aguja gira hasta apuntar a un lugar que no está en ningún mapa.", log: "compró una brújula extraña en el trueque" },
    { k: "regatear", t: "Regatear una historia a cambio", d: "Ofreces contarle una historia que no conoce.", rep: ["mercado", 1], pulse: { Prosperidad: 1 }, out: "La vendedora sonríe y te da un pellizco de especias. «Una buena historia vale más que el oro».", log: "pagó con una historia en el trueque" },
    { k: "rechazar", t: "Declinar con educación", d: "No te fías del trato.", out: "Ella se encoge de hombros y cambia la brújula por un abanico al siguiente que pasa.", log: "rechazó un trato en el trueque" },
  ] },
  "gremios:encargos": { title: "El encargo sin firma", text: "Un cartel temblón ofrece una bolsa de oro por recuperar «lo que cayó del faro».", opts: [
    { k: "aceptar", t: "Arrancar el cartel y aceptar", d: "Nadie más parece haberse atrevido.", gold: 20, pulse: { Misterio: 1, Orden: -1 }, rep: ["gremios", 1], out: "Una bolsa pesada aparece en tu mano. El gremio te mira con una mezcla de respeto y lástima.", log: "aceptó el encargo sin firma del gremio" },
    { k: "avisar", t: "Avisar al gremio", d: "Alguien debería saber quién escribió esto.", pulse: { Orden: 2 }, rep: ["gremios", 1], out: "El maestro del gremio arruga el cartel y lo guarda sin decir palabra. Orden vuelve a la calle.", log: "avisó al gremio del encargo sin firma" },
    { k: "ignorar", t: "Ignorarlo", d: "No es asunto tuyo.", out: "El cartel sigue ahí cuando te vas, ondeando sin viento.", log: "ignoró el cartel sin firma" },
  ] },
  "linterna:mesa": { title: "La mesa de los viajeros", text: "Un viajero recién llegado se sienta frente a ti y no sabe a qué ha venido a Brumaria.", opts: [
    { k: "invitar", t: "Invitarle a una ronda (5 de plata)", d: "Pagas unas bebidas.", gold: -5, pulse: { Prosperidad: 1 }, rep: ["linterna", 1], out: "Brindáis por la niebla. Antes de que termine la noche, ya te cuenta su historia.", log: "invitó a un recién llegado en La Linterna Rota" },
    { k: "consejo", t: "Darle un consejo", d: "«No bajes a las catacumbas».", pulse: { Orden: 1, Misterio: -1 }, out: "El viajero asiente con demasiada seriedad. Aun así, se queda mirando hacia el sótano.", log: "aconsejó a un recién llegado" },
    { k: "secreto", t: "Contarle un secreto de la ciudad", d: "Le susurras lo del faro.", pulse: { Misterio: 2 }, out: "Se le iluminan los ojos. Sabes que ahora otro viajero buscará lo que tú ya has visto.", log: "compartió un secreto del faro" },
  ] },
  "muelles:cargamento": { title: "El cargamento sin dueño", text: "Una de las cajas selladas con cera verde se ha movido otra vez.", opts: [
    { k: "abrir", t: "Abrir la caja", d: "Rompes el sello.", item: "Esquirla verde", pulse: { Misterio: 1, Orden: -1 }, out: "Dentro hay una esquirla de cristal que late como un corazón diminuto. Todos los estibadores han dejado de trabajar.", log: "abrió una caja sellada en los muelles" },
    { k: "avisar", t: "Dar parte a los estibadores", d: "Que se encargue quien sepa.", pulse: { Orden: 1 }, rep: ["muelles", 1], out: "Los estibadores acordonan la zona y te dan las gracias con un gesto seco.", log: "dio parte de un cargamento sin dueño" },
    { k: "vigilar", t: "Vigilar desde lejos", d: "Esperas a ver qué sale.", pulse: { Misterio: 1 }, out: "Pasada la medianoche, alguien viene a recoger la caja. No lleva cara.", log: "vigiló un cargamento sin dueño" },
  ] },
};
function DecisionDlg({ dk, me, city, onClose, onDone }) {
  const D = DECISIONS[dk];
  const [pick, setPick] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const done = (me.decided || {})[dk];
  const chosen = D.opts.find((o) => o.k === (pick || done));
  const fxChips = (o) => [o.gold ? [(o.gold > 0 ? "+" : "") + o.gold + " plata", "#E8C547"] : null, o.item ? ["Objeto: " + o.item, "#6FBF73"] : null, o.rep ? ["Reputación " + (o.rep[1] > 0 ? "+" : "") + o.rep[1], "#E0823A"] : null, ...Object.entries(o.pulse || {}).map(([k, n]) => [k + " " + (n > 0 ? "+" : "−") + Math.abs(n), PULSE_COL[k]]), o.note ? ["Tu nota la verán todos", "#4FA39A"] : null].filter(Boolean);
  const confirm = async (o) => {
    if (busy) return;
    setBusy(true);
    const text = o.note ? note.trim().slice(0, 80) : "";
    const r = await decide(dk, o.k, { gold: o.gold, item: o.item, rep: o.rep, pulse: o.pulse, log: o.log + (text ? ": «" + text + "»" : ""), diary: D.title + " · " + o.t }).catch(() => null);
    setBusy(false);
    if (r) {
      setPick(o.k);
      onDone(r.t, r.city);
    }
  };
  const afford = (o) => !o.gold || o.gold > 0 || me.gold >= -o.gold;
  return (
    <div className="adv-dov" onClick={onClose}>
      <div className="adv-dlg" role="dialog" aria-label={D.title} onClick={(e) => e.stopPropagation()}>
        <span className="adv-pk">Decisión</span>
        <h3 className="mh-serif">{D.title}</h3>
        {!chosen ? (
          <>
            <p className="adv-dt">{D.text}</p>
            <div className="adv-ops">
              {D.opts.map((o) => (
                <button key={o.k} type="button" disabled={!afford(o) || busy} onClick={() => (o.note ? setPick("?" + o.k) : confirm(o))}>
                  <b>{o.t}</b><small>{o.d}{!afford(o) ? " · No tienes plata suficiente" : ""}</small>
                  <span>{fxChips(o).map(([f, c]) => <i key={f} style={{ "--fc": c }}>{f}</i>)}</span>
                </button>
              ))}
            </div>
            {pick && pick.startsWith("?") && (
              <div className="adv-note"><label>Escribe tu nota (máx. 80 letras)<input className="mh-input" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lo que quieras que lean los demás…" /></label><button type="button" className="mh-btn" disabled={!note.trim() || busy} onClick={() => confirm(D.opts.find((o) => "?" + o.k === pick))}>Clavar la nota</button></div>
            )}
            <small className="adv-dn">No se puede deshacer: lo que decidas queda en tu diario y en la actividad de la ciudad.</small>
          </>
        ) : (
          <>
            <div className="adv-ch"><b>{done && !pick ? "Ya decidiste aquí:" : "Has elegido:"}</b> {chosen.t}</div>
            <p className="adv-dt is-out">{chosen.out}</p>
            <div className="adv-fx">{fxChips(chosen).map(([f, c]) => <i key={f} style={{ "--fc": c }}>{f}</i>)}</div>
            <PulseBars pulse={city.pulse} />
            <button type="button" className="adv-go mh-btn" onClick={onClose}>Continuar</button>
          </>
        )}
      </div>
    </div>
  );
}
function PulseBars({ pulse }) {
  return <div className="adv-pm">{Object.entries(PULSE_COL).map(([n, c]) => <div key={n}><span>{n}</span><div><em style={{ width: (pulse[n] ?? 50) + "%", background: c }} /></div><b>{pulse[n] ?? 50}</b></div>)}</div>;
}
const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + " min" : m < 1440 ? Math.round(m / 60) + " h" : Math.round(m / 1440) + " d"; };
function PulsePanel({ city }) {
  return (
    <div className="adv-pulsep">
      <div className="adv-pph"><Flame size={15} /> <b>Pulso de Brumaria</b><small>Lo que decidimos entre todos</small></div>
      <PulseBars pulse={city.pulse} />
      {city.log.slice(0, 4).map((l, i) => <div key={i} className="adv-last"><Feather size={13} /> <span><b>{l.username}</b> {l.text} · hace {ago(l.at)}</span></div>)}
      {city.log.length === 0 && <div className="adv-last"><Feather size={13} /> <span>Aún nadie ha decidido nada. Explora un distrito y sé el primero.</span></div>}
    </div>
  );
}

export function AventuraPage({ chars, classColor, onCreate }) {
  const [sel, setSel] = useState(null);
  const [me, setMe] = useState(undefined); // undefined: cargando · null: aún sin viajero
  const [crowd, setCrowd] = useState([]);
  const [city, setCity] = useState({ pulse: { Prosperidad: 50, Orden: 50, Misterio: 50 }, log: [] });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    const pull = () => {
      loadTraveller().then((t) => alive && setMe(t)).catch(() => alive && setMe((m) => (m === undefined ? null : m)));
      loadTravellers().then((l) => alive && setCrowd(l)).catch(() => {});
      loadCity().then((c) => alive && setCity(c)).catch(() => {});
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

      {me && <CityView me={me} crowd={crowd} city={city} onDecided={(t, c) => { setMe(t); setCity(c); }} onMoved={(t) => { setMe(t); setCrowd((l) => l.map((x) => (x.uid === t.uid ? t : x))); }} />}
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
.adv-ex { display: flex; flex-direction: column; gap: 12px; }
.adv-exh { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; } .adv-exh h3 { margin: 4px 0 0; font-size: 24px; } .adv-exh > div:nth-child(2) { flex: 1; }
.adv-back { appearance: none; display: inline-flex; align-items: center; gap: 6px; font: 600 12.5px var(--font-body), 'Inter', system-ui, sans-serif; color: var(--mh-ink); background: var(--mh-panel); border: 1px solid var(--mh-line); border-radius: 99px; padding: 8px 14px; cursor: pointer; }
.adv-prog { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 99px; font-size: 12.5px; background: color-mix(in srgb, var(--dc) 16%, var(--mh-panel)); border: 1px solid color-mix(in srgb, var(--dc) 45%, var(--mh-line)); }
.adv-sc { position: relative; border-radius: 22px; overflow: hidden; aspect-ratio: 900 / 460; border: 1px solid color-mix(in srgb, var(--dc) 50%, var(--mh-line)); background: #1a1642; } .adv-scn { position: absolute; inset: 0; width: 100%; height: 100%; }
.adv-poi { position: absolute; transform: translate(-50%, -50%); appearance: none; display: inline-flex; align-items: center; gap: 7px; padding: 5px 13px 5px 5px; border-radius: 99px; border: 1.5px solid var(--dc); background: rgba(10,8,30,.82); color: #f4f0fa; font: 700 12px var(--font-body), 'Inter', system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(4px); animation: adv-bob 3s ease-in-out infinite; }
.adv-poi i { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--dc); color: #14111f; } .adv-poi.is-on { box-shadow: 0 0 0 3px color-mix(in srgb, var(--dc) 50%, transparent); background: rgba(10,8,30,.95); } .adv-poi.is-off { opacity: .65; border-style: dashed; } .adv-poi.is-off i { background: #5b4ea0; color: #fff; } .adv-poi.is-seen i { background: #4CC36B; }
@keyframes adv-bob { 50% { transform: translate(-50%, calc(-50% - 4px)); } }
.adv-txt { padding: 16px 20px; border-radius: 18px; background: var(--mh-panel); border: 1px solid var(--mh-line); min-height: 92px; } .adv-txt b { font-size: 16px; } .adv-txt em { display: inline-flex; align-items: center; gap: 5px; margin-left: 10px; font-style: normal; font-size: 11.5px; color: #E3B04B; } .adv-txt p { margin: 6px 0 0; font-size: 14px; line-height: 1.6; color: var(--mh-ink2); font-style: italic; } .adv-txt p.is-hint { color: var(--mh-muted); font-style: normal; margin: 0; }
.adv-act { appearance: none; margin-top: 10px; display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 12px; border: 0; background: #E3B04B; color: #1a1408; font: 800 13px var(--font-body), 'Inter', system-ui, sans-serif; cursor: pointer; }
.adv-dov { position: fixed; inset: 0; z-index: 90; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(8,6,12,.72); }
.adv-dlg { width: min(640px, 100%); max-height: calc(100dvh - 40px); overflow-y: auto; padding: 22px 24px; border-radius: 22px; background: var(--mh-panel); border: 1px solid var(--mh-line); box-shadow: 0 30px 70px -20px #000; display: flex; flex-direction: column; gap: 12px; } .adv-dlg h3 { margin: 0; font-size: 24px; } .adv-dlg .adv-pk { align-self: flex-start; background: #E8C547; }
.adv-dt { margin: 0; font-size: 14.5px; line-height: 1.6; color: var(--mh-ink2); } .adv-dt.is-out { font-style: italic; padding: 12px 14px; border-left: 3px solid #E3B04B; background: color-mix(in srgb, var(--mh-ink) 6%, transparent); border-radius: 0 12px 12px 0; }
.adv-ops { display: flex; flex-direction: column; gap: 9px; } .adv-ops button { appearance: none; text-align: left; display: flex; flex-direction: column; gap: 3px; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--mh-line); background: var(--mh-panel2); color: inherit; font: inherit; cursor: pointer; } .adv-ops button:hover:not(:disabled) { border-color: #E3B04B; transform: translateY(-1px); } .adv-ops button:disabled { opacity: .5; cursor: default; } .adv-ops b { font-size: 14.5px; } .adv-ops small { color: var(--mh-muted); font-size: 12.5px; } .adv-ops span, .adv-fx { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.adv-ops i, .adv-fx i { font-style: normal; font: 700 11px var(--font-body), 'Inter', system-ui, sans-serif; padding: 3px 10px; border-radius: 99px; background: color-mix(in srgb, var(--fc) 20%, transparent); color: var(--fc); border: 1px solid color-mix(in srgb, var(--fc) 50%, transparent); }
.adv-note { display: flex; gap: 10px; align-items: flex-end; } .adv-note label { flex: 1; display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--mh-muted); }
.adv-dn { color: var(--mh-muted); font-size: 11.5px; } .adv-ch { font-size: 12.5px; color: var(--mh-muted); } .adv-ch b { color: var(--mh-ink); }
.adv-pulsep { padding: 16px 18px; border-radius: 18px; background: var(--mh-panel); border: 1px solid var(--mh-line); display: flex; flex-direction: column; gap: 10px; } .adv-pph { display: flex; align-items: baseline; gap: 8px; } .adv-pph svg { color: #E3B04B; align-self: center; } .adv-pph small { color: var(--mh-muted); font-size: 12px; }
.adv-pm { display: flex; flex-direction: column; gap: 8px; } .adv-pm > div { display: grid; grid-template-columns: 96px 1fr 30px; align-items: center; gap: 10px; font-size: 12.5px; } .adv-pm > div > div { height: 9px; border-radius: 99px; background: color-mix(in srgb, var(--mh-ink) 10%, transparent); overflow: hidden; } .adv-pm em { display: block; height: 100%; border-radius: 99px; transition: width .6s; } .adv-pm b { text-align: right; }
.adv-last { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--mh-ink2); } .adv-last svg { color: var(--mh-muted); flex: none; }
@media (max-width: 900px) { .adv-g { grid-template-columns: 1fr; } .adv-sheet { position: static; } .adv-hi { padding: 22px 20px; } .adv-hero { min-height: 300px; } }
@media (prefers-reduced-motion: reduce) { .adv * { animation: none !important; } }
`;
