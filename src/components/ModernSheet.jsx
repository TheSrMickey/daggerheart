"use client";

import { useEffect, useRef, useState } from "react";

// Hoja de personaje "moderna": vive en la columna central. Recibe los datos ya calculados y las acciones de la app.
const signed = (n) => (n > 0 ? "+" + n : String(n));
// Cambio neto del rasgo por forma, evolución y equipo.
const net = (t) => (t.form || 0) + (t.equip || 0);

// La hoja clásica está pensada para unos 1100 px de ancho mínimo. Se escala (CSS zoom, que no crea un contenedor para los
// elementos fijos: así los efectos y las ventanas siguen cubriendo toda la pantalla) para que «Detalles generales» quepa
// entera en alto y su ancho se estira hasta llenar la columna central; el resto de pestañas usan las mismas medidas.
const BASE_W = 1100;
// Según el navegador, offsetHeight devuelve el alto con o sin zoom: se detecta una vez.
let zoomedApi = null;
const readsZoomed = () => {
  if (zoomedApi === null) {
    const d = document.createElement("div");
    d.style.cssText = "position:absolute;visibility:hidden;height:100px;zoom:.5";
    document.body.appendChild(d);
    zoomedApi = d.offsetHeight < 75;
    d.remove();
  }
  return zoomedApi;
};
function ZoomFit({ children, isGeneral, natural, onNatural, fill }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [fit, setFit] = useState({ s: 1, h: undefined, w: BASE_W });
  const cur = useRef(1);
  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const calc = () => {
      const ow = o.clientWidth;
      const availH = window.innerHeight - o.getBoundingClientRect().top - 24;
      // Pestaña de campaña: sin escala, la escena o el mapa llenan el hueco disponible.
      if (fill) {
        cur.current = 1;
        setFit({ s: 1, h: Math.max(320, availH), w: ow });
        return;
      }
      const nat = readsZoomed() ? i.offsetHeight / cur.current : i.offsetHeight; // alto sin zoom
      if (isGeneral && nat && Math.abs(nat - natural) > 1) onNatural(nat);
      const ref = isGeneral ? nat || natural : natural;
      const sc = Math.max(0.5, Math.min(1.1, ow / BASE_W, ref ? availH / ref : 9));
      cur.current = sc;
      setFit({ s: sc, h: nat * sc, w: ow / sc });
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(o);
    ro.observe(i);
    window.addEventListener("resize", calc);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calc);
    };
  }, [isGeneral, natural, onNatural, fill]);
  return (
    <div ref={outer} className={"mhm-zoom" + (fill ? " is-fill" : "")} style={{ height: fit.h }}>
      <div ref={inner} style={fill ? { width: fit.w, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", "--mhz": 1 } : { width: fit.w, zoom: fit.s, "--mhz": fit.s }}>{children}</div>
    </div>
  );
}

export function ModernSheet({ d, actions, content, tab, onTab, fill }) {
  const navRef = useRef(null);
  const [compact, setCompact] = useState(false);
  const fullW = useRef(0);
  // Si las pestañas no caben con texto, las de la izquierda que no están activas pasan a solo icono (las de la derecha conservan su nombre).
  useEffect(() => {
    const n = navRef.current;
    if (!n) return;
    const check = () => {
      if (!compact && n.scrollWidth > n.clientWidth + 1) {
        fullW.current = n.scrollWidth;
        setCompact(true);
      } else if (compact && n.clientWidth >= fullW.current) setCompact(false);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(n);
    return () => ro.disconnect();
  }, [compact, d.tabs]);
  // Al pasar a la campaña la cabecera se pliega: se recalcula el alto disponible cuando acaba la transición.
  useEffect(() => {
    const t = [60, 200, 420].map((ms) => setTimeout(() => window.dispatchEvent(new Event("resize")), ms));
    return () => t.forEach(clearTimeout);
  }, [fill]);
  const Emblem = d.Emblem;
  // Ficha del nivel: se abre al pulsar el escudo y deja subir de nivel sin pedir permiso.
  const [lvOpen, setLvOpen] = useState(false);
  useEffect(() => {
    if (!lvOpen) return;
    const close = (e) => {
      if (e.type === "keydown" ? e.key === "Escape" : !e.target.closest(".mhm-lvpop, .mhm-level")) setLvOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [lvOpen]);
  const li = d.levelInfo;
  // En móvil no se escala: el contenido usa las mismas columnas apiladas que la hoja clásica.
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 819px)");
    const upd = () => setMobile(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);
  const [natural, setNatural] = useState(0); // alto de «Detalles generales»: referencia para todas las pestañas
  return (
    <div className="mhm" style={{ "--cc": d.color, ...(d.color2 ? { "--cc2": d.color2 } : {}) }}>
      {lvOpen && li && (
        <div className="mhm-lvpop" role="dialog" aria-label="Tu nivel">
          <h5>Nivel {d.level} · Rango {li.rank}<span>de 10</span></h5>
          <div className="k"><span>Competencia</span><b>{li.prof}</b></div>
          <div className="k"><span>Umbrales</span><b>{d.major} / {d.severe}</b></div>
          <div className="k"><span>Cartas de dominio</span><b>{li.cards}</b></div>
          {li.multi && <div className="k"><span>Multiclase</span><b>{li.multi}</b></div>}
          <div className="k"><span>Rasgos marcados</span><b>{li.marks.length ? li.marks.join(", ") : "Ninguno"}</b></div>
          {li.maxed ? <div className="max">Has llegado al nivel máximo.</div> : <button type="button" onClick={() => (setLvOpen(false), actions.levelUp())}>Subir al nivel {d.level + 1}</button>}
        </div>
      )}
      <div className={"mhm-headwrap" + (fill ? " is-collapsed" : "")}>
      <section className={"mhm-head" + (d.color2 ? " is-multi" : "")}>
        {d.art ? (
          <span className="mhm-head-art" aria-hidden="true" style={{ backgroundImage: `url(${d.art})`, backgroundPosition: "center " + (d.artY ?? 28) + "%" }} />
        ) : (
          <span className="mhm-head-emb" aria-hidden="true"><Emblem size={190} strokeWidth={1} /></span>
        )}
        <div className="mhm-head-top">
          <button type="button" className={"mhm-level" + (lvOpen ? " is-open" : "")} title={"Nivel " + d.level} aria-label={"Nivel " + d.level + ": ver o subir de nivel"} aria-expanded={lvOpen} onClick={() => setLvOpen((v) => !v)}>
            <svg viewBox="0 0 52 58" width="46" height="52" aria-hidden="true">
              <path d="M4 4 H48 V31 C48 43 38 51 26 55 C14 51 4 43 4 31 Z" />
              <text x="26" y="17" className="l">NIVEL</text>
              <text x="26" y="40" className="n">{d.level}</text>
            </svg>
            {!li?.maxed && <span className="mhm-level-plus" aria-hidden="true">+</span>}
          </button>
          <div>
            <h2 className="mh-serif">{d.name || "Sin nombre"}</h2>
            <p data-tour="cls">
              {[d.cls, d.subclass].filter(Boolean).join(" · ") || "Sin clase asignada"}
              {d.pronouns && <span data-tour="pron"> · {d.pronouns}</span>}
            </p>
          </div>
          {d.tags && <div className="mhm-tags">{d.tags}</div>}
        </div>
        <div className="mhm-traits">
          {d.traits.map((t) => (
            <button
              key={t.key}
              type="button"
              className={(t.spell ? "is-spell " : "") + (net(t) > 0 ? "is-up" : net(t) < 0 ? "is-down" : "")}
              onClick={() => actions.rollTrait(t.label, t.value, t)}
              title={
                (t.form > 0 ? t.label + " +" + t.form + " por " + t.formKey + ". " : "") +
                (t.equip !== 0 ? t.label + " " + signed(t.equip) + " por equipo. " : "") +
                (t.adv ? "Ventaja en tiradas de " + t.label + " (Encarnación Elemental — Aire): +1d6. " : "") +
                (t.dis ? "Desventaja en tus tiradas de acción (Retraído): −1d6. " : "") +
                (t.spell ? t.label + " — rasgo de conjuro. " : "") +
                "Tirar " + t.label
              }
            >
              <span>{t.label}</span>
              <span className="mhm-tright">
                {net(t) !== 0 && (
                  <em className="mhm-tmod" aria-label={net(t) > 0 ? "aumento" : "bajada"}>
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">{net(t) > 0 ? <path d="M12 4l8 11H4z" /> : <path d="M12 20L4 9h16z" />}</svg>
                    {Math.abs(net(t))}
                  </em>
                )}
                <b>{signed(t.value)}</b>
              </span>
              {t.adv && <i className="mhm-tadv">+d6</i>}
              {t.dis && <i className="mhm-tadv is-dis">−d6</i>}
            </button>
          ))}
        </div>
      </section>
      </div>

      <nav ref={navRef} className={"mhm-tabs" + (compact ? " is-compact" : "")} role="tablist">
        {d.tabs.filter((t) => !t.extra).map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={"is-base" + (tab === t.key ? " is-on" : "")} title={t.label} onClick={() => onTab(t.key)}>
            <t.Icon size={15} strokeWidth={1.8} /> <span className="lbl">{t.label}</span>
          </button>
        ))}
        <span className="mhm-spacer" />
        {d.tabs.filter((t) => t.extra).map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "is-on" : ""} style={{ "--tone": t.tone }} onClick={() => onTab(t.key)}>
            <t.Icon size={15} strokeWidth={1.8} /> <span className="lbl-full">{t.label}</span>
          </button>
        ))}
      </nav>

      {mobile ? (
        <div className="mhm-plain" style={{ "--mhz": 1 }}>{content}</div>
      ) : (
        <ZoomFit isGeneral={tab === "general"} natural={natural} onNatural={setNatural} fill={fill}>{content}</ZoomFit>
      )}
    </div>
  );
}
