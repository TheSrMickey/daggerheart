"use client";

import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Check, HelpCircle, X } from "lucide-react";
import { useDoc } from "@/lib/campaignDocs";

// Calendario de la campaña: la próxima sesión, quién viene y un mes con las sesiones marcadas.
export const calKey = (id) => "campaign-cal:" + id;
const EMPTY = { next: null, past: [], rsvp: {} };
const STATES = { yes: ["Voy", "#4CC36B", Check], maybe: ["Quizá", "#F0A037", HelpCircle], no: ["No puedo", "#D9644E", X] };
const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fmtDate = (ts) => new Date(ts).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }).replace(".", "");
const fmtTime = (ts) => new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const toInput = (ts) => { const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()); };
export const countdown = (ts, now) => {
  const ms = ts - now;
  if (ms <= 0) return "ahora";
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d >= 1 ? d + " día" + (d === 1 ? "" : "s") + (h % 24 ? " y " + (h % 24) + " h" : "") : h >= 1 ? h + " h" + (m % 60 ? " " + (m % 60) + " min" : "") : m + " min";
};
const dayKey = (ts) => { const d = new Date(ts); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); };

export function CampaignCalendar({ campaignId, isGm, members, colorOf }) {
  const [doc, update] = useDoc(calKey(campaignId), EMPTY, 6000);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ when: "", place: "" });
  const [now] = useState(() => Date.now());
  const [shift, setShift] = useState(0);
  const next = doc.next && doc.next.ts > now - 4 * 3600 * 1000 ? doc.next : null;
  const base = next ? new Date(next.ts) : new Date(now);
  const view = new Date(base.getFullYear(), base.getMonth() + shift, 1);
  const first = (view.getDay() + 6) % 7;
  const total = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const marks = useMemo(() => new Set([...(doc.past || []), next ? next.ts : null].filter(Boolean).map(dayKey)), [doc.past, next]);
  const today = dayKey(now);
  const yes = members.filter((m) => doc.rsvp?.[m.id] === "yes").length;

  const save = () => {
    const ts = new Date(draft.when).getTime();
    if (!ts) return;
    update((d) => ({ ...d, past: d.next && d.next.ts < ts && d.next.ts < Date.now() ? [...(d.past || []), d.next.ts].slice(-60) : d.past || [], next: { ts, place: draft.place.trim() }, rsvp: {} }));
    setEditing(false);
  };
  const mine = members.filter((m) => m.mine);
  const set = (st) => update((d) => ({ ...d, rsvp: { ...(d.rsvp || {}), ...Object.fromEntries(mine.map((m) => [m.id, st])) } }));
  const myState = mine.length && mine.every((m) => doc.rsvp?.[m.id] === doc.rsvp?.[mine[0].id]) ? doc.rsvp?.[mine[0].id] : null;

  return (
    <div className="cal">
      <div className="mh-card cal-main">
        <div className="gx-h">
          <h3 className="mh-serif"><CalendarDays size={18} /> Próxima sesión</h3>
          {isGm && <button type="button" className="mh-btn-ghost" onClick={() => (setDraft({ when: toInput(next ? next.ts : now + 7 * 864e5), place: next?.place || "" }), setEditing((v) => !v))}>{next ? "Cambiar fecha" : "Fijar fecha"}</button>}
        </div>
        {editing && (
          <div className="cal-edit">
            <label><span className="gx-lab">Fecha y hora</span><input className="mh-input" type="datetime-local" value={draft.when} onChange={(e) => setDraft((d) => ({ ...d, when: e.target.value }))} /></label>
            <label><span className="gx-lab">Dónde (opcional)</span><input className="mh-input" placeholder="Discord, casa de Ana…" value={draft.place} onChange={(e) => setDraft((d) => ({ ...d, place: e.target.value }))} /></label>
            <button type="button" className="mh-btn" onClick={save}>Guardar</button>
          </div>
        )}
        {next ? (
          <>
            <div className="cal-hero">
              <div className="cal-date"><small>{new Date(next.ts).toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "").toUpperCase()}</small><b className="mh-serif">{new Date(next.ts).getDate()}</b><small>{MONTHS[new Date(next.ts).getMonth()].slice(0, 3)} · {fmtTime(next.ts)}</small></div>
              <div>
                <div className="cal-count">Empieza en <b>{countdown(next.ts, now)}</b></div>
                {next.place && <span className="cx-chip"><MapPin size={13} /> {next.place}</span>}
              </div>
            </div>
            <span className="gx-lab" style={{ marginTop: 16 }}>¿Quién viene? · {yes} de {members.length} confirmados</span>
            <div className="cal-rsvp">
              {members.map((m) => {
                const st = doc.rsvp?.[m.id];
                const S = st ? STATES[st] : null;
                return (
                  <div key={m.id} className="cal-who">
                    <span className="cal-av" style={{ "--c": colorOf(m.cls) }}>{(m.name || "?").charAt(0).toUpperCase()}</span>
                    <span className="cal-nm"><b>{m.name}{m.mine ? " · tú" : ""}</b><small>{m.cls}</small></span>
                    <span className="cx-chip on" style={{ "--c": S ? S[1] : "#8b8bad" }}>{S ? S[0] : "Sin responder"}</span>
                  </div>
                );
              })}
              {members.length === 0 && <div className="gx-note">Todavía no hay personajes en la campaña.</div>}
            </div>
            {mine.length > 0 && (
              <div className="cal-btns">
                {Object.entries(STATES).map(([k, [label, c, Ic]]) => (
                  <button key={k} type="button" className={"cx-chip" + (myState === k ? " on" : "")} style={{ "--c": c, flex: 1, justifyContent: "center" }} onClick={() => set(k)}><i><Ic size={14} /></i>{label}</button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="gx-sub" style={{ marginTop: 14 }}>{isGm ? "Todavía no has fijado la próxima sesión. Pulsa «Fijar fecha» y tus jugadores podrán confirmar." : "El DJ todavía no ha fijado la próxima sesión."}</p>
        )}
      </div>
      <div className="mh-card cal-month">
        <div className="gx-h"><h3 className="mh-serif" style={{ textTransform: "capitalize" }}>{MONTHS[view.getMonth()]} {view.getFullYear()}</h3><div className="gx-row"><button type="button" className="mh-btn-ghost" aria-label="Mes anterior" onClick={() => setShift((s) => s - 1)}>‹</button><button type="button" className="mh-btn-ghost" aria-label="Mes siguiente" onClick={() => setShift((s) => s + 1)}>›</button></div></div>
        <div className="cal-grid">
          {DAYS.map((d) => <small key={d}>{d}</small>)}
          {Array.from({ length: first }, (_, i) => <i key={"e" + i} />)}
          {Array.from({ length: total }, (_, i) => {
            const k = view.getFullYear() + "-" + view.getMonth() + "-" + (i + 1);
            const isNext = next && dayKey(next.ts) === k;
            return <div key={i} className={"cal-day" + (marks.has(k) ? " is-ses" : "") + (isNext ? " is-next" : "") + (k === today ? " is-today" : "")}>{i + 1}{marks.has(k) && <u />}</div>;
          })}
        </div>
        <div className="cal-leg"><span><u className="n" /> Próxima</span><span><u /> Pasada</span><span><s /> Hoy</span></div>
      </div>
    </div>
  );
}

// Aviso en Inicio: la próxima sesión de cada campaña con fecha y un toque para confirmar.
export function NextSession({ campaign, mine, colorOf }) {
  const [doc, update] = useDoc(calKey(campaign.id), EMPTY, 30000);
  const [now] = useState(() => Date.now());
  const next = doc.next;
  if (!next || next.ts < now - 3 * 3600 * 1000) return null;
  const st = mine.length && mine.every((m) => doc.rsvp?.[m.id] === doc.rsvp?.[mine[0].id]) ? doc.rsvp?.[mine[0].id] : null;
  const set = (v) => update((d) => ({ ...d, rsvp: { ...(d.rsvp || {}), ...Object.fromEntries(mine.map((m) => [m.id, v])) } }));
  return (
    <div className="ns" style={{ "--c": colorOf }}>
      <div className="ns-d"><small>{fmtDate(next.ts)}</small><b>{fmtTime(next.ts)}</b></div>
      <div className="ns-t"><b>Próxima sesión · {campaign.name || "Campaña"}</b><small>Empieza en {countdown(next.ts, now)}{next.place ? " · " + next.place : ""}</small></div>
      {mine.length > 0 && (
        <div className="gx-row">
          {Object.entries(STATES).map(([k, [label, c]]) => <button key={k} type="button" className={"cx-chip" + (st === k ? " on" : "")} style={{ "--c": c }} onClick={() => set(k)}>{label}</button>)}
        </div>
      )}
    </div>
  );
}
