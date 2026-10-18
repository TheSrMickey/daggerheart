"use client";

import { Plus, Trash2, Swords } from "lucide-react";

// Estadísticas de un PNJ (amistoso, neutral o enemigo): las mismas que usa la ficha de adversario del tablero.
export const NPC_TYPES = ["Estándar", "Esbirro", "Duro", "Líder", "Solitario", "Apoyo", "Social", "Cuadrilla"];
export const NPC_RANGES = ["Cuerpo a cuerpo", "Muy cercano", "Cercano", "Lejano", "Muy lejano"];

export const defaultNpcStats = () => ({
  tier: 1,
  type: "Estándar",
  difficulty: 12,
  thresholds: [7, 13],
  hp: 5,
  stress: 3,
  atk: 0,
  attack: { name: "Ataque", range: "Cuerpo a cuerpo", damage: "1d8+1", type: "fís" },
  motives: "",
  exp: "",
  desc: "",
});

// Resumen corto para la tarjeta del PNJ.
export const npcStatsSummary = (st) => (st ? "Nv " + (st.tier ?? 1) + " · Dif " + (st.difficulty ?? "—") + " · PV " + (st.hp ?? "—") + " · Estrés " + (st.stress ?? "—") : "");

// Estadísticas listas para colocar al PNJ en el tablero (vida y estrés sin marcar).
export const npcTokenStats = (m) => {
  const base = defaultNpcStats();
  const st = m?.stats || {};
  return { ...base, ...st, attack: { ...base.attack, ...(st.attack || {}) }, thresholds: [Number(st.thresholds?.[0] ?? base.thresholds[0]), Number(st.thresholds?.[1] ?? base.thresholds[1])], base: m?.name || "", hpMarked: 0, stressMarked: 0 };
};

const num = (v, min = 0, max = 99) => Math.max(min, Math.min(max, Number(v) || 0));

export default function NpcStatsEditor({ stats, onChange, name }) {
  if (!stats)
    return (
      <div className="mh-ns-empty">
        <Swords size={18} strokeWidth={1.6} />
        <p>Añade dificultad, umbrales, vida, estrés y ataque para usar a {name || "este PNJ"} en el tablero, sea aliado, neutral o enemigo.</p>
        <button type="button" className="mh-btn-ghost" onClick={() => onChange(defaultNpcStats())}><Plus size={13} /> Añadir estadísticas</button>
      </div>
    );
  const set = (patch) => onChange({ ...stats, ...patch });
  const setAtk = (patch) => set({ attack: { ...defaultNpcStats().attack, ...(stats.attack || {}), ...patch } });
  const th = stats.thresholds || [7, 13];
  const field = (label, el, wide) => (
    <label className={"mh-ns-f" + (wide ? " is-wide" : "")}>
      <span>{label}</span>
      {el}
    </label>
  );
  const numIn = (label, key, min, max) => field(label, <input className="mh-input" type="number" inputMode="numeric" min={min} max={max} value={stats[key] ?? ""} onChange={(e) => set({ [key]: e.target.value === "" ? "" : num(e.target.value, min, max) })} />);
  return (
    <div className="mh-ns">
      <div className="mh-ns-grid">
        {numIn("Nivel", "tier", 1, 4)}
        {field("Tipo", <select className="mh-input" value={stats.type || "Estándar"} onChange={(e) => set({ type: e.target.value })}>{NPC_TYPES.map((t) => <option key={t}>{t}</option>)}</select>)}
        {numIn("Dificultad", "difficulty", 1, 30)}
        {numIn("Mod. de ataque", "atk", -5, 12)}
        {field("Umbral mayor", <input className="mh-input" type="number" inputMode="numeric" min={1} max={60} value={th[0] ?? ""} onChange={(e) => set({ thresholds: [e.target.value === "" ? "" : num(e.target.value, 1, 60), th[1]] })} />)}
        {field("Umbral grave", <input className="mh-input" type="number" inputMode="numeric" min={1} max={99} value={th[1] ?? ""} onChange={(e) => set({ thresholds: [th[0], e.target.value === "" ? "" : num(e.target.value, 1, 99)] })} />)}
        {numIn("Puntos de vida", "hp", 1, 20)}
        {numIn("Estrés", "stress", 0, 12)}
      </div>
      <div className="mh-ns-sub">Ataque</div>
      <div className="mh-ns-grid">
        {field("Nombre", <input className="mh-input" value={stats.attack?.name || ""} maxLength={40} onChange={(e) => setAtk({ name: e.target.value })} />)}
        {field("Alcance", <select className="mh-input" value={stats.attack?.range || "Cuerpo a cuerpo"} onChange={(e) => setAtk({ range: e.target.value })}>{NPC_RANGES.map((t) => <option key={t}>{t}</option>)}</select>)}
        {field("Daño", <input className="mh-input" value={stats.attack?.damage || ""} maxLength={16} placeholder="1d8+2" onChange={(e) => setAtk({ damage: e.target.value })} />)}
        {field("Tipo de daño", <select className="mh-input" value={stats.attack?.type || "fís"} onChange={(e) => setAtk({ type: e.target.value })}><option value="fís">Físico</option><option value="mág">Mágico</option></select>)}
      </div>
      {field("Motivaciones y tácticas", <textarea className="mh-input" rows={2} maxLength={300} value={stats.motives || ""} onChange={(e) => set({ motives: e.target.value })} />, true)}
      {field("Experiencia", <input className="mh-input" value={stats.exp || ""} maxLength={80} placeholder="Ladrón +2" onChange={(e) => set({ exp: e.target.value })} />, true)}
      <button type="button" className="mh-btn-ghost mh-ns-del" onClick={() => onChange(null)}><Trash2 size={13} /> Quitar estadísticas</button>
    </div>
  );
}
