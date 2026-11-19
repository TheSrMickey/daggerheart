"use client";
// Pestaña «Sobres» (prueba): sobres de cartas brillantes que se rasgan arrastrando la parte de arriba y cuyas cartas se descubren una a una.
// Rarezas: las cartas sin rango son comunes; las que tienen rango (armas, armaduras, formas de bestia, objetos…) salen según la rareza de su rango
// (I común, II poco común, III rara, IV legendaria) y las Salvajes son las más raras de todas.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Package, RotateCcw, Sparkles } from "lucide-react";
import { CardFace } from "./Cards";
import { CardBack } from "./CardBacks";
import { itemVisual } from "./gearIcons";

const PACK_SIZE = 5;

// ---------- Rarezas ----------
const RARITIES = [
  { key: "comun", label: "Común", color: "#9A91AD" },
  { key: "poco", label: "Poco común", color: "#6FBF73" },
  { key: "rara", label: "Rara", color: "#A58BE8" },
  { key: "legendaria", label: "Legendaria", color: "#E8C547" },
  { key: "salvaje", label: "Salvaje", color: "#FF5FA2" },
];
const CLASS_W = [74, 17, 7, 2]; // probabilidad (%) de cada rango en las primeras cartas
const LAST_W = [0, 58, 33, 9]; // la última carta del sobre es la «rara»: nunca común
const WILD_P = 0.004; // Salvaje: muy poco probable…
const WILD_LAST = 0.012; // …algo más en la última carta
const WEIGHTS = { dominio: 46, subclase: 12, ascendencia: 8, comunidad: 8, transformacion: 4, forma: 8, arma: 9, armadura: 5, adversario: 3, entorno: 2, objeto: 10 };

const SPARKS = { comun: 6, poco: 10, rara: 14, legendaria: 18, salvaje: 24 };
const kindOf = (c) => (c.objeto ? "objeto" : c.kind);
const levelTier = (l) => (l <= 1 ? 1 : l <= 4 ? 2 : l <= 7 ? 3 : 4);
// Rango de una carta (1–4) o 0 si es Salvaje.
function tierOf(c, pack) {
  if (c.kind === "salvaje") return 0;
  if (c.tier) return Math.min(4, c.tier);
  if (pack.levelTier && c.kind === "dominio") return levelTier(Number(c.level || 1));
  if (pack.rankTier && c.kind === "subclase") return Math.min(4, (c.rank || 0) + 1);
  return 1; // sin rango: normal
}
const rarityOf = (c, pack) => {
  const t = tierOf(c, pack);
  return t === 0 ? RARITIES[4] : RARITIES[t - 1];
};

// ---------- Objetos de prueba (no están en la pestaña Cartas) ----------
const OBJECTS = [
  [1, "Antorcha", "Equipo", "Luz", "Ilumina a tu alrededor durante un buen rato antes de consumirse."],
  [1, "Cuerda de 15 metros", "Equipo", "15 m", "Cuerda resistente, útil para escalar, atar o improvisar."],
  [1, "Suministros básicos", "Equipo", "Kit", "Vendas, yesca y pequeñas herramientas para el día a día."],
  [1, "Raciones de viaje", "Equipo", "Comida", "Comida seca para varios días de camino."],
  [1, "Cantimplora", "Equipo", "Agua", "Recipiente para llevar agua u otros líquidos."],
  [1, "Kit de herramientas", "Equipo", "Reparar", "Un juego compacto de herramientas para reparar o forzar mecanismos."],
  [1, "Poción menor de salud", "Consumible", "1d4 PV", "Al bebértela, recuperas 1d4 Puntos de vida."],
  [1, "Poción menor de vigor", "Consumible", "1d4 Estrés", "Al bebértela, te quitas 1d4 de Estrés."],
  [2, "Poción de salud", "Consumible", "2d4 PV", "Al bebértela, recuperas 2d4 Puntos de vida."],
  [2, "Poción de vigor", "Consumible", "2d4 Estrés", "Al bebértela, te quitas 2d4 de Estrés."],
  [2, "Ganzúas de maestro", "Equipo", "Cerraduras", "Tienes ventaja en las tiradas para forzar cerraduras y mecanismos sencillos."],
  [2, "Capa de viaje impermeable", "Equipo", "Abrigo", "Te protege de la lluvia, el viento y el frío durante todo el viaje."],
  [3, "Elixir de claridad", "Consumible", "Ventaja", "Bébelo antes de una tirada de acción: la haces con ventaja."],
  [3, "Farol de luz eterna", "Equipo", "Luz", "Un farol cuya llama no se apaga nunca y no se ve afectada por el viento."],
  [3, "Amuleto de la suerte", "Objeto", "1 / sesión", "Una vez por sesión, puedes repetir una de tus tiradas de dados."],
  [4, "Corazón de fénix", "Consumible", "3 PV", "Una vez, cuando fueras a marcar tu último Punto de vida, te lo curas y recuperas 3 PV."],
  [4, "Llave de todas las puertas", "Objeto", "Abre todo", "Abre cualquier cerradura o puerta que no esté sellada por magia."],
];
const TIER_LABELS = ["", "Común", "Poco común", "Raro", "Legendario"];
const TIER_COLS = ["", "#857C96", "#7FB77A", "#A58BE8", "#E8C547"];
function objectCards() {
  return OBJECTS.map(([tier, name, type, big, desc]) => {
    const v = itemVisual(name);
    return { id: "obj-" + name, kind: "armadura", key: name, sub: type + " · Objeto", tier, text: "", features: [], gear: { label: type, big, small: "", feature: desc, foot: "Objeto", pill: TIER_LABELS[tier] }, image: null, color: TIER_COLS[tier], Icon: v.Icon, objeto: true };
  });
}

