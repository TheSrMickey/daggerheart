"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Vote, Plus, X, Lock, Clock, Crown, Scale, Hourglass, Check, Repeat, ScrollText, Send, Users } from "lucide-react";
import { useDoc, readDoc, writeDoc, mutateDoc } from "@/lib/campaignDocs";
import { chronKey, dayOf } from "@/lib/chronicle";

// Votaciones rápidas: el DJ lanza una pregunta, la mesa vota con un toque y el resultado queda en el chat.
export const pollKey = (id) => "campaign-polls:" + id;
const EMPTY = { list: [] };
const COLORS = ["#4f9a62", "#E0544A", "#8E6FC4", "#E3B04B", "#5E93C9"];
const tally = (p) => p.opts.map((_, i) => Object.values(p.votes || {}).filter((v) => v === i).length);
export const resultText = (p) => {
  const t = tally(p), max = Math.max(...t), win = t.map((n, i) => (n === max ? i : -1)).filter((i) => i >= 0);
  const all = t.reduce((a, b) => a + b, 0);
  if (!all) return "🗳️ Votación cerrada sin votos: «" + p.q + "»";
  return "🗳️ «" + p.q + "» → " + (win.length > 1 ? "empate entre " + win.map((i) => "«" + p.opts[i] + "»").join(" y ") : "ganó «" + p.opts[win[0]] + "»") + " (" + t.join("–") + ")";
};
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

// Resultado de un recuento: ganadora, empate o sin votos (el DJ puede desempatar con `decided`).
export const outcome = (t, decided) => {
  const max = Math.max(0, ...t), win = max > 0 ? t.map((n, i) => (n === max ? i : -1)).filter((i) => i >= 0) : [];
  const voted = t.reduce((a, b) => a + b, 0);
  const winner = decided != null ? decided : win.length === 1 ? win[0] : null;
  return { max, win, voted, winner, tie: win.length > 1 && decided == null, none: max === 0, decided: decided != null };
};
// Foto de la votación que viaja en el chat (los votos por persona solo si no era secreta).
export const snapOf = (p, total) => ({ q: p.q, opts: p.opts, t: tally(p), total: total || Object.keys(p.votes || {}).length, secret: !!p.secret, decided: p.decided ?? null, votes: p.secret ? null : p.votes || {} });
const pct = (n, tot) => (tot ? Math.round((n / tot) * 100) : 0);

// Cierra una votación una sola vez (la lee, comprueba que sigue abierta y avisa en el chat).
async function closePoll(campaignId, pollId, onResult, total) {
  const cur = await readDoc(pollKey(campaignId), EMPTY);
  const p = cur.list.find((x) => x.id === pollId);
  if (!p || p.closed) return;
  const closedAt = Date.now();
  await writeDoc(pollKey(campaignId), { ...cur, list: cur.list.map((x) => (x.id === pollId ? { ...x, closed: true, closedAt } : x)) });
  onResult(resultText(p), snapOf(p, total));
}

// El DJ nombra la opción ganadora cuando hay empate.
async function pickWinner(campaignId, pollId, idx, total, onResult) {
  const cur = await readDoc(pollKey(campaignId), EMPTY);
  const p = cur.list.find((x) => x.id === pollId);
  if (!p || p.decided != null) return;
  await writeDoc(pollKey(campaignId), { ...cur, list: cur.list.map((x) => (x.id === pollId ? { ...x, decided: idx } : x)) });
  onResult("🗳️ «" + p.q + "» → el DJ desempató: «" + p.opts[idx] + "»", snapOf({ ...p, decided: idx }, total));
}

// Deja la decisión de la mesa en la Crónica de esa sesión.
async function saveDecision(campaignId, p, total) {
  const o = outcome(tally(p), p.decided);
  const text = "«" + p.q + "» → " + (o.none ? "sin votos" : o.winner != null ? p.opts[o.winner] + " (" + tally(p)[o.winner] + " de " + (total || o.voted) + " votos)" : "empate");
  const day = dayOf(p.closedAt || Date.now());
  await mutateDoc(chronKey(campaignId), { days: {} }, (d) => {
    const cur = (d.days || {})[day] || {};
    return { ...d, days: { ...(d.days || {}), [day]: { ...cur, decisions: [...(cur.decisions || []), { id: p.id, text }] } } };
  });
  const cur = await readDoc(pollKey(campaignId), EMPTY);
  await writeDoc(pollKey(campaignId), { ...cur, list: cur.list.map((x) => (x.id === p.id ? { ...x, saved: true } : x)) });
}

const Mark = ({ s, big }) => (s.none ? <Hourglass size={big ? 22 : 20} /> : s.tie ? <Scale size={big ? 22 : 20} /> : <Crown size={big ? 22 : 20} />);

