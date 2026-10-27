"use client";

import { useState } from "react";
import { Dices, RefreshCw, Send, Skull, Swords, Scroll, Coins, Users, Sparkles, Eye, EyeOff, Gem, Package, Minus, Plus, Wand2 } from "lucide-react";
import { NpcStatsView, npcStatsSummary } from "./NpcStats";
import { CopyPrompt, buildDialoguePrompt, ART_STYLES } from "./ImagePrompts";

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

// Estadísticas base por rango (1–4) y tipo de adversario. Son una base orientativa para improvisar: se pueden editar en la ficha del mapa.
const tierOfLevel = (lv) => (lv <= 1 ? 1 : lv <= 4 ? 2 : lv <= 7 ? 3 : 4);
const ROLE_TYPE = { "Súbdito": "Esbirro", "Estándar": "Estándar", "A distancia": "Estándar", "Acechador": "Estándar", "Bruto": "Duro", "Líder": "Líder", "Horda": "Cuadrilla", "Solo": "Solitario", "Apoyo": "Apoyo", "Social": "Social" };
const HP = { "Súbdito": [1, 1, 1, 1], "Estándar": [4, 5, 6, 7], "A distancia": [3, 4, 5, 6], "Acechador": [3, 4, 5, 6], "Bruto": [7, 8, 9, 10], "Líder": [6, 7, 8, 9], "Horda": [5, 6, 7, 8], "Solo": [9, 10, 11, 12], "Apoyo": [3, 4, 5, 6], "Social": [3, 4, 5, 6] };
const DMG = { light: ["1d6+1", "1d8+3", "2d8+3", "3d8+4"], mid: ["1d8+2", "2d6+3", "3d8+3", "4d8+4"], heavy: ["1d12+2", "2d10+4", "3d12+5", "4d12+8"] };
const DMG_OF = { "Súbdito": "light", "Estándar": "mid", "A distancia": "mid", "Acechador": "mid", "Bruto": "heavy", "Líder": "heavy", "Horda": "mid", "Solo": "heavy", "Apoyo": "light", "Social": "light" };
const MOTIVES = { "Súbdito": "Rodear y estorbar; huye si queda solo.", "Estándar": "Atacar al más débil o al que esté más cerca.", "A distancia": "Disparar desde cobertura y mantener la distancia.", "Acechador": "Emboscar, golpear y desaparecer entre sombras.", "Bruto": "Embestir y romper la formación del grupo.", "Líder": "Dirigir al resto y retirarse si la cosa se tuerce.", "Horda": "Abrumar con su número.", "Solo": "Un rival que dominaría la escena por sí mismo.", "Apoyo": "Ayudar a los suyos desde atrás.", "Social": "Negociar, engañar o ganar tiempo." };
function attackOf(name, role) {
  const n = name.toLowerCase();
  const magic = /nigromante|espectro|sirena|hechic|bruj/.test(n);
  const nm = /lobo|rata|cangrejo/.test(n) ? "Mordisco" : /arquer|ballest|arpon/.test(n) ? "Disparo" : magic ? "Toque oscuro" : /gólem|orco|bruto|matón|contramaestre/.test(n) ? "Golpe brutal" : "Ataque";
  return { name: nm, range: role === "A distancia" ? "Lejano" : magic && role === "Líder" ? "Cercano" : "Cuerpo a cuerpo", type: magic ? "mág" : "fís" };
}
export function statsFor(role, name, tier) {
  const t = Math.max(1, Math.min(4, tier)) - 1;
  const dOff = { "Súbdito": -1, "Bruto": 1, "Líder": 1, "Solo": 2 }[role] || 0;
  const mul = role === "Bruto" || role === "Solo" ? 1.25 : 1;
  const major = Math.round([7, 10, 20, 30][t] * mul), severe = Math.round([13, 22, 40, 60][t] * mul);
  const atk = attackOf(name, role);
  return {
    tier: t + 1, type: ROLE_TYPE[role] || "Estándar", difficulty: [11, 14, 17, 20][t] + dOff, thresholds: [major, severe],
    hp: HP[role]?.[t] ?? 4, stress: role === "Súbdito" ? 1 : [2, 3, 4, 5][t], atk: [1, 2, 3, 4][t] + (role === "Líder" ? 1 : 0),
    attack: { ...atk, damage: DMG[DMG_OF[role] || "mid"][t] }, motives: MOTIVES[role] || "", exp: "", desc: "", base: name, hpMarked: 0, stressMarked: 0,
  };
}