// ---------- Sobres ----------
const SPECIAL = [
  { id: "aventurero", name: "Aventurero", sub: "AVENTURERO", color: "#E8B93C", desc: "Cartas de todo tipo", kinds: ["dominio", "subclase", "ascendencia", "comunidad", "transformacion", "forma", "arma", "armadura", "adversario", "entorno"] },
  { id: "armeria", name: "Armería", sub: "ARMERÍA", color: "#D9644E", desc: "Armas y armaduras", kinds: ["arma", "armadura"], noObj: true },
  { id: "objetos", name: "Objetos", sub: "OBJETOS", color: "#E0823A", desc: "Equipo y pociones (prueba)", kinds: ["objeto"] },
  { id: "bestiario", name: "Bestiario", sub: "BESTIARIO", color: "#4FA39A", desc: "Formas de Bestia, adversarios y entornos", kinds: ["forma", "adversario", "entorno"] },
  { id: "subclases", name: "Subclases", sub: "SUBCLASES", color: "#8E74D8", desc: "Fundación, Especialización y Maestría", kinds: ["subclase"], rankTier: true },
  { id: "linajes", name: "Linajes", sub: "LINAJES", color: "#5C97C9", desc: "Ascendencias, comunidades y transformaciones", kinds: ["ascendencia", "comunidad", "transformacion"] },
];
// Logo oficial de Enaris (el mismo de la hoja y de la reverso de las cartas), sin deformar: viewBox 200 × 340.
const LOGO = "M100 0C101.5 66 106 109 200 115C106 121 102 164 100 340C98 164 94 121 0 115C94 109 98.5 66 100 0Z";
const mix = (c, pct, w) => `color-mix(in srgb, ${c} ${pct}%, ${w})`;
const themeOf = (p) => ({ ...p, c1: mix(p.color, 38, "#fff"), c2: p.color, c3: mix(p.color, 48, "#000"), glow: p.color, ink: mix(p.color, 22, "#000") });

const rnd = (n) => Math.floor(Math.random() * n);
const pickW = (weights) => {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
};
function draw(pool, wild, pack) {
  const tiers = [[], [], [], []];
  pool.forEach((c) => tiers[tierOf(c, pack) - 1].push(c));
  const out = [];
  let guard = 0;
  while (out.length < PACK_SIZE && guard++ < 300) {
    const last = out.length === PACK_SIZE - 1;
    let c = null;
    if (wild.length && Math.random() < (last ? WILD_LAST : WILD_P)) c = wild[rnd(wild.length)];
    else {
      const base = last ? LAST_W : CLASS_W;
      const w = base.map((x, i) => (tiers[i].length ? x : 0));
      if (w.every((x) => !x)) tiers.forEach((l, i) => l.length && (w[i] = 1));
      const list = tiers[pickW(w)];
      // primero el tipo de carta (según su peso) y luego una carta de ese tipo
      const kinds = [...new Set(list.map(kindOf))];
      const k = kinds[pickW(kinds.map((x) => WEIGHTS[x] || 5))];
      const cand = list.filter((x) => kindOf(x) === k);
      c = cand[rnd(cand.length)];
    }
    if (c && !out.some((x) => x.id === c.id)) out.push(c);
  }
  return out.map((c, i) => ({ c, i, t: tierOf(c, pack) || 9 })).sort((a, b) => a.t - b.t || a.i - b.i).map((x) => x.c);
}

// ---------- Geometría del sobre ----------
const TEAR = 15; // % de altura de la línea de rasgado
const grid = (n) => Array.from({ length: n + 1 }, (_, i) => (i / n) * 100);
const TOP_X = grid(40);
const TEAR_X = grid(24);
const topY = (i) => 0.6 + (i % 2 ? 0.9 : 0);
const tearY = (i) => TEAR + (i % 2 ? 1.5 : 0);
const poly = (pts) => "polygon(" + pts.map(([x, y]) => x.toFixed(2) + "% " + y.toFixed(2) + "%").join(",") + ")";
const JAG = [0.9, -0.6, 0.9, -0.6, 0.9, -0.5];
// Borde roto (igual en las dos mitades para que encajen): de arriba abajo.
const jag = (x) => JAG.map((d, k) => [x + d, 0.6 + ((TEAR - 0.6) * (k + 1)) / (JAG.length + 1)]);
// Tira de arriba entre x0 y x1 (en %), con borde roto donde está el corte.
function strip(x0, x1, cutL, cutR) {
  const pts = [[x0, 0.6]];
  TOP_X.forEach((x, i) => x > x0 && x < x1 && pts.push([x, topY(i)]));
  pts.push([x1, 0.6]);
  if (cutR) jag(x1).forEach((p) => pts.push(p));
  pts.push([x1, TEAR]);
  [...TEAR_X].reverse().forEach((x) => { const i = TEAR_X.indexOf(x); x > x0 && x < x1 && pts.push([x, tearY(i)]); });
  pts.push([x0, TEAR]);
  if (cutL) [...jag(x0)].reverse().forEach((p) => pts.push(p));
  return poly(pts);
}
const BODY_CLIP = poly([...TEAR_X.map((x, i) => [x, tearY(i)]), ...[...grid(40)].reverse().map((x, k) => [x, 99.2 - (k % 2 ? 0 : 0.9)])]);

function PackArt({ t }) {
  const ink = t.ink;
  return (
    <div className="sb-art">
      <div className="sb-crimp is-top" />
      <div className="sb-crimp is-bot" />
      <div className="sb-foil" />
      <div className="sb-rain" />
      <div className="sb-streak" />
      <svg className="sb-emb" viewBox="0 0 200 320" aria-hidden="true" style={{ "--ink": ink }}>
        <svg x="44" y="64" width="112" height="190" viewBox="0 0 200 340" overflow="visible">
          <path d={LOGO} fill="var(--ink)" />
          <path d={LOGO} fill="#fff" fillOpacity=".22" transform="translate(100 115) scale(.55) translate(-100 -115)" />
        </svg>
      </svg>
    </div>
  );
}

