"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Tutorial interactivo de la hoja moderna: un velo con un foco sobre cada sección. Un clic en pantalla avanza.
const panels = () => document.querySelectorAll(".mhm-zoom .mh-panel-box");
const P = (n) => () => panels()[n] || null;
const L = (...ix) => () => {
  const col = panels()[0]?.children[1];
  return ix.map((i) => col?.children[i]).filter(Boolean);
};
const Q = (sel) => () => document.querySelector(sel);

const B1 = "Información básica";
const B2 = "Rasgos y avisos";
const B3 = "Menú principal";
const B4 = "Pestañas de clase";

// when: (ctx) => boolean decide si el paso se muestra (según pronombres, pestañas disponibles…).
const STEPS = [
  { block: B1, tab: "general", title: "Nivel", text: "Tu nivel sube cuando el DJ lo indique y cada subida te da mejoras y nuevas cartas.", target: Q(".mhm-level"), pad: 8 },
  { block: B1, tab: "general", title: "Nombre", text: "El nombre de tu personaje. Puedes cambiarlo cuando quieras desde la hoja clásica.", target: Q(".mhm-head-top h2"), pad: 8 },
  { block: B1, tab: "general", title: "Clase y subclase", text: "La clase define tus dominios y habilidades; la subclase añade características propias y desbloquea pestañas extra.", target: Q("[data-tour=cls]"), pad: 8 },
  { block: B1, tab: "general", title: "Pronombres", text: "Cómo se refieren a tu personaje. Los verán tus compañeros en la campaña.", target: Q("[data-tour=pron]"), pad: 6, when: (c) => c.hasPronouns },
  {
    block: B1, tab: "general", title: "Etiquetas de estado", text: "Estados como Escondido, Inmovilizado o Vulnerable. Al activar uno, la hoja y toda la pantalla reflejan el efecto. Ejemplo:",
    target: L(6), pad: 8, demo: "Escondido",
  },
  { block: B2, tab: "general", title: "Rasgos", text: "Agilidad, Fuerza, Destreza, Instinto, Presencia y Conocimiento. Pulsa uno para tirar los dados de dualidad (Esperanza y Miedo) más su modificador.", target: Q(".mhm-traits"), pad: 8 },
  { block: B2, tab: "general", title: "Evasión y armadura", text: "La Evasión es la dificultad para golpearte. Cada casilla de armadura que marcas reduce un nivel de gravedad del daño.", target: L(0), pad: 8 },
  { block: B2, tab: "general", title: "Avisos de modificaciones", text: "Cuando una carta, una forma o una habilidad cambia un valor, aparecen etiquetas junto al número (por ejemplo «+2 este ataque»). Púlsalas para quitar las temporales.", target: L(0), pad: 8 },
  { block: B2, tab: "general", title: "Umbrales de daño", text: "Menor, Mayor y Grave. Si el daño alcanza un umbral pierdes 1, 2 o 3 puntos de vida. Pulsa un umbral para aplicar ese daño.", target: L(1, 2), pad: 8 },
  { block: B2, tab: "general", title: "Puntos de vida", text: "Marca una casilla por cada herida. Con todas marcadas tu personaje está al borde de la muerte.", target: L(3), pad: 8 },
  { block: B2, tab: "general", title: "Estrés", text: "Lo gastas para usar habilidades y forzarte. Si se llena, quedas Vulnerable.", target: L(4), pad: 8 },
  { block: B2, tab: "general", title: "Esperanza", text: "Se gana con las tiradas de Esperanza y se gasta en habilidades y en usar tus Experiencias.", target: L(5), pad: 8 },
  { block: B2, tab: "general", title: "Armas y armadura", text: "Tu arma principal, la secundaria y tu armadura. «Atacar» tira con el rasgo del arma y «Daño» lanza sus dados. La Competencia indica cuántos dados de daño tiras.", target: P(1), pad: 6 },
  { block: B2, tab: "general", title: "Experiencias", text: "Frases que describen tu pasado. Gasta 1 de Esperanza para sumar su bono a una tirada en la que te ayuden. Se desbloquean más al subir de rango.", target: P(2), pad: 6 },

  { block: B3, tab: "general", title: "Menú principal", text: "Desde aquí cambias de pestaña: de Detalles generales a Diario. A la derecha están las pestañas que dependen de tu clase y de tu campaña.", target: Q(".mhm-tabs"), pad: 6 },
  { block: B3, tab: "actions", title: "Acciones", text: "Las características de tu clase, subclase, ascendencia y comunidad. Cada una indica su coste (Estrés, Esperanza…) y se activa con un toque.", target: P(1), pad: 6 },
  { block: B3, tab: "actions", title: "Cartas de dominio", text: "Tu equipo de hechizos y habilidades. Pulsa una carta para verla ampliada y usarla; las que no caben van a la bóveda.", target: P(2), pad: 6 },
  { block: B3, tab: "rests", title: "Descansos", text: "Elige dos acciones por descanso. El corto es rápido; el largo cura más y permite avanzar proyectos. Cada descanso da Miedo al DJ.", target: P(1), pad: 6 },
  { block: B3, tab: "rests", title: "Proyectos", text: "Tareas largas que haces en descansos largos: forjar, investigar, reparar…", target: P(2), pad: 6 },
  { block: B3, tab: "inventory", title: "Objetos", text: "Cinco huecos de cinturón a mano y una mochila opcional. Arrastra objetos entre ellos o pulsa un hueco para añadir uno.", target: P(1), pad: 6 },
  { block: B3, tab: "inventory", title: "Oro", text: "Monedas, puñados, bolsas y cofres. Cada unidad vale diez veces la anterior.", target: P(2), pad: 6 },
  { block: B3, tab: "background", title: "Trasfondo", text: "Preguntas de tu clase para dar forma a la historia de tu personaje. Respóndelas a tu ritmo.", target: P(1), pad: 6 },
  { block: B3, tab: "background", title: "Conexiones", text: "Las personas de tu vida y qué son para ti (familiar, compañero, amigo, amante). Puedes ocultar los roles de cada una y ver la red de relaciones.", target: P(2), pad: 6 },
  { block: B3, tab: "journal", title: "Diario", text: "Un cuaderno de sesiones: apunta lo que pasa en la partida con negrita, listas y casillas. Se guarda solo.", target: P(1), pad: 6 },

  { block: B4, tab: "beastforms", title: "Formas de Bestia", text: "Como Druida puedes transformarte gastando 1 de Estrés. Elige una carta, ábrela y pulsa «Transformarse». Los rangos altos se desbloquean con el nivel.", target: P(1), pad: 6, when: (c) => c.tabs.includes("beastforms") },
  { block: B4, tab: "companion", title: "Compañero Animal", text: "La hoja de tu compañero: sus estadísticas, su ataque y sus experiencias.", target: P(1), pad: 6, when: (c) => c.tabs.includes("companion") },
  { block: B4, tab: "contacts", title: "Red de Contactos", text: "Tus contactos del Sindicato y lo que puede hacer cada uno por ti.", target: P(1), pad: 6, when: (c) => c.tabs.includes("contacts") },
  { block: B4, tab: "stances", title: "Posturas Marciales", text: "Las posturas de combate de tu estilo marcial y la Concentración que gastas en ellas.", target: P(1), pad: 6, when: (c) => c.tabs.includes("stances") },
  { block: B4, tab: "campaign", title: "Campaña", text: "Cuando tu DJ te invita a una campaña, aquí ves la escena o el mapa a pantalla completa y el chat en la columna derecha.", target: Q(".mhm-zoom"), pad: 4, when: (c) => c.tabs.includes("campaign") },
];

