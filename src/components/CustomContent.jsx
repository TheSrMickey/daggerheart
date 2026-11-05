"use client";

import { useEffect, useState } from "react";
import { Check, Hammer, Layers, User, X, AlertTriangle, Sparkles } from "lucide-react";
import { storageGet } from "@/lib/storage";
import { CardFace } from "./Cards";
import { toEntry, typeOf, balanceOf } from "./Workshop";

// Contenido personalizado del Taller dentro de la creación de personaje, la hoja y las campañas.
export const MAX_CUSTOM = 3; // elementos del Taller por personaje
export const customOf = (c) => {
  try {
    const l = JSON.parse(c?.f_custom_content || "[]");
    return Array.isArray(l) ? l : [];
  } catch (e) {
    return [];
  }
};

// Copia de los elementos elegidos (se guardan en el personaje tal y como están ahora).
export async function pickWorkshop(ids) {
  try {
    const r = await storageGet("workshop-items", false);
    const l = JSON.parse(r?.value || "[]");
    return (Array.isArray(l) ? l : []).filter((x) => ids.includes(x.id)).slice(0, MAX_CUSTOM);
  } catch (e) {
    return [];
  }
}

export function useWorkshopItems(enabled) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    storageGet("workshop-items", false).then((r) => {
      let l = [];
      try { l = JSON.parse(r?.value || "[]"); } catch (e) { l = []; }
      if (alive) setItems(Array.isArray(l) ? l : []);
    }).catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, [enabled]);
  return items;
}

// Pantalla previa de la creación: plantilla o personaje propio (con el interruptor de contenido del Taller).
export function StartStep({ classes, classColors, emblems, templates, custom, setCustom, onTemplate, onOwn, onClose }) {
  return (
    <div className="mh-wz-page">
      <div className="mh-card mh-wz cc-start">
        <div className="mh-wz-top">
          <div className="mh-wz-title">
            <span className="mh-serif mh-wz-tt">¿Cómo quieres empezar?</span>
            <small>Antes del primer paso</small>
            <button type="button" className="mh-wz-x" aria-label="Cerrar" onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        <div className="cc-start-g">
          <section className="cc-opt">
            <h3><Sparkles size={16} /> Plantilla de personaje</h3>
            <p>Un personaje de nivel 1 con la clase, los rasgos y el equipo que recomienda el libro. Solo te quedará darle nombre, origen, experiencias y cartas.</p>
            <div className="cc-cls">
              {classes.map((c) => {
                const E = emblems[c] || User;
                return (
                  <button key={c} type="button" style={{ "--k": classColors[c] || "#E3B04B" }} onClick={() => onTemplate(c)}>
                    <E size={18} strokeWidth={1.7} />
                    <b>{c}</b>
                    <small>{templates[c]}</small>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="cc-opt">
            <h3><Hammer size={16} /> Crear uno propio</h3>
            <p>Recorres todos los pasos y eliges cada cosa. Puedes añadir contenido que hayas creado en tu Taller.</p>
            <label className={"cc-sw" + (custom ? " is-on" : "")}>
              <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
              <i aria-hidden="true" />
              <span><b>Usar contenido personalizado</b><small>Se añade un paso final para elegir hasta {MAX_CUSTOM} creaciones de tu Taller. Solo podrá jugar en campañas que lo permitan.</small></span>
            </label>
            <button type="button" className="mh-btn cc-go" onClick={onOwn}>Empezar de cero</button>
          </section>
        </div>
      </div>
    </div>
  );
}

// Último paso (solo con el interruptor activo): elegir creaciones del Taller.
export function CustomStep({ selected, setSelected, level, ctx, FitTitle, FitBox }) {
  const items = useWorkshopItems(true);
  const [focus, setFocus] = useState(null);
  const list = items || [];
  const cur = list.find((x) => x.id === focus) || list.find((x) => selected.includes(x.id)) || list[0];
  const toggle = (id) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : selected.length < MAX_CUSTOM ? [...selected, id] : selected);
  const bal = (x) => balanceOf(x, level);
  return (
    <div className="cc-step">
      <div className="cc-step-l">
        <p className="cc-hint">Elige hasta {MAX_CUSTOM} creaciones de tu Taller. Quedan guardadas en el personaje y las verá el DJ y el resto de la mesa. Los avisos de equilibrio son orientativos y no bloquean.</p>
        {items === null && <p className="cc-hint">Cargando tu Taller…</p>}
        {items && !list.length && <p className="cc-hint">Tu Taller está vacío. Crea contenido en la pestaña Taller y vuelve a empezar, o sigue sin contenido personalizado.</p>}
        <div className="cc-list">
          {list.map((x) => {
            const t = typeOf(x.type);
            const b = bal(x);
            const on = selected.includes(x.id);
            return (
              <button key={x.id} type="button" className={"cc-it" + (on ? " is-on" : "") + (cur?.id === x.id ? " is-cur" : "")} style={{ "--c": t.color }} onClick={() => setFocus(x.id)}>
                <i><t.Icon size={16} /></i>
                <span><b>{x.name || "Sin nombre"}</b><small>{t.label}{b.level === "warn" ? " · revisar equilibrio" : " · dentro de lo habitual"}</small></span>
                <em role="checkbox" aria-checked={on} tabIndex={0} onClick={(e) => (e.stopPropagation(), toggle(x.id))} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle(x.id))}>{on ? <Check size={14} strokeWidth={3} /> : null}</em>
              </button>
            );
          })}
        </div>
        <div className="cc-count">{selected.length} de {MAX_CUSTOM} elegidas</div>
      </div>
      <div className="cc-step-r">
        {cur ? (
          <>
            <div className="cc-card"><CardFace c={toEntry(cur, ctx, 0)} I={toEntry(cur, ctx, 0).Icon} FitTitle={FitTitle} FitBox={FitBox} /></div>
            <div className="cc-bal">
              {bal(cur).notes.map((n, i) => <p key={i} className={n.ok ? "ok" : "wr"}>{n.ok ? <Check size={13} /> : <AlertTriangle size={13} />} {n.t}</p>)}
            </div>
          </>
        ) : <div className="cc-empty"><Layers size={26} /><p>Aquí verás la carta que selecciones.</p></div>}
      </div>
    </div>
  );
}

// Ventana con lo que lleva un personaje del Taller.
export function CustomViewer({ name, items, ctx, FitTitle, FitBox, onClose }) {
  return (
    <div className="mh-chn-ov" role="dialog" aria-modal="true" aria-label="Contenido personalizado" onClick={onClose}>
      <div className="mh-chn cc-view" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mh-inv-x mh-chn-x" aria-label="Cerrar" onClick={onClose}><X size={16} /></button>
        <h3 className="mh-serif">Contenido personalizado de {name}</h3>
        <p className="mh-pst-hint">Creado por su jugador en su Taller. Es una copia: si lo cambia después, no se modifica aquí.</p>
        <div className="cc-view-g">
          {items.map((x) => {
            const e = toEntry(x, ctx, 0);
            const b = balanceOf(x, 10);
            return (
              <div key={x.id} className="cc-view-i">
                <CardFace c={e} I={e.Icon} FitTitle={FitTitle} FitBox={FitBox} />
                {b.level === "warn" && <small className="cc-warn"><AlertTriangle size={12} /> {b.notes.filter((n) => !n.ok)[0]?.t}</small>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