function makeEncounter(ambient, diff, players, tier = 1) {
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
    const nm = (options.length ? pick(options) : pick(A.flavor))[0];
    return { role, n, name: nm, cost: COST[role] * n, stats: statsFor(role, nm, tier) };
  });
  return { name: plan.name, tip: plan.tip, parts, spent, budget, ambient };
}

const AGES = ["young", "middle-aged", "elderly", "weathered"], BUILDS = ["lean", "stocky", "broad-shouldered", "wiry", "heavyset", "tall and thin"], CLOTHES = ["a patched wool tunic", "a leather apron", "a hooded travelling cloak", "a faded embroidered vest", "plain linen work clothes", "a worn coat with brass buttons"];
const FEATURES = ["a scar across one eyebrow", "braided hair", "ink-stained fingers", "a missing front tooth", "freckles and a crooked smile", "a silver earring", "soot-smudged cheeks", "kind tired eyes"];
const JOB_EN = { tabernero: "tavern keeper", herrera: "blacksmith", pastor: "shepherd", escriba: "scribe", "guardia del puente": "bridge guard", curandera: "herbal healer", leñador: "woodcutter", "mercader de telas": "cloth merchant", monaguillo: "altar boy", barquero: "ferryman", cartógrafa: "cartographer", posadera: "innkeeper" };
const MOOD_EN = { desconfiado: "distrustful", hablador: "talkative", generoso: "generous", supersticioso: "superstitious", orgulloso: "proud", asustadizo: "timid", burlón: "mocking", solemne: "solemn", curioso: "curious", rencoroso: "resentful", ingenuo: "naive", calculador: "calculating" };
function makeNpc(rank) {
  const job = pick(JOBS), trait = pick(TRAITS), want = pick(WANTS);
  const name = pick(NAMES.first) + " " + pick(NAMES.last);
  const armed = /guardia|herrera|leñador/.test(job);
  const role = armed ? "Estándar" : "Social";
  const st = statsFor(role, name, rank);
  st.attack = armed ? { ...st.attack, name: /herrera/.test(job) ? "Martillo" : /leñador/.test(job) ? "Hacha" : "Lanza" } : { name: "Empujón", range: "Cuerpo a cuerpo", damage: DMG.light[Math.max(0, rank - 1)], type: "fís" };
  st.motives = "Quiere " + want + ".";
  st.desc = job + ", " + trait + ".";
  const woman = /a$/.test(job.split(" ")[0]) && !/guardia/.test(job);
  const look = pick(AGES) + " " + (woman ? "woman" : "man") + ", " + pick(BUILDS) + ", " + pick(FEATURES) + ", wearing " + pick(CLOTHES);
  return { name, job, trait, want, secret: pick(SECRETS), stats: st, look: look + ", a " + (MOOD_EN[trait] || "calm") + " " + (JOB_EN[job] || "villager") + " in a medieval fantasy village" };
}

const KINDS = [
  { key: "encuentro", label: "Encuentro", Icon: Swords, desc: "Adversarios según tu mesa" },
  { key: "pnj", label: "Taberna y PNJ", Icon: Sparkles, desc: "Personajes con secreto" },
  { key: "nombres", label: "Nombres", Icon: Users, desc: "Diez de golpe" },
  { key: "rumores", label: "Rumores", Icon: Scroll, desc: "Ganchos para la mesa" },
  { key: "botin", label: "Botín", Icon: Coins, desc: "Monedas y hallazgos" },
];