const union = (els) => {
  const rs = els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 || r.height > 0);
  if (!rs.length) return null;
  const l = Math.min(...rs.map((r) => r.left));
  const t = Math.min(...rs.map((r) => r.top));
  return { left: l, top: t, width: Math.max(...rs.map((r) => r.right)) - l, height: Math.max(...rs.map((r) => r.bottom)) - t };
};
const measure = (step) => {
  const t = step.target();
  const els = Array.isArray(t) ? t : t ? [t] : [];
  return els.length ? union(els) : null;
};

export function Tour({ ctx, onTab, onClose }) {
  const steps = STEPS.filter((s) => !s.when || s.when(ctx));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const cardRef = useRef(null);
  const dir = useRef(1);
  const step = steps[i];

  const go = useCallback((n) => {
    dir.current = n >= 0 ? 1 : -1;
    setI((v) => v + n);
  }, []);
  const next = () => (i >= steps.length - 1 ? onClose() : go(1));

  // Cambia de pestaña y mide el destino cuando termina la animación; si el destino no existe, salta el paso.
  useEffect(() => {
    if (!step) return;
    onTab(step.tab);
    let tries = 0;
    let t;
    const tick = () => {
      const r = measure(step);
      if (r) return setRect(r);
      if (++tries > 8) return i + dir.current >= 0 && i + dir.current < steps.length ? setI((v) => v + dir.current) : onClose();
      t = setTimeout(tick, 120);
    };
    t = setTimeout(tick, 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // Mantiene el foco pegado al elemento si cambia el tamaño de la ventana o de la hoja.
  useEffect(() => {
    if (!step) return;
    const upd = () => {
      const r = measure(step);
      if (r) setRect((o) => (o && Math.abs(o.left - r.left) + Math.abs(o.top - r.top) + Math.abs(o.width - r.width) + Math.abs(o.height - r.height) < 1 ? o : r));
    };
    const id = setInterval(upd, 250);
    window.addEventListener("resize", upd);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", upd);
    };
  }, [step]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && i > 0) go(-1);
      else if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pad = step?.pad ?? 6;
  const box = rect && { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };

  // Coloca la tarjeta debajo, arriba, a la derecha o a la izquierda según haya sitio.
  useLayoutEffect(() => {
    if (!box || !cardRef.current) return;
    const cw = 330;
    const ch = cardRef.current.offsetHeight;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const m = 14;
    const clampX = (x) => Math.max(12, Math.min(W - cw - 12, x));
    const clampY = (y) => Math.max(12, Math.min(H - ch - 12, y));
    const cands = [
      [box.top + box.height + m + ch <= H - 12, clampX(box.left), box.top + box.height + m],
      [box.top - m - ch >= 12, clampX(box.left), box.top - m - ch],
      [box.left + box.width + m + cw <= W - 12, box.left + box.width + m, clampY(box.top)],
      [box.left - m - cw >= 12, box.left - m - cw, clampY(box.top)],
    ];
    const c = cands.find((x) => x[0]);
    setPos(c ? { left: c[1], top: c[2] } : { left: clampX(box.left + 16), top: clampY(box.top + box.height - ch - 16) });
  }, [box?.left, box?.top, box?.width, box?.height, i]);

  if (!step || typeof document === "undefined") return null;
  return createPortal(
    <div className="mh-tour" onClick={next} role="dialog" aria-label="Tutorial" style={box ? undefined : { background: "rgba(6,8,18,.76)" }}>
      {box && <div className="mh-tour-spot" style={{ left: box.left, top: box.top, width: box.width, height: box.height }} />}
      {box && (
        <div ref={cardRef} className="mh-tour-card" style={{ left: pos.left, top: pos.top }} key={i}>
          <div className="mh-tour-block">{step.block}</div>
          <div className="mh-tour-title mh-serif">{step.title}</div>
          <p>{step.text}</p>
          {step.demo && <span className="mh-tour-demo">{step.demo}</span>}
          <div className="mh-tour-foot">
            <span>
              {i + 1} / {steps.length}
            </span>
            {i > 0 && (
              <button type="button" onClick={(e) => (e.stopPropagation(), go(-1))}>
                ← Atrás
              </button>
            )}
            <em>{i >= steps.length - 1 ? "Clic para terminar" : "Clic en pantalla para continuar →"}</em>
          </div>
        </div>
      )}
      <button type="button" className="mh-tour-skip" onClick={(e) => (e.stopPropagation(), onClose())}>
        Omitir tutorial ✕
      </button>
    </div>,
    document.body
  );
}
