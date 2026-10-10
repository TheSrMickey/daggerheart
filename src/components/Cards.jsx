"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers, Search, X } from "lucide-react";

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
];
const KIND_COLOR = { dominio: "#C9A24A", ascendencia: "#6FA3C0", comunidad: "#C08B5C", subclase: "#7FB77A", transformacion: "#A58BE8" };

// La carta, tal cual se ve al abrirla; en la cuadrícula tiene exactamente el mismo tamaño (300 × 420).
function CardFace({ c, I, FitTitle, FitBox, onClose, tilt }) {
  const col = c.color;
  const feats = c.features || [];
  const total = (c.text || "").length + feats.reduce((s, f) => s + (f.name || "").length + (f.text || "").length, 0);
  const modal = !!onClose;
  const dom = c.kind === "dominio";
  return (
    <div
      className={"mh-card mh-cardc" + (modal ? " mh-card-anim mh-tilt" : "")}
      style={{ "--glow": alpha(col, 51), "--cc": col, margin: 0, width: modal ? "min(300px, 100%)" : 300, height: modal ? "min(420px, 80vh)" : 420, maxWidth: "100%", padding: 0, overflow: "hidden", borderRadius: 22, display: "flex", flexDirection: "column", border: "2px solid " + col, position: "relative", textAlign: "left" }}
      {...(tilt || {})}
    >
      <div className="mh-glare" />
      <div className="mh-cardc-art" style={{ height: total > 600 ? 84 : total > 320 ? 100 : 124 }}>
        {c.image ? <img src={c.image} alt={modal ? c.key : ""} /> : <div className="mh-cardc-noart" style={{ color: col }}><I size={50} strokeWidth={1.5} /></div>}
        {modal && <button type="button" className="mh-cardc-close" onClick={onClose} aria-label="Cerrar"><X size={14} /></button>}
      </div>
      <div className="mh-cardc-badge">{dom && <span className="mh-cardc-gem" title={"Nivel " + c.level}>{c.level}</span>}</div>
      <div style={{ padding: "0 18px", textAlign: "center", flexShrink: 0, marginTop: dom ? 16 : 8 }}>
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
      {dom && <div style={{ padding: "0 18px 12px", textAlign: "center", fontSize: 10.5, color: "var(--mh-muted)", flexShrink: 0 }}>Nivel {c.level} · Recuperación {c.recall}</div>}
    </div>
  );
}

export function CardsPage({ items, domainColors, icons, FitTitle, FitBox }) {
  const [kinds, setKinds] = useState([]);
  const [sel, setSel] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);
  const [closing, setClosing] = useState(false);
  const domains = useMemo(() => Object.keys(domainColors), [domainColors]);
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
  const toggleKind = (k) => (setSel([]), setKinds((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k])));
  const toggle = (d) => setSel((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));
  // Secciones: cartas de dominio por nivel y, después, cada otro tipo.
  const sections = [
    ...[...new Set(shown.filter((c) => c.kind === "dominio").map((c) => c.level))].sort((a, b) => a - b).map((lv) => ({ id: "n" + lv, title: "Nivel " + lv, list: shown.filter((c) => c.kind === "dominio" && c.level === lv) })),
    ...KINDS.filter((k) => k.key !== "dominio").map((k) => ({ id: k.key, title: k.plural, list: shown.filter((c) => c.kind === k.key) })).filter((s) => s.list.length),
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
    <div className="cx">
      <div className="cx-h">
        <div>
          <h1 className="mh-serif">Cartas</h1>
          <p>Todas las cartas del juego: dominio, ascendencia, comunidad, subclase y transformación. Pulsa una para verla a tamaño completo.</p>
        </div>
        <label className="cx-search">
          <Search size={15} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o texto…" aria-label="Buscar cartas" />
        </label>
      </div>
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
                  <CardFace c={c} I={I} FitTitle={FitTitle} FitBox={FitBox} />
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
    </div>
  );
}
