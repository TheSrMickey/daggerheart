"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Layers, Search, Zap } from "lucide-react";

// Pestaña «Cartas»: todas las cartas del juego (dominio, ascendencia, comunidad, subclase y transformación),
// con filtros y buscador. Al pulsar una carta se ve en grande, con el mismo diseño que en la hoja.
const alpha = (c, a) => (c.startsWith("#") && c.length === 7 ? c + a.toString(16).padStart(2, "0") : c);
const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export const KINDS = [
  { key: "dominio", label: "Dominio", plural: "Cartas de dominio" },
  { key: "ascendencia", label: "Ascendencia", plural: "Ascendencias" },
  { key: "comunidad", label: "Comunidad", plural: "Comunidades" },
  { key: "subclase", label: "Subclase", plural: "Subclases" },
  { key: "transformacion", label: "Transformación", plural: "Transformaciones" },
  { key: "forma", label: "Forma de Bestia", plural: "Formas de Bestia" },
  { key: "arma", label: "Arma", plural: "Armas" },
];
const KIND_COLOR = { dominio: "#C9A24A", ascendencia: "#6FA3C0", comunidad: "#C08B5C", subclase: "#7FB77A", transformacion: "#A58BE8", forma: "#E0A04A", arma: "#C9A24A" };

// La carta, tal cual se ve al abrirla; en la cuadrícula tiene exactamente el mismo tamaño (300 × 420).
function CardFace({ c, I, FitTitle, FitBox, onClose, tilt }) {
  const col = c.color;
  const legend = c.kind === "arma" && c.tier === 4;
  const feats = c.features || [];
  const total = (c.text || "").length + feats.reduce((s, f) => s + (f.name || "").length + (f.text || "").length, 0);
  const modal = !!onClose;
  const dom = c.kind === "dominio";
  // Ascendencias y comunidades usan el mismo diseño que las de dominio, sin cinta de nivel ni coste.
  const gen = c.kind === "ascendencia" || c.kind === "comunidad" || c.kind === "transformacion";
  const sub = c.kind === "subclase"; // cinta con el rango en numeral romano: I Fundación, II Especialización, III Maestría
  const bst = c.kind === "forma"; // cinta con el rango de la forma
  const wpn = c.kind === "arma"; // cinta con el rango del arma (I Común … IV Legendario)
  const roman = ["I", "II", "III", "IV"];
  const bg = dom || gen || sub || bst || wpn;
  return (
    <div
      className={"mh-card mh-cardc" + (modal ? " mh-card-anim" : "") + (modal || legend || bg ? " mh-tilt" : "") + (bg ? " is-bg" : "") + (legend ? " is-legend" : "")}
      style={{ "--glow": alpha(col, 51), "--cc": col, margin: 0, width: modal ? "min(300px, 100%)" : 300, height: modal ? "min(420px, 80vh)" : 420, maxWidth: "100%", padding: 0, overflow: "hidden", borderRadius: 22, display: "flex", flexDirection: "column", border: "2px solid " + col, position: "relative", textAlign: "left" }}
      {...(tilt || {})}
    >
      <div className="mh-glare" />
      {legend && <div className="mh-holo is-idle" />}
      {legend && <div className="mh-legend-sheen" />}
      <div className="mh-cardc-art" style={{ height: total > 600 ? 84 : total > 320 ? 100 : 124, "--ah": (total > 600 ? 84 : total > 320 ? 100 : 124) + "px" }}>
        {c.image ? <img src={c.image} alt={modal ? c.key : ""} /> : <div className="mh-cardc-noart" style={{ color: col }}><I size={50} strokeWidth={1.5} /></div>}
      </div>
      <div className="mh-cardc-badge">
        {dom && <span className="mh-cardc-gem" title={"Nivel " + c.level}>{c.level}<I size={19} strokeWidth={1.8} /></span>}
        {sub && <span className="mh-cardc-gem is-rank" title={c.rankLabel}>{roman[c.rank || 0]}<I size={19} strokeWidth={1.8} /></span>}
        {wpn && <span className="mh-cardc-gem is-rank" title={"Rango " + c.tier}>{roman[(c.tier || 1) - 1]}<I size={19} strokeWidth={1.8} /></span>}
        {bst && <span className="mh-cardc-gem is-rank" title={"Rango " + c.tier}>{roman[(c.tier || 1) - 1]}<I size={19} strokeWidth={1.8} /></span>}
      </div>
      {bg && <span className="mh-cardc-dom">{dom ? c.type : sub ? c.rankLabel : wpn ? c.sub.split(" · ")[1] : bst ? "Forma de Bestia" : c.kind === "transformacion" ? "Transformación" : c.sub}</span>}
      {dom && <span className="mh-cardc-cost" title="Coste de recuperación">{c.recall ?? "—"}<Zap size={12} fill="currentColor" /></span>}
      <div style={{ padding: "0 18px", textAlign: "center", flexShrink: 0, marginTop: bg ? 16 : 8 }}>
        <FitTitle text={c.key} max={19} min={14} className="mh-serif" style={{ fontWeight: 700, color: "var(--mh-ink)", maxHeight: "2.4em", overflow: "hidden" }} />
        <div className="mh-cardc-sub">{c.sub}</div>
        <div className="mh-cardc-orn" />
      </div>
      <FitBox fitKey={c.key + total} max={13} min={8.5} style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "10px 18px 12px", display: "flex", flexDirection: "column", justifyContent: "flex-start", textAlign: feats.length ? "left" : "center", gap: "0.7em", lineHeight: 1.45, color: "var(--mh-ink)" }}>
        {c.text && <div style={{ color: "var(--mh-ink)", textAlign: "center" }}>{c.text}</div>}
        {feats.map((f) => (
          <div key={f.name} style={{ fontSize: "0.95em", lineHeight: 1.4 }}><b style={{ color: "var(--mh-gold-ink)" }}>{f.name}</b>{f.text ? ": " + f.text : ""}</div>
        ))}
      </FitBox>
      {dom && (
        <div className="mh-cardc-sig">
          <span>Dominio {c.domain}</span>
          <span>Nivel {c.level} · Recuperación {c.recall ?? "—"}</span>
        </div>
      )}
      {(gen || sub) && (
        <div className="mh-cardc-sig">
          <span>{c.sub}</span>
          <span>{feats.length} característica{feats.length === 1 ? "" : "s"}</span>
        </div>
      )}
      {wpn && (
        <div className="mh-cardc-sig">
          <span>{c.sub.split(" · ")[0]}</span>
          <span>Rango {c.tier}</span>
        </div>
      )}
      {bst && (
        <div className="mh-cardc-sig">
          <span>Forma de Bestia</span>
          <span>Rango {c.tier}</span>
        </div>
      )}
    </div>
  );
}

