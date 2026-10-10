"use client";

import { useEffect, useState } from "react";
import { Link2, Send, Lock, Megaphone, X, MessageCircle, BookOpen, Copy, Check, SmilePlus } from "lucide-react";
import { useSocial, refreshSocial, Avatar, ago } from "./Social";
import { getProfile, saveProfile, namesFor, unblockPerson, bridge, inviteToCampaign, sendDm, loadPosts, publishPost, removePost, requestJoin, friendActivity, shareSheet, revokeSheet, loadSheet } from "@/lib/social";

// Todo lo social que no es el panel de amigos: perfil, ficha compartida, «Buscar mesa», actividad, privacidad y reacciones.
const LOOKING = ["Jugador", "DJ", "Mesa nueva", "Entre semana", "Fines de semana", "Rol con interpretación", "Combate táctico", "Principiante"];
const hueOf = (n) => [...(n || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) * 47 % 360;
const dateEs = (t) => new Date(t).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

function Modal({ children, onClose, wide }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="mh-overlay so-ov" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={"so-modal" + (wide ? " is-wide" : "")} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

// ---------- perfil ----------
function ProfileModal({ id, name, onClose }) {
  const s = useSocial();
  const isMe = s.me?.id === id;
  const [p, setP] = useState(null);
  const [inv, setInv] = useState(false);
  const [msg, setMsg] = useState("");
  const [draft, setDraft] = useState(null);
  useEffect(() => {
    getProfile(id, true).then((v) => (setP(v), setDraft({ bio: v.bio, looking: v.looking, chars: v.chars })));
  }, [id]);
  if (!p || !draft) return null;
  const friend = s.friends.find((f) => f.id === id);
  const col = `hsl(${hueOf(name)} 45% 45%)`;
  const save = async () => {
    await saveProfile({ bio: draft.bio.slice(0, 280), looking: draft.looking, chars: draft.chars });
    setMsg("Perfil guardado.");
    setP(await getProfile(id, true));
    refreshSocial();
  };
  const chars = isMe ? draft.chars : p.chars;
  return (
    <Modal onClose={onClose}>
      <div className="so-ban" style={{ "--c": col }} />
      <div className="so-body">
        <div className="so-prow">
          <Avatar name={name} size={72} status={friend?.status} />
          <div className="so-grow"><div className="mh-serif so-name">{name}{isMe ? " · tú" : ""}</div><small>{friend ? (friend.camp ? (friend.role || "Juega") + " en «" + friend.camp + "»" : friend.status === "off" ? "Desconectado" : "En línea") : isMe ? "Tu perfil" : "Jugador"}{p.since ? " · miembro desde " + dateEs(p.since) : ""}</small></div>
          <button type="button" className="mh-x" aria-label="Cerrar" onClick={onClose}><X size={16} /></button>
        </div>
        {!isMe && (
          <div className="so-acts">
            {friend && <button type="button" className="mh-btn" onClick={() => (window.dispatchEvent(new CustomEvent("mh-dm", { detail: { id } })), onClose())}><MessageCircle size={14} /> Mensaje</button>}
            {friend && <button type="button" className="mh-btn-ghost" onClick={() => setInv((v) => !v)}><BookOpen size={14} /> Invitar a una campaña</button>}
          </div>
        )}
        {inv && (
          <div className="so-chips">
            {bridge.camps.length === 0 && <small>Aún no tienes campañas.</small>}
            {bridge.camps.map((c) => <button key={c.id} type="button" className="so-chip" onClick={async () => setMsg(await inviteToCampaign(friend, { campId: c.id, name: c.name, desc: c.desc, gm: s.me?.username || "", players: c.players }))}>{c.name}</button>)}
          </div>
        )}
        {msg && <div className="mh-friends-msg">{msg}</div>}
        <div className="so-lab">Lo que busco</div>
        <div className="so-chips">
          {(isMe ? LOOKING : p.looking).map((t) => {
            const on = (isMe ? draft.looking : p.looking).includes(t);
            return isMe ? <button key={t} type="button" className={"so-chip" + (on ? " on" : "")} onClick={() => setDraft({ ...draft, looking: on ? draft.looking.filter((x) => x !== t) : [...draft.looking, t] })}>{t}</button> : <span key={t} className="so-chip on">{t}</span>;
          })}
          {!isMe && p.looking.length === 0 && <small>No ha dicho nada todavía.</small>}
        </div>
        <div className="so-lab">Sobre mí</div>
        {isMe ? <textarea className="mh-input" maxLength={280} style={{ width: "100%", minHeight: 64, resize: "vertical" }} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="Cuenta algo de ti: qué te gusta jugar, tu horario…" /> : <p className="so-bio">{p.bio || "—"}</p>}
        <div className="so-lab">Personajes que enseño</div>
        <div className="so-chars">
          {isMe && bridge.chars.map((c) => {
            const on = draft.chars.some((x) => x.name === c.name);
            return <button key={c.id} type="button" className={"so-char" + (on ? " on" : "")} onClick={() => setDraft({ ...draft, chars: on ? draft.chars.filter((x) => x.name !== c.name) : [...draft.chars, { name: c.name, cls: c.cls, lvl: c.lvl }] })}><b>{c.name}</b><small>{c.cls || "Sin clase"} · Nv {c.lvl}</small></button>;
          })}
          {!isMe && chars.map((c) => <div key={c.name} className="so-char on"><b>{c.name}</b><small>{c.cls || "Sin clase"} · Nv {c.lvl}</small></div>)}
          {chars.length === 0 && !isMe && <small>No enseña ningún personaje.</small>}
        </div>
        {isMe ? <div className="so-acts"><button type="button" className="mh-btn" onClick={save}>Guardar perfil</button><small><Lock size={12} /> Solo se ve lo que marques aquí.</small></div> : <div className="so-foot"><Lock size={12} /> Solo ves lo que {name} ha decidido enseñar.</div>}
      </div>
    </Modal>
  );
}

// ---------- compartir ficha ----------
const SHEET_BASE = ["f_name", "f_class", "f_subclass", "f_level", "f_ancestry", "f_community", "f_pronouns", "f_transformation"];
const pickKeys = (c, show) => {
  const out = {};
  for (const [k, v] of Object.entries(c)) {
    if (SHEET_BASE.includes(k)) out[k] = v;
    else if (show.stats && /^(t_|r_|hp_|stress_|hope_|f_proficiency|f_exp|f_experiences)/.test(k)) out[k] = v;
    else if (show.gear && /^(f_primary_weapon|f_secondary_weapon|f_armor|f_domain_cards|f_domain_vault|f_gold|f_inv|f_items)/.test(k)) out[k] = v;
    else if (show.story && /^f_(back|appear|desc|bond|conn|motiv|person|trait|look)/.test(k)) out[k] = v;
  }
  return out;
};
function ShareModal({ charId, onClose }) {
  const s = useSocial();
  const c = bridge.getChar?.(charId);
  const lsKey = "mh-share:" + charId;
  const [token, setToken] = useState(() => { try { return localStorage.getItem(lsKey) || ""; } catch { return ""; } });
  const [show, setShow] = useState({ stats: true, gear: true, story: false });
  const [days, setDays] = useState(7);
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  if (!c) return null;
  const link = token ? location.origin + "/?ficha=" + token : "";
  const make = async () => {
    const t = await shareSheet(pickKeys(c, show), show, days, token || undefined);
    setToken(t);
    try { localStorage.setItem(lsKey, t); } catch {}
    setMsg("Enlace actualizado.");
  };
  const toggle = (k) => setShow({ ...show, [k]: !show[k] });
  return (
    <Modal onClose={onClose}>
      <div className="so-body" style={{ paddingTop: 20 }}>
        <div className="so-prow"><h3 className="mh-serif so-h"><Link2 size={18} /> Compartir a {c.f_name || "tu personaje"}</h3><button type="button" className="mh-x" aria-label="Cerrar" onClick={onClose}><X size={16} /></button></div>
        <p className="so-sub">Quien tenga el enlace (y haya iniciado sesión) verá la ficha, sin poder editarla.</p>
        <div className="so-lab">Qué se ve</div>
        {[["stats", "Rasgos, Vida, Estrés y Esperanza"], ["gear", "Equipo y cartas de dominio"], ["story", "Trasfondo y descripción"]].map(([k, l]) => (
          <label key={k} className="so-set"><span className="so-grow">{l}</span><input type="checkbox" checked={show[k]} onChange={() => toggle(k)} /></label>
        ))}
        <div className="so-lab">Caduca</div>
        <div className="so-chips">{[[1, "En 1 día"], [7, "En 7 días"], [30, "En 30 días"]].map(([d, l]) => <button key={d} type="button" className={"so-chip" + (days === d ? " on" : "")} onClick={() => setDays(d)}>{l}</button>)}</div>
        <div className="so-acts"><button type="button" className="mh-btn" onClick={make}>{token ? "Actualizar enlace" : "Crear enlace"}</button>{token && <button type="button" className="mh-btn-ghost" onClick={async () => (await revokeSheet(token), setToken(""), (() => { try { localStorage.removeItem(lsKey); } catch {} })(), setMsg("Dejaste de compartir."))}>Dejar de compartir</button>}</div>
        {link && (
          <>
            <div className="so-lab">Enlace</div>
            <div className="so-link"><code>{link}</code><button type="button" className="mh-btn" onClick={() => (navigator.clipboard?.writeText(link), setCopied(true), setTimeout(() => setCopied(false), 1500))}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copiado" : "Copiar"}</button></div>
            <div className="so-lab">O envíasela a un amigo</div>
            <div className="so-chips">{s.friends.map((f) => <button key={f.id} type="button" className={"so-chip" + (to === f.id ? " on" : "")} onClick={() => setTo(f.id)}>{f.username}</button>)}{s.friends.length === 0 && <small>Aún no tienes amigos.</small>}</div>
            {to && <div className="so-acts"><button type="button" className="mh-btn" onClick={async () => { const f = s.friends.find((x) => x.id === to); const e = await sendDm(f, "Mira la ficha de " + (c.f_name || "mi personaje") + ": " + link); setMsg(e || "Enviada a " + f.username + "."); }}><Send size={14} /> Enviar a {s.friends.find((x) => x.id === to)?.username}</button></div>}
          </>
        )}
        {msg && <div className="mh-friends-msg">{msg}</div>}
      </div>
    </Modal>
  );
}

const TRAIT_LABELS = [["t_agility", "Agilidad"], ["t_strength", "Fuerza"], ["t_finesse", "Destreza"], ["t_instinct", "Instinto"], ["t_presence", "Presencia"], ["t_knowledge", "Conocimiento"]];
const list = (v) => { try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a.map((x) => (typeof x === "string" ? x : x?.name || x?.key || x?.text || "")).filter(Boolean) : []; } catch { return v ? [String(v)] : []; } };
function SheetView({ token, onClose }) {
  const [sh, setSh] = useState(undefined);
  const [now0] = useState(() => Date.now());
  useEffect(() => { loadSheet(token).then(setSh).catch(() => setSh(null)); }, [token]);
  if (sh === undefined) return null;
  const d = sh?.data || {};
  const sg = (n) => (Number(n) >= 0 ? "+" : "−") + Math.abs(Number(n) || 0);
  return (
    <Modal onClose={onClose}>
      <div className="so-body" style={{ paddingTop: 20 }}>
        {!sh ? (
          <><div className="so-prow"><h3 className="mh-serif so-h">Ficha no disponible</h3><button type="button" className="mh-x" aria-label="Cerrar" onClick={onClose}><X size={16} /></button></div><p className="so-sub">El enlace ha caducado o ya no se comparte.</p></>
        ) : (
          <>
            <div className="so-prow">
              <div className="so-grow"><div className="mh-serif so-name">{d.f_name || "Sin nombre"}</div><small>{[d.f_class, d.f_subclass].filter(Boolean).join(" · ")} · Nivel {d.f_level || 1}{d.f_ancestry ? " · " + d.f_ancestry : ""}{d.f_community ? " · " + d.f_community : ""}</small></div>
              <button type="button" className="mh-x" aria-label="Cerrar" onClick={onClose}><X size={16} /></button>
            </div>
            <small className="so-sub">Compartida por {sh.ownerName} · solo lectura · caduca en {Math.max(1, Math.ceil((sh.exp - now0) / 864e5))} día{Math.ceil((sh.exp - now0) / 864e5) > 1 ? "s" : ""}</small>
            {TRAIT_LABELS.some(([k]) => d[k] !== undefined) && (
              <><div className="so-lab">Rasgos</div><div className="so-traits">{TRAIT_LABELS.map(([k, l]) => <div key={k}><small>{l}</small><b>{sg(d[k])}</b></div>)}</div></>
            )}
            {sh.show.stats && (
              <div className="so-chips" style={{ marginTop: 10 }}>
                {d.r_hp !== undefined && <span className="so-chip on">Vida {Math.max(0, Number(d.r_hp) - Number(d.hp_marked || 0))}/{d.r_hp}</span>}
                {d.r_stress !== undefined && <span className="so-chip on">Estrés {Number(d.stress_marked || 0)}/{d.r_stress}</span>}
                {d.hope_marked !== undefined && <span className="so-chip on">Esperanza {d.hope_marked}</span>}
              </div>
            )}
            {sh.show.gear && (
              <><div className="so-lab">Equipo</div><div className="so-chips">{[d.f_primary_weapon, d.f_secondary_weapon, d.f_armor].filter(Boolean).map((x) => <span key={x} className="so-chip">{x}</span>)}</div>
              {list(d.f_domain_cards).length > 0 && <><div className="so-lab">Cartas de dominio</div><div className="so-chips">{list(d.f_domain_cards).map((x) => <span key={x} className="so-chip on">{x}</span>)}</div></>}</>
            )}
            {sh.show.story && Object.entries(d).filter(([k]) => /^f_(back|appear|desc|bond|conn|motiv|person|trait|look)/.test(k)).map(([k, v]) => <div key={k}><div className="so-lab">{k.replace(/^f_/, "").replace(/_/g, " ")}</div><p className="so-bio">{v}</p></div>)}
          </>
        )}
      </div>
    </Modal>
  );
}

// Escucha los eventos de la interfaz y abre perfil, compartir ficha o una ficha recibida por enlace.
export function SocialHost() {
  const me = useSocial().me;
  const [m, setM] = useState(null);
  useEffect(() => {
    const prof = (e) => setM({ t: "profile", ...e.detail });
    const share = (e) => setM({ t: "share", ...e.detail });
    window.addEventListener("mh-profile", prof);
    window.addEventListener("mh-share", share);
    const sheet = (e) => setM({ t: "sheet", token: e.detail.token });
    window.addEventListener("mh-sheet", sheet);
    try {
      const tok = new URLSearchParams(location.search).get("ficha");
      if (tok) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setM({ t: "sheet", token: tok });
        history.replaceState(null, "", location.pathname);
      }
    } catch {}
    return () => (window.removeEventListener("mh-profile", prof), window.removeEventListener("mh-share", share), window.removeEventListener("mh-sheet", sheet));
  }, []);
  if (!m) return null;
  const close = () => setM(null);
  if (m.t === "profile" && m.id === "me" && !me) return null;
  return m.t === "profile" ? <ProfileModal id={m.id === "me" ? me.id : m.id} name={m.name} onClose={close} /> : m.t === "share" ? <ShareModal charId={m.charId} onClose={close} /> : <SheetView token={m.token} onClose={close} />;
}

