"use client";

import { EyeOff, Octagon, Plus } from "lucide-react";

// Líneas (nunca aparecen en la mesa) y velos (pueden existir, pero sin mostrarse). Editor compacto para campañas.
const SUGGEST = ["Violencia gráfica", "Maltrato o abuso", "Violencia sexual", "Daño a niños", "Tortura", "Autolesiones", "Enfermedad grave", "Daño a animales", "Discriminación", "Arañas e insectos"];

export function LinesVeilsEditor({ lines, veils, onChange }) {
  const set = (field, next) => onChange({ lines, veils, [field]: next });
  const add = (field, t) => {
    const v = t.trim().slice(0, 40);
    const cur = field === "lines" ? lines : veils;
    if (v && !lines.includes(v) && !veils.includes(v)) set(field, [...cur, v]);
  };
  const group = (field, cls, Icon, title, hint) => {
    const cur = field === "lines" ? lines : veils;
    const free = SUGGEST.filter((t) => !lines.includes(t) && !veils.includes(t));
    return (
      <div className={"pf-lim-g " + cls}>
        <b><Icon size={13} /> {title}</b>
        <small>{hint}</small>
        <div className="pf-lim-c">
          {cur.map((t) => <button key={t} type="button" className="pf-tag" title="Quitar" onClick={() => set(field, cur.filter((y) => y !== t))}>{t} ×</button>)}
        </div>
        <div className="pf-lim-c" style={{ marginTop: 8 }}>{free.slice(0, 5).map((t) => <button key={t} type="button" className="pf-tag off" onClick={() => add(field, t)}>+ {t}</button>)}</div>
        <div className="pf-lim-add">
          <input
            className="mh-input"
            maxLength={40}
            placeholder="Otro tema…"
            aria-label={"Añadir a " + title.toLowerCase()}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(field, e.currentTarget.value); e.currentTarget.value = ""; } }}
          />
          <button type="button" className="mh-btn-ghost" aria-label="Añadir" onClick={(e) => { const i = e.currentTarget.previousSibling; add(field, i.value); i.value = ""; }}><Plus size={14} /></button>
        </div>
      </div>
    );
  };
  return (
    <div className="pf-lim">
      {group("lines", "is-line", Octagon, "Líneas", "Temas que no aparecerán en la mesa.")}
      {group("veils", "is-veil", EyeOff, "Velos", "Temas que pueden existir, pero fuera de escena.")}
    </div>
  );
}

export const limitsCount = (c) => (c?.lines?.length || 0) + (c?.veils?.length || 0);
export const limitsText = (c) => [c?.lines?.length ? "Líneas: " + c.lines.join(", ") : "", c?.veils?.length ? "Velos: " + c.veils.join(", ") : ""].filter(Boolean).join(" · ");
