"use client";
// Modo aventura · Fase 1: bienvenida a Brumaria y elección o creación del personaje de aventura (ficha ligera, separada de la hoja tradicional).
import { useEffect, useState } from "react";
import { Dices, Image as ImageIcon, Backpack, BookOpen, MessageCircle, Send, Reply, Trash2, Trophy, Feather, Flame, HandCoins, Check, Clock, Coins, Eye, Compass, Lock, MapPin, Plus, ScrollText, Sparkles, Sunrise, Users } from "lucide-react";
import { Avatar } from "./Social";
import Puppet3D from "./Puppet3D";
import { rollDuality, effectOf, drawEncargos, ACTIONS, ENCARGOS, DIFF } from "@/lib/aventuraData";
import { loadZoneImg, saveZoneImg, syncTraveller, startAct, abandonAct, takeOffers, resolveAct, loadTraveller, loadTravellers, enterBrumaria, moveTraveller, markFound, loadCity, decide, loadChat, postChat, loadNotes, postNote, replyNote, deleteNote } from "@/lib/social";

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
const SCENES = {
  faro: "La niebla se retira con el primer sol. En el tablón del faro hay clavados tres avisos nuevos y alguien ha dejado una linterna encendida junto a la fuente.",
  jardines: "El camino sube entre helechos y flores que brillan débilmente. Desde la terraza más alta se oye el mar de niebla respirar bajo vuestros pies.",
  mercado: "Los toldos se agitan con el viento. Un vendedor pregona algo que nadie entiende y otro asegura que la niebla de hoy huele a canela.",
  gremios: "Martillos, conjuros y discusiones sobre precios se mezclan en las calles estrechas. En la puerta de cada gremio cuelga una lista de encargos.",
  linterna: "El fuego de la chimenea crepita y huele a pan caliente. Sobre la barra, una linterna rota sigue encendida desde hace años.",
  muelles: "Los barcos llegan de ninguna parte y atracan envueltos en niebla. Un cargamento sin dueño espera a que alguien lo reclame.",
  catacumbas: "Una reja antigua, sellada con el símbolo del faro. Del otro lado llega un frío que no pertenece a este mundo.",
};
// La hora de la ciudad es la hora de España (Madrid): amanecer 06:00–12:00, tarde 12:00–20:00 y noche 20:00–06:00.
// Las Catacumbas se abren cuando el Misterio de la ciudad llega a este nivel.
const CAT_AT = 60;
const syncCat = (city) => { const d = DISTRICTS.find((x) => x.id === "catacumbas"); d.locked = !(city.pulse.Misterio >= CAT_AT); d.desc = d.locked ? "Cerradas bajo el faro. Se abrirán cuando el Misterio de la ciudad llegue a " + CAT_AT + " (ahora " + city.pulse.Misterio + ")." : "La reja del faro se ha abierto. Del otro lado sube un frío que no pertenece a este mundo."; };
const FRANJAS = [["Amanecer", Sunrise], ["Tarde", Sparkles], ["Noche", Clock]];
const spainHour = (t) => Number(new Intl.DateTimeFormat("es-ES", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Madrid" }).format(t || Date.now())) % 24;
const franjaNow = () => { const h = spainHour(); return h >= 6 && h < 12 ? 0 : h < 20 && h >= 12 ? 1 : 2; };
const spainClock = (t) => new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Madrid" }).format(t);
const FR_HRS = ["06:00–12:00", "12:00–20:00", "20:00–06:00"];
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
POIS.catacumbas = [
  { id: "reja", n: "La reja abierta", x: 230, y: 310, open: [0, 1, 2], text: "La reja del faro ya no está sellada. Del otro lado baja una escalera de piedra mojada y se oye, muy lejos, algo parecido a un canto." },
  { id: "osario", n: "El osario", x: 520, y: 340, open: [1, 2], text: "Calaveras alineadas con un cuidado casi cariñoso. Cada una lleva grabado el nombre de un viajero que nunca llegó a la superficie." },
  { id: "altar", n: "Altar del farero", x: 720, y: 280, open: [2], text: "Un altar de piedra negra con una cuenca vacía, justo del tamaño de la linterna del farero. Alguien ha dejado una moneda dentro." },
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
  const ground = { catacumbas: "#1b1a2e", faro: "#241e52", jardines: "#1f3a3a", mercado: "#3a2a4a", gremios: "#2a2f4f", muelles: "#1d3440" }[id] || "#241e52";
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
      {id === "catacumbas" && <>
        <rect y="320" width="900" height="140" fill="#14131f" />{[120, 330, 540, 750].map((x) => <path key={x} d={`M${x - 70} 320 V170 Q${x} 90 ${x + 70} 170 V320`} fill="none" stroke="#4a4468" strokeWidth="10" />)}
        <g transform="translate(230 300)"><rect x="-60" y="-110" width="120" height="110" fill="#0b0a14" stroke="#6b6490" strokeWidth="4" />{[-40, -20, 0, 20, 40].map((x) => <path key={x} d={`M${x} -110 V0`} stroke="#6b6490" strokeWidth="3" />)}</g>
        {[[470, 350], [520, 360], [570, 350], [495, 335], [545, 335]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="14" fill="#cfc8e6" opacity=".85" />)}
        <g transform="translate(720 300)"><rect x="-50" y="-34" width="100" height="34" fill="#2a2840" stroke="#6b6490" /><circle cy="-34" r="12" fill="#0b0a14" stroke="#c9b3ff" /><circle cy="-46" r="40" fill="url(#scG)" opacity=".5" /></g>
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
// Fase 4: decisiones. Cada una se toma una sola vez por viajero y mueve el Pulso de la ciudad.
const PULSE_COL = { Prosperidad: "#E8C547", Orden: "#5E93C9", Misterio: "#A58BE8" };
const DECISIONS = {
  "catacumbas:altar": { title: "La cuenca vacía del altar", text: "La cuenca del altar espera algo. Lo que dejes aquí lo sabrá la ciudad entera.", opts: [
    { k: "linterna", t: "Dejar la luz de tu antorcha", d: "El altar absorbe la llama y las catacumbas respiran aliviadas.", pulse: { Orden: 2, Misterio: -1 }, rep: ["catacumbas", 1], out: "La llama se apaga, pero las sombras de la escalera retroceden un paso. Arriba, el faro brilla un poco más.", log: "dejó la luz de su antorcha en el altar de las catacumbas" },
    { k: "moneda", t: "Dejar una moneda de plata", d: "Pagas el peaje de las sombras (5 de plata).", gold: -5, pulse: { Prosperidad: 1, Misterio: 1 }, rep: ["catacumbas", 1], out: "La moneda tintinea hacia abajo, muy lejos. Alguien, allí, ha dado las gracias.", log: "pagó un peaje en el altar de las catacumbas" },
    { k: "llevar", t: "Llevarte lo que hay dentro", d: "Coges la moneda que alguien dejó.", item: "Moneda del altar", pulse: { Misterio: 2, Orden: -1 }, out: "La moneda está helada. La reja, a tu espalda, se cierra un poco.", log: "se llevó la moneda del altar de las catacumbas" },
  ] },
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
    if (o.note && text) postNote(text).catch(() => {});
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
const levelOf = (n) => (n >= 3 ? "Aliado" : n === 2 ? "Apreciado" : n === 1 ? "Conocido" : "Desconocido");
const ACH = [
  ["Primer paso", "Llegar a Brumaria.", () => true],
  ["Curioso", "Ver 5 rincones.", (m) => (m.found || []).length >= 5],
  ["Explorador", "Ver 12 rincones.", (m) => (m.found || []).length >= 12],
  ["Decidido", "Tomar 3 decisiones.", (m) => Object.keys(m.decided || {}).length >= 3],
  ["Voz de la ciudad", "Dejar una nota en el tablón.", (m) => (m.decided || {})["faro:tablon"] === "nota"],
  ["Conocido en el barrio", "Tener reputación en un distrito.", (m) => Object.values(m.rep || {}).some((n) => n >= 1)],
  ["Bajo el faro", "Pisar las Catacumbas.", (m) => (m.found || []).some((k) => k.startsWith("catacumbas:"))],
  ["Mochilero", "Llevar 6 objetos.", (m) => m.items.length >= 6],
];
function Journal({ me, onClose }) {
  const [tab, setTab] = useState("diario");
  const ach = ACH.map(([n, d, f]) => [n, d, f(me)]);
  const seen = (me.found || []).length, total = Object.values(POIS).reduce((a, l) => a + l.length, 0);
  return (
    <div className="adv-dov" onClick={onClose}>
      <div className="adv-dlg" role="dialog" aria-label="Tu diario" onClick={(e) => e.stopPropagation()}>
        <span className="adv-pk">Tu viajero</span><h3 className="mh-serif">{me.name}</h3>
        <div className="adv-tabs">{[["diario", "Diario"], ["rep", "Reputación"], ["logros", "Logros (" + ach.filter((a) => a[2]).length + "/" + ach.length + ")"]].map(([k, l]) => <button key={k} type="button" className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
        {tab === "diario" && (<div className="adv-jl"><small>{seen} de {total} rincones vistos · {Object.keys(me.decided || {}).length} decisiones</small>{(me.diary || []).length ? me.diary.map((e, i) => <div key={i}><Feather size={13} /><span>{e.text}</span><em>hace {ago(e.at)}</em></div>) : <p className="adv-dt">Aún no hay entradas. Lo que decidas en los distritos quedará escrito aquí.</p>}</div>)}
        {tab === "rep" && (<div className="adv-jl">{DISTRICTS.map((d) => { const n = (me.rep || {})[d.id] || 0; return <div key={d.id}><i style={{ background: d.c, width: 10, height: 10, borderRadius: 99 }} /><span>{d.name}</span><em style={{ color: n ? d.c : undefined }}>{levelOf(n)}</em></div>; })}</div>)}
        {tab === "logros" && (<div className="adv-ach">{ach.map(([n, d, ok]) => <div key={n} className={ok ? "is-ok" : ""}><Trophy size={16} /><b>{n}</b><small>{d}</small></div>)}</div>)}
        <button type="button" className="adv-go mh-btn" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
function Chat({ loc, place, me }) {
  const [msgs, setMsgs] = useState([]);
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    const pull = () => loadChat(loc).then((m) => alive && setMsgs(m)).catch(() => {});
    pull();
    const t = setInterval(pull, 4000);
    return () => { alive = false; clearInterval(t); };
  }, [loc]);
  const send = async () => {
    if (!txt.trim() || busy) return;
    setBusy(true);
    const m = await postChat(loc, txt).catch(() => null);
    setBusy(false);
    if (m) { setMsgs(m); setTxt(""); }
  };
  return (
    <div className="adv-chat">
      <div className="adv-ch-h"><MessageCircle size={15} /> <b>Charla en {place}</b><small>Lo ven quienes estén aquí</small></div>
      <div className="adv-ch-l">{msgs.length ? msgs.slice(-8).map((m, i) => <div key={i} className="adv-msg"><Avatar name={m.username} size={26} /><div><b>{m.username} <em>{m.name}</em></b><p>{m.text}</p></div><small>{ago(m.at)}</small></div>) : <p className="adv-dt">Nadie ha dicho nada todavía.</p>}</div>
      <form className="adv-ch-f" onSubmit={(e) => { e.preventDefault(); send(); }}><input className="mh-input" placeholder="Di algo a quienes están aquí…" maxLength={140} value={txt} onChange={(e) => setTxt(e.target.value)} /><button type="submit" className="mh-btn" disabled={busy || !txt.trim()} aria-label="Enviar"><Send size={14} /></button></form>
    </div>
  );
}
function NotesDlg({ me, onClose }) {
  const [notes, setNotes] = useState([]);
  const [txt, setTxt] = useState("");
  const [rep, setRep] = useState(null);
  const [rt, setRt] = useState("");
  useEffect(() => { loadNotes().then(setNotes).catch(() => {}); }, []);
  const add = async () => { const n = await postNote(txt).catch(() => null); if (n) { setNotes(n); setTxt(""); } };
  const reply = async (id) => { const n = await replyNote(id, rt).catch(() => null); if (n) { setNotes(n); setRep(null); setRt(""); } };
  const del = async (id) => { const n = await deleteNote(id).catch(() => null); if (n) setNotes(n); };
  return (
    <div className="adv-dov" onClick={onClose}>
      <div className="adv-dlg" role="dialog" aria-label="Notas del tablón" onClick={(e) => e.stopPropagation()}>
        <span className="adv-pk">Tablón</span><h3 className="mh-serif">Notas de otros viajeros</h3>
        <p className="adv-dt">Lo que han ido dejando los viajeros en el tablón de la Plaza del Faro. Las notas desaparecen a los 7 días.</p>
        <form className="adv-ch-f" onSubmit={(e) => { e.preventDefault(); add(); }}><input className="mh-input" placeholder="Clavar una nota nueva…" maxLength={140} value={txt} onChange={(e) => setTxt(e.target.value)} /><button type="submit" className="mh-btn" disabled={!txt.trim()}>Clavar</button></form>
        <div className="adv-notes">{notes.length ? notes.map((n) => (
          <div key={n.id} className="adv-nt"><div className="adv-nh"><Avatar name={n.username} size={24} /><b>{n.username}</b><small>hace {ago(n.at)}</small>{n.uid === me.uid && <button type="button" className="adv-x" aria-label="Borrar nota" onClick={() => del(n.id)}><Trash2 size={13} /></button>}</div><p>«{n.text}»</p>
            {n.replies.map((r, i) => <div key={i} className="adv-rp"><Reply size={12} /> <b>{r.username}</b> {r.text}</div>)}
            {rep === n.id ? <form className="adv-ch-f" onSubmit={(e) => { e.preventDefault(); reply(n.id); }}><input className="mh-input" autoFocus maxLength={100} value={rt} onChange={(e) => setRt(e.target.value)} placeholder="Tu respuesta…" /><button type="submit" className="mh-btn" disabled={!rt.trim()}>Enviar</button></form> : <button type="button" className="adv-rb" onClick={() => { setRep(n.id); setRt(""); }}><Reply size={13} /> Contestar</button>}</div>
        )) : <p className="adv-dt">El tablón está vacío. Clava la primera nota.</p>}</div>
        <button type="button" className="adv-go mh-btn" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
function Travellers({ crowd }) {
  return (
    <div className="adv-pulsep"><div className="adv-pph"><Users size={15} /> <b>Viajeros en Brumaria</b><small>{crowd.length} conectados hoy</small></div>
      <div className="adv-trv">{crowd.map((t) => { const d = DISTRICTS.find((x) => x.id === (t.loc || "faro")); return <div key={t.uid}><Avatar name={t.username} size={30} /><div><b>{t.name}</b><small>{t.username} · {t.cls || "Viajero"} · Nv {t.lvl}</small></div><em>{d ? d.name : ""}</em></div>; })}</div></div>
  );
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

// ---- Escenario a pantalla completa ----
const FR_KEY = ["amanecer", "tarde", "noche"];
const EXTS = ["webp", "jpg", "png"];
const SPEED = typeof window !== "undefined" && window.location.pathname.startsWith("/dev-preview") && new URLSearchParams(window.location.search).get("fast") ? 120 : 1; // solo en la vista previa de desarrollo
const imgCache = {};
// Primero la imagen subida desde la página; si no hay, la que esté en public/aventura.
const probe = (id, fk) => {
  const k = id + "-" + fk;
  if (imgCache[k] !== undefined) return Promise.resolve(imgCache[k]);
  return loadZoneImg(k).catch(() => null).then((d) => { if (d) { imgCache[k] = d; return d; } return probeStatic(id, fk); });
};
async function shrink(file) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const w = Math.min(1920, img.naturalWidth), h = Math.round((img.naturalHeight * w) / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(url);
  let q = 0.85, mime = "image/webp", d = c.toDataURL(mime, q);
  if (!d.startsWith("data:image/webp")) { mime = "image/jpeg"; d = c.toDataURL(mime, q); }
  while (d.length > 520000 && q > 0.4) { q -= 0.1; d = c.toDataURL(mime, q); }
  return d;
}
const probeStatic = (id, fk) => {
  const k = id + "-" + fk;
  return new Promise((res) => {
    let i = 0;
    const next = () => {
      if (i >= EXTS.length) { imgCache[k] = null; return res(null); }
      const src = "/aventura/" + k + "." + EXTS[i++];
      const im = new Image();
      im.onload = () => { imgCache[k] = src; res(src); };
      im.onerror = next;
      im.src = src;
    };
    next();
  });
};
function ZoneBg({ id, fr }) {
  const k = id + "-" + FR_KEY[fr];
  const [, tick] = useState(0);
  useEffect(() => { let a = true; probe(id, FR_KEY[fr]).then(() => a && tick((n) => n + 1)); return () => { a = false; }; }, [id, fr]);
  const src = imgCache[k];
  return <div className="fs-bg" key={k}>{src ? <img src={src} alt="" /> : <Scene id={id} fr={fr} />}</div>;
}
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const chipsFx = (o) => [o.gold ? [(o.gold > 0 ? "+" : "") + o.gold + " plata", "#E8C547"] : null, o.item ? ["Objeto: " + o.item, "#6FBF73"] : null, o.rep ? ["Reputación " + (o.rep[1] > 0 ? "+" : "") + o.rep[1], "#E0823A"] : null, ...Object.entries(o.pulse || {}).map(([k, n]) => [k + " " + (n > 0 ? "+" : "−") + Math.abs(n), PULSE_COL[k]])].filter(Boolean);
const dname = (id) => (DISTRICTS.find((x) => x.id === id) || {}).name || id;
const KIND = { esp: ["Éxito con Esperanza", "#E8C547"], mie: ["Éxito con Miedo", "#A58BE8"], fal: ["Fallo", "#D9644E"] };

// Prompts para generar las 21 imágenes (7 zonas × 3 franjas del día)
const STYLE = "Digital fantasy matte painting, painterly concept art, soft volumetric fog, dusk-violet and indigo palette with warm amber lantern accents, whimsical yet melancholic, a city built on terraces above a sea of mist, rich atmospheric depth, cinematic wide shot, no characters, no text, no logos, no watermark, 16:9";
const PBASE = {
  faro: "A wide cobblestone plaza with a tall white-and-red striped lighthouse rising on the right, its lamp glowing amber; a stone fountain in the centre-left, a wooden notice board crowded with pinned papers in the foreground, a lit lantern beside the fountain, terraced rooftops and a sea of mist beyond the railing",
  jardines: "Lush hanging gardens on suspended stone terraces above a sea of fog, a Victorian glass greenhouse glowing softly, ferns and bioluminescent flowers, a high wooden lookout balcony, a small pond with fireflies, vines draping over the edges, teal and emerald tones",
  mercado: "An empty market street, canopies and awnings in a thousand colours (orange, crimson, purple, mustard), hanging lanterns and strings of bunting, stalls with spices, fabrics and curiosities, a fortune teller's velvet tent at the back, cobblestones, barrels and crates in the foreground",
  gremios: "A narrow district of tall stone-and-timber guildhalls, a blacksmith forge glowing orange at ground level with an anvil and a half-forged armor, a mage guild tower with a purple shadow-lit door, guild banners and hanging signs, a quest board with pinned notices, blue-grey stone",
  linterna: "Interior of a cosy fantasy tavern, a huge stone fireplace on the right, a long wooden bar with mugs and bottles, a broken glowing lantern hanging from the beams above the bar, a long traveller's table half-empty, a trapdoor behind the bar leading down to a cellar, wooden beams, wine barrels",
  muelles: "Misty harbour docks, long wooden piers with ropes and barrels, a mysterious unmarked ship with damp pale sails moored at pier three, stacked crates sealed with green wax, a lone lamp post at the end of the pier, dark teal water, ships of unknown origin faintly visible in the haze",
  catacumbas: "Ancient catacombs beneath a lighthouse, a rusted iron gate standing open at the top of a wet stone staircase descending into darkness, rows of carved arches, neatly stacked skulls in an ossuary niche, a black stone altar with an empty socket and a single glinting coin, drifting mist along the floor, eerie but beautiful",
};
const PMOD = {
  amanecer: "at dawn, first golden-pink sunrays piercing the mist, cool blue shadows, fresh quiet morning",
  tarde: "at golden afternoon, warm low sun, long soft shadows, amber haze over the mist",
  noche: "at night, deep indigo darkness lit by warm lanterns and moonlight, stars above the mist",
};
const PMODZ = {
  linterna: { amanecer: "early morning, pale daylight through the windows, the fire reduced to embers, quiet", tarde: "afternoon, warm shafts of sunlight through the windows, dust in the air", noche: "night, crackling fire, candles and lantern glow, lively atmosphere but empty of people" },
  catacumbas: { amanecer: "a thin pale-pink shaft of dawn light entering from the gate above", tarde: "a faint amber shaft of afternoon light falling down the stairs", noche: "no daylight at all, only a cold violet glow from the depths" },
};
const promptOf = (z, fk) => PBASE[z] + ", " + (PMODZ[z] || PMOD)[fk] + ". " + STYLE;
function PromptsDlg({ onClose }) {
  const [z, setZ] = useState("faro");
  const [ok, setOk] = useState({});
  const [copied, setCopied] = useState("");
  const [prev, setPrev] = useState({});
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    let a = true;
    DISTRICTS.forEach((d) => FR_KEY.forEach((f) => probe(d.id, f).then((s) => { if (a) { setOk((o) => ({ ...o, [d.id + "-" + f]: !!s })); setPrev((o) => ({ ...o, [d.id + "-" + f]: s })); } })));
    return () => { a = false; };
  }, []);
  const up = async (k, file) => {
    setBusy(k); setErr("");
    try { const d = await shrink(file); await saveZoneImg(k, d); imgCache[k] = d; setOk((o) => ({ ...o, [k]: true })); setPrev((o) => ({ ...o, [k]: d })); } catch { setErr("No se pudo subir " + file.name + ". Prueba con otra imagen (png, jpg o webp)."); }
    setBusy("");
  };
  const valid = DISTRICTS.flatMap((d) => FR_KEY.map((f) => d.id + "-" + f));
  const many = async (files) => { for (const f of files) { const k = f.name.replace(/\.[^.]+$/, "").toLowerCase(); if (valid.includes(k)) await up(k, f); else setErr("«" + f.name + "» no coincide con ningún nombre (por ejemplo faro-amanecer.jpg)."); } };
  const del = async (k) => { await saveZoneImg(k, "").catch(() => {}); delete imgCache[k]; const s = await probe(k.split("-")[0], k.split("-")[1]); setOk((o) => ({ ...o, [k]: !!s })); setPrev((o) => ({ ...o, [k]: s })); };
  const have = Object.values(ok).filter(Boolean).length;
  const copy = async (k, txt) => { try { await navigator.clipboard.writeText(txt); } catch { const t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); } setCopied(k); setTimeout(() => setCopied(""), 1500); };
  return (
    <div className="adv-dov" onClick={onClose}>
      <div className="adv-dlg is-wide" role="dialog" aria-label="Imágenes de Brumaria" onClick={(e) => e.stopPropagation()}>
        <span className="adv-pk">Imágenes</span><h3 className="mh-serif">Fondos de Brumaria <small className="fs-cnt">{have} de 21 subidas</small></h3>
        <p className="adv-dt">Genera una imagen por zona y franja (16:9, 2560×1440, el motivo en el tercio central, menos de 600 KB en webp o jpg). Súbela aquí con «Subir imagen» (se reduce sola) o elige varias a la vez con nombres como <b>faro-amanecer.jpg</b>. Todos los viajeros verán las que subas. Hasta entonces se usa la ilustración de reserva.</p>
        <label className="fs-many mh-btn">Subir varias a la vez<input type="file" accept="image/*" multiple hidden onChange={(e) => { many([...e.target.files]); e.target.value = ""; }} /></label>
        {err && <p className="adv-dt" style={{ color: "#D9644E" }}>{err}</p>}
        <div className="adv-tabs">{DISTRICTS.map((d) => <button key={d.id} type="button" className={z === d.id ? "is-on" : ""} onClick={() => setZ(d.id)}>{d.name.split(" ")[0] === "La" ? "Linterna" : d.name.split(" ")[0]}</button>)}</div>
        {FR_KEY.map((f, i) => { const k = z + "-" + f; const t = promptOf(z, f); return (
          <div key={f} className="fs-pr">
            <div className="fs-prh"><b>{FRANJAS[i][0]} <small className="fs-cnt">{FR_HRS[i]} (hora de España)</small></b><code>{k}</code><i className={ok[k] ? "is-ok" : ""}>{ok[k] ? "Subida" : "Falta"}</i><button type="button" className="mh-btn" onClick={() => copy(k, t)}>{copied === k ? "Copiado" : "Copiar prompt"}</button></div>
            <div className="fs-up">{prev[k] && <img src={prev[k]} alt="" />}<label className="mh-btn">{busy === k ? "Subiendo…" : prev[k] ? "Cambiar imagen" : "Subir imagen"}<input type="file" accept="image/*" hidden disabled={!!busy} onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; if (f) up(k, f); }} /></label>{ok[k] && <button type="button" className="fs-link" onClick={() => del(k)}>Quitar</button>}</div>
            <textarea className="mh-input" readOnly rows={5} value={t} onFocus={(e) => e.target.select()} />
          </div>); })}
        <button type="button" className="adv-go mh-btn" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
function ResultDlg({ res, onClose }) {
  const [roll, setRoll] = useState(true);
  const [tmp, setTmp] = useState([7, 7]);
  useEffect(() => { const i = setInterval(() => setTmp([1 + Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 12)]), 70); const t = setTimeout(() => { setRoll(false); clearInterval(i); }, 1300); return () => { clearTimeout(t); clearInterval(i); }; }, []);
  const { r, fx, name } = res;
  const [kn, kc] = KIND[r.kind];
  return (
    <div className="adv-dov" onClick={() => !roll && onClose()}>
      <div className={"adv-dlg" + (!roll && r.kind === "fal" ? " is-fail" : "")} role="dialog" aria-label="Resultado" onClick={(e) => e.stopPropagation()}>{!roll && <Burst kind={r.crit ? "esp" : r.kind} />}
        <span className="adv-pk">Resultado</span><h3 className="mh-serif">{name}</h3>
        <div className={"fs-dice" + (roll ? " is-roll" : "")}>
          <div className="fs-die is-h"><small>Esperanza</small><b>{roll ? tmp[0] : r.h}</b></div>
          <div className="fs-die is-f"><small>Miedo</small><b>{roll ? tmp[1] : r.f}</b></div>
          <div className="fs-sum">{roll ? "…" : <><span>{r.h} + {r.f} {r.mod >= 0 ? "+" : "−"} {Math.abs(r.mod)} = <b>{r.total}</b></span><small>contra dificultad {r.df}</small></>}</div>
        </div>
        {!roll && (<>
          <div className={"adv-ch fs-pop" + (r.crit ? " is-crit" : "")} style={{ borderColor: kc, color: kc }}><b>{r.crit ? "¡Crítico! " : ""}{kn}</b></div>
          <p className="adv-dt is-out">{fx.text}</p>
          <div className="adv-fx">{chipsFx(fx).map(([f, c]) => <i key={f} style={{ "--fc": c }}>{f}</i>)}{!chipsFx(fx).length && <i style={{ "--fc": "#9a93ad" }}>Sin recompensa</i>}</div>
          <PulseBars pulse={res.city.pulse} />
          <button type="button" className="adv-go mh-btn" onClick={onClose}>Continuar</button>
        </>)}
      </div>
    </div>
  );
}
function EncDlg({ me, onPick, onClose, onMe }) {
  const [ids, setIds] = useState(me.offers && Date.now() - me.offers.at < 7200000 ? me.offers.ids : null);
  useEffect(() => { if (!ids) { const n = drawEncargos(me.done); setIds(n); takeOffers(n).then((t) => t && onMe(t)).catch(() => {}); } }, []); // eslint-disable-line
  const list = (ids || []).map((i) => ENCARGOS.find((e) => e.id === i)).filter(Boolean);
  return (
    <div className="adv-dov" onClick={onClose}>
      <div className="adv-dlg is-wide" role="dialog" aria-label="Encargos" onClick={(e) => e.stopPropagation()}>
        <span className="adv-pk">Tablón de encargos</span><h3 className="mh-serif">Elige un encargo</h3>
        <p className="adv-dt">Tres encargos al azar. Los que no cojas pueden volver más adelante. Solo puedes tener una cosa en curso a la vez; al terminar el tiempo tiras los dados con tu rasgo.</p>
        <div className="fs-enc">{list.map((e) => { const [dn, dc] = DIFF[e.df]; const mod = (me.tr || {})[e.tr] || 0; return (
          <button key={e.id} type="button" onClick={() => onPick(e)}><b>{e.t}</b><p>{e.x}</p>
            <span><i style={{ "--fc": "#E8C547" }}>{e.tr} {mod >= 0 ? "+" : "−"}{Math.abs(mod)}</i><i style={{ "--fc": dc }}>{dn}</i><i style={{ "--fc": "#5E93C9" }}>{e.m} min</i></span>
            <small>Recompensa: {chipsFx({ gold: e.g, item: e.it, rep: e.rp, pulse: e.pu }).map((c) => c[0]).join(" · ") || "—"}</small><small>{dname(e.z)}</small></button>); })}</div>
        <button type="button" className="adv-go mh-btn" onClick={onClose}>Ahora no</button>
      </div>
    </div>
  );
}
// Partículas de ambiente por zona (luciérnagas, brasas, niebla…): solo decoración.
const MOTE = { faro: "#FFE08A", jardines: "#9BE8A0", mercado: "#F2B26B", gremios: "#FF9A4D", linterna: "#FFB35C", muelles: "#B9E3F0", catacumbas: "#C9B3FF" };
function Ambient({ id, fr }) {
  const n = fr === 2 ? 18 : 9;
  return (
    <div className="fs-amb" aria-hidden="true">
      <i className="fs-fog is-a" /><i className="fs-fog is-b" />
      {Array.from({ length: n }, (_, i) => <i key={id + i} className="fs-mote" style={{ left: ((i * 53 + 11) % 96) + "%", bottom: -(i % 4) * 4 + "%", "--mc": MOTE[id] || "#fff", "--dur": 7 + (i % 6) * 1.7 + "s", "--del": -((i * 1.3) % 9) + "s", "--dx": ((i % 5) - 2) * 14 + "px", width: 3 + (i % 3) + "px", height: 3 + (i % 3) + "px" }} />)}
    </div>
  );
}
function Burst({ kind }) {
  const col = kind === "esp" ? "#E8C547" : kind === "mie" ? "#A58BE8" : "#D9644E";
  return <div className={"fs-burst k-" + kind} aria-hidden="true">{Array.from({ length: kind === "fal" ? 0 : 16 }, (_, i) => <i key={i} style={{ "--a": (i * 360) / 16 + "deg", "--d": 60 + (i % 3) * 26 + "px", "--bc": col }} />)}</div>;
}
function Brumaria({ me, crowd, city, onDecided, onMe }) {
  const [fr, setFr] = useState(franjaNow());
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState("acc");
  const [poi, setPoi] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [notes, setNotes] = useState(false);
  const [modal, setModal] = useState(null);
  const [res, setRes] = useState(null);
  const [toast, setToast] = useState("");
  const [walking, setWalking] = useState(false);
  const [trav, setTrav] = useState("");
  useEffect(() => { const t = setInterval(() => { setFr(franjaNow()); setNow(Date.now()); }, 1000); return () => clearInterval(t); }, []);
  const at = me.loc || "faro";
  const d = DISTRICTS.find((x) => x.id === at);
  const pois = POIS[at] || [];
  const acts = ACTIONS.filter((a) => a.z === at);
  const [FName, FIcon] = FRANJAS[fr];
  const act = me.act;
  const note = (t) => { setToast(t); setTimeout(() => setToast(""), 3200); };
  const go = async (id) => {
    if (walking || id === at) return;
    if (act && act.end - Date.now() > 0) return note("Estás en mitad de «" + act.name + "». Espera a que termine o cancélalo para cambiar de zona.");
    const dd = DISTRICTS.find((x) => x.id === id);
    if (dd.locked) return note("Las Catacumbas se abren cuando el Misterio de la ciudad llegue a " + CAT_AT + " (ahora " + city.pulse.Misterio + ").");
    setWalking(true);
    const t = await moveTraveller(id).catch(() => null);
    if (t) { onMe(t); setTrav(dd.name); setTimeout(() => setTrav(""), 1500); }
    setWalking(false); setPoi(null); setTab("acc");
  };
  const begin = async (def, kind) => {
    const t0 = Date.now();
    const t = await startAct({ id: def.id, kind, name: def.n || def.t, tr: def.tr, df: def.df, start: t0, end: t0 + (def.m * 60000) / SPEED }).catch(() => null);
    if (t) onMe(t);
    setModal(null);
  };
  const claim = async () => {
    const a = me.act;
    if (!a) return;
    const def = a.kind === "enc" ? ENCARGOS.find((e) => e.id === a.id) : ACTIONS.find((x) => x.id === a.id);
    const r = rollDuality((me.tr || {})[a.tr] || 0, a.df);
    const fx = effectOf(def, r.kind);
    const out = await resolveAct({ gold: fx.gold, item: fx.item, rep: fx.rep, pulse: fx.pulse, log: fx.log, diary: fx.diary, actId: a.id, enc: a.kind === "enc" }).catch(() => null);
    if (out) { onDecided(out.t, out.city); setRes({ r, fx, name: a.name, city: out.city }); }
  };
  const pickPoi = (x) => { setPoi(x.id); if (x.open.includes(fr) && !(me.found || []).includes(at + ":" + x.id)) markFound(at + ":" + x.id).then((t) => t && onMe(t)).catch(() => {}); };
  const cur = pois.find((x) => x.id === poi);
  const left = act ? act.end - now : 0;
  const pct = act ? Math.min(100, Math.max(0, ((now - act.start) / (act.end - act.start)) * 100)) : 0;
  const mod = (t) => (me.tr || {})[t] || 0;
  const sgn = (n) => (n >= 0 ? "+" : "−") + Math.abs(n);
  return (
    <div className="fs" style={{ "--dc": d.c }}>
      <ZoneBg id={at} fr={fr} /><div className="fs-sh" /><Ambient id={at} fr={fr} />
      <div className="fs-top">
        <span className="fs-g"><FIcon size={14} /> {FName} · {spainClock(now)}</span>
        <span className="fs-g"><MapPin size={14} /> <b>{d.name}</b></span>
        <button type="button" className="fs-g fs-b is-m" onClick={() => setModal("city")} aria-label="Pulso de la ciudad"><Flame size={14} /> {Object.keys(PULSE_COL).map((k) => <i key={k + city.pulse[k]} className="fs-bump" style={{ "--pc": PULSE_COL[k] }}>{city.pulse[k]}</i>)}</button>
        <span className="fs-g is-r"><Coins size={14} /> <b key={me.gold} className="fs-bump">{me.gold}</b> · <Backpack size={14} /> <b key={me.items.length} className="fs-bump">{me.items.length}</b></span>
        <button type="button" className="fs-g fs-b" onClick={() => setModal("jr")}><BookOpen size={14} /> Diario</button>
        <button type="button" className="fs-g fs-b" onClick={() => setModal("chat")}><MessageCircle size={14} /> Charla</button>
        <button type="button" className="fs-g fs-b" onClick={() => setModal("city")}><Users size={14} /> {crowd.length}</button>
        <button type="button" className="fs-g fs-b" onClick={() => setModal("imgs")} aria-label="Imágenes y prompts"><ImageIcon size={14} /></button>
      </div>
      <aside className="fs-pn">
        <h3 className="mh-serif">{d.name}</h3>
        {act && (
          <div className="fs-run">
            <div><b>{act.name}</b><small>{act.tr} {sgn(mod(act.tr))} · {left > 0 ? "termina en " + mmss(left) : "¡terminado!"}</small></div>
            <div className="fs-bar"><em style={{ width: pct + "%" }} /></div>
            {left <= 0 ? <button type="button" className="fs-claim" onClick={claim}><Dices size={14} /> Reclamar y tirar los dados</button> : <button type="button" className="fs-link" onClick={() => abandonAct().then((t) => t && onMe(t))}>Cancelar</button>}
          </div>
        )}
        <div className="adv-tabs"><button type="button" className={tab === "acc" ? "is-on" : ""} onClick={() => setTab("acc")}>Acciones</button><button type="button" className={tab === "rin" ? "is-on" : ""} onClick={() => setTab("rin")}>Rincones</button></div>
        <div className="fs-pb">
          {tab === "acc" && (<>
            {(at === "faro" || at === "gremios") && <button type="button" className="fs-enc-b" disabled={!!act} onClick={() => setModal("enc")}><b><ScrollText size={14} /> Pedir encargo</b><small>{act ? "Ya tienes algo en curso" : "3 al azar para elegir"}</small></button>}
            {acts.map((a) => {
              const cdLeft = ((me.cd || {})[a.id] || 0) + 7200000 / SPEED - now;
              const closed = !a.open.includes(fr);
              const why = act ? "Ya tienes algo en curso" : closed ? "Solo " + a.open.map((k) => FSTATE[k]).join(" y ") : cdLeft > 0 ? "Disponible en " + mmss(cdLeft) : "";
              const [dn] = DIFF[a.df];
              return <button key={a.id} type="button" className="fs-act" disabled={!!why} onClick={() => begin(a, "acc")}><b>{a.n}</b><small>{why || a.m + " min · " + a.tr + " " + sgn(mod(a.tr)) + " · " + dn}</small></button>;
            })}
            {!acts.length && <p className="adv-dt">Aquí no hay acciones por ahora.</p>}
          </>)}
          {tab === "rin" && (<>
            <div className="fs-poi">{pois.map((x) => { const on = x.open.includes(fr); const seen = (me.found || []).includes(at + ":" + x.id); return <button key={x.id} type="button" className={(poi === x.id ? "is-on " : "") + (on ? "" : "is-off")} onClick={() => pickPoi(x)}>{on ? (seen ? <Check size={12} /> : <Eye size={12} />) : <Lock size={12} />}{x.n}</button>; })}{!pois.length && <p className="adv-dt">Sin rincones que mirar.</p>}</div>
            {cur && <div className="fs-pt"><b>{cur.n}</b>{!cur.open.includes(fr) && <em><Clock size={12} /> Solo abierto {cur.open.map((k) => FSTATE[k]).join(" y ")}</em>}<p>{cur.text}</p>
              {at === "faro" && cur.id === "tablon" && <button type="button" className="adv-act is-g" onClick={() => setNotes(true)}><ScrollText size={14} /> Leer y dejar notas</button>}
              {DECISIONS[at + ":" + cur.id] && cur.open.includes(fr) && <button type="button" className="adv-act" onClick={() => setDlg(at + ":" + cur.id)}><HandCoins size={14} /> {(me.decided || {})[at + ":" + cur.id] ? "Recordar lo que decidiste" : "Decidir qué hacer"}</button>}</div>}
          </>)}
        </div>
      </aside>
      <nav className="fs-menu" aria-label="Zonas">{DISTRICTS.map((x) => <button key={x.id} type="button" className={(at === x.id ? "is-on " : "") + (x.locked || (act && left > 0 && at !== x.id) ? "is-lock" : "")} style={{ "--dc": x.c }} onClick={() => go(x.id)} disabled={walking}><i>{x.locked ? <Lock size={14} /> : <span>{x.name.charAt(0)}</span>}</i><b>{x.name}</b><small>{x.locked ? "Misterio " + CAT_AT : crowd.filter((t) => (t.loc || "faro") === x.id).length + " aquí"}</small></button>)}</nav>
      {trav && <div className="fs-trav" key={trav}><small>Llegas a</small><b className="mh-serif">{trav}</b></div>}
      {toast && <div className="fs-toast">{toast}</div>}
      {modal === "enc" && <EncDlg me={me} onPick={(e) => begin(e, "enc")} onClose={() => setModal(null)} onMe={onMe} />}
      {modal === "jr" && <Journal me={me} onClose={() => setModal(null)} />}
      {modal === "imgs" && <PromptsDlg onClose={() => setModal(null)} />}
      {modal === "chat" && <div className="adv-dov" onClick={() => setModal(null)}><div className="adv-dlg" role="dialog" aria-label="Charla" onClick={(e) => e.stopPropagation()}><Chat loc={at} place={d.name} me={me} /><button type="button" className="adv-go mh-btn" onClick={() => setModal(null)}>Cerrar</button></div></div>}
      {modal === "city" && <div className="adv-dov" onClick={() => setModal(null)}><div className="adv-dlg is-wide" role="dialog" aria-label="La ciudad" onClick={(e) => e.stopPropagation()}><PulsePanel city={city} /><Travellers crowd={crowd} /><button type="button" className="adv-go mh-btn" onClick={() => setModal(null)}>Cerrar</button></div></div>}
      {notes && <NotesDlg me={me} onClose={() => setNotes(false)} />}
      {dlg && <DecisionDlg key={dlg} dk={dlg} me={me} city={city} onClose={() => setDlg(null)} onDone={onDecided} />}
      {res && <ResultDlg res={res} onClose={() => setRes(null)} />}
    </div>
  );
}

export function AventuraPage({ chars, classColor, onCreate }) {
  const [sel, setSel] = useState(null);
  const [me, setMe] = useState(undefined); // undefined: cargando · null: aún sin viajero
  const [crowd, setCrowd] = useState([]);
  const [city, setCity] = useState({ pulse: { Prosperidad: 50, Orden: 50, Misterio: 50 }, log: [] });
  const [busy, setBusy] = useState(false);
  const [gl, setGl] = useState(false); // el monigote 3D solo se muestra si el navegador tiene WebGL
  useEffect(() => { try { const cv = document.createElement("canvas"); setGl(!!(cv.getContext("webgl2") || cv.getContext("webgl"))); } catch { setGl(false); } }, []);
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
  syncCat(city);
  const picked = chars.find((x) => x.id === sel) || null;
  const c = me || picked;
  // Los rasgos y el nivel del viajero se leen de su hoja (el personaje con el mismo nombre).
  useEffect(() => {
    if (!me) return;
    const c = chars.find((x) => x.name === me.name);
    if (c && c.tr && (JSON.stringify(c.tr) !== JSON.stringify(me.tr || {}) || c.lvl !== me.lvl)) syncTraveller(c.tr, c.lvl).then((t) => t && setMe(t)).catch(() => {});
  }, [me && me.name, chars.map((x) => x.name + x.lvl + JSON.stringify(x.tr)).join("|")]); // eslint-disable-line
  const enter = async () => {
    if (!picked || busy) return;
    setBusy(true);
    const t = await enterBrumaria({ name: picked.name, cls: picked.cls, anc: picked.anc, lvl: picked.lvl, tr: picked.tr }).catch(() => null);
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
      {!me && <section className="adv-hero">
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
      </section>}

      {me && <div className="adv-fsw"><Brumaria me={me} crowd={crowd} city={city} onDecided={(t, c) => { setMe(t); setCity(c); }} onMe={(t) => { setMe(t); setCrowd((l) => l.map((x) => (x.uid === t.uid ? t : x))); }} /></div>}
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
              <div className={"adv-portrait" + (gl ? " is-3d" : "")}>{gl ? <Puppet3D color={classColor(c.cls)} /> : <span>{((me ? me.name : c.name) || "?").charAt(0).toUpperCase()}</span>}</div>
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
.adv-act.is-g { background: color-mix(in srgb, var(--mh-ink) 10%, transparent); color: var(--mh-ink); margin-right: 8px; }
.adv-jb { appearance: none; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 99px; border: 1px solid var(--mh-line); background: var(--mh-panel); color: var(--mh-ink); font: 600 12.5px var(--font-body), 'Inter', system-ui, sans-serif; cursor: pointer; }
.adv-chat { border-radius: 18px; background: var(--mh-panel); border: 1px solid var(--mh-line); overflow: hidden; } .adv-ch-h { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--mh-line); } .adv-ch-h svg { color: #D9644E; } .adv-ch-h small { color: var(--mh-muted); font-size: 12px; }
.adv-ch-l { display: flex; flex-direction: column; gap: 10px; padding: 12px 16px; } .adv-msg { display: flex; gap: 10px; align-items: flex-start; } .adv-msg > div { flex: 1; } .adv-msg b { font-size: 13px; } .adv-msg em { font-style: normal; font-weight: 500; color: var(--mh-muted); font-size: 11.5px; margin-left: 4px; } .adv-msg p { margin: 2px 0 0; font-size: 13.5px; line-height: 1.45; color: var(--mh-ink2); } .adv-msg small { color: var(--mh-muted); font-size: 11px; }
.adv-ch-f { display: flex; gap: 8px; padding: 10px 14px 14px; } .adv-ch-f input { flex: 1; }
.adv-notes { display: flex; flex-direction: column; gap: 10px; margin: 6px 0 14px; } .adv-nt { padding: 12px 14px; border-radius: 14px; background: var(--mh-panel2); border: 1px solid var(--mh-line); } .adv-nh { display: flex; align-items: center; gap: 8px; } .adv-nh small { color: var(--mh-muted); margin-left: auto; font-size: 11.5px; } .adv-nt p { margin: 8px 0; font-size: 14px; font-style: italic; color: var(--mh-ink2); } .adv-x { appearance: none; border: 0; background: none; color: var(--mh-muted); cursor: pointer; padding: 2px; }
.adv-rp { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--mh-ink2); padding: 5px 10px; margin-top: 4px; border-radius: 9px; background: color-mix(in srgb, var(--mh-ink) 6%, transparent); } .adv-rp svg { color: var(--mh-muted); }
.adv-rb { appearance: none; margin-top: 8px; display: inline-flex; align-items: center; gap: 6px; font: 600 12px var(--font-body), 'Inter', system-ui, sans-serif; color: #E3B04B; background: none; border: 1px solid #E3B04B66; border-radius: 99px; padding: 4px 12px; cursor: pointer; }
.adv-trv { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; } .adv-trv > div { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 13px; background: var(--mh-panel2); border: 1px solid var(--mh-line); } .adv-trv > div > div { flex: 1; min-width: 0; display: flex; flex-direction: column; } .adv-trv small { color: var(--mh-muted); font-size: 11.5px; } .adv-trv em { font-style: normal; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 99px; background: color-mix(in srgb, #4FA39A 20%, transparent); color: #4FA39A; }
.adv-tabs { display: flex; gap: 6px; margin: 10px 0 14px; } .adv-tabs button { appearance: none; padding: 6px 14px; border-radius: 99px; border: 1px solid var(--mh-line); background: none; color: var(--mh-ink2); font: 600 12.5px var(--font-body), 'Inter', system-ui, sans-serif; cursor: pointer; } .adv-tabs button.is-on { background: #E3B04B; color: #1a1408; border-color: transparent; }
.adv-jl { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; } .adv-jl > div { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 12px; background: var(--mh-panel2); border: 1px solid var(--mh-line); font-size: 13.5px; } .adv-jl > div span { flex: 1; } .adv-jl em { font-style: normal; font-size: 11.5px; color: var(--mh-muted); font-weight: 700; } .adv-jl small { color: var(--mh-muted); }
.adv-ach { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; margin-bottom: 14px; } .adv-ach > div { display: flex; flex-direction: column; gap: 2px; padding: 12px; border-radius: 14px; border: 1px dashed var(--mh-line); opacity: .55; } .adv-ach > div.is-ok { opacity: 1; border-style: solid; background: color-mix(in srgb, #E8C547 12%, transparent); } .adv-ach svg { color: #E8C547; } .adv-ach small { color: var(--mh-muted); font-size: 12px; }
.adv { height: 100%; min-height: 0; padding-bottom: 0; gap: 14px; } .adv-fsw { flex: 1; min-height: 0; }
.adv-hero:not(.is-slim) { min-height: clamp(150px, 26vh, 250px); } .adv-hero:not(.is-slim) .adv-hi { padding: 16px 28px; } .adv-hero:not(.is-slim) .adv-hi h1 { font-size: clamp(34px, 5vw, 52px); } @media (max-height: 820px) { .adv-hero:not(.is-slim) .adv-hi p { display: none; } }
.adv-g { flex: 1; min-height: 0; align-items: stretch; } .adv-g > .adv-p { min-height: 0; overflow-y: auto; } .adv-sheet { position: static; }
.adv-dlg.is-wide { width: min(900px, 100%); }
.fs { position: relative; height: 100%; min-height: 0; border-radius: 22px; overflow: hidden; border: 1px solid var(--mh-line); background: #0b0b24; }
.fs-bg, .fs-bg svg, .fs-bg img { position: absolute; inset: 0; width: 100%; height: 100%; } .fs-bg img { object-fit: cover; } .fs-bg { animation: advFade .6s ease; } @keyframes advFade { from { opacity: 0; } to { opacity: 1; } }
.fs-sh { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(8,6,24,.55), transparent 22%, transparent 55%, rgba(8,6,24,.8)); }
.fs-top { position: absolute; top: 12px; left: 12px; right: 12px; display: flex; gap: 8px; align-items: center; overflow-x: auto; scrollbar-width: none; } .fs-g { flex: none; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 99px; background: rgba(14,12,36,.62); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.14); color: #f1edf8; font: 600 12.5px var(--font-body), 'Inter', system-ui, sans-serif; } .fs-g.is-r { margin-left: auto; } .fs-g.is-m i { font-style: normal; font-weight: 800; padding: 1px 7px; border-radius: 99px; background: color-mix(in srgb, var(--pc) 30%, transparent); color: var(--pc); } .fs-b { cursor: pointer; }
.fs-pn { position: absolute; left: 14px; top: 62px; bottom: 96px; width: clamp(280px, 34%, 360px); display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border-radius: 18px; background: rgba(14,12,36,.72); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.14); color: #f1edf8; } .fs-pn h3 { margin: 0; font-size: 21px; } .fs-pn .adv-tabs { margin: 0; } .fs-pn .adv-tabs button { color: #e6e0f2; border-color: rgba(255,255,255,.18); }
.fs-pb { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; scrollbar-width: thin; }
.fs-run { padding: 10px 12px; border-radius: 12px; background: color-mix(in srgb, var(--dc) 22%, transparent); border: 1px solid color-mix(in srgb, var(--dc) 55%, transparent); display: flex; flex-direction: column; gap: 7px; } .fs-run b { display: block; font-size: 13.5px; } .fs-run small { color: rgba(241,237,248,.78); font-size: 12px; } .fs-bar { height: 6px; border-radius: 99px; background: rgba(255,255,255,.15); overflow: hidden; } .fs-bar em { display: block; height: 100%; background: var(--dc); transition: width 1s linear; }
.fs-claim { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 8px; border-radius: 10px; border: 0; background: #E3B04B; color: #1a1408; font: 800 13px var(--font-body), 'Inter', system-ui, sans-serif; cursor: pointer; } .fs-link { appearance: none; align-self: flex-start; background: none; border: 0; color: rgba(241,237,248,.65); font-size: 11.5px; text-decoration: underline; cursor: pointer; padding: 0; }
.fs-act, .fs-enc-b { appearance: none; text-align: left; padding: 9px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.07); color: #f1edf8; font-family: inherit; cursor: pointer; } .fs-act:disabled, .fs-enc-b:disabled { opacity: .55; cursor: default; } .fs-act b, .fs-enc-b b { display: flex; align-items: center; gap: 6px; font-size: 13.5px; } .fs-act small, .fs-enc-b small { display: block; color: rgba(241,237,248,.7); font-size: 11.5px; margin-top: 2px; } .fs-enc-b { background: #E3B04B; color: #1a1408; border: 0; } .fs-enc-b small { color: #4a3a12; }
.fs-poi { display: flex; flex-wrap: wrap; gap: 6px; } .fs-poi button { appearance: none; display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 99px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.07); color: #f1edf8; font: 600 12px var(--font-body), 'Inter', system-ui, sans-serif; cursor: pointer; } .fs-poi button.is-on { background: var(--dc); color: #1a1408; border-color: transparent; } .fs-poi button.is-off { opacity: .6; }
.fs-pt { padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,.07); } .fs-pt em { display: flex; align-items: center; gap: 5px; font-style: normal; font-size: 11.5px; color: #E3B04B; margin-top: 3px; } .fs-pt p { margin: 6px 0 0; font-size: 13px; line-height: 1.5; color: #e6e0f2; }
.fs-menu { position: absolute; left: 12px; right: 12px; bottom: 12px; display: flex; gap: 8px; overflow-x: auto; padding: 8px; border-radius: 20px; background: rgba(14,12,36,.74); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.14); scrollbar-width: none; } .fs-menu button { appearance: none; flex: 1 0 118px; display: grid; grid-template-columns: 34px 1fr; column-gap: 9px; align-items: center; text-align: left; padding: 8px 10px; border-radius: 14px; border: 1px solid transparent; background: rgba(255,255,255,.05); color: #f1edf8; cursor: pointer; font-family: inherit; } .fs-menu button.is-on { border-color: var(--dc); background: color-mix(in srgb, var(--dc) 24%, transparent); } .fs-menu button.is-lock { opacity: .65; } .fs-menu i { grid-row: 1 / 3; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: linear-gradient(135deg, var(--dc), #1a1642); font-style: normal; font-weight: 800; } .fs-menu b { font-size: 12.5px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .fs-menu small { font-size: 11px; color: rgba(241,237,248,.65); }
.fs-toast { position: absolute; left: 50%; bottom: 96px; transform: translateX(-50%); max-width: min(520px, 90%); padding: 10px 16px; border-radius: 14px; background: rgba(14,12,36,.92); border: 1px solid rgba(255,255,255,.2); color: #f1edf8; font-size: 13px; text-align: center; }
.fs-enc { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; } .fs-enc button { appearance: none; text-align: left; display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 16px; border: 1px solid var(--mh-line); background: var(--mh-panel2); color: var(--mh-ink); font-family: inherit; cursor: pointer; } .fs-enc button:hover { border-color: #E3B04B; } .fs-enc p { margin: 0; font-size: 13px; color: var(--mh-ink2); line-height: 1.45; flex: 1; } .fs-enc span { display: flex; flex-wrap: wrap; gap: 5px; } .fs-enc i { font-style: normal; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 99px; background: color-mix(in srgb, var(--fc) 20%, transparent); color: var(--fc); } .fs-enc small { color: var(--mh-muted); font-size: 12px; }
.fs-dice { display: flex; align-items: center; gap: 12px; margin: 14px 0; flex-wrap: wrap; } .fs-die { width: 84px; padding: 10px 0; border-radius: 16px; text-align: center; border: 2px solid; } .fs-die small { display: block; font-size: 11px; font-weight: 700; } .fs-die b { font-size: 36px; } .fs-die.is-h { color: #E8C547; border-color: #E8C547; background: color-mix(in srgb, #E8C547 14%, transparent); } .fs-die.is-f { color: #A58BE8; border-color: #A58BE8; background: color-mix(in srgb, #A58BE8 14%, transparent); } .fs-dice.is-roll .fs-die { animation: advShake .25s infinite; } @keyframes advShake { 0% { transform: rotate(-6deg) translateY(0); } 50% { transform: rotate(6deg) translateY(-6px); } 100% { transform: rotate(-6deg) translateY(0); } } .fs-sum { display: flex; flex-direction: column; font-size: 15px; } .fs-sum small { color: var(--mh-muted); }
.fs-pr { margin-bottom: 12px; } .fs-prh { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; } .fs-prh code { font-size: 12px; color: var(--mh-muted); } .fs-prh i { font-style: normal; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 99px; background: color-mix(in srgb, #D9644E 22%, transparent); color: #D9644E; } .fs-prh i.is-ok { background: color-mix(in srgb, #6FBF73 22%, transparent); color: #6FBF73; } .fs-prh .mh-btn { margin-left: auto; } .fs-many { display: inline-block; margin: 0 0 10px; cursor: pointer; } .fs-up { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; } .fs-up img { width: 96px; height: 54px; object-fit: cover; border-radius: 8px; border: 1px solid var(--mh-line); } .fs-up label { cursor: pointer; } .fs-up .fs-link { color: var(--mh-muted); }
.fs-pr textarea { width: 100%; font-size: 12px; resize: none; } .fs-cnt { font-size: 13px; color: var(--mh-muted); font-family: var(--font-body), 'Inter', system-ui, sans-serif; margin-left: 8px; }
/* animaciones */
.fs-amb { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.fs-fog { position: absolute; left: -30%; width: 160%; height: 38%; background: radial-gradient(closest-side, rgba(216,210,245,.22), transparent); filter: blur(18px); animation: advFog 38s linear infinite; } .fs-fog.is-a { bottom: 12%; } .fs-fog.is-b { bottom: 30%; height: 28%; opacity: .7; animation-duration: 56s; animation-direction: reverse; }
@keyframes advFog { from { transform: translateX(-12%); } to { transform: translateX(12%); } }
.fs-mote { position: absolute; border-radius: 50%; background: var(--mc); box-shadow: 0 0 10px 2px var(--mc); opacity: 0; animation: advMote var(--dur) ease-in-out var(--del) infinite; }
@keyframes advMote { 0% { transform: translate(0, 0); opacity: 0; } 15% { opacity: .9; } 70% { opacity: .7; } 100% { transform: translate(var(--dx), -62vh); opacity: 0; } }
.fs-trav { position: absolute; inset: 0; z-index: 4; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: radial-gradient(closest-side, rgba(8,6,24,.78), rgba(8,6,24,.35)); color: #f1edf8; pointer-events: none; animation: advTrav 1.5s ease both; } .fs-trav b { font-size: clamp(30px, 5vw, 54px); font-weight: 500; text-shadow: 0 4px 24px #000a; } .fs-trav small { letter-spacing: .2em; text-transform: uppercase; font-size: 11.5px; color: rgba(241,237,248,.75); }
@keyframes advTrav { 0% { opacity: 0; } 22% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }
.fs-bump { display: inline-block; animation: advBump .55s cubic-bezier(.3,1.6,.5,1); } @keyframes advBump { 0% { transform: scale(1.6); } 100% { transform: none; } }
.fs-bar em { position: relative; overflow: hidden; } .fs-bar em::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent); animation: advShine 1.8s linear infinite; } @keyframes advShine { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
.fs-claim { animation: advGlow 1.6s ease-in-out infinite; } @keyframes advGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(227,176,75,.7); } 50% { box-shadow: 0 0 0 9px rgba(227,176,75,0); } }
.fs-pn { animation: advSlide .45s cubic-bezier(.2,.8,.2,1) both; } @keyframes advSlide { from { opacity: 0; transform: translateX(-22px); } to { opacity: 1; transform: none; } }
.fs-menu { animation: advUp .45s cubic-bezier(.2,.8,.2,1) both; } @keyframes advUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
.fs-menu button { transition: transform .15s, background .2s; } .fs-menu button:hover:not(:disabled) { transform: translateY(-3px); } .fs-menu button.is-on i { animation: advPulse 2.2s infinite; box-shadow: 0 0 0 0 var(--dc); }
.fs-pb > * { animation: advRise .35s both; } .fs-pb > *:nth-child(2) { animation-delay: .05s; } .fs-pb > *:nth-child(3) { animation-delay: .1s; } .fs-pb > *:nth-child(4) { animation-delay: .15s; } .fs-pb > *:nth-child(5) { animation-delay: .2s; } @keyframes advRise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.fs-act:hover:not(:disabled), .fs-enc-b:hover:not(:disabled) { transform: translateX(3px); transition: transform .15s; }
.adv-dlg { animation: advPop .28s cubic-bezier(.2,1.2,.4,1) both; position: relative; } @keyframes advPop { from { opacity: 0; transform: scale(.92) translateY(10px); } to { opacity: 1; transform: none; } }
.adv-dlg.is-fail { animation: advPop .28s both, advFail .5s .3s; } @keyframes advFail { 0%, 100% { transform: none; } 20% { transform: translateX(-9px); } 40% { transform: translateX(9px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
.fs-die { transition: transform .2s; } .fs-dice:not(.is-roll) .fs-die { animation: advLand .5s cubic-bezier(.3,1.6,.5,1); } @keyframes advLand { from { transform: scale(1.35) rotate(12deg); } to { transform: none; } }
.fs-pop { animation: advPop2 .55s cubic-bezier(.3,1.6,.5,1) both; } @keyframes advPop2 { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } } .fs-pop.is-crit { text-shadow: 0 0 14px currentColor; }
.fs-burst { position: absolute; left: 50%; top: 110px; width: 0; height: 0; pointer-events: none; } .fs-burst i { position: absolute; width: 7px; height: 7px; margin: -3px; border-radius: 50%; background: var(--bc); box-shadow: 0 0 8px var(--bc); animation: advSpark 1s ease-out both; } @keyframes advSpark { from { transform: rotate(var(--a)) translateX(0); opacity: 1; } to { transform: rotate(var(--a)) translateX(var(--d)); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .fs-pn, .fs-menu, .fs-pb > *, .adv-dlg, .fs-pop, .fs-trav { animation: none !important; } .fs-trav { display: none; } }
/* modo claro */
html[data-mh-theme="light"] .adv i[style*="--fc"], html[data-mh-theme="light"] .fs-prh i { color: color-mix(in srgb, var(--fc, #D9644E) 52%, #1f1a2e); }
html[data-mh-theme="light"] .adv-ch { filter: brightness(.68) saturate(1.25); }
html[data-mh-theme="light"] .fs-die.is-h { color: #7a5a00; border-color: #c99a1a; } html[data-mh-theme="light"] .fs-die.is-f { color: #5b3fb0; border-color: #8a6ae0; }
html[data-mh-theme="light"] .adv-pk { color: #4a3a12; }
html[data-mh-theme="light"] .fs-sh { background: linear-gradient(180deg, rgba(255,251,240,.4), transparent 22%, transparent 58%, rgba(255,251,240,.55)); }
html[data-mh-theme="light"] .fs-g, html[data-mh-theme="light"] .fs-pn, html[data-mh-theme="light"] .fs-menu, html[data-mh-theme="light"] .fs-toast { background: rgba(255,251,240,.84); color: #2b2438; border-color: rgba(43,36,56,.16); box-shadow: 0 6px 24px -10px rgba(43,36,56,.4); }
html[data-mh-theme="light"] .fs-run small, html[data-mh-theme="light"] .fs-act small, html[data-mh-theme="light"] .fs-menu small, html[data-mh-theme="light"] .fs-link { color: rgba(43,36,56,.68); }
html[data-mh-theme="light"] .fs-act, html[data-mh-theme="light"] .fs-poi button, html[data-mh-theme="light"] .fs-pt, html[data-mh-theme="light"] .fs-menu button { background: rgba(43,36,56,.06); border-color: rgba(43,36,56,.14); color: #2b2438; }
html[data-mh-theme="light"] .fs-pt p { color: #3d3550; } html[data-mh-theme="light"] .fs-pt em { color: #8a5a00; }
html[data-mh-theme="light"] .fs-pn .adv-tabs button { color: #3d3550; border-color: rgba(43,36,56,.2); } html[data-mh-theme="light"] .fs-pn .adv-tabs button.is-on { color: #1a1408; border-color: transparent; }
html[data-mh-theme="light"] .fs-poi button.is-on, html[data-mh-theme="light"] .fs-menu button.is-on { background: color-mix(in srgb, var(--dc) 38%, #fffbf0); border-color: var(--dc); color: #1f1a2e; }
html[data-mh-theme="light"] .fs-run { background: color-mix(in srgb, var(--dc) 20%, #fffbf0); } html[data-mh-theme="light"] .fs-bar { background: rgba(43,36,56,.15); }
html[data-mh-theme="light"] .fs-g.is-m i { color: color-mix(in srgb, var(--pc) 55%, #1f1a2e); }
.adv-portrait.is-3d { width: 128px; height: 152px; border-radius: 0; background: none; box-shadow: none; display: block; } .pp3d { width: 100%; height: 100%; } .pp3d canvas { width: 100% !important; height: 100% !important; display: block; }
@media (max-width: 900px) { .adv-g { overflow-y: auto; } }
@media (max-width: 720px) { .fs-pn { width: auto; right: 14px; top: auto; height: 46%; bottom: 92px; } .fs-enc { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .adv-g { grid-template-columns: 1fr; } .adv-sheet { position: static; } .adv-hi { padding: 22px 20px; } .adv-hero { min-height: 300px; } }
@media (prefers-reduced-motion: reduce) { .adv * { animation: none !important; } }
`;
