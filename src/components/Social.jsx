"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, Search, UserPlus, Check, X, UserMinus, Star, MoreHorizontal, MessageCircle, BookOpen, User, Ban, ChevronLeft, ChevronRight, Send, Users, Plus, Megaphone } from "lucide-react";
import { storageGet, storageSet } from "@/lib/storage";
import { loadSocial, searchPeople, sendRequest, respond, removeFriend, markNoticesRead, saveProfile, blockPerson, sendDm, loadDm, markDmRead, inviteToCampaign, bridge } from "@/lib/social";

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

export const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  if (m < 1440) return `hace ${Math.round(m / 60)} h`;
  return `hace ${Math.round(m / 1440)} d`;
};
export const Avatar = ({ name, size = 34, status }) => (
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
export const statusText = (p) => (p.status === "on" ? (p.dnd ? "No molestar" : p.playing ? "Jugando como " + p.playing : "En línea") : p.status === "away" ? "Ausente" + (p.since ? ` · ${minsAgo(p.since)} min` : "") + (p.playing ? " · " + p.playing : "") : seen(p.lastSeen));

// Elegir con qué personaje entras y unirse a la campaña de una invitación.
export function JoinCard({ camp, onDone }) {
  const [id, setId] = useState(bridge.chars[0]?.id || "");
  const [msg, setMsg] = useState("");
  const free = bridge.chars;
  if (!free.length) return <small style={{ color: "var(--mh-muted)" }}>Crea un personaje para poder unirte.</small>;
  return (
    <div className="mh-join">
      <select className="mh-input" value={id} onChange={(e) => setId(e.target.value)} aria-label="Personaje con el que te unes">
        {free.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.cls || "Sin clase"} Nv {c.lvl}</option>)}
      </select>
      <button type="button" className="is-ok" disabled={!id} onClick={() => (bridge.join && bridge.join(camp, id), setMsg("¡Te has unido!"), onDone && onDone())}>{msg || "Unirme"}</button>
    </div>
  );
}

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
                      <b>{n.from.username}</b>{" "}
                      {n.type === "friend_request" ? "quiere ser tu amigo" : n.type === "friend_accepted" ? "ha aceptado tu solicitud de amistad" : n.type === "campaign_invite" ? "te invita a su campaña" : "quiere unirse a «" + (n.data?.title || "tu anuncio") + "»"}
                    </span>
                    {n.type === "campaign_invite" && n.data && (
                      <div className="mh-notice-card">
                        <b className="mh-serif">{n.data.name}</b>
                        <small>{n.data.gm ? n.data.gm + " es el DJ · " : ""}{n.data.players || 0} jugador{n.data.players === 1 ? "" : "es"}{n.data.desc ? " · " + n.data.desc : ""}</small>
                        <JoinCard camp={n.data} />
                      </div>
                    )}
                    {n.type === "lf_request" && (
                      <div className="mh-notice-a">
                        <button type="button" className="is-ok" onClick={async () => (n.data?.camp ? await inviteToCampaign(n.from, n.data.camp) : await sendDm(n.from, "¡Hola! He visto que quieres unirte a «" + (n.data?.title || "mi mesa") + "». Cuéntame un poco de ti."), refreshSocial())}>{n.data?.camp ? "Invitar a la campaña" : "Contestar"}</button>
                      </div>
                    )}
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
  const [dm, setDm] = useState(null);
  const [invOpen, setInvOpen] = useState(false);
  const [stMenu, setStMenu] = useState(false);
  const [groups, setGroups] = useState([]);
  const [openG, setOpenG] = useState(null);
  const [gForm, setGForm] = useState(null); // { id, mode: "add" | "ping" | "inv", text }
  const [newG, setNewG] = useState(null);
  useEffect(() => {
    storageGet("friend-groups", false).then((r) => { const g = JSON.parse(r?.value || "[]"); gref.current = g; setGroups(g); }).catch(() => {});
  }, [s.me?.id]);
  const gref = useRef(groups);
  const saveGroups = (g) => {
    const next = typeof g === "function" ? g(gref.current) : g;
    gref.current = next;
    setGroups(next);
    storageSet("friend-groups", JSON.stringify(next), false);
  };
  const status = s.profile?.status || "on";
  const setStatus = async (v) => (setStMenu(false), await saveProfile({ status: v }), refreshSocial());
  useEffect(() => {
    const open = (e) => { const p = s.friends.find((f) => f.id === e.detail?.id); if (p) setDm(p); };
    window.addEventListener("mh-dm", open);
    return () => window.removeEventListener("mh-dm", open);
  }, [s.friends]);
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
    setInvOpen(false);
    setMenu({ p, x: r.right - 210, y: r.bottom + 4 });
  };
  const friendRow = (p) => (
    <div key={p.id} className={"mh-friend" + (p.status === "off" ? " is-off" : "")} onClick={() => setDm(p)} style={{ cursor: "pointer" }}>
      <Avatar name={p.username} status={p.dnd ? "dnd" : p.status} />
      <span className="mh-friend-t">
        <b>{p.username}{favs.includes(p.id) && <Star size={11} className="mh-fav-star" />}</b>
        <small>{statusText(p)}</small>
      </span>
      {s.unread?.[p.id] > 0 && <b className="mh-unread" title="Mensajes sin leer">{s.unread[p.id]}</b>}
      {p.playing && p.status !== "off" && s.profile?.classShown !== false && renderClass && renderClass(p.playing)}
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
  const inSession = s.friends.filter((f) => f.camp && f.status !== "off");
  const groupBlock = () => (
    <div className="mh-friends-sec">
      <h4>Grupos <i><button type="button" className="mh-fbtn" style={{ width: "auto", padding: "0 8px" }} onClick={() => setNewG("")}><Plus size={12} /> Nuevo</button></i></h4>
      {newG !== null && (
        <div className="mh-grp-new">
          <input className="mh-input" autoFocus value={newG} onChange={(e) => setNewG(e.target.value)} placeholder="Nombre del grupo" onKeyDown={(e) => e.key === "Enter" && newG.trim() && (saveGroups([...groups, { id: "g" + Date.now(), name: newG.trim(), ids: [] }]), setNewG(null))} />
          <button type="button" className="mh-fbtn is-ok" onClick={() => newG.trim() && (saveGroups([...groups, { id: "g" + Date.now(), name: newG.trim(), ids: [] }]), setNewG(null))}><Check size={14} /></button>
        </div>
      )}
      {groups.length === 0 && newG === null && <div className="mh-pop-empty">Agrupa a tus amigos (por ejemplo «Mesa de los viernes») para avisarlos o invitarlos de una vez.</div>}
      {groups.map((g) => {
        const mem = g.ids.map((id) => s.friends.find((f) => f.id === id)).filter(Boolean);
        const on = mem.filter((m) => m.status !== "off").length;
        const open = openG === g.id;
        const f = gForm && gForm.id === g.id ? gForm : null;
        return (
          <div key={g.id} className="mh-grp">
            <button type="button" className="mh-grp-h" onClick={() => setOpenG(open ? null : g.id)}>
              <span className="mh-grp-ic"><Users size={14} /></span>
              <span className="mh-grp-t"><b>{g.name}</b><small>{on} de {mem.length} en línea</small></span>
              <ChevronRight size={14} style={{ transform: open ? "rotate(90deg)" : "none" }} />
            </button>
            {open && (
              <div className="mh-grp-b">
                <div className="mh-grp-av">{mem.map((m) => <Avatar key={m.id} name={m.username} size={26} status={m.status} />)}{mem.length === 0 && <small>Sin miembros todavía</small>}</div>
                <div className="mh-grp-a">
                  <button type="button" className="mh-fbtn" onClick={() => setGForm(f?.mode === "add" ? null : { id: g.id, mode: "add" })}><Plus size={12} /> Miembros</button>
                  <button type="button" className="mh-fbtn" disabled={!mem.length} onClick={() => setGForm(f?.mode === "ping" ? null : { id: g.id, mode: "ping", text: "" })}><Megaphone size={12} /> Avisar</button>
                  <button type="button" className="mh-fbtn" disabled={!mem.length || !bridge.camps.length} title={bridge.camps.length ? "" : "Necesitas una campaña"} onClick={() => setGForm(f?.mode === "inv" ? null : { id: g.id, mode: "inv" })}><BookOpen size={12} /> Invitar</button>
                  <button type="button" className="mh-fbtn" aria-label="Borrar grupo" title="Borrar grupo" onClick={() => saveGroups(groups.filter((x) => x.id !== g.id))}><X size={12} /></button>
                </div>
                {f?.mode === "add" && <div className="mh-grp-pick">{s.friends.map((fr) => <button key={fr.id} type="button" className={g.ids.includes(fr.id) ? "is-on" : ""} onClick={() => saveGroups((cur) => cur.map((x) => (x.id === g.id ? { ...x, ids: x.ids.includes(fr.id) ? x.ids.filter((i) => i !== fr.id) : [...x.ids, fr.id] } : x)))}>{fr.username}</button>)}</div>}
                {f?.mode === "ping" && (
                  <div className="mh-grp-new">
                    <input className="mh-input" autoFocus value={f.text} onChange={(e) => setGForm({ ...f, text: e.target.value })} placeholder="Mensaje para todo el grupo" />
                    <button type="button" className="mh-fbtn is-ok" disabled={!f.text.trim()} onClick={async () => { const r = await Promise.all(mem.map((m) => sendDm(m, "📣 [" + g.name + "] " + f.text))); say(r.some(Boolean) ? "Algunos no aceptan mensajes." : "Aviso enviado al grupo."); setGForm(null); refreshSocial(); }}><Send size={13} /></button>
                  </div>
                )}
                {f?.mode === "inv" && (
                  <div className="mh-grp-pick">{bridge.camps.map((c) => <button key={c.id} type="button" onClick={async () => { const r = await Promise.all(mem.map((m) => inviteToCampaign(m, { campId: c.id, name: c.name, desc: c.desc, gm: s.me?.username || "", players: c.players }))); say("Invitaciones enviadas: " + r.filter((x) => x.startsWith("Invitación")).length + " de " + r.length); setGForm(null); }}>{c.name}</button>)}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
  if (dm) return <aside className="mh-friends"><DmPanel peer={s.friends.find((f) => f.id === dm.id) || dm} me={s.me} onBack={() => setDm(null)} /></aside>;
  return (
    <aside className="mh-friends">
      <div className="mh-me-row">
        <Avatar name={s.me?.username || "?"} size={30} status={status === "inv" ? "off" : status === "dnd" ? "dnd" : "on"} />
        <span className="mh-me-t"><b>{s.me?.username || "Tú"}</b></span>
        <button type="button" className="mh-st-btn" onClick={() => setStMenu((v) => !v)} aria-expanded={stMenu}><i className={"mh-st-dot is-" + status} />{{ on: "En línea", dnd: "No molestar", inv: "Invisible" }[status]} ▾</button>
        {stMenu && (
          <>
            <div className="mh-pop-bg" onClick={() => setStMenu(false)} />
            <div className="mh-ctx mh-st-menu" role="menu">
              {[["on", "En línea", "Te ven los amigos"], ["dnd", "No molestar", "Apareces sin avisos"], ["inv", "Invisible", "Apareces desconectado"]].map(([k, l, d]) => (
                <button key={k} type="button" role="menuitem" onClick={() => setStatus(k)}><i className={"mh-st-dot is-" + k} /><span style={{ flex: 1 }}>{l}<br /><small style={{ color: "var(--mh-muted)" }}>{d}</small></span>{status === k && <Check size={13} />}</button>
              ))}
            </div>
          </>
        )}
      </div>
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
          {inSession.length > 0 && (
            <>
              <h4>En una sesión <i>{inSession.length}</i></h4>
              {inSession.map((p) => (
                <div key={"se" + p.id} className="mh-friend" onClick={() => setDm(p)} style={{ cursor: "pointer" }}>
                  <Avatar name={p.username} status={p.status} />
                  <span className="mh-friend-t"><b>{p.username}</b><small>{p.role ? p.role + " en " : "Juega en "}«{p.camp}»{p.campSince ? " · " + ago(p.campSince).replace("hace ", "") : ""}</small></span>
                </div>
              ))}
              <hr className="mh-friends-hr" />
            </>
          )}
          {groupBlock()}
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
          <div className="mh-ctx" style={{ left: Math.max(8, Math.min(menu.x, window.innerWidth - 200)), top: Math.max(8, Math.min(menu.y, window.innerHeight - 330)) }} role="menu">
            <button type="button" role="menuitem" onClick={() => (toggleFav(menu.p.id), setMenu(null))}>
              <Star size={14} /> {favs.includes(menu.p.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
            </button>
            <button type="button" role="menuitem" onClick={() => (setDm(menu.p), setMenu(null))}><MessageCircle size={14} /> Enviar mensaje</button>
            <button type="button" role="menuitem" onClick={() => setInvOpen((v) => !v)}><BookOpen size={14} /> Invitar a una campaña <ChevronRight size={13} style={{ marginLeft: "auto" }} /></button>
            {invOpen && (
              <div className="mh-ctx-sub">
                {bridge.camps.length === 0 && <small>Aún no tienes campañas.</small>}
                {bridge.camps.map((c) => <button key={c.id} type="button" role="menuitem" onClick={async () => { const p = menu.p; setMenu(null); setInvOpen(false); say(await inviteToCampaign(p, { campId: c.id, name: c.name, desc: c.desc, gm: s.me?.username || "", players: c.players }).catch(() => "No se pudo enviar.")); }}>{c.name}</button>)}
              </div>
            )}
            <button type="button" role="menuitem" onClick={() => (window.dispatchEvent(new CustomEvent("mh-profile", { detail: { id: menu.p.id, name: menu.p.username } })), setMenu(null))}><User size={14} /> Ver perfil</button>
            <button type="button" role="menuitem" className="is-danger" onClick={async () => { const p = menu.p; setMenu(null); await blockPerson(p); refreshSocial(); say(p.username + " bloqueado."); }}><Ban size={14} /> Bloquear</button>
            <button type="button" role="menuitem" className="is-danger" onClick={async () => (setMenu(null), await removeFriend(menu.p), refreshSocial())}>
              <UserMinus size={14} /> Eliminar amigo
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

// Chat privado con un amigo (se refresca cada pocos segundos mientras está abierto).
function DmPanel({ peer, me, onBack }) {
  const [list, setList] = useState([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const end = useRef(null);
  useEffect(() => {
    let live = true;
    const pull = async () => {
      const l = await loadDm(peer.id).catch(() => []);
      if (!live) return;
      setList(l);
      markDmRead(peer.id);
    };
    pull();
    const t = setInterval(pull, 3500);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [peer.id]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [list.length]);
  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    const e = await sendDm(peer, t);
    setErr(e || "");
    setList(await loadDm(peer.id));
    markDmRead(peer.id);
  };
  const time = (t) => new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="mh-dm">
      <div className="mh-dm-h">
        <button type="button" className="mh-fbtn" onClick={onBack} aria-label="Volver a la lista"><ChevronLeft size={16} /></button>
        <Avatar name={peer.username} size={32} status={peer.dnd ? "dnd" : peer.status} />
        <span className="mh-friend-t"><b>{peer.username}</b><small>{statusText(peer)}</small></span>
      </div>
      <div className="mh-dm-feed">
        {list.length === 0 && <div className="mh-pop-empty">Todavía no hay mensajes. Escribe el primero.</div>}
        {list.map((m) => (
          <div key={m.id} className={"mh-dm-m" + (m.from === me?.id ? " is-me" : "")}>
            {m.text && <div>{m.text}</div>}
            {(() => { const t = /[?]ficha=([a-z0-9]+)/.exec(m.text || ""); return t ? <button type="button" className="mh-fbtn" style={{ width: "auto", padding: "0 10px", marginTop: 4 }} onClick={() => window.dispatchEvent(new CustomEvent("mh-sheet", { detail: { token: t[1] } }))}>Ver la ficha</button> : null; })()}
            {m.invite && (
              <div className="mh-notice-card">
                <b className="mh-serif">{m.invite.name}</b>
                <small>Invitación a la campaña</small>
                {m.from !== me?.id && <JoinCard camp={{ campId: m.invite.campId, name: m.invite.name, desc: m.invite.desc }} />}
              </div>
            )}
            <small>{time(m.at)}</small>
          </div>
        ))}
        <div ref={end} />
      </div>
      {err && <div className="mh-friends-msg">{err}</div>}
      <div className="mh-dm-in">
        <input className="mh-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe un mensaje…" onKeyDown={(e) => e.key === "Enter" && send()} aria-label="Mensaje" />
        <button type="button" className="mh-fbtn is-ok" onClick={send} aria-label="Enviar"><Send size={14} /></button>
      </div>
    </div>
  );
}