export function Generators({ players: playersIn, avgLevel, onChat, onPlace }) {
  const [players, setPlayers] = useState(Math.max(1, Math.min(8, playersIn || 3)));
  const rank = tierOfLevel(avgLevel || 1);
  const [style, setStyle] = useState(ART_STYLES[0].key);
  const [kind, setKind] = useState("encuentro");
  const [ambient, setAmbient] = useState("Bosque");
  const [diff, setDiff] = useState("Media");
  const [tier, setTier] = useState(1);
  const [data, setData] = useState(() => Array.from({ length: 3 }, () => makeEncounter("Bosque", "Media", Math.max(1, players), rank)));
  const [sent, setSent] = useState("");
  const [open, setOpen] = useState("");

  const roll = (k = kind) => {
    setSent("");
    if (k === "nombres") setData(Array.from({ length: 10 }, () => pick(NAMES.first) + " " + (Math.random() < 0.25 ? pick(NAMES.nick) : pick(NAMES.last))));
    else if (k === "rumores") setData(many(RUMORS, 4));
    else if (k === "botin") setData(Array.from({ length: 3 }, () => ({ coins: pick(LOOT.coins) + " (" + (tier === 1 ? "1d8 monedas" : "2d8 monedas") + ")", junk: pick(LOOT.junk), nice: Math.random() < 0.35 + tier * 0.05 ? pick(LOOT.nice) : null })));
    else if (k === "pnj") setData(Array.from({ length: 3 }, () => makeNpc(rank)));
    else setData(Array.from({ length: 3 }, () => makeEncounter(ambient, diff, Math.max(1, players), rank)));
  };
  const rollEnc = (o) => { setSent(""); setData(Array.from({ length: 3 }, () => makeEncounter(o.ambient ?? ambient, o.diff ?? diff, Math.max(1, o.players ?? players), rank))); };
  const setN = (v) => { setPlayers(v); rollEnc({ players: v }); };
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

  const seg = (opts, val, set, c) => (
    <div className="gx2-seg" role="radiogroup">
      {opts.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={val === o} className={val === o ? "is-on" : ""} style={c ? { "--c": c } : undefined} onClick={() => set(o)}>{o}</button>
      ))}
    </div>
  );
  const sendBtn = (id, text, label = "Enviar al chat") => (
    <button type="button" className={"mh-btn-ghost gx2-send" + (sent === id ? " is-sent" : "")} onClick={() => send(text, id)}><Send size={13} /> {sent === id ? "Enviado" : label}</button>
  );
  const cur = KINDS.find((k) => k.key === kind);
  const points = 3 * players + 2 + ({ Fácil: -2, Media: 0, Dura: 2 }[diff] || 0);

  return (
    <div className="gx2">
      <aside className="gx2-nav" role="tablist" aria-label="Tipo de generador">
        <div className="gx2-title"><Dices size={17} /> <b className="mh-serif">Generadores</b></div>
        {KINDS.map(({ key, label, Icon, desc }) => (
          <button key={key} type="button" role="tab" aria-selected={kind === key} className={"gx2-tab" + (kind === key ? " is-on" : "")} onClick={() => choose(key)}>
            <span className="gx2-ic"><Icon size={17} strokeWidth={1.8} /></span>
            <span><b>{label}</b><small>{desc}</small></span>
          </button>
        ))}
      </aside>
      <section className="gx2-main">
        <header className="gx2-head">
          <div>
            <h3 className="mh-serif">{cur.label}</h3>
            <p>Pulsa «Enviar al chat» para enseñárselo a la mesa.</p>
          </div>
          <button type="button" className="mh-btn gx2-again" onClick={() => roll()}><RefreshCw size={14} /> {kind === "encuentro" ? "Generar de nuevo" : "Repetir"}</button>
        </header>

        {kind === "encuentro" && (
          <div className="gx2-opts">
            <div><span className="gx-lab">Ambiente</span>{seg(Object.keys(AMBIENTS), ambient, (v) => (setAmbient(v), rollEnc({ ambient: v })))}</div>
            <div><span className="gx-lab">Dificultad</span>{seg(["Fácil", "Media", "Dura"], diff, (v) => (setDiff(v), rollEnc({ diff: v })))}</div>
            <div className="gx2-mesa">
              <span className="gx-lab">Jugadores en la mesa</span>
              <span className="gx2-step">
                <button type="button" aria-label="Un jugador menos" disabled={players <= 1} onClick={() => setN(Math.max(1, players - 1))}><Minus size={13} /></button>
                <b>{players}</b>
                <button type="button" aria-label="Un jugador más" disabled={players >= 8} onClick={() => setN(Math.min(8, players + 1))}><Plus size={13} /></button>
              </span>
              <span className="gx-fact">Rango {rank} · <b>{points}</b> puntos de combate</span>
            </div>
          </div>
        )}
        {kind === "botin" && (
          <div className="gx2-opts"><div><span className="gx-lab">Nivel de la zona</span>{seg(["Nivel 1", "Nivel 2"], "Nivel " + tier, (v) => setTier(v === "Nivel 1" ? 1 : 2))}</div></div>
        )}

        <div className={"gx2-res gx2-res-" + kind}>
          {kind === "nombres" && shown.map((n, i) => (
            <button key={i} type="button" className={"gx2-name" + (sent === "n" + i ? " is-sent" : "")} title="Enviar al chat" onClick={() => send(lines.nombres(n), "n" + i)}>
              <i>{n.charAt(0)}</i><span>{n}</span>{sent === "n" + i ? <em>Enviado</em> : <Send size={12} />}
            </button>
          ))}
          {kind === "rumores" && shown.map((r, i) => (
            <article key={i} className="gx2-card gx2-rumor">
              <Scroll size={18} strokeWidth={1.5} />
              <p>{r}</p>
              {sendBtn("r" + i, lines.rumores(r))}
            </article>
          ))}
          {kind === "botin" && shown.map((b, i) => (
            <article key={i} className="gx2-card gx2-loot">
              <div className="gx2-row"><Coins size={15} /><span>{b.coins}</span></div>
              <div className="gx2-row"><Package size={15} /><span>{b.junk}</span></div>
              {b.nice ? <div className="gx2-row is-nice"><Gem size={15} /><span>{b.nice}</span></div> : <div className="gx2-row is-none"><Gem size={15} /><span>Sin objeto especial</span></div>}
              {sendBtn("b" + i, lines.botin(b))}
            </article>
          ))}
          {kind === "pnj" && shown.map((p, i) => (
            <article key={i} className="gx2-card gx2-npc">
              <div className="gx2-npc-h"><i>{p.name.charAt(0)}</i><div><b className="mh-serif">{p.name}</b><span className="gx2-tags"><em>{p.job}</em><em>{p.trait}</em></span></div></div>
              <p>Quiere {p.want}.</p>
              <span className="gx2-sum">{npcStatsSummary(p.stats)}</span>
              <button type="button" className={"gx2-secret" + (open === "st" + i ? " is-open" : "")} onClick={() => setOpen(open === "st" + i ? "" : "st" + i)} aria-expanded={open === "st" + i}>
                <Swords size={13} /><span>{open === "st" + i ? "Ocultar estadísticas" : "Ver estadísticas"}</span>
              </button>
              {open === "st" + i && <NpcStatsView stats={p.stats} />}
              <button type="button" className={"gx2-secret" + (open === "im" + i ? " is-open" : "")} onClick={() => setOpen(open === "im" + i ? "" : "im" + i)} aria-expanded={open === "im" + i}>
                <Wand2 size={13} /><span>{open === "im" + i ? "Ocultar el prompt de imagen" : "Prompt para generar su imagen"}</span>
              </button>
              {open === "im" + i && (
                <>
                  <div className="gx2-seg" role="radiogroup" aria-label="Estilo del dibujo">{ART_STYLES.map((s) => <button key={s.key} type="button" role="radio" aria-checked={style === s.key} className={style === s.key ? "is-on" : ""} onClick={() => setStyle(s.key)}>{s.label}</button>)}</div>
                  <CopyPrompt text={buildDialoguePrompt({ name: p.name, desc: p.look, expr: "tranquila", style })} rows={5} />
                </>
              )}
              <button type="button" className={"gx2-secret" + (open === "p" + i ? " is-open" : "")} onClick={() => setOpen(open === "p" + i ? "" : "p" + i)} aria-expanded={open === "p" + i}>
                {open === "p" + i ? <Eye size={13} /> : <EyeOff size={13} />}
                <span>{open === "p" + i ? "Secreto: " + p.secret + "." : "Ver el secreto del DJ"}</span>
              </button>
              {sendBtn("p" + i, lines.pnj(p))}
            </article>
          ))}
          {kind === "encuentro" && shown.map((e, i) => (
            <article key={i} className="gx2-card gx2-enc">
              <div className="gx2-enc-h"><b className="mh-serif">{e.name}</b><span>{e.spent} de {e.budget} pts</span></div>
              <div className="gx2-meter" aria-hidden="true"><i style={{ width: Math.min(100, Math.round((e.spent / Math.max(1, e.budget)) * 100)) + "%" }} /></div>
              <ul className="gx2-parts">
                {e.parts.map((p) => {
                  const k = "s" + i + p.role;
                  return (
                    <li key={p.role} className={"gx2-part" + (open === k ? " is-open" : "")}>
                      <button type="button" className="gx2-part-b" aria-expanded={open === k} title="Ver las estadísticas" onClick={() => setOpen(open === k ? "" : k)}>
                        <Skull size={14} /><b>{p.name}</b><em>×{p.n}</em><small>{p.role} · {p.cost} pts</small>
                      </button>
                      <span className="gx2-sum">{npcStatsSummary(p.stats)}</span>
                      {open === k && <NpcStatsView stats={p.stats} />}
                    </li>
                  );
                })}
              </ul>
              <p>{e.tip}</p>
              <div className="gx2-acts">
                <button type="button" className="mh-btn" onClick={() => (onPlace(e.parts.flatMap((p) => Array.from({ length: p.n }, () => ({ name: p.name, stats: p.stats })))), setSent("e" + i))}><Skull size={14} /> {sent === "e" + i ? "Colocados" : "Colocar en el mapa"}</button>
                {sendBtn("ec" + i, lines.encuentro(e))}
              </div>
            </article>
          ))}
        </div>
        {kind === "encuentro" && <p className="gx-note">Cada criatura se coloca con sus estadísticas (una base según el rango y el tipo); puedes editarlas en el mapa.</p>}
      </section>
    </div>
  );
}
