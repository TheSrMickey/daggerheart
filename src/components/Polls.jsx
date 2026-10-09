"use client";

import { useEffect, useState } from "react";
import { Vote, Plus, X, Lock, Clock } from "lucide-react";
import { useDoc, readDoc, writeDoc } from "@/lib/campaignDocs";

// Votaciones rápidas: el DJ lanza una pregunta, la mesa vota con un toque y el resultado queda en el chat.
export const pollKey = (id) => "campaign-polls:" + id;
const EMPTY = { list: [] };
const COLORS = ["#E0544A", "#4f9a62", "#8E6FC4", "#E3B04B", "#5E93C9"];
const tally = (p) => p.opts.map((_, i) => Object.values(p.votes || {}).filter((v) => v === i).length);
export const resultText = (p) => {
  const t = tally(p), max = Math.max(...t), win = t.map((n, i) => (n === max ? i : -1)).filter((i) => i >= 0);
  const all = t.reduce((a, b) => a + b, 0);
  if (!all) return "🗳️ Votación cerrada sin votos: «" + p.q + "»";
  return "🗳️ «" + p.q + "» → " + (win.length > 1 ? "empate entre " + win.map((i) => "«" + p.opts[i] + "»").join(" y ") : "ganó «" + p.opts[win[0]] + "»") + " (" + t.join("–") + ")";
};
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

// Cierra una votación una sola vez (la lee, comprueba que sigue abierta y avisa en el chat).
async function closePoll(campaignId, pollId, onResult) {
  const cur = await readDoc(pollKey(campaignId), EMPTY);
  const p = cur.list.find((x) => x.id === pollId);
  if (!p || p.closed) return;
  await writeDoc(pollKey(campaignId), { ...cur, list: cur.list.map((x) => (x.id === pollId ? { ...x, closed: true } : x)) });
  onResult(resultText(p));
}

function Bars({ p, total, mine, hide }) {
  const t = tally(p), voted = Object.keys(p.votes || {}).length;
  return (
    <div className="pl-bars">
      {p.opts.map((o, i) => (
        <div key={i} className="pl-opt">
          <div className="pl-ot"><b>{o}{mine != null && mine === i && <em> · tu voto</em>}</b>{!hide && <span>{t[i]} de {total || voted}</span>}</div>
          <div className="pl-bar"><i style={{ width: hide ? 0 : (total || voted ? (t[i] / (total || voted)) * 100 : 0) + "%", background: COLORS[i % COLORS.length] }} /></div>
        </div>
      ))}
      <div className="pl-foot">{voted} de {total || voted} han votado{hide ? " · voto secreto" : ""}</div>
    </div>
  );
}

