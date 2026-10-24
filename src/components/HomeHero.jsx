"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight, CalendarDays, Layers, Sword, Wand2, Shield, Flame } from "lucide-react";
import { CHANGELOG } from "@/lib/changelog";
import { CardFace } from "./Cards";
import { useNextSession, fmtDate, fmtTime, countdown } from "./Calendar";

// Carrusel de anuncios de Inicio: la expansión es fija; el resto aparece solo si aplica a la cuenta.
// Cada diapositiva dura SLIDE_MS; el punto activo se rellena como cuenta atrás y, al terminar, pasa a la siguiente (se pausa al pasar el ratón).
const SLIDE_MS = 9000;
const VER_KEY = "mh-hero-ver";
// Aviso de Darrington Press (teaser del 29 de octubre de 2026): se retira solo pasada esa fecha.
const DP_UNTIL = new Date("2026-10-30T00:00:00").getTime();
const DP_DATE = new Date("2026-10-29T00:00:00").getTime();
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const short = (t, n) => { const s = (t || "").replace(/\s+/g, " ").trim(); const cut = s.search(/[.;:] /); const e = cut > 40 ? s.slice(0, cut + 1) : s; return e.length > n ? e.slice(0, n - 1).trimEnd() + "…" : e; };

// De una carta de dominio saca la frase que dice qué te da (daño, bonificadores, recuperación…) en vez de la primera, que suele ser el cómo se activa («Haz un ataque…»).
const EFFECT = /infliges|inflige|sufre|daño|obtienes|ganas|recuperas|liberas|libera|reduc|bonificador|\+\d|ventaja|duplica|elimina|permit|repetir|anula|teletransport|cura|protege|aument|evita|ignora|vuelves|puedes/i;
const SETUP = /^(haz una tirada|haz un ataque|elige|tira |toca |tras un descanso|una vez por descanso, gasta)/i;
export const benefit = (text, n = 170) => {
  const parts = (text || "").replace(/\\n/g, "\n").split(/\n|(?<=[.!?])\s+/).map((x) => x.replace(/^[•\s]+/, "").trim()).filter((x) => x.length > 12);
  if (!parts.length) return "";
  let best = parts[0], top = -9;
  parts.forEach((x, k) => { const sc = (EFFECT.test(x) ? 2 : 0) - (SETUP.test(x) ? 2 : 0) - k * 0.1; if (sc > top) { top = sc; best = x; } });
  return best.length > n ? best.slice(0, n - 1).trimEnd() + "…" : best;
};

// La carta del día con el mismo diseño que en la pestaña Cartas: se pinta a 300 × 420 y se reduce a la altura que deja la caja.
function NewsCard({ card, icons, FitTitle, FitBox, out, onW }) {
  const ref = useRef(null);
  const [k, setK] = useState(0.7);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => { setK(el.clientHeight / 420); onW && onW(el.offsetWidth); };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={"mh-news-card" + (out ? " is-out" : "")} aria-hidden="true" style={{ "--gc": card.color || "#C9A24A" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 300, height: 420, zoom: k }}>
        <CardFace c={card} I={icons[card.domain] || Layers} FitTitle={FitTitle} FitBox={FitBox} />
      </div>
    </div>
  );
}

// Montón de cartas del juego, como si hubieran caído: posiciones y giros fijos para cada día y cada «Otra carta».
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const COLS = 9;
const ROWS = 3;
const PILE = COLS * ROWS;
function CardPile({ cards, skip, seed, icons, FitTitle, FitBox }) {
  const list = useMemo(() => {
    const r = rng(seed);
    const pool = cards.filter((c) => c.id !== skip && c.kind === "dominio" && c.image); // solo cartas de dominio (nada de armas, ascendencias, etc.)
    const out = [];
    const used = new Set();
    // Una carta por casilla de una rejilla con holgura aleatoria: cubre toda la caja sin huecos y cada una mira hacia un lado distinto.
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        let c = null;
        while (!c && used.size < pool.length) {
          const p = pool[Math.floor(r() * pool.length)];
          if (!used.has(p.id)) c = p;
        }
        if (!c) break;
        used.add(c.id);
        const x = ((col + 0.5) / COLS) * 100 + (r() - 0.5) * 7;
        const y = [10, 50, 90][row] + (r() - 0.5) * 20;
        out.push({ c, x, y, rot: r() * 360, s: 0.46 + r() * 0.1, dim: x < 38 ? 0.34 : x < 55 ? 0.46 : 0.62 });
      }
    }
    return out;
  }, [cards, skip, seed]);
  return (
    <div className="mh-news-pile" aria-hidden="true">
      {list.map(({ c, x, y, rot, s, dim }) => (
        <div key={c.id} className="mh-news-pc" style={{ left: x + "%", top: y + "%", width: 300 * s, height: 420 * s, marginLeft: -150 * s, marginTop: -210 * s, transform: "rotate(" + rot + "deg)", filter: "brightness(" + dim + ") saturate(.85)" }}>
          <div style={{ width: 300, height: 420, transform: "scale(" + s + ")", transformOrigin: "0 0" }}>
            <CardFace c={c} I={c.Icon || icons[c.domain] || Layers} FitTitle={FitTitle} FitBox={FitBox} />
          </div>
        </div>
      ))}
    </div>
  );
}