// ---------- Buscar mesa ----------
const KINDS = [["players", "Busco jugadores", "#4f9a62"], ["table", "Busco mesa", "#E0544A"], ["gm", "Busco DJ", "#8E6FC4"]];
export function LookingFor() {
  const s = useSocial();
  const [posts, setPosts] = useState(null);
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  const load = async () => setPosts(await loadPosts().catch(() => []));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);
  const shown = (posts || []).filter((p) => (!kind || p.kind === kind) && (!q || (p.title + " " + p.desc + " " + p.tags.join(" ")).toLowerCase().includes(q.toLowerCase())));
  const mine = (posts || []).find((p) => p.uid === s.me?.id);
  const kindOf = (k) => KINDS.find((x) => x[0] === k) || KINDS[0];
  const publish = async () => {
    const camp = bridge.camps.find((c) => c.id === form.camp);
    await saveProfile({ searchable: true });
    await publishPost({ kind: form.kind, title: form.title.trim(), desc: form.desc.trim(), tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 6), camp: camp ? { campId: camp.id, name: camp.name, desc: camp.desc, gm: s.me?.username || "", players: camp.players } : null });
    setForm(null);
    setMsg("Anuncio publicado. Lo verá cualquiera que busque mesa.");
    load();
  };
  return (
    <div className="so-page">
      <div className="so-head">
        <div><h1 className="mh-serif">Buscar mesa</h1><p>Anuncios de jugadores y DJ que buscan gente. Para unirte, pídelo y el autor decide.</p></div>
        <button type="button" className="mh-btn" onClick={() => setForm(mine ? { kind: mine.kind, title: mine.title, desc: mine.desc, tags: mine.tags.join(", "), camp: mine.camp?.campId || "" } : { kind: "players", title: "", desc: "", tags: "", camp: "" })}><Megaphone size={15} /> {mine ? "Editar mi anuncio" : "Publicar anuncio"}</button>
      </div>
      {msg && <div className="mh-friends-msg">{msg}</div>}
      {form && (
        <div className="so-card so-form">
          <div className="so-chips">{KINDS.map(([k, l, c]) => <button key={k} type="button" className={"so-chip" + (form.kind === k ? " on" : "")} style={{ "--c": c }} onClick={() => setForm({ ...form, kind: k })}>{l}</button>)}</div>
          <input className="mh-input" maxLength={80} placeholder="Título: «La Marca Rota busca apoyo»" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="mh-input" maxLength={400} style={{ minHeight: 70 }} placeholder="Cuéntanos qué buscas, el tono, el sistema…" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          <input className="mh-input" placeholder="Etiquetas separadas por comas: Viernes 21:00, Español, 2 plazas" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          {bridge.camps.length > 0 && <select className="mh-input" value={form.camp} onChange={(e) => setForm({ ...form, camp: e.target.value })}><option value="">Sin campaña asociada</option>{bridge.camps.map((c) => <option key={c.id} value={c.id}>Asociar a «{c.name}»</option>)}</select>}
          <div className="so-acts"><button type="button" className="mh-btn" disabled={!form.title.trim()} onClick={publish}>Publicar</button>{mine && <button type="button" className="mh-btn-ghost" onClick={async () => (await removePost(), setForm(null), setMsg("Anuncio retirado."), load())}>Retirar mi anuncio</button>}<button type="button" className="mh-btn-ghost" onClick={() => setForm(null)}>Cancelar</button><small><Lock size={12} /> Al publicar, tu perfil aparece en Buscar mesa.</small></div>
        </div>
      )}
      <div className="so-chips so-filters">
        <button type="button" className={"so-chip" + (!kind ? " on" : "")} onClick={() => setKind("")}>Todos</button>
        {KINDS.map(([k, l, c]) => <button key={k} type="button" className={"so-chip" + (kind === k ? " on" : "")} style={{ "--c": c }} onClick={() => setKind(kind === k ? "" : k)}>{l}</button>)}
        <input className="mh-input so-q" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar anuncios" />
      </div>
      {posts === null && <div className="so-empty">Cargando…</div>}
      {posts && shown.length === 0 && <div className="so-empty">No hay anuncios todavía. Sé el primero en publicar uno.</div>}
      {shown.map((p) => {
        const [, label, c] = kindOf(p.kind);
        const me = p.uid === s.me?.id;
        return (
          <div key={p.id} className="so-card so-post">
            <Avatar name={p.name} size={44} />
            <div className="so-grow">
              <div className="so-prow"><b className="mh-serif so-ptitle">{p.title}</b><span className="so-chip on" style={{ "--c": c }}>{label}</span></div>
              <small>{p.name} · {ago(p.at)}{p.camp ? " · campaña «" + p.camp.name + "»" : ""}</small>
              {p.desc && <p>{p.desc}</p>}
              <div className="so-chips">{p.tags.map((t) => <span key={t} className="so-chip">{t}</span>)}</div>
            </div>
            <div className="so-side">
              {me ? <small>Tu anuncio</small> : <button type="button" className="mh-btn" onClick={async () => setMsg(await requestJoin(p).catch(() => "No se pudo enviar."))}>Pedir unirme</button>}
              {!me && <button type="button" className="mh-btn-ghost" onClick={() => window.dispatchEvent(new CustomEvent("mh-profile", { detail: { id: p.uid, name: p.name } }))}>Ver perfil</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- actividad de amigos (Inicio) ----------
export function ActivityCard() {
  const s = useSocial();
  const [items, setItems] = useState([]);
  const ids = s.friends.map((f) => f.id).join(",");
  useEffect(() => {
    let live = true;
    const pull = () => friendActivity(s.friends).then((r) => live && setItems(r)).catch(() => {});
    pull();
    const t = setInterval(pull, 60000);
    return () => (live = false, clearInterval(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  if (!items.length) return null;
  const tag = { level: "⬆ Nivel", camp: "📖 Campaña", crit: "🎲 Crítico", char: "✨ Personaje" };
  return (
    <div className="so-card" style={{ marginTop: 14 }}>
      <div className="so-prow"><h3 className="mh-serif so-h">Actividad de tus amigos</h3></div>
      <p className="so-sub">Lo que ha pasado en los últimos días. Cada persona decide si lo comparte (Ajustes → Privacidad).</p>
      <div className="so-feed">
        {items.map((a) => (
          <div key={a.who.id + a.id} className="so-ev"><Avatar name={a.who.username} size={32} status={a.who.status} /><div className="so-grow"><b>{a.who.username} {a.text}</b><small>{ago(a.at)}</small></div><span className="so-chip on">{tag[a.kind] || "Novedad"}</span></div>
        ))}
      </div>
    </div>
  );
}

// ---------- privacidad (Ajustes) ----------
const AUD = [["all", "Todos"], ["friends", "Amigos"], ["none", "Nadie"]];
export function PrivacyCard() {
  const s = useSocial();
  const p = s.profile;
  const [names, setNames] = useState({});
  const blocked = (p?.blocked || []).join(",");
  useEffect(() => {
    if (!p?.blocked?.length) return;
    namesFor(p.blocked).then((m) => setNames(Object.fromEntries([...m.entries()].map(([k, v]) => [k, v.username])))).catch(() => {});
  }, [blocked]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return null;
  const set = async (patch) => (await saveProfile(patch), refreshSocial());
  const aud = (k, l, d) => (
    <div className="so-set"><div className="so-grow"><b>{l}</b><small>{d}</small></div><div className="so-chips">{AUD.map(([v, t]) => <button key={v} type="button" className={"so-chip" + (p[k] === v ? " on" : "")} onClick={() => set({ [k]: v })}>{t}</button>)}</div></div>
  );
  const tog = (k, l, d) => (
    <label className="so-set"><div className="so-grow"><b>{l}</b><small>{d}</small></div><input type="checkbox" checked={!!p[k]} onChange={(e) => set({ [k]: e.target.checked })} /></label>
  );
  return (
    <div className="mh-card so-priv" style={{ margin: 0 }}>
      <h3 className="mh-serif so-h"><Lock size={18} /> Privacidad y social</h3>
      <p className="so-sub">Decide quién te ve y qué ven de ti. Los cambios se aplican al momento.</p>
      {aud("invites", "Quién puede invitarme a campañas", "Los demás no podrán enviarte invitaciones")}
      {aud("msgs", "Quién puede escribirme", "Mensajes privados")}
      {tog("classShown", "Mostrar la clase que estoy jugando", "Lo que sale bajo tu nombre en la lista de amigos")}
      {tog("searchable", "Aparecer en «Buscar mesa»", "Tu anuncio se puede encontrar al buscar")}
      {tog("activity", "Compartir mi actividad", "Subidas de nivel, campañas nuevas y críticos")}
      <div className="so-set"><div className="so-grow"><b>Mi estado</b><small>También lo cambias arriba, en la lista de amigos</small></div><div className="so-chips">{[["on", "En línea"], ["dnd", "No molestar"], ["inv", "Invisible"]].map(([v, t]) => <button key={v} type="button" className={"so-chip" + (p.status === v ? " on" : "")} onClick={() => set({ status: v })}>{t}</button>)}</div></div>
      <div className="so-lab">Bloqueados · {p.blocked.length}</div>
      {p.blocked.length === 0 && <small className="so-sub">No has bloqueado a nadie.</small>}
      {p.blocked.map((id) => <div key={id} className="so-ev"><Avatar name={names[id] || "?"} size={30} /><div className="so-grow"><b>{names[id] || "Jugador"}</b><small>No puede escribirte ni invitarte</small></div><button type="button" className="mh-btn-ghost" onClick={async () => (await unblockPerson(id), refreshSocial())}>Desbloquear</button></div>)}
      <small className="so-sub" style={{ display: "block", marginTop: 10 }}>Estos permisos se aplican al enviar: una persona con una versión antigua de la app podría saltárselos.</small>
    </div>
  );
}

// ---------- reacciones del chat ----------
const EMOJIS = ["👍", "😂", "⚔️", "🔥", "🎉", "🛡️"];
export function ReactionBar({ data, me, onToggle }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(data || {}).filter(([, u]) => u.length);
  return (
    <div className="rx-bar">
      {entries.map(([e, u]) => <button key={e} type="button" className={"rx-c" + (u.includes(me) ? " mine" : "")} onClick={() => onToggle(e)} title={u.length + " reacciones"}>{e} {u.length}</button>)}
      <span className="rx-add">
        <button type="button" className="rx-c rx-plus" aria-label="Reaccionar" onClick={() => setOpen((v) => !v)}><SmilePlus size={13} /></button>
        {open && <span className="rx-pick" onMouseLeave={() => setOpen(false)}>{EMOJIS.map((e) => <button key={e} type="button" onClick={() => (setOpen(false), onToggle(e))}>{e}</button>)}</span>}
      </span>
    </div>
  );
}
