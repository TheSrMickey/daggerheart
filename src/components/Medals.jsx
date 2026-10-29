"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Award, X } from "lucide-react";
import { useDoc } from "@/lib/campaignDocs";
import { dayOf } from "@/lib/chronicle";
import { trackStat } from "@/lib/social";

// Medallas de la sesión: el DJ tiene 8 medallas fijas y cada una solo puede darse a una persona por sesión (día natural).
export const medalsKey = (id) => "campaign-medals:" + id;
const EMPTY = { list: [] };
export const MEDALS = [
  { key: "exacta", icon: "🎲", name: "Tirada exacta", color: "#C9A24A" },
  { key: "idea", icon: "💡", name: "Idea brillante", color: "#E3B04B" },
  { key: "interpreta", icon: "🎭", name: "Gran interpretación", color: "#A58BE8" },
  { key: "jugada", icon: "⚔️", name: "Jugada increíble", color: "#E0544A" },
  { key: "salvo", icon: "🛡️", name: "Salvó al grupo", color: "#5E93C9" },
  { key: "alma", icon: "😂", name: "Alma de la mesa", color: "#E08A4A" },
  { key: "plan", icon: "🧠", name: "Plan perfecto", color: "#4f9a62" },
  { key: "ultima", icon: "💀", name: "Última gota", color: "#8b8bad" },
];
export const medalOf = (key) => MEDALS.find((m) => m.key === key) || MEDALS[0];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function MedalDisc({ medal, size = 54, count }) {
  const m = medalOf(medal);
  return (
    <span className="md-disc" style={{ "--c": m.color, width: size, height: size, fontSize: size * 0.46 }} title={m.name}>
      {m.icon}
      {count > 1 && <sup>{count}</sup>}
    </span>
  );
}

// Colección de un personaje: cada medalla con cuántas veces la ha recibido.
export function MedalShelf({ campaignId, charId, size = 30, empty }) {
  const [doc] = useDoc(medalsKey(campaignId), EMPTY, 8000);
  const mine = (doc.list || []).filter((x) => x.charId === charId);
  if (!mine.length) return empty ? <span className="md-none">{empty}</span> : null;
  return (
    <span className="md-shelf" title={mine.length + " medalla" + (mine.length === 1 ? "" : "s")}>
      {MEDALS.filter((m) => mine.some((x) => x.medal === m.key)).map((m) => <MedalDisc key={m.key} medal={m.key} size={size} count={mine.filter((x) => x.medal === m.key).length} />)}
    </span>
  );
}
export const useMedalCount = (campaignId, charId) => {
  const [doc] = useDoc(medalsKey(campaignId), EMPTY, 8000);
  return (doc.list || []).filter((x) => x.charId === charId).length;
};

// Tarjeta del chat.
export function MedalChatCard({ md, bare }) {
  const m = medalOf(md.medal);
  return (
    <div className={"md-chat" + (bare ? " is-bare" : "")} style={{ "--c": m.color }} role="group" aria-label="Medalla">
      <MedalDisc medal={md.medal} size={46} />
      <span>
        <small>Medalla</small>
        <b>{md.charName} · {m.name}</b>
        <em>{md.note || "Dada por el Director de Juego"}</em>
      </span>
    </div>
  );
}