// Tarjeta del resultado para el chat de la mesa y el aviso en pantalla.
export function pollFoot(s, me) {
  const o = outcome(s.t, s.decided), mine = s.votes && me != null ? s.votes[me] : null;
  if (o.tie) return "El Director de Juego decidirá el desempate";
  if (o.none) return "El Director de Juego seguirá la historia";
  return mine != null ? "Tú votaste «" + s.opts[mine] + "»" : (o.voted || 0) + (o.voted === 1 ? " voto" : " votos");
}
export function PollResultCard({ s, me, bare }) {
  const o = outcome(s.t, s.decided), mine = s.votes && me != null ? s.votes[me] : null;
  const cls = (o.none ? " is-none" : o.tie ? " is-tie" : "") + (bare ? " is-bare" : "");
  const names = o.winner != null ? [s.opts[o.winner]] : o.win.map((i) => s.opts[i]);
  return (
    <div className={"pr-card" + cls} role="group" aria-label="Resultado de la votación">
      <div className="pr-t"><Vote size={13} /> {o.tie ? "Empate" : o.decided ? "El DJ desempató" : "Votación cerrada"}</div>
      <div className="pr-q">{s.q}</div>
      <div className="pr-res">
        <span className="pr-mk"><Mark s={o} /></span>
        <b className="mh-serif">{o.none ? "Nadie votó a tiempo" : names.join(" · ")}</b>
        {!o.none && <span className="pr-big">{o.tie ? s.t[o.win[0]] + "–" + s.t[o.win[1]] : pct(s.t[o.winner], o.voted) + " %"}</span>}
      </div>
      {!o.none && (
        <>
          <div className="pr-mini">{s.opts.map((_, i) => (s.t[i] ? <i key={i} style={{ flex: s.t[i], background: COLORS[i % COLORS.length] }} /> : null))}</div>
          <div className="pr-leg">{s.opts.map((x, i) => <span key={i}><u style={{ background: COLORS[i % COLORS.length] }} />{x} · {s.t[i]}</span>)}</div>
        </>
      )}
      {mine != null && <div className="pr-you"><Check size={12} /> Tú votaste «{s.opts[mine]}»</div>}
      {o.tie && <div className="pr-you is-tie">El DJ decidirá el desempate</div>}
      {o.none && <div className="pr-you is-none">El DJ seguirá la historia</div>}
    </div>
  );
}

// Aviso flotante al terminar una votación.
export function ResultToast({ s, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 8000); return () => clearTimeout(t); }, [onDone]);
  const o = outcome(s.t, s.decided);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={"pr-toast mh-root" + (o.tie ? " is-tie" : o.none ? " is-none" : "")} role="status" aria-live="polite" onClick={onDone}>
      <span className="pr-mk"><Mark s={o} big /></span>
      <div>
        <small>{o.tie ? "Empate" : o.none ? "Votación cerrada" : "Ha ganado"}</small>
        <b className="mh-serif">{o.none ? "Nadie votó a tiempo" : o.tie ? o.win.map((i) => s.opts[i]).join(" · ") : s.opts[o.winner] + " · " + s.t[o.winner] + " de " + (s.total || o.voted) + " votos"}</b>
      </div>
    </div>,
    document.body
  );
}

