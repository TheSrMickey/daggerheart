"use client";

import { useState } from "react";
import { ScrollText, History, Clapperboard, Swords, KeyRound, ChevronsUp, Dices, Moon, Vote, Share2 } from "lucide-react";
import { useDoc } from "@/lib/campaignDocs";
import { logKey, chronKey, TYPES, dayOf } from "@/lib/chronicle";

// Crónica y línea de tiempo: se alimentan solas con los hitos que la mesa va dejando en el chat.
const ICONS = { escena: Clapperboard, combate: Swords, pista: KeyRound, nivel: ChevronsUp, critico: Dices, descanso: Moon, voto: Vote };
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const dayLabel = (k) => { const [y, m, d] = k.split("-").map(Number); return d + " de " + MONTHS[m - 1] + " de " + y; };
const hhmm = (ts) => new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const list = (a) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " y " + a[a.length - 1]);

function sessionsOf(log) {
  const days = [...new Set(log.map((e) => dayOf(e.ts)))].sort();
  return days.map((k, i) => ({ key: k, n: i + 1, events: log.filter((e) => dayOf(e.ts) === k).sort((a, b) => a.ts - b.ts) }));
}
// Resumen automático: frases cortas a partir de lo que pasó.
function autoSummary(events) {
  const by = (t) => events.filter((e) => e.type === t);
  const out = [];
  const esc = [...new Set(by("escena").map((e) => e.text))];
  if (esc.length) out.push("El grupo pasó por " + list(esc.map((s) => "«" + s + "»")) + ".");
  const fights = by("combate").length;
  if (fights) out.push("Hubo combate: " + fights + " acciones y golpes registrados" + (by("critico").length ? ", con " + by("critico").length + " crítico" + (by("critico").length === 1 ? "" : "s") : "") + ".");
  else if (by("critico").length) out.push("Hubo " + by("critico").length + " crítico" + (by("critico").length === 1 ? "" : "s") + ": " + list(by("critico").map((e) => e.who)) + ".");
  const pistas = by("pista").map((e) => e.text);
  if (pistas.length) out.push("Hallaron " + list([...new Set(pistas)]) + ".");
  const niv = by("nivel").map((e) => e.text);
  if (niv.length) out.push(list([...new Set(niv)]).replace(/^./, (c) => c.toUpperCase()) + ".");
  if (by("descanso").length) out.push("Hicieron un descanso del grupo.");
  if (by("voto").length) out.push("La mesa votó " + by("voto").length + " vez" + (by("voto").length === 1 ? "" : "es") + ".");
  return out.join(" ") || "Todavía no hay hitos en esta sesión.";
}

