"use client";

import { useState } from "react";
import { Dices, RefreshCw, Send, Skull, Swords, Scroll, Coins, Users, Sparkles } from "lucide-react";

// Generadores del DJ: para improvisar sin parar la partida. Todo es texto de ambientación salvo el encuentro,
// que reparte los puntos de combate (3 por jugador + 2) entre tipos de adversario.
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const many = (a, n) => [...a].sort(() => Math.random() - 0.5).slice(0, n);

const NAMES = {
  first: ["Maelis", "Tobrek", "Hadwyn", "Sibil", "Orlan", "Brenna", "Ulric", "Isolde", "Garrick", "Nessa", "Corvin", "Thalia", "Edric", "Mirel", "Dunstan", "Yselda", "Perrin", "Ravenna", "Osric", "Liora", "Bram", "Aldara", "Fenwick", "Sorcha"],
  last: ["Orrin", "Vael", "Cuervo", "Pie-Ligero", "del Vado", "Piedra-Hueca", "Alba", "Hierro", "Brezo", "Tejedor", "Mil-Cuentos", "Lámpara", "Sal-de-Mar", "Roble", "Ceniza", "Cantaclaro"],
  nick: ["el Cojo", "la Zurda", "el Callado", "la Buena", "el Viejo", "la Pequeña", "el Calvo", "la Sorda"],
};
const RUMORS = [
  "Dicen que las luces del bosque se mueven solas por las noches, siempre hacia el norte.",
  "Un mercader aseguraba haber visto una caravana entera desaparecer en el camino del río, sin dejar ni una rueda.",
  "En la posada cuentan que el alcalde paga en monedas que no existían hace un año.",
  "Hay quien jura que la vieja torre tiene un piso más de los que se ven desde fuera.",
  "Los pescadores ya no echan las redes junto al faro: algo canta bajo el agua.",
  "Se dice que la Casa Vael busca a alguien que sepa leer un idioma que nadie recuerda.",
  "Un niño asegura que el espantapájaros del trigal cambió de sitio. Nadie le cree. Casi nadie.",
  "Alguien ha pagado por la cabeza de un tal «Mensajero» sin dar su nombre ni su cara.",
  "El herrero lleva tres semanas sin encender la fragua y duerme con la puerta atrancada.",
  "Cuentan que quien duerme junto al viejo roble despierta recordando vidas ajenas.",
  "Las campanas del templo sonaron solas a medianoche, trece veces.",
  "El último que volvió de las minas no dijo nada: solo dibujó un símbolo en la mesa y se fue.",
];
const LOOT = {
  coins: ["Un puñado de monedas", "Una bolsa de monedas", "Un cofrecito de monedas"],
  junk: ["una vela a medio gastar", "un mapa mojado e ilegible", "un diente de lobo con un agujero", "una llave sin cerradura", "un dado de hueso trucado", "una carta sin firma", "un frasco de aceite aromático", "una cinta de seda roja", "un cuchillo sin filo con iniciales", "un cuaderno con la mitad de las hojas arrancadas"],
  nice: ["un amuleto de plata sin brillo", "una daga ceremonial con runas", "un anillo con un símbolo desconocido", "una brújula que no apunta al norte", "una poción sin etiqueta", "un broche con el escudo de una casa noble", "un pergamino sellado con cera negra", "una pequeña estatua de jade"],
};
const TRAITS = ["desconfiado", "hablador", "generoso", "supersticioso", "orgulloso", "asustadizo", "burlón", "solemne", "curioso", "rencoroso", "ingenuo", "calculador"];
const WANTS = ["encontrar a un hermano desaparecido", "pagar una deuda antes del invierno", "que alguien se lleve de aquí una carta", "vengarse de un antiguo socio", "no volver a ver el mar", "ganar fama como cantante", "proteger a un secreto de familia", "salir del pueblo sin que nadie lo note"];
const SECRETS = ["trabaja en secreto para una casa noble", "debe dinero a gente peligrosa", "vio algo que no debía en el camino", "no es quien dice ser", "guarda una llave que no sabe qué abre", "tiene un pacto que no recuerda haber hecho", "teme a los lobos más que a nada"];
const JOBS = ["tabernero", "herrera", "pastor", "escriba", "guardia del puente", "curandera", "leñador", "mercader de telas", "monaguillo", "barquero", "cartógrafa", "posadera"];

