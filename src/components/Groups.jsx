"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Settings, Send, Users, BookOpen, Check, X } from "lucide-react";
import { useSocial, refreshSocial, Avatar, JoinCard } from "./Social";
import { loadGroupMsgs, sendGroupMsg, postGroupNote, markGroupRead, renameGroup, addGroupMembers, removeGroupMember, leaveGroup, deleteGroup, inviteGroupToCampaign, namesFor, bridge } from "@/lib/social";

// Grupos como chat conjunto: lista (en el panel de amigos), conversación, ajustes de miembros e invitación a una campaña.
const COLORS = ["#4a1fb8", "#b9831f", "#2a56c4", "#2f8f6f", "#c0504a", "#a0399b"];
const hash = (t) => [...String(t || "?")].reduce((a, c) => a + c.charCodeAt(0), 0);
export const groupColor = (id) => COLORS[hash(id) % COLORS.length];
const hue = (name) => `hsl(${(hash(name) * 47) % 360} 70% 68%)`;
const time = (t) => new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const dayLabel = (t) => {
  const d = new Date(t);
  const today = new Date();
  const y = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === y.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
};
const inviteKey = (id) => "mh-ginv:" + id;

export function GroupIcon({ id, size = 36 }) {
  return (
    <span className="mh-gp-ic" style={{ width: size, height: size, "--c": groupColor(id) }} aria-hidden="true">
      <Users size={Math.round(size * 0.5)} />
    </span>
  );
}

// Tarjeta de invitación dentro del chat: «Unirme» (con el personaje elegido) o «Ahora no».
function InviteCard({ m, me, gid, mine }) {
  const [state, setState] = useState(() => {
    try {
      return localStorage.getItem(inviteKey(m.id)) || "";
    } catch {
      return "";
    }
  });
  const set = (v) => {
    setState(v);
    try {
      localStorage.setItem(inviteKey(m.id), v);
    } catch {}
  };
  const c = m.invite;
  return (
    <div className="mh-gp-inv">
      <div className="mh-gp-inv-top"><BookOpen size={14} /> Invitación a campaña</div>
      <div className="mh-gp-inv-bd">
        <b className="mh-serif">{c.name}</b>
        <small>{c.gm ? "Te invita " + c.gm : "Invitación"} · {c.players || 0} jugador{c.players === 1 ? "" : "es"}{c.note ? " · «" + c.note + "»" : ""}</small>
        {mine ? (
          <small className="mh-gp-inv-st">Enviada a todo el grupo.</small>
        ) : state === "joined" ? (
          <small className="mh-gp-inv-st is-ok"><Check size={12} /> Te has unido a la campaña.</small>
        ) : state === "declined" ? (
          <small className="mh-gp-inv-st">No te has unido a esta campaña.</small>
        ) : (
          <>
            <JoinCard camp={{ campId: c.campId, name: c.name, desc: c.desc }} onDone={() => (set("joined"), postGroupNote(gid, `${me?.username || "Alguien"} se ha unido a «${c.name}»`))} />
            <button type="button" className="mh-gp-no" onClick={() => (set("declined"), postGroupNote(gid, `${me?.username || "Alguien"} no puede unirse a «${c.name}»`))}>Ahora no</button>
          </>
        )}
      </div>
    </div>
  );
}