export function Chronicle({ campaignId, onShare }) {
  const [log] = useDoc(logKey(campaignId), [], 6000);
  const [chron, update] = useDoc(chronKey(campaignId), { days: {} }, 8000);
  const sess = sessionsOf(Array.isArray(log) ? log : []);
  const [selKey, setSel] = useState(null);
  const cur = sess.find((s) => s.key === selKey) || sess[sess.length - 1];
  const patch = (day, p) => update((d) => ({ ...d, days: { ...(d.days || {}), [day]: { ...((d.days || {})[day] || {}), ...p } } }));
  if (!cur) {
    return <div className="mh-card gx" style={{ margin: 0 }}><div className="gx-h"><h3 className="mh-serif"><ScrollText size={18} /> Crónica de la campaña</h3></div><p className="gx-sub">Todavía no hay nada que contar. Según la mesa juegue (escenas, combates, pistas, subidas de nivel, descansos…), aquí irá apareciendo la crónica de cada sesión.</p></div>;
  }
  const meta = (chron.days || {})[cur.key] || {};
  const hidden = new Set(meta.hidden || []);
  const events = cur.events.filter((e) => !hidden.has(e.ts));
  const summary = meta.summary != null ? meta.summary : autoSummary(events);
  const who = [...new Set(cur.events.filter((e) => e.who && e.who !== "El DJ").map((e) => e.who))];
  return (
    <div className="mh-card gx" style={{ margin: 0, maxWidth: 940 }}>
      <div className="gx-h"><h3 className="mh-serif"><ScrollText size={18} /> Crónica de la campaña</h3><button type="button" className="mh-btn" onClick={() => { onShare("📖 Crónica · Sesión " + cur.n + " (" + dayLabel(cur.key) + "): " + summary); patch(cur.key, { published: true }); }}><Share2 size={14} /> {meta.published ? "Compartida · volver a compartir" : "Compartir con la mesa"}</button></div>
      <p className="gx-sub">Se rellena sola con lo que pasa en la mesa. Edítala antes de compartirla.</p>
      <div className="ch-grid">
        <div className="ch-list">
          {[...sess].reverse().map((s) => (
            <button key={s.key} type="button" className={"ch-ses" + (s.key === cur.key ? " on" : "")} onClick={() => setSel(s.key)}>
              <b>Sesión {s.n}</b><small>{dayLabel(s.key)} · {s.events.length} hitos</small>
              {(chron.days || {})[s.key]?.published ? <em>Publicada</em> : <em className="draft">● Borrador</em>}
            </button>
          ))}
        </div>
        <div>
          <span className="gx-lab" style={{ marginTop: 0 }}>Resumen · {meta.summary != null ? "editado" : "borrador automático"}</span>
          <textarea className="mh-input ch-sum" value={summary} onChange={(e) => patch(cur.key, { summary: e.target.value })} aria-label="Resumen de la sesión" />
          {meta.summary != null && <button type="button" className="mh-btn-ghost" style={{ marginTop: 6 }} onClick={() => patch(cur.key, { summary: null })}>Volver al automático</button>}
          <span className="gx-lab">Momentos clave · se detectan solos</span>
          {events.length === 0 && <p className="gx-note">No hay hitos visibles.</p>}
          {events.map((e) => { const T = TYPES[e.type] || TYPES.escena, I = ICONS[e.type] || Clapperboard; return (
            <div key={e.ts + e.text} className="ch-ev" style={{ "--c": T.color }}>
              <span className="ch-ic"><I size={15} /></span>
              <span className="ch-tx"><small>{T.label.toUpperCase()}</small><b>{e.text}</b><em>{hhmm(e.ts)}{e.who ? " · " + e.who : ""}</em></span>
              <button type="button" className="cx-chip" onClick={() => patch(cur.key, { hidden: [...hidden, e.ts] })}>Quitar</button>
            </div>); })}
          {hidden.size > 0 && <button type="button" className="mh-btn-ghost" onClick={() => patch(cur.key, { hidden: [] })}>Restaurar {hidden.size} quitado{hidden.size === 1 ? "" : "s"}</button>}
          <span className="gx-lab">Quién estuvo</span>
          <div className="gx-row">{who.length ? who.map((w) => <span key={w} className="cx-chip">{w}</span>) : <span className="gx-fact">Sin datos todavía</span>}</div>
          <span className="gx-lab">Notas del DJ (solo las ves tú)</span>
          <textarea key={cur.key} className="mh-input" style={{ minHeight: 70, width: "100%", resize: "vertical" }} placeholder="Ganchos para la próxima sesión…" defaultValue={meta.notes || ""} onBlur={(e) => patch(cur.key, { notes: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

export function Timeline({ campaignId }) {
  const [log] = useDoc(logKey(campaignId), [], 6000);
  const [filter, setFilter] = useState(null);
  const sess = sessionsOf(Array.isArray(log) ? log : []).reverse();
  return (
    <div className="mh-card gx" style={{ margin: 0, maxWidth: 940 }}>
      <div className="gx-h"><h3 className="mh-serif"><History size={18} /> Línea de tiempo</h3></div>
      <p className="gx-sub">Toda la historia en orden, sesión a sesión.</p>
      <div className="gx-row">
        <button type="button" className={"cx-chip" + (!filter ? " on" : "")} style={{ "--c": "#C9A24A" }} onClick={() => setFilter(null)}>Todo</button>
        {Object.entries(TYPES).map(([k, T]) => <button key={k} type="button" className={"cx-chip" + (filter === k ? " on" : "")} style={{ "--c": T.color }} onClick={() => setFilter(filter === k ? null : k)}>{T.label}</button>)}
      </div>
      {sess.length === 0 && <p className="gx-note" style={{ marginTop: 14 }}>Todavía no hay hitos. Irán apareciendo según se juegue.</p>}
      {sess.map((s) => {
        const ev = [...s.events].reverse().filter((e) => !filter || e.type === filter);
        if (!ev.length) return null;
        return (
          <section key={s.key}>
            <div className="cx-lv"><b>Sesión {s.n}</b><span /><small>{dayLabel(s.key)}</small></div>
            {ev.map((e) => { const T = TYPES[e.type] || TYPES.escena, I = ICONS[e.type] || Clapperboard; return (
              <div key={e.ts + e.text} className="tl-row" style={{ "--c": T.color }}>
                <span className="tl-node"><I size={15} /></span>
                <div className="ch-ev" style={{ "--c": T.color, flex: 1, margin: 0 }}><span className="ch-tx"><small>{T.label.toUpperCase()}</small><b>{e.text}</b><em>{hhmm(e.ts)}{e.who ? " · " + e.who : ""}</em></span></div>
              </div>); })}
          </section>
        );
      })}
    </div>
  );
}
