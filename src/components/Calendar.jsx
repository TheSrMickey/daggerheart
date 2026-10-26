"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Check, HelpCircle, X, BookOpen, Pencil, Trash2, Repeat, Plus } from "lucide-react";
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
// Sesiones: cada una puede repetirse (semanal, cada 2 semanas o mensual). `doc.next` queda como la más cercana para el resto de la app.
export const REPEATS = { none: "No se repite", weekly: "Cada semana", biweekly: "Cada 2 semanas", monthly: "Cada mes" };
const nth = (ev, k) => {
  const d = new Date(ev.ts);
  if (ev.rec === "monthly") { const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + k); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return d.getTime(); }
  d.setDate(d.getDate() + k * (ev.rec === "weekly" ? 7 : 14));
  return d.getTime();
};
export const eventsOf = (doc) => (doc && doc.events) || (doc && doc.next ? [{ id: "n0", ts: doc.next.ts, place: doc.next.place || "", rec: "none" }] : []);
export const occurrences = (ev, from, to) => {
  if (!ev.rec || ev.rec === "none") return ev.ts >= from && ev.ts <= to ? [ev.ts] : [];
  const step = (ev.rec === "weekly" ? 7 : ev.rec === "biweekly" ? 14 : 30) * 864e5;
  const out = [];
  let k = from > ev.ts ? Math.max(0, Math.floor((from - ev.ts) / step) - 1) : 0;
  for (let i = 0; i < 800; i++, k++) { const t = nth(ev, k); if (t > to) break; if (t >= from) out.push(t); }
  return out;
};
const GRACE = 4 * 3600 * 1000;
// Las próximas sesiones (con repeticiones) a partir de `now`, de la más cercana a la más lejana.
export const upcomingOf = (doc, now, limit = 8) =>
  eventsOf(doc).flatMap((ev) => occurrences(ev, now - GRACE, now + 400 * 864e5).slice(0, limit).map((ts) => ({ ts, ev }))).sort((a, b) => a.ts - b.ts).slice(0, limit);
export const nextOf = (doc, now) => { const u = upcomingOf(doc, now, 1)[0]; return u ? { ts: u.ts, place: u.ev.place || "", id: u.ev.id } : null; };
export const rsvpOf = (doc, now) => { const n = nextOf(doc, now); return n && doc && (doc.rsvpTs == null || doc.rsvpTs === n.ts) ? doc.rsvp || {} : {}; };
const setRsvp = (d, ids, v) => { const n = nextOf(d, Date.now()); const base = n && (d.rsvpTs == null || d.rsvpTs === n.ts) ? d.rsvp || {} : {}; return { ...d, rsvp: { ...base, ...Object.fromEntries(ids.map((id) => [id, v])) }, rsvpTs: n ? n.ts : null }; };
const withNext = (d, evs) => { const n = nextOf({ events: evs }, Date.now()); return { ...d, events: evs, next: n ? { ts: n.ts, place: n.place } : null }; };
const dayKey = (ts) => { const d = new Date(ts); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); };

