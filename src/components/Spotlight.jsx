"use client";

import { useEffect, useRef, useState } from "react";

// Foco (spotlight) de la mesa: los jugadores piden la palabra y el DJ da el foco, interrumpe o silencia.
// Todo vive en el campo `spot` del estado compartido del mapa.
export const SPOT_KINDS = [
  { key: "act", icon: "✋", label: "Quiero actuar", sub: "Mi turno o mi acción" },
  { key: "talk", icon: "💬", label: "Quiero hablar", sub: "Decir algo en escena" },
  { key: "doubt", icon: "❓", label: "Tengo una duda", sub: "Pregunta al DJ" },
  { key: "react", icon: "⚡", label: "Reacción", sub: "Urgente: salta la cola", urgent: true },
];
export const SPOT_DEFAULTS = { oneHand: true, dropHand: true, sound: true, expire: 0, idleMin: 15 };
export const kindOf = (k) => SPOT_KINDS.find((x) => x.key === k) || SPOT_KINDS[0];

// El campo puede venir vacío (o como lista, por el valor por defecto del mapa): se normaliza.
export const normSpot = (raw) => {
  const s = raw && !Array.isArray(raw) && typeof raw === "object" ? raw : {};
  return { mode: s.mode || "normal", focus: s.focus || null, hands: Array.isArray(s.hands) ? s.hands : [], last: s.last || {}, snooze: s.snooze || {}, t0: s.t0 || 0, chain: Array.isArray(s.chain) ? s.chain : [], settings: { ...SPOT_DEFAULTS, ...(s.settings || {}) } };
};
// Manos vivas (sin caducar) y ordenadas: primero las urgentes y luego por hora.
export const liveHands = (sp, now = Date.now()) =>
  sp.hands
    .filter((h) => !sp.settings.expire || now - h.at < sp.settings.expire * 60000)
    .sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.at - b.at);
// Jugadores que llevan mucho sin foco.
export const idlePlayers = (sp, tokens, now = Date.now()) => {
  const limit = sp.settings.idleMin * 60000;
  if (!limit || !sp.t0) return [];
  return tokens
    .filter((t) => t.kind === "pc" && t.charId && !t.vanished && !(sp.focus && sp.focus.charId === t.charId))
    .map((t) => ({ charId: t.charId, tokenId: t.id, name: t.name, since: sp.last[t.charId] || sp.t0 }))
    .filter((p) => now - p.since > limit && (sp.snooze[p.charId] || 0) < now)
    .sort((a, b) => a.since - b.since);
};
const mins = (ms) => Math.max(1, Math.round(ms / 60000));
const ago = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
export const beep = () => {
  try {
    const A = window.AudioContext || window.webkitAudioContext;
    const ac = new A();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.28);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.3);
    setTimeout(() => ac.close(), 500);
  } catch (e) {}
};