const AMBIENTS = {
  Bosque: {
    flavor: [["Orco", "Bruto"], ["Orco arquero", "A distancia"], ["Lobo", "Estándar"], ["Lobo alfa", "Líder"], ["Trasgo", "Súbdito"], ["Bandido", "Estándar"], ["Capitana bandida", "Líder"], ["Acechador de las sombras", "Acechador"]],
    plans: [
      { name: "Emboscada en el claro", tip: "Atacan desde los árboles. Los arqueros se esconden tras la maleza.", core: ["Bruto", "A distancia"], fill: "A distancia", only: ["Orco", "Orco arquero", "Trasgo"] },
      { name: "La manada hambrienta", tip: "Rodean al grupo al caer la noche. El líder solo ataca si ve debilidad.", core: ["Líder"], fill: "Estándar", only: ["Lobo", "Lobo alfa"] },
      { name: "Los saqueadores del camino", tip: "Piden peaje. Se puede negociar con Presencia.", core: ["Líder", "Estándar"], fill: "Estándar", only: ["Bandido", "Capitana bandida"] },
    ],
  },
  Mazmorra: {
    flavor: [["Esqueleto guerrero", "Estándar"], ["Esqueleto arquero", "A distancia"], ["Zombi lento", "Súbdito"], ["Gólem de piedra", "Bruto"], ["Nigromante", "Líder"], ["Rata gigante", "Súbdito"], ["Espectro", "Acechador"]],
    plans: [
      { name: "La cripta despierta", tip: "Salen de las tumbas por oleadas. Cada ronda de foco puede añadir uno más.", core: ["Líder"], fill: "Súbdito" },
      { name: "El guardián de la puerta", tip: "No se mueve hasta que alguien cruza la línea del suelo.", core: ["Bruto", "A distancia"], fill: "A distancia" },
      { name: "Susurros en la oscuridad", tip: "El acechador ataca y desaparece; el resto los entretiene.", core: ["Acechador", "Estándar"], fill: "Estándar" },
    ],
  },
  Ciudad: {
    flavor: [["Matón", "Bruto"], ["Ladrón de bolsillos", "Acechador"], ["Guardia corrupto", "Estándar"], ["Ballestero de tejado", "A distancia"], ["Cabecilla del gremio", "Líder"], ["Aprendiz del gremio", "Súbdito"]],
    plans: [
      { name: "Callejón sin salida", tip: "Les cortan la retirada por los dos lados.", core: ["Bruto", "Estándar"], fill: "Estándar" },
      { name: "Robo en el mercado", tip: "El objetivo es la bolsa de alguien, no la pelea.", core: ["Acechador", "Acechador"], fill: "Súbdito" },
      { name: "Cobro de deudas", tip: "El cabecilla prefiere hablar; sus matones, no.", core: ["Líder", "Bruto"], fill: "Estándar" },
    ],
  },
  Costa: {
    flavor: [["Pirata", "Estándar"], ["Grumete", "Súbdito"], ["Arponero", "A distancia"], ["Contramaestre", "Bruto"], ["Capitán pirata", "Líder"], ["Cangrejo gigante", "Bruto"], ["Sirena engañosa", "Acechador"]],
    plans: [
      { name: "El abordaje", tip: "Saltan desde el bote. Los arponeros disparan desde la cubierta.", core: ["Líder", "A distancia"], fill: "Estándar" },
      { name: "Marea baja", tip: "Los cangrejos salen de la arena cuando se pisa el barro.", core: ["Bruto"], fill: "Súbdito" },
      { name: "Canto engañoso", tip: "La sirena atrae a alguien al agua; los demás deben salvarlo.", core: ["Acechador", "Estándar"], fill: "Súbdito" },
    ],
  },
};
// Coste en puntos de combate de cada tipo de adversario.
const COST = { "Súbdito": 1, "Apoyo": 1, "Social": 1, "Horda": 2, "A distancia": 2, "Acechador": 2, "Estándar": 2, "Líder": 3, "Bruto": 4, "Solo": 5 };

