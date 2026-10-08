"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, Search, UserPlus, Check, X, UserMinus, Star, MoreHorizontal } from "lucide-react";
import { storageGet, storageSet } from "@/lib/storage";
import { loadSocial, searchPeople, sendRequest, respond, removeFriend, markNoticesRead } from "@/lib/social";

// Estado compartido entre la campana y el panel de amigos (se refresca cada 6 s con la pestaña visible y al volver a ella).
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
    state = EMPTY; // nada de la cuenta anterior mientras carga
    refreshSocial();
    timer = setInterval(() => !document.hidden && refreshSocial(), 6000);
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
const Avatar = ({ name, size = 34, status }) => (
  <span className="mh-av" style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${[...name].reduce((a, c) => a + c.charCodeAt(0), 0) * 47 % 360} 45% 45%)` }}>
    {(name || "?").charAt(0).toUpperCase()}
    {status && <i className={"mh-st is-" + status} title={{ on: "Conectado", away: "Ausente", off: "Desconectado" }[status]} />}
  </span>
);
const minsAgo = (t) => Math.max(1, Math.round((Date.now() - t) / 60000));
const seen = (t) => {
  if (!t) return "Desconectado";
  const m = minsAgo(t);
  if (m < 60) return `Visto hace ${m} min`;
  if (m < 1440) return `Visto hace ${Math.round(m / 60)} h`;
  return m < 2880 ? "Visto ayer" : `Visto hace ${Math.round(m / 1440)} d`;
};
const statusText = (p) => (p.status === "on" ? (p.playing ? "Jugando como " + p.playing : "En línea") : p.status === "away" ? "Ausente" + (p.since ? ` · ${minsAgo(p.since)} min` : "") + (p.playing ? " · " + p.playing : "") : seen(p.lastSeen));

// Campana de avisos con panel desplegable.
export function NotificationBell({ placement }) {
  const s = useSocial();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const unread = s.notices.filter((n) => !n.read);
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  const toggle = (e) => {
    // El panel se abre pegado a la campana (no en una esquina fija).
    const r = e.currentTarget.getBoundingClientRect();
    const w = Math.min(330, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
    setPos(r.top < window.innerHeight / 2 ? { top: r.bottom + 8, bottom: "auto", left } : { top: "auto", bottom: window.innerHeight - r.top + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) });
    setOpen(true);
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
      <button type="button" className={"mh-bell" + (placement === "top" ? " is-top" : "")} onClick={open ? close : toggle} aria-label="Notificaciones" title="Notificaciones">
        <Bell size={16} />
        {unread.length > 0 && <b>{unread.length > 9 ? "9+" : unread.length}</b>}
      </button>
      {open && (
        <>
          <div className="mh-pop-bg" onClick={close} />
          <div className="mh-pop" style={pos || undefined} role="dialog" aria-label="Notificaciones">
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
export function FriendsPanel({ renderClass }) {
  const s = useSocial();
  const [tab, setTab] = useState("amigos");
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  const [msg, setMsg] = useState("");
  const [favs, setFavs] = useState([]);
  const [menu, setMenu] = useState(null); // { p, x, y }
  useEffect(() => {
    storageGet("friend-favs", false)
      .then((r) => setFavs(JSON.parse(r?.value || "[]")))
      .catch(() => {});
  }, [s.me?.id]);
  const toggleFav = (id) => {
    const next = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
    setFavs(next);
    storageSet("friend-favs", JSON.stringify(next), false);
  };
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const esc = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);
  const openMenu = (e, p) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ p, x: r.right - 190, y: r.bottom + 4 });
  };
  const friendRow = (p) => (
    <div key={p.id} className={"mh-friend" + (p.status === "off" ? " is-off" : "")}>
      <Avatar name={p.username} status={p.status} />
      <span className="mh-friend-t">
        <b>{p.username}{favs.includes(p.id) && <Star size={11} className="mh-fav-star" />}</b>
        <small>{statusText(p)}</small>
      </span>
      {p.playing && p.status !== "off" && renderClass && renderClass(p.playing)}
      <button type="button" className="mh-fbtn" onClick={(e) => openMenu(e, p)} title="Más opciones" aria-label={"Opciones de " + p.username}>
        <MoreHorizontal size={14} />
      </button>
    </div>
  );
  const rank = { on: 0, away: 1, off: 2 };
  const sorted = [...s.friends].sort((a, b) => (rank[a.status] ?? 2) - (rank[b.status] ?? 2));
  const favFriends = sorted.filter((f) => favs.includes(f.id));
  const otherFriends = sorted.filter((f) => !favs.includes(f.id));
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
          {favFriends.length > 0 && (
            <>
              <h4>Favoritos <i>{favFriends.length}</i></h4>
              {favFriends.map(friendRow)}
              <hr className="mh-friends-hr" />
            </>
          )}
          {(otherFriends.length > 0 || favFriends.length === 0) && <h4>Amigos <i>{otherFriends.length}</i></h4>}
          {s.friends.length === 0 && <div className="mh-pop-empty">Aún no tienes amigos. Busca a un jugador por su nombre para añadirlo.</div>}
          {otherFriends.map(friendRow)}
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
      {menu && (
        <>
          <div className="mh-pop-bg" onClick={() => setMenu(null)} />
          <div className="mh-ctx" style={{ left: Math.max(8, Math.min(menu.x, window.innerWidth - 200)), top: Math.min(menu.y, window.innerHeight - 100) }} role="menu">
            <button type="button" role="menuitem" onClick={() => (toggleFav(menu.p.id), setMenu(null))}>
              <Star size={14} /> {favs.includes(menu.p.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
            </button>
            <button type="button" role="menuitem" className="is-danger" onClick={async () => (setMenu(null), await removeFriend(menu.p), refreshSocial())}>
              <UserMinus size={14} /> Eliminar amigo
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
