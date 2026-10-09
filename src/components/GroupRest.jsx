"use client";

import { useState } from "react";
import { BedDouble, Sun, Moon, Check, Hourglass, Bell } from "lucide-react";
import { useDoc } from "@/lib/campaignDocs";

// Descanso del grupo: el DJ lo propone, cada jugador elige sus acciones y descansa, y el DJ ve quién ha terminado.
export const restKey = (id) => "campaign-rest:" + id;
const EMPTY = { cur: null };
const ACTS = [
  { key: "heal", label: "Curar heridas", color: "#D9644E" },
  { key: "clearmind", label: "Quitarse el Estrés", color: "#A58BE8" },
  { key: "repair", label: "Reparar la armadura", color: "#C9A24A" },
  { key: "prepare", label: "Prepararse", color: "#E3B04B" },
];
const TYPES = { short: ["Descanso corto", Sun], long: ["Descanso largo", Moon] };

// Ventana del jugador: aparece sola cuando el DJ propone un descanso.
export function GroupRestDialog({ campaignId, mine, onRest }) {
  const [doc, update] = useDoc(restKey(campaignId), EMPTY, 3500);
  const [picks, setPicks] = useState({});
  const [hidden, setHidden] = useState("");
  const cur = doc.cur;
  if (!cur || cur.closed || hidden === cur.id) return null;
  const pending = mine.filter((m) => !cur.ready?.[m.id]);
  if (!pending.length) return null;
  const [typeLabel, TypeIcon] = TYPES[cur.type] || TYPES.short;
  const rec = (m) => { const out = ACTS.slice(0, 3).map((a) => [a.key, m.need[a.key] || 0]).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]).map(([k]) => k).slice(0, m.slots); while (out.length < m.slots) out.push("prepare"); return out; };
  const get = (m) => picks[m.id] || rec(m);
  const toggle = (m, k) => {
    const p = get(m), n = p.filter((x) => x === k).length;
    setPicks((s) => ({ ...s, [m.id]: n === 0 || p.length < m.slots ? (p.length < m.slots ? [...p, k] : [...p.slice(1), k]) : p.filter((x) => x !== k) }));
  };
  const go = (m) => { const p = get(m); onRest(m.id, cur.type, p); update((d) => ({ ...d, cur: d.cur && d.cur.id === cur.id ? { ...d.cur, ready: { ...(d.cur.ready || {}), [m.id]: Date.now() } } : d.cur })); };
  return (
    <div className="mh-overlay" style={{ background: "rgba(8,6,12,.68)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 62, padding: 20 }} role="dialog" aria-modal="true" aria-label="Descanso del grupo">
      <div className="gr-box">
        <div className="gx-h"><h3 className="mh-serif"><BedDouble size={20} /> Descanso del grupo</h3><button type="button" className="mh-btn-ghost" onClick={() => setHidden(cur.id)}>Ahora no</button></div>
        <p className="gx-sub">El DJ propone un <b>{typeLabel.toLowerCase()}</b>. Elige qué hace tu personaje y descansa: la app aplica la recuperación.</p>
        <div className="gx-row" style={{ marginBottom: 10 }}><span className="cx-chip on" style={{ "--c": cur.type === "long" ? "#8E6FC4" : "#E3B04B" }}><i><TypeIcon size={13} /></i>{typeLabel}</span><span className="gx-fact">{cur.type === "long" ? "Se recupera todo" : "Recuperación parcial (1d4 + Rango)"}</span></div>
        {pending.map((m) => {
          const p = get(m);
          return (
            <div key={m.id} className="gr-who">
              <div className="gx-h"><b className="mh-serif">{m.name}</b><span className="gx-fact">{m.cls} · {m.slots} acciones</span></div>
              <div className="gx-row">{ACTS.map((a) => { const n = p.filter((x) => x === a.key).length; return <button key={a.key} type="button" className={"cx-chip" + (n ? " on" : "")} style={{ "--c": a.color }} aria-pressed={!!n} onClick={() => toggle(m, a.key)}>{a.label}{n > 1 ? " ×" + n : ""}</button>; })}</div>
              <button type="button" className="mh-btn" style={{ marginTop: 10 }} onClick={() => go(m)}><BedDouble size={14} /> {typeLabel} de {m.name}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Pestaña del DJ: proponer el descanso y ver quién ha descansado.
export function RestGm({ campaignId, members, onAnnounce }) {
  const [doc, update] = useDoc(restKey(campaignId), EMPTY, 3000);
  const [type, setType] = useState("long");
  const cur = doc.cur && !doc.cur.closed ? doc.cur : null;
  const done = members.filter((m) => cur?.ready?.[m.id]).length;
  const start = () => { update(() => ({ cur: { id: "r" + Date.now(), type, at: Date.now(), ready: {}, closed: false } })); onAnnounce("😴 El DJ propone un " + TYPES[type][0].toLowerCase() + " para todo el grupo. Elige tus acciones y descansa."); };
  const end = () => {
    update((d) => ({ cur: d.cur ? { ...d.cur, closed: true } : null }));
    onAnnounce("😴 " + TYPES[cur.type][0] + " del grupo terminado (" + done + " de " + members.length + "). " + (cur.type === "long" ? "El DJ gana 1d4 + " + members.length + " de Miedo." : "El DJ gana 1d4 de Miedo."));
  };
  return (
    <div className="mh-card gx" style={{ margin: 0 }}>
      <div className="gx-h"><h3 className="mh-serif"><BedDouble size={18} /> Descanso del grupo</h3></div>
      <p className="gx-sub">Propón un descanso y cada jugador lo hace desde su hoja. Aquí ves quién ya ha descansado.</p>
      {!cur ? (
        <>
          <span className="gx-lab">Tipo</span>
          <div className="gx-row">{Object.entries(TYPES).map(([k, [l, I]]) => <button key={k} type="button" className={"cx-chip" + (type === k ? " on" : "")} style={{ "--c": k === "long" ? "#8E6FC4" : "#E3B04B" }} onClick={() => setType(k)}><i><I size={13} /></i>{l}</button>)}</div>
          <p className="gx-note" style={{ marginTop: 10 }}>{type === "long" ? "Recuperación completa. El DJ gana 1d4 + nº de PJ de Miedo." : "Cada jugador recupera 1d4 + su Rango con sus acciones. El DJ gana 1d4 de Miedo."}</p>
          <button type="button" className="mh-btn" style={{ marginTop: 12 }} disabled={!members.length} onClick={start}><BedDouble size={15} /> Proponer {TYPES[type][0].toLowerCase()} al grupo</button>
        </>
      ) : (
        <>
          <div className="gx-row" style={{ marginBottom: 10 }}><span className="cx-chip on" style={{ "--c": cur.type === "long" ? "#8E6FC4" : "#E3B04B" }}>{TYPES[cur.type][0]} en curso</span><span className="gx-fact">{done} de {members.length} listos</span></div>
          {members.map((m) => { const ok = cur.ready?.[m.id]; return <div key={m.id} className="cal-who" style={{ marginBottom: 8 }}><span className="cal-av" style={{ "--c": m.color }}>{m.name.charAt(0).toUpperCase()}</span><span className="cal-nm"><b>{m.name}</b><small>{m.cls}</small></span><span className="cx-chip on" style={{ "--c": ok ? "#4CC36B" : "#F0A037" }}><i>{ok ? <Check size={13} /> : <Hourglass size={13} />}</i>{ok ? "Listo" : "Esperando"}</span></div>; })}
          <div className="gx-row" style={{ marginTop: 12 }}>
            <button type="button" className="mh-btn-ghost" onClick={() => onAnnounce("⏳ El DJ pide que termine el descanso del grupo.")}><Bell size={14} /> Recordar al grupo</button>
            <button type="button" className="mh-btn" onClick={end}>Terminar descanso</button>
          </div>
        </>
      )}
    </div>
  );
}
