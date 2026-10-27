"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Clock, EyeOff, Lock, MessageCircle, Octagon, Pencil, Plus, Star, X } from "lucide-react";
import { useSocial, refreshSocial, Avatar } from "./Social";
import { Badge } from "./Achievements";
import { ACHIEVEMENTS, CATS } from "@/lib/achievements";
import { getProfile, saveProfile, getAchievements, getActivity, bridge, inviteToCampaign } from "@/lib/social";

// Perfil de jugador como página de la columna central: cabecera, cifras, vitrina de logros y pestañas.
const LOOKING = ["Jugador", "DJ", "Mesa nueva", "Entre semana", "Fines de semana", "Rol con interpretación", "Combate táctico", "Principiante"];
const hueOf = (n) => [...(n || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) * 47 % 360;
const monthEs = (t) => new Date(t).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
const dayEs = (t) => new Date(t).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
// Líneas (nunca aparecen en la mesa) y velos (pueden pasar, pero fuera de escena). Se sugieren temas habituales y se puede escribir otro.
const SUGGEST = ["Violencia gráfica", "Maltrato o abuso", "Violencia sexual", "Daño a niños", "Tortura", "Autolesiones", "Enfermedad grave", "Daño a animales", "Discriminación", "Arañas e insectos"];
const TABS = [["resumen", "Resumen"], ["logros", "Logros"], ["personajes", "Personajes"], ["actividad", "Actividad"]];

function AchCard({ a, st, edit, featured, onToggle, onOpen }) {
  const on = !!st.unlocked[a.id];
  const cur = Math.min(st.stats[a.stat] || 0, a.goal);
  return (
    <div className={"pf-ac" + (on ? "" : " is-lock") + (featured ? " is-feat" : "")} role="button" tabIndex={0} aria-label={a.name + ": ver detalle"} onClick={onOpen} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}>
      <Badge a={a} locked={!on} size={56} />
      <div>
        <b>{a.name}</b>
        <small>{on ? dayEs(st.unlocked[a.id]) : a.goal > 1 ? cur + " de " + a.goal : "Bloqueado"}</small>
        {!on && a.goal > 1 && <div className="pf-bar"><i style={{ width: (cur / a.goal) * 100 + "%" }} /></div>}
      </div>
      {edit && on && (
        <button type="button" className={"pf-star" + (featured ? " on" : "")} aria-pressed={featured} aria-label={featured ? "Quitar de la vitrina" : "Poner en la vitrina"} onClick={(e) => (e.stopPropagation(), onToggle())}><Star size={14} /></button>
      )}
    </div>
  );
}