// La carta del día cambia a las 00:00 de España (Europa/Madrid), sea cual sea la zona horaria de quien la mira.
const spainParts = (ms = Date.now()) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { key: p.year + "-" + p.month + "-" + p.day, secs: +p.hour * 3600 + +p.minute * 60 + +p.second };
};
const msToSpainMidnight = () => (86400 - spainParts().secs) * 1000 + 250;
const hashStr = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
// Mezcla completa y repetible de las cartas para un día: no sigue el orden del catálogo (niveles, dominios).
const shuffled = (list, seedText) => {
  const r = rng(hashStr(seedText));
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export function HomeHero({ camps, characters, featId, cards, color, icons, FitTitle, FitBox, onView, onChar, onCamp }) {
  const [seenVer, setSeenVer] = useState("");
  const [idx, setIdx] = useState(0);
  const [cw, setCw] = useState(0); // ancho real de la carta del día, para que el texto no llegue a tocarla
  const [pick, setPick] = useState(0);
  const [gone, setGone] = useState(null); // carta que sale mientras entra la nueva
  const sess = useNextSession(camps);
  const touch = useRef(null);
  useEffect(() => { setSeenVer(lsGet(VER_KEY) || "-"); }, []);

  const latest = CHANGELOG[0];
  const fch = featId ? characters[featId] : null;
  const pool = useMemo(() => cards.filter((c) => c.kind === "dominio" && c.image), [cards]);
  const [dayKey, setDayKey] = useState(() => spainParts().key);
  useEffect(() => {
    // al llegar las 00:00 de España (o al volver a la pestaña después) se renueva el día
    let t;
    const arm = () => { t = setTimeout(() => { setDayKey(spainParts().key); setPick(0); arm(); }, msToSpainMidnight()); };
    arm();
    const vis = () => { const k = spainParts().key; setDayKey((cur) => (cur === k ? cur : (setPick(0), k))); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", vis); };
  }, []);
  const order = useMemo(() => shuffled(pool, "carta-del-dia:" + dayKey), [pool, dayKey]);
  const card = order.length ? order[pick % order.length] : null;

  const dayCard = order.length ? order[0] : null; // el montón del fondo se calcula con la carta del día, así no cambia con «Otra carta»
  const another = () => { setGone(card); setPick((x) => x + 1); };
  useEffect(() => { if (!gone) return undefined; const t = setTimeout(() => setGone(null), 500); return () => clearTimeout(t); }, [gone]);

  const slides = Date.now() < DP_UNTIL ? [{ id: "dp" }, { id: "exp" }] : [{ id: "exp" }]; // el avance de Darrington Press va primero mientras dure
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
  } else if (cur === "dp") {
    const left = Math.max(0, Math.ceil((DP_DATE - Date.now()) / 864e5));
    body = (
      <>
        <div className="mh-news-art" aria-hidden="true"><i style={{ backgroundImage: "url(/noticias/darrington-teaser.jpg)", backgroundPosition: "center 80%" }} /></div>
        <span className="mh-news-tag"><Sparkles size={12} /> Darrington Press · {left > 0 ? "29 oct · en " + left + (left === 1 ? " día" : " días") : "hoy"}</span>
        <h2 className="mh-serif">Algo se acerca 👀</h2>
        <p>Descubre qué llega el 29 de octubre.</p>
        <small className="mh-news-credit" style={{ position: "absolute", bottom: 14 }}>Ilustración de fondo: Mat Wilma · © 2026 Darrington Press, LLC</small>
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
        <div className="mh-news-sil" aria-hidden="true">
          <Sword className="s1" strokeWidth={1.2} />
          <Wand2 className="s2" strokeWidth={1.2} />
          <Shield className="s3" strokeWidth={1.2} />
          <Flame className="s4" strokeWidth={1.2} />
        </div>
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
    // El montón del fondo y los resplandores son fijos: al cambiar de carta solo se renueva la de delante y su texto.
    body = (
      <>
        <CardPile cards={cards} skip={dayCard.id} seed={hashStr("monton:" + dayKey)} icons={icons} FitTitle={FitTitle} FitBox={FitBox} />
        <span className="mh-news-glow" style={{ "--gc": dayCard.color || "#C9A24A" }} aria-hidden="true" />
        <span className="mh-news-glow is-bl" style={{ "--gc": dayCard.color || "#C9A24A" }} aria-hidden="true" />
        {gone && <NewsCard key={"o" + gone.id} card={gone} icons={icons} FitTitle={FitTitle} FitBox={FitBox} out />}
        <NewsCard key={card.id} card={card} icons={icons} FitTitle={FitTitle} FitBox={FitBox} onW={setCw} />
        <span className="mh-news-tag" key={"t" + card.id}><Layers size={12} /> Carta del día · {card.domain}</span>
        <h2 className="mh-serif" key={"h" + card.id}>{card.key}</h2>
        <p key={"p" + card.id}>{benefit(card.text)}</p>
        <div className="mh-home-cta">
          <button type="button" className="mh-home-btn" onClick={() => onView("cartas")}>Ver las cartas</button>
          <button type="button" className="mh-home-btn is-ghost" onClick={another}>Otra carta</button>
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
      style={cw ? { "--cw": cw + "px" } : undefined}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? e.changedTouches[0].clientX); touch.current = null; if (n > 1 && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}
    >
      <div className="mh-news-slide" key={cur} aria-live="off">{body}</div>
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