export function CampaignCalendar({ campaignId, isGm, members, colorOf }) {
  const [doc, update] = useDoc(calKey(campaignId), EMPTY, 6000);
  const [form, setForm] = useState(null); // { id|null, when, place, rec }
  const [now] = useState(() => Date.now());
  const [shift, setShift] = useState(0);
  const ups = upcomingOf(doc, now, 6);
  const next = ups[0] ? { ts: ups[0].ts, place: ups[0].ev.place } : null;
  const todayD = new Date(now);
  const view = new Date(todayD.getFullYear(), todayD.getMonth() + shift, 1);
  const first = (view.getDay() + 6) % 7;
  const total = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const evs = eventsOf(doc);
  const marks = useMemo(() => {
    const from = new Date(view.getFullYear(), view.getMonth(), 1).getTime(), to = new Date(view.getFullYear(), view.getMonth() + 1, 1).getTime() - 1;
    const m = new Map();
    evs.forEach((ev) => occurrences(ev, from, to).forEach((ts) => m.set(dayKey(ts), [...(m.get(dayKey(ts)) || []), ts])));
    (doc.past || []).forEach((ts) => { if (ts >= from && ts <= to && !m.has(dayKey(ts))) m.set(dayKey(ts), [ts]); });
    return m;
  }, [doc.events, doc.next, doc.past, shift]); // eslint-disable-line react-hooks/exhaustive-deps
  const today = dayKey(now);
  const rsvp = rsvpOf(doc, now);
  const yes = members.filter((m) => rsvp[m.id] === "yes").length;
  const pastList = useMemo(() => {
    const all = [...(doc.past || []), ...evs.flatMap((ev) => occurrences(ev, 0, now - GRACE).slice(-4))];
    return [...new Set(all)].sort((x, y) => y - x).slice(0, 4);
  }, [doc.events, doc.next, doc.past]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = (ts) => setForm({ id: null, when: toInput(ts || new Date(now + 7 * 864e5).setHours(20, 0, 0, 0)), place: "", rec: "none" });
  const openEdit = (ev) => setForm({ id: ev.id, when: toInput(ev.ts), place: ev.place || "", rec: ev.rec || "none" });
  const save = () => {
    const ts = new Date(form.when).getTime();
    if (!ts) return;
    const ev = { id: form.id || "e" + Date.now(), ts, place: form.place.trim(), rec: form.rec };
    update((d) => withNext(d, [...eventsOf(d).filter((x) => x.id !== ev.id), ev]));
    setForm(null);
  };
  const remove = (ev) => {
    if (ev.rec && ev.rec !== "none" && !window.confirm("Esta sesión se repite: se borrarán todas las repeticiones. ¿Continuar?")) return;
    update((d) => withNext(d, eventsOf(d).filter((x) => x.id !== ev.id)));
  };
  const mine = members.filter((m) => m.mine);
  const set = (st) => update((d) => setRsvp(d, mine.map((m) => m.id), st));
  const myState = mine.length && mine.every((m) => rsvp[m.id] === rsvp[mine[0].id]) ? rsvp[mine[0].id] : null;
  const tools = (ev) => isGm && (
    <span className="cal-tools">
      <button type="button" aria-label="Editar sesión" title="Editar" onClick={() => openEdit(ev)}><Pencil size={13} /></button>
      <button type="button" aria-label="Borrar sesión" title="Borrar" onClick={() => remove(ev)}><Trash2 size={13} /></button>
    </span>
  );

  return (
    <div className="cal">
      <div className="mh-card cal-month">
        <div className="gx-h"><h3 className="mh-serif" style={{ textTransform: "capitalize" }}>{MONTHS[view.getMonth()]} {view.getFullYear()}</h3><div className="gx-row"><button type="button" className={"mh-btn-ghost cal-today" + (shift !== 0 ? " is-off" : "")} title="Ir al día de hoy" onClick={() => setShift(0)}>Hoy</button><button type="button" className="mh-btn-ghost" aria-label="Mes anterior" onClick={() => setShift((s) => s - 1)}>‹</button><button type="button" className="mh-btn-ghost" aria-label="Mes siguiente" onClick={() => setShift((s) => s + 1)}>›</button></div></div>
        <div className="cal-grid" style={{ "--rows": Math.ceil((first + total) / 7) }}>
          {DAYS.map((d) => <small key={d}>{d}</small>)}
          {Array.from({ length: first }, (_, i) => <i key={"e" + i} />)}
          {Array.from({ length: total }, (_, i) => {
            const k = view.getFullYear() + "-" + view.getMonth() + "-" + (i + 1);
            const hits = marks.get(k) || [];
            const isNext = next && dayKey(next.ts) === k;
            const cls = "cal-day" + (hits.length ? " is-ses" : "") + (isNext ? " is-next" : "") + (k === today ? " is-today" : "") + (isGm ? " is-btn" : "");
            const tip = hits.length ? hits.map((ts) => fmtTime(ts)).join(" · ") : isGm ? "Fijar una sesión este día" : undefined;
            return isGm
              ? <button key={i} type="button" className={cls} title={tip} aria-label={"Día " + (i + 1) + (hits.length ? ", con sesión" : ", fijar sesión")} onClick={() => { const d = new Date(view.getFullYear(), view.getMonth(), i + 1); const t = hits[0] ? new Date(hits[0]) : null; d.setHours(t ? t.getHours() : 20, t ? t.getMinutes() : 0, 0, 0); openNew(d.getTime()); }}>{i + 1}{hits.length > 0 && <u />}</button>
              : <div key={i} className={cls} title={tip}>{i + 1}{hits.length > 0 && <u />}</div>;
          })}
        </div>
        <div className="cal-leg"><span><u className="n" /> Próxima</span><span><u /> Otras sesiones</span><span><s /> Hoy</span></div>
      </div>
      <div className="mh-card cal-main">
        <div className="gx-h">
          <h3 className="mh-serif"><CalendarDays size={18} /> Próximos eventos</h3>
          {isGm && <button type="button" className="mh-btn" onClick={() => (form ? setForm(null) : openNew())}><Plus size={14} /> Fijar sesión</button>}
        </div>
        <div className="cal-side">
          {form && (
            <div className="cal-edit">
              <label><span className="gx-lab">Fecha y hora</span><input className="mh-input" type="datetime-local" value={form.when} onChange={(e) => setForm((f) => ({ ...f, when: e.target.value }))} /></label>
              <label><span className="gx-lab">Dónde (opcional)</span><input className="mh-input" placeholder="Discord, casa de Ana…" value={form.place} onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))} /></label>
              <label><span className="gx-lab">Repetir</span><select className="mh-input" value={form.rec} onChange={(e) => setForm((f) => ({ ...f, rec: e.target.value }))}>{Object.entries(REPEATS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <div className="gx-row" style={{ width: "100%" }}><button type="button" className="mh-btn" onClick={save}>{form.id ? "Guardar cambios" : "Guardar sesión"}</button><button type="button" className="mh-btn-ghost" onClick={() => setForm(null)}>Cancelar</button></div>
            </div>
          )}
          {next ? (
            <>
              <div className="cal-hero">
                <div className="cal-date"><small>{new Date(next.ts).toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "").toUpperCase()}</small><b className="mh-serif">{new Date(next.ts).getDate()}</b><small>{MONTHS[new Date(next.ts).getMonth()].slice(0, 3)} · {fmtTime(next.ts)}</small></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b className="mh-serif cal-ev">Sesión de juego {tools(ups[0].ev)}</b>
                  <div className="cal-count">Empieza en <b>{countdown(next.ts, now)}</b></div>
                  <div className="gx-row">{next.place && <span className="cx-chip"><MapPin size={13} /> {next.place}</span>}{ups[0].ev.rec && ups[0].ev.rec !== "none" && <span className="cx-chip"><Repeat size={12} /> {REPEATS[ups[0].ev.rec]}</span>}</div>
                </div>
              </div>
              <span className="gx-lab" style={{ marginTop: 14 }}>¿Quién viene? · {yes} de {members.length} confirmados</span>
              <div className="cal-rsvp">
                {members.map((m) => {
                  const st = rsvp[m.id];
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
              {ups.length > 1 && (
                <>
                  <span className="gx-lab" style={{ marginTop: 14 }}>Después</span>
                  <div className="cal-more">
                    {ups.slice(1).map((u) => (
                      <div key={u.ev.id + u.ts} className="cal-row">
                        <span className="cal-rd"><b>{new Date(u.ts).getDate()}</b><small>{MONTHS[new Date(u.ts).getMonth()].slice(0, 3)}</small></span>
                        <span className="cal-rt"><b>{fmtDate(u.ts)} · {fmtTime(u.ts)}</b><small>{[u.ev.place, u.ev.rec && u.ev.rec !== "none" ? REPEATS[u.ev.rec] : ""].filter(Boolean).join(" · ") || "Sesión de juego"}</small></span>
                        {tools(u.ev)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : !form && (
            <div className="cal-empty"><span><CalendarDays size={24} strokeWidth={1.5} /></span><b>No hay sesiones fijadas</b><small>{isGm ? "Pulsa «Fijar sesión» o un día del calendario; puedes repetirla cada semana o cada mes." : "El DJ todavía no ha fijado la próxima sesión."}</small></div>
          )}
          {pastList.length > 0 && (
            <>
              <span className="gx-lab" style={{ marginTop: 14 }}>Sesiones anteriores</span>
              <div className="gx-row">{pastList.map((ts) => <span key={ts} className="cx-chip">{fmtDate(ts)}</span>)}</div>
            </>
          )}
        </div>
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
    const next = nextOf(docs[cp.id], now);
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
  const items = camps.map((cp) => ({ cp, next: nextOf(docs[cp.id], now) })).filter((x) => x.next && x.next.ts >= now - 3 * 3600 * 1000).sort((a, b) => a.next.ts - b.next.ts);
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
    .map((cp) => ({ cp, next: nextOf(docs[cp.id], now), rsvp: rsvpOf(docs[cp.id], now) }))
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
  const answer = (v) => mutateDoc(calKey(cp.id), EMPTY, (d) => setRsvp(d, members.map((m) => m.id), v)).then((n) => setDocs((x) => ({ ...x, [cp.id]: n })));
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
    .map((cp) => ({ cp, next: nextOf(docs[cp.id], now), rsvp: rsvpOf(docs[cp.id], now) }))
    .filter((x) => x.next && x.next.ts >= now - 3 * 3600 * 1000)
    .sort((a, b) => a.next.ts - b.next.ts);
  if (!items.length) return null;
  const answer = (cp, mine, v) =>
    mutateDoc(calKey(cp.id), EMPTY, (d) => setRsvp(d, mine.map((m) => m.id), v)).then((n) => setDocs((s) => ({ ...s, [cp.id]: n })));
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
