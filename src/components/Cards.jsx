"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, Layers, Search, X, Zap } from "lucide-react";
import { useSocial } from "./Social";
import { cardStatus, isAdminName } from "@/lib/cardStatus";

// Panel de administrador: qué funciones tiene aplicadas la carta abierta.
function AdminCardPanel({ c }) {
  const st = cardStatus(c);
  const rows = [["Hoja de personaje", st.sheet], ["Mano de la baraja", st.hand], ["Mapa de combate", st.map]];
  return (
    <aside className="cx-adm" onClick={(e) => e.stopPropagation()} aria-label="Funciones de la carta (administrador)">
      <small>Administrador</small>
      <b className="mh-serif">{c.key}</b>
      {rows.map(([label, v]) => (
        <div key={label} className={"cx-adm-r" + (v ? " is-on" : "")}>
          <i>{v ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}</i>
          <span><em>{label}</em>{v || (st.registered ? "Sin función" : "Sin registrar")}</span>
        </div>
      ))}
    </aside>
  );
}

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
  { key: "salvaje", label: "Salvaje", plural: "Cartas Salvajes" },
  { key: "forma", label: "Forma de Bestia", plural: "Formas de Bestia" },
  { key: "arma", label: "Arma", plural: "Armas" },
  { key: "armadura", label: "Armadura", plural: "Armaduras" },
  { key: "adversario", label: "Adversarios", plural: "Adversarios" },
  { key: "entorno", label: "Entornos", plural: "Entornos" },
];
const KIND_COLOR = { dominio: "#C9A24A", ascendencia: "#6FA3C0", comunidad: "#C08B5C", subclase: "#7FB77A", transformacion: "#A58BE8", salvaje: "#D94F7A", forma: "#E0A04A", arma: "#C9A24A", armadura: "#C9A24A", adversario: "#D9644E", entorno: "#5FA39A" };

