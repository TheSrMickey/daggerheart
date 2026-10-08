"use client";

import { useEffect, useRef, useState } from "react";

// Hoja de personaje "moderna": vive en la columna central. Recibe los datos ya calculados y las acciones de la app.
const signed = (n) => (n > 0 ? "+" + n : String(n));

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
  const [natural, setNatural] = useState(0); // alto de «Detalles generales»: referencia para todas las pestañas
  return (
    <div className="mhm" style={{ "--cc": d.color }}>
      <div className={"mhm-headwrap" + (fill ? " is-collapsed" : "")}>
      <section className="mhm-head">
        {d.art ? (
          <span className="mhm-head-art" aria-hidden="true" style={{ backgroundImage: `url(${d.art})` }} />
        ) : (
          <span className="mhm-head-emb" aria-hidden="true"><Emblem size={190} strokeWidth={1} /></span>
        )}
        <div className="mhm-head-top">
          <div className="mhm-level"><small>NIVEL</small><b>{d.level}</b></div>
          <div>
            <h2 className="mh-serif">{d.name || "Sin nombre"}</h2>
            <p data-tour="cls">
              {[d.cls, d.subclass].filter(Boolean).join(" · ") || "Sin clase asignada"}
              {d.pronouns && <span data-tour="pron"> · {d.pronouns}</span>}
            </p>
          </div>
          <button type="button" className="mhm-tour-btn" onClick={actions.tour} title="Ver el tutorial de la hoja">? Tutorial</button>
        </div>
        <div className="mhm-traits">
          {d.traits.map((t) => (
            <button key={t.key} type="button" onClick={() => actions.rollTrait(t.label, t.value)} title={"Tirar " + t.label}>
              <span>{t.label}</span>
              <b>{signed(t.value)}</b>
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

      <ZoomFit isGeneral={tab === "general"} natural={natural} onNatural={setNatural} fill={fill}>{content}</ZoomFit>
    </div>
  );
}
