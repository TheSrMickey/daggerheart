"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers, Search, X } from "lucide-react";

// Pestaña «Cartas»: todas las cartas de dominio, de menor a mayor nivel, con filtro por dominio y buscador.
// Al pulsar una carta se ve en grande, con el mismo diseño que en la hoja.
const alpha = (c, a) => (c.startsWith("#") && c.length === 7 ? c + a.toString(16).padStart(2, "0") : c);
const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// La carta, tal cual se ve al abrirla; en la cuadrícula tiene exactamente el mismo tamaño (300 × 420).
function CardFace({ c, col, I, FitTitle, FitBox, onClose, tilt }) {
  const total = c.text.length;
  const modal = !!onClose;
  return (
    <div
      className={"mh-card mh-cardc" + (modal ? " mh-card-anim mh-tilt" : "")}
      style={{ "--glow": alpha(col, 51), "--cc": col, margin: 0, width: modal ? "min(300px, 100%)" : 300, height: modal ? "min(420px, 80vh)" : 420, maxWidth: "100%", padding: 0, overflow: "hidden", borderRadius: 22, display: "flex", flexDirection: "column", border: "2px solid " + col, position: "relative", textAlign: "left" }}
      {...(tilt || {})}
    >
      <div className="mh-glare" />
      <div className="mh-cardc-art" style={{ height: total > 600 ? 84 : total > 320 ? 100 : 124 }}>
        {c.image ? <img src={c.image} alt={modal ? c.key : ""} /> : <div className="mh-cardc-noart"><I size={50} strokeWidth={1.5} /></div>}
        {modal && <button type="button" className="mh-cardc-close" onClick={onClose} aria-label="Cerrar"><X size={14} /></button>}
      </div>
      <div className="mh-cardc-badge"><span className="mh-cardc-gem" title={"Nivel " + c.level}>{c.level}</span></div>
      <div style={{ padding: "0 18px", textAlign: "center", flexShrink: 0, marginTop: 16 }}>
        <FitTitle text={c.key} max={19} min={14} className="mh-serif" style={{ fontWeight: 700, color: "var(--mh-ink)", maxHeight: "2.4em", overflow: "hidden" }} />
        <div className="mh-cardc-sub">{c.domain} · {c.type}</div>
        <div className="mh-cardc-orn" />
      </div>
      <FitBox fitKey={c.key + total} max={13} min={9} style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "10px 18px 12px", display: "flex", flexDirection: "column", justifyContent: "flex-start", textAlign: "center", gap: "0.7em", lineHeight: 1.5, color: "var(--mh-ink)" }}>
        <div style={{ color: "var(--mh-ink)" }}>{c.text}</div>
      </FitBox>
      <div style={{ padding: "0 18px 12px", textAlign: "center", fontSize: 10.5, color: "var(--mh-muted)", flexShrink: 0 }}>Nivel {c.level} · Recuperación {c.recall}</div>
    </div>
  );
}

export function CardsPage({ cards, colors, icons, FitTitle, FitBox }) {
  const [sel, setSel] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);
  const [closing, setClosing] = useState(false);
  const domains = useMemo(() => Object.keys(colors), [colors]);
  const all = useMemo(
    () => domains.flatMap((d, di) => (cards[d] || []).map((c) => ({ ...c, domain: d, di }))).sort((a, b) => a.level - b.level || a.di - b.di || a.key.localeCompare(b.key, "es")),
    [cards, colors, domains],
  );
  const q = norm(query.trim());
  const shown = all.filter((c) => (!sel.length || sel.includes(c.domain)) && (!q || norm(c.key + " " + c.text).includes(q)));
  const levels = [...new Set(shown.map((c) => c.level))].sort((a, b) => a - b);
  const toggle = (d) => setSel((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));
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
  const Icon = (d) => icons[d] || Layers;

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
    <div className="cx">
      <div className="cx-h">
        <div>
          <h1 className="mh-serif">Cartas de dominio</h1>
          <p>Todas las cartas del juego, de menor a mayor nivel. Pulsa una para verla a tamaño completo.</p>
        </div>
        <label className="cx-search">
          <Search size={15} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o texto…" aria-label="Buscar cartas" />
        </label>
      </div>
      <div className="cx-bar" role="group" aria-label="Filtrar por dominio">
        <button type="button" className={"cx-chip" + (sel.length ? "" : " on")} style={{ "--c": "#C9A24A" }} aria-pressed={!sel.length} onClick={() => setSel([])}>
          <i><Layers size={15} /></i>Todos<em>{all.length}</em>
        </button>
        {domains.map((d) => {
          const n = (cards[d] || []).length;
          const I = Icon(d);
          return (
            <button key={d} type="button" className={"cx-chip" + (sel.includes(d) ? " on" : "") + (n ? "" : " off")} style={{ "--c": colors[d] }} aria-pressed={sel.includes(d)} disabled={!n} title={n ? undefined : "Todavía no hay cartas de este dominio"} onClick={() => toggle(d)}>
              <i><I size={15} /></i>{d}<em>{n}</em>
            </button>
          );
        })}
      </div>
      <div className="cx-meta">
        <span>{shown.length} de {all.length} cartas{sel.length ? " · " + sel.join(" + ") : ""}</span>
        <span>Orden: nivel ↑ · luego dominio</span>
      </div>
      {shown.length === 0 && <div className="cx-empty">No hay cartas con ese filtro.</div>}
      {levels.map((lv) => {
        const list = shown.filter((c) => c.level === lv);
        return (
          <section key={lv}>
            <div className="cx-lv"><b>Nivel {lv}</b><span /><small>{list.length} carta{list.length === 1 ? "" : "s"}</small></div>
            <div className="cx-grid">
              {list.map((c) => {
                const col = colors[c.domain];
                const I = Icon(c.domain);
                return (
                  <button type="button" key={c.domain + c.key} className="cx-card" onClick={() => setOpen(c)} aria-label={"Ver " + c.key}>
                    <CardFace c={c} col={col} I={I} FitTitle={FitTitle} FitBox={FitBox} />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {open && (() => {
        const c = open, col = colors[c.domain], I = Icon(c.domain);
        return (
          <div className={"mh-overlay" + (closing ? " is-closing" : "")} style={{ background: "rgba(8,6,12,0.70)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={close} role="dialog" aria-modal="true" aria-label={c.key}>
            <div className="mh-cardc-wrap" onClick={(e) => e.stopPropagation()}>
              <CardFace c={c} col={col} I={I} FitTitle={FitTitle} FitBox={FitBox} onClose={close} tilt={{ onPointerMove: tilt, onPointerLeave: untilt, onPointerUp: (e) => e.pointerType !== "mouse" && untilt(e) }} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