// Panel del DJ: elegir medalla, jugador y, si quiere, una nota.
export function MedalsGm({ campaignId, members, onGive, onClose }) {
  const [doc, update] = useDoc(medalsKey(campaignId), EMPTY, 3000);
  const [sel, setSel] = useState(null);
  const [who, setWho] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const day = dayOf(now);
  const today = (doc.list || []).filter((x) => x.day === day);
  const givenTo = (key) => today.find((x) => x.medal === key);
  const give = async () => {
    const mem = members.find((x) => x.id === who);
    if (!sel || !mem || busy) return;
    setBusy(true);
    let entry = null;
    await update((d) => {
      const list = d.list || [];
      if (list.some((x) => x.day === dayOf(Date.now()) && x.medal === sel)) return d;
      entry = { id: "m" + Date.now(), medal: sel, charId: mem.id, charName: mem.name, note: note.trim(), ts: Date.now(), day: dayOf(Date.now()) };
      return { ...d, list: [...list, entry].slice(-300) };
    });
    setBusy(false);
    if (entry) {
      onGive(entry);
      setSel(null);
      setWho(null);
      setNote("");
    }
  };
  const cur = sel ? medalOf(sel) : null;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="mh-overlay mh-root md-ov" role="dialog" aria-modal="true" aria-label="Medallas de la sesión" onClick={onClose}>
      <div className="md-box" onClick={(e) => e.stopPropagation()}>
        <div className="md-h">
          <h3 className="mh-serif"><Award size={18} /> Medallas de la sesión</h3>
          <span className="cx-chip on" style={{ "--c": "#E3B04B" }}>{today.length} de {MEDALS.length} dadas hoy</span>
          <button type="button" className="mh-btn-ghost md-x" aria-label="Cerrar" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="md-grid">
          {MEDALS.map((m) => {
            const g = givenTo(m.key);
            return (
              <button key={m.key} type="button" className={"md-opt" + (sel === m.key ? " is-sel" : "") + (g ? " is-used" : "")} style={{ "--c": m.color }} disabled={!!g} aria-pressed={sel === m.key} onClick={() => setSel(m.key)}>
                <MedalDisc medal={m.key} size={54} />
                <b>{m.name}</b>
                <small>{g ? "✓ " + g.charName : " "}</small>
              </button>
            );
          })}
        </div>
        <span className="gx-lab">{cur ? "¿A quién se la das? · «" + cur.name + "»" : "Elige una medalla"}</span>
        <div className="md-pick">
          {members.map((m) => (
            <button key={m.id} type="button" className={"md-who" + (who === m.id ? " is-on" : "")} style={{ "--c": m.color }} disabled={!sel} aria-pressed={who === m.id} onClick={() => setWho(m.id)}>
              <i>{m.name.charAt(0).toUpperCase()}</i>{m.name}
            </button>
          ))}
          {members.length === 0 && <span className="gx-note">Añade personajes a la campaña para dar medallas.</span>}
        </div>
        <input className="mh-input" style={{ marginTop: 12 }} maxLength={80} placeholder="Nota opcional: «cuando propuso usar la grieta»" value={note} onChange={(e) => setNote(e.target.value)} disabled={!sel} />
        <div className="md-acts">
          <button type="button" className="mh-btn" disabled={!sel || !who || busy} onClick={give}><Award size={14} /> Dar medalla</button>
          <button type="button" className="mh-btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
        <p className="gx-note" style={{ margin: "10px 0 0" }}>Cada medalla solo se puede dar a una persona por sesión; mañana vuelven a estar todas disponibles.</p>
      </div>
    </div>,
    document.body
  );
}

// Aviso en pantalla del jugador al recibir una medalla; también suma la medalla a las estadísticas de su perfil.
// El aviso sobrevive a que el componente se vuelva a montar (cambiar de pantalla) mientras dura.
let activeToast = null;
export function MedalWatcher({ campaignId, mineIds }) {
  const [doc] = useDoc(medalsKey(campaignId), EMPTY, 3000);
  const [toast, setToastRaw] = useState(() => (activeToast && activeToast.until > Date.now() ? activeToast.entry : null));
  const setToast = (e) => { activeToast = e ? { entry: e, until: Date.now() + 7000 } : null; setToastRaw(e); };
  const seenKey = "mh-medals-seen:" + campaignId;
  const done = useRef(null);
  useEffect(() => {
    if (!campaignId || !mineIds.length) return;
    const mine = (doc.list || []).filter((x) => mineIds.includes(x.charId));
    if (!mine.length) return;
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(seenKey) || "[]"); } catch (e) {}
    if (done.current === null) done.current = new Set(seen);
    const fresh = mine.filter((x) => !done.current.has(x.id));
    if (!fresh.length) return;
    fresh.forEach((x) => done.current.add(x.id));
    try { localStorage.setItem(seenKey, JSON.stringify([...done.current].slice(-300))); } catch (e) {}
    trackStat("medals", fresh.length);
    const last = fresh[fresh.length - 1];
    if (Date.now() - last.ts < 90000) setToast(last);
  }, [doc.list, campaignId, mineIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), Math.max(500, (activeToast?.until || Date.now() + 7000) - Date.now()));
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast || typeof document === "undefined") return null;
  const m = medalOf(toast.medal);
  return createPortal(
    <div className="md-pop mh-root" style={{ "--c": m.color }} role="status" aria-live="polite" onClick={() => setToast(null)}>
      <span className="md-sp" style={{ left: 26, top: 24 }}>✦</span><span className="md-sp" style={{ right: 30, top: 38 }}>✦</span><span className="md-sp" style={{ left: 54, bottom: 58 }}>✦</span>
      <MedalDisc medal={toast.medal} size={96} />
      <small>¡Nueva medalla!</small>
      <h3 className="mh-serif">{m.name}</h3>
      <p>{toast.charName}{toast.note ? " · " + toast.note : " · te la ha dado el DJ"}</p>
    </div>,
    document.body
  );
}
export const monthShort = (i) => MONTHS[i];
