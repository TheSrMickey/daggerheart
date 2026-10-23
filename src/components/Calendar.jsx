"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Check, HelpCircle, X, BookOpen } from "lucide-react";
import { useDoc, readDoc, mutateDoc } from "@/lib/campaignDocs";

// Calendario de la campaña: la próxima sesión, quién viene y un mes con las sesiones marcadas.
export const calKey = (id) => "campaign-cal:" + id;
const EMPTY = { next: null, past: [], rsvp: {} };
const STATES = { yes: ["Voy", "#4CC36B", Check], maybe: ["Quizá", "#F0A037", HelpCircle], no: ["No puedo", "#D9644E", X] };
const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const fmtDate = (ts) => new Date(ts).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }).replace(".", "");
export const fmtTime = (ts) => new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
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

// Inicio · «Retoma tus campañas»: una ficha ancha por campaña con la próxima sesión y quién juega.
export function HomeCampCards({ camps, colorOf, membersOf, onOpen }) {
  const key = camps.map((c) => c.id).join(",");
  const [docs, setDocs] = useState({});
  const [now] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      const out = {};
      await Promise.all(key.split(",").filter(Boolean).map(async (id) => { out[id] = await readDoc(calKey(id), EMPTY); }));
      if (alive) setDocs(out);
    };
    pull();
    const t = setInterval(pull, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [key]);
  return camps.map((cp) => {
    const mem = membersOf(cp);
    const next = docs[cp.id]?.next;
    const soon = next && next.ts >= now - 3 * 3600 * 1000 ? next : null;
    return (
      <button type="button" key={cp.id} className="mh-hcard" style={{ "--hc": colorOf(cp.id) }} onClick={() => onOpen(cp)}>
        <span className="mh-hcard-art"><BookOpen size={30} strokeWidth={1.7} /></span>
        <span className="mh-hcard-b">
          <b>{cp.name || "Campaña"}</b>
          <small>{mem.length} personaje{mem.length === 1 ? "" : "s"}</small>
          <span className="mh-hcard-row">
            {soon ? <span className="mh-hcard-pill"><CalendarDays size={11} /> {fmtDate(soon.ts)} · {fmtTime(soon.ts)}</span> : <span className="mh-hcard-pill is-off">Sin sesión fijada</span>}
            {mem.length > 0 && (
              <span className="mh-hcard-avs">
                {mem.slice(0, 4).map((m) => <span key={m.id} style={{ background: m.color }} title={m.name}>{(m.name || "?").charAt(0).toUpperCase()}</span>)}
                {mem.length > 4 && <span className="is-more">+{mem.length - 4}</span>}
              </span>
            )}
          </span>
        </span>
      </button>
    );
  });
}

// La próxima sesión fijada entre las campañas dadas (la más cercana), para el carrusel de Inicio.
export function useNextSession(camps) {
  const key = camps.map((c) => c.id).join(",");
  const [docs, setDocs] = useState({});
  const [now] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      const out = {};
      await Promise.all(key.split(",").filter(Boolean).map(async (id) => { out[id] = await readDoc(calKey(id), EMPTY); }));
      if (alive) setDocs(out);
    };
    pull();
    const t = setInterval(pull, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [key]);
  const items = camps.map((cp) => ({ cp, next: docs[cp.id]?.next })).filter((x) => x.next && x.next.ts >= now - 3 * 3600 * 1000).sort((a, b) => a.next.ts - b.next.ts);
  return items[0] ? { ...items[0], now } : null;
}

