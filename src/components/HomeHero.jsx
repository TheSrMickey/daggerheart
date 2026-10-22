"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight, CalendarDays, Layers } from "lucide-react";
import { CHANGELOG } from "@/lib/changelog";
import { useNextSession, fmtDate, fmtTime, countdown } from "./Calendar";

// Carrusel de anuncios de Inicio: la expansión es fija; el resto aparece solo si aplica a la cuenta.
// Cada diapositiva dura SLIDE_MS; el punto activo se rellena como cuenta atrás y, al terminar, pasa a la siguiente (se pausa al pasar el ratón).
const SLIDE_MS = 9000;
const VER_KEY = "mh-hero-ver";
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const short = (t, n) => { const s = (t || "").replace(/\s+/g, " ").trim(); const cut = s.search(/[.;:] /); const e = cut > 40 ? s.slice(0, cut + 1) : s; return e.length > n ? e.slice(0, n - 1).trimEnd() + "…" : e; };

export function HomeHero({ camps, characters, featId, cards, color, onView, onChar, onCamp }) {
  const [seenVer, setSeenVer] = useState("");
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState(0);
  const sess = useNextSession(camps);
  const touch = useRef(null);
  useEffect(() => { setSeenVer(lsGet(VER_KEY) || "-"); }, []);

  const latest = CHANGELOG[0];
  const fch = featId ? characters[featId] : null;
  const pool = useMemo(() => cards.filter((c) => c.kind === "dominio" && c.image), [cards]);
  const day = Math.floor(Date.now() / 864e5);
  const card = pool.length ? pool[(day + pick * 7) % pool.length] : null;

  const slides = [{ id: "exp" }];
  if (seenVer && seenVer !== latest.version) slides.push({ id: "ver" });
  if (sess) slides.push({ id: "ses" });
  if (camps.length === 0) slides.push({ id: "mesa" });
  if (card) slides.push({ id: "card" });
  const n = slides.length;
  const i = Math.min(idx, n - 1);
  const cur = slides[i].id;
  const go = (d) => setIdx((x) => (Math.min(x, n - 1) + d + n) % n);

  const sesChars = sess ? (sess.cp.characterIds || []).filter((id) => characters[id]) : [];
  const mine = sesChars.find((id) => id === featId) || sesChars[0];
  const seeNews = () => { lsSet(VER_KEY, latest.version); setSeenVer(latest.version); setIdx(0); onView("actualizaciones"); };

  let body = null;
  if (cur === "exp") {
    body = (
      <>
        <div className="mh-news-art" aria-hidden="true">
          {["bruja", "brujo", "camorrista", "asesino"].map((k) => <i key={k} style={{ backgroundImage: "url(/clases/" + k + ".webp)" }} />)}
        </div>
        <span className="mh-news-tag"><Sparkles size={12} /> Nueva expansión disponible</span>
        <h2 className="mh-serif">Hope &amp; Fear ya está aquí</h2>
        <p>Cuatro clases nuevas para tu mesa: <b>Bruja</b>, <b>Brujo</b>, <b>Camorrista</b> y <b>Asesino</b>, con sus subclases y cartas de dominio. Crea un personaje con ellas y estrena la expansión en tu próxima sesión.</p>
        <div className="mh-home-cta">
          <button type="button" className="mh-home-btn" onClick={() => onView("ficha")}>Crear un personaje</button>
          {fch && <button type="button" className="mh-home-btn is-ghost" onClick={() => onChar(featId)}>Abrir {fch.f_name || "mi ficha"}</button>}
        </div>
      </>
    );
  } else if (cur === "ver") {
    const first = latest.items.find((x) => x.tag === "nuevo") || latest.items[0];
    body = (
      <>
        <div className="mh-news-orb" aria-hidden="true"><span>v{latest.version}</span></div>
        <span className="mh-news-tag"><Sparkles size={12} /> Novedad · v{latest.version}</span>
        <h2 className="mh-serif">{latest.title}</h2>
        <p>{latest.blurb || short(first?.text, 170)}</p>
        <div className="mh-home-cta"><button type="button" className="mh-home-btn" onClick={seeNews}>Ver novedades</button></div>
      </>
    );
  } else if (cur === "ses") {
    const d = sess.next.ts;
    body = (
      <>
        <div className="mh-news-orb is-avs" aria-hidden="true">
          {sesChars.slice(0, 4).map((id) => <span key={id} style={{ background: color(characters[id]) }}>{(characters[id].f_name || "?").charAt(0).toUpperCase()}</span>)}
        </div>
        <span className="mh-news-tag"><CalendarDays size={12} /> {fmtDate(d)} · {fmtTime(d)} · en {countdown(d, sess.now)}</span>
        <h2 className="mh-serif">{sess.cp.name || "Campaña"}</h2>
        <p>{mine ? <>Tu personaje: <b>{characters[mine].f_name || "sin nombre"}</b>{characters[mine].f_class ? ", " + characters[mine].f_class : ""}. </> : null}{sess.next.place ? "Lugar: " + sess.next.place + "." : "Confirma tu asistencia desde el calendario de la campaña."}</p>
        <div className="mh-home-cta">
          <button type="button" className="mh-home-btn" onClick={() => onCamp(sess.cp)}>Abrir campaña</button>
          {mine && <button type="button" className="mh-home-btn is-ghost" onClick={() => onChar(mine)}>Abrir {characters[mine].f_name || "mi ficha"}</button>}
        </div>
      </>
    );
  } else if (cur === "mesa") {
    body = (
      <>
        <span className="mh-news-tag">Aún sin mesa</span>
        <h2 className="mh-serif">Únete a una mesa o crea la tuya</h2>
        <p>Busca grupos que necesitan jugador o DJ, o monta tu propia campaña e <b>invita a tus amigos</b> con un enlace.</p>
        <div className="mh-home-cta">
          <button type="button" className="mh-home-btn" onClick={() => onView("mesas")}>Buscar mesa</button>
          <button type="button" className="mh-home-btn is-ghost" onClick={() => onView("campaigns")}>Crear campaña</button>
        </div>
      </>
    );
  } else if (cur === "card") {
    body = (
      <>
        <div className="mh-news-card" aria-hidden="true"><img src={card.image} alt="" loading="lazy" /></div>
        <span className="mh-news-tag"><Layers size={12} /> Carta del día · {card.domain}</span>
        <h2 className="mh-serif">{card.key}</h2>
        <p>{short(card.text, 150)}</p>
        <div className="mh-home-cta">
          <button type="button" className="mh-home-btn" onClick={() => onView("cartas")}>Ver las cartas</button>
          <button type="button" className="mh-home-btn is-ghost" onClick={() => setPick((x) => x + 1)}>Otra carta</button>
        </div>
      </>
    );
  }

  return (
    <div
      className={"mh-home-news is-" + cur}
      role="region"
      aria-roledescription="carrusel"
      aria-label="Anuncios"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? e.changedTouches[0].clientX); touch.current = null; if (n > 1 && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}
    >
      <div className="mh-news-slide" key={cur + (cur === "card" ? pick : "")} aria-live="off">{body}</div>
      {n > 1 && (
        <div className="mh-news-ctl">
          <button type="button" className="mh-news-ar" onClick={() => go(-1)} aria-label="Anuncio anterior"><ChevronLeft size={14} /></button>
          {slides.map((s, k) => (
            <button key={s.id} type="button" className={"mh-news-dot" + (k === i ? " is-on" : "")} aria-label={"Anuncio " + (k + 1) + " de " + n} aria-current={k === i} onClick={() => setIdx(k)}>
              {k === i && <span key={cur + pick} style={{ animationDuration: SLIDE_MS + "ms" }} onAnimationEnd={() => go(1)} />}
            </button>
          ))}
          <button type="button" className="mh-news-ar" onClick={() => go(1)} aria-label="Anuncio siguiente"><ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}