export default function ProfilePage({ id, name }) {
  const s = useSocial();
  const meId = s.me?.id;
  const uid = id === "me" ? meId : id;
  const isMe = !!uid && uid === meId;
  const [p, setP] = useState(null);
  const [ach, setAch] = useState(null);
  const [acts, setActs] = useState([]);
  const [tab, setTab] = useState("resumen");
  const [cat, setCat] = useState("");
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(null);
  const [inv, setInv] = useState(false);
  const [msg, setMsg] = useState("");
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    let live = true;
    /* eslint-disable react-hooks/set-state-in-effect */
    setP(null);
    setTab("resumen");
    setEdit(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    getProfile(uid, true).then((v) => live && setP(v));
    getAchievements(uid).then((v) => live && setAch(v)).catch(() => live && setAch({ stats: {}, unlocked: {} }));
    getActivity(uid).then((v) => live && setActs(v)).catch(() => {});
    return () => { live = false; };
  }, [uid]);

  useEffect(() => {
    if (!detail) return undefined;
    const k = (e) => e.key === "Escape" && setDetail(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [detail]);

  const who = name || p?.name || s.me?.username || "Jugador";
  const friend = s.friends.find((f) => f.id === uid);
  const unlockedIds = useMemo(() => (ach ? ACHIEVEMENTS.filter((a) => ach.unlocked[a.id]).map((a) => a.id) : []), [ach]);

  if (!uid || !p || !ach) return <div className="so-page"><div className="so-empty">Cargando perfil…</div></div>;

  const d = edit && draft ? draft : { bio: p.bio, looking: p.looking, chars: p.chars, featured: p.featured || [], lines: p.lines || [], veils: p.veils || [] };
  const featIds = d.featured.filter((x) => unlockedIds.includes(x)).slice(0, 3);
  const recent = [...unlockedIds].sort((a, b) => ach.unlocked[b] - ach.unlocked[a]).slice(0, 3);
  const shown = (edit || featIds.length ? featIds : recent).map((x) => ACHIEVEMENTS.find((a) => a.id === x));
  const camps = isMe ? bridge.camps.length : (ach.stats.campsStarted || 0) + (ach.stats.campsJoined || 0);
  const nChars = isMe ? bridge.chars.length : p.chars.length;
  const detailA = detail ? ACHIEVEMENTS.find((a) => a.id === detail) : null;
  const detailOn = !!(detailA && ach.unlocked[detailA.id]);
  const list = ACHIEVEMENTS.filter((a) => !cat || a.cat === cat);
  const col = `hsl(${hueOf(who)} 45% 45%)`;

  const startEdit = () => (setDraft({ bio: p.bio, looking: p.looking, chars: p.chars, featured: p.featured || [], lines: p.lines || [], veils: p.veils || [] }), setEdit(true), setMsg(""));
  const save = async () => {
    await saveProfile({ bio: draft.bio.slice(0, 280), looking: draft.looking, chars: draft.chars, featured: draft.featured.slice(0, 3), lines: draft.lines, veils: draft.veils });
    setP(await getProfile(uid, true));
    setEdit(false);
    setMsg("Perfil guardado.");
    refreshSocial();
  };
  const toggleFeat = (aid) => setDraft((x) => ({ ...x, featured: x.featured.includes(aid) ? x.featured.filter((f) => f !== aid) : x.featured.length >= 3 ? x.featured : [...x.featured, aid] }));
  const grid = (items) => (
    <div className="pf-grid">
      {items.map((a) => <AchCard key={a.id} a={a} st={ach} edit={edit} featured={d.featured.includes(a.id)} onToggle={() => toggleFeat(a.id)} onOpen={() => setDetail(a.id)} />)}
    </div>
  );

  const vitrina = (
    <>
      <h3 className="pf-h">{edit ? "Vitrina · elige hasta 3 con la estrella" : featIds.length ? "Vitrina" : "Últimos logros"}</h3>
      <div className="pf-vit">
        {shown.map((a) => (
          <div key={a.id} className="pf-vi" role="button" tabIndex={0} aria-label={a.name + ": ver detalle"} onClick={() => setDetail(a.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setDetail(a.id))}><Badge a={a} size={80} /><b>{a.name}</b><small>{a.tier[0].toUpperCase() + a.tier.slice(1)}</small></div>
        ))}
        {!shown.length && !edit && <div className="pf-vi is-empty">{isMe ? "Aún no tienes logros. ¡Juega y aparecerán aquí!" : "Todavía sin logros."}</div>}
        {edit && Array.from({ length: Math.max(0, 3 - shown.length) }).map((_, i) => <button key={"e" + i} type="button" className="pf-vi is-empty" onClick={() => setTab("logros")}>Hueco libre<small>Elígelo en la pestaña Logros</small></button>)}
      </div>
    </>
  );
  const filters = (
    <div className="pf-chips">
      <button type="button" className={"pf-chip" + (!cat ? " on" : "")} onClick={() => setCat("")}>Todos</button>
      {CATS.map((c) => <button key={c} type="button" className={"pf-chip" + (cat === c ? " on" : "")} onClick={() => setCat(cat === c ? "" : c)}>{c}</button>)}
    </div>
  );
  const charsList = (isMe && edit ? bridge.chars : null);
  const charsBlock = (
    <>
      <h3 className="pf-h">Personajes que {isMe ? "enseño" : "enseña"}</h3>
      {charsList
        ? charsList.map((c) => {
            const on = d.chars.some((x) => x.name === c.name);
            return <button key={c.id} type="button" className={"pf-char" + (on ? " on" : "")} onClick={() => setDraft({ ...draft, chars: on ? d.chars.filter((x) => x.name !== c.name) : [...d.chars, { name: c.name, cls: c.cls, lvl: c.lvl }] })}><span className="pf-cav">{c.name.charAt(0)}</span><span><b>{c.name}</b><small>{c.cls || "Sin clase"} · Nv {c.lvl}</small></span></button>;
          })
        : d.chars.map((c) => <div key={c.name} className="pf-char"><span className="pf-cav">{c.name.charAt(0)}</span><span><b>{c.name}</b><small>{c.cls || "Sin clase"} · Nv {c.lvl}</small></span></div>)}
      {!charsList && d.chars.length === 0 && <small className="pf-mut">{isMe ? "No enseñas ningún personaje. Edita tu perfil para elegirlos." : "No enseña ningún personaje."}</small>}
    </>
  );
  const addTag = (field, t) => {
    const v = t.trim().slice(0, 40);
    if (v && !d[field].includes(v)) setDraft((x) => ({ ...x, [field]: [...x[field], v] }));
  };
  const dropTag = (field, t) => setDraft((x) => ({ ...x, [field]: x[field].filter((y) => y !== t) }));
  const limGroup = (field, cls, Icon, title, hint) => {
    const cur = d[field];
    const free = SUGGEST.filter((t) => !d.lines.includes(t) && !d.veils.includes(t));
    return (
      <div className={"pf-lim-g " + cls}>
        <b><Icon size={13} /> {title}</b>
        <small>{hint}</small>
        <div className="pf-lim-c">
          {cur.map((t) => (edit ? <button key={t} type="button" className="pf-tag" title="Quitar" onClick={() => dropTag(field, t)}>{t} ×</button> : <span key={t} className="pf-tag">{t}</span>))}
          {!edit && cur.length === 0 && <small className="pf-mut" style={{ margin: 0 }}>{isMe ? "Nada indicado." : "Sin indicar."}</small>}
        </div>
        {edit && (
          <>
            <div className="pf-lim-c" style={{ marginTop: 8 }}>{free.slice(0, 6).map((t) => <button key={t} type="button" className="pf-tag off" onClick={() => addTag(field, t)}>+ {t}</button>)}</div>
            <form className="pf-lim-add" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget.elements.t; addTag(field, f.value); f.value = ""; }}>
              <input name="t" className="mh-input" maxLength={40} placeholder="Otro tema…" aria-label={"Añadir a " + title.toLowerCase()} />
              <button type="submit" className="mh-btn-ghost" aria-label="Añadir"><Plus size={14} /></button>
            </form>
          </>
        )}
      </div>
    );
  };
  const limitsBlock = (
    <>
      <h3 className="pf-h">Líneas y velos</h3>
      <div className="pf-lim">
        {limGroup("lines", "is-line", Octagon, "Líneas", "Temas que no quiere que aparezcan en la mesa.")}
        {limGroup("veils", "is-veil", EyeOff, "Velos", "Temas que pueden existir, pero sin mostrarse: se resuelven fuera de escena.")}
      </div>
    </>
  );
  const actBlock = (
    <>
      <h3 className="pf-h">Actividad reciente</h3>
      {!isMe && !p.activity ? <small className="pf-mut"><Lock size={12} /> {who} no comparte su actividad.</small> : acts.length === 0 ? <small className="pf-mut">Sin actividad todavía.</small> : <div className="pf-tl">{acts.slice(0, tab === "actividad" ? 16 : 6).map((a) => <div key={a.id} className="pf-act"><span className="pf-act-i"><Clock size={13} /></span><div className="pf-act-t">{who} {a.text}</div><small className="pf-act-d">{dayEs(a.at)}</small></div>)}</div>}
    </>
  );

  return (
    <div className={"so-page pf" + (edit || inv ? " is-edit" : "")}>
      <div className="pf-card">
        <div className="pf-ban" style={{ "--c": col }} />
        <div className="pf-head">
          <Avatar name={who} size={104} status={friend?.status} />
          <div className="pf-who">
            <h1 className="mh-serif">{who}{isMe ? " · tú" : ""}</h1>
            <small>{friend ? (friend.camp ? (friend.role || "Juega") + " en «" + friend.camp + "»" : friend.status === "off" ? "Desconectado" : "En línea") : isMe ? "Tu perfil" : "Jugador"}{p.since ? " · miembro desde " + monthEs(p.since) : ""}</small>
            <div className="pf-pills">{(d.looking || []).map((t) => <span key={t} className="pf-pill">{t}</span>)}</div>
          </div>
          <div className="pf-acts">
            {isMe && !edit && <button type="button" className="mh-btn" onClick={startEdit}><Pencil size={14} /> Editar perfil</button>}
            {isMe && edit && <><button type="button" className="mh-btn" onClick={save}>Guardar perfil</button><button type="button" className="mh-btn-ghost" onClick={() => setEdit(false)}>Cancelar</button></>}
            {!isMe && friend && <button type="button" className="mh-btn" onClick={() => window.dispatchEvent(new CustomEvent("mh-dm", { detail: { id: uid } }))}><MessageCircle size={14} /> Mensaje</button>}
            {!isMe && friend && <button type="button" className="mh-btn-ghost" disabled={bridge.camps.length === 0} title={bridge.camps.length === 0 ? "Necesitas una campaña a la que invitar" : undefined} onClick={() => setInv((v) => !v)}><BookOpen size={14} /> Invitar a una campaña</button>}
          </div>
        </div>
        {inv && (
          <div className="pf-body" style={{ paddingTop: 0 }}>
            <div className="pf-chips">
              {bridge.camps.length === 0 && <small className="pf-mut">Aún no tienes campañas.</small>}
              {bridge.camps.map((c) => <button key={c.id} type="button" className="pf-chip" onClick={async () => setMsg(await inviteToCampaign(friend, { campId: c.id, name: c.name, desc: c.desc, gm: s.me?.username || "", players: c.players }))}>{c.name}</button>)}
            </div>
          </div>
        )}
        {msg && <div className="mh-friends-msg" style={{ margin: "8px 28px 0" }}>{msg}</div>}
        {edit ? (
          <div className="pf-edit">
            <h3 className="pf-h">Lo que busco</h3>
            <div className="pf-chips">{LOOKING.map((t) => { const on = d.looking.includes(t); return <button key={t} type="button" className={"pf-chip" + (on ? " on" : "")} onClick={() => setDraft({ ...draft, looking: on ? d.looking.filter((x) => x !== t) : [...d.looking, t] })}>{t}</button>; })}</div>
            <h3 className="pf-h">Sobre mí</h3>
            <textarea className="mh-input" maxLength={280} value={d.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="Cuenta algo de ti: qué te gusta jugar, tu horario…" />
          </div>
        ) : (
          <p className="pf-bio">{p.bio || (isMe ? "Añade una descripción desde «Editar perfil»." : "—")}</p>
        )}
        <div className="pf-stats">
          <div><b>{camps}</b><span>Campañas</span></div>
          <div><b>{nChars}</b><span>Personajes</span></div>
          <div><b>{ach.stats.crit || 0}</b><span>Críticos</span></div>
          <div><b>{ach.stats.medals || 0}</b><span>Medallas</span></div>
          <div><b>{unlockedIds.length}/{ACHIEVEMENTS.length}</b><span>Logros</span></div>
        </div>
        <div className="pf-tabs" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={"pf-tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}</button>)}
        </div>
        <div className="pf-body">
          {tab === "resumen" && (
            <div className="pf-res">
              <div className="pf-pn">{vitrina}</div>
              <div className="pf-pn">{limitsBlock}</div>
              <div className="pf-col"><div className="pf-pn">{charsBlock}</div><div className="pf-pn pf-pn-fill">{actBlock}</div></div>
            </div>
          )}
          {tab === "logros" && <div className="pf-wide">{edit && <div style={{ marginBottom: 14 }}>{vitrina}</div>}<h3 className="pf-h">Todos los logros</h3>{filters}{grid(list)}</div>}
          {tab === "personajes" && <div className="pf-wide pf-two"><div className="pf-pn">{charsBlock}</div><div className="pf-pn">{limitsBlock}</div></div>}
          {tab === "actividad" && <div className="pf-wide"><div className="pf-pn pf-pn-fill">{actBlock}</div></div>}
        </div>
        {detailA && (
          <div className="pf-dlg" role="dialog" aria-modal="true" aria-label={detailA.name} onClick={() => setDetail(null)}>
            <div className="pf-dlg-box" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="mh-x pf-dlg-x" aria-label="Cerrar" onClick={() => setDetail(null)}><X size={16} /></button>
              <Badge a={detailA} locked={!detailOn} size={150} rotatable />
              <small className="pf-dlg-hint">Desliza hacia los lados para girarla</small>
              <small className="pf-dlg-tier">{detailA.tier[0].toUpperCase() + detailA.tier.slice(1)} · {detailA.cat}</small>
              <h2 className="mh-serif">{detailA.name}</h2>
              <p>{detailA.desc}</p>
              {detailOn ? (
                <div className="pf-dlg-st is-on">Conseguido el {dayEs(ach.unlocked[detailA.id])}</div>
              ) : (
                <div className="pf-dlg-st">
                  Bloqueado{detailA.goal > 1 ? " · " + Math.min(ach.stats[detailA.stat] || 0, detailA.goal) + " de " + detailA.goal : ""}
                  {detailA.goal > 1 && <div className="pf-bar"><i style={{ width: (Math.min(ach.stats[detailA.stat] || 0, detailA.goal) / detailA.goal) * 100 + "%" }} /></div>}
                </div>
              )}
            </div>
          </div>
        )}
        {!isMe && <div className="so-foot" style={{ padding: "0 28px 18px" }}><Lock size={12} /> Solo ves lo que {who} ha decidido enseñar.</div>}
      </div>
    </div>
  );
}
