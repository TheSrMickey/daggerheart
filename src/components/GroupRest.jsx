"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BedDouble, Sun, Moon, Check, Hourglass, Bell, Lock } from "lucide-react";
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

// Historial: cada descanso terminado queda guardado (quién descansó y qué acciones eligió) para el contador de cortos seguidos y las estadísticas.
export const MAX_SHORT = 3;
export const shortRun = (doc) => { let n = 0; const h = (doc && doc.hist) || []; for (let i = h.length - 1; i >= 0 && h[i].type === "short"; i--) n++; return n; };
const startRest = (d, type) => ({ ...d, cur: { id: "r" + Date.now(), type, at: Date.now(), ready: {}, acts: {}, closed: false }, req: {} });
const finishRest = (d, members) => {
  if (!d.cur) return d;
  const who = members.map((m) => m.id).filter((id) => d.cur.ready?.[id]);
  const entry = { id: d.cur.id, type: d.cur.type, at: d.cur.at, end: Date.now(), total: members.length, who, names: Object.fromEntries(members.map((m) => [m.id, m.name])), acts: d.cur.acts || {} };
  return { ...d, cur: { ...d.cur, closed: true }, hist: [...(d.hist || []), entry].slice(-60) };
};
const ago = (ts) => { const m = Math.max(0, Math.round((Date.now() - ts) / 60000)); return m < 1 ? "hace un momento" : m < 60 ? "hace " + m + " min" : m < 1440 ? "hace " + Math.round(m / 60) + " h" : "hace " + Math.round(m / 1440) + " d"; };

