"use client";

import { useState } from "react";

// Desencadenantes del mapa: reglas «cuando… si… entonces…» que el DJ prepara y que se ejecutan solas.
export const RULE_WHEN = [
  { key: "damage", label: "recibe daño" },
  { key: "down", label: "es derrotado" },
];
export const HP_LEVELS = [
  { v: 0, label: "con cualquier daño" },
  { v: 75, label: "si le queda menos del 75 % de vida" },
  { v: 50, label: "si le queda menos del 50 % de vida" },
  { v: 25, label: "si le queda menos del 25 % de vida" },
];
export const ACTION_TYPES = [
  { key: "flee", label: "Los demás del grupo huyen" },
  { key: "msg", label: "Mostrar un mensaje" },
  { key: "show", label: "Mostrar un grupo oculto" },
  { key: "hide", label: "Ocultar un grupo" },
];

const groupLabel = (g) => (!g || g === "*" ? "cualquier criatura" : "«" + g + "»");

export const describeAction = (a) => {
  if (a.type === "flee") return "los demás huyen " + (a.steps || 4) + " casillas";
  if (a.type === "msg") return "mensaje «" + (a.text || "") + "»";
  if (a.type === "show") return "muestra " + groupLabel(a.group);
  if (a.type === "hide") return "oculta " + groupLabel(a.group);
  return a.type;
};

export function RulesPanel({ rules, groups, onAdd, onToggle, onRemove, onReset }) {
  const [open, setOpen] = useState(false);
  const blank = () => ({ when: "damage", group: "*", hpBelow: 0, once: true, actions: [{ type: "flee", steps: 4 }] });
  const [d, setD] = useState(blank);
  const [err, setErr] = useState("");
  const setAct = (i, patch) => setD((x) => ({ ...x, actions: x.actions.map((a, k) => (k === i ? { ...a, ...patch } : a)) }));
  const save = () => {
    for (const a of d.actions) {
      if (a.type === "msg" && !(a.text || "").trim()) return setErr("Escribe el mensaje.");
      if ((a.type === "show" || a.type === "hide") && !a.group) return setErr("Elige el grupo.");
    }
    if (!d.actions.length) return setErr("Añade al menos una acción.");
    onAdd({ ...d, id: "r" + Date.now(), on: true, fired: false });
    setD(blank());
    setErr("");
    setOpen(false);
  };
  return (
    <div className="mh-rules">
      <div className="mh-rules-h">
        <b>Eventos y desencadenantes</b>
        <span>{rules.length ? rules.length + " regla" + (rules.length === 1 ? "" : "s") : "Ninguna todavía"}</span>
        <button type="button" className="mh-btn-ghost" onClick={() => setOpen((v) => !v)}>{open ? "Cancelar" : "Nueva regla"}</button>
      </div>
      {rules.map((r) => (
        <div key={r.id} className={"mh-rule" + (r.on ? "" : " is-off") + (r.fired ? " is-fired" : "")}>
          <div className="mh-rule-t">
            <b>Cuando</b> {groupLabel(r.group)} {RULE_WHEN.find((w) => w.key === r.when)?.label}
            {r.when === "damage" && r.hpBelow ? <>, <b>si</b> le queda menos del {r.hpBelow} %</> : null}
            <br />
            <b>Entonces</b> {r.actions.map(describeAction).join(" · ")}
            {r.once !== false && <i className="mh-rule-once">una vez</i>}
            {r.fired && <i className="mh-rule-fired">ya ejecutada</i>}
          </div>
          <div className="mh-rule-b">
            {r.fired && <button type="button" className="mh-btn-ghost" onClick={() => onReset(r.id)}>Rearmar</button>}
            <label className="mh-rule-sw"><input type="checkbox" checked={!!r.on} onChange={() => onToggle(r.id)} /> Activa</label>
            <button type="button" className="mh-btn-ghost" aria-label="Borrar regla" onClick={() => onRemove(r.id)}>Borrar</button>
          </div>
        </div>
      ))}
      {open && (
        <div className="mh-rule-form">
          <div className="mh-rule-row">
            <b>Cuando</b>
            <select className="mh-input" value={d.group} onChange={(e) => setD({ ...d, group: e.target.value })}>
              <option value="*">cualquier criatura</option>
              {groups.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select className="mh-input" value={d.when} onChange={(e) => setD({ ...d, when: e.target.value })}>
              {RULE_WHEN.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
            </select>
          </div>
          {d.when === "damage" && (
            <div className="mh-rule-row">
              <b>Si</b>
              <select className="mh-input" value={d.hpBelow} onChange={(e) => setD({ ...d, hpBelow: Number(e.target.value) })}>
                {HP_LEVELS.map((h) => <option key={h.v} value={h.v}>{h.label}</option>)}
              </select>
              <label className="mh-rule-sw"><input type="checkbox" checked={d.once} onChange={(e) => setD({ ...d, once: e.target.checked })} /> Solo la primera vez</label>
            </div>
          )}
          {d.actions.map((a, i) => (
            <div key={i} className="mh-rule-row">
              <b>{i === 0 ? "Entonces" : "Y además"}</b>
              <select className="mh-input" value={a.type} onChange={(e) => setAct(i, { type: e.target.value, steps: 4, text: "", group: groups[0] || "" })}>
                {ACTION_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              {a.type === "flee" && (
                <>
                  <input className="mh-input" type="number" min={1} max={10} value={a.steps || 4} style={{ width: 64 }} onChange={(e) => setAct(i, { steps: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} />
                  <span>casillas</span>
                </>
              )}
              {a.type === "msg" && <input className="mh-input" value={a.text || ""} placeholder="¡Retirada!" maxLength={80} onChange={(e) => setAct(i, { text: e.target.value })} />}
              {(a.type === "show" || a.type === "hide") && (
                <select className="mh-input" value={a.group || ""} onChange={(e) => setAct(i, { group: e.target.value })}>
                  <option value="">Elige un grupo</option>
                  {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
              {d.actions.length > 1 && <button type="button" className="mh-btn-ghost" onClick={() => setD((x) => ({ ...x, actions: x.actions.filter((_, k) => k !== i) }))}>Quitar</button>}
            </div>
          ))}
          <div className="mh-rule-row">
            {d.actions.length < 4 && <button type="button" className="mh-btn-ghost" onClick={() => setD((x) => ({ ...x, actions: [...x.actions, { type: "msg", text: "" }] }))}>Añadir acción</button>}
            <button type="button" className="mh-btn-ghost mh-rule-save" onClick={save}>Guardar regla</button>
          </div>
          {err && <div className="mh-rule-err">{err}</div>}
        </div>
      )}
    </div>
  );
}