export function SobresPage({ items, icons, FitTitle, FitBox, back }) {
  const [shelfTab, setShelfTab] = useState("especiales");
  const [stage, setStage] = useState("shelf"); // shelf | pack | opening | cards | sum
  const [pack, setPack] = useState(SPECIAL[0]);
  const [cards, setCards] = useState([]);
  const [rev, setRev] = useState([]);
  const [idx, setIdx] = useState(0);
  const [tear, setTear] = useState({ side: "L", ext: 0, rise: 0 }); // rasgado: lado, cuánto (px) y cuánto se levanta
  const [drag, setDrag] = useState(false);
  const [fx, setFx] = useState(null);
  const [shake, setShake] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [stats, setStats] = useState({ packs: 0, wild: 0 });
  const [dims, setDims] = useState({ w: 900, h: 700 });
  const wrapRef = useRef(null);
  const packRef = useRef(null);
  const dragRef = useRef(null);
  const swipe = useRef(null);
  const moved = useRef(false);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const objs = useMemo(objectCards, []);
  const all = useMemo(() => [...items, ...objs], [items, objs]);
  const wildAll = useMemo(() => items.filter((c) => c.kind === "salvaje"), [items]);
  const domains = useMemo(() => {
    const m = new Map();
    items.forEach((c) => c.kind === "dominio" && !m.has(c.domain) && m.set(c.domain, c.color));
    return [...m.entries()].map(([d, color]) => ({ id: "dom-" + d, name: d, sub: d.toUpperCase(), color: color || "#C9A24A", desc: "Rareza según el nivel", kinds: ["dominio"], domain: d, levelTier: true }));
  }, [items]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setDims({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  const cs = Math.max(0.42, Math.min(1.1, (dims.h - 190) / 420, (dims.w - 30) / 330));
  const ps = Math.max(0.5, Math.min(1.25, (dims.h - 150) / 400, (dims.w - 40) / 270));
  const theme = themeOf(pack);
  const Icon = (c) => c.Icon || icons?.[c.domain] || Sparkles;

  // ---- Sobre ----
  const choose = (p) => {
    setPack(p);
    setTear({ side: "L", ext: 0, rise: 0 });
    setStage("pack");
  };
  const openPack = () => {
    if (stage !== "pack") return;
    const W = packRef.current?.offsetWidth || 260;
    const pool = all.filter((c) => pack.kinds.includes(kindOf(c)) && (!pack.domain || c.domain === pack.domain));
    setDrag(false);
    setTear((t) => ({ ...t, ext: W }));
    setCards(draw(pool, wildAll, pack));
    setRev([]);
    setIdx(0);
    setFx(null);
    setStage("opening");
    later(() => setStage("cards"), 1300);
  };
  // Rasgado: la grieta sigue al puntero píxel a píxel. Se agarra una esquina de la tira (o la parte ya rasgada) y se arrastra hasta el otro lado.
  const onTearDown = (e) => {
    if (stage !== "pack" || e.button > 0) return;
    const box = packRef.current?.getBoundingClientRect();
    if (!box) return;
    const W = box.width;
    let side = tear.side;
    if (tear.ext <= 0) {
      const fx0 = (e.clientX - box.left) / W;
      if (fx0 < 0.24) side = "L";
      else if (fx0 > 0.76) side = "R";
      else return setNudge((n) => n + 1);
    }
    e.preventDefault();
    const d = { side, x0: e.clientX, y0: e.clientY, ext0: tear.ext, W };
    dragRef.current = d;
    setDrag(true);
    setTear((t) => ({ ...t, side }));
    const mv = (ev) => {
      const dir = d.side === "L" ? 1 : -1;
      const ext = Math.max(0, Math.min(d.W, d.ext0 + dir * (ev.clientX - d.x0)));
      setTear({ side: d.side, ext, rise: Math.max(0, Math.min(d.W * 0.5, d.y0 - ev.clientY)) });
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const dd = dragRef.current;
      dragRef.current = null;
      setDrag(false);
      if (!dd) return;
      const dir = dd.side === "L" ? 1 : -1;
      const ext = Math.max(0, Math.min(dd.W, dd.ext0 + dir * (ev.clientX - dd.x0)));
      if (ext >= dd.W * 0.84) openPack();
      else setTear({ side: dd.side, ext, rise: 0 });
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const onPackMove = (e) => {
    const el = packRef.current;
    if (!el || stage !== "pack" || dragRef.current) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    el.classList.add("is-hov");
    el.style.setProperty("--sweep", String(Math.round(x * 100)));
    el.style.setProperty("--rx", ((0.5 - y) * 12).toFixed(2) + "deg");
    el.style.setProperty("--ry", ((x - 0.5) * 16).toFixed(2) + "deg");
  };
  const onPackLeave = () => {
    const el = packRef.current;
    if (!el) return;
    el.classList.remove("is-hov");
    el.style.removeProperty("--sweep");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  // ---- Cartas ----
  const go = (n) => setIdx((cur) => Math.max(0, Math.min(cards.length - 1, typeof n === "function" ? n(cur) : n)));
  const flip = (i) => {
    if (rev[i] || !cards[i]) return;
    const c = cards[i];
    const r = rarityOf(c, pack);
    setRev((cur) => {
      const n = [...cur];
      n[i] = true;
      return n;
    });
    setFx({ n: Date.now(), r: r.key, i });
    if (r.key === "salvaje") {
      setShake(true);
      later(() => setShake(false), 650);
      setStats((s) => ({ ...s, wild: s.wild + 1 }));
    }
    later(() => setFx((f) => (f && f.i === i ? null : f)), r.key === "comun" ? 1400 : r.key === "poco" ? 1700 : 2800);
  };
  const revealAll = () => cards.forEach((c, i) => later(() => flip(i), i * 260));
  const allRev = cards.length > 0 && cards.every((_, i) => rev[i]);
  useEffect(() => {
    if (stage === "cards" && allRev) setStats((s) => ({ ...s, packs: s.packs + 1 }));
  }, [allRev]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (stage === "pack") {
      const k = (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openPack());
      window.addEventListener("keydown", k);
      return () => window.removeEventListener("keydown", k);
    }
    if (stage !== "cards") return undefined;
    const k = (e) => {
      if (e.key === "ArrowRight") go((n) => n + 1);
      else if (e.key === "ArrowLeft") go((n) => n - 1);
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flip(idx);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const onCarDown = (e) => {
    swipe.current = { x: e.clientX };
    moved.current = false;
  };
  const onCarMove = (e) => {
    if (swipe.current && Math.abs(e.clientX - swipe.current.x) > 10) moved.current = true;
  };
  const onCarUp = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 55) go((n) => n + (dx < 0 ? 1 : -1));
    if (moved.current) later(() => (moved.current = false), 60);
  };
  const tilt = (e, o) => {
    if (o !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--tx", ((0.5 - (e.clientY - r.top) / r.height) * 10).toFixed(2) + "deg");
    e.currentTarget.style.setProperty("--ty", (((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(2) + "deg");
  };
  const untilt = (e) => {
    e.currentTarget.style.setProperty("--tx", "0deg");
    e.currentTarget.style.setProperty("--ty", "0deg");
  };
  const again = () => {
    setStage("shelf");
    setCards([]);
    setRev([]);
    setTear({ side: "L", ext: 0, rise: 0 });
    setFx(null);
  };

  // Geometría del rasgado
  const W = packRef.current?.offsetWidth || 260;
  const H = packRef.current?.offsetHeight || 400;
  const t = Math.min(100, (tear.ext / W) * 100);
  const L = tear.side === "L";
  const pivot = L ? t : 100 - t;
  const attached = t >= 100 ? null : L ? strip(t, 100, t > 0, false) : strip(0, 100 - t, false, t > 0);
  const flapClip = t <= 0 ? null : L ? strip(0, t, false, t < 100) : strip(100 - t, 100, t < 100, false);
  const theta = Math.min(62, 5 + 18 * (t / 100) + (tear.rise / (H * 0.3)) * 30);
  const sign = L ? 1 : -1;

  return (
    <div className="sb-root">
      <style>{CSS}</style>
      <div className={"sb-stage" + (shake ? " is-shake" : "") + " is-" + stage} ref={wrapRef} style={{ "--s": cs, "--ps": ps, "--glow": theme.glow }}>
        <div className="sb-bgfx" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: ((i * 73) % 100) + "%", animationDelay: (i % 7) * -1.3 + "s", animationDuration: 9 + (i % 5) * 2 + "s" }} />)}
        </div>
        <div className="sb-stats" aria-label="Estadísticas">
          <span><b>{stats.packs}</b> {stats.packs === 1 ? "sobre abierto" : "sobres abiertos"}</span>
          <span><b>{stats.wild}</b> {stats.wild === 1 ? "Salvaje" : "Salvajes"}</span>
          <em>Prueba</em>
        </div>

        {stage === "shelf" && (
          <div className="sb-shelf">
            <div className="sb-tabs" role="tablist" aria-label="Tipo de sobre">
              {[["especiales", "Especiales", SPECIAL.length], ["dominios", "Por dominio", domains.length]].map(([k, l, n]) => (
                <button key={k} type="button" role="tab" aria-selected={shelfTab === k} className={shelfTab === k ? "is-on" : ""} onClick={() => setShelfTab(k)}>
                  {l} <small>{n}</small>
                </button>
              ))}
            </div>
            {(() => {
              const list = shelfTab === "especiales" ? SPECIAL : domains;
              return (
                <section key={shelfTab} className="sb-sec">
                  <div className="sb-shelf-row">
                    {list.map((p, i) => {
                      const th = themeOf(p);
                      return (
                        <button key={p.id} type="button" className="sb-mini" style={{ "--c1": th.c1, "--c2": th.c2, "--c3": th.c3, "--glow": th.glow, animationDelay: i * -0.7 + "s" }} onClick={() => choose(p)} aria-label={"Abrir Sobre " + p.name} title={p.desc}>
                          <div className="sb-mini-in"><PackArt t={th} /></div>
                          <span>{p.name}</span>
                          <small>{p.desc}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })()}
            <p className="sb-odds">Las cartas con rango salen según su rareza (I común, II poco común, III rara, IV legendaria). Las Salvajes son rarísimas.</p>
          </div>
        )}

        {(stage === "pack" || stage === "opening") && (
          <div className="sb-packwrap">
            <button type="button" className="sb-backbtn" onClick={again} disabled={stage === "opening"}><ChevronLeft size={15} /> Cambiar sobre</button>
            <div
              ref={packRef}
              className={"sb-pack" + (stage === "opening" ? " is-opening" : "") + (drag ? " is-drag" : "") + (nudge ? " is-nudge" : "")}
              key={"pk" + nudge}
              style={{ "--c1": theme.c1, "--c2": theme.c2, "--c3": theme.c3, "--glow": theme.glow, "--th": sign * theta + "deg", "--ink": theme.ink }}
              onPointerMove={onPackMove}
              onPointerLeave={onPackLeave}
            >
              {t > 0 && (
                <div className="sb-inner" style={{ left: (L ? 0 : 100 - t) + "%", width: t + "%", opacity: Math.min(1, t / 12) }} />
              )}
              <div className="sb-body" style={{ clipPath: BODY_CLIP }}><PackArt t={theme} /></div>
              {attached && (
                <div className="sb-top" style={{ clipPath: attached }} onPointerDown={onTearDown}>
                  <PackArt t={theme} />
                </div>
              )}
              {flapClip && (
                <div
                  className="sb-flap"
                  style={{ clipPath: flapClip, transformOrigin: pivot + "% " + TEAR + "%", transform: `rotate(${sign * theta}deg)`, transition: drag ? "none" : "transform .25s ease-out" }}
                  onPointerDown={onTearDown}
                >
                  <PackArt t={theme} />
                </div>
              )}
              {t > 0 && t < 100 && <i className="sb-tip" style={{ left: pivot + "%", top: TEAR + "%" }} aria-hidden="true" />}
              {t === 0 && stage === "pack" && (
                <>
                  <span className="sb-grip is-l" aria-hidden="true">›</span>
                  <span className="sb-grip is-r" aria-hidden="true">‹</span>
                </>
              )}
              {stage === "opening" && (
                <div className="sb-burst" aria-hidden="true">
                  <i className="sb-flash" />
                  {Array.from({ length: 16 }, (_, i) => <b key={i} style={{ "--a": i * 22.5 + "deg", "--d": 150 + (i % 3) * 50 + "px", animationDelay: (i % 4) * 0.03 + "s" }} />)}
                </div>
              )}
            </div>
            <div className="sb-hint" style={{ opacity: stage === "opening" ? 0 : 1 }}>
              {t > 0 ? "Sigue arrastrando hasta el otro lado" : "Agarra una esquina de la tira de arriba y arrástrala hasta el otro lado"}
            </div>
          </div>
        )}

        {stage === "cards" && (
          <div className="sb-cardsstage">
            <div className="sb-count">
              {allRev ? "¡Sobre completo!" : rev.filter(Boolean).length + " / " + cards.length + " reveladas · toca la carta del centro para darle la vuelta"}
            </div>
            <div className="sb-car" onPointerDown={onCarDown} onPointerMove={onCarMove} onPointerUp={onCarUp} onPointerCancel={onCarUp}>
              {cards.map((c, i) => {
                const o = i - idx;
                const a = Math.abs(o);
                const r = rarityOf(c, pack);
                const showFx = fx && fx.i === i;
                return (
                  <div
                    key={c.id}
                    className={"sb-slot" + (a > 2 ? " is-far" : "") + (o === 0 ? " is-mid" : "") + (rev[i] ? " is-rev" : "") + " r-" + r.key}
                    style={{ "--o": o, "--a": a, zIndex: 20 - a, animationDelay: i * 0.11 + "s", "--rc": r.key === "comun" ? c.color || r.color : r.color }}
                    onClick={() => {
                      if (moved.current) return;
                      if (o === 0) flip(i);
                      else go(i);
                    }}
                  >
                    <div className="sb-tilt" onPointerMove={(e) => tilt(e, o)} onPointerLeave={untilt}>
                      <div className="sb-flip">
                        <div className="sb-face sb-back"><CardBack kind={back || "noche"} /></div>
                        <div className="sb-face sb-front">
                          <CardFace c={c} I={Icon(c)} FitTitle={FitTitle} FitBox={FitBox} />
                          {rev[i] && r.key !== "comun" && <div className="sb-shine" />}
                        </div>
                      </div>
                    </div>
                    {showFx && (
                      <div className={"sb-fx r-" + r.key} key={fx.n} aria-hidden="true">
                        <i className="sb-ring" />
                        {r.key !== "comun" && r.key !== "poco" && <i className="sb-rays" />}
                        {Array.from({ length: SPARKS[r.key] }, (_, k) => (
                          <b key={k} style={{ "--a": k * (360 / SPARKS[r.key]) + "deg", "--d": 120 + ((k * 37) % 90) + "px", animationDelay: (k % 5) * 0.04 + "s" }} />
                        ))}
                      </div>
                    )}
                    {showFx && (r.key === "rara" || r.key === "legendaria" || r.key === "salvaje") && <div className="sb-banner">{r.key === "salvaje" ? "✦ Carta Salvaje ✦" : r.label}</div>}
                    {rev[i] && o === 0 && <div className="sb-rar" style={{ "--rc": r.color }}>{r.label}</div>}
                  </div>
                );
              })}
            </div>
            <div className="sb-ctl">
              <button type="button" className="sb-nav" onClick={() => go((n) => n - 1)} disabled={idx === 0} aria-label="Carta anterior"><ChevronLeft size={20} /></button>
              <div className="sb-dots" role="tablist" aria-label="Cartas del sobre">
                {cards.map((c, i) => (
                  <button key={c.id} type="button" role="tab" aria-selected={i === idx} className={(i === idx ? "is-on " : "") + (rev[i] ? "is-rev r-" + rarityOf(c, pack).key : "")} onClick={() => go(i)} aria-label={"Carta " + (i + 1)} />
                ))}
              </div>
              <button type="button" className="sb-nav" onClick={() => go((n) => n + 1)} disabled={idx === cards.length - 1} aria-label="Carta siguiente"><ChevronRight size={20} /></button>
            </div>
            <div className="sb-acts">
              {!allRev ? (
                <button type="button" className="mh-btn-ghost" onClick={revealAll}><Sparkles size={15} /> Revelar todas</button>
              ) : (
                <>
                  <button type="button" className="mh-btn-ghost" onClick={() => setStage("sum")}><LayoutGrid size={15} /> Ver todas juntas</button>
                  <button type="button" className="mh-btn" onClick={again}><Package size={15} /> Abrir otro sobre</button>
                </>
              )}
            </div>
          </div>
        )}

        {stage === "sum" && (
          <div className="sb-sum">
            <div className="sb-count">Tu sobre · {pack.name}</div>
            <div className="sb-sum-row">
              {cards.map((c, i) => {
                const r = rarityOf(c, pack);
                return (
                  <div key={c.id} className={"sb-mini-card r-" + r.key} style={{ animationDelay: i * 0.08 + "s", "--rc": r.key === "comun" ? c.color || r.color : r.color }}>
                    <div className="sb-mini-card-in"><CardFace c={c} I={Icon(c)} FitTitle={FitTitle} FitBox={FitBox} /></div>
                    <span className="sb-mini-rar" style={{ "--rc": r.color }}>{r.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="sb-acts">
              <button type="button" className="mh-btn-ghost" onClick={() => setStage("cards")}><RotateCcw size={15} /> Volver a verlas</button>
              <button type="button" className="mh-btn" onClick={again}><Package size={15} /> Abrir otro sobre</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
@property --sweep { syntax: '<number>'; inherits: true; initial-value: 0; }
.sb-root { height: calc(100dvh - 44px); min-height: 560px; display: flex; flex-direction: column; }
.sb-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; color: var(--mh-ink); isolation: isolate; user-select: none; -webkit-user-select: none; border-radius: 26px;
  background: radial-gradient(60% 55% at 50% 46%, color-mix(in srgb, var(--glow) 16%, transparent), transparent 72%); transition: background .5s; }
.sb-stage.is-shake { animation: sb-shake .6s cubic-bezier(.36,.07,.19,.97); }
@keyframes sb-shake { 10%, 90% { translate: -2px 0; } 20%, 80% { translate: 4px 1px; } 30%, 50%, 70% { translate: -7px -1px; } 40%, 60% { translate: 7px 1px; } }
.sb-bgfx { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.sb-bgfx i { position: absolute; bottom: -10px; width: 4px; height: 4px; border-radius: 50%; background: var(--glow); box-shadow: 0 0 10px 2px var(--glow); opacity: 0; animation: sb-float linear infinite; }
@keyframes sb-float { 0% { transform: translateY(0) scale(.6); opacity: 0; } 15% { opacity: .6; } 100% { transform: translateY(-700px) scale(1.2); opacity: 0; } }
.sb-stats { position: absolute; top: 4px; right: 4px; z-index: 6; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; font-size: 12.5px; color: var(--mh-muted); }
.sb-stats span { padding: 6px 11px; border-radius: 99px; border: 1px solid var(--mh-line); background: color-mix(in srgb, var(--mh-ink) 5%, transparent); backdrop-filter: blur(6px); }
.sb-stats b { color: var(--mh-ink); }
.sb-stats em { font-style: normal; font-weight: 700; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; padding: 5px 9px; border-radius: 99px; background: color-mix(in srgb, #E8C547 22%, transparent); color: #A9811F; }
html[data-mh-theme="light"] .sb-stats em { color: #8A6612; }

/* Estantería */
.sb-shelf { position: absolute; inset: 0; z-index: 2; overflow-y: auto; display: flex; flex-direction: column; align-items: center; gap: 26px; padding: 44px 18px 22px; }
.sb-sec { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.sb-tabs { display: inline-flex; gap: 4px; padding: 4px; border-radius: 99px; border: 1px solid var(--mh-line); background: color-mix(in srgb, var(--mh-ink) 5%, transparent); flex: none; margin-top: 4px; }
.sb-tabs button { appearance: none; border: 0; font: inherit; font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 99px; background: transparent; color: var(--mh-muted); cursor: pointer; transition: background .2s, color .2s; }
.sb-tabs button small { opacity: .7; margin-left: 3px; font-size: 11px; } .sb-tabs button.is-on { background: var(--mh-ink); color: var(--mh-bg, #fff); }
.sb-sec { margin-block: auto; animation: sb-pop .45s cubic-bezier(.2,.9,.3,1.1) both; }
.sb-shelf-t { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--mh-muted); }
.sb-shelf-row { display: flex; gap: clamp(14px, 3vw, 34px); flex-wrap: wrap; justify-content: center; max-width: 1100px; }
.sb-shelf { justify-content: flex-start; }
.sb-mini { appearance: none; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; width: clamp(110px, 14vw, 150px); animation: sb-bob 5s ease-in-out infinite; transition: transform .25s; }
.sb-mini:hover { transform: translateY(-8px) scale(1.05); } .sb-mini:focus-visible { outline: 2px solid var(--c2); outline-offset: 6px; border-radius: 12px; }
.sb-mini-in { position: relative; width: 100%; aspect-ratio: 13 / 20; filter: drop-shadow(0 14px 14px rgba(0,0,0,.4)); animation: sb-sweep 4.8s linear infinite; margin-bottom: 4px; }
html[data-mh-theme="light"] .sb-mini-in { filter: drop-shadow(0 12px 12px rgba(70,45,10,.3)); }
.sb-mini span { font-size: 13px; font-weight: 700; letter-spacing: .02em; color: var(--mh-ink); }
.sb-mini small { font-size: 11px; line-height: 1.3; color: var(--mh-muted); text-align: center; }
.sb-odds { margin: 4px 0 0; font-size: 12px; color: var(--mh-muted); text-align: center; max-width: 520px; line-height: 1.45; }
@keyframes sb-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -7px; } }

/* Sobre grande */
.sb-packwrap { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; animation: sb-zoom .55s cubic-bezier(.2,.9,.3,1.15) both; }
@keyframes sb-zoom { from { opacity: 0; transform: scale(.55) translateY(30px); } to { opacity: 1; transform: none; } }
.sb-backbtn { position: absolute; top: 4px; left: 4px; appearance: none; display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 12.5px; color: var(--mh-ink); background: color-mix(in srgb, var(--mh-ink) 6%, transparent); border: 1px solid var(--mh-line); padding: 7px 12px 7px 8px; border-radius: 99px; cursor: pointer; }
.sb-backbtn:hover:not(:disabled) { background: color-mix(in srgb, var(--mh-ink) 12%, transparent); } .sb-backbtn:disabled { opacity: .4; cursor: default; }
.sb-pack { position: relative; width: calc(260px * var(--ps)); height: calc(400px * var(--ps)); --rx: 0deg; --ry: 0deg; transform: perspective(1000px) rotateX(var(--rx)) rotateY(var(--ry)); transition: transform .2s ease-out; touch-action: none;
  filter: drop-shadow(0 26px 26px rgba(0,0,0,.5)) drop-shadow(0 0 34px color-mix(in srgb, var(--glow) 38%, transparent)); animation: sb-sweep 4.8s linear infinite, sb-bob 6s ease-in-out infinite; }
html[data-mh-theme="light"] .sb-pack { filter: drop-shadow(0 22px 20px rgba(70,45,10,.32)) drop-shadow(0 0 30px color-mix(in srgb, var(--glow) 40%, transparent)); }
.sb-pack.is-hov, .sb-pack.is-drag { animation: sb-bob 6s ease-in-out infinite; } .sb-pack.is-drag { --rx: 0deg !important; --ry: 0deg !important; }
.sb-pack.is-nudge { animation: sb-sweep 4.8s linear infinite, sb-bob 6s ease-in-out infinite, sb-no .4s ease; }
@keyframes sb-no { 20%, 60% { translate: -6px 0; } 40%, 80% { translate: 6px 0; } }
@keyframes sb-sweep { from { --sweep: -35; } to { --sweep: 135; } }
.sb-body, .sb-top, .sb-flap { position: absolute; inset: 0; }
.sb-top, .sb-flap { cursor: grab; will-change: transform; } .sb-top:active, .sb-flap:active { cursor: grabbing; }
.sb-inner { position: absolute; top: calc(${TEAR}% - 4%); height: 9%; background: radial-gradient(80% 100% at 50% 60%, #fff7d6, var(--glow) 45%, transparent 78%); filter: blur(5px); pointer-events: none; }
.sb-tip { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, #fff, var(--glow) 55%, transparent 72%); box-shadow: 0 0 16px 6px var(--glow); z-index: 4; }
.sb-grip { position: absolute; top: calc(${TEAR}% - 15px); width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font: 700 20px/1 Inter, system-ui, sans-serif; color: var(--ink, #3a2606); background: rgba(255,255,255,.75); box-shadow: 0 0 0 2px rgba(255,255,255,.5), 0 0 18px 4px var(--glow); pointer-events: none; z-index: 4; animation: sb-pulse 1.4s ease-in-out infinite; }
.sb-grip.is-l { left: 3%; } .sb-grip.is-r { right: 3%; }
@keyframes sb-pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 2px rgba(255,255,255,.5), 0 0 14px 2px var(--glow); } 50% { transform: scale(1.18); box-shadow: 0 0 0 4px rgba(255,255,255,.35), 0 0 24px 8px var(--glow); } }
.sb-hint { font-size: 13px; font-weight: 600; letter-spacing: .03em; color: var(--mh-muted); transition: opacity .3s; text-align: center; padding: 0 16px; max-width: 460px; }

/* Arte del sobre: metal brillante con holografía */
.sb-art { position: absolute; inset: 0; overflow: hidden; border-radius: 10px;
  background: radial-gradient(130% 55% at 50% 0%, rgba(255,255,255,.7), transparent 60%), radial-gradient(90% 40% at 20% 100%, rgba(255,255,255,.25), transparent 70%), linear-gradient(158deg, var(--c1) 0%, var(--c2) 52%, var(--c3) 100%); }
.sb-art::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 2px rgba(255,255,255,.4), inset 0 0 36px rgba(0,0,0,.28); pointer-events: none; }
.sb-crimp { position: absolute; left: 0; right: 0; height: 6.5%; background: repeating-linear-gradient(90deg, rgba(255,255,255,.28) 0 2px, rgba(0,0,0,.18) 2px 3px, transparent 3px 7px); }
.sb-crimp.is-top { top: 0; border-bottom: 1px solid rgba(0,0,0,.2); } .sb-crimp.is-bot { bottom: 0; border-top: 1px solid rgba(0,0,0,.2); }
.sb-emb { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 3; filter: drop-shadow(0 1px 0 rgba(255,255,255,.55)) drop-shadow(0 2px 3px rgba(0,0,0,.25)); }
.sb-foil { position: absolute; inset: 0; mix-blend-mode: color-dodge; opacity: .5;
  background: linear-gradient(112deg, transparent calc(var(--sweep) * 1% - 34%), rgba(255,60,210,.55) calc(var(--sweep) * 1% - 16%), rgba(60,255,230,.6) calc(var(--sweep) * 1% - 2%), rgba(255,240,90,.55) calc(var(--sweep) * 1% + 14%), transparent calc(var(--sweep) * 1% + 32%)); }
.sb-rain { position: absolute; inset: 0; mix-blend-mode: overlay; opacity: .3; background: repeating-linear-gradient(115deg, rgba(255,255,255,0) 0 14px, rgba(255,255,255,.22) 14px 15px), conic-gradient(from calc(var(--sweep) * 2deg) at 50% 45%, #ff7ad9, #7affef, #fff47a, #a98bff, #ff7ad9); }
.sb-streak { position: absolute; top: -10%; bottom: -10%; width: 16%; left: calc(var(--sweep) * 1% - 8%); transform: skewX(-18deg); background: linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent); mix-blend-mode: soft-light; filter: blur(1px); }

/* Apertura */
.sb-pack.is-opening .sb-flap { animation: sb-fly 1s cubic-bezier(.3,.1,.3,1) forwards !important; }
@keyframes sb-fly { 0% { transform: rotate(var(--th)); } 100% { transform: translate(-40px, -420px) rotate(-38deg); opacity: 0; } }
.sb-pack.is-opening .sb-body { animation: sb-drop 1.05s cubic-bezier(.4,0,.6,1) .25s forwards; }
@keyframes sb-drop { 0% { transform: none; opacity: 1; } 55% { transform: translateY(-14px) scale(1.03); opacity: 1; } 100% { transform: translateY(80px) scale(.82); opacity: 0; } }
.sb-pack.is-opening .sb-inner { animation: sb-light 1.2s ease-out forwards; }
@keyframes sb-light { 0% { opacity: .6; transform: scaleY(1); } 40% { opacity: 1; transform: scale(1.1, 6); } 100% { opacity: 0; transform: scale(1.3, 10); } }
.sb-burst { position: absolute; left: 50%; top: ${TEAR}%; width: 0; height: 0; pointer-events: none; z-index: 5; }
.sb-flash { position: absolute; left: -150px; top: -150px; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, #fff 0%, var(--glow) 28%, transparent 68%); animation: sb-flash .9s ease-out both; }
html:not([data-mh-theme="light"]) .sb-flash { mix-blend-mode: screen; }
@keyframes sb-flash { 0% { transform: scale(.1); opacity: 0; } 25% { opacity: 1; } 100% { transform: scale(5); opacity: 0; } }
.sb-burst b { position: absolute; left: -3px; top: -3px; width: 6px; height: 6px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px 3px var(--glow); animation: sb-spark 1s cubic-bezier(.2,.8,.3,1) .1s both; }
@keyframes sb-spark { 0% { transform: rotate(var(--a)) translateX(0) scale(1); opacity: 1; } 100% { transform: rotate(var(--a)) translateX(var(--d)) scale(.2); opacity: 0; } }

/* Carrusel de cartas */
.sb-cardsstage, .sb-sum { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; }
.sb-count { margin-top: 44px; font-size: 12.5px; letter-spacing: .06em; font-weight: 600; color: var(--mh-muted); text-align: center; padding: 0 14px; min-height: 18px; }
.sb-car { position: relative; flex: 1; width: 100%; perspective: 1500px; touch-action: pan-y; cursor: grab; }
.sb-slot { position: absolute; left: 50%; top: 50%; width: 300px; height: 420px; margin: -210px 0 0 -150px; transform-style: preserve-3d;
  transform: translateX(calc(var(--o) * 236px * var(--s))) scale(calc(var(--s) * (1 - var(--a) * .16))) rotateY(calc(var(--o) * -22deg));
  transition: transform .6s cubic-bezier(.2,.8,.2,1), opacity .4s, filter .4s; filter: brightness(calc(1 - var(--a) * .22)); cursor: pointer;
  animation: sb-deal .85s cubic-bezier(.2,.9,.3,1.1) backwards; }
@keyframes sb-deal { from { transform: translateX(0) translateY(calc(230px * var(--s))) scale(.18) rotateZ(-14deg); opacity: 0; } 30% { opacity: 1; } }
.sb-slot.is-far { opacity: 0; pointer-events: none; }
.sb-tilt { position: relative; width: 100%; height: 100%; --tx: 0deg; --ty: 0deg; transform-style: preserve-3d; transform: rotateX(var(--tx)) rotateY(var(--ty)); transition: transform .18s ease-out; }
.sb-flip { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform .85s cubic-bezier(.3,1.25,.45,1); }
.sb-slot.is-rev .sb-flip { transform: rotateY(180deg); }
.sb-slot:not(.is-rev).is-mid .sb-flip { animation: sb-wiggle 2.8s ease-in-out infinite; }
@keyframes sb-wiggle { 0%, 70%, 100% { transform: rotateY(0) translateY(0); } 78% { transform: rotateY(-4deg) translateY(-6px); } 88% { transform: rotateY(4deg) translateY(-3px); } }
.sb-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 22px; overflow: hidden; box-shadow: 0 22px 36px -16px rgba(0,0,0,.55); }
.sb-back > * { display: block; width: 100%; height: 100%; }
.sb-front { transform: rotateY(180deg); }
.sb-front > .mh-card, .sb-front > div:first-child { width: 100%; height: 100%; }
.sb-slot.is-rev.is-mid .sb-face.sb-front { box-shadow: 0 0 0 1px color-mix(in srgb, var(--rc) 60%, transparent), 0 0 30px -4px var(--rc), 0 22px 36px -16px rgba(0,0,0,.55); }
.sb-slot.is-rev.is-mid.r-rara .sb-face.sb-front { box-shadow: 0 0 0 2px var(--rc), 0 0 40px 2px color-mix(in srgb, var(--rc) 55%, transparent), 0 22px 36px -16px rgba(0,0,0,.55); }
.sb-slot.is-rev.is-mid.r-legendaria .sb-face.sb-front { box-shadow: 0 0 0 2px var(--rc), 0 0 44px 4px color-mix(in srgb, var(--rc) 60%, transparent), 0 22px 36px -16px rgba(0,0,0,.55); }
.sb-slot.is-rev.is-mid.r-salvaje .sb-face.sb-front { box-shadow: 0 0 0 2px #ff8fc2, 0 0 46px 6px rgba(255,95,162,.55), 0 22px 36px -16px rgba(0,0,0,.55); }
.sb-shine { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; mix-blend-mode: color-dodge; opacity: .5; background: linear-gradient(115deg, transparent 20%, rgba(255,120,220,.55) 36%, rgba(110,255,235,.55) 48%, rgba(255,245,120,.5) 60%, transparent 76%); background-size: 260% 100%; animation: sb-shine 3.6s ease-in-out infinite alternate; }
.sb-slot.r-rara .sb-shine { opacity: .3; }
@keyframes sb-shine { from { background-position: 0% 0; } to { background-position: 100% 0; } }
.sb-rar { position: absolute; left: 50%; bottom: -34px; transform: translateX(-50%); font: 700 11px 'Inter', system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; padding: 5px 12px; border-radius: 99px; color: #fff; background: var(--rc); box-shadow: 0 4px 14px -4px var(--rc); animation: sb-pop .5s cubic-bezier(.2,.9,.3,1.3) both; white-space: nowrap; }
.sb-slot.r-comun .sb-rar { color: #fff; }

/* Efectos al descubrir */
.sb-fx { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; z-index: 6; transform: translateZ(60px); }
.sb-ring { position: absolute; left: -160px; top: -160px; width: 320px; height: 320px; border-radius: 50%; border: 3px solid var(--rc); box-shadow: 0 0 30px 6px var(--rc), inset 0 0 30px 2px var(--rc); animation: sb-ring .9s ease-out both; }
@keyframes sb-ring { from { transform: scale(.3); opacity: 1; } to { transform: scale(2.1); opacity: 0; } }
.sb-fx b { position: absolute; left: -3px; top: -3px; width: 6px; height: 6px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px 3px var(--rc); animation: sb-spark 1.1s cubic-bezier(.2,.8,.3,1) .1s both; }
.sb-fx.r-salvaje b, .sb-fx.r-legendaria b { width: 9px; height: 9px; left: -4px; top: -4px; }
.sb-rays { position: absolute; left: -330px; top: -330px; width: 660px; height: 660px; border-radius: 50%; animation: sb-rays 2.4s ease-out both;
  background: repeating-conic-gradient(from 0deg, rgba(255,255,255,0) 0 7deg, var(--rc) 7deg 9deg, rgba(255,255,255,0) 9deg 18deg); -webkit-mask-image: radial-gradient(circle, #000 0%, transparent 70%); mask-image: radial-gradient(circle, #000 0%, transparent 70%); }
html:not([data-mh-theme="light"]) .sb-rays { mix-blend-mode: screen; }
@keyframes sb-rays { 0% { transform: rotate(0) scale(.3); opacity: 0; } 20% { opacity: .9; } 100% { transform: rotate(70deg) scale(1.15); opacity: 0; } }
.sb-banner { position: absolute; left: 50%; top: -28px; transform: translate(-50%, 0) translateZ(80px); white-space: nowrap; font: 700 13px 'Inter', system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; padding: 7px 16px; border-radius: 99px; color: #fff; background: var(--rc); box-shadow: 0 6px 24px -4px var(--rc); animation: sb-banner 2.8s ease-out both; z-index: 8; pointer-events: none; }
.sb-slot.r-salvaje .sb-banner { background: linear-gradient(90deg, #ff5fa2, #a98bff, #4fd8ff); }
.sb-slot.r-legendaria .sb-banner { color: #3a2606; }
@keyframes sb-banner { 0% { opacity: 0; transform: translate(-50%, 18px) translateZ(80px) scale(.7); } 12% { opacity: 1; transform: translate(-50%, -4px) translateZ(80px) scale(1.08); } 20% { transform: translate(-50%, 0) translateZ(80px) scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -14px) translateZ(80px); } }

/* Controles */
.sb-ctl { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; margin-top: 8px; }
.sb-nav { appearance: none; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--mh-line); background: color-mix(in srgb, var(--mh-ink) 7%, transparent); color: var(--mh-ink); display: grid; place-items: center; cursor: pointer; transition: background .15s, transform .15s; }
.sb-nav:hover:not(:disabled) { background: color-mix(in srgb, var(--mh-ink) 14%, transparent); transform: scale(1.06); } .sb-nav:disabled { opacity: .3; cursor: default; }
.sb-dots { display: flex; gap: 9px; }
.sb-dots button { appearance: none; width: 11px; height: 11px; border-radius: 50%; padding: 0; border: 1.5px solid color-mix(in srgb, var(--mh-ink) 45%, transparent); background: transparent; cursor: pointer; transition: transform .2s, background .2s; }
.sb-dots button.is-on { transform: scale(1.35); border-color: var(--mh-ink); }
.sb-dots button.is-rev { background: #9A91AD; border-color: #9A91AD; }
.sb-dots button.is-rev.r-poco { background: #6FBF73; border-color: #6FBF73; } .sb-dots button.is-rev.r-rara { background: #A58BE8; border-color: #A58BE8; box-shadow: 0 0 8px #A58BE8; }
.sb-dots button.is-rev.r-legendaria { background: #E8C547; border-color: #E8C547; box-shadow: 0 0 10px #E8C547; } .sb-dots button.is-rev.r-salvaje { background: #ff5fa2; border-color: #ffb0d4; box-shadow: 0 0 10px #ff5fa2; }
.sb-acts { display: flex; gap: 10px; margin: 0 0 12px; min-height: 40px; flex-wrap: wrap; justify-content: center; padding: 0 12px; }

/* Resumen */
.sb-sum-row { flex: 1; display: flex; flex-wrap: wrap; gap: 22px 14px; align-items: center; justify-content: center; padding: 8px 16px; overflow: auto; width: 100%; }
.sb-mini-card { position: relative; width: calc(300px * var(--s) * .62); height: calc(420px * var(--s) * .62); border-radius: calc(22px * var(--s) * .62); animation: sb-pop .5s cubic-bezier(.2,.9,.3,1.2) both; box-shadow: 0 0 22px -6px var(--rc); }
.sb-mini-card.r-rara, .sb-mini-card.r-legendaria, .sb-mini-card.r-salvaje { box-shadow: 0 0 0 2px var(--rc), 0 0 30px 2px color-mix(in srgb, var(--rc) 55%, transparent); }
.sb-mini-card-in { width: 300px; height: 420px; transform: scale(calc(var(--s) * .62)); transform-origin: 0 0; border-radius: 22px; overflow: hidden; }
.sb-mini-rar { position: absolute; left: 50%; bottom: -12px; transform: translateX(-50%); font: 700 9.5px 'Inter', system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; padding: 3px 9px; border-radius: 99px; color: #fff; background: var(--rc); white-space: nowrap; }
@keyframes sb-pop { from { transform: translateY(26px) scale(.8); opacity: 0; } }

@media (max-width: 819px) { .sb-root { height: calc(100dvh - 190px); min-height: 480px; } .sb-stage { border-radius: 20px; } .sb-count { font-size: 11.5px; } .sb-stats span { padding: 4px 9px; font-size: 11.5px; } .sb-shelf { padding-top: 48px; } }
@media (prefers-reduced-motion: reduce) {
  .sb-pack, .sb-mini, .sb-mini-in, .sb-bgfx i, .sb-grip, .sb-slot:not(.is-rev).is-mid .sb-flip, .sb-shine { animation: none !important; }
  .sb-flip { transition-duration: .01s; } .sb-slot { transition-duration: .01s; animation-duration: .01s; }
}
`;
