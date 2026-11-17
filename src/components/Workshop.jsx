"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Check, Copy, Download, FileText, Gem, Hammer, Home, Layers, Minus, Pencil, Plus, RotateCcw, Search, Shield, Swords, Trash2, Upload, User, X, Sparkles } from "lucide-react";
import { storageGet, storageSet } from "@/lib/storage";
import { CardFace } from "./Cards";
import { weaponIcon, armorIcon } from "./gearIcons";

// Taller: contenido personalizado del jugador (cartas de dominio, ascendencias, comunidades, subclases, armas, armaduras y objetos).
// Por ahora es privado: se guarda en la cuenta y se puede exportar e importar en JSON.
const KEY = "workshop-items";
export const TYPES = [
  { key: "dominio", label: "Carta de dominio", plural: "Cartas de dominio", Icon: Layers, color: "#A58BE8" },
  { key: "ascendencia", label: "Ascendencia", plural: "Ascendencias", Icon: User, color: "#6FA3C0" },
  { key: "comunidad", label: "Comunidad", plural: "Comunidades", Icon: Home, color: "#C08B5C" },
  { key: "subclase", label: "Subclase", plural: "Subclases", Icon: BookOpen, color: "#7FB77A" },
  { key: "arma", label: "Arma", plural: "Armas", Icon: Swords, color: "#C9A24A" },
  { key: "armadura", label: "Armadura", plural: "Armaduras", Icon: Shield, color: "#857C96" },
  { key: "objeto", label: "Objeto", plural: "Objetos", Icon: Gem, color: "#E0A04A" },
];
export const typeOf = (k) => TYPES.find((t) => t.key === k) || TYPES[0];
const TRAIT_NAMES = ["Agilidad", "Fuerza", "Destreza", "Instinto", "Presencia", "Conocimiento"];
const RANGES = ["Cuerpo a cuerpo", "Muy cercano", "Cercano", "Lejano", "Muy lejano"];
const CTYPES = ["Hechizo", "Habilidad", "Grimorio"];
const STAGES = ["Fundación", "Especialización", "Maestría"];
const TIER_LABEL = { 1: "Común", 2: "Poco común", 3: "Raro", 4: "Legendario" };
const TIER_COLOR = { 1: "#857C96", 2: "#7FB77A", 3: "#A58BE8", 4: "#E8C547" };

