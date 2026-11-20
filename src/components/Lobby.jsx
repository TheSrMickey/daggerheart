"use client";
// Modo party: sala de espera de una campaña. Se invita a la gente, cada jugador elige (o crea) su personaje, se decide quién dirige
// y, cuando todos están listos, el anfitrión o el DJ comienza la campaña.
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Crown, Hammer, Hourglass, Plus, Swords, UserPlus, Users, X } from "lucide-react";
import { Avatar } from "./Social";
import { loadLobby, myUid, setMyLobby, lobbyRemove, lobbySetGm, lobbyStart } from "@/lib/social";

const STATE = {
  invited: { label: "Invitado", hint: "Aún no ha entrado", tone: "idle" },
  choosing: { label: "Eligiendo personaje", hint: "Está mirando sus personajes", tone: "busy" },
  creating: { label: "Creando personaje", hint: "Está en el asistente de creación", tone: "busy" },
  selected: { label: "Personaje elegido", hint: "Falta que pulse «Listo»", tone: "mid" },
  ready: { label: "Listo", hint: "", tone: "ok" },
};

export default function PartyLobby({ camp, chars, classColor, wizardOpen, newCharId, onCreateChar, onInvite, onBack, onStarted }) {
  const [uid, setUid] = useState(null);
  const [lobby, setLobby] = useState({ meta: null, members: {} });
  const [err, setErr] = useState("");
  const started = useRef(false);
  const mine = uid ? lobby.members[uid] : null;

  useEffect(() => {
    myUid().then(setUid);
  }, []);
  useEffect(() => {
    let alive = true;
    const pull = () => loadLobby(camp.id).then((l) => alive && setLobby(l)).catch(() => {});
    pull();
    const t = setInterval(pull, 2500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [camp.id]);

  const meta = lobby.meta;
  const role = (id) => meta?.roles?.[id] || "player";
  const iAmHost = !!meta && meta.hostId === uid;
  const iAmGm = !!meta && role(uid) === "gm";
  const myRole = role(uid);

  // Si el DJ ha comenzado, cada cliente aplica el resultado una sola vez.
  useEffect(() => {
    if (meta?.started && uid && !started.current) {
      started.current = true;
      onStarted && onStarted({ meta, me: mine, role: myRole });
    }
  }, [meta?.started, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entrar al lobby marca al jugador como «eligiendo personaje» (si venía de una invitación).
  useEffect(() => {
    if (uid && meta && !mine && meta.members.some((m) => m.id === uid)) setMyLobby(camp.id, { state: "choosing" });
  }, [uid, meta, mine, camp.id]);

  // Personaje recién creado desde la sala: queda elegido.
  useEffect(() => {
    if (!newCharId || mine?.state !== "creating") return;
    const c = chars.find((x) => x.id === newCharId);
    if (c) pick(c);
  }, [newCharId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Si se cierra el asistente sin crear nada, se vuelve a «eligiendo».
  useEffect(() => {
    if (mine?.state === "creating" && !wizardOpen && !newCharId) {
      const t = setTimeout(() => setMyLobby(camp.id, { state: "choosing" }), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [wizardOpen, mine?.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (c) => {
    setErr("");
    if (c.custom > 0 && !camp.customContent) return setErr("«" + c.name + "» lleva contenido del Taller y esta campaña no lo permite.");
    setLobby((l) => ({ ...l, members: { ...l.members, [uid]: { ...(l.members[uid] || { uid, name: "", at: Date.now() }), state: "selected", charId: c.id, charName: c.name, cls: c.cls, lvl: c.lvl } } }));
    setMyLobby(camp.id, { state: "selected", charId: c.id, charName: c.name, cls: c.cls, lvl: c.lvl });
  };
  const create = () => {
    setLobby((l) => ({ ...l, members: { ...l.members, [uid]: { ...(l.members[uid] || { uid, name: "", at: Date.now() }), state: "creating" } } }));
    setMyLobby(camp.id, { state: "creating" });
    onCreateChar && onCreateChar();
  };
  const toggleReady = () => {
    const next = mine?.state === "ready" ? (myRole === "gm" && !mine?.charId ? "choosing" : "selected") : "ready";
    setLobby((l) => ({ ...l, members: { ...l.members, [uid]: { ...l.members[uid], state: next } } }));
    setMyLobby(camp.id, { state: next });
  };

  const people = meta
    ? meta.members.map((m) => ({ ...m, st: lobby.members[m.id]?.state || "invited", c: lobby.members[m.id] || null }))
    : [];
  const readyN = people.filter((p) => p.st === "ready").length;
  const gms = people.filter((p) => role(p.id) === "gm").length;
  const everyoneReady = people.length > 1 && readyN === people.length;
  const canStart = (iAmHost || iAmGm) && everyoneReady && gms === 1;
  const why = !people.length ? "" : gms !== 1 ? "Tiene que haber un DJ." : people.length < 2 ? "Invita al menos a otra persona." : !everyoneReady ? "Faltan " + (people.length - readyN) + " por estar listos." : "";
  const canReady = myRole === "gm" ? true : mine?.state === "selected" || mine?.state === "ready";
  const col = camp.color || "#E3B04B";

  if (!meta) return <div className="lby" style={{ "--lc": col }}><div className="lby-load"><Hourglass size={18} /> Abriendo la sala…</div></div>;
  if (uid && !meta.members.some((m) => m.id === uid))
    return (
      <div className="lby" style={{ "--lc": col }}>
        <div className="lby-load">Ya no formas parte de esta sala.<button type="button" className="mh-btn" onClick={onBack}>Volver</button></div>
      </div>
    );

  return (
    <div className="lby" style={{ "--lc": col }}>
      <style>{CSS}</style>
      <header className="lby-h">
        <button type="button" className="lby-back" onClick={onBack} aria-label="Volver a Campañas" title="Campañas"><ArrowLeft size={16} /></button>
        <div className="lby-t">
          <span className="lby-k"><Users size={12} /> Modo party · sala de espera</span>
          <h2 className="mh-serif">{meta.name || camp.name}</h2>
          {meta.desc && <p>{meta.desc}</p>}
        </div>
        <div className="lby-cnt"><b>{readyN}</b> / {people.length}<small>listos</small></div>
      </header>

      <div className="lby-g">
        {people.map((p) => {
          const me = p.id === uid;
          const st = role(p.id) === "gm" && (p.st === "choosing" || p.st === "selected") ? { label: "En la sala", hint: "", tone: "mid" } : STATE[p.st] || STATE.invited;
          const isGm = role(p.id) === "gm";
          const cc = p.c?.cls ? classColor(p.c.cls) : null;
          return (
            <div key={p.id} className={"lby-s is-" + st.tone + (me ? " is-me" : "") + (isGm ? " is-gm" : "")} style={cc ? { "--cc": cc } : undefined}>
              <div className="lby-sh">
                <Avatar name={p.name} size={38} />
                <div className="lby-nm">
                  <b>{p.name}{me && <em> (tú)</em>}{p.id === meta.hostId && <Crown size={12} className="lby-crown" aria-label="Anfitrión" />}</b>
                  <span className={"lby-role" + (isGm ? " is-gm" : "")}>{isGm ? "DJ" : "Jugador"}</span>
                </div>
                {iAmHost && !me && (
                  <button type="button" className="lby-x" aria-label={"Quitar a " + p.name} title="Quitar de la sala" onClick={() => lobbyRemove(camp.id, p.id)}><X size={13} /></button>
                )}
              </div>

              <div className="lby-body">
                {isGm && !p.c?.charId ? (
                  <div className="lby-char is-gm"><Swords size={22} /><div><b>Dirige la partida</b><small>No necesita personaje</small></div></div>
                ) : p.c?.charId ? (
                  <div className="lby-char" style={{ "--cc": cc || "var(--lc)" }}>
                    <span className="lby-cav">{(p.c.charName || "?").charAt(0).toUpperCase()}</span>
                    <div><b>{p.c.charName}</b><small>{[p.c.cls, p.c.lvl ? "Nv " + p.c.lvl : ""].filter(Boolean).join(" · ")}</small></div>
                  </div>
                ) : (
                  <div className="lby-char is-empty">{p.st === "creating" ? <span className="lby-dots"><i /><i /><i /></span> : <Hourglass size={16} />}<div><b>{p.st === "creating" ? "Creando un personaje…" : "Sin personaje todavía"}</b><small>{st.hint}</small></div></div>
                )}
                <span className={"lby-pill is-" + st.tone}>{p.st === "ready" ? <Check size={12} /> : <i className="lby-dot" />}{st.label}</span>
              </div>

              {iAmHost && !me && p.st !== "invited" && (
                <button type="button" className={"lby-gm" + (isGm ? " is-on" : "")} onClick={() => lobbySetGm(camp.id, isGm ? meta.hostId : p.id)}>{isGm ? "Quitar como DJ" : "Hacer DJ"}</button>
              )}
              {iAmHost && me && role(uid) === "player" && (
                <button type="button" className="lby-gm" onClick={() => lobbySetGm(camp.id, uid)}>Dirigir yo</button>
              )}

              {me && (
                <div className="lby-me">
                  {myRole === "player" && (
                    <>
                      <div className="lby-mh">Tu personaje</div>
                      <div className="lby-chips">
                        {chars.map((c) => (
                          <button key={c.id} type="button" className={mine?.charId === c.id ? "is-on" : ""} style={{ "--cc": classColor(c.cls) }} onClick={() => pick(c)} disabled={mine?.state === "ready"}>
                            <b>{c.name}</b><small>{c.cls || "Sin clase"} · Nv {c.lvl}</small>
                            {c.custom > 0 && <Hammer size={11} aria-label="Contenido del Taller" />}
                          </button>
                        ))}
                        <button type="button" className="lby-new" onClick={create} disabled={mine?.state === "ready"}><Plus size={14} /> Crear nuevo</button>
                      </div>
                    </>
                  )}
                  {err && <small className="lby-err">{err}</small>}
                  <button type="button" className={"mh-btn lby-rd" + (mine?.state === "ready" ? " is-on" : "")} disabled={!canReady} onClick={toggleReady}>
                    {mine?.state === "ready" ? <><Check size={14} /> Listo · cambiar</> : myRole === "gm" ? "Estoy listo para dirigir" : "Estoy listo"}
                  </button>
                  {myRole === "player" && !canReady && <small className="lby-hint">Elige o crea un personaje para poder estar listo.</small>}
                </div>
              )}
            </div>
          );
        })}

        {iAmHost && (
          <button type="button" className="lby-inv" onClick={onInvite}>
            <UserPlus size={22} />
            <b>Invitar jugadores</b>
            <small>Les llegará un aviso y entrarán en la sala</small>
          </button>
        )}
      </div>

      <footer className="lby-f">
        {(iAmHost || iAmGm) ? (
          <>
            <span className="lby-why">{why || "¡Todo listo! Podéis empezar."}</span>
            <button type="button" className="mh-btn lby-go" disabled={!canStart} onClick={() => lobbyStart(camp.id)}>Comenzar campaña</button>
          </>
        ) : (
          <span className="lby-why">Cuando todos estén listos, el anfitrión o el DJ comenzará la campaña.</span>
        )}
      </footer>
    </div>
  );
}

const CSS = `
.lby { --lc: #E3B04B; display: flex; flex-direction: column; gap: 18px; padding: 4px 2px 24px; color: var(--mh-ink); animation: lby-in .35s ease both; }
@keyframes lby-in { from { opacity: 0; transform: translateY(8px); } }
.lby-load { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; padding: 80px 20px; color: var(--mh-muted); }
.lby-h { position: relative; display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-radius: 20px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--lc) 45%, var(--mh-line)); background: linear-gradient(120deg, color-mix(in srgb, var(--lc) 26%, var(--mh-panel)), var(--mh-panel) 70%); }
.lby-back { appearance: none; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--mh-line); background: color-mix(in srgb, var(--mh-ink) 8%, transparent); color: var(--mh-ink); display: grid; place-items: center; cursor: pointer; flex: none; }
.lby-t { flex: 1; min-width: 0; } .lby-t h2 { margin: 2px 0 0; font-size: 24px; } .lby-t p { margin: 4px 0 0; font-size: 13px; color: var(--mh-muted); max-width: 640px; }
.lby-k { display: inline-flex; align-items: center; gap: 6px; font: 700 10.5px var(--font-body), 'Inter', system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--lc); }
.lby-cnt { text-align: center; padding: 8px 16px; border-radius: 14px; background: color-mix(in srgb, var(--mh-ink) 6%, transparent); font-size: 12px; color: var(--mh-muted); } .lby-cnt b { font-size: 24px; color: var(--mh-ink); } .lby-cnt small { display: block; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; }
.lby-g { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.lby-s { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 18px; border: 1px solid var(--mh-line); background: var(--mh-panel); transition: border-color .3s, box-shadow .3s, transform .3s; animation: lby-pop .4s cubic-bezier(.2,.9,.3,1.1) both; }
@keyframes lby-pop { from { opacity: 0; transform: scale(.94) translateY(8px); } }
.lby-s.is-ok { border-color: #4CC36B; box-shadow: 0 0 0 1px #4CC36B55, 0 8px 28px -12px #4CC36B66; } .lby-s.is-mid { border-color: color-mix(in srgb, #E3B04B 70%, var(--mh-line)); } .lby-s.is-idle { opacity: .72; border-style: dashed; }
.lby-s.is-me { box-shadow: 0 0 0 2px color-mix(in srgb, var(--lc) 55%, transparent); } .lby-s.is-ok.is-me { box-shadow: 0 0 0 2px #4CC36B88; }
.lby-sh { display: flex; align-items: center; gap: 10px; } .lby-nm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.lby-nm b { font-size: 14px; display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .lby-nm em { font-style: normal; font-weight: 500; color: var(--mh-muted); font-size: 12px; } .lby-crown { color: #E3B04B; }
.lby-role { align-self: flex-start; font: 700 10px var(--font-body), 'Inter', system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; padding: 2px 8px; border-radius: 99px; background: color-mix(in srgb, var(--mh-ink) 8%, transparent); color: var(--mh-muted); } .lby-role.is-gm { background: #6A4DC2; color: #fff; }
.lby-x { appearance: none; width: 26px; height: 26px; border-radius: 50%; border: 0; background: none; color: var(--mh-muted); cursor: pointer; display: grid; place-items: center; } .lby-x:hover { background: color-mix(in srgb, #D9644E 18%, transparent); color: #E4806E; }
.lby-body { display: flex; flex-direction: column; gap: 10px; }
.lby-char { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 13px; background: color-mix(in srgb, var(--cc, var(--mh-ink)) 14%, transparent); border: 1px solid color-mix(in srgb, var(--cc, var(--mh-ink)) 40%, transparent); animation: lby-pop .35s both; }
.lby-char b { display: block; font-size: 14px; } .lby-char small { color: var(--mh-muted); font-size: 11.5px; }
.lby-char.is-empty { background: none; border-style: dashed; border-color: var(--mh-line); color: var(--mh-muted); } .lby-char.is-gm { background: color-mix(in srgb, #6A4DC2 16%, transparent); border-color: #6A4DC266; }
.lby-cav { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; font: 800 16px var(--font-body), 'Inter', system-ui, sans-serif; background: var(--cc); color: #14111f; }
.lby-pill { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; font: 700 11.5px var(--font-body), 'Inter', system-ui, sans-serif; padding: 5px 11px; border-radius: 99px; background: color-mix(in srgb, var(--mh-ink) 8%, transparent); color: var(--mh-muted); }
.lby-pill.is-ok { background: #4CC36B; color: #06210f; } .lby-pill.is-mid { background: color-mix(in srgb, #E3B04B 25%, transparent); color: #E3B04B; } .lby-pill.is-busy { background: color-mix(in srgb, var(--lc) 20%, transparent); color: var(--lc); }
.lby-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; } .lby-pill.is-busy .lby-dot { animation: lby-blink 1.1s ease-in-out infinite; } @keyframes lby-blink { 50% { opacity: .25; } }
.lby-dots { display: inline-flex; gap: 3px; } .lby-dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--lc); animation: lby-bounce 1s ease-in-out infinite; } .lby-dots i:nth-child(2) { animation-delay: .15s; } .lby-dots i:nth-child(3) { animation-delay: .3s; } @keyframes lby-bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
.lby-gm { appearance: none; align-self: flex-start; font: 600 11.5px var(--font-body), 'Inter', system-ui, sans-serif; color: #A58BE8; background: none; border: 1px solid #A58BE866; border-radius: 99px; padding: 4px 11px; cursor: pointer; } .lby-gm:hover, .lby-gm.is-on { background: #6A4DC2; color: #fff; border-color: transparent; }
.lby-me { display: flex; flex-direction: column; gap: 9px; padding-top: 10px; border-top: 1px solid var(--mh-line); }
.lby-mh { font: 700 10.5px var(--font-body), 'Inter', system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--mh-muted); }
.lby-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.lby-chips button { appearance: none; text-align: left; display: flex; flex-direction: column; gap: 1px; padding: 7px 11px; border-radius: 11px; border: 1px solid var(--mh-line); background: var(--mh-panel2); color: var(--mh-ink); cursor: pointer; font: inherit; position: relative; }
.lby-chips button b { font-size: 12.5px; } .lby-chips button small { font-size: 10.5px; color: var(--mh-muted); } .lby-chips button svg { position: absolute; top: 6px; right: 6px; color: #E3B04B; }
.lby-chips button.is-on { border-color: var(--cc); background: color-mix(in srgb, var(--cc) 20%, var(--mh-panel2)); box-shadow: 0 0 0 1px var(--cc); } .lby-chips button:disabled { opacity: .55; cursor: default; }
.lby-chips .lby-new { flex-direction: row; align-items: center; gap: 5px; border-style: dashed; color: var(--lc); font-weight: 600; font-size: 12.5px; }
.lby-rd.is-on { background: #4CC36B; color: #06210f; } .lby-hint, .lby-err { font-size: 11.5px; color: var(--mh-muted); } .lby-err { color: #E4806E; }
.lby-inv { appearance: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 160px; border-radius: 18px; border: 2px dashed color-mix(in srgb, var(--lc) 60%, var(--mh-line)); background: color-mix(in srgb, var(--lc) 6%, transparent); color: var(--lc); cursor: pointer; font: inherit; transition: background .2s, transform .2s; } .lby-inv:hover { background: color-mix(in srgb, var(--lc) 14%, transparent); transform: translateY(-2px); } .lby-inv small { color: var(--mh-muted); font-size: 11.5px; }
.lby-f { position: sticky; bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-radius: 16px; background: color-mix(in srgb, var(--mh-nav) 92%, transparent); border: 1px solid var(--mh-line); backdrop-filter: blur(10px); box-shadow: 0 16px 36px -14px #000a; }
.lby-why { font-size: 13px; color: var(--mh-ink2); } .lby-go { padding: 11px 22px; font-weight: 700; }
@media (max-width: 819px) { .lby-h { flex-wrap: wrap; } .lby-t h2 { font-size: 20px; } .lby-f { bottom: 78px; } }
@media (prefers-reduced-motion: reduce) { .lby, .lby-s, .lby-char, .lby-dots i, .lby-dot { animation: none !important; } }
`;