// Inicio · «Próxima sesión»: la sesión agendada más cercana entre tus campañas, con quién viene y para responder sin entrar al calendario.
// Si no hay ninguna sesión agendada lo dice, y ofrece fijarla (o crear una campaña si todavía no tienes ninguna).
export function HomeNextSession({ camps, characters, campColor, classColor, onOpen, onCreate }) {
  const key = camps.map((c) => c.id).join(",");
  const [docs, setDocs] = useState({});
  const [now] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      const out = {};
      await Promise.all(key.split(",").filter(Boolean).map(async (id) => { out[id] = await readDoc(calKey(id), EMPTY); }));
      if (alive) setDocs(out);
    };
    pull();
    const t = setInterval(pull, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [key]);
  const items = camps
    .map((cp) => ({ cp, next: docs[cp.id]?.next, rsvp: docs[cp.id]?.rsvp || {} }))
    .filter((x) => x.next && x.next.ts >= now - 3 * 3600 * 1000)
    .sort((a, b) => a.next.ts - b.next.ts);
  const head = (
    <div className="mh-home-sec">
      <h3>Próxima sesión</h3>
      {camps.length > 0 && <button type="button" onClick={() => onOpen(items[0]?.cp || camps[0])}>Ver calendario ›</button>}
    </div>
  );
  if (!items.length) {
    return (
      <>
        {head}
        <div className="mh-hns is-empty">
          <span className="mh-hns-ic"><CalendarDays size={22} /></span>
          <div className="mh-hns-b">
            <b>No tienes ninguna sesión agendada</b>
            <small>{camps.length > 0 ? "Cuando el DJ fije una fecha en el calendario de la campaña, aparecerá aquí para que confirmes tu asistencia." : "Crea una campaña o únete a una mesa para empezar a agendar sesiones."}</small>
          </div>
          <button type="button" className="mh-home-btn" onClick={() => (camps.length > 0 ? onOpen(camps[0]) : onCreate())}>{camps.length > 0 ? "Abrir calendario" : "Crear campaña"}</button>
        </div>
      </>
    );
  }
  const { cp, next, rsvp } = items[0];
  const members = (cp.characterIds || []).filter((id) => characters[id]).map((id) => ({ id, name: characters[id].f_name || "Sin nombre", cls: characters[id].f_class || "" }));
  const st = members.length && members.every((m) => rsvp[m.id] === rsvp[members[0].id]) ? rsvp[members[0].id] : null;
  const yes = members.filter((m) => rsvp[m.id] === "yes").length;
  const answer = (v) => mutateDoc(calKey(cp.id), EMPTY, (d) => ({ ...d, rsvp: { ...(d.rsvp || {}), ...Object.fromEntries(members.map((m) => [m.id, v])) } })).then((n) => setDocs((x) => ({ ...x, [cp.id]: n })));
  const d = new Date(next.ts);
  const rest = items.slice(1, 3);
  return (
    <>
      {head}
      <div className="mh-hns is-one" style={{ "--hc": campColor(cp.id) }}>
        <button type="button" className="mh-hns-ic is-date" onClick={() => onOpen(cp)} aria-label={"Abrir el calendario de " + (cp.name || "la campaña")}>
          <b>{d.getDate()}</b>
          <small>{d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}</small>
        </button>
        <div className="mh-hns-b" title={members.map((m) => m.name + ": " + (rsvp[m.id] ? STATES[rsvp[m.id]][0] : "Sin responder")).join("\n") + (rest.length ? "\nDespués: " + rest.map((r) => (r.cp.name || "Campaña") + " · " + fmtDate(r.next.ts) + " " + fmtTime(r.next.ts)).join("  ·  ") : "")}>
          <b className="mh-serif mh-hns-name">{cp.name || "Campaña"}</b>
          <small>
            {d.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "")} {fmtTime(next.ts)} · en {countdown(next.ts, now)}
            {next.place ? <> · <MapPin size={11} /> {next.place}</> : ""}
            {members.length > 0 ? " · " + yes + " de " + members.length + " confirmados" : ""}
          </small>
        </div>
        {members.length > 0 && (
          <span className="mh-hns-rsvp">
            {Object.entries(STATES).map(([k, [label, c, Ico]]) => (
              <button key={k} type="button" className={st === k ? "on" : ""} style={{ "--c": c }} aria-pressed={st === k} onClick={() => answer(k)}><Ico size={13} /> {label}</button>
            ))}
          </span>
        )}
      </div>
    </>
  );
}

// Inicio: sección «Próximas sesiones» con el mismo diseño que «Retoma tus campañas» y «Tus personajes».
// Una ficha por campaña con sesión fijada: día, hora, cuenta atrás y un toque para confirmar si vas.
export function HomeSessions({ camps, colorOf, mineOf, onOpen }) {
  const key = camps.map((c) => c.id).join(",");
  const [docs, setDocs] = useState({});
  const [now] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      const out = {};
      await Promise.all(key.split(",").filter(Boolean).map(async (id) => { out[id] = await readDoc(calKey(id), EMPTY); }));
      if (alive) setDocs(out);
    };
    pull();
    const t = setInterval(pull, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [key]);
  const items = camps
    .map((cp) => ({ cp, next: docs[cp.id]?.next, rsvp: docs[cp.id]?.rsvp || {} }))
    .filter((x) => x.next && x.next.ts >= now - 3 * 3600 * 1000)
    .sort((a, b) => a.next.ts - b.next.ts);
  if (!items.length) return null;
  const answer = (cp, mine, v) =>
    mutateDoc(calKey(cp.id), EMPTY, (d) => ({ ...d, rsvp: { ...(d.rsvp || {}), ...Object.fromEntries(mine.map((m) => [m.id, v])) } })).then((n) => setDocs((s) => ({ ...s, [cp.id]: n })));
  return (
    <>
      <div className="mh-home-sec">
        <h3>Próximas sesiones <i>{items.length}</i></h3>
        <button type="button" onClick={() => onOpen(items[0].cp)}>Ver calendario ›</button>
      </div>
      <div className="mh-home-row">
        {items.map(({ cp, next, rsvp }) => {
          const mine = mineOf(cp);
          const st = mine.length && mine.every((m) => rsvp[m.id] === rsvp[mine[0].id]) ? rsvp[mine[0].id] : null;
          const d = new Date(next.ts);
          return (
            <div key={cp.id} className="mh-home-tile is-ses" style={{ "--hc": colorOf(cp.id) }} role="button" tabIndex={0} onClick={() => onOpen(cp)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(cp))}>
              <span className="mh-home-tile-art is-ses">
                <strong>{d.getDate()}</strong>
                <em>{d.toLocaleDateString("es-ES", { weekday: "short", month: "short" }).replace(/\./g, "")}</em>
              </span>
              <b>{cp.name || "Campaña"}</b>
              <small>{fmtTime(next.ts)} · en {countdown(next.ts, now)}</small>
              {next.place && <small className="ses-pl"><MapPin size={10} /> {next.place}</small>}
              {mine.length > 0 && (
                <span className="ses-rsvp" onClick={(e) => e.stopPropagation()}>
                  {Object.entries(STATES).map(([k, [label, c, Ico]]) => (
                    <button key={k} type="button" className={st === k ? "on" : ""} style={{ "--c": c }} title={label} aria-label={label} aria-pressed={st === k} onClick={() => answer(cp, mine, k)}>
                      <Ico size={13} />
                    </button>
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