// Resultado para el DJ: ganadora, barras con quién votó qué y las acciones.
export function PollResultGm({ p, total, names = {}, embedded, onSend, onRepeat, onSave, onPick, onDismiss }) {
  const t = tally(p), o = outcome(t, p.decided), voted = o.voted, tot = total || voted;
  const by = (i) => Object.entries(p.votes || {}).filter(([, v]) => v === i).map(([id]) => names[id] || "Jugador");
  return (
    <div className={"pr-gm" + (embedded ? " is-embedded" : " mh-card")} role="group" aria-label="Resultado de la votación" style={embedded ? undefined : { margin: 0 }}>
      <div className="pr-gm-h">
        <span className={"cx-chip on"} style={{ "--c": o.tie ? "#8E6FC4" : "#4CC36B" }}>{o.tie ? "Empate" : "✓ Cerrada"}{!o.tie && voted >= tot && tot ? " · todos votaron" : ""}</span>
        {onDismiss && <button type="button" className="mh-btn-ghost pr-x" aria-label="Cerrar resultado" onClick={onDismiss}><X size={14} /></button>}
      </div>
      <div className="pl-q mh-serif">{p.q}</div>
      <div className={"pr-win" + (o.tie ? " is-tie" : o.none ? " is-none" : "")}>
        <span className="pr-mk"><Mark s={o} big /></span>
        <div><small>{o.tie ? "Empate · tú decides" : o.none ? "Sin votos" : o.decided ? "Desempate del DJ" : "Decide la mesa"}</small><b className="mh-serif">{o.none ? "Nadie votó" : o.tie ? o.win.map((i) => p.opts[i]).join(" · ") : p.opts[o.winner]}</b></div>
        {!o.none && !o.tie && <div className="pr-pc"><b>{pct(t[o.winner], voted)} %</b><span>{t[o.winner]} de {voted} votos</span></div>}
      </div>
      {o.tie && onPick && (
        <div className="pr-pick"><span>Nombra la opción ganadora:</span>{o.win.map((i) => <button key={i} type="button" className="mh-btn" style={{ background: COLORS[i % COLORS.length], borderColor: COLORS[i % COLORS.length], color: "#fff" }} onClick={() => onPick(i)}><Crown size={14} /> {p.opts[i]}</button>)}</div>
      )}
      {p.opts.map((x, i) => (
        <div key={i} className={"pr-o" + (o.winner != null && o.winner !== i ? " is-dim" : "")}>
          <div className="pl-ot"><b>{x}{o.winner === i && !o.none ? " ♛" : ""}</b><span>{t[i]} voto{t[i] === 1 ? "" : "s"}</span></div>
          <div className="pl-bar"><i style={{ width: pct(t[i], voted) + "%", background: COLORS[i % COLORS.length] }} /></div>
          {!p.secret && by(i).length > 0 && <div className="pr-who">{by(i).map((n, j) => <span key={j}><i style={{ background: COLORS[i % COLORS.length] }}>{n[0]}</i>{n}</span>)}</div>}
        </div>
      ))}
      <div className="pr-meta"><span><Users size={13} /> {voted} de {tot} han votado</span><span>{p.secret ? <><Lock size={13} /> Voto secreto</> : "Voto abierto"}</span></div>
      <div className="pr-acts">
        {onSend && <button type="button" className="mh-btn" onClick={onSend}><Send size={14} /> Enviar resultado al chat</button>}
        {onRepeat && <button type="button" className="mh-btn-ghost" onClick={onRepeat}><Repeat size={14} /> Repetir votación</button>}
        {onSave && <button type="button" className="mh-btn-ghost" disabled={p.saved} onClick={onSave}><ScrollText size={14} /> {p.saved ? "Guardada en la Crónica" : "Guardar en la Crónica"}</button>}
      </div>
    </div>
  );
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
  const [toast, setToast] = useState(null);
  const seen = useRef(null);
  const last = [...doc.list].reverse().find((x) => x.closed);
  useEffect(() => {
    if (last && last.closedAt && Date.now() - last.closedAt < 15000 && seen.current !== last.id) { seen.current = last.id; setToast(snapOf(last, total)); }
  }, [last?.id, last?.closedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const myVotes = p ? mine.map((m) => p.votes?.[m.id]).filter((v) => v != null) : [];
  const myVote = myVotes.length && myVotes.every((v) => v === myVotes[0]) ? myVotes[0] : null;
  const voted = p ? Object.keys(p.votes || {}).length : 0;
  useEffect(() => {
    if (!p) return;
    if ((p.endsAt && now >= p.endsAt) || (p.auto && total && voted >= total)) closePoll(campaignId, p.id, onResult, total);
  });
  const toastEl = toast ? <ResultToast s={toast} onDone={() => setToast(null)} /> : null;
  if (!p) return toastEl;
  const vote = (i) => update((d) => ({ ...d, list: d.list.map((x) => (x.id === p.id && !x.closed ? { ...x, votes: { ...(x.votes || {}), ...Object.fromEntries(mine.map((m) => [m.id, i])) } } : x)) }));
  return (
    <>
    {toastEl}
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
    </>
  );
}

// Pestaña del DJ: crear votaciones y ver las abiertas y el historial.
export function PollsGm({ campaignId, total, names = {}, onAnnounce, onResult }) {
  const [doc, update] = useDoc(pollKey(campaignId), EMPTY, 3000);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [secs, setSecs] = useState(120);
  const [secret, setSecret] = useState(false);
  const [auto, setAuto] = useState(true);
  const open = doc.list.find((x) => !x.closed);
  const now = useTick(!!open);
  const done = doc.list.filter((x) => x.closed).reverse();
  const [hideId, setHideId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const latest = done.find((x) => x.id === viewId) || (!open && done[0] && done[0].id !== hideId ? done[0] : null);
  const ok = q.trim() && opts.filter((o) => o.trim()).length >= 2 && !open;
  useEffect(() => {
    if (!open) return;
    const voted = Object.keys(open.votes || {}).length;
    if ((open.endsAt && now >= open.endsAt) || (open.auto && total && voted >= total)) closePoll(campaignId, open.id, onResult, total);
  });
  const launch = () => {
    const o = opts.map((x) => x.trim()).filter(Boolean);
    const p = { id: "p" + Date.now(), q: q.trim(), opts: o, votes: {}, secret, auto, endsAt: secs ? Date.now() + secs * 1000 : 0, secs, closed: false };
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
      <div className="mh-card pl-side">
        <div className="gx-h"><h3 className="mh-serif"><Vote size={18} /> Votaciones</h3>{open?.endsAt && <span className="cx-chip on" style={{ "--c": "#E0544A" }}><Clock size={12} /> {mmss(open.endsAt - now)}</span>}</div>
        <div className="pl-scroll">
          <span className="gx-lab" style={{ marginTop: 0 }}>En curso</span>
          {open ? (
            <div className="pl-live">
              <div className="pl-q mh-serif">{open.q}</div>
              <Bars p={open} total={total} mine={null} hide={false} />
              <button type="button" className="mh-btn-ghost" style={{ marginTop: 10 }} onClick={() => closePoll(campaignId, open.id, onResult, total)}>Cerrar ahora</button>
            </div>
          ) : <p className="gx-sub" style={{ margin: "4px 0 0" }}>Ninguna votación abierta.</p>}
          {latest && <span className="gx-lab">Resultado</span>}
          {latest && (
            <PollResultGm
              embedded
              p={latest}
              total={total}
              names={names}
              onDismiss={() => (setViewId(null), setHideId(latest.id))}
              onSend={() => onResult(latest.decided != null ? "🗳️ «" + latest.q + "» → el DJ desempató: «" + latest.opts[latest.decided] + "»" : resultText(latest), snapOf(latest, total))}
              onRepeat={() => { setQ(latest.q); setOpts(latest.opts.length >= 2 ? latest.opts : [...latest.opts, ""]); setSecs(latest.secs ?? 120); setSecret(!!latest.secret); setAuto(latest.auto !== false); }}
              onSave={() => { saveDecision(campaignId, latest, total); }}
              onPick={(i) => pickWinner(campaignId, latest.id, i, total, onResult)}
            />
          )}
          <span className="gx-lab">Historial</span>
          {done.length > 0 ? (
            <div className="pr-hist">
              {done.slice(0, 12).map((p) => { const t = tally(p), o = outcome(t, p.decided); return (
                <button key={p.id} type="button" className={"pr-h" + (latest?.id === p.id ? " is-on" : "")} onClick={() => (setHideId(null), setViewId(p.id))} title="Ver el resultado">
                  <b>{p.q}</b>
                  <span className={"pr-hw" + (o.tie ? " is-tie" : o.none ? " is-none" : "")}>{o.none ? "Sin votos" : o.tie ? "Empate" : p.opts[o.winner]}</span>
                  <em>{t.join("–")}</em>
                </button>
              ); })}
            </div>
          ) : <p className="gx-sub" style={{ margin: "4px 0 0" }}>Aún no hay votaciones cerradas.</p>}
        </div>
      </div>
    </div>
  );
}

// Directo del DJ: mientras hay una votación abierta, sustituye a la caja «El grupo»; al terminar vuelve el grupo.
export function PollSwap({ campaignId, total, names = {}, onResult, children }) {
  const [doc] = useDoc(pollKey(campaignId), EMPTY, 3000);
  const p = [...doc.list].reverse().find((x) => !x.closed);
  const now = useTick(!!p);
  const voted = p ? Object.keys(p.votes || {}).length : 0;
  useEffect(() => {
    if (!p) return;
    if ((p.endsAt && now >= p.endsAt) || (p.auto && total && voted >= total)) closePoll(campaignId, p.id, onResult, total);
  });
  const [hideId, setHideId] = useState(null);
  const lastClosed = [...doc.list].reverse().find((x) => x.closed);
  if (!p && lastClosed && lastClosed.closedAt && Math.max(now, lastClosed.closedAt) - lastClosed.closedAt < 15 * 60000 && lastClosed.id !== hideId) {
    return <PollResultGm p={lastClosed} total={total} names={names} onDismiss={() => setHideId(lastClosed.id)} onSave={() => saveDecision(campaignId, lastClosed, total)} onPick={(i) => pickWinner(campaignId, lastClosed.id, i, total, onResult)} />;
  }
  if (!p) return children;
  return (
    <div className="mh-dir-card pl-swap" role="group" aria-label="Votación en curso">
      <div className="mh-dir-lbl-row">
        <span className="mh-dir-lbl"><Vote size={13} /> Votación en curso</span>
        {p.endsAt ? <span className="cx-chip on" style={{ "--c": "#E0544A" }}><Clock size={12} /> {mmss(p.endsAt - now)}</span> : null}
      </div>
      <div className="pl-q mh-serif">{p.q}</div>
      <Bars p={p} total={total} mine={null} hide={false} />
      <button type="button" className="mh-btn-ghost" onClick={() => closePoll(campaignId, p.id, onResult, total)}>Cerrar ahora</button>
    </div>
  );
}