function makeEncounter(ambient, diff, players) {
  const A = AMBIENTS[ambient];
  const plan = pick(A.plans);
  const budget = 3 * players + 2 + ({ Fácil: -2, Media: 0, Dura: 2 }[diff] || 0);
  const roles = [...plan.core];
  let spent = roles.reduce((s, r) => s + COST[r], 0);
  while (spent + COST[plan.fill] <= budget && roles.length < 10) (roles.push(plan.fill), (spent += COST[plan.fill]));
  while (spent > budget && roles.length > 1) { const i = roles.lastIndexOf(plan.fill); spent -= COST[roles.splice(i < 0 ? roles.length - 1 : i, 1)[0]]; }
  // Agrupa por tipo y asigna un nombre de ambientación a cada tipo.
  const groups = {};
  roles.forEach((r) => (groups[r] = (groups[r] || 0) + 1));
  const parts = Object.entries(groups).map(([role, n]) => {
    const options = A.flavor.filter(([n, r]) => r === role && (!plan.only || plan.only.includes(n)));
    return { role, n, name: (options.length ? pick(options) : pick(A.flavor))[0], cost: COST[role] * n };
  });
  return { name: plan.name, tip: plan.tip, parts, spent, budget, ambient };
}

const KINDS = [
  { key: "nombres", label: "Nombres", Icon: Users },
  { key: "rumores", label: "Rumores", Icon: Scroll },
  { key: "botin", label: "Botín", Icon: Coins },
  { key: "pnj", label: "Taberna y PNJ", Icon: Sparkles },
  { key: "encuentro", label: "Encuentro", Icon: Swords },
];

