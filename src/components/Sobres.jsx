"use client";
// Pestaña «Sobres» (prueba): sobres de cartas brillantes que se abren deslizando la parte de arriba y cuyas cartas se descubren una a una.
// Las cartas salen del catálogo de la pestaña Cartas; las Salvajes son las más raras.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Package, RotateCcw, Sparkles } from "lucide-react";
import { CardFace } from "./Cards";
import { CardBack } from "./CardBacks";

const PACK_SIZE = 5;
// Probabilidad de cada tipo de carta (la Salvaje aparte, es la rara).
const WEIGHTS = { dominio: 46, subclase: 12, ascendencia: 8, comunidad: 8, transformacion: 4, forma: 8, arma: 9, armadura: 5, adversario: 3, entorno: 2 };
const WILD_NORMAL = 0.03; // por carta
const WILD_LAST = 0.18; // la última carta es la «rara» del sobre

const THEMES = [
  { key: "oro", name: "Sobre Dorado", c1: "#FFE9A6", c2: "#D9A93A", c3: "#8A5A12", glow: "#FFD36A" },
  { key: "amatista", name: "Sobre Amatista", c1: "#E6DAFF", c2: "#9B7BE0", c3: "#432B86", glow: "#B79CFF" },
  { key: "esmeralda", name: "Sobre Esmeralda", c1: "#C9F7DF", c2: "#43B98A", c3: "#115A40", glow: "#7DF0B8" },
];

const rnd = (n) => Math.floor(Math.random() * n);
function draw(items) {
  const by = {};
  items.forEach((c) => (by[c.kind] ||= []).push(c));
  const wild = by.salvaje || [];
  const kinds = Object.keys(WEIGHTS).filter((k) => by[k]?.length);
  const total = kinds.reduce((s, k) => s + WEIGHTS[k], 0);
  const one = (rare) => {
    if (wild.length && Math.random() < (rare ? WILD_LAST : WILD_NORMAL)) return wild[rnd(wild.length)];
    let r = Math.random() * total;
    for (const k of kinds) {
      r -= WEIGHTS[k];
      if (r <= 0) return by[k][rnd(by[k].length)];
    }
    return by[kinds[0]][0];
  };
  const out = [];
  let guard = 0;
  while (out.length < PACK_SIZE && guard++ < 200) {
    const c = one(out.length === PACK_SIZE - 1);
    if (!out.some((x) => x.id === c.id)) out.push(c);
  }
  // Lo más raro, al final.
  const rank = (c) => (c.kind === "salvaje" ? 2 : c.kind === "arma" && c.tier === 4 ? 1 : 0);
  return out.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
}
const rarityOf = (c) => (c.kind === "salvaje" ? "salvaje" : c.kind === "arma" && c.tier === 4 ? "legendaria" : "comun");

// Borde dentado (como el cierre de un sobre real): puntos de un polígono para una línea horizontal a la altura y (en %).
function teeth(y, amp, n, rev) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([(i / n) * 100, y + (i % 2 ? amp : 0)]);
  return rev ? pts.reverse() : pts;
}
const poly = (pts) => "polygon(" + pts.map(([x, y]) => x.toFixed(2) + "% " + y.toFixed(2) + "%").join(",") + ")";
const TEAR = 15; // % de altura donde está la línea de rasgado
const TOP_CLIP = poly([...teeth(0.6, 0.9, 40), ...teeth(TEAR, 1.5, 24, true)]);
const BODY_CLIP = poly([...teeth(TEAR, 1.5, 24), ...teeth(99.2, -0.9, 40, true)]);

function PackArt({ t }) {
  return (
    <div className="sb-art">
      <div className="sb-crimp is-top" />
      <div className="sb-crimp is-bot" />
      <svg className="sb-emb" viewBox="0 0 200 320" aria-hidden="true">
        <defs>
          <linearGradient id={"sbg" + t.key} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".45" />
            <stop offset="1" stopColor="#fff" stopOpacity=".8" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="150" r="66" fill="none" stroke={"url(#sbg" + t.key + ")"} strokeWidth="3" />
        <circle cx="100" cy="150" r="76" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="1" strokeDasharray="2 6" />
        <path d="M100 82 C104 120 112 134 150 150 C112 166 104 180 100 218 C96 180 88 166 50 150 C88 134 96 120 100 82 Z" fill={"url(#sbg" + t.key + ")"} />
        <text x="100" y="262" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="26" letterSpacing="7" fill="#fff" fillOpacity=".95">ENARIS</text>
        <text x="100" y="284" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="9" letterSpacing="3.5" fill="#fff" fillOpacity=".8">SOBRE DE CARTAS</text>
        <text x="100" y="62" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="9" letterSpacing="3" fill="#fff" fillOpacity=".75">{PACK_SIZE} CARTAS</text>
      </svg>
      <div className="sb-foil" />
      <div className="sb-rain" />
      <div className="sb-streak" />
    </div>
  );
}