// La carta, tal cual se ve al abrirla; en la cuadrícula tiene exactamente el mismo tamaño (300 × 420).
export function CardFace({ c, I, FitTitle, FitBox, onClose, tilt }) {
  const col = c.color;
  const legend = c.kind === "arma" && c.tier === 4;
  const feats = c.features || [];
  const total = (c.text || "").length + (c.stats || []).reduce((s, x) => s + x[0].length + String(x[1]).length, 0) + feats.reduce((s, f) => s + (f.name || "").length + (f.text || "").length + (f.subs || []).reduce((q, e) => q + e.name.length + e.text.length, 0), 0);
  const modal = !!onClose;
  const dom = c.kind === "dominio";
  // Ascendencias y comunidades usan el mismo diseño que las de dominio, sin cinta de nivel ni coste.
  const gen = c.kind === "ascendencia" || c.kind === "comunidad" || c.kind === "transformacion" || c.kind === "salvaje" || c.kind === "accion" || c.kind === "adversario" || c.kind === "entorno";
  const sub = c.kind === "subclase"; // cinta con el rango en numeral romano: I Fundación, II Especialización, III Maestría
  const bst = c.kind === "forma"; // cinta con el rango de la forma
  const wpn = c.kind === "arma" || c.kind === "armadura"; // armas y armaduras: cinta con el rango (I Común … IV Legendario) y el mismo diseño que en la hoja
  const g = c.gear;
  const roman = ["I", "II", "III", "IV"];
  const bg = dom || gen || sub || bst || wpn;
  // Opción «Ilustración a toda la carta» (full art): la imagen llena la carta y el texto va abajo sobre un velo degradado.
  const full = !!(c.fullArt && c.image);
  if (full) {
    const chips = (wpn
      ? [g && g.big && (g.label ? g.label + " " : "") + g.big + (g.small ? " " + g.small : ""), g && g.foot, g && g.pill]
      : dom
      ? [c.type, "Nivel " + c.level, !c.noCost && "Recuperación " + (c.recall ?? "—"), "Dominio " + c.domain]
      : sub
      ? [c.rankLabel, c.sub]
      : [c.sub]
    ).filter(Boolean);
    const lines = wpn && g ? String(g.feature || "").split("\n").filter(Boolean) : [];
    const para = (t, i) => {
      const k = t.indexOf(": ");
      return (
        <div key={i} className="mh-cf-p">
          {k > 0 && k < 40 ? <><b>{t.slice(0, k)}</b>{": " + t.slice(k + 2)}</> : t}
        </div>
      );
    };
    return (
      <div
        className={"mh-card mh-cardc is-bg is-full" + (modal ? " mh-card-anim" : "") + (modal || legend || bg ? " mh-tilt" : "") + (wpn ? " is-wp" : "") + (legend ? " is-legend" : "")}
        style={{ "--glow": alpha(col, 51), "--cc": col, margin: 0, width: modal ? "min(300px, 100%)" : 300, height: modal ? "min(420px, 80vh)" : 420, maxWidth: "100%", padding: 0, overflow: "hidden", borderRadius: 22, display: "flex", flexDirection: "column", border: "2px solid " + col, position: "relative", textAlign: "left" }}
        {...(tilt || {})}
      >
        <div className="mh-glare" />
        {legend && <div className="mh-holo is-idle" />}
        {legend && <div className="mh-legend-sheen" />}
        <div className="mh-cf-art">
          <img src={c.image} alt={modal ? c.key : ""} style={{ objectPosition: (c.imgX ?? 50) + "% " + (c.imgY ?? 30) + "%", transform: "scale(" + (c.imgZoom || 1) + ")", transformOrigin: (c.imgX ?? 50) + "% " + (c.imgY ?? 30) + "%" }} />
        </div>
        <div className="mh-cf-top" />
        <div className="mh-cardc-badge">
          {dom && <span className="mh-cardc-gem" title={"Nivel " + c.level}>{c.level}<I size={19} strokeWidth={1.8} /></span>}
          {sub && <span className="mh-cardc-gem is-rank" title={c.rankLabel}>{roman[c.rank || 0]}<I size={19} strokeWidth={1.8} /></span>}
          {wpn && <span className="mh-cardc-gem is-rank" title={"Rango " + c.tier}>{roman[(c.tier || 1) - 1]}<I size={19} strokeWidth={1.8} /></span>}
          {bst && <span className="mh-cardc-gem is-rank" title={"Rango " + c.tier}>{roman[(c.tier || 1) - 1]}<I size={19} strokeWidth={1.8} /></span>}
        </div>
        {dom && !c.noCost && <span className="mh-cardc-cost" title="Coste de recuperación">{c.recall ?? "—"}<Zap size={12} fill="currentColor" /></span>}
        <div className="mh-cf-body">
          <FitTitle text={c.key} max={20} min={14} className="mh-serif" style={{ fontWeight: 700, color: "#fff", textShadow: "0 2px 10px #000", maxHeight: "2.4em", overflow: "hidden" }} />
          {chips.length > 0 && <div className="mh-cf-chips">{chips.map((t) => <span key={t}>{t}</span>)}</div>}
          <FitBox fitKey={c.key + total + (g ? g.feature : "") + chips.length} max={12.5} min={8} style={{ flex: "0 1 auto", minHeight: 0, overflow: "hidden", textAlign: "center", lineHeight: 1.4, color: "#f4efe2", textShadow: "0 1px 3px #000" }}>
            {wpn && g ? (
              lines.length ? lines.map(para) : <div className="mh-cf-p" style={{ fontStyle: "italic", opacity: 0.8 }}>Sin característica especial.</div>
            ) : (
              <>
                {c.text && <div className="mh-cf-p">{c.text}</div>}
                {feats.map((f) => (
                  <div key={f.name} className="mh-cf-p">
                    <b>{f.name}</b>{f.text ? ": " + f.text : ""}
                    {f.subs && f.subs.map((e) => <div key={e.name} style={{ marginTop: 3 }}><b>{e.name}</b>: {e.text}</div>)}
                  </div>
                ))}
              </>
            )}
          </FitBox>
        </div>
      </div>
    );
  }
  return (
    <div
      className={"mh-card mh-cardc" + (modal ? " mh-card-anim" : "") + (modal || legend || bg ? " mh-tilt" : "") + (bg ? " is-bg" : "") + (wpn ? " is-wp" : "") + (legend ? " is-legend" : "")}
      style={{ "--glow": alpha(col, 51), "--cc": col, margin: 0, width: modal ? "min(300px, 100%)" : 300, height: modal ? "min(420px, 80vh)" : 420, maxWidth: "100%", padding: 0, overflow: "hidden", borderRadius: 22, display: "flex", flexDirection: "column", border: "2px solid " + col, position: "relative", textAlign: "left" }}
      {...(tilt || {})}
    >
      <div className="mh-glare" />
      {legend && <div className="mh-holo is-idle" />}
      {legend && <div className="mh-legend-sheen" />}
      <div className="mh-cardc-art" style={{ height: total > 600 ? 84 : total > 320 ? 100 : 124, "--ah": (total > 600 ? 84 : total > 320 ? 100 : 124) + "px", ...(sub && total > 400 ? { "--abg": (total > 520 ? 128 : total > 450 ? 140 : 156) + "px" } : null) }}>
        {c.image ? <img src={c.image} alt={modal ? c.key : ""} style={c.imgZoom || c.imgX != null ? { objectPosition: (c.imgX ?? 50) + "% " + (c.imgY ?? 30) + "%", transform: "scale(" + (c.imgZoom || 1) + ")", transformOrigin: (c.imgX ?? 50) + "% " + (c.imgY ?? 30) + "%" } : undefined} /> : <div className="mh-cardc-noart" style={{ color: col }}><I size={50} strokeWidth={1.5} /></div>}
      </div>
      <div className="mh-cardc-badge">
        {dom && <span className="mh-cardc-gem" title={"Nivel " + c.level}>{c.level}<I size={19} strokeWidth={1.8} /></span>}
        {sub && <span className="mh-cardc-gem is-rank" title={c.rankLabel}>{roman[c.rank || 0]}<I size={19} strokeWidth={1.8} /></span>}
        {wpn && <span className="mh-cardc-gem is-rank" title={"Rango " + c.tier}>{roman[(c.tier || 1) - 1]}<I size={19} strokeWidth={1.8} /></span>}
        {bst && <span className="mh-cardc-gem is-rank" title={"Rango " + c.tier}>{roman[(c.tier || 1) - 1]}<I size={19} strokeWidth={1.8} /></span>}
      </div>
      {bg && <span className="mh-cardc-dom" style={sub && total > 400 ? { top: (total > 520 ? 128 : total > 450 ? 140 : 156) - 12 } : undefined}>{dom ? c.type : sub ? c.rankLabel : wpn ? g?.pill : bst ? "Forma de Bestia" : c.kind === "transformacion" ? "Transformación" : c.sub}</span>}
      {dom && !c.noCost && <span className="mh-cardc-cost" title="Coste de recuperación">{c.recall ?? "—"}<Zap size={12} fill="currentColor" /></span>}
      <div style={{ padding: "0 18px", textAlign: "center", flexShrink: 0, marginTop: bg ? 16 : 8 }}>
        <FitTitle text={c.key} max={19} min={14} className="mh-serif" style={{ fontWeight: 700, color: "var(--mh-ink)", maxHeight: "2.4em", overflow: "hidden" }} />
        <div className="mh-cardc-sub">{c.sub}</div>
        <div className="mh-cardc-orn" />
      </div>
      {wpn && g ? (
        <FitBox fitKey={c.key + g.feature} max={13} min={8.5} style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "10px 18px 12px", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", gap: "0.7em", lineHeight: 1.45, color: "var(--mh-ink)" }}>
          <div>
            <div className="mh-cardc-label">{g.label}</div>
            <div className="mh-cardc-big">{g.big}</div>
            {g.small && <div style={{ fontSize: "0.88em", color: "var(--mh-muted)" }}>{g.small}</div>}
          </div>
          {g.feature ? <div style={{ fontSize: "0.95em" }}>{g.feature}</div> : <div style={{ fontSize: "0.93em", color: "var(--mh-muted2)", fontStyle: "italic" }}>Sin característica especial.</div>}
        </FitBox>
      ) : (
      <FitBox fitKey={c.key + total} max={13} min={8.5} style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "10px 18px 12px", display: "flex", flexDirection: "column", justifyContent: "flex-start", textAlign: feats.length ? "left" : "center", gap: "0.7em", lineHeight: 1.45, color: "var(--mh-ink)" }}>
        {c.stats && <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2px 10px", fontSize: "0.95em", color: "var(--mh-ink)" }}>{c.stats.map((s) => <span key={s[0]}><b style={{ color: "var(--mh-gold-ink)" }}>{s[0]}</b> {s[1]}</span>)}</div>}
        {c.text && <div style={{ color: "var(--mh-ink)", textAlign: "center", fontStyle: c.stats ? "italic" : undefined }}>{c.text}</div>}
        {feats.map((f) => (
          <div key={f.name} style={{ fontSize: "0.95em", lineHeight: 1.4 }}>
            <b style={{ color: "var(--mh-gold-ink)" }}>{f.name}</b>{f.text ? ": " + f.text : ""}
            {f.subs && f.subs.map((e) => <div key={e.name} style={{ marginTop: 3 }}><b>{e.name}</b>: {e.text}</div>)}
          </div>
        ))}
      </FitBox>
      )}
      {dom && (
        <div className="mh-cardc-sig">
          <span>Dominio {c.domain}</span>
          <span>{c.noCost ? "Hechizo" : "Nivel " + c.level + " · Recuperación " + (c.recall ?? "—")}</span>
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
          <span>{g?.foot}</span>
          <span>{g?.pill}</span>
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

// Navegación en tres niveles: grupo → tipo → filtros del tipo.
const GROUPS = [
  { key: "personaje", label: "Personaje", kinds: ["dominio", "ascendencia", "comunidad", "subclase", "transformacion", "forma"] },
  { key: "equipo", label: "Equipo", kinds: ["arma", "armadura"] },
  { key: "dj", label: "Mesa del DJ", kinds: ["adversario", "entorno"] },
  { key: "especiales", label: "Especiales", kinds: ["salvaje"] },
];
const TYPE_LABEL = { dominio: "Dominio", ascendencia: "Ascendencia", comunidad: "Comunidad", subclase: "Subclase", transformacion: "Transformación", forma: "Forma de Bestia", arma: "Armas", armadura: "Armaduras", adversario: "Adversarios", entorno: "Entornos", salvaje: "Salvajes" };

export function CardsPage({ items, domainColors, icons, FitTitle, FitBox, DomainIcon }) {
  const [group, setGroup] = useState("personaje");
  const [kind, setKind] = useState("dominio");
  const [lvl, setLvl] = useState(null);
  const [tier, setTier] = useState(0);
  const [cls, setCls] = useState("");
  const kinds = [kind];
  const [sel, setSel] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);
  const admin = isAdminName(useSocial().me?.username);
  const [closing, setClosing] = useState(false);
  const [deckIdx, setDeckIdx] = useState(0); // subclase abierta: qué carta del mazo está delante (0 Fundación, 1 Especialización, 2 Maestría)
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
  // Subclases: en la cuadrícula solo sale la carta de Fundación; Especialización y Maestría van detrás, al abrirla.
  const subSet = (c) => all.filter((x) => x.kind === "subclase" && x.cls === c.cls && x.key === c.key).sort((a, b) => a.rank - b.rank);
  const count = (k) => all.filter((c) => c.kind === k && (k !== "subclase" || c.rank === 0)).length;
  // Con texto en el buscador se busca en todas las cartas; sin texto, se aplican el grupo, el tipo y sus filtros.
  const matches = (c) => {
    if (c.kind === "subclase" && c.rank) return false;
    if (q) {
      const grp = c.kind === "subclase" ? subSet(c) : [c];
      return grp.some((g) => norm(g.key + " " + g.text + " " + (g.features || []).map((f) => f.name + " " + f.text).join(" ") + " " + g.sub + " " + (g.gear ? g.gear.feature + " " + g.gear.big + " " + g.gear.foot : "")).includes(q));
    }
    if (c.kind !== kind) return false;
    if (kind === "dominio") return (!sel.length || sel.includes(c.domain)) && (lvl == null || c.level === lvl);
    if (kind === "subclase") return !cls || c.cls === cls;
    if (kind === "arma" || kind === "armadura" || kind === "forma") return !tier || c.tier === tier;
    return true;
  };
  const shown = all.filter(matches);
  const classes = useMemo(() => [...new Set(all.filter((c) => c.kind === "subclase").map((c) => c.cls).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [all]);
  const grpCount = (g) => g.kinds.reduce((n, k) => n + count(k), 0);
  const pickGroup = (g) => { setGroup(g.key); setKind(g.kinds[0]); setSel([]); setLvl(null); setTier(0); setCls(""); };
  const pickKind = (k) => { setKind(k); setSel([]); setLvl(null); setTier(0); setCls(""); };
  const openCard = (c) => (setDeckIdx(0), setOpen(c));
  const showDomains = !q && kind === "dominio";
  const domCount = (d) => all.filter((c) => c.kind === "dominio" && c.domain === d).length;
  // Los tipos se eligen de uno en uno; solo los dominios se pueden combinar.
  const toggleKind = (k) => (setSel([]), setKinds((s) => (s.includes(k) ? [] : [k])));
  const toggle = (d) => setSel((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));
  // Secciones: cartas de dominio por nivel y, después, cada otro tipo.
  const sections = [
    ...[...new Set(shown.filter((c) => c.kind === "dominio").map((c) => c.level))].sort((a, b) => a - b).map((lv) => ({ id: "n" + lv, title: "Nivel " + lv, list: shown.filter((c) => c.kind === "dominio" && c.level === lv) })),
    ...KINDS.filter((k) => k.key !== "dominio" && k.key !== "arma" && k.key !== "armadura").map((k) => ({ id: k.key, title: k.plural, list: shown.filter((c) => c.kind === k.key) })).filter((s) => s.list.length),
    // Las armas van por rango, como los dominios por nivel.
    ...[1, 2, 3, 4].map((t) => ({ id: "arma" + t, title: "Armas · Rango " + t, list: shown.filter((c) => c.kind === "arma" && c.tier === t) })).filter((s) => s.list.length),
    ...[1, 2, 3, 4].map((t) => ({ id: "armadura" + t, title: "Armaduras · Rango " + t, list: shown.filter((c) => c.kind === "armadura" && c.tier === t) })).filter((s) => s.list.length),
  ];
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => (setOpen(null), setClosing(false)), 200);
  };
  useEffect(() => {
    if (!open) return;
    const k = (e) => {
      if (e.key === "Escape") close();
      else if (open.kind === "subclase" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) setDeckIdx((i) => Math.max(0, Math.min(subSet(open).length - 1, i + (e.key === "ArrowRight" ? 1 : -1))));
    };
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
          <p>Todas las cartas del juego, ordenadas por grupo y tipo. Escribe en el buscador para buscar en todas a la vez. Pulsa una carta para verla a tamaño completo.</p>
        </div>
        <label className="cx-search">
          <Search size={15} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o texto…" aria-label="Buscar cartas" />
        </label>
      </div>
      <div className="cx-bars">
        <div className="cx-g" role="tablist" aria-label="Grupo de cartas">
          {GROUPS.map((g) => (
            <button key={g.key} type="button" role="tab" aria-selected={!q && group === g.key} className={!q && group === g.key ? "on" : ""} onClick={() => (setQuery(""), pickGroup(g))}>
              {g.label}<em>{grpCount(g)}</em>
            </button>
          ))}
        </div>
        {!q && (
          <div className="cx-t" role="tablist" aria-label="Tipo de carta">
            {GROUPS.find((g) => g.key === group).kinds.map((k) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? "on" : ""} onClick={() => pickKind(k)}>{TYPE_LABEL[k]}<em>{count(k)}</em></button>
            ))}
          </div>
        )}
        {!q && (kind === "dominio" || kind === "subclase" || kind === "arma" || kind === "armadura" || kind === "forma") && (
          <div className="cx-fp">
            {kind === "dominio" && (
              <div className="cx-fg"><span className="cx-fl">Dominio</span>
                <div className="cx-doms">
                  {domains.map((d) => {
                    const n = domCount(d);
                    const I = icons[d] || Layers;
                    return (
                      <button key={d} type="button" className={"cx-dom" + (sel.includes(d) ? " on" : "") + (n ? "" : " off")} style={{ "--c": domainColors[d] }} aria-pressed={sel.includes(d)} aria-label={d} disabled={!n} title={d + (n ? " · " + n : " · sin cartas todavía")} onClick={() => toggle(d)}>
                        {DomainIcon ? <DomainIcon name={d} size={18} /> : <I size={17} />}
                        <span className="cx-dn">{d}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {kind === "dominio" && (
              <div className="cx-fg"><span className="cx-fl">Nivel</span>
                <div className="cx-seg">
                  <button type="button" className={lvl == null ? "on" : ""} onClick={() => setLvl(null)}>Todos</button>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <button key={n} type="button" className={lvl === n ? "on" : ""} onClick={() => setLvl(lvl === n ? null : n)}>{n}</button>)}
                </div>
              </div>
            )}
            {(kind === "arma" || kind === "armadura" || kind === "forma") && (
              <div className="cx-fg"><span className="cx-fl">Rango</span>
                <div className="cx-seg">
                  <button type="button" className={!tier ? "on" : ""} onClick={() => setTier(0)}>Todos</button>
                  {[1, 2, 3, 4].map((n) => <button key={n} type="button" className={tier === n ? "on" : ""} onClick={() => setTier(tier === n ? 0 : n)}>{n}</button>)}
                </div>
              </div>
            )}
            {kind === "subclase" && (
              <div className="cx-fg"><span className="cx-fl">Clase</span>
                <select className="cx-sel" value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Filtrar subclases por clase">
                  <option value="">Todas las clases</option>
                  {classes.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="cx-meta">
        <span>{q ? shown.length + " resultado" + (shown.length === 1 ? "" : "s") + " para «" + query.trim() + "» en todas las cartas" : shown.length + " carta" + (shown.length === 1 ? "" : "s") + " · " + TYPE_LABEL[kind] + (sel.length ? " · " + sel.join(" + ") : "")}</span>
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
                <button type="button" key={c.id} className="cx-card" onClick={() => openCard(c)} aria-label={"Ver " + c.key}>
                  <Lazy><CardFace c={c} I={I} FitTitle={FitTitle} FitBox={FitBox} tilt={c.kind === "dominio" || (c.kind === "arma" && c.tier === 4) ? { onPointerMove: (e) => e.pointerType === "mouse" && tilt(e), onPointerLeave: untilt } : undefined} /></Lazy>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {open && (() => {
        const c = open, I = Icon(c);
        if (c.kind === "subclase") {
          const deck = subSet(c);
          const cur = Math.min(deckIdx, deck.length - 1);
          return (
            <div className={"mh-overlay" + (closing ? " is-closing" : "")} style={{ background: "rgba(8,6,12,0.70)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={close} role="dialog" aria-modal="true" aria-label={c.key}>
              <div className="cx-deckwrap" onClick={(e) => e.stopPropagation()} style={{ "--cc": c.color }}>
                <div className="cx-deck" style={{ "--n": deck.length }}>
                  {deck.map((d, i) => {
                    const off = i - cur;
                    const front = off === 0;
                    return (
                      <div
                        key={d.id}
                        className={"cx-dk" + (front ? " is-front" : "")}
                        style={{ "--o": off, "--z": 10 - Math.abs(off) }}
                        onClick={front ? undefined : () => setDeckIdx(i)}
                        role={front ? undefined : "button"}
                        tabIndex={front ? -1 : 0}
                        aria-label={front ? undefined : "Ver " + d.rankLabel}
                        onKeyDown={front ? undefined : (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setDeckIdx(i))}
                      >
                        <CardFace c={d} I={Icon(d)} FitTitle={FitTitle} FitBox={FitBox} tilt={front ? { onPointerMove: tilt, onPointerLeave: untilt, onPointerUp: (e) => e.pointerType !== "mouse" && untilt(e) } : undefined} />
                      </div>
                    );
                  })}
                </div>
                <div className="cx-dtabs" role="tablist" aria-label="Rango de la subclase">
                  {deck.map((d, i) => (
                    <button key={d.id} type="button" role="tab" aria-selected={i === cur} className={i === cur ? "on" : ""} onClick={() => setDeckIdx(i)}>
                      <b>{["I", "II", "III"][d.rank]}</b>{d.rankLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className={"mh-overlay" + (closing ? " is-closing" : "")} style={{ background: "rgba(8,6,12,0.70)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={close} role="dialog" aria-modal="true" aria-label={c.key}>
            <div className={admin ? "cx-admwrap" : undefined} style={admin ? undefined : { display: "contents" }}>
              <div className="mh-cardc-wrap" onClick={(e) => e.stopPropagation()}>
                <CardFace c={c} I={I} FitTitle={FitTitle} FitBox={FitBox} onClose={close} tilt={{ onPointerMove: tilt, onPointerLeave: untilt, onPointerUp: (e) => e.pointerType !== "mouse" && untilt(e) }} />
              </div>
              {admin && <AdminCardPanel c={c} />}
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