// Solo se pinta la carta cuando está cerca de la pantalla: 100 cartas con imágenes a la vez tardaban unos segundos.
function Lazy({ children }) {
  const ref = useRef(null);
  const [on, setOn] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (setOn(true), io.disconnect()), { rootMargin: "700px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return <span ref={ref} className="cx-lz">{on ? children : null}</span>;
}

export function CardsPage({ items, domainColors, icons, FitTitle, FitBox }) {
  const [kinds, setKinds] = useState([]);
  const [sel, setSel] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);
  const [closing, setClosing] = useState(false);
  const rootRef = useRef(null);
  const scRef = useRef(null);
  const [showTop, setShowTop] = useState(false);
  // Contenedor con scroll de la página: sirve para el botón de subir y, en móvil, para centrar la carta.
  useEffect(() => {
    let sc = rootRef.current?.parentElement;
    while (sc && !(/(auto|scroll)/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight)) sc = sc.parentElement;
    if (!sc) return;
    scRef.current = sc;
    const mobile = window.matchMedia("(max-width: 819px)").matches;
    const onScroll = () => setShowTop(sc.scrollTop > 700);
    sc.addEventListener("scroll", onScroll, { passive: true });
    // Móvil: el deslizamiento vertical avanza de carta en carta. El dedo arrastra la lista y, al soltar, se va a la carta
    // anterior o siguiente (nunca queda entre dos) con la carta centrada en la zona visible.
    const stops = () => {
      const bar = rootRef.current?.querySelector(".cx-bars");
      const dock = document.querySelector(".mh-dock");
      const sr = sc.getBoundingClientRect();
      const top = sr.top + (bar ? bar.offsetHeight : 0); // altura con los filtros ya fijos
      const bottom = dock ? Math.min(sr.bottom, dock.getBoundingClientRect().top) : sr.bottom;
      const mid = (top + bottom) / 2;
      const list = [0];
      rootRef.current?.querySelectorAll(".cx-card").forEach((el) => {
        const r = el.getBoundingClientRect();
        list.push(Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, sc.scrollTop + r.top + r.height / 2 - mid)));
      });
      return list;
    };
    let g = null;
    const start = (e) => {
      if (e.touches.length !== 1 || e.target.closest(".cx-bars, .cx-top, .mh-overlay")) return (g = null);
      g = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(), base: sc.scrollTop, dir: 0, last: e.touches[0].clientY, lt: performance.now(), v: 0 };
    };
    const move = (e) => {
      if (!g) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      if (!g.dir) {
        if (Math.abs(x - g.x) < 6 && Math.abs(y - g.y) < 6) return;
        if (Math.abs(x - g.x) > Math.abs(y - g.y)) return (g = null);
        g.dir = 1;
        sc.style.scrollBehavior = "auto";
      }
      e.preventDefault();
      const now = performance.now();
      g.v = (g.last - y) / Math.max(1, now - g.lt);
      g.last = y;
      g.lt = now;
      sc.scrollTop = g.base + (g.y - y);
    };
    const end = () => {
      if (!g || !g.dir) return (g = null);
      const list = stops();
      const cur = sc.scrollTop;
      const moved = g.y - g.last; // >0: el dedo subió (se avanza)
      let idx = 0;
      let bd = Infinity;
      list.forEach((s, i) => {
        const d = Math.abs(s - g.base);
        if (d < bd) {
          bd = d;
          idx = i;
        }
      });
      // Posición de partida = parada más cercana al inicio del gesto; con un gesto claro se mueve una carta.
      const fast = Math.abs(g.v) > 0.35 && Math.abs(moved) > 12;
      let to = idx;
      if (Math.abs(moved) > 50 || fast) to = idx + (moved > 0 || (fast && g.v > 0) ? 1 : -1);
      to = Math.max(0, Math.min(list.length - 1, to));
      g = null;
      sc.style.scrollBehavior = "";
      sc.scrollTo({ top: list[to], behavior: "smooth" });
    };
    if (mobile) {
      sc.addEventListener("touchstart", start, { passive: true });
      sc.addEventListener("touchmove", move, { passive: false });
      sc.addEventListener("touchend", end, { passive: true });
      sc.addEventListener("touchcancel", end, { passive: true });
    }
    return () => {
      sc.removeEventListener("scroll", onScroll);
      sc.removeEventListener("touchstart", start);
      sc.removeEventListener("touchmove", move);
      sc.removeEventListener("touchend", end);
      sc.removeEventListener("touchcancel", end);
      sc.style.scrollBehavior = "";
    };
  }, []);
  const domains = useMemo(() => [...Object.keys(domainColors).filter((d) => d !== "Sangre"), ...(domainColors.Sangre ? ["Sangre"] : [])], [domainColors]); // Sangre (playtest de The Void) va el último
  const all = items;
  const q = norm(query.trim());
  const count = (k) => all.filter((c) => c.kind === k).length;
  const matches = (c) => {
    if (sel.length) return c.kind === "dominio" && sel.includes(c.domain);
    if (kinds.length && !kinds.includes(c.kind)) return false;
    return !q || norm(c.key + " " + c.text + " " + (c.features || []).map((f) => f.name + " " + f.text).join(" ") + " " + c.sub).includes(q);
  };
  const shown = all.filter((c) => matches(c) && (!sel.length || !q || norm(c.key + " " + c.text).includes(q)));
  const showDomains = !kinds.length || kinds.includes("dominio");
  const domCount = (d) => all.filter((c) => c.kind === "dominio" && c.domain === d).length;
  // Los tipos se eligen de uno en uno; solo los dominios se pueden combinar.
  const toggleKind = (k) => (setSel([]), setKinds((s) => (s.includes(k) ? [] : [k])));
  const toggle = (d) => setSel((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));
  // Secciones: cartas de dominio por nivel y, después, cada otro tipo.
  const sections = [
    ...[...new Set(shown.filter((c) => c.kind === "dominio").map((c) => c.level))].sort((a, b) => a - b).map((lv) => ({ id: "n" + lv, title: "Nivel " + lv, list: shown.filter((c) => c.kind === "dominio" && c.level === lv) })),
    ...KINDS.filter((k) => k.key !== "dominio" && k.key !== "arma").map((k) => ({ id: k.key, title: k.plural, list: shown.filter((c) => c.kind === k.key) })).filter((s) => s.list.length),
    // Las armas van por rango, como los dominios por nivel.
    ...[1, 2, 3, 4].map((t) => ({ id: "arma" + t, title: "Armas · Rango " + t, list: shown.filter((c) => c.kind === "arma" && c.tier === t) })).filter((s) => s.list.length),
  ];
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => (setOpen(null), setClosing(false)), 200);
  };
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const Icon = (c) => c.Icon || icons[c.domain] || Layers;

  const tilt = (e) => {
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty("--ry", `${(px - 0.5) * 20}deg`);
    el.style.setProperty("--rx", `${(0.5 - py) * 16}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    el.dataset.active = "1";
  };
  const untilt = (e) => {
    const el = e.currentTarget;
    ["--rx", "--ry", "--mx", "--my"].forEach((p) => el.style.removeProperty(p));
    delete el.dataset.active;
  };

  return (
    <div className="cx" ref={rootRef}>
      <div className="cx-h">
        <div>
          <h1 className="mh-serif">Cartas</h1>
          <p>Todas las cartas del juego: dominio, ascendencia, comunidad, subclase, transformación, formas de bestia y armas. Pulsa una para verla a tamaño completo.</p>
        </div>
        <label className="cx-search">
          <Search size={15} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o texto…" aria-label="Buscar cartas" />
        </label>
      </div>
      <div className="cx-bars">
      <div className="cx-bar" role="group" aria-label="Filtrar por tipo de carta">
        <button type="button" className={"cx-chip" + (kinds.length || sel.length ? "" : " on")} style={{ "--c": "#C9A24A" }} aria-pressed={!kinds.length && !sel.length} onClick={() => (setKinds([]), setSel([]))}>
          <i><Layers size={15} /></i>Todas<em>{all.length}</em>
        </button>
        {KINDS.map((k) => (
          <button key={k.key} type="button" className={"cx-chip" + (kinds.includes(k.key) && !sel.length ? " on" : "")} style={{ "--c": KIND_COLOR[k.key] }} aria-pressed={kinds.includes(k.key)} onClick={() => toggleKind(k.key)}>
            {k.label}<em>{count(k.key)}</em>
          </button>
        ))}
      </div>
      {showDomains && (
        <div className="cx-bar" role="group" aria-label="Filtrar por dominio">
          {domains.map((d) => {
            const n = domCount(d);
            const I = icons[d] || Layers;
            return (
              <button key={d} type="button" className={"cx-chip" + (sel.includes(d) ? " on" : "") + (n ? "" : " off")} style={{ "--c": domainColors[d] }} aria-pressed={sel.includes(d)} disabled={!n} title={n ? undefined : "Todavía no hay cartas de este dominio"} onClick={() => toggle(d)}>
                <i><I size={15} /></i>{d}<em>{n}</em>
              </button>
            );
          })}
        </div>
      )}
      </div>
      <div className="cx-meta">
        <span>{shown.length} de {all.length} cartas{sel.length ? " · " + sel.join(" + ") : kinds.length ? " · " + kinds.map((k) => KINDS.find((x) => x.key === k).label).join(" + ") : ""}</span>
        <span>Orden: nivel ↑ · luego tipo</span>
      </div>
      {shown.length === 0 && <div className="cx-empty">No hay cartas con ese filtro.</div>}
      {sections.map((s) => (
        <section key={s.id}>
          <div className="cx-lv"><b>{s.title}</b><span /><small>{s.list.length} carta{s.list.length === 1 ? "" : "s"}</small></div>
          <div className="cx-grid">
            {s.list.map((c) => {
              const I = Icon(c);
              return (
                <button type="button" key={c.id} className="cx-card" onClick={() => setOpen(c)} aria-label={"Ver " + c.key}>
                  <Lazy><CardFace c={c} I={I} FitTitle={FitTitle} FitBox={FitBox} tilt={c.kind === "dominio" || (c.kind === "arma" && c.tier === 4) ? { onPointerMove: (e) => e.pointerType === "mouse" && tilt(e), onPointerLeave: untilt } : undefined} /></Lazy>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {open && (() => {
        const c = open, I = Icon(c);
        return (
          <div className={"mh-overlay" + (closing ? " is-closing" : "")} style={{ background: "rgba(8,6,12,0.70)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={close} role="dialog" aria-modal="true" aria-label={c.key}>
            <div className="mh-cardc-wrap" onClick={(e) => e.stopPropagation()}>
              <CardFace c={c} I={I} FitTitle={FitTitle} FitBox={FitBox} onClose={close} tilt={{ onPointerMove: tilt, onPointerLeave: untilt, onPointerUp: (e) => e.pointerType !== "mouse" && untilt(e) }} />
            </div>
          </div>
        );
      })()}
      {showTop && (
        <button type="button" className="cx-top" aria-label="Subir arriba del todo" onClick={() => scRef.current?.scrollTo({ top: 0, behavior: "smooth" })}>
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
