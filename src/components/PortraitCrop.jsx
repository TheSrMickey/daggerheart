"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X, ZoomIn, ZoomOut, Move } from "lucide-react";

// Recorte de la imagen del personaje: el encuadre tiene las mismas proporciones que la ilustración de clase por defecto
// (510 × 600). Se arrastra para mover, con el control (o la rueda) se acerca, y al aceptar se devuelve el recorte como archivo.
export const PORTRAIT_ASPECT = 510 / 600;
const OUT_W = 680;

export default function PortraitCrop({ file, onCancel, onDone, aspect = PORTRAIT_ASPECT, outW = OUT_W, quality = 0.92, title = "Encuadra tu imagen", name = "retrato.webp" }) {
  const src = useMemo(() => URL.createObjectURL(file), [file]);
  const [nat, setNat] = useState(null); // { w, h }
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 }); // punto de la imagen que queda en el centro del encuadre (0–1)
  const [busy, setBusy] = useState(false);
  const frame = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    const im = new Image();
    im.onload = () => setNat({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => onCancel();
    im.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Tamaño de la imagen relativo al encuadre (con zoom 1 la imagen lo cubre justo)
  const ar = nat ? nat.w / nat.h : 1;
  const wRel = zoom * Math.max(1, ar / aspect);
  const hRel = zoom * Math.max(1, aspect / ar);
  const clamp = (p, zw = wRel, zh = hRel) => ({
    x: Math.min(1 - 0.5 / zw, Math.max(0.5 / zw, p.x)),
    y: Math.min(1 - 0.5 / zh, Math.max(0.5 / zh, p.y)),
  });
  const cp = clamp(pos);

  const setZoomTo = (z) => {
    const nz = Math.min(4, Math.max(1, z));
    setZoom(nz);
    setPos((p) => clamp(p, nz * Math.max(1, ar / aspect), nz * Math.max(1, aspect / ar)));
  };

  const down = (e) => {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!drag.current || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    const dx = (e.clientX - drag.current.x) / r.width;
    const dy = (e.clientY - drag.current.y) / r.height;
    drag.current = { x: e.clientX, y: e.clientY };
    setPos((p) => clamp({ x: clamp(p).x - dx / wRel, y: clamp(p).y - dy / hRel }));
  };
  const up = () => { drag.current = null; };
  const key = (e) => {
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (k) {
      e.preventDefault();
      setPos((p) => clamp({ x: clamp(p).x + (k[0] * 0.02) / wRel, y: clamp(p).y + (k[1] * 0.02) / hRel }));
    } else if (e.key === "+" || e.key === "=") setZoomTo(zoom + 0.1);
    else if (e.key === "-") setZoomTo(zoom - 0.1);
  };

  const accept = () => {
    if (!nat || busy) return;
    setBusy(true);
    const im = new Image();
    im.onload = () => {
      const sw = nat.w / wRel;
      const sh = nat.h / hRel;
      const sx = cp.x * nat.w - sw / 2;
      const sy = cp.y * nat.h - sh / 2;
      const ow = Math.max(1, Math.min(outW, Math.round(sw)));
      const oh = Math.max(1, Math.round(ow / aspect));
      const cv = document.createElement("canvas");
      cv.width = ow;
      cv.height = oh;
      cv.getContext("2d").drawImage(im, sx, sy, sw, sh, 0, 0, ow, oh);
      URL.revokeObjectURL(src);
      cv.toBlob(
        (b) => {
          if (!b) return setBusy(false);
          onDone(new File([b], name, { type: b.type || "image/webp" }));
        },
        "image/webp",
        0.92
      );
    };
    im.src = src;
  };

  return createPortal(
    <div className="pcr-back" onClick={onCancel}>
      <style>{`
        .pcr-back { position: fixed; inset: 0; z-index: 400; background: rgba(8,6,16,.72); display: grid; place-items: center; padding: 16px; }
        .pcr { width: min(440px, 100%); max-height: 96vh; overflow: auto; border-radius: 20px; padding: 18px 18px 16px; background: var(--mh-card, #1c1830); color: var(--mh-ink, #f4efe2); border: 1px solid var(--mh-line2, rgba(255,255,255,.18)); box-shadow: 0 24px 60px rgba(0,0,0,.6); display: flex; flex-direction: column; gap: 12px; }
        .pcr h3 { margin: 0; font-size: 18px; } .pcr p { margin: 0; font-size: 12.5px; color: var(--mh-ink3, #b9b2cc); line-height: 1.45; }
        .pcr-frame { position: relative; align-self: center; width: min(300px, 100%); aspect-ratio: 510 / 600; border-radius: 16px; overflow: hidden; cursor: grab; touch-action: none; user-select: none; outline: none; border: 2px solid var(--mh-gold, #C9A24A); background: repeating-conic-gradient(#2a2540 0 25%, #221e36 0 50%) 0 0 / 18px 18px; }
        .pcr-frame:active { cursor: grabbing; } .pcr-frame:focus-visible { box-shadow: 0 0 0 3px rgba(201,162,74,.45); }
        .pcr-frame img { position: absolute; max-width: none; pointer-events: none; -webkit-user-drag: none; }
        .pcr-grid { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, transparent 33%, rgba(255,255,255,.22) 33% calc(33% + 1px), transparent calc(33% + 1px) 66%, rgba(255,255,255,.22) 66% calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(0deg, transparent 33%, rgba(255,255,255,.22) 33% calc(33% + 1px), transparent calc(33% + 1px) 66%, rgba(255,255,255,.22) 66% calc(66% + 1px), transparent calc(66% + 1px)); opacity: 0; transition: opacity .15s; }
        .pcr-frame:hover .pcr-grid, .pcr-frame:active .pcr-grid { opacity: 1; }
        .pcr-zoom { display: flex; align-items: center; gap: 10px; color: var(--mh-ink3, #b9b2cc); } .pcr-zoom input { flex: 1; accent-color: var(--mh-gold, #C9A24A); }
        .pcr-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; } .pcr-hint { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--mh-ink3, #b9b2cc); }
      `}</style>
      <div className="pcr" role="dialog" aria-modal="true" aria-label="Recortar imagen" onClick={(e) => e.stopPropagation()}>
        <h3 className="mh-serif">{title}</h3>
        <p>Arrastra para mover la imagen y acércala con el control de abajo. Lo que ves dentro del marco es lo que se guarda.</p>
        <div ref={frame} className="pcr-frame" style={{ aspectRatio: String(aspect), width: aspect > 1 ? "min(380px, 100%)" : undefined }} tabIndex={0} aria-label="Encuadre: arrastra o usa las flechas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key} onWheel={(e) => setZoomTo(zoom - Math.sign(e.deltaY) * 0.12)}>
          {src && nat && <img src={src} alt="" draggable={false} style={{ width: wRel * 100 + "%", height: hRel * 100 + "%", left: 50 - cp.x * wRel * 100 + "%", top: 50 - cp.y * hRel * 100 + "%" }} />}
          <div className="pcr-grid" />
        </div>
        <div className="pcr-zoom">
          <ZoomOut size={16} />
          <input type="range" min="1" max="4" step="0.01" value={zoom} aria-label="Zoom" onChange={(e) => setZoomTo(Number(e.target.value))} />
          <ZoomIn size={16} />
        </div>
        <div className="pcr-row">
          <span className="pcr-hint"><Move size={13} /> Arrastra · rueda para acercar</span>
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" className="mh-btn-ghost" onClick={onCancel}><X size={14} /> Cancelar</button>
            <button type="button" className="mh-btn" onClick={accept} disabled={!nat || busy}><Check size={14} /> Usar este encuadre</button>
          </span>
        </div>
      </div>
    </div>,
    document.querySelector(".mh-root") || document.body
  );
}
