"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, Search, UserPlus, Check, X, UserMinus } from "lucide-react";
import { loadSocial, searchPeople, sendRequest, respond, removeFriend, markNoticesRead } from "@/lib/social";

// Estado compartido entre la campana y el panel de amigos (se refresca cada 20 s y al volver a la pestaña).
const EMPTY = { me: null, friends: [], incoming: [], outgoing: [], notices: [] };
let state = EMPTY;
const listeners = new Set();
let timer = null;
const emit = () => listeners.forEach((l) => l());
export const refreshSocial = async () => {
  try {
    state = await loadSocial();
    emit();
  } catch (e) {
    /* sin conexión: se mantiene lo anterior */
  }
};
const subscribe = (l) => {
  listeners.add(l);
  if (listeners.size === 1) {
    refreshSocial();
    timer = setInterval(refreshSocial, 20000);
    document.addEventListener("visibilitychange", refreshSocial);
  }
  return () => {
    listeners.delete(l);
    if (!listeners.size) {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshSocial);
    }
  };
};
export const useSocial = () => useSyncExternalStore(subscribe, () => state, () => EMPTY);

const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  if (m < 1440) return `hace ${Math.round(m / 60)} h`;
  return `hace ${Math.round(m / 1440)} d`;
};
const Avatar = ({ name, size = 34 }) => (
  <span className="mh-av" style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${[...name].reduce((a, c) => a + c.charCodeAt(0), 0) * 47 % 360} 45% 45%)` }}>
    {(name || "?").charAt(0).toUpperCase()}
  </span>
);

// Campana de avisos con panel desplegable.
export function NotificationBell() {
  const s = useSocial();
  const [open, setOpen] = useState(false);
  const unread = s.notices.filter((n) => !n.read);
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  const toggle = () => {
    setOpen((o) => !o);
  };
  const close = async () => {
    setOpen(false);
    if (unread.length) {
      await markNoticesRead(unread);
      refreshSocial();
    }
  };
  return (
    <>
      <button type="button" className="mh-bell" onClick={open ? close : toggle} aria-label="Notificaciones" title="Notificaciones">
        <Bell size={16} />
        {unread.length > 0 && <b>{unread.length > 9 ? "9+" : unread.length}</b>}
      </button>
      {open && (
        <>
          <div className="mh-pop-bg" onClick={close} />
          <div className="mh-pop" role="dialog" aria-label="Notificaciones">
            <div className="mh-pop-h">Notificaciones</div>
            {s.notices.length === 0 && <div className="mh-pop-empty">No tienes avisos nuevos.</div>}
            {s.notices.map((n) => {
              const pending = n.type === "friend_request" && s.incoming.some((p) => p.id === n.from.id);
              return (
                <div key={n.key} className={"mh-notice" + (n.read ? "" : " is-new")}>
                  <Avatar name={n.from.username} />
                  <div className="mh-notice-t">
                    <span>
                      <b>{n.from.username}</b> {n.type === "friend_request" ? "quiere ser tu amigo" : "ha aceptado tu solicitud de amistad"}
                    </span>
                    <small>{ago(n.at)}</small>
                    {pending && (
                      <div className="mh-notice-a">
                        <button type="button" className="is-ok" onClick={async () => (await respond(n.from, true), refreshSocial())}>Aceptar</button>
                        <button type="button" onClick={async () => (await respond(n.from, false), refreshSocial())}>Rechazar</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// Panel de amigos: lista, solicitudes y buscador para añadir.
export function FriendsPanel() {
  const s = useSocial();
  const [tab, setTab] = useState("amigos");
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const r = await searchPeople(q).catch(() => []);
      if (live) setFound(r);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  const say = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 3500);
  };
  const add = async (p) => {
    say(await sendRequest(p).catch(() => "No se pudo enviar la solicitud."));
    setQ("");
    refreshSocial();
  };
  const known = (id) => s.friends.some((f) => f.id === id) || s.outgoing.some((f) => f.id === id);
  return (
    <aside className="mh-friends">
      <div className="mh-friends-tabs">
        <button type="button" className={tab === "amigos" ? "is-on" : ""} onClick={() => setTab("amigos")}>Amigos</button>
        <button type="button" className={tab === "solicitudes" ? "is-on" : ""} onClick={() => setTab("solicitudes")}>
          Solicitudes {s.incoming.length > 0 && <b>{s.incoming.length}</b>}
        </button>
      </div>
      <label className="mh-friends-search">
        <Search size={13} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jugador para añadir" aria-label="Buscar jugador" />
      </label>
      {msg && <div className="mh-friends-msg">{msg}</div>}
      {q.trim().length >= 2 && (
        <div className="mh-friends-sec">
          <h4>Resultados</h4>
          {found.length === 0 && <div className="mh-pop-empty">Nadie con ese nombre.</div>}
          {found.map((p) => (
            <div key={p.id} className="mh-friend">
              <Avatar name={p.username} />
              <span>{p.username}</span>
              <button type="button" className="mh-fbtn" disabled={known(p.id)} onClick={() => add(p)} title="Enviar solicitud" aria-label={"Añadir a " + p.username}>
                {known(p.id) ? <Check size={14} /> : <UserPlus size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
      {tab === "amigos" ? (
        <div className="mh-friends-sec">
          <h4>Amigos <i>{s.friends.length}</i></h4>
          {s.friends.length === 0 && <div className="mh-pop-empty">Aún no tienes amigos. Busca a un jugador por su nombre para añadirlo.</div>}
          {s.friends.map((p) => (
            <div key={p.id} className="mh-friend">
              <Avatar name={p.username} />
              <span>{p.username}</span>
              <button type="button" className="mh-fbtn" onClick={async () => (await removeFriend(p), refreshSocial())} title="Eliminar amigo" aria-label={"Eliminar a " + p.username}>
                <UserMinus size={14} />
              </button>
            </div>
          ))}
          {s.outgoing.length > 0 && (
            <>
              <h4>Enviadas <i>{s.outgoing.length}</i></h4>
              {s.outgoing.map((p) => (
                <div key={p.id} className="mh-friend is-dim">
                  <Avatar name={p.username} />
                  <span>{p.username}</span>
                  <small>Pendiente</small>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="mh-friends-sec">
          <h4>Recibidas <i>{s.incoming.length}</i></h4>
          {s.incoming.length === 0 && <div className="mh-pop-empty">No tienes solicitudes pendientes.</div>}
          {s.incoming.map((p) => (
            <div key={p.id} className="mh-friend">
              <Avatar name={p.username} />
              <span>{p.username}</span>
              <button type="button" className="mh-fbtn is-ok" onClick={async () => (await respond(p, true), refreshSocial())} aria-label={"Aceptar a " + p.username} title="Aceptar"><Check size={14} /></button>
              <button type="button" className="mh-fbtn" onClick={async () => (await respond(p, false), refreshSocial())} aria-label={"Rechazar a " + p.username} title="Rechazar"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