// Botón y avisos del jugador, sobre su mapa.
export function SpotPlayer({ spot, charId, onRaise, onLower, onDone }) {
  const sp = normSpot(spot);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const hands = liveHands(sp, now);
  const idx = hands.findIndex((h) => h.charId === charId);
  const mine = idx >= 0;
  const hasFocus = !!sp.focus && sp.focus.charId === charId;
  const blocked = sp.mode !== "normal";
  return (
    <>
    {hasFocus && (
      <div className="mh-spot-got" onPointerDown={(e) => e.stopPropagation()}>
        <b>✨ El DJ te da el foco</b>
        <small>Actúa o habla. Al terminar, pulsa abajo.</small>
        <button type="button" onClick={onDone}>He terminado</button>
      </div>
    )}
    <div className="mh-spot-ui" onPointerDown={(e) => e.stopPropagation()}>
      {sp.mode === "silent" ? (
        <div className="mh-spot-btn is-off">🔇 El DJ ha pedido silencio</div>
      ) : mine ? (
        <button type="button" className="mh-spot-btn is-on" onClick={onLower}>✋ Bajar la mano · vas la {idx + 1}.ª</button>
      ) : (
        <button type="button" className="mh-spot-btn" disabled={blocked} onClick={() => setOpen((v) => !v)}>✋ Pedir la palabra</button>
      )}
      {open && !mine && !blocked && (
        <div className="mh-spot-kinds" role="menu">
          {SPOT_KINDS.map((k) => (
            <button key={k.key} type="button" role="menuitem" className={k.urgent ? "is-urg" : ""} onClick={() => (setOpen(false), onRaise(k.key))}>
              <b>{k.icon} {k.label}</b>
              <small>{k.sub}</small>
            </button>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

// Aviso de interrupción sobre el mapa de los jugadores.
export function SpotPause({ spot }) {
  const sp = normSpot(spot);
  if (sp.mode !== "paused") return null;
  return (
    <div className="mh-spot-pause" role="alertdialog" aria-label="El DJ interrumpe">
      <div>
        <b>⏸ El DJ interrumpe</b>
        <small>Atiende a la mesa. Se reanuda cuando el DJ lo indique.</small>
      </div>
    </div>
  );
}

// Panel del DJ: cola de manos, foco, mesa, avisos de quién lleva mucho sin foco y ajustes.
export function SpotPanel({ spot, tokens, onFocus, onUnfocus, onLowerHand, onLowerAll, onMode, onSetting, onSnooze }) {
  const sp = normSpot(spot);
  const [now, setNow] = useState(() => Date.now());
  const [cfg, setCfg] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const hands = liveHands(sp, now);
  const idle = idlePlayers(sp, tokens, now);
  // Sonido al llegar una mano nueva o un aviso nuevo.
  const seen = useRef(null);
  useEffect(() => {
    const keys = new Set([...hands.map((h) => "h" + h.charId + h.at), ...idle.map((p) => "i" + p.charId)]);
    if (seen.current && sp.settings.sound) for (const k of keys) if (!seen.current.has(k)) return (seen.current = keys), beep();
    seen.current = keys;
  }, [hands.map((h) => h.charId + h.at).join("|"), idle.map((p) => p.charId).join("|")]);
  const focusTok = sp.focus ? (sp.focus.dm ? { name: "El DJ" } : tokens.find((t) => t.id === sp.focus.tokenId)) : null;
  const sw = (k, label, hint) => (
    <label className="mh-spot-sw" key={k}>
      <span><b>{label}</b><small>{hint}</small></span>
      <input type="checkbox" checked={!!sp.settings[k]} onChange={(e) => onSetting(k, e.target.checked)} />
    </label>
  );
  return (
    <div className="mh-spot-panel">
      <div className="mh-spot-h">
        <b>Foco de la mesa</b>
        <span>{hands.length ? hands.length + " mano" + (hands.length === 1 ? "" : "s") : "Sin manos levantadas"}</span>
        <button type="button" className="mh-btn-ghost" onClick={() => setCfg((v) => !v)}>{cfg ? "Cerrar ajustes" : "Ajustes"}</button>
      </div>
      {sp.mode === "paused" && (
        <div className="mh-spot-alert is-pause">
          <b>⏸ Mesa interrumpida</b>
          <button type="button" className="mh-spot-go" onClick={() => onMode("normal")}>▶ Reanudar</button>
        </div>
      )}
      {idle.length > 0 && (
        <div className="mh-spot-idle">
          <b>Llevan mucho sin foco</b>
          {idle.map((p) => (
            <div key={p.charId} className="mh-spot-irow">
              <span>⏳ <b>{p.name}</b> lleva {mins(now - p.since)} min sin foco</span>
              <button type="button" className="mh-spot-go" onClick={() => onFocus(p.tokenId, p.charId, p.name)}>Dar foco</button>
              <button type="button" className="mh-btn-ghost" onClick={() => onSnooze(p.charId)}>Más tarde</button>
            </div>
          ))}
        </div>
      )}
      <div className="mh-spot-now">
        {focusTok ? (
          <>
            <span>✨ Foco: <b>{focusTok.name}</b> <small>{ago(now - sp.focus.since)}</small></span>
            <button type="button" className="mh-btn-ghost" onClick={onUnfocus}>Apagar foco</button>
          </>
        ) : (
          <span className="mh-spot-none">Nadie tiene el foco</span>
        )}
      </div>
      {hands.map((h, i) => {
        const k = kindOf(h.kind);
        const tk = tokens.find((t) => t.kind === "pc" && t.charId === h.charId);
        return (
          <div key={h.charId + h.at} className={"mh-spot-q" + (h.urgent ? " is-urg" : "")}>
            <i>{i + 1}</i>
            <span><b>{h.name}</b><small>{k.icon} {k.label} · hace {ago(now - h.at)}</small></span>
            <button type="button" className="mh-spot-go" disabled={!tk} title={tk ? "" : "No tiene ficha en el mapa"} onClick={() => tk && onFocus(tk.id, h.charId, h.name)}>Dar foco</button>
            <button type="button" className="mh-btn-ghost" onClick={() => onLowerHand(h.charId)}>Más tarde</button>
          </div>
        );
      })}
      <div className="mh-spot-ctl">
        <button type="button" className="mh-btn-ghost" disabled={!hands.length} onClick={onLowerAll}>Bajar todas las manos</button>
        <button type="button" className={"mh-btn-ghost" + (sp.mode === "silent" ? " is-on" : "")} onClick={() => onMode(sp.mode === "silent" ? "normal" : "silent")}>
          {sp.mode === "silent" ? "🔊 Quitar silencio" : "🔇 Mesa en silencio"}
        </button>
        {sp.mode !== "paused" && (
          <button type="button" className="mh-btn-ghost is-danger" onClick={() => onMode("paused")}>⏸ Interrumpir</button>
        )}
      </div>
      {cfg && (
        <div className="mh-spot-cfg">
          {sw("oneHand", "Una mano por jugador", "Si ya la tiene levantada, la baja")}
          {sw("dropHand", "Bajar la mano al dar el foco", "Pasa a tener el foco")}
          {sw("sound", "Sonido de aviso", "Cuando llega una mano o un aviso")}
          <label className="mh-spot-sw">
            <span><b>Caducan a los…</b><small>Las manos antiguas se bajan solas</small></span>
            <select className="mh-input" value={sp.settings.expire} onChange={(e) => onSetting("expire", Number(e.target.value))}>
              <option value={0}>Nunca</option>
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
            </select>
          </label>
          <label className="mh-spot-sw">
            <span><b>Avisar si alguien lleva sin foco</b><small>Aviso para el DJ</small></span>
            <select className="mh-input" value={sp.settings.idleMin} onChange={(e) => onSetting("idleMin", Number(e.target.value))}>
              <option value={0}>Nunca</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={20}>20 min</option>
              <option value={30}>30 min</option>
            </select>
          </label>
        </div>
      )}
      <div className="mh-spot-foot">También puedes dar el foco a cualquier ficha: selecciónala y usa «Dar foco» en la barra del mapa.</div>
    </div>
  );
}

// Barra del foco: quién lo tiene, los últimos pases y un menú para pasarlo (Esperanza: elige la mesa; Miedo: pasa al DJ).
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
export function FocusBar({ spot, pcs, myCharId, isGm, onPass, onClear }) {
  const sp = normSpot(spot);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const f = sp.focus;
  if (!f && !sp.chain.length && !isGm) return null;
  const dm = !!f?.dm;
  const mine = !!f && !dm && f.charId && f.charId === myCharId;
  const canPass = isGm || mine;
  const initial = (n) => (n || "?").trim().charAt(0).toUpperCase();
  const chip = (n, c, big, ring) => <span className={"fb-av" + (ring ? " is-ring" : "")} style={{ "--c": c, width: big ? 40 : 24, height: big ? 40 : 24, fontSize: big ? 15 : 10 }}>{n === "DJ" ? "DJ" : initial(n)}</span>;
  const colorOfName = (n) => (pcs.find((p) => p.name === n)?.color) || "#8E6FC4";
  return (
    <div className="fb" role="status" aria-label="Foco de la mesa" onPointerDown={(e) => e.stopPropagation()}>
      <div className="fb-cur">
        <span className="fb-lab">Foco</span>
        {f ? chip(dm ? "DJ" : f.name, dm ? "#8E6FC4" : colorOfName(f.name), true, true) : <span className="fb-none">—</span>}
        <div className="fb-who"><b className="mh-serif">{f ? (dm ? "El DJ" : f.name) : "Nadie"}</b><small>{f ? (dm ? (sp.chain[sp.chain.length - 1]?.why === "fear" ? "Miedo: el foco ha pasado al DJ" : "El DJ tiene el foco") : "tiene el foco · " + mmss(now - f.since)) : "La mesa está libre"}</small></div>
      </div>
      {sp.chain.length > 0 && (
        <div className="fb-chain">
          <span className="fb-lab">Últimos pases</span>
          <div>{sp.chain.slice(-5).map((c, i) => <span key={c.at + "" + i} className="fb-link">{i > 0 && <i>→</i>}{chip(c.dm ? "DJ" : c.name, c.dm ? "#8E6FC4" : colorOfName(c.name), false)}{c.why === "fear" && <em title="Con Miedo">😨</em>}{c.why === "hope" && <em title="Con Esperanza">✦</em>}</span>)}</div>
        </div>
      )}
      <span style={{ flex: 1 }} />
      {canPass && (
        <div className="fb-pass">
          <button type="button" className="mh-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>✋ Pasar el foco ▾</button>
          {open && (
            <>
              <div className="fb-bg" onClick={() => setOpen(false)} />
              <div className="fb-menu" role="menu">
                <div className="fb-lab">¿A quién pasas el foco?</div>
                {pcs.filter((p) => !(f && !dm && f.charId === p.charId)).map((p) => (
                  <button key={p.tokenId} type="button" role="menuitem" onClick={() => (setOpen(false), onPass({ tokenId: p.tokenId, charId: p.charId, name: p.name }, isGm ? "dj" : "hope"))}>{chip(p.name, p.color, false)}<span><b>{p.name}</b><small>{p.cls}</small></span></button>
                ))}
                {!dm && <button type="button" role="menuitem" onClick={() => (setOpen(false), onPass({ dm: true }, "dj"))}>{chip("DJ", "#8E6FC4", false)}<span><b>El DJ</b><small>Hace un movimiento</small></span></button>}
                {f && isGm && <button type="button" role="menuitem" onClick={() => (setOpen(false), onClear())}><span style={{ width: 24 }}>✕</span><span><b>Apagar el foco</b></span></button>}
                <div className="fb-note">Con <b style={{ color: "#E3B04B" }}>Esperanza</b> el foco sigue en la mesa y eliges quién actúa. Con <b style={{ color: "#A58BE8" }}>Miedo</b> pasa al DJ.</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