function useTick(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

// Tarjeta de la votación abierta, para el chat de los jugadores.
export function ActivePoll({ campaignId, mine, total, onResult }) {
  const [doc, update] = useDoc(pollKey(campaignId), EMPTY, 3000);
  const p = [...doc.list].reverse().find((x) => !x.closed);
  const now = useTick(!!p);
  const myVotes = p ? mine.map((m) => p.votes?.[m.id]).filter((v) => v != null) : [];
  const myVote = myVotes.length && myVotes.every((v) => v === myVotes[0]) ? myVotes[0] : null;
  const voted = p ? Object.keys(p.votes || {}).length : 0;
  useEffect(() => {
    if (!p) return;
    if ((p.endsAt && now >= p.endsAt) || (p.auto && total && voted >= total)) closePoll(campaignId, p.id, onResult);
  });
  if (!p) return null;
  const vote = (i) => update((d) => ({ ...d, list: d.list.map((x) => (x.id === p.id && !x.closed ? { ...x, votes: { ...(x.votes || {}), ...Object.fromEntries(mine.map((m) => [m.id, i])) } } : x)) }));
  return (
    <div className="pl-card" role="group" aria-label="Votación">
      <div className="pl-h"><b><Vote size={14} /> El DJ pregunta</b>{p.endsAt && <span className="cx-chip on" style={{ "--c": "#E0544A" }}><Clock size={12} /> {mmss(p.endsAt - now)}</span>}</div>
      <div className="pl-q mh-serif">{p.q}</div>
      {myVote == null && mine.length > 0 ? (
        <div className="pl-vote">{p.opts.map((o, i) => <button key={i} type="button" className="pl-btn" style={{ "--c": COLORS[i % COLORS.length] }} onClick={() => vote(i)}>{o}</button>)}</div>
      ) : (
        <Bars p={p} total={total} mine={myVote} hide={p.secret} />
      )}
      {myVote != null && <button type="button" className="mh-btn-ghost pl-change" onClick={() => update((d) => ({ ...d, list: d.list.map((x) => (x.id === p.id ? { ...x, votes: Object.fromEntries(Object.entries(x.votes || {}).filter(([k]) => !mine.some((m) => m.id === k))) } : x)) }))}>Cambiar mi voto</button>}
    </div>
  );
}

// Pestaña del DJ: crear votaciones y ver las abiertas y el historial.
export function PollsGm({ campaignId, total, onAnnounce, onResult }) {
  const [doc, update] = useDoc(pollKey(campaignId), EMPTY, 3000);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [secs, setSecs] = useState(120);
  const [secret, setSecret] = useState(false);
  const [auto, setAuto] = useState(true);
  const open = doc.list.find((x) => !x.closed);
  const now = useTick(!!open);
  const done = doc.list.filter((x) => x.closed).reverse();
  const ok = q.trim() && opts.filter((o) => o.trim()).length >= 2 && !open;
  useEffect(() => {
    if (!open) return;
    const voted = Object.keys(open.votes || {}).length;
    if ((open.endsAt && now >= open.endsAt) || (open.auto && total && voted >= total)) closePoll(campaignId, open.id, onResult);
  });
  const launch = () => {
    const o = opts.map((x) => x.trim()).filter(Boolean);
    const p = { id: "p" + Date.now(), q: q.trim(), opts: o, votes: {}, secret, auto, endsAt: secs ? Date.now() + secs * 1000 : 0, closed: false };
    update((d) => ({ ...d, list: [...d.list, p].slice(-20) }));
    onAnnounce("🗳️ Votación: " + p.q + " — " + o.map((x, i) => i + 1 + ") " + x).join("  "));
    setQ(""); setOpts(["", ""]);
  };
  return (
    <div className="pl-grid">
      <div className="mh-card pl-main">
        <div className="gx-h"><h3 className="mh-serif"><Vote size={18} /> Nueva votación</h3></div>
        <p className="gx-sub">Pregunta a la mesa y obtén una respuesta en segundos. Sale en el chat de todos.</p>
        <span className="gx-lab">Pregunta</span>
        <input className="mh-input" placeholder="¿Entramos por la puerta o por el túnel?" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="gx-lab" style={{ marginTop: 12 }}>Opciones</span>
        {opts.map((o, i) => (
          <div key={i} className="gx-row" style={{ marginBottom: 6 }}>
            <input className="mh-input" style={{ flex: 1 }} placeholder={"Opción " + (i + 1)} value={o} onChange={(e) => setOpts((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
            {opts.length > 2 && <button type="button" className="mh-btn-ghost" aria-label="Quitar opción" onClick={() => setOpts((a) => a.filter((_, j) => j !== i))}><X size={14} /></button>}
          </div>
        ))}
        {opts.length < 5 && <button type="button" className="mh-btn-ghost" onClick={() => setOpts((a) => [...a, ""])}><Plus size={14} /> Añadir opción</button>}
        <span className="gx-lab" style={{ marginTop: 12 }}>Ajustes</span>
        <div className="gx-row">
          {[[0, "Sin límite"], [60, "1 min"], [120, "2 min"], [300, "5 min"]].map(([s, l]) => <button key={s} type="button" className={"cx-chip" + (secs === s ? " on" : "")} style={{ "--c": "#C9A24A" }} onClick={() => setSecs(s)}>{l}</button>)}
          <button type="button" className={"cx-chip" + (secret ? " on" : "")} style={{ "--c": "#8E6FC4" }} onClick={() => setSecret((v) => !v)}><i><Lock size={13} /></i>Voto secreto</button>
          <button type="button" className={"cx-chip" + (auto ? " on" : "")} style={{ "--c": "#4CC36B" }} onClick={() => setAuto((v) => !v)}>Cierra si votan todos</button>
        </div>
        <div className="gx-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          {open && <span className="gx-fact">Hay una votación abierta: ciérrala para lanzar otra.</span>}
          <button type="button" className="mh-btn" disabled={!ok} onClick={launch}>Lanzar votación</button>
        </div>
      </div>
      <div className="pl-side">
        <div className="mh-card" style={{ margin: 0 }}>
          <div className="gx-h"><h3 className="mh-serif">{open ? "En directo" : "Sin votación abierta"}</h3>{open?.endsAt && <span className="cx-chip on" style={{ "--c": "#E0544A" }}><Clock size={12} /> {mmss(open.endsAt - now)}</span>}</div>
          {open ? (
            <>
              <div className="pl-q mh-serif">{open.q}</div>
              <Bars p={open} total={total} mine={null} hide={false} />
              <button type="button" className="mh-btn-ghost" style={{ marginTop: 10 }} onClick={() => closePoll(campaignId, open.id, onResult)}>Cerrar ahora</button>
            </>
          ) : <p className="gx-sub" style={{ margin: "8px 0 0" }}>Cuando lances una, aquí verás los votos al momento.</p>}
        </div>
        {done.length > 0 && (
          <div className="mh-card" style={{ margin: "14px 0 0" }}>
            <div className="gx-h"><h3 className="mh-serif">Historial</h3></div>
            {done.slice(0, 6).map((p) => <div key={p.id} className="gx-item" style={{ marginTop: 8 }}><p>{resultText(p).replace("🗳️ ", "")}</p></div>)}
          </div>
        )}
      </div>
    </div>
  );
}