export function SobresPage({ items, icons, FitTitle, FitBox, back }) {
  const [stage, setStage] = useState("shelf"); // shelf | pack | opening | cards | sum
  const [theme, setTheme] = useState(THEMES[0]);
  const [cards, setCards] = useState([]);
  const [rev, setRev] = useState([]);
  const [idx, setIdx] = useState(0);
  const [p, setP] = useState(0); // progreso del rasgado (0–1)
  const [drag, setDrag] = useState(false);
  const [fx, setFx] = useState(null); // { n, rarity, i }
  const [shake, setShake] = useState(false);
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

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setDims({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  const cs = Math.max(0.42, Math.min(1.08, (dims.h - 170) / 420, (dims.w - 30) / 330));
  const ps = Math.max(0.5, Math.min(1.2, (dims.h - 130) / 400, (dims.w - 40) / 270));

  const Icon = (c) => c.Icon || icons?.[c.domain] || Sparkles;

  // ---- Sobre ----
  const choose = (t) => {
    setTheme(t);
    setP(0);
    setStage("pack");
  };
  const openPack = () => {
    if (stage !== "pack") return;
    setDrag(false);
    setP(1);
    setCards(draw(items));
    setRev([]);
    setIdx(0);
    setFx(null);
    setStage("opening");
    later(() => setStage("cards"), 1250);
  };
  const onTearDown = (e) => {
    if (stage !== "pack") return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
    setDrag(true);
  };
  const onTearMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const w = (packRef.current?.offsetWidth || 260) * 0.78;
    setP(Math.max(0, Math.min(1, Math.max(Math.abs(e.clientX - d.x), (d.y - e.clientY) * 0.9) / w)));
  };
  const onTearUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDrag(false);
    if (p >= 0.78) openPack();
    else setP(0);
  };
  // Reflejo del brillo según el puntero + ligera inclinación 3D.
  const onPackMove = (e) => {
    const el = packRef.current;
    if (!el || stage !== "pack") return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    el.classList.add("is-hov");
    el.style.setProperty("--sweep", String(Math.round(x * 100)));
    el.style.setProperty("--rx", ((0.5 - y) * 14).toFixed(2) + "deg");
    el.style.setProperty("--ry", ((x - 0.5) * 18).toFixed(2) + "deg");
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
    if (rev[i]) return;
    const c = cards[i];
    const r = rarityOf(c);
    setRev((cur) => {
      const n = [...cur];
      n[i] = true;
      return n;
    });
    setFx({ n: Date.now(), rarity: r, i, color: c.color });
    if (r === "salvaje") {
      setShake(true);
      later(() => setShake(false), 650);
      setStats((s) => ({ ...s, wild: s.wild + 1 }));
    }
    later(() => setFx((f) => (f && f.i === i ? null : f)), r === "comun" ? 1500 : 2800);
  };
  const revealAll = () => {
    cards.forEach((c, i) => later(() => flip(i), i * 260));
  };
  const allRev = cards.length > 0 && cards.every((_, i) => rev[i]);
  useEffect(() => {
    if (stage === "cards" && allRev) setStats((s) => ({ ...s, packs: s.packs + 1 }));
  }, [allRev]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
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
    swipe.current = { x: e.clientX, id: e.pointerId };
    moved.current = false;
  };
  const onCarMove = (e) => {
    const s = swipe.current;
    if (!s) return;
    if (Math.abs(e.clientX - s.x) > 10) moved.current = true;
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
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--tx", ((0.5 - y) * 10).toFixed(2) + "deg");
    el.style.setProperty("--ty", ((x - 0.5) * 12).toFixed(2) + "deg");
  };
  const untilt = (e) => {
    e.currentTarget.style.setProperty("--tx", "0deg");
    e.currentTarget.style.setProperty("--ty", "0deg");
  };
  const again = () => {
    setStage("shelf");
    setCards([]);
    setRev([]);
    setP(0);
    setFx(null);
  };

  const tearStyle = {
    transform: stage === "opening" ? undefined : `translate(${p * 10}px, ${-p * 14}px) rotate(${-p * 9}deg)`,
    transition: drag || stage === "opening" ? "none" : "transform .35s cubic-bezier(.3,1.4,.5,1)",
  };

  return (
    <div className="sb-root">
      <style>{CSS}</style>
      <div className="sb-head">
        <div>
          <h1 className="mh-serif">Sobres</h1>
          <p>Abre sobres de cartas: desliza la parte de arriba, descubre las cartas una a una y busca las Salvajes, las más raras.</p>
        </div>
        <div className="sb-stats" aria-label="Estadísticas">
          <span><b>{stats.packs}</b> {stats.packs === 1 ? "sobre abierto" : "sobres abiertos"}</span>
          <span><b>{stats.wild}</b> {stats.wild === 1 ? "Salvaje" : "Salvajes"}</span>
          <em>Prueba</em>
        </div>
      </div>

      <div className={"sb-stage" + (shake ? " is-shake" : "") + " is-" + stage} ref={wrapRef} style={{ "--s": cs, "--ps": ps, "--glow": theme.glow }}>
        <div className="sb-bgfx" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: ((i * 73) % 100) + "%", animationDelay: (i % 7) * -1.3 + "s", animationDuration: 9 + (i % 5) * 2 + "s" }} />)}
        </div>

        {stage === "shelf" && (
          <div className="sb-shelf">
            <p className="sb-shelf-t">Elige un sobre</p>
            <div className="sb-shelf-row">
              {THEMES.map((t, i) => (
                <button key={t.key} type="button" className="sb-mini" style={{ "--c1": t.c1, "--c2": t.c2, "--c3": t.c3, animationDelay: i * -0.9 + "s" }} onClick={() => choose(t)} aria-label={"Abrir " + t.name}>
                  <div className="sb-mini-in">
                    <div className="sb-pack-body" style={{ clipPath: "none", position: "relative", width: "100%", height: "100%" }}><PackArt t={t} /></div>
                  </div>
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(stage === "pack" || stage === "opening") && (
          <div className="sb-packwrap">
            <button type="button" className="sb-backbtn" onClick={again} disabled={stage === "opening"}><ChevronLeft size={15} /> Cambiar sobre</button>
            <div
              ref={packRef}
              className={"sb-pack" + (stage === "opening" ? " is-opening" : "") + (drag ? " is-drag" : "")}
              style={{ "--c1": theme.c1, "--c2": theme.c2, "--c3": theme.c3, "--glow": theme.glow, "--p": p }}
              onPointerMove={onPackMove}
              onPointerLeave={onPackLeave}
            >
              <div className="sb-inner" style={{ opacity: Math.min(1, p * 1.4) }} />
              <div className="sb-body" style={{ clipPath: BODY_CLIP }}><PackArt t={theme} /></div>
              <div
                className="sb-top"
                style={{ clipPath: TOP_CLIP, ...tearStyle }}
                role="button"
                tabIndex={0}
                aria-label="Abrir el sobre: desliza la parte de arriba o pulsa Intro"
                onPointerDown={onTearDown}
                onPointerMove={onTearMove}
                onPointerUp={onTearUp}
                onPointerCancel={onTearUp}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openPack())}
              >
                <PackArt t={theme} />
              </div>
              <div className="sb-tearline" style={{ opacity: 1 - p }} aria-hidden="true" />
              {stage === "opening" && (
                <div className="sb-burst" aria-hidden="true">
                  <i className="sb-flash" />
                  {Array.from({ length: 16 }, (_, i) => <b key={i} style={{ "--a": i * 22.5 + "deg", "--d": 150 + (i % 3) * 50 + "px", animationDelay: (i % 4) * 0.03 + "s" }} />)}
                </div>
              )}
            </div>
            <div className="sb-hint" style={{ opacity: stage === "opening" ? 0 : 1 - p * 0.8 }}>
              <span className="sb-arrow">←</span> Desliza la parte de arriba para abrirlo <span className="sb-arrow">→</span>
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
                const r = rarityOf(c);
                const showFx = fx && fx.i === i;
                return (
                  <div
                    key={c.id}
                    className={"sb-slot" + (a > 2 ? " is-far" : "") + (o === 0 ? " is-mid" : "") + (rev[i] ? " is-rev" : "") + " r-" + r}
                    style={{ "--o": o, "--a": a, zIndex: 20 - a, animationDelay: i * 0.11 + "s", "--rc": r === "salvaje" ? "#FF5FA2" : r === "legendaria" ? "#F6D675" : c.color || "#C9A24A" }}
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
                          {rev[i] && r !== "comun" && <div className="sb-shine" />}
                        </div>
                      </div>
                    </div>
                    {showFx && (
                      <div className={"sb-fx r-" + r} key={fx.n} aria-hidden="true">
                        <i className="sb-ring" />
                        {r !== "comun" && <i className="sb-rays" />}
                        {Array.from({ length: r === "salvaje" ? 22 : r === "legendaria" ? 12 : 6 }, (_, k) => (
                          <b key={k} style={{ "--a": k * (360 / (r === "salvaje" ? 22 : r === "legendaria" ? 12 : 6)) + "deg", "--d": 120 + ((k * 37) % 90) + "px", animationDelay: (k % 5) * 0.04 + "s" }} />
                        ))}
                      </div>
                    )}
                    {showFx && r !== "comun" && <div className="sb-banner">{r === "salvaje" ? "✦ Carta Salvaje ✦" : "Legendaria"}</div>}
                  </div>
                );
              })}
            </div>
            <div className="sb-ctl">
              <button type="button" className="sb-nav" onClick={() => go((n) => n - 1)} disabled={idx === 0} aria-label="Carta anterior"><ChevronLeft size={20} /></button>
              <div className="sb-dots" role="tablist" aria-label="Cartas del sobre">
                {cards.map((c, i) => (
                  <button key={c.id} type="button" role="tab" aria-selected={i === idx} className={(i === idx ? "is-on " : "") + (rev[i] ? "is-rev r-" + rarityOf(c) : "")} onClick={() => go(i)} aria-label={"Carta " + (i + 1)} />
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
            <div className="sb-count">Tu sobre</div>
            <div className="sb-sum-row">
              {cards.map((c, i) => {
                const r = rarityOf(c);
                return (
                  <div key={c.id} className={"sb-mini-card r-" + r} style={{ animationDelay: i * 0.08 + "s", "--rc": r === "salvaje" ? "#FF5FA2" : r === "legendaria" ? "#F6D675" : c.color || "#C9A24A" }}>
                    <div className="sb-mini-card-in"><CardFace c={c} I={Icon(c)} FitTitle={FitTitle} FitBox={FitBox} /></div>
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
.sb-root { display: flex; flex-direction: column; gap: 14px; height: calc(100dvh - 150px); min-height: 640px; }
.sb-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.sb-head h1 { margin: 0; font-size: 30px; color: var(--mh-ink); }
.sb-head p { margin: 4px 0 0; color: var(--mh-muted); font-size: 14px; max-width: 560px; line-height: 1.4; }
.sb-stats { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12.5px; color: var(--mh-muted); }
.sb-stats span { padding: 6px 11px; border-radius: 99px; border: 1px solid var(--mh-line); background: color-mix(in srgb, var(--mh-ink) 4%, transparent); }
.sb-stats b { color: var(--mh-ink); }
.sb-stats em { font-style: normal; font-weight: 700; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; padding: 4px 9px; border-radius: 99px; background: color-mix(in srgb, #E8C547 22%, transparent); color: #C9A24A; }

.sb-stage { position: relative; flex: 1; min-height: 440px; border-radius: 26px; overflow: hidden; color: #F2EEFA;
  background: radial-gradient(90% 70% at 50% 38%, color-mix(in srgb, var(--glow) 20%, #1a1530) 0%, #120f22 55%, #0a0814 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.07), 0 24px 50px -28px #000; isolation: isolate; user-select: none; -webkit-user-select: none; }
.sb-stage.is-shake { animation: sb-shake .6s cubic-bezier(.36,.07,.19,.97); }
@keyframes sb-shake { 10%, 90% { translate: -2px 0; } 20%, 80% { translate: 4px 1px; } 30%, 50%, 70% { translate: -7px -1px; } 40%, 60% { translate: 7px 1px; } }
.sb-bgfx { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.sb-bgfx i { position: absolute; bottom: -10px; width: 4px; height: 4px; border-radius: 50%; background: var(--glow); box-shadow: 0 0 10px 2px var(--glow); opacity: 0; animation: sb-float linear infinite; }
@keyframes sb-float { 0% { transform: translateY(0) scale(.6); opacity: 0; } 15% { opacity: .7; } 100% { transform: translateY(-640px) scale(1.2); opacity: 0; } }

/* Estantería */
.sb-shelf { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; padding: 20px; }
.sb-shelf-t { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: rgba(242,238,250,.7); }
.sb-shelf-row { display: flex; gap: clamp(14px, 4vw, 44px); flex-wrap: wrap; justify-content: center; }
.sb-mini { appearance: none; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 12px; animation: sb-bob 5s ease-in-out infinite; transition: transform .25s; }
.sb-mini:hover { transform: translateY(-8px) scale(1.04); } .sb-mini:focus-visible { outline: 2px solid var(--c1); outline-offset: 6px; border-radius: 12px; }
.sb-mini-in { position: relative; width: clamp(112px, 18vw, 168px); aspect-ratio: 13 / 20; filter: drop-shadow(0 16px 20px rgba(0,0,0,.5)); }
.sb-mini span { font-size: 13px; font-weight: 600; letter-spacing: .03em; color: rgba(242,238,250,.9); }
@keyframes sb-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -8px; } }

/* Sobre grande */
.sb-packwrap { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; animation: sb-zoom .55s cubic-bezier(.2,.9,.3,1.15) both; }
@keyframes sb-zoom { from { opacity: 0; transform: scale(.55) translateY(30px); } to { opacity: 1; transform: none; } }
.sb-backbtn { position: absolute; top: 14px; left: 14px; appearance: none; display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 12.5px; color: rgba(242,238,250,.8); background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); padding: 7px 12px 7px 8px; border-radius: 99px; cursor: pointer; }
.sb-backbtn:hover:not(:disabled) { background: rgba(255,255,255,.14); } .sb-backbtn:disabled { opacity: .4; cursor: default; }
.sb-pack { position: relative; width: calc(260px * var(--ps)); height: calc(400px * var(--ps)); --rx: 0deg; --ry: 0deg; transform: perspective(1000px) rotateX(var(--rx)) rotateY(var(--ry)); transition: transform .2s ease-out; transform-style: preserve-3d;
  filter: drop-shadow(0 28px 30px rgba(0,0,0,.55)) drop-shadow(0 0 36px color-mix(in srgb, var(--glow) 30%, transparent)); animation: sb-sweep 4.8s linear infinite, sb-bob 6s ease-in-out infinite; }
.sb-pack.is-hov, .sb-pack.is-drag { animation: sb-bob 6s ease-in-out infinite; }
@keyframes sb-sweep { from { --sweep: -35; } to { --sweep: 135; } }
.sb-body, .sb-top { position: absolute; inset: 0; }
.sb-top { cursor: grab; transform-origin: 0% 100%; touch-action: none; will-change: transform; } .sb-top:active { cursor: grabbing; }
.sb-top:focus-visible { outline: none; filter: brightness(1.15); }
.sb-inner { position: absolute; left: 3%; right: 3%; top: calc(${TEAR}% - 5%); height: 12%; background: radial-gradient(60% 100% at 50% 50%, #fff7d6, var(--glow) 40%, transparent 75%); filter: blur(6px); }
.sb-tearline { position: absolute; left: 4%; right: 4%; top: ${TEAR + 0.6}%; height: 0; border-top: 2px dashed rgba(255,255,255,.55); pointer-events: none; animation: sb-dash 1.2s linear infinite; }
@keyframes sb-dash { to { opacity: .35; } }
.sb-hint { font-size: 13px; font-weight: 600; letter-spacing: .04em; color: rgba(242,238,250,.85); transition: opacity .3s; display: flex; gap: 10px; align-items: center; text-align: center; padding: 0 16px; }
.sb-arrow { display: inline-block; animation: sb-nudge 1.4s ease-in-out infinite; } .sb-arrow:first-child { animation-direction: reverse; }
@keyframes sb-nudge { 0%, 100% { transform: translateX(-4px); } 50% { transform: translateX(5px); } }

/* Arte del sobre: metal brillante con holografía */
.sb-art { position: absolute; inset: 0; overflow: hidden; border-radius: 10px;
  background: radial-gradient(130% 55% at 50% 0%, rgba(255,255,255,.7), transparent 60%), radial-gradient(90% 40% at 20% 100%, rgba(255,255,255,.25), transparent 70%), linear-gradient(158deg, var(--c1) 0%, var(--c2) 52%, var(--c3) 100%); }
.sb-art::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 2px rgba(255,255,255,.4), inset 0 0 36px rgba(0,0,0,.28); pointer-events: none; }
.sb-crimp { position: absolute; left: 0; right: 0; height: 6.5%; background: repeating-linear-gradient(90deg, rgba(255,255,255,.28) 0 2px, rgba(0,0,0,.18) 2px 3px, transparent 3px 7px); }
.sb-crimp.is-top { top: 0; border-bottom: 1px solid rgba(0,0,0,.2); } .sb-crimp.is-bot { bottom: 0; border-top: 1px solid rgba(0,0,0,.2); }
.sb-emb { position: absolute; inset: 0; width: 100%; height: 100%; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
.sb-foil { position: absolute; inset: 0; mix-blend-mode: color-dodge; opacity: .8;
  background: linear-gradient(112deg, transparent calc(var(--sweep) * 1% - 34%), rgba(255,60,210,.55) calc(var(--sweep) * 1% - 16%), rgba(60,255,230,.6) calc(var(--sweep) * 1% - 2%), rgba(255,240,90,.55) calc(var(--sweep) * 1% + 14%), transparent calc(var(--sweep) * 1% + 32%)); }
.sb-rain { position: absolute; inset: 0; mix-blend-mode: overlay; opacity: .55; background: repeating-linear-gradient(115deg, rgba(255,255,255,0) 0 14px, rgba(255,255,255,.22) 14px 15px), conic-gradient(from calc(var(--sweep) * 2deg) at 50% 45%, #ff7ad9, #7affef, #fff47a, #a98bff, #ff7ad9); }
.sb-streak { position: absolute; top: -10%; bottom: -10%; width: 16%; left: calc(var(--sweep) * 1% - 8%); transform: skewX(-18deg); background: linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent); mix-blend-mode: soft-light; filter: blur(1px); }
.sb-mini .sb-art, .sb-mini-in .sb-pack-body { position: absolute; inset: 0; }
.sb-mini .sb-art { animation: none; }
.sb-mini-in { animation: sb-sweep 4.8s linear infinite; }

/* Apertura */
.sb-pack.is-opening .sb-top { animation: sb-fly 1s cubic-bezier(.3,.1,.3,1) forwards; }
@keyframes sb-fly { 0% { transform: translate(10px, -14px) rotate(-9deg); } 100% { transform: translate(-40px, -420px) rotate(-38deg); opacity: 0; } }
.sb-pack.is-opening .sb-body { animation: sb-drop 1.05s cubic-bezier(.4,0,.6,1) .25s forwards; }
@keyframes sb-drop { 0% { transform: none; opacity: 1; } 55% { transform: translateY(-14px) scale(1.03); opacity: 1; } 100% { transform: translateY(80px) scale(.82); opacity: 0; } }
.sb-pack.is-opening .sb-inner { animation: sb-light 1.2s ease-out forwards; }
@keyframes sb-light { 0% { opacity: .6; transform: scaleY(1); } 40% { opacity: 1; transform: scale(1.6, 6); } 100% { opacity: 0; transform: scale(2.4, 10); } }
.sb-burst { position: absolute; left: 50%; top: ${TEAR}%; width: 0; height: 0; pointer-events: none; }
.sb-flash { position: absolute; left: -150px; top: -150px; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, #fff 0%, var(--glow) 28%, transparent 68%); animation: sb-flash .9s ease-out both; mix-blend-mode: screen; }
@keyframes sb-flash { 0% { transform: scale(.1); opacity: 0; } 25% { opacity: 1; } 100% { transform: scale(5); opacity: 0; } }
.sb-burst b { position: absolute; left: -3px; top: -3px; width: 6px; height: 6px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px 3px var(--glow); animation: sb-spark 1s cubic-bezier(.2,.8,.3,1) .1s both; }
@keyframes sb-spark { 0% { transform: rotate(var(--a)) translateX(0) scale(1); opacity: 1; } 100% { transform: rotate(var(--a)) translateX(var(--d)) scale(.2); opacity: 0; } }

/* Carrusel de cartas */
.sb-cardsstage, .sb-sum { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; }
.sb-count { margin-top: 16px; font-size: 12.5px; letter-spacing: .06em; font-weight: 600; color: rgba(242,238,250,.8); text-align: center; padding: 0 14px; min-height: 18px; }
.sb-car { position: relative; flex: 1; width: 100%; perspective: 1500px; touch-action: pan-y; cursor: grab; }
.sb-slot { position: absolute; left: 50%; top: 50%; width: 300px; height: 420px; margin: -210px 0 0 -150px; transform-style: preserve-3d;
  transform: translateX(calc(var(--o) * 236px * var(--s))) scale(calc(var(--s) * (1 - var(--a) * .16))) rotateY(calc(var(--o) * -26deg));
  transition: transform .6s cubic-bezier(.2,.8,.2,1), opacity .4s, filter .4s; filter: brightness(calc(1 - var(--a) * .26)); cursor: pointer;
  animation: sb-deal .85s cubic-bezier(.2,.9,.3,1.1) backwards; }
@keyframes sb-deal { from { transform: translateX(0) translateY(calc(230px * var(--s))) scale(.18) rotateZ(-14deg); opacity: 0; } 30% { opacity: 1; } }
.sb-slot.is-far { opacity: 0; pointer-events: none; }
.sb-slot.is-mid { cursor: pointer; }
.sb-tilt { position: relative; width: 100%; height: 100%; --tx: 0deg; --ty: 0deg; transform-style: preserve-3d; transform: rotateX(var(--tx)) rotateY(var(--ty)); transition: transform .18s ease-out; }
.sb-flip { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform .85s cubic-bezier(.3,1.25,.45,1); }
.sb-slot.is-rev .sb-flip { transform: rotateY(180deg); }
.sb-slot:not(.is-rev).is-mid .sb-flip { animation: sb-wiggle 2.8s ease-in-out infinite; }
@keyframes sb-wiggle { 0%, 70%, 100% { transform: rotateY(0) translateY(0); } 78% { transform: rotateY(-4deg) translateY(-6px); } 88% { transform: rotateY(4deg) translateY(-3px); } }
.sb-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 22px; overflow: hidden; box-shadow: 0 24px 40px -18px #000c; }
.sb-back { transform: rotateY(0); } .sb-back > * { display: block; width: 100%; height: 100%; }
.sb-front { transform: rotateY(180deg); }
.sb-front > .mh-card, .sb-front > div:first-child { width: 100%; height: 100%; }
.sb-slot.is-rev.is-mid.r-salvaje .sb-face.sb-front { box-shadow: 0 0 0 2px #ff8fc2, 0 0 46px 6px rgba(255,95,162,.55), 0 24px 40px -18px #000c; }
.sb-slot.is-rev.is-mid.r-legendaria .sb-face.sb-front { box-shadow: 0 0 0 2px #f6d675, 0 0 40px 4px rgba(246,214,117,.5), 0 24px 40px -18px #000c; }
.sb-slot.is-rev.is-mid.r-comun .sb-face.sb-front { box-shadow: 0 0 0 1px color-mix(in srgb, var(--rc) 60%, transparent), 0 0 30px -4px var(--rc), 0 24px 40px -18px #000c; }
.sb-shine { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; mix-blend-mode: color-dodge; opacity: .55; background: linear-gradient(115deg, transparent 20%, rgba(255,120,220,.55) 36%, rgba(110,255,235,.55) 48%, rgba(255,245,120,.5) 60%, transparent 76%); background-size: 260% 100%; animation: sb-shine 3.6s ease-in-out infinite alternate; }
@keyframes sb-shine { from { background-position: 0% 0; } to { background-position: 100% 0; } }

/* Efectos al descubrir */
.sb-fx { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; z-index: 6; transform: translateZ(60px); }
.sb-ring { position: absolute; left: -160px; top: -160px; width: 320px; height: 320px; border-radius: 50%; border: 3px solid var(--rc); box-shadow: 0 0 30px 6px var(--rc), inset 0 0 30px 2px var(--rc); animation: sb-ring .9s ease-out both; }
@keyframes sb-ring { from { transform: scale(.3); opacity: 1; } to { transform: scale(2.1); opacity: 0; } }
.sb-fx b { position: absolute; left: -3px; top: -3px; width: 6px; height: 6px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px 3px var(--rc); animation: sb-spark 1.1s cubic-bezier(.2,.8,.3,1) .1s both; }
.sb-fx.r-salvaje b { width: 9px; height: 9px; left: -4px; top: -4px; }
.sb-rays { position: absolute; left: -330px; top: -330px; width: 660px; height: 660px; border-radius: 50%; animation: sb-rays 2.4s ease-out both; mix-blend-mode: screen;
  background: repeating-conic-gradient(from 0deg, rgba(255,255,255,.0) 0 7deg, var(--rc) 7deg 9deg, rgba(255,255,255,0) 9deg 18deg); -webkit-mask-image: radial-gradient(circle, #000 0%, transparent 70%); mask-image: radial-gradient(circle, #000 0%, transparent 70%); }
@keyframes sb-rays { 0% { transform: rotate(0) scale(.3); opacity: 0; } 20% { opacity: .9; } 100% { transform: rotate(70deg) scale(1.15); opacity: 0; } }
.sb-banner { position: absolute; left: 50%; top: -28px; transform: translate(-50%, 0) translateZ(80px); white-space: nowrap; font: 700 13px 'Inter', system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; padding: 7px 16px; border-radius: 99px; color: #fff; background: linear-gradient(90deg, #ff5fa2, #a98bff, #4fd8ff); box-shadow: 0 6px 24px -4px rgba(255,95,162,.7); animation: sb-banner 2.8s ease-out both; z-index: 8; pointer-events: none; }
.sb-slot.r-legendaria .sb-banner { background: linear-gradient(90deg, #f6d675, #e8a93a); color: #3a2606; box-shadow: 0 6px 24px -4px rgba(246,214,117,.7); }
@keyframes sb-banner { 0% { opacity: 0; transform: translate(-50%, 18px) translateZ(80px) scale(.7); } 12% { opacity: 1; transform: translate(-50%, -4px) translateZ(80px) scale(1.08); } 20% { transform: translate(-50%, 0) translateZ(80px) scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -14px) translateZ(80px); } }

/* Controles */
.sb-ctl { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
.sb-nav { appearance: none; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); color: #fff; display: grid; place-items: center; cursor: pointer; transition: background .15s, transform .15s; }
.sb-nav:hover:not(:disabled) { background: rgba(255,255,255,.18); transform: scale(1.06); } .sb-nav:disabled { opacity: .3; cursor: default; }
.sb-dots { display: flex; gap: 9px; }
.sb-dots button { appearance: none; width: 11px; height: 11px; border-radius: 50%; padding: 0; border: 1.5px solid rgba(255,255,255,.45); background: transparent; cursor: pointer; transition: transform .2s, background .2s; }
.sb-dots button.is-on { transform: scale(1.35); border-color: #fff; }
.sb-dots button.is-rev { background: rgba(255,255,255,.75); border-color: #fff; } .sb-dots button.is-rev.r-salvaje { background: #ff5fa2; border-color: #ffb0d4; box-shadow: 0 0 10px #ff5fa2; } .sb-dots button.is-rev.r-legendaria { background: #f6d675; border-color: #fff0b8; box-shadow: 0 0 10px #f6d675; }
.sb-acts { display: flex; gap: 10px; margin: 0 0 16px; min-height: 40px; flex-wrap: wrap; justify-content: center; padding: 0 12px; }
.sb-acts .mh-btn-ghost { color: #F2EEFA; border-color: rgba(255,255,255,.22); }

/* Resumen */
.sb-sum-row { flex: 1; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: center; padding: 8px 16px; overflow: auto; width: 100%; }
.sb-mini-card { width: calc(300px * var(--s) * .62); height: calc(420px * var(--s) * .62); border-radius: calc(22px * var(--s) * .62); animation: sb-pop .5s cubic-bezier(.2,.9,.3,1.2) both; box-shadow: 0 0 22px -6px var(--rc); }
.sb-mini-card.r-salvaje { box-shadow: 0 0 0 2px #ff8fc2, 0 0 34px 2px rgba(255,95,162,.6); } .sb-mini-card.r-legendaria { box-shadow: 0 0 0 2px #f6d675, 0 0 30px 2px rgba(246,214,117,.55); }
.sb-mini-card-in { width: 300px; height: 420px; transform: scale(calc(var(--s) * .62)); transform-origin: 0 0; border-radius: 22px; overflow: hidden; }
@keyframes sb-pop { from { transform: translateY(26px) scale(.8); opacity: 0; } }

@media (max-width: 819px) { .sb-head h1 { font-size: 26px; } .sb-stage { border-radius: 20px; } .sb-root { height: calc(100dvh - 250px); min-height: 520px; } .sb-head p { display: none; } .sb-count { font-size: 11.5px; } }
@media (prefers-reduced-motion: reduce) {
  .sb-pack, .sb-mini, .sb-mini-in, .sb-bgfx i, .sb-arrow, .sb-tearline, .sb-slot:not(.is-rev).is-mid .sb-flip, .sb-shine { animation: none !important; }
  .sb-flip { transition-duration: .01s; } .sb-slot { transition-duration: .01s; animation-duration: .01s; }
}
`;