// Fichas de carta (como las de Desatar el Caos o Palabras Inspiradoras): se colocan sobre la carta, se gastan o se ganan y se reponen con una regla.
const NO_TOK = { on: false, label: "Combo", max: 3, start: "empty", reset: "scene" };
const RESETS = [["scene", "Fin de la escena"], ["short", "Descanso corto"], ["long", "Descanso largo"], ["session", "Cada sesión"], ["never", "Nunca"]];
const tokSummary = (t) => t.max + " fichas de " + (t.label || "ficha") + " · empiezan " + (t.start === "full" ? "llenas" : "vacías") + " · " + (t.reset === "never" ? "no se reponen" : "se reponen: " + RESETS.find((r) => r[0] === t.reset)?.[1].toLowerCase());
// Plantillas listas para añadir a tu biblioteca.
const TEMPLATES = [
  {
    key: "riven",
    label: "Espada Rota de Riven",
    sub: "Arma legendaria · fichas de Combo",
    make: () => ({
      ...blank("arma"), name: "Espada Rota de Riven", slot: "Principal", hands: 2, tier: 4, trait: "Fuerza", range: "Cuerpo a cuerpo", damage: "d10+9 físico",
      feature: "Alas Rotas: cuando aciertas con esta arma, gana 1 ficha de Combo (máx. 3). Con la 3.ª, gástalas todas: el objetivo sale despedido hasta alcance Muy cercano y queda Vulnerable temporalmente. Las fichas se pierden al terminar la escena.\nLa Hoja del Exiliado: una vez por descanso largo, gasta 3 de Esperanza y marca 1 Estrés: hasta el final de la escena suma +1d6 al daño, su alcance pasa a Cercano y cada ficha de Combo cuenta como dos.",
      tokens: { on: true, label: "Combo", max: 3, start: "empty", reset: "scene" },
    }),
  },
  {
    key: "kayn",
    label: "Guadaña Darkin de Kayn",
    sub: "Arma legendaria · fichas de Sed",
    make: () => ({
      ...blank("arma"), name: "Guadaña Darkin de Kayn", slot: "Principal", hands: 2, tier: 4, trait: "Fuerza", range: "Cuerpo a cuerpo", damage: "d10+9 físico",
      feature: "Sed del Darkin: cuando infliges daño con esta arma, gana 1 ficha de Sed (máx. 3). Puedes gastar 1 ficha de Sed tras un impacto para recuperar 1 Punto de Vida. Las fichas se pierden al terminar la escena.\nForma Darkin: una vez por descanso largo, gasta 3 de Esperanza: hasta el final de la escena el arma alcanza Cercano, suma +1d8 al daño y cada ficha de Sed que gastes cura 2 Puntos de Vida en vez de 1. Al terminar, marca 1 Estrés.",
      tokens: { on: true, label: "Sed", max: 3, start: "empty", reset: "scene" },
    }),
  },
];
const blank = (type) => {
  const base = { id: "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type, name: "", createdAt: Date.now() };
  switch (type) {
    case "dominio": return { ...base, domain: "Arcano", level: 1, ctype: "Hechizo", recall: 1, text: "", image: "", tokens: { ...NO_TOK } };
    case "ascendencia": return { ...base, blurb: "", features: [{ name: "", text: "" }, { name: "", text: "" }], image: "" };
    case "comunidad": return { ...base, blurb: "", features: [{ name: "", text: "" }], image: "" };
    case "subclase": return { ...base, cls: "", blurb: "", features: [{ name: "", text: "", stage: "Fundación" }], image: "" };
    case "arma": return { ...base, slot: "Principal", trait: "Agilidad", range: "Cuerpo a cuerpo", damage: "d8 físico", hands: 1, tier: 1, feature: "", tokens: { ...NO_TOK } };
    case "armadura": return { ...base, tier: 1, score: 3, major: 7, severe: 15, feature: "" };
    default: return { ...base, text: "", image: "" };
  }
};

// Convierte un elemento del taller en una entrada con el mismo formato que el catálogo de la pestaña Cartas.
export function toEntry(it, ctx, rank) {
  const e = toEntry0(it, ctx, rank);
  if (e && e.image) { e.imgZoom = Number(it.imgZoom) || 1; e.imgX = it.imgX ?? 50; e.imgY = it.imgY ?? 30; e.fullArt = !!it.fullArt; }
  return e;
}
function toEntry0(it, ctx, rank = 0) {
  const nm = it.name || "Sin nombre";
  const feats = (it.features || []).filter((f) => f.name || f.text).map((f) => ({ name: f.name || "…", text: f.text, stage: f.stage }));
  switch (it.type) {
    case "dominio": {
      const dom = it.domain || "Personalizado";
      return { id: it.id, kind: "dominio", key: nm, sub: dom + " · " + it.ctype, domain: dom, type: it.ctype, level: Number(it.level) || 1, recall: Number(it.recall) || 0, text: it.text, image: it.image || null, color: ctx.domainColors[dom] || "#A58BE8", Icon: ctx.icons[dom] || Sparkles };
    }
    case "ascendencia": return { id: it.id, kind: "ascendencia", key: nm, sub: "Ascendencia", text: it.blurb, features: feats, image: it.image || null, color: "#6FA3C0", Icon: User };
    case "comunidad": return { id: it.id, kind: "comunidad", key: nm, sub: "Comunidad", text: it.blurb, features: feats, image: it.image || null, color: "#C08B5C", Icon: Home };
    case "subclase": {
      const inStage = feats.filter((f) => (f.stage || "Fundación") === STAGES[rank]).map(({ name, text }) => ({ name, text }));
      return { id: it.id, kind: "subclase", key: nm, sub: (it.cls || "Clase") + " · Subclase", cls: it.cls, rank, rankLabel: STAGES[rank], text: rank === 0 ? it.blurb : "", features: inStage, image: it.image || null, color: ctx.classColors[it.cls] || "#7FB77A", Icon: BookOpen };
    }
    case "arma": {
      const dm = String(it.damage || "").match(/^(\S+)\s*(.*)$/);
      return { id: it.id, kind: "arma", key: nm, sub: "Arma " + (it.slot === "Secundaria" ? "secundaria" : "principal") + " · " + (Number(it.hands) === 2 ? "Dos manos" : "Una mano"), tier: Number(it.tier) || 1, text: "", features: [], gear: { label: "Daño", big: dm?.[1] || "—", small: dm?.[2] || "", feature: it.feature || "", foot: [it.trait, it.range].filter(Boolean).join(" · "), pill: TIER_LABEL[it.tier] || "" }, image: it.image || null, color: TIER_COLOR[it.tier] || "#C9A24A", Icon: weaponIcon(nm) };
    }
    case "armadura": return { id: it.id, kind: "armadura", key: nm, sub: "Armadura", tier: Number(it.tier) || 1, text: "", features: [], gear: { label: "Puntuación", big: String(it.score ?? "—"), small: "", feature: it.feature || "", foot: "Umbrales base " + it.major + " / " + it.severe, pill: TIER_LABEL[it.tier] || "" }, image: it.image || null, color: TIER_COLOR[it.tier] || "#857C96", Icon: armorIcon(nm) };
    default: return { id: it.id, kind: "accion", key: nm, sub: "Objeto", text: it.text, features: [], image: it.image || null, color: "#E0A04A", Icon: Gem };
  }
}

// Comprobaciones: avisos de ayuda para que la carta quede bien y encaje con las reglas.
function checks(it) {
  const out = [];
  const ok = (t) => out.push({ ok: true, t });
  const warn = (t) => out.push({ ok: false, t });
  it.name?.trim() ? ok("Tiene nombre.") : warn("Falta el nombre.");
  const text = it.type === "ascendencia" || it.type === "comunidad" || it.type === "subclase" ? it.blurb || "" : it.text || it.feature || "";
  const len = String(text).length + (it.features || []).reduce((n, f) => n + (f.name || "").length + (f.text || "").length, 0);
  if (it.type === "dominio") {
    String(it.text || "").trim() ? ok("Texto de la carta escrito (" + len + "/600).") : warn("Escribe el texto de la carta.");
    len > 600 && warn("El texto es muy largo: se leerá pequeño en la carta.");
    Number(it.level) >= 1 && Number(it.level) <= 10 ? ok("Nivel entre 1 y 10.") : warn("El nivel debe estar entre 1 y 10.");
  }
  if (it.type === "arma") /^d\d+(\s*[+−-]\s*\d+)?(\s+(físico|mágico))?/i.test(it.damage || "") ? ok("Daño con formato de dados (por ejemplo d8+2 físico).") : warn("El daño debe tener formato de dados, por ejemplo d8+2 físico.");
  if (it.tokens?.on) { it.tokens.label?.trim() ? ok("Fichas: " + tokSummary(it.tokens) + ".") : warn("Ponle nombre a las fichas."); }
  if (it.type === "armadura") Number(it.major) < Number(it.severe) ? ok("El umbral mayor es menor que el grave.") : warn("El umbral mayor debería ser menor que el grave.");
  if (["ascendencia", "comunidad", "subclase"].includes(it.type)) (it.features || []).some((f) => f.name && f.text) ? ok("Tiene al menos una característica completa.") : warn("Añade al menos una característica con nombre y texto.");
  if (len > 1100) warn("Mucho texto: la carta lo reduce y puede costar leerlo.");
  return out;
}

// Simulador de fichas: sumar, restar, vaciar y llenar, para probar la carta como se usaría en la partida.
function TokSim({ tokens, have, setHave, TokDice, color, bare }) {
  if (!tokens?.on || !TokDice) return null;
  const max = tokens.max;
  const n = Math.min(have, max);
  return (
    <div className="ws-toks" title={tokSummary(tokens)}>
      {!bare && <div className="ws-dice"><TokDice have={n} max={max} color={color} onPick={(k) => setHave(k + 1 === n ? k : k + 1)} /></div>}
      <div className="ws-tokbar">
        <button type="button" onClick={() => setHave(Math.max(0, n - 1))} disabled={n <= 0} aria-label="Restar una ficha"><Minus size={14} /></button>
        <b>{n}<small> / {max}</small> <em>{tokens.label || "fichas"}</em></b>
        <button type="button" onClick={() => setHave(Math.min(max, n + 1))} disabled={n >= max} aria-label="Sumar una ficha"><Plus size={14} /></button>
        <button type="button" onClick={() => setHave(0)} title="Vaciar"><RotateCcw size={13} /></button>
        <button type="button" onClick={() => setHave(max)} title="Llenar">Llenar</button>
      </div>
      <small>{tokSummary(tokens)}</small>
    </div>
  );
}

// Referencia de equilibrio de la plataforma (no son reglas oficiales): avisa de lo que se sale de lo habitual para el rango o el nivel.
const DMG_CAP = { 1: 9, 2: 12, 3: 15.5, 4: 20 }; // daño medio máximo orientativo por rango
export function balanceOf(it, level = 1) {
  const notes = [];
  const warn = (t) => notes.push({ ok: false, t });
  const ok = (t) => notes.push({ ok: true, t });
  if (it.type === "arma") {
    const m = String(it.damage || "").match(/(\d*)d(\d+)\s*([+−-]\s*\d+)?/i);
    if (m) {
      const mod = m[3] ? (/[−-]/.test(m[3]) ? -1 : 1) * Number(m[3].replace(/[^0-9]/g, "")) : 0;
      const avg = (Number(m[1] || 1) * (Number(m[2]) + 1)) / 2 + mod;
      const cap = DMG_CAP[Number(it.tier) || 1];
      avg > cap ? warn("Daño medio " + avg.toFixed(1) + ": por encima de lo habitual para el rango " + (it.tier || 1) + " (máx. orientativo " + cap + ").") : ok("Daño medio " + avg.toFixed(1) + ", dentro de lo habitual para el rango " + (it.tier || 1) + ".");
    } else warn("El daño no tiene formato de dados.");
  }
  if (it.type === "armadura") {
    const cap = (Number(it.tier) || 1) + 3;
    Number(it.score) > cap ? warn("Puntuación " + it.score + ": por encima de lo habitual para el rango " + (it.tier || 1) + " (máx. orientativo " + cap + ").") : ok("Puntuación dentro de lo habitual.");
  }
  if (it.type === "dominio") {
    Number(it.level) > level ? warn("Es de nivel " + it.level + " y el personaje es de nivel " + level + ": no podría llevarla todavía.") : ok("Nivel de carta compatible con el personaje.");
    String(it.text || "").length > 600 && warn("Texto muy largo: conviene que sea más sencilla.");
  }
  if (it.type === "ascendencia" && (it.features || []).length > 2) warn("Las ascendencias oficiales tienen 2 características.");
  if (it.type === "comunidad" && (it.features || []).length > 1) warn("Las comunidades oficiales tienen 1 característica.");
  if (it.type === "subclase") {
    const per = {};
    (it.features || []).forEach((f) => { per[f.stage || "Fundación"] = (per[f.stage || "Fundación"] || 0) + 1; });
    Object.values(per).some((n) => n > 3) && warn("Una etapa de subclase tiene más de 3 características.");
  }
  if (it.tokens?.on && Number(it.tokens.max) > 5) warn("Más de 5 fichas es mucho para una sola carta.");
  if (it.type === "objeto") warn("Los objetos personalizados los valida el DJ de la mesa.");
  if (!notes.some((n) => !n.ok)) return { level: "ok", notes };
  return { level: "warn", notes };
}

// Inclinación de la carta al pasar el ratón (igual que en la pestaña Cartas).
const tiltOn = (e) => {
  const el = e.currentTarget, r = el.getBoundingClientRect();
  const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  el.style.setProperty("--ry", `${(px - 0.5) * 20}deg`);
  el.style.setProperty("--rx", `${(0.5 - py) * 16}deg`);
  el.style.setProperty("--mx", `${px * 100}%`);
  el.style.setProperty("--my", `${py * 100}%`);
  el.dataset.active = "1";
};
const tiltOff = (e) => {
  const el = e.currentTarget;
  ["--rx", "--ry", "--mx", "--my"].forEach((p) => el.style.removeProperty(p));
  delete el.dataset.active;
};

function shrinkImage(file, max = 640) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

export function WorkshopPage({ FitTitle, FitBox, TokDice, domainColors, icons, classColors, classes }) {
  const ctx = { domainColors, icons, classColors };
  const [items, setItems] = useState(null);
  const [sel, setSel] = useState(null); // id del elemento abierto
  const [draft, setDraft] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [q, setQ] = useState("");
  const [rank, setRank] = useState(0);
  const [msg, setMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const [tokHave, setTokHave] = useState(0); // fichas de ejemplo en la vista previa
  const [wstep, setWstep] = useState(0); // paso del asistente (0 = Identidad)
  const [showCtx, setShowCtx] = useState(false); // panel «cómo se vería» en la ventana grande
  const [mode, setMode] = useState("edit"); // "view": ficha en grande · "edit": editor
  const fileRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => {
    let alive = true;
    storageGet(KEY, false).then((r) => {
      let list = [];
      try { list = JSON.parse(r?.value || "[]"); } catch (e) { list = []; }
      if (alive) setItems(Array.isArray(list) ? list : []);
    }).catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, []);

  const persist = async (list) => {
    setItems(list);
    try { await storageSet(KEY, JSON.stringify(list), false); } catch (e) { setMsg("No se pudo guardar en la cuenta. Vuelve a intentarlo."); }
  };
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2600); };

  const create = (type) => {
    const it = blank(type);
    setDraft(it);
    setSel(it.id);
    setRank(0);
    setTokHave(0);
    setWstep(0);
    setMode("edit");
    setDirty(true);
  };
  const addTemplate = async (tpl) => {
    const it = tpl.make();
    await persist([it, ...(items || [])]);
    setDraft(JSON.parse(JSON.stringify(it)));
    setSel(it.id);
    setRank(0);
    setTokHave(it.tokens?.start === "full" ? it.tokens.max : 0);
    setMode("view");
    setDirty(false);
    flash("«" + it.name + "» añadida a tu biblioteca.");
  };
  const open = (it) => {
    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Descartarlos?")) return;
    setDraft(JSON.parse(JSON.stringify(it)));
    setSel(it.id);
    setRank(0);
    setTokHave(it.tokens?.start === "full" ? it.tokens.max : 0);
    setMode("view");
    setDirty(false);
  };
  const closeView = () => { setDraft(null); setSel(null); setMode("edit"); };
  useEffect(() => {
    if (mode !== "view" || !draft) return;
    const k = (e) => e.key === "Escape" && closeView();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [mode, draft]);
  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true); };
  const setFeat = (i, patch) => set({ features: draft.features.map((f, k) => (k === i ? { ...f, ...patch } : f)) });
  const save = async () => {
    if (!draft || !draft.name.trim()) return;
    const next = { ...draft, name: draft.name.trim(), updatedAt: Date.now() };
    const exists = (items || []).some((x) => x.id === next.id);
    await persist(exists ? items.map((x) => (x.id === next.id ? next : x)) : [next, ...items]);
    setDraft(next);
    setDirty(false);
    setMode("view");
    flash("Guardado en tu Taller.");
  };
  const remove = async () => {
    if (!draft || !window.confirm("¿Eliminar «" + (draft.name || "sin nombre") + "»? No se puede deshacer.")) return;
    await persist((items || []).filter((x) => x.id !== draft.id));
    setDraft(null);
    setSel(null);
    setDirty(false);
  };
  const duplicate = async () => {
    if (!draft) return;
    const copy = { ...JSON.parse(JSON.stringify(draft)), id: blank(draft.type).id, name: (draft.name || "Sin nombre") + " (copia)", createdAt: Date.now() };
    await persist([copy, ...(items || [])]);
    setDraft(copy);
    setSel(copy.id);
    setDirty(false);
    setMode("view");
    flash("Copia creada.");
  };
  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ app: "enaris-taller", version: 1, items }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "taller-enaris.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importFile = async (file) => {
    try {
      const data = JSON.parse(await file.text());
      const list = (Array.isArray(data) ? data : data.items || []).filter((x) => x && TYPES.some((t) => t.key === x.type) && typeof x.name === "string");
      if (!list.length) return flash("No he encontrado elementos válidos en ese archivo.");
      const fresh = list.map((x) => ({ ...x, id: blank(x.type).id, createdAt: Date.now() }));
      await persist([...fresh, ...(items || [])]);
      flash("Importados " + fresh.length + " elementos.");
    } catch (e) { flash("El archivo no es un JSON válido."); }
  };
  const pickImage = async (file) => {
    if (!file) return;
    try { set({ image: await shrinkImage(file) }); } catch (e) { flash("No se pudo leer la imagen."); }
  };

  const shown = useMemo(() => (items || []).filter((x) => (!typeFilter || x.type === typeFilter) && (!q.trim() || (x.name || "").toLowerCase().includes(q.trim().toLowerCase()))), [items, typeFilter, q]);
  const counts = (k) => (items || []).filter((x) => x.type === k).length;
  const entry = draft ? toEntry(draft, ctx, rank) : null;
  const tinfo = draft ? typeOf(draft.type) : null;
  const domains = useMemo(() => [...new Set([...Object.keys(domainColors).filter((d) => d !== "Sangre"), ...(items || []).filter((x) => x.type === "dominio").map((x) => x.domain)])], [domainColors, items]);

  const L = (label, node, hint) => (
    <label className="ws-f"><span>{label}</span>{node}{hint && <em>{hint}</em>}</label>
  );
  const Seg = ({ value, options, onChange, fmt = (x) => x }) => (
    <div className="ws-seg" role="radiogroup">
      {options.map((o) => <button key={o} type="button" role="radio" aria-checked={String(value) === String(o)} className={String(value) === String(o) ? "on" : ""} onClick={() => onChange(o)}>{fmt(o)}</button>)}
    </div>
  );
  const ImageField = () => L("Ilustración", (
    <div className="ws-imgf">
      <div className="ws-img">
        {draft.image ? <img src={draft.image} alt="" /> : <div className="ws-img-e"><Upload size={16} /></div>}
        <div>
          <button type="button" className="mh-btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={14} /> {draft.image ? "Cambiar imagen" : "Subir imagen"}</button>
          {draft.image && <button type="button" className="mh-btn-ghost" onClick={() => set({ image: "", imgZoom: 1, imgX: 50, imgY: 30, fullArt: false })}><X size={14} /> Quitar</button>}
        </div>
      </div>
      {draft.image && (
        <>
          <label className="ws-tok-sw"><input type="checkbox" checked={!!draft.fullArt} onChange={(e) => set({ fullArt: e.target.checked })} /> <span>Ilustración a toda la carta (full art): el texto va abajo sobre un velo oscuro</span></label>
          <div className="ws-crop" aria-label="Encuadre en la carta" style={draft.type === "arma" || draft.type === "armadura" || draft.fullArt ? { aspectRatio: "300 / 420", maxWidth: 170 } : undefined}><img src={draft.image} alt="" style={{ objectPosition: (draft.imgX ?? 50) + "% " + (draft.imgY ?? 30) + "%", transform: "scale(" + (Number(draft.imgZoom) || 1) + ")", transformOrigin: (draft.imgX ?? 50) + "% " + (draft.imgY ?? 30) + "%" }} /></div>
          <div className="ws-zoom">
            <label><span>Zoom <b>{(Number(draft.imgZoom) || 1).toFixed(2)}×</b></span><input type="range" min="1" max="3" step="0.05" value={Number(draft.imgZoom) || 1} onChange={(e) => set({ imgZoom: Number(e.target.value) })} /></label>
            <label><span>Horizontal</span><input type="range" min="0" max="100" value={draft.imgX ?? 50} onChange={(e) => set({ imgX: Number(e.target.value) })} /></label>
            <label><span>Vertical</span><input type="range" min="0" max="100" value={draft.imgY ?? 30} onChange={(e) => set({ imgY: Number(e.target.value) })} /></label>
            <button type="button" className="mh-btn-ghost" onClick={() => set({ imgZoom: 1, imgX: 50, imgY: 30 })}><RotateCcw size={13} /> Restablecer</button>
          </div>
        </>
      )}
    </div>
  ), "Opcional. Se reduce automáticamente. Ajusta el zoom y el encuadre para el recuadro de la carta.");
  const TokField = () => {
    const t = draft.tokens || NO_TOK;
    const setTok = (patch) => set({ tokens: { ...NO_TOK, ...t, ...patch } });
    return (
      <div className="ws-tok">
        <label className="ws-tok-sw"><input type="checkbox" checked={!!t.on} onChange={(e) => setTok({ on: e.target.checked })} /> <span>Esta carta usa fichas</span></label>
        {t.on && (
          <>
            <div className="ws-r3">
              {L("Nombre de la ficha", <input className="mh-input" maxLength={24} value={t.label} onChange={(e) => setTok({ label: e.target.value })} placeholder="Combo, Caos, Inspiración…" />)}
              {L("Cuántas (máx.)", <Seg value={t.max} options={[1, 2, 3, 4, 5, 6]} onChange={(v) => setTok({ max: Number(v) })} />)}
              {L("Al empezar", <Seg value={t.start} options={["empty", "full"]} onChange={(v) => setTok({ start: v })} fmt={(v) => (v === "full" ? "Llenas" : "Vacías")} />)}
            </div>
            {L("Se reponen o se pierden", <Seg value={t.reset} options={RESETS.map((r) => r[0])} onChange={(v) => setTok({ reset: v })} fmt={(v) => RESETS.find((r) => r[0] === v)?.[1]} />, "Explica en el texto de la carta cuándo se ganan y cuándo se gastan.")}
          </>
        )}
      </div>
    );
  };
  const Feats = ({ stages }) => (
    <div className="ws-feats">
      {draft.features.map((f, i) => (
        <div key={i} className="ws-feat">
          <div className="ws-feat-h">
            <input className="mh-input" placeholder="Nombre de la característica" maxLength={60} value={f.name} onChange={(e) => setFeat(i, { name: e.target.value })} />
            {stages && <select className="mh-input ws-stage" value={f.stage || "Fundación"} onChange={(e) => setFeat(i, { stage: e.target.value })}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select>}
            <button type="button" className="mh-btn-ghost" aria-label="Quitar característica" onClick={() => set({ features: draft.features.filter((_, k) => k !== i) })}><X size={14} /></button>
          </div>
          <textarea className="mh-input" rows={3} placeholder="Texto de la característica" value={f.text} onChange={(e) => setFeat(i, { text: e.target.value })} />
        </div>
      ))}
      <button type="button" className="mh-btn-ghost" onClick={() => set({ features: [...draft.features, stages ? { name: "", text: "", stage: "Fundación" } : { name: "", text: "" }] })}><Plus size={14} /> Añadir característica</button>
    </div>
  );

  return (
    <div className="ws">
      <style>{CSS}</style>
      <div className="ws-top">
        <div>
          <h1 className="mh-serif">Taller</h1>
          <p>Crea tu propio contenido: cartas de dominio, ascendencias, comunidades, subclases, armas, armaduras y objetos. Por ahora es privado y se guarda en tu cuenta.</p>
        </div>
        <div className="ws-top-a">
          <button type="button" className="mh-btn-ghost" onClick={() => importRef.current?.click()}><Upload size={14} /> Importar</button>
          <button type="button" className="mh-btn-ghost" disabled={!items?.length} onClick={exportAll}><Download size={14} /> Exportar todo</button>
        </div>
        <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; f && importFile(f); }} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; pickImage(f); }} />
      </div>
      <div className="ws-grid">
        <aside className="ws-lib">
          <div className="ws-new">
            <h3>Crear nuevo</h3>
            <div className="ws-new-g">
              {TYPES.map((t) => (
                <button key={t.key} type="button" onClick={() => create(t.key)} style={{ "--c": t.color }}><t.Icon size={15} /> {t.label}</button>
              ))}
            </div>
          </div>
          <div className="ws-tpl">
            <h3>Plantillas</h3>
            <div className="ws-new-g">
              {TEMPLATES.map((t) => <button key={t.key} type="button" onClick={() => addTemplate(t)} style={{ "--c": "#E8C547" }}><Plus size={15} /> <span>{t.label}<small>{t.sub}</small></span></button>)}
            </div>
          </div>
          <div className="ws-lib-h">
            <h3>Mi biblioteca <em>{(items || []).length}</em></h3>
            <label className="ws-search"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" aria-label="Buscar en el Taller" /></label>
            <div className="ws-chips">
              <button type="button" className={!typeFilter ? "on" : ""} onClick={() => setTypeFilter("")}>Todo</button>
              {TYPES.filter((t) => counts(t.key) > 0).map((t) => <button key={t.key} type="button" className={typeFilter === t.key ? "on" : ""} onClick={() => setTypeFilter(typeFilter === t.key ? "" : t.key)}>{t.plural} · {counts(t.key)}</button>)}
            </div>
          </div>
          {items === null && <p className="ws-empty">Cargando…</p>}
          {items && !shown.length && <p className="ws-empty">{items.length ? "Nada con ese filtro." : "Aún no has creado nada. Elige un tipo arriba para empezar."}</p>}
          {TYPES.map((t) => {
            const list = shown.filter((x) => x.type === t.key);
            if (!list.length) return null;
            return (
              <section key={t.key}>
                <div className="cx-lv"><b>{t.plural}</b><span /><small>{list.length} carta{list.length === 1 ? "" : "s"}</small></div>
                <div className="cx-grid ws-gal">
                  {list.map((x) => {
                    const e = toEntry(x, ctx, 0);
                    return (
                      <button type="button" key={x.id} className="cx-card" onClick={() => open(x)} aria-label={"Ver " + (x.name || "carta")}>
                        <CardFace c={e} I={e.Icon} FitTitle={FitTitle} FitBox={FitBox} tilt={e.kind === "dominio" || (e.kind === "arma" && e.tier === 4) ? { onPointerMove: (ev) => ev.pointerType === "mouse" && tiltOn(ev), onPointerLeave: tiltOff } : undefined} />
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </aside>

        {draft && mode === "view" && entry && typeof document !== "undefined" && createPortal(
          <div className="mh-overlay" style={{ background: "rgba(8,6,12,0.70)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 20, overflowY: "auto", alignItems: "flex-start" }} onClick={closeView} role="dialog" aria-modal="true" aria-label={draft.name}>
            <div className={"ws-ovr" + (draft.tokens?.on ? " has-tok" : "")} onClick={(e) => e.stopPropagation()}>
              <div className="ws-ovc">
                <div className="mh-cardc-wrap" style={{ position: "relative" }}>
                  <CardFace c={entry} I={entry.Icon} FitTitle={FitTitle} FitBox={FitBox} onClose={closeView} tilt={{ onPointerMove: tiltOn, onPointerLeave: tiltOff, onPointerUp: (e) => e.pointerType !== "mouse" && tiltOff(e) }} />
                  {draft.tokens?.on && TokDice && (
                    <div className="mh-fan-tray" role="group" aria-label="Fichas sobre la carta" style={{ "--s": draft.tokens.max > 5 ? Math.max(0.6, (5.2 / draft.tokens.max) * 1.15) : undefined }}>
                      <TokDice have={Math.min(tokHave, draft.tokens.max)} max={draft.tokens.max} color={entry.color} onPick={(k) => setTokHave(k + 1 === Math.min(tokHave, draft.tokens.max) ? k : k + 1)} />
                    </div>
                  )}
                </div>
                {draft.type === "subclase" && <div className="ws-rank">{STAGES.map((st, i) => <button key={st} type="button" className={rank === i ? "on" : ""} onClick={() => setRank(i)}>{st}</button>)}</div>}
                <TokSim bare tokens={draft.tokens} have={tokHave} setHave={setTokHave} TokDice={TokDice} color={entry.color} />
                <div className="ws-acts ws-ovb">
                  <button type="button" className="mh-btn" onClick={() => { setWstep(0); setMode("edit"); }}><Pencil size={15} /> Modificar</button>
                  <button type="button" className="mh-btn-ghost" onClick={duplicate}><Copy size={14} /> Duplicar</button>
                  <button type="button" className={"mh-btn-ghost" + (showCtx ? " is-on" : "")} onClick={() => setShowCtx((v) => !v)}><Layers size={14} /> Cómo se vería</button>
                  <button type="button" className="mh-btn-ghost ws-del" onClick={remove}><Trash2 size={14} /> Eliminar</button>
                </div>
                {msg && <em className="ws-msg">{msg}</em>}
              </div>
              {showCtx && (
                <div className="ws-ctx">
                  <h3>Así se vería en el juego</h3>
                  <div className="ws-ctx-g">
                    {["dominio", "arma", "armadura", "objeto"].includes(draft.type) && (
                      <div className="ws-cx"><b>En la mano</b><div className="ws-hand"><div className="ws-hand-c"><CardFace c={entry} I={entry.Icon} FitTitle={FitTitle} FitBox={FitBox} /></div></div>{draft.tokens?.on && TokDice && <div className="ws-hand-t"><div className="ws-dice"><TokDice have={Math.min(tokHave, draft.tokens.max)} max={draft.tokens.max} color={entry.color} /></div></div>}</div>
                    )}
                    {["arma", "armadura", "objeto"].includes(draft.type) && (
                      <div className="ws-cx"><b>En la hoja y la mochila</b>
                        <div className="ws-row" style={{ "--c": entry.color }}><i><entry.Icon size={18} /></i><span><strong>{entry.key}</strong><small>{entry.sub}</small></span>{entry.gear && <em>{entry.gear.big} {entry.gear.small}</em>}</div>
                      </div>
                    )}
                    {draft.type === "dominio" && (
                      <div className="ws-cx"><b>En tu baraja</b>
                        <div className="ws-row" style={{ "--c": entry.color }}><i><entry.Icon size={18} /></i><span><strong>{entry.key}</strong><small>{entry.sub}</small></span><em>Nv {draft.level}</em></div>
                      </div>
                    )}
                    <div className="ws-cx"><b>En el mapa</b>
                      <div className="ws-map"><div className="ws-pawn" style={{ "--c": entry.color }}><entry.Icon size={20} />{draft.tokens?.on && <span>{Math.min(tokHave, draft.tokens.max)}</span>}</div><small>{draft.tokens?.on ? "La insignia muestra las fichas que tiene." : "Aparece como icono sobre el mapa."}</small></div>
                    </div>
                  </div>
                  <p className="ws-note">Vista orientativa: por ahora el contenido del Taller no se puede equipar ni jugar en la hoja, la mano o el mapa.</p>
                </div>
              )}
            </div>
          </div>, document.querySelector(".mh-root") || document.body)}
        {(mode === "edit" || !draft) && (!draft ? (
          <div className="ws-blank"><Hammer size={34} strokeWidth={1.4} /><h2 className="mh-serif">¿Qué quieres crear hoy?</h2><p>Elige un tipo arriba y te guiaremos paso a paso, con la carta a la vista mientras la escribes. También puedes empezar desde una plantilla o abrir algo de tu biblioteca para modificarlo.</p></div>
        ) : (() => {
          const T = draft.type;
          const STEPS = {
            dominio: [["id", "Identidad"], ["rules", "Reglas"], ["text", "Texto"], ["art", "Arte y fichas"], ["review", "Revisar"]],
            ascendencia: [["id", "Identidad"], ["feats", "Características"], ["art", "Arte"], ["review", "Revisar"]],
            comunidad: [["id", "Identidad"], ["feats", "Características"], ["art", "Arte"], ["review", "Revisar"]],
            subclase: [["id", "Identidad"], ["feats", "Características"], ["art", "Arte"], ["review", "Revisar"]],
            arma: [["id", "Identidad"], ["rules", "Reglas"], ["text", "Texto"], ["art", "Arte y fichas"], ["review", "Revisar"]],
            armadura: [["id", "Identidad"], ["rules", "Reglas"], ["text", "Texto"], ["art", "Arte"], ["review", "Revisar"]],
            objeto: [["id", "Identidad"], ["text", "Descripción"], ["art", "Arte"], ["review", "Revisar"]],
          }[T];
          const idx = Math.min(wstep, STEPS.length - 1);
          const cur = STEPS[idx][0];
          const last = idx === STEPS.length - 1;
          const saved = (items || []).some((x) => x.id === draft.id);
          const TITLES = {
            id: ["Dale identidad", T === "dominio" ? "El nombre y el dominio definen su color y su logo." : "El nombre es lo primero que se lee en la carta."],
            rules: [T === "arma" ? "Las reglas del arma" : T === "armadura" ? "Las cifras de la armadura" : "Las reglas de la carta", "Nivel, coste y números que usa en la partida."],
            feats: ["Características", T === "subclase" ? "Fundación, especialización y maestría." : T === "ascendencia" ? "Las ascendencias oficiales tienen dos." : "Las comunidades oficiales tienen una."],
            text: [T === "objeto" ? "Cuéntanos qué es" : "Escribe el efecto", "Lo que pone la carta: alcance, tirada y resultado."],
            art: ["Ilustración y fichas", "Opcional. Sin imagen, la carta usa el logo o el icono del tipo."],
            review: ["Revisa y guarda", "Esto es lo que verán tus jugadores."],
          }[cur];
          const body = {
            id: (
              <>
                {L("Nombre", <input className="mh-input" autoFocus maxLength={60} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Por ejemplo: Llama de Cenizas" />)}
                {T === "dominio" && L("Dominio", (
                  <div className="ws-dom">
                    <Seg value={domains.includes(draft.domain) ? draft.domain : ""} options={domains} onChange={(v) => set({ domain: v })} />
                    <input className="mh-input" maxLength={24} value={draft.domain} onChange={(e) => set({ domain: e.target.value })} placeholder="o escribe un dominio propio" />
                  </div>
                ))}
                {(T === "ascendencia" || T === "comunidad" || T === "subclase") && (
                  <>
                    {T === "subclase" && L("Clase", <select className="mh-input" value={draft.cls} onChange={(e) => set({ cls: e.target.value })}><option value="">Sin clase concreta</option>{classes.map((c) => <option key={c}>{c}</option>)}</select>)}
                    {L("Descripción", <textarea className="mh-input" rows={4} value={draft.blurb} onChange={(e) => set({ blurb: e.target.value })} placeholder={T === "subclase" ? "Qué representa esta subclase. Puedes indicar el rasgo de conjuro." : "Cómo es esta " + (T === "ascendencia" ? "ascendencia." : "comunidad.")} />)}
                  </>
                )}
                {T === "arma" && (
                  <div className="ws-r3">
                    {L("Tipo", <Seg value={draft.slot} options={["Principal", "Secundaria"]} onChange={(v) => set({ slot: v })} />)}
                    {L("Manos", <Seg value={draft.hands} options={[1, 2]} onChange={(v) => set({ hands: Number(v) })} />)}
                    {L("Rango", <Seg value={draft.tier} options={[1, 2, 3, 4]} onChange={(v) => set({ tier: Number(v) })} fmt={(v) => TIER_LABEL[v]} />)}
                  </div>
                )}
                {T === "armadura" && L("Rango", <Seg value={draft.tier} options={[1, 2, 3, 4]} onChange={(v) => set({ tier: Number(v) })} fmt={(v) => TIER_LABEL[v]} />)}
              </>
            ),
            rules: T === "dominio" ? (
              <div className="ws-r3">
                {L("Tipo", <Seg value={draft.ctype} options={CTYPES} onChange={(v) => set({ ctype: v })} />)}
                {L("Nivel", <Seg value={draft.level} options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} onChange={(v) => set({ level: v })} />)}
                {L("Coste de recuperación", <Seg value={draft.recall} options={[0, 1, 2, 3, 4, 5]} onChange={(v) => set({ recall: v })} />)}
              </div>
            ) : T === "arma" ? (
              <div className="ws-r3">
                {L("Rasgo", <select className="mh-input" value={draft.trait} onChange={(e) => set({ trait: e.target.value })}>{TRAIT_NAMES.map((t) => <option key={t}>{t}</option>)}</select>)}
                {L("Alcance", <select className="mh-input" value={draft.range} onChange={(e) => set({ range: e.target.value })}>{RANGES.map((t) => <option key={t}>{t}</option>)}</select>)}
                {L("Daño", <input className="mh-input" value={draft.damage} onChange={(e) => set({ damage: e.target.value })} placeholder="d8+2 físico" />)}
              </div>
            ) : (
              <div className="ws-r3">
                {L("Puntuación base", <input className="mh-input" type="number" min={0} max={12} value={draft.score} onChange={(e) => set({ score: e.target.value })} />)}
                {L("Umbral mayor", <input className="mh-input" type="number" min={1} value={draft.major} onChange={(e) => set({ major: e.target.value })} />)}
                {L("Umbral grave", <input className="mh-input" type="number" min={1} value={draft.severe} onChange={(e) => set({ severe: e.target.value })} />)}
              </div>
            ),
            text:
              T === "dominio" ? L("Texto de la carta", <textarea className="mh-input" rows={9} value={draft.text} onChange={(e) => set({ text: e.target.value })} placeholder="Describe qué hace la carta, con el alcance, la tirada y el efecto." />, String(draft.text || "").length + " / 600")
              : T === "objeto" ? L("Descripción", <textarea className="mh-input" rows={9} value={draft.text} onChange={(e) => set({ text: e.target.value })} placeholder="Qué es, qué hace y cómo se usa." />)
              : L("Característica", <textarea className="mh-input" rows={9} value={draft.feature} onChange={(e) => set({ feature: e.target.value })} placeholder="Opcional: efecto especial. Puedes poner varias, una por línea." />),
            feats: L(T === "subclase" ? "Características por etapa" : "Características", T === "subclase" ? <Feats stages /> : <Feats />),
            art: (
              <>
                <ImageField />
                {(T === "dominio" || T === "arma") && <TokField />}
              </>
            ),
            review: (
              <>
                <div className="ws-chk">
                  <h3>Comprobaciones</h3>
                  {checks(draft).map((c, i) => <p key={i} className={c.ok ? "ok" : "wr"}><b>{c.ok ? "✓" : "!"}</b>{c.t}</p>)}
                </div>
                <div className="ws-chk">
                  <h3>Equilibrio</h3>
                  {balanceOf(draft, 10).notes.map((c, i) => <p key={i} className={c.ok ? "ok" : "wr"}><b>{c.ok ? "✓" : "!"}</b>{c.t}</p>)}
                </div>
              </>
            ),
          }[cur];
          return (
            <section className="ws-wiz">
              <div className="ws-stp" role="tablist" aria-label="Pasos de la creación">
                <button type="button" className="is-dn" onClick={() => closeView()} title="Cambiar de tipo: elige otro arriba"><b><Check size={13} strokeWidth={3} /></b><span>Tipo</span></button>
                {STEPS.map(([k, lab], i) => (
                  <span key={k} className="ws-stp-i">
                    <i />
                    <button type="button" role="tab" aria-selected={i === idx} className={i === idx ? "is-on" : i < idx ? "is-dn" : ""} onClick={() => setWstep(i)}><b>{i < idx ? <Check size={13} strokeWidth={3} /> : i + 2}</b><span>{lab}</span></button>
                  </span>
                ))}
              </div>
              <div className="ws-wz">
                <div className="ws-wz-l">
                  <div className="ws-wz-h"><span style={{ "--c": tinfo.color }}><tinfo.Icon size={14} /> {tinfo.label}</span>{dirty && <em>Cambios sin guardar</em>}</div>
                  <h2 className="ws-wz-t">{TITLES[0]}</h2>
                  <p className="ws-wz-s">{TITLES[1]}</p>
                  <div className="ws-wz-b" key={cur}>{body}</div>
                  <div className="ws-wz-n">
                    <button type="button" className="mh-btn-ghost" disabled={idx === 0} onClick={() => setWstep(idx - 1)}>‹ Atrás</button>
                    {msg && <span className="ws-msg">{msg}</span>}
                    {last ? (
                      <>
                        <button type="button" className="mh-btn-ghost" onClick={duplicate} disabled={!saved}><Copy size={14} /> Duplicar</button>
                        <button type="button" className="mh-btn-ghost ws-del" onClick={remove} disabled={!saved}><Trash2 size={14} /> Eliminar</button>
                        <button type="button" className="mh-btn" disabled={!draft.name.trim() || !dirty} onClick={save}><Check size={15} /> Guardar</button>
                      </>
                    ) : (
                      <button type="button" className="mh-btn" onClick={() => setWstep(idx + 1)}>Siguiente ›</button>
                    )}
                  </div>
                </div>
                <aside className="ws-wz-r">
                  {draft.type === "subclase" && <div className="ws-rank">{STAGES.map((st, i) => <button key={st} type="button" className={rank === i ? "on" : ""} onClick={() => setRank(i)}>{st}</button>)}</div>}
                  <div className="ws-card"><CardFace c={entry} I={entry.Icon} FitTitle={FitTitle} FitBox={FitBox} /></div>
                  <TokSim tokens={draft.tokens} have={tokHave} setHave={setTokHave} TokDice={TokDice} color={entry.color} />
                  <small className="ws-wz-cap">Vista previa en vivo · se actualiza al escribir</small>
                </aside>
              </div>
            </section>
          );
        })())}
      </div>
    </div>
  );
}

const CSS = `
.ws-wiz { background: var(--mh-panel); border: 1px solid var(--mh-line); border-radius: 20px; padding: 18px 22px 20px; display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.ws-stp { display: flex; align-items: center; flex-wrap: wrap; row-gap: 8px; } .ws-stp button { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font: 600 12.5px var(--font-body), 'Inter', system-ui, sans-serif; color: var(--mh-muted2); } .ws-stp button b { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--mh-line2); display: grid; place-items: center; font-size: 12px; } .ws-stp button.is-on { color: var(--mh-ink); } .ws-stp button.is-on b { background: #E3B04B; border-color: #E3B04B; color: #1a1408; } .ws-stp button.is-dn b { background: #6FBF73; border-color: #6FBF73; color: #0a1a0e; } .ws-stp button:focus-visible { outline: 2px solid #E3B04B; outline-offset: 3px; border-radius: 99px; }
.ws-stp-i { display: inline-flex; align-items: center; } .ws-stp-i i { width: 30px; height: 2px; background: var(--mh-line); margin: 0 10px; flex: none; }
.ws-wz { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 26px; align-items: start; }
.ws-wz-l { display: flex; flex-direction: column; gap: 14px; min-height: 500px; min-width: 0; } .ws-wz-h { display: flex; align-items: center; justify-content: space-between; } .ws-wz-h span { display: inline-flex; align-items: center; gap: 7px; font: 700 11px var(--font-body), 'Inter', system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--c); } .ws-wz-h em { font-style: normal; font-size: 12px; color: #E3B04B; }
.ws-wz-t { margin: 0; font-size: 22px; font-weight: 700; color: var(--mh-ink); } .ws-wz-s { margin: -8px 0 0; color: var(--mh-muted); font-size: 13px; }
.ws-wz-b { display: flex; flex-direction: column; gap: 16px; animation: ws-stp-in .25s ease both; } @keyframes ws-stp-in { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } } @media (prefers-reduced-motion: reduce) { .ws-wz-b { animation: none; } }
.ws-wz-n { margin-top: auto; padding-top: 14px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; } .ws-wz-n .mh-btn:last-child { margin-left: auto; } .ws-wz-n .ws-del { margin-left: auto; } .ws-wz-n .ws-del + .mh-btn { margin-left: 0; }
.ws-wz-r { display: flex; flex-direction: column; align-items: center; gap: 10px; position: sticky; top: 8px; } .ws-wz-cap { color: var(--mh-muted2); font-size: 11.5px; }
@media (max-width: 1100px) { .ws-wz { grid-template-columns: minmax(0, 1fr); } .ws-wz-r { position: static; } }
.ws-blank { background: var(--mh-panel); border: 1px dashed var(--mh-line2); border-radius: 20px; padding: 44px 24px; text-align: center; color: var(--mh-muted); display: flex; flex-direction: column; align-items: center; gap: 8px; } .ws-blank h2 { margin: 6px 0 0; color: var(--mh-ink); } .ws-blank p { margin: 0; max-width: 520px; line-height: 1.55; }
.ws { display: flex; flex-direction: column; gap: 14px; }
.ws-top { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; } .ws-top > div:first-child { flex: 1; min-width: 260px; } .ws-top h1 { margin: 0 0 4px; font-size: 28px; } .ws-top p { margin: 0; color: var(--mh-muted); font-size: 13px; max-width: 640px; line-height: 1.5; }
.ws-top-a { display: flex; gap: 8px; } .ws-top-a button, .ws-acts button, .ws-img button, .ws-feats > button { display: inline-flex; align-items: center; gap: 6px; }
.ws-grid { display: flex; flex-direction: column; gap: 14px; } .ws-work { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 14px; align-items: start; }
.ws-lib, .ws-ed, .ws-pv { background: var(--mh-panel); border: 1px solid var(--mh-line); border-radius: 18px; padding: 14px; min-width: 0; }
.ws h3 { margin: 0 0 8px; font: 700 11px var(--font-body), 'Inter', system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--mh-muted); display: flex; align-items: center; gap: 8px; } .ws h3 em { font-style: normal; color: var(--mh-muted2); }
.ws-new-g { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 6px; } .ws-new-g button { all: unset; cursor: pointer; box-sizing: border-box; display: flex; align-items: center; gap: 7px; padding: 8px 9px; border-radius: 10px; border: 1px solid var(--mh-line); background: var(--mh-panel2); color: var(--mh-ink); font-size: 11.5px; font-weight: 600; } .ws-new-g button svg { color: var(--c); flex: none; } .ws-new-g button:hover { border-color: var(--c); } .ws-new-g button:focus-visible { outline: 2px solid #E3B04B; }
.ws-tpl { margin-top: 14px; } .ws-new-g button span small { display: block; font-weight: 400; color: var(--mh-muted2); font-size: 10px; }
.ws-tok { border: 1px dashed var(--mh-line2); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; } .ws-tok-sw { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; } .ws-tok-sw input { width: 16px; height: 16px; accent-color: #E3B04B; }
.ws-toks { align-self: stretch; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; border-radius: 12px; background: var(--mh-panel2); border: 1px solid var(--mh-line); } .ws-toks small { font-size: 10.5px; color: var(--mh-muted2); text-align: center; }
.ws-tokbar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; } .ws-tokbar button { all: unset; cursor: pointer; box-sizing: border-box; min-width: 30px; height: 30px; padding: 0 9px; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; border: 1px solid var(--mh-line2); background: var(--mh-panel); color: var(--mh-text); font-size: 11.5px; font-weight: 600; } .ws-tokbar button:disabled { opacity: .35; cursor: default; } .ws-tokbar button:hover:not(:disabled) { border-color: #E3B04B; } .ws-tokbar b { font-size: 15px; padding: 0 6px; } .ws-tokbar b small { font-size: 11px; color: var(--mh-muted2); } .ws-tokbar b em { font-style: normal; font-size: 11px; font-weight: 500; color: var(--mh-muted); }
.ws-ovr.has-tok { padding-right: 76px; } .ws-ovr { display: flex; align-items: flex-start; justify-content: center; gap: 22px; flex-wrap: nowrap; max-width: 100%; margin: auto; } @media (max-width: 900px) { .ws-ovr { flex-wrap: wrap; justify-content: center; } } .ws-ovc { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 340px; max-width: 100%; flex: none; } .ws-ovr .ws-ctx { flex: none; width: 340px; max-width: 100%; background: var(--mh-panel); border: 1px solid var(--mh-line); border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 12px; } .ws-ovb { justify-content: center; flex-wrap: wrap; width: 100%; } .ws-ovb .ws-del { margin-left: 0; } .ws-ovb .is-on { border-color: #E3B04B; color: #E3B04B; } .ws-ovr .ws-toks { align-self: center; width: 300px; max-width: 100%; }
.ws-gal { margin-top: 0; } .ws-gsel { outline: 2px solid #E3B04B; outline-offset: 3px; border-radius: 16px; }
.ws-modal { position: fixed; inset: 0; z-index: 80; background: rgba(8,6,12,.78); overflow-y: auto; padding: 28px 20px; display: flex; align-items: flex-start; justify-content: center; } .ws-x { all: unset; cursor: pointer; position: fixed; top: 14px; right: 18px; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: var(--mh-panel); border: 1px solid var(--mh-line2); color: var(--mh-text); z-index: 2; }
.ws-view { width: min(860px, 100%); display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 14px; align-items: start; } .ws-vmain, .ws-ctx { background: var(--mh-panel); border: 1px solid var(--mh-line); border-radius: 18px; padding: 16px; min-width: 0; display: flex; flex-direction: column; gap: 12px; } .ws-vname { margin: 0; font-size: 26px; } .ws-card-big { margin: 4px 0; } .ws-dice { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; min-height: 54px; } .ws-vmain .ws-rank { justify-content: center; }
.ws-ctx-g { display: flex; flex-direction: column; gap: 10px; } .ws-cx { border: 1px solid var(--mh-line); background: var(--mh-panel2); border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; } .ws-cx > b { font: 700 10.5px var(--font-body), 'Inter', system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--mh-muted); } .ws-cx small, .ws-note { font-size: 11.5px; color: var(--mh-muted2); margin: 0; }
.ws-hand { height: 190px; overflow: hidden; display: flex; justify-content: center; } .ws-hand-c { transform: scale(.48); transform-origin: top center; flex: none; } .ws-hand-t { display: flex; justify-content: center; }
.ws-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; border: 1px solid var(--mh-line); background: var(--mh-panel); } .ws-row i { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); flex: none; } .ws-row span { flex: 1; min-width: 0; display: flex; flex-direction: column; } .ws-row strong { font-size: 13px; } .ws-row em { font-style: normal; font-weight: 700; font-size: 12px; color: var(--c); white-space: nowrap; }
.ws-map { display: flex; align-items: center; gap: 12px; } .ws-pawn { position: relative; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: var(--c); border: 3px solid rgba(255,255,255,.85); box-shadow: 0 3px 10px #0006; flex: none; } .ws-pawn span { position: absolute; right: -6px; top: -6px; min-width: 20px; height: 20px; border-radius: 99px; background: #E3B04B; color: #1a1408; font: 800 11px Inter, sans-serif; display: grid; place-items: center; border: 2px solid var(--mh-panel); }
@media (max-width: 1100px) { .ws-view { grid-template-columns: minmax(0, 1fr); } }
.ws-imgf { display: flex; flex-direction: column; gap: 10px; } .ws-crop { width: 100%; max-width: 300px; aspect-ratio: 300 / 124; overflow: hidden; border-radius: 12px; border: 1px solid var(--mh-line2); background: #000; } .ws-crop img { width: 100%; height: 100%; object-fit: cover; display: block; } .ws-zoom { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; align-items: end; max-width: 520px; } .ws-zoom label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--mh-muted); } .ws-zoom label b { color: var(--mh-text); } .ws-zoom input { accent-color: #E3B04B; width: 100%; } .ws-zoom button { display: inline-flex; align-items: center; gap: 5px; justify-self: start; }
.ws-lib-h { margin-top: 14px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; } .ws-lib-h h3 { margin: 0; } .ws-lib-h .ws-search { width: 220px; } .ws-lib-h .ws-chips { margin: 0; } .ws-search { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid var(--mh-line); border-radius: 10px; background: var(--mh-input); color: var(--mh-muted); } .ws-search input { all: unset; flex: 1; min-width: 0; font-size: 12.5px; color: var(--mh-ink); }
.ws-chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0; } .ws-chips button { all: unset; cursor: pointer; font-size: 10.5px; padding: 3px 9px; border-radius: 99px; border: 1px solid var(--mh-line2); color: var(--mh-muted); } .ws-chips button.on { background: #E3B04B; border-color: #E3B04B; color: #1d1606; font-weight: 700; }
.ws-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; max-height: 176px; overflow-y: auto; scrollbar-width: thin; margin-top: 4px; } .ws-empty { color: var(--mh-muted2); font-size: 12.5px; margin: 6px 2px; line-height: 1.45; }
.ws-it { all: unset; cursor: pointer; box-sizing: border-box; display: flex; align-items: center; gap: 9px; padding: 8px 9px; border-radius: 11px; border: 1px solid var(--mh-line); background: var(--mh-panel2); } .ws-it i { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: color-mix(in srgb, var(--c) 22%, transparent); color: var(--c); flex: none; } .ws-it b { display: block; font-size: 13px; color: var(--mh-ink); } .ws-it small { color: var(--mh-muted2); font-size: 10.5px; } .ws-it.on { border-color: #E3B04B; background: #E3B04B14; } .ws-it:focus-visible { outline: 2px solid #E3B04B; }
.ws-ed { display: flex; flex-direction: column; gap: 12px; } .ws-ed-h { display: flex; align-items: center; justify-content: space-between; } .ws-ed-h span { display: inline-flex; align-items: center; gap: 7px; font: 700 12px var(--font-body), 'Inter', system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: var(--c); } .ws-ed-h em { font-style: normal; font-size: 11px; color: #E3B04B; }
.ws-f { display: flex; flex-direction: column; gap: 5px; min-width: 0; } .ws-f > span { font: 700 10.5px var(--font-body), 'Inter', system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--mh-muted); } .ws-f > em { font-style: normal; font-size: 11px; color: var(--mh-muted2); } .ws-f textarea { resize: vertical; line-height: 1.45; font-family: inherit; }
.ws-r3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.ws-seg { display: flex; flex-wrap: wrap; gap: 5px; } .ws-seg button { all: unset; cursor: pointer; font-size: 12px; padding: 5px 10px; border-radius: 8px; border: 1px solid var(--mh-line2); background: var(--mh-panel2); color: var(--mh-ink3); } .ws-seg button.on { border-color: #E3B04B; background: #E3B04B22; color: var(--mh-ink); font-weight: 600; } .ws-seg button:focus-visible { outline: 2px solid #E3B04B; }
.ws-dom { display: flex; flex-direction: column; gap: 8px; }
.ws-feats { display: flex; flex-direction: column; gap: 10px; } .ws-feat { border: 1px solid var(--mh-line); border-left: 3px solid #E3B04B; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px; background: var(--mh-panel2); } .ws-feat-h { display: flex; gap: 8px; align-items: center; } .ws-feat-h .mh-input { flex: 1; min-width: 0; } .ws-feat-h .ws-stage { flex: none; width: 150px; }
.ws-img { display: flex; align-items: center; gap: 12px; } .ws-img img, .ws-img-e { width: 84px; height: 84px; border-radius: 12px; object-fit: cover; border: 1px solid var(--mh-line); } .ws-img-e { display: grid; place-items: center; color: var(--mh-muted2); background: var(--mh-panel2); border-style: dashed; } .ws-img > div:last-child { display: flex; flex-wrap: wrap; gap: 8px; }
.ws-acts { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; } .ws-del { margin-left: auto; color: #D9644E !important; } .ws-msg { font-size: 12px; color: #7FB77A; }
.ws-pv { position: sticky; top: 8px; display: flex; flex-direction: column; align-items: center; gap: 10px; } .ws-pv h3 { align-self: flex-start; } .ws-card { transform-origin: top center; max-width: 100%; display: flex; justify-content: center; } .ws-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: #E3B04B; border: 1px solid #E3B04B66; border-radius: 99px; padding: 2px 10px; }
.ws-rank { display: flex; gap: 5px; align-self: stretch; } .ws-rank button { all: unset; cursor: pointer; flex: 1; text-align: center; font-size: 11px; padding: 4px 0; border-radius: 8px; border: 1px solid var(--mh-line2); color: var(--mh-muted); } .ws-rank button.on { background: #E3B04B; border-color: #E3B04B; color: #1d1606; font-weight: 700; }
.ws-chk { align-self: stretch; border-top: 1px solid var(--mh-line); padding-top: 10px; } .ws-chk p { display: flex; gap: 8px; align-items: flex-start; margin: 0 0 6px; font-size: 12px; line-height: 1.4; color: var(--mh-ink2); } .ws-chk b { width: 17px; height: 17px; border-radius: 50%; display: grid; place-items: center; flex: none; font-size: 10px; margin-top: 1px; } .ws-chk .ok b { background: color-mix(in srgb, #4f9a62 28%, transparent); color: #4f9a62; } .ws-chk .wr b { background: color-mix(in srgb, #E3B04B 30%, transparent); color: #b88a1c; }
.ws-pv-e { text-align: center; color: var(--mh-muted2); padding: 40px 10px; font-size: 12.5px; }
@media (max-width: 1100px) { .ws-work { grid-template-columns: minmax(0, 1fr); } .ws-pv { position: static; } }
`;
