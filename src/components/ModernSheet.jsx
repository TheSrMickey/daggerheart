"use client";

import { useEffect, useRef, useState } from "react";

// Hoja de personaje "moderna": vive en la columna central. Recibe los datos ya calculados y las acciones de la app.
const signed = (n) => (n > 0 ? "+" + n : String(n));

// La hoja clásica está pensada para unos 1100 px de ancho: se escala (ancho y alto) para que quepa entera en la columna central.
const BASE_W = 1100;
function ZoomFit({ children, fitHeight }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [fit, setFit] = useState({ s: 1, h: undefined, x: 0 });
  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const calc = () => {
      const natural = i.offsetHeight || 1;
      const availH = window.innerHeight - o.getBoundingClientRect().top - 24;
      const s = Math.min(1.1, o.clientWidth / BASE_W, fitHeight ? availH / natural : 9);
      const sc = Math.max(0.5, s);
      setFit({ s: sc, h: natural * sc, x: Math.max(0, (o.clientWidth - BASE_W * sc) / 2) });
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
  }, [fitHeight]);
  return (
    <div ref={outer} className="mhm-zoom" style={{ height: fit.h }}>
      <div ref={inner} style={{ width: BASE_W, transform: `scale(${fit.s})`, transformOrigin: "top left", marginLeft: fit.x }}>{children}</div>
    </div>
  );
}

export function ModernSheet({ d, actions, content, tab, onTab }) {
  const Emblem = d.Emblem;
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
        {d.tabs.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "is-on" : ""} onClick={() => onTab(k)}>{l}</button>
        ))}
      </nav>

      <div key={tab} className="mh-view-in">
        <ZoomFit fitHeight={tab === "general"}>{content}</ZoomFit>
      </div>
    </div>
  );
}
