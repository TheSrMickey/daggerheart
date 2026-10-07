"use client";

import { useEffect, useRef, useState } from "react";

// Hoja de personaje "moderna": vive en la columna central. Recibe los datos ya calculados y las acciones de la app.
const signed = (n) => (n > 0 ? "+" + n : String(n));

// La hoja clásica está pensada para unos 1100 px de ancho mínimo. Se escala para que «Detalles generales» quepa entera
// (alto) y su ancho se estira hasta llenar la columna central; el resto de pestañas usan exactamente las mismas medidas.
const BASE_W = 1100;
function ZoomFit({ children, isGeneral, natural, onNatural }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [fit, setFit] = useState({ s: 1, h: undefined, w: BASE_W });
  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const calc = () => {
      const ow = o.clientWidth;
      const availH = window.innerHeight - o.getBoundingClientRect().top - 24;
      // El alto de referencia es el de Detalles generales (se guarda al verlo la primera vez).
      if (isGeneral && i.offsetHeight && i.offsetHeight !== natural) onNatural(i.offsetHeight);
      const ref = isGeneral ? i.offsetHeight || natural : natural;
      const sc = Math.max(0.5, Math.min(1.1, ow / BASE_W, ref ? availH / ref : 9));
      setFit({ s: sc, h: i.offsetHeight * sc, w: ow / sc });
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
  }, [isGeneral, natural, onNatural]);
  return (
    <div ref={outer} className="mhm-zoom" style={{ height: fit.h }}>
      <div ref={inner} style={{ width: fit.w, transform: `scale(${fit.s})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}

export function ModernSheet({ d, actions, content, tab, onTab }) {
  const Emblem = d.Emblem;
  const [natural, setNatural] = useState(0); // alto de «Detalles generales»: referencia para todas las pestañas
  return (
    <div className="mhm" style={{ "--cc": d.color }}>
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
            <p>{[d.cls, d.subclass].filter(Boolean).join(" · ") || "Sin clase asignada"}</p>
          </div>
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

      <nav className="mhm-tabs" role="tablist">
        {d.tabs.filter((t) => !t.extra).map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "is-on" : ""} onClick={() => onTab(t.key)}>
            <t.Icon size={15} strokeWidth={1.8} /> {t.label}
          </button>
        ))}
        <span className="mhm-spacer" />
        {d.tabs.filter((t) => t.extra).map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "is-on" : ""} style={{ "--tone": t.tone }} onClick={() => onTab(t.key)}>
            <t.Icon size={15} strokeWidth={1.8} /> {t.label}
          </button>
        ))}
      </nav>

      <ZoomFit isGeneral={tab === "general"} natural={natural} onNatural={setNatural}>{content}</ZoomFit>
    </div>
  );
}