// Ventana del jugador: aparece sola cuando el DJ propone un descanso.
export function GroupRestDialog({ campaignId, mine, onRest, open, onClose }) {
  const controlled = open !== undefined;
  const [doc, update] = useDoc(restKey(campaignId), EMPTY, 3500);
  const [picks, setPicks] = useState({});
  const [hidden, setHidden] = useState("");
  const cur = doc.cur;
  if (!cur || cur.closed || (controlled ? !open : hidden === cur.id)) return null;
  const pending = mine.filter((m) => !cur.ready?.[m.id]);
  if (!pending.length) return null;
  const [typeLabel, TypeIcon] = TYPES[cur.type] || TYPES.short;
  const rec = (m) => { const out = ACTS.slice(0, 3).map((a) => [a.key, m.need[a.key] || 0]).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]).map(([k]) => k).slice(0, m.slots); while (out.length < m.slots) out.push("prepare"); return out; };
  const get = (m) => picks[m.id] || rec(m);
  const toggle = (m, k) => {
    const p = get(m), n = p.filter((x) => x === k).length;
    setPicks((s) => ({ ...s, [m.id]: n === 0 || p.length < m.slots ? (p.length < m.slots ? [...p, k] : [...p.slice(1), k]) : p.filter((x) => x !== k) }));
  };
  const go = (m) => { const p = get(m); if (controlled && pending.length <= 1) onClose && onClose(); onRest(m.id, cur.type, p); update((d) => ({ ...d, cur: d.cur && d.cur.id === cur.id ? { ...d.cur, ready: { ...(d.cur.ready || {}), [m.id]: Date.now() }, acts: { ...(d.cur.acts || {}), [m.id]: p } } : d.cur })); };
  return (
    <div className="mh-overlay" style={{ background: "rgba(8,6,12,.68)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 62, padding: 20 }} role="dialog" aria-modal="true" aria-label="Descanso del grupo">
      <div className="gr-box">
        <div className="gx-h"><h3 className="mh-serif"><BedDouble size={20} /> Descanso del grupo</h3><button type="button" className="mh-btn-ghost" onClick={() => (controlled ? onClose && onClose() : setHidden(cur.id))}>Ahora no</button></div>
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

// Descansos de un personaje que está en una campaña: la hoja queda bloqueada hasta que el DJ convoca el descanso del grupo.
export function RestLock({ campaignId, campName, charId, charName, onAsk, onType, project, children }) {
  const [doc, update] = useDoc(restKey(campaignId), EMPTY, 3500);
  const cur = doc.cur && !doc.cur.closed ? doc.cur : null;
  const done = !!cur?.ready?.[charId];
  // Los proyectos se pueden avanzar mientras dure el descanso del grupo, también después de haber descansado.
  const open = !!cur && (project || !done);
  const asked = doc.req?.[charId];
  const curType = cur?.type;
  useEffect(() => {
    if (open && curType && onType) onType(curType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, curType]);
  const markReady = (picks) => update((d) => ({ ...d, cur: d.cur && cur && d.cur.id === cur.id ? { ...d.cur, ready: { ...(d.cur.ready || {}), [charId]: Date.now() }, acts: { ...(d.cur.acts || {}), ...(Array.isArray(picks) ? { [charId]: picks.filter(Boolean) } : {}) } } : d.cur }));
  const ask = (type) => {
    update((d) => ({ ...d, req: { ...(d.req || {}), [charId]: { name: charName, type, at: Date.now() } } }));
    onAsk(type);
  };
  return (
    <div className="rl">
      {open && <div className="rl-ban"><BedDouble size={16} /><span><b>El DJ ha convocado un {TYPES[curType][0].toLowerCase()}.</b> {project ? "Es tiempo libre: puedes avanzar tus proyectos." : "Elige tus acciones y descansa."}</span></div>}
      <div className={"rl-body" + (open ? "" : " is-locked")} inert={!open}>{typeof children === "function" ? children({ open, markReady, fixedType: open ? curType : null }) : children}</div>
      {!open && (
        <div className={"rl-lock" + (project ? " is-mini" : "")}>
          <span className="rl-ic">{done ? <Check size={26} /> : <Lock size={26} />}</span>
          {project ? null : done ? (
            <>
              <h4 className="mh-serif">Ya has descansado</h4>
              <p>{charName} ya ha hecho este descanso del grupo.</p>
            </>
          ) : (
            <>
              <h4 className="mh-serif">{charName} está en «{campName}»</h4>
              <p>{project ? "Los proyectos se avanzan en el tiempo libre de los descansos, y en una campaña los convoca el DJ para todo el grupo. Puedes consultarlos, pero no avanzarlos hasta entonces." : "En una campaña los descansos los convoca el DJ para todo el grupo a la vez, y el DJ gana su Miedo. No se puede descansar a solas."}</p>
              {asked ? (
                <span className="rl-wait"><Hourglass size={14} /> Pedido · esperando al DJ ({TYPES[asked.type]?.[0].toLowerCase()})</span>
              ) : (
                <div className="rl-btns">
                  <button type="button" className="mh-btn" onClick={() => ask("short")}><Bell size={14} /> Pedir descanso corto</button>
                  <button type="button" className="mh-btn" onClick={() => ask("long")}><Bell size={14} /> Pedir descanso largo</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Pestaña del DJ: contador de cortos seguidos, estadísticas y, a la derecha, peticiones o quién ha terminado.
export function RestGm({ campaignId, members, onAnnounce }) {
  const [doc, update] = useDoc(restKey(campaignId), EMPTY, 3000);
  const cur = doc.cur && !doc.cur.closed ? doc.cur : null;
  const hist = doc.hist || [];
  const run = shortRun(doc);
  const done = members.filter((m) => cur?.ready?.[m.id]).length;
  const reqs = members.filter((m) => doc.req?.[m.id]);
  const last = hist[hist.length - 1];
  const shorts = hist.filter((h) => h.type === "short").length;
  const tally = {};
  hist.forEach((h) => Object.values(h.acts || {}).forEach((a) => (a || []).forEach((k) => { tally[k] = (tally[k] || 0) + 1; })));
  const totAct = ACTS.reduce((s, a) => s + (tally[a.key] || 0), 0);
  const part = hist.length ? Math.round((hist.reduce((s, h) => s + (h.who || []).length / Math.max(1, h.total), 0) / hist.length) * 100) : 0;
  const start = (type) => {
    update((d) => startRest(d, type));
    onAnnounce("El DJ propone un " + TYPES[type][0].toLowerCase() + " para todo el grupo. Elige tus acciones y descansa.", { rest: type });
  };
  const end = () => {
    update((d) => finishRest(d, members));
    onAnnounce(TYPES[cur.type][0] + " del grupo terminado (" + done + " de " + members.length + "). " + (cur.type === "long" ? "El DJ gana 1d4 + " + members.length + " de Miedo." : "El DJ gana 1d4 de Miedo."));
  };
  const blocked = run >= MAX_SHORT;
  const chips = (keys) => <div className="rs-acts">{(keys || []).map((k, i) => { const a = ACTS.find((x) => x.key === k); return a ? <span key={i} className="rs-act" style={{ "--c": a.color }}>{a.label}</span> : null; })}</div>;
  return (
    <div className="rs">
      <div className="mh-card rs-l">
        <div className="gx-h"><h3 className="mh-serif"><BedDouble size={18} /> Descansos</h3>{cur && <span className="cx-chip on" style={{ "--c": cur.type === "long" ? "#8E6FC4" : "#E3B04B" }}>{TYPES[cur.type][0]} en curso</span>}</div>
        <div className="rs-sc">
          <div className="rs-cnt"><b>{run}</b><small> / {MAX_SHORT}</small><span>cortos seguidos.<br />Al llegar a {MAX_SHORT}, el siguiente es largo.</span></div>
          <div className="rs-bar"><i style={{ width: Math.min(100, (run / MAX_SHORT) * 100) + "%" }} /></div>
          {blocked && <div className="rs-warn"><Moon size={14} /> Ya hay {MAX_SHORT} descansos cortos seguidos: el próximo tiene que ser largo.</div>}
          {cur && !blocked && cur.type === "short" && run === MAX_SHORT - 1 && <div className="rs-warn"><Moon size={14} /> Al terminar este serán {MAX_SHORT} cortos seguidos: el siguiente será largo.</div>}
          {!cur ? (
            <div className="rs-btns">
              <button type="button" className="mh-btn" disabled={!members.length || blocked} title={blocked ? "Toca descanso largo" : undefined} onClick={() => start("short")}><Sun size={15} /> Proponer corto</button>
              <button type="button" className="mh-btn rs-long" disabled={!members.length} onClick={() => start("long")}><Moon size={15} /> Proponer largo</button>
            </div>
          ) : (
            <div className="rs-btns">
              <button type="button" className="mh-btn-ghost" onClick={() => onAnnounce("El DJ pide que termine el descanso del grupo.")}><Bell size={14} /> Recordar al grupo</button>
              <button type="button" className="mh-btn" onClick={end}>Terminar descanso</button>
            </div>
          )}
          <p className="gx-note" style={{ margin: "8px 0 0" }}>{cur?.type === "long" ? "Largo: recuperación completa. El DJ gana 1d4 + nº de PJ de Miedo." : "Corto: cada jugador recupera 1d4 + su Rango y el DJ gana 1d4 de Miedo. Largo: recuperación completa y 1d4 + nº de PJ de Miedo."}</p>
        </div>
        <span className="gx-lab">Estadísticas de la campaña</span>
        <div className="rs-stats">
          <div><b>{hist.length}</b><span>descansos</span></div>
          <div><b>{shorts} · {hist.length - shorts}</b><span>cortos · largos</span></div>
          <div><b>{hist.length ? part + " %" : "—"}</b><span>asistencia media</span></div>
        </div>
        <span className="gx-lab">Acciones más elegidas</span>
        {totAct === 0 ? <p className="gx-sub" style={{ margin: "2px 0 0" }}>Aún no hay descansos con acciones guardadas.</p> : ACTS.map((a) => (
          <div key={a.key} className="rs-ch"><span>{a.label}</span><div className="rs-bar is-s"><i style={{ width: Math.round(((tally[a.key] || 0) / totAct) * 100) + "%", background: a.color }} /></div><em>{Math.round(((tally[a.key] || 0) / totAct) * 100)}%</em></div>
        ))}
      </div>
      <div className="mh-card rs-r">
        {!cur ? (
          <>
            <div className="gx-h"><h3 className="mh-serif"><BedDouble size={18} /> Peticiones y último descanso</h3></div>
            <div className="rs-scr">
              <span className="gx-lab" style={{ marginTop: 0 }}>Peticiones de la mesa</span>
              {reqs.length === 0 ? <p className="gx-sub" style={{ margin: "2px 0 0" }}>Nadie ha pedido un descanso.</p> : reqs.map((m) => {
                const t = doc.req[m.id].type;
                return (
                  <div key={m.id} className="rs-w">
                    <span className="cal-av" style={{ "--c": m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                    <span className="cal-nm"><b>{m.name}</b><small>Pide un {TYPES[t]?.[0].toLowerCase()} · {ago(doc.req[m.id].at)}</small></span>
                    <button type="button" className="mh-btn" disabled={t === "short" && blocked} onClick={() => start(t)}>Aceptar</button>
                  </div>
                );
              })}
              <span className="gx-lab">Último descanso</span>
              {last ? (
                <div className="rs-ev">
                  <b>{last.type === "long" ? <Moon size={13} /> : <Sun size={13} />} {TYPES[last.type][0]} · {ago(last.end)}</b>
                  <small>{(last.who || []).length} de {last.total} descansaron{last.who && last.who.length < last.total ? " · faltó " + Object.entries(last.names || {}).filter(([id]) => !last.who.includes(id)).map(([, n]) => n).join(", ") : ""}</small>
                  {chips([...new Set(Object.values(last.acts || {}).flat())])}
                </div>
              ) : <p className="gx-sub" style={{ margin: "2px 0 0" }}>Todavía no habéis hecho ningún descanso.</p>}
            </div>
          </>
        ) : (
          <>
            <div className="gx-h"><h3 className="mh-serif"><BedDouble size={18} /> Quién ha terminado</h3><span className="cx-chip on" style={{ "--c": "#4CC36B" }}>{done} / {members.length}</span></div>
            <div className="rs-bar" style={{ marginBottom: 12 }}><i style={{ width: (members.length ? (done / members.length) * 100 : 0) + "%" }} /></div>
            <div className="rs-scr">
              {members.map((m) => {
                const ok = cur.ready?.[m.id];
                return (
                  <div key={m.id} className="rs-w">
                    <span className="cal-av" style={{ "--c": m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                    <span className="cal-nm"><b>{m.name}</b>{ok ? chips(cur.acts?.[m.id]) : <small>Eligiendo acciones…</small>}</span>
                    <span className={"cx-chip on"} style={{ "--c": ok ? "#4CC36B" : "#E3B04B" }}>{ok ? <><i><Check size={12} /></i>Listo</> : <><i><Hourglass size={12} /></i>Pendiente</>}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Ventana rápida del DJ (atajo «Descanso» de Directo): pedir un descanso corto o largo al grupo, o cerrar el que está en curso.
export function RestQuick({ campaignId, members, onAnnounce, onClose, onOpenFull }) {
  const [doc, update] = useDoc(restKey(campaignId), EMPTY, 3000);
  const cur = doc.cur && !doc.cur.closed ? doc.cur : null;
  const done = members.filter((m) => cur?.ready?.[m.id]).length;
  const propose = (type) => {
    update((d) => startRest(d, type));
    onAnnounce("El DJ propone un " + TYPES[type][0].toLowerCase() + " para todo el grupo. Elige tus acciones y descansa.", { rest: type });
    onClose();
  };
  const end = () => {
    update((d) => finishRest(d, members));
    onAnnounce(TYPES[cur.type][0] + " del grupo terminado (" + done + " de " + members.length + "). " + (cur.type === "long" ? "El DJ gana 1d4 + " + members.length + " de Miedo." : "El DJ gana 1d4 de Miedo."));
    onClose();
  };
  return (
    <>
      <div className="mh-cl-h"><BedDouble size={14} /> <b>Descanso del grupo</b></div>
      {!cur ? (
        <div className="mh-rq-opts">
          {Object.entries(TYPES).map(([k, [label, Ico]]) => (
            <button key={k} type="button" className={"mh-rq-opt is-" + k} disabled={!members.length || (k === "short" && shortRun(doc) >= MAX_SHORT)} title={k === "short" && shortRun(doc) >= MAX_SHORT ? "Ya hay 3 descansos cortos seguidos: toca uno largo" : undefined} onClick={() => propose(k)}>
              <Ico size={20} />
              <span><b>{label}</b><small>{k === "long" ? "Recuperación completa. El DJ gana 1d4 + nº de PJ de Miedo." : "Cada jugador recupera 1d4 + su Rango. El DJ gana 1d4 de Miedo."}</small></span>
            </button>
          ))}
          {!members.length && <div className="mh-cl-empty">Añade personajes a la campaña para proponer un descanso.</div>}
        </div>
      ) : (
        <div className="mh-rq-cur">
          <span className="mh-rq-chip">{TYPES[cur.type][0]} en curso</span>
          <span className="mh-rq-n">{done} de {members.length} han descansado</span>
          <div className="mh-rq-acts">
            <button type="button" className="mh-btn-ghost" onClick={() => onAnnounce("El DJ pide que termine el descanso del grupo.")}><Bell size={13} /> Recordar</button>
            <button type="button" className="mh-btn" onClick={end}>Terminar descanso</button>
          </div>
        </div>
      )}
      <button type="button" className="mh-rq-more" onClick={onOpenFull}>Ver detalle por jugador</button>
    </>
  );
}

// Banner fijo del jugador mientras el DJ tiene un descanso en curso y a su personaje aún le falta descansar.
export function RestBanner({ campaignId, mine, ids, onOpen, onPending }) {
  const [doc] = useDoc(restKey(campaignId), EMPTY, 3500);
  const cur = doc.cur && !doc.cur.closed ? doc.cur : null;
  const pending = !!cur && mine.some((m) => !cur.ready?.[m.id]);
  useEffect(() => {
    if (onPending) onPending(pending);
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cur || !pending) return null;
  const total = Math.max(1, ids.length);
  const done = ids.filter((id) => cur.ready?.[id]).length;
  const [label, Ico] = TYPES[cur.type] || TYPES.short;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={"rb is-" + cur.type} role="status" aria-live="polite">
      <span className="rb-ic"><Ico size={18} /></span>
      <div className="rb-tx">
        <b>{label} en curso</b>
        <div className="rb-prog" aria-hidden="true"><i style={{ width: Math.round((done / total) * 100) + "%" }} /></div>
        <small>{done} de {total} han descansado</small>
      </div>
      <button type="button" className="mh-btn" onClick={onOpen}><BedDouble size={14} /> Descansar</button>
    </div>,
    document.body
  );
}