export function GroupPanel({ gid, onBack }) {
  const s = useSocial();
  const info = (s.groups || []).find((x) => x.g.id === gid);
  const g = info?.g;
  const me = s.me;
  const [view, setView] = useState("chat");
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [names, setNames] = useState(new Map());
  const [rename, setRename] = useState("");
  const [sure, setSure] = useState(false);
  const [camp, setCamp] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  const members = g?.members.join(",") || "";

  // Si el grupo desaparece (te han quitado, lo han borrado o saliste), se vuelve a la lista.
  useEffect(() => {
    if (s.me && s.groups && !g) onBack();
  }, [s.me, s.groups, g]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!members) return;
    let live = true;
    namesFor(members.split(",")).then((m) => live && setNames(m)).catch(() => {});
    return () => { live = false; };
  }, [members]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRename(g?.name || "");
  }, [g?.name]);
  useEffect(() => {
    let live = true;
    const pull = async () => {
      const l = await loadGroupMsgs(gid).catch(() => []);
      if (!live) return;
      setMsgs(l);
      markGroupRead(gid);
    };
    pull();
    const t = setInterval(pull, 3500);
    return () => { live = false; clearInterval(t); };
  }, [gid]);
  useEffect(() => {
    if (view === "chat") end.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, view]);

  if (!g || !me) return <div className="mh-pop-empty">Cargando el grupo…</div>;
  const isOwner = g.owner === me.id;
  const person = (id) => (id === me.id ? me : s.friends.find((f) => f.id === id) || names.get(id) || { id, username: "Jugador" });
  const online = g.members.filter((id) => id === me.id || (s.friends.find((f) => f.id === id)?.status || "off") !== "off").length;
  const others = g.members.filter((id) => id !== me.id);
  const addable = s.friends.filter((f) => !g.members.includes(f.id));

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    setErr((await sendGroupMsg(gid, t)) || "");
    setMsgs(await loadGroupMsgs(gid));
    markGroupRead(gid);
  };
  const after = async (promise) => {
    const r = await promise;
    await refreshSocial();
    setMsgs(await loadGroupMsgs(gid));
    return r;
  };
  const back = () => (setView("chat"), setErr(""), setSure(false));

  const header = (title, sub, extra) => (
    <div className="mh-gp-h">
      <button type="button" className="mh-fbtn" onClick={view === "chat" ? onBack : back} aria-label={view === "chat" ? "Volver a la lista" : "Volver al chat"}><ChevronLeft size={16} /></button>
      {view === "chat" && <GroupIcon id={g.id} size={32} />}
      <span className="mh-gp-t"><b className="mh-serif">{title}</b><small>{sub}</small></span>
      {extra}
    </div>
  );

  if (view === "settings") {
    return (
      <div className="mh-gp">
        {header("Ajustes del grupo", g.name)}
        <div className="mh-gp-body">
          <div className="mh-gp-sec">Miembros · {g.members.length}</div>
          {g.members.map((id) => {
            const p = person(id);
            return (
              <div key={id} className="mh-gp-mem">
                <Avatar name={p.username} size={32} status={id === me.id ? (s.profile?.status === "inv" ? "off" : "on") : p.status || "off"} />
                <span className="mh-gp-mt"><b>{p.username}{id === me.id ? " (tú)" : ""}</b><small>{id === me.id ? "En línea" : p.status === "off" || !p.status ? "Desconectado" : p.status === "away" ? "Ausente" : "En línea"}</small></span>
                {id === g.owner ? <span className="mh-gp-role is-own">Creador</span> : isOwner ? <button type="button" className="mh-gp-x" aria-label={"Quitar a " + p.username} title="Quitar del grupo" onClick={() => after(removeGroupMember(gid, p))}><X size={13} /></button> : <span className="mh-gp-role">Miembro</span>}
              </div>
            );
          })}
          {isOwner && (
            <>
              <div className="mh-gp-sec">Añadir amigos</div>
              <div className="mh-gp-chips">
                {addable.map((f) => <button key={f.id} type="button" className="mh-gp-chip" onClick={async () => setErr((await after(addGroupMembers(gid, [f]))) || "")}>+ {f.username}</button>)}
                {addable.length === 0 && <small className="mh-gp-mut">Todos tus amigos ya están en el grupo.</small>}
              </div>
              <div className="mh-gp-sec">Nombre del grupo</div>
              <input className="mh-input" maxLength={40} value={rename} onChange={(e) => setRename(e.target.value)} onBlur={() => rename.trim() && rename.trim() !== g.name && after(renameGroup(gid, rename))} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} aria-label="Nombre del grupo" />
            </>
          )}
          {err && <div className="mh-friends-msg">{err}</div>}
          <div className="mh-gp-foot">
            <button type="button" className="mh-gp-danger" onClick={async () => (await leaveGroup(gid), await refreshSocial(), onBack())}>Salir del grupo</button>
            {isOwner && (sure
              ? <button type="button" className="mh-gp-danger is-on" onClick={async () => (await deleteGroup(gid), await refreshSocial(), onBack())}>¿Seguro? Borrar</button>
              : <button type="button" className="mh-gp-danger" onClick={() => setSure(true)}>Borrar grupo</button>)}
          </div>
        </div>
      </div>
    );
  }

  if (view === "invite") {
    const camps = bridge.camps;
    return (
      <div className="mh-gp">
        {header("Invitar a una campaña", `${g.name} · ${g.members.length} miembro${g.members.length === 1 ? "" : "s"}`)}
        <div className="mh-gp-body">
          <div className="mh-gp-sec">Campaña</div>
          {camps.length === 0 && <small className="mh-gp-mut">Aún no tienes campañas. Crea una para poder invitar al grupo.</small>}
          {camps.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={camp === c.id} className={"mh-gp-camp" + (camp === c.id ? " is-on" : "")} onClick={() => setCamp(c.id)}>
              <span className="mh-gp-campic"><BookOpen size={16} /></span>
              <span className="mh-gp-mt"><b>{c.name}</b><small>{c.players} personaje{c.players === 1 ? "" : "s"}</small></span>
              <span className={"mh-gp-tick" + (camp === c.id ? " is-on" : "")}>{camp === c.id && <Check size={12} />}</span>
            </button>
          ))}
          <p className="mh-gp-p">Se invita a <b>todo el grupo</b> ({others.length} persona{others.length === 1 ? "" : "s"}). Quien no pueda, simplemente no acepta la invitación.</p>
          <div className="mh-gp-sec">Mensaje (opcional)</div>
          <input className="mh-input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="¡Esta vez sí llegamos al jefe!" aria-label="Mensaje de la invitación" />
          {err && <div className="mh-friends-msg">{err}</div>}
          <div className="mh-gp-acts">
            <button type="button" className="mh-btn" disabled={!camp || !others.length || busy} onClick={async () => {
              const c = camps.find((x) => x.id === camp);
              if (!c) return;
              setBusy(true);
              const r = await inviteGroupToCampaign(gid, { campId: c.id, name: c.name, desc: c.desc, gm: me.username, players: c.players }, note);
              setBusy(false);
              await refreshSocial();
              setMsgs(await loadGroupMsgs(gid));
              setNote("");
              setCamp("");
              setErr(r);
              setView("chat");
            }}>{busy ? "Enviando…" : `Enviar ${others.length} invitación${others.length === 1 ? "" : "es"}`}</button>
            <button type="button" className="mh-btn-ghost" onClick={back}>Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  // Conversación
  // Separadores de día: se calculan antes de pintar (sin variables que cambien durante el render).
  const dayOf = msgs.map((m) => dayLabel(m.at));
  return (
    <div className="mh-gp">
      {header(g.name, `${g.members.length} miembro${g.members.length === 1 ? "" : "s"} · ${online} en línea`, (
        <>
          <button type="button" className="mh-fbtn" onClick={() => setView("settings")} aria-label="Ajustes del grupo" title="Miembros y ajustes"><Settings size={15} /></button>
        </>
      ))}
      {isOwner && (
        <button type="button" className="mh-gp-invbar" disabled={bridge.camps.length === 0} title={bridge.camps.length === 0 ? "Necesitas una campaña a la que invitar" : undefined} onClick={() => (setView("invite"), setErr(""))}><BookOpen size={13} /> Invitar al grupo a una campaña</button>
      )}
      <div className="mh-gp-feed">
        {msgs.length === 0 && <div className="mh-pop-empty">Todavía no hay mensajes. Escribe el primero.</div>}
        {msgs.map((m, i) => {
          const sep = i === 0 || dayOf[i] !== dayOf[i - 1] ? <span key={"d" + m.id} className="mh-gp-day">{dayOf[i]}</span> : null;
          if (m.sys) return [sep, <div key={m.id} className="mh-gp-sys">{m.text}</div>];
          const mineMsg = m.from === me.id;
          const p = person(m.from);
          if (m.invite) return [sep, <div key={m.id} className="mh-gp-m is-inv">{!mineMsg && <Avatar name={p.username} size={26} />}<InviteCard m={m} me={me} gid={gid} mine={mineMsg} /></div>];
          return [
            sep,
            <div key={m.id} className={"mh-gp-m" + (mineMsg ? " is-me" : "")}>
              {!mineMsg && <Avatar name={p.username} size={26} />}
              <div className="mh-gp-bub">
                {!mineMsg && <small style={{ color: hue(p.username) }}>{p.username}</small>}
                <span>{m.text}</span>
                <em>{time(m.at)}</em>
              </div>
            </div>,
          ];
        })}
        <div ref={end} />
      </div>
      {err && <div className="mh-friends-msg">{err}</div>}
      <div className="mh-gp-in">
        <input className="mh-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe al grupo…" onKeyDown={(e) => e.key === "Enter" && send()} aria-label="Mensaje al grupo" />
        <button type="button" className="mh-fbtn is-ok" onClick={send} aria-label="Enviar"><Send size={14} /></button>
      </div>
    </div>
  );
}
