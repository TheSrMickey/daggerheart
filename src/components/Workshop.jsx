"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Copy, Download, FileText, Gem, Hammer, Home, Layers, Plus, Search, Shield, Swords, Trash2, Upload, User, X, Sparkles } from "lucide-react";
import { storageGet, storageSet } from "@/lib/storage";
import { CardFace } from "./Cards";
import { weaponIcon, armorIcon } from "./gearIcons";

// Taller: contenido personalizado del jugador (cartas de dominio, ascendencias, comunidades, subclases, armas, armaduras y objetos).
// Por ahora es privado: se guarda en la cuenta y se puede exportar e importar en JSON.
const KEY = "workshop-items";
const TYPES = [
  { key: "dominio", label: "Carta de dominio", plural: "Cartas de dominio", Icon: Layers, color: "#A58BE8" },
  { key: "ascendencia", label: "Ascendencia", plural: "Ascendencias", Icon: User, color: "#6FA3C0" },
  { key: "comunidad", label: "Comunidad", plural: "Comunidades", Icon: Home, color: "#C08B5C" },
  { key: "subclase", label: "Subclase", plural: "Subclases", Icon: BookOpen, color: "#7FB77A" },
  { key: "arma", label: "Arma", plural: "Armas", Icon: Swords, color: "#C9A24A" },
  { key: "armadura", label: "Armadura", plural: "Armaduras", Icon: Shield, color: "#857C96" },
  { key: "objeto", label: "Objeto", plural: "Objetos", Icon: Gem, color: "#E0A04A" },
];
const typeOf = (k) => TYPES.find((t) => t.key === k) || TYPES[0];
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
function toEntry(it, ctx, rank = 0) {
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
      return { id: it.id, kind: "arma", key: nm, sub: "Arma " + (it.slot === "Secundaria" ? "secundaria" : "principal") + " · " + (Number(it.hands) === 2 ? "Dos manos" : "Una mano"), tier: Number(it.tier) || 1, text: "", features: [], gear: { label: "Daño", big: dm?.[1] || "—", small: dm?.[2] || "", feature: it.feature || "", foot: [it.trait, it.range].filter(Boolean).join(" · "), pill: TIER_LABEL[it.tier] || "" }, image: null, color: TIER_COLOR[it.tier] || "#C9A24A", Icon: weaponIcon(nm) };
    }
    case "armadura": return { id: it.id, kind: "armadura", key: nm, sub: "Armadura", tier: Number(it.tier) || 1, text: "", features: [], gear: { label: "Puntuación", big: String(it.score ?? "—"), small: "", feature: it.feature || "", foot: "Umbrales base " + it.major + " / " + it.severe, pill: TIER_LABEL[it.tier] || "" }, image: null, color: TIER_COLOR[it.tier] || "#857C96", Icon: armorIcon(nm) };
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
    setDirty(true);
  };
  const addTemplate = async (tpl) => {
    const it = tpl.make();
    await persist([it, ...(items || [])]);
    setDraft(JSON.parse(JSON.stringify(it)));
    setSel(it.id);
    setRank(0);
    setTokHave(it.tokens?.start === "full" ? it.tokens.max : 0);
    setDirty(false);
    flash("«" + it.name + "» añadida a tu biblioteca.");
  };
  const open = (it) => {
    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Descartarlos?")) return;
    setDraft(JSON.parse(JSON.stringify(it)));
    setSel(it.id);
    setRank(0);
    setTokHave(it.tokens?.start === "full" ? it.tokens.max : 0);
    setDirty(false);
  };
  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true); };
  const setFeat = (i, patch) => set({ features: draft.features.map((f, k) => (k === i ? { ...f, ...patch } : f)) });
  const save = async () => {
    if (!draft || !draft.name.trim()) return;
    const next = { ...draft, name: draft.name.trim(), updatedAt: Date.now() };
    const exists = (items || []).some((x) => x.id === next.id);
    await persist(exists ? items.map((x) => (x.id === next.id ? next : x)) : [next, ...items]);
    setDraft(next);
    setDirty(false);
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
    <div className="ws-img">
      {draft.image ? <img src={draft.image} alt="" /> : <div className="ws-img-e"><Upload size={16} /></div>}
      <div>
        <button type="button" className="mh-btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={14} /> {draft.image ? "Cambiar imagen" : "Subir imagen"}</button>
        {draft.image && <button type="button" className="mh-btn-ghost" onClick={() => set({ image: "" })}><X size={14} /> Quitar</button>}
      </div>
    </div>
  ), "Opcional. Se reduce automáticamente.");
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
          <div className="ws-list">
            {items === null && <p className="ws-empty">Cargando…</p>}
            {items && !shown.length && <p className="ws-empty">{items.length ? "Nada con ese filtro." : "Aún no has creado nada. Elige un tipo arriba para empezar."}</p>}
            {shown.map((x) => {
              const t = typeOf(x.type);
              return (
                <button key={x.id} type="button" className={"ws-it" + (sel === x.id ? " on" : "")} onClick={() => open(x)} style={{ "--c": t.color }}>
                  <i><t.Icon size={15} /></i>
                  <span><b>{x.name || "Sin nombre"}</b><small>{t.label}{x.type === "dominio" ? " · Nv " + x.level : ""}</small></span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="ws-work">
        <section className="ws-ed">
          {!draft ? (
            <div className="ws-blank"><Hammer size={34} strokeWidth={1.4} /><h2 className="mh-serif">Tu taller está listo</h2><p>Elige un tipo de contenido para crear algo nuevo o abre un elemento de tu biblioteca para editarlo.</p></div>
          ) : (
            <>
              <div className="ws-ed-h"><span style={{ "--c": tinfo.color }}><tinfo.Icon size={15} /> {tinfo.label}</span>{dirty && <em>Cambios sin guardar</em>}</div>
              {L("Nombre", <input className="mh-input" autoFocus maxLength={60} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Por ejemplo: Llama de Cenizas" />)}
              {draft.type === "dominio" && (
                <>
                  {L("Dominio", (
                    <div className="ws-dom">
                      <Seg value={domains.includes(draft.domain) ? draft.domain : ""} options={domains} onChange={(v) => set({ domain: v })} />
                      <input className="mh-input" maxLength={24} value={draft.domain} onChange={(e) => set({ domain: e.target.value })} placeholder="o escribe un dominio propio" />
                    </div>
                  ))}
                  <div className="ws-r3">
                    {L("Tipo", <Seg value={draft.ctype} options={CTYPES} onChange={(v) => set({ ctype: v })} />)}
                    {L("Nivel", <Seg value={draft.level} options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} onChange={(v) => set({ level: v })} />)}
                    {L("Coste de recuperación", <Seg value={draft.recall} options={[0, 1, 2, 3, 4, 5]} onChange={(v) => set({ recall: v })} />)}
                  </div>
                  {L("Texto de la carta", <textarea className="mh-input" rows={6} value={draft.text} onChange={(e) => set({ text: e.target.value })} placeholder="Describe qué hace la carta, con el alcance, la tirada y el efecto." />)}
                  <TokField />
                  <ImageField />
                </>
              )}
              {(draft.type === "ascendencia" || draft.type === "comunidad") && (
                <>
                  {L("Descripción", <textarea className="mh-input" rows={3} value={draft.blurb} onChange={(e) => set({ blurb: e.target.value })} placeholder={"Cómo es esta " + (draft.type === "ascendencia" ? "ascendencia." : "comunidad.")} />)}
                  {L("Características", <Feats />, draft.type === "ascendencia" ? "Las ascendencias oficiales tienen dos características." : "Las comunidades oficiales tienen una característica.")}
                  <ImageField />
                </>
              )}
              {draft.type === "subclase" && (
                <>
                  {L("Clase", <select className="mh-input" value={draft.cls} onChange={(e) => set({ cls: e.target.value })}><option value="">Sin clase concreta</option>{classes.map((c) => <option key={c}>{c}</option>)}</select>)}
                  {L("Descripción", <textarea className="mh-input" rows={3} value={draft.blurb} onChange={(e) => set({ blurb: e.target.value })} placeholder="Qué representa esta subclase. Puedes indicar el rasgo de conjuro." />)}
                  {L("Características por etapa", <Feats stages />, "Cada subclase tiene Fundación, Especialización y Maestría.")}
                  <ImageField />
                </>
              )}
              {draft.type === "arma" && (
                <>
                  <div className="ws-r3">
                    {L("Tipo", <Seg value={draft.slot} options={["Principal", "Secundaria"]} onChange={(v) => set({ slot: v })} />)}
                    {L("Manos", <Seg value={draft.hands} options={[1, 2]} onChange={(v) => set({ hands: Number(v) })} />)}
                    {L("Rango", <Seg value={draft.tier} options={[1, 2, 3, 4]} onChange={(v) => set({ tier: Number(v) })} fmt={(v) => TIER_LABEL[v]} />)}
                  </div>
                  <div className="ws-r3">
                    {L("Rasgo", <select className="mh-input" value={draft.trait} onChange={(e) => set({ trait: e.target.value })}>{TRAIT_NAMES.map((t) => <option key={t}>{t}</option>)}</select>)}
                    {L("Alcance", <select className="mh-input" value={draft.range} onChange={(e) => set({ range: e.target.value })}>{RANGES.map((t) => <option key={t}>{t}</option>)}</select>)}
                    {L("Daño", <input className="mh-input" value={draft.damage} onChange={(e) => set({ damage: e.target.value })} placeholder="d8+2 físico" />)}
                  </div>
                  {L("Característica", <textarea className="mh-input" rows={5} value={draft.feature} onChange={(e) => set({ feature: e.target.value })} placeholder="Opcional: efecto especial del arma. Puedes poner varias, una por línea." />)}
                  <TokField />
                </>
              )}
              {draft.type === "armadura" && (
                <>
                  {L("Rango", <Seg value={draft.tier} options={[1, 2, 3, 4]} onChange={(v) => set({ tier: Number(v) })} fmt={(v) => TIER_LABEL[v]} />)}
                  <div className="ws-r3">
                    {L("Puntuación base", <input className="mh-input" type="number" min={0} max={12} value={draft.score} onChange={(e) => set({ score: e.target.value })} />)}
                    {L("Umbral mayor", <input className="mh-input" type="number" min={1} value={draft.major} onChange={(e) => set({ major: e.target.value })} />)}
                    {L("Umbral grave", <input className="mh-input" type="number" min={1} value={draft.severe} onChange={(e) => set({ severe: e.target.value })} />)}
                  </div>
                  {L("Característica", <textarea className="mh-input" rows={3} value={draft.feature} onChange={(e) => set({ feature: e.target.value })} placeholder="Opcional: efecto especial de la armadura." />)}
                </>
              )}
              {draft.type === "objeto" && (
                <>
                  {L("Descripción", <textarea className="mh-input" rows={5} value={draft.text} onChange={(e) => set({ text: e.target.value })} placeholder="Qué es, qué hace y cómo se usa." />)}
                  <ImageField />
                </>
              )}
              <div className="ws-acts">
                <button type="button" className="mh-btn" disabled={!draft.name.trim() || !dirty} onClick={save}><Check size={15} /> Guardar</button>
                <button type="button" className="mh-btn-ghost" onClick={duplicate} disabled={!(items || []).some((x) => x.id === draft.id)}><Copy size={14} /> Duplicar</button>
                <button type="button" className="mh-btn-ghost ws-del" onClick={remove} disabled={!(items || []).some((x) => x.id === draft.id)}><Trash2 size={14} /> Eliminar</button>
                {msg && <span className="ws-msg">{msg}</span>}
              </div>
            </>
          )}
        </section>

        <aside className="ws-pv">
          {entry ? (
            <>
              <h3>Vista previa en vivo</h3>
              {draft.type === "subclase" && <div className="ws-rank">{STAGES.map((s, i) => <button key={s} type="button" className={rank === i ? "on" : ""} onClick={() => setRank(i)}>{s}</button>)}</div>}
              <div className="ws-card"><CardFace c={entry} I={entry.Icon} FitTitle={FitTitle} FitBox={FitBox} /></div>
              {draft.tokens?.on && TokDice && (
                <div className="ws-toks" title={tokSummary(draft.tokens)}>
                  <TokDice have={Math.min(tokHave, draft.tokens.max)} max={draft.tokens.max} color={entry.color} onPick={(k) => setTokHave(k + 1 === tokHave ? k : k + 1)} />
                  <small>{tokSummary(draft.tokens)}</small>
                </div>
              )}
              <span className="ws-tag"><FileText size={12} /> Contenido personalizado</span>
              <div className="ws-chk">
                <h3>Comprobaciones</h3>
                {checks(draft).map((c, i) => <p key={i} className={c.ok ? "ok" : "wr"}><b>{c.ok ? "✓" : "!"}</b>{c.t}</p>)}
              </div>
            </>
          ) : <div className="ws-pv-e"><Sparkles size={22} /><p>Aquí verás tu carta mientras la escribes.</p></div>}
        </aside>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.ws { display: flex; flex-direction: column; gap: 14px; }
.ws-top { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; } .ws-top > div:first-child { flex: 1; min-width: 260px; } .ws-top h1 { margin: 0 0 4px; font-size: 28px; } .ws-top p { margin: 0; color: var(--mh-muted); font-size: 13px; max-width: 640px; line-height: 1.5; }
.ws-top-a { display: flex; gap: 8px; } .ws-top-a button, .ws-acts button, .ws-img button, .ws-feats > button { display: inline-flex; align-items: center; gap: 6px; }
.ws-grid { display: flex; flex-direction: column; gap: 14px; } .ws-work { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 14px; align-items: start; }
.ws-lib, .ws-ed, .ws-pv { background: var(--mh-panel); border: 1px solid var(--mh-line); border-radius: 18px; padding: 14px; min-width: 0; }
.ws h3 { margin: 0 0 8px; font: 700 11px Inter, system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--mh-muted); display: flex; align-items: center; gap: 8px; } .ws h3 em { font-style: normal; color: var(--mh-muted2); }
.ws-new-g { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 6px; } .ws-new-g button { all: unset; cursor: pointer; box-sizing: border-box; display: flex; align-items: center; gap: 7px; padding: 8px 9px; border-radius: 10px; border: 1px solid var(--mh-line); background: var(--mh-panel2); color: var(--mh-ink); font-size: 11.5px; font-weight: 600; } .ws-new-g button svg { color: var(--c); flex: none; } .ws-new-g button:hover { border-color: var(--c); } .ws-new-g button:focus-visible { outline: 2px solid #E3B04B; }
.ws-tpl { margin-top: 14px; } .ws-new-g button span small { display: block; font-weight: 400; color: var(--mh-muted2); font-size: 10px; }
.ws-tok { border: 1px dashed var(--mh-line2); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; } .ws-tok-sw { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; } .ws-tok-sw input { width: 16px; height: 16px; accent-color: #E3B04B; }
.ws-toks { align-self: stretch; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; border-radius: 12px; background: var(--mh-panel2); border: 1px solid var(--mh-line); } .ws-toks small { font-size: 10.5px; color: var(--mh-muted2); text-align: center; }
.ws-lib-h { margin-top: 14px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; } .ws-lib-h h3 { margin: 0; } .ws-lib-h .ws-search { width: 220px; } .ws-lib-h .ws-chips { margin: 0; } .ws-search { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid var(--mh-line); border-radius: 10px; background: var(--mh-input); color: var(--mh-muted); } .ws-search input { all: unset; flex: 1; min-width: 0; font-size: 12.5px; color: var(--mh-ink); }
.ws-chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0; } .ws-chips button { all: unset; cursor: pointer; font-size: 10.5px; padding: 3px 9px; border-radius: 99px; border: 1px solid var(--mh-line2); color: var(--mh-muted); } .ws-chips button.on { background: #E3B04B; border-color: #E3B04B; color: #1d1606; font-weight: 700; }
.ws-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; max-height: 176px; overflow-y: auto; scrollbar-width: thin; margin-top: 4px; } .ws-empty { color: var(--mh-muted2); font-size: 12.5px; margin: 6px 2px; line-height: 1.45; }
.ws-it { all: unset; cursor: pointer; box-sizing: border-box; display: flex; align-items: center; gap: 9px; padding: 8px 9px; border-radius: 11px; border: 1px solid var(--mh-line); background: var(--mh-panel2); } .ws-it i { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: color-mix(in srgb, var(--c) 22%, transparent); color: var(--c); flex: none; } .ws-it b { display: block; font-size: 13px; color: var(--mh-ink); } .ws-it small { color: var(--mh-muted2); font-size: 10.5px; } .ws-it.on { border-color: #E3B04B; background: #E3B04B14; } .ws-it:focus-visible { outline: 2px solid #E3B04B; }
.ws-ed { display: flex; flex-direction: column; gap: 12px; } .ws-ed-h { display: flex; align-items: center; justify-content: space-between; } .ws-ed-h span { display: inline-flex; align-items: center; gap: 7px; font: 700 12px Inter, system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: var(--c); } .ws-ed-h em { font-style: normal; font-size: 11px; color: #E3B04B; }
.ws-f { display: flex; flex-direction: column; gap: 5px; min-width: 0; } .ws-f > span { font: 700 10.5px Inter, system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--mh-muted); } .ws-f > em { font-style: normal; font-size: 11px; color: var(--mh-muted2); } .ws-f textarea { resize: vertical; line-height: 1.45; font-family: inherit; }
.ws-r3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.ws-seg { display: flex; flex-wrap: wrap; gap: 5px; } .ws-seg button { all: unset; cursor: pointer; font-size: 12px; padding: 5px 10px; border-radius: 8px; border: 1px solid var(--mh-line2); background: var(--mh-panel2); color: var(--mh-ink3); } .ws-seg button.on { border-color: #E3B04B; background: #E3B04B22; color: var(--mh-ink); font-weight: 600; } .ws-seg button:focus-visible { outline: 2px solid #E3B04B; }
.ws-dom { display: flex; flex-direction: column; gap: 8px; }
.ws-feats { display: flex; flex-direction: column; gap: 10px; } .ws-feat { border: 1px solid var(--mh-line); border-left: 3px solid #E3B04B; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px; background: var(--mh-panel2); } .ws-feat-h { display: flex; gap: 8px; align-items: center; } .ws-feat-h .mh-input { flex: 1; min-width: 0; } .ws-feat-h .ws-stage { flex: none; width: 150px; }
.ws-img { display: flex; align-items: center; gap: 12px; } .ws-img img, .ws-img-e { width: 84px; height: 84px; border-radius: 12px; object-fit: cover; border: 1px solid var(--mh-line); } .ws-img-e { display: grid; place-items: center; color: var(--mh-muted2); background: var(--mh-panel2); border-style: dashed; } .ws-img > div:last-child { display: flex; flex-wrap: wrap; gap: 8px; }
.ws-acts { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; } .ws-del { margin-left: auto; color: #D9644E !important; } .ws-msg { font-size: 12px; color: #7FB77A; }
.ws-blank { text-align: center; padding: 60px 20px; color: var(--mh-muted); } .ws-blank h2 { margin: 10px 0 6px; color: var(--mh-ink); font-size: 22px; } .ws-blank p { margin: 0 auto; max-width: 380px; font-size: 13px; line-height: 1.5; }
.ws-pv { position: sticky; top: 8px; display: flex; flex-direction: column; align-items: center; gap: 10px; } .ws-pv h3 { align-self: flex-start; } .ws-card { transform-origin: top center; max-width: 100%; display: flex; justify-content: center; } .ws-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: #E3B04B; border: 1px solid #E3B04B66; border-radius: 99px; padding: 2px 10px; }
.ws-rank { display: flex; gap: 5px; align-self: stretch; } .ws-rank button { all: unset; cursor: pointer; flex: 1; text-align: center; font-size: 11px; padding: 4px 0; border-radius: 8px; border: 1px solid var(--mh-line2); color: var(--mh-muted); } .ws-rank button.on { background: #E3B04B; border-color: #E3B04B; color: #1d1606; font-weight: 700; }
.ws-chk { align-self: stretch; border-top: 1px solid var(--mh-line); padding-top: 10px; } .ws-chk p { display: flex; gap: 8px; align-items: flex-start; margin: 0 0 6px; font-size: 12px; line-height: 1.4; color: var(--mh-ink2); } .ws-chk b { width: 17px; height: 17px; border-radius: 50%; display: grid; place-items: center; flex: none; font-size: 10px; margin-top: 1px; } .ws-chk .ok b { background: color-mix(in srgb, #4f9a62 28%, transparent); color: #4f9a62; } .ws-chk .wr b { background: color-mix(in srgb, #E3B04B 30%, transparent); color: #b88a1c; }
.ws-pv-e { text-align: center; color: var(--mh-muted2); padding: 40px 10px; font-size: 12.5px; }
@media (max-width: 1100px) { .ws-work { grid-template-columns: minmax(0, 1fr); } .ws-pv { position: static; } }
`;