export function Generators({ players, avgLevel, onChat, onPlace }) {
  const [kind, setKind] = useState("encuentro");
  const [ambient, setAmbient] = useState("Bosque");
  const [diff, setDiff] = useState("Media");
  const [tier, setTier] = useState(1);
  const [data, setData] = useState(() => Array.from({ length: 3 }, () => makeEncounter("Bosque", "Media", Math.max(1, players))));
  const [sent, setSent] = useState("");

  const roll = (k = kind) => {
    setSent("");
    if (k === "nombres") setData(Array.from({ length: 10 }, () => pick(NAMES.first) + " " + (Math.random() < 0.25 ? pick(NAMES.nick) : pick(NAMES.last))));
    else if (k === "rumores") setData(many(RUMORS, 4));
    else if (k === "botin") setData(Array.from({ length: 3 }, () => ({ coins: pick(LOOT.coins) + " (" + (tier === 1 ? "1d8 monedas" : "2d8 monedas") + ")", junk: pick(LOOT.junk), nice: Math.random() < 0.35 + tier * 0.05 ? pick(LOOT.nice) : null })));
    else if (k === "pnj") setData(Array.from({ length: 3 }, () => ({ name: pick(NAMES.first) + " " + pick(NAMES.last), job: pick(JOBS), trait: pick(TRAITS), want: pick(WANTS), secret: pick(SECRETS) })));
    else setData(Array.from({ length: 3 }, () => makeEncounter(ambient, diff, Math.max(1, players))));
  };
  const choose = (k) => { setKind(k); setData(null); setSent(""); setTimeout(() => roll(k), 0); };
  const shown = data || [];
  const send = (text, id) => { onChat(text); setSent(id); };

  const lines = {
    nombres: (n) => n,
    rumores: (r) => "📜 Rumor: " + r,
    botin: (b) => "💰 Botín: " + b.coins + ", " + b.junk + (b.nice ? " y " + b.nice : ""),
    pnj: (p) => "🧑 " + p.name + ", " + p.job + ", " + p.trait + ". Quiere " + p.want + ".",
    encuentro: (e) => "⚔️ Encuentro: " + e.name + " (" + e.parts.map((p) => p.n + "× " + p.name).join(", ") + ")",
  };

  return (
    <div className="mh-card gx" style={{ margin: 0 }}>
      <div className="gx-h">
        <h3 className="mh-serif"><Dices size={18} /> Generadores</h3>
        <button type="button" className="mh-btn-ghost" onClick={() => roll()}><RefreshCw size={14} /> Repetir</button>
      </div>
      <p className="gx-sub">Para improvisar sin parar la partida. Pulsa «Enviar al chat» para enseñárselo a la mesa.</p>
      <div className="gx-kinds" role="tablist" aria-label="Tipo de generador">
        {KINDS.map(({ key, label, Icon }) => (
          <button key={key} type="button" role="tab" aria-selected={kind === key} className={"cx-chip" + (kind === key ? " on" : "")} style={{ "--c": "#C9A24A" }} onClick={() => choose(key)}><i><Icon size={14} /></i>{label}</button>
        ))}
      </div>

      {kind === "encuentro" && (
        <div className="gx-opts">
          <div><span className="gx-lab">Ambiente</span><div className="gx-row">{Object.keys(AMBIENTS).map((a) => <button key={a} type="button" className={"cx-chip" + (ambient === a ? " on" : "")} style={{ "--c": "#4f9a62" }} onClick={() => setAmbient(a)}>{a}</button>)}</div></div>
          <div><span className="gx-lab">Dificultad</span><div className="gx-row">{["Fácil", "Media", "Dura"].map((d) => <button key={d} type="button" className={"cx-chip" + (diff === d ? " on" : "")} style={{ "--c": "#E3B04B" }} onClick={() => setDiff(d)}>{d}</button>)}</div></div>
          <div><span className="gx-lab">Mesa</span><div className="gx-row"><span className="gx-fact">{players} jugador{players === 1 ? "" : "es"} · nivel {avgLevel} · {3 * players + 2 + ({ Fácil: -2, Media: 0, Dura: 2 }[diff])} puntos de combate</span></div></div>
          <button type="button" className="mh-btn" onClick={() => roll()}><Dices size={15} /> Generar encuentro</button>
        </div>
      )}
      {kind === "botin" && (
        <div className="gx-opts"><div><span className="gx-lab">Nivel de la zona</span><div className="gx-row">{[1, 2].map((t) => <button key={t} type="button" className={"cx-chip" + (tier === t ? " on" : "")} style={{ "--c": "#E3B04B" }} onClick={() => setTier(t)}>{t === 1 ? "Rango 1 (niveles 1-4)" : "Rango 2 (5-7)"}</button>)}</div></div></div>
      )}

      <div className="gx-res">
        {kind === "nombres" && (
          <div className="gx-names">{shown.map((n, i) => <button key={i} type="button" className="cx-chip" style={{ "--c": "#C9A24A" }} title="Enviar al chat" onClick={() => send(lines.nombres(n), "n" + i)}>{n}{sent === "n" + i && <em>enviado</em>}</button>)}</div>
        )}
        {kind === "rumores" && shown.map((r, i) => (
          <div key={i} className="gx-item"><p>{r}</p><button type="button" className="mh-btn-ghost" onClick={() => send(lines.rumores(r), "r" + i)}><Send size={13} /> {sent === "r" + i ? "Enviado" : "Enviar al chat"}</button></div>
        ))}
        {kind === "botin" && shown.map((b, i) => (
          <div key={i} className="gx-item"><p><b>{b.coins}</b>, {b.junk}{b.nice ? <> y <b>{b.nice}</b></> : ""}.</p><button type="button" className="mh-btn-ghost" onClick={() => send(lines.botin(b), "b" + i)}><Send size={13} /> {sent === "b" + i ? "Enviado" : "Enviar al chat"}</button></div>
        ))}
        {kind === "pnj" && shown.map((p, i) => (
          <div key={i} className="gx-item"><div><b className="mh-serif">{p.name}</b> <span className="gx-fact">{p.job} · {p.trait}</span><p>Quiere {p.want}.</p><p className="gx-secret">Secreto del DJ: {p.secret}.</p></div><button type="button" className="mh-btn-ghost" onClick={() => send(lines.pnj(p), "p" + i)}><Send size={13} /> {sent === "p" + i ? "Enviado" : "Enviar al chat"}</button></div>
        ))}
        {kind === "encuentro" && shown.map((e, i) => (
          <div key={i} className="gx-item gx-enc">
            <div className="gx-enc-h"><b className="mh-serif">{e.name}</b><span className="cx-chip">{e.spent} de {e.budget} puntos</span></div>
            <div className="gx-row">{e.parts.map((p) => <span key={p.role} className="cx-chip" style={{ "--c": "#C0504A" }}><i><Skull size={13} /></i>{p.name} ×{p.n}<em>{p.role} · {p.cost} pts</em></span>)}</div>
            <p>{e.tip}</p>
            <div className="gx-row">
              <button type="button" className="mh-btn" onClick={() => (onPlace(e.parts.flatMap((p) => Array.from({ length: p.n }, () => p.name))), setSent("e" + i))}><Skull size={14} /> {sent === "e" + i ? "Colocados" : "Colocar en el mapa"}</button>
              <button type="button" className="mh-btn-ghost" onClick={() => send(lines.encuentro(e), "ec" + i)}><Send size={13} /> {sent === "ec" + i ? "Enviado" : "Enviar al chat"}</button>
            </div>
          </div>
        ))}
        {kind === "encuentro" && <p className="gx-note">Las criaturas se colocan con la ficha base del Bandido; edita sus estadísticas en el mapa si necesitas otras.</p>}
      </div>
    </div>
  );
}
