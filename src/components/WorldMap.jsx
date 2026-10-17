"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Plus, MapPin, Trash2, X, Eye, EyeOff, Landmark, Skull, Flag, Swords, Home, ZoomIn, ZoomOut, ChevronRight, Pencil, Sparkles, Copy, Check, ImagePlus, Wand2 } from "lucide-react";
import { useDoc } from "@/lib/campaignDocs";

// Mapa de mundo: una imagen que sube el DJ y marcadores encima. Cada marcador abre una tarjeta con imagen, texto y,
// para el DJ, un enlace a la escena de la historia. Los marcadores nuevos nacen ocultos hasta que el DJ los revela.
export const WORLD_KINDS = [
  { key: "ciudad", label: "Ciudad", color: "#E3B04B", Icon: Landmark },
  { key: "mazmorra", label: "Mazmorra", color: "#A58BE8", Icon: Skull },
  { key: "mision", label: "Misión", color: "#6FBF73", Icon: Flag },
  { key: "peligro", label: "Peligro", color: "#D9644E", Icon: Swords },
  { key: "refugio", label: "Refugio", color: "#5E93C9", Icon: Home },
  { key: "interes", label: "Punto de interés", color: "#E07FB0", Icon: MapPin },
];
const KIND = Object.fromEntries(WORLD_KINDS.map((k) => [k.key, k]));
const docKey = (id) => "campaign-worldmap:" + id;
const EMPTY = { image: "", pins: [] };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const STYLES = [
  { key: "pintado", label: "Pintado de fantasía", txt: "painterly high-detail fantasy digital illustration, rich saturated colors, soft atmospheric haze, premium tabletop RPG virtual-tabletop world map" },
  { key: "isometrico", label: "Isométrico tipo diorama", txt: "isometric miniature-diorama style, clean stylized 3D render look, soft global illumination, charming and readable tabletop RPG world map" },
  { key: "cartografico", label: "Cartografía antigua", txt: "aged parchment cartography style with hand-inked coastlines and watercolor washes, but WITHOUT any lettering, richly illustrated old-world fantasy map" },
];

// Prompt para generar la imagen: lugares aislados y repartidos, sin texto, para poder poner los marcadores encima.
export function buildMapPrompt({ world, places, style }) {
  const st = STYLES.find((s) => s.key === style) || STYLES[0];
  const list = places.split("\n").map((l) => l.trim()).filter(Boolean);
  return [
    "A wide 16:9 illustrated fantasy world map" + (world.trim() ? " of " + world.trim() : "") + ", seen from a high bird's-eye view (top-down, slightly tilted), " + st.txt + ".",
    "",
    "Place these landmarks, each one clearly recognizable, visually isolated and surrounded by generous empty space so that a small map pin can be placed on top of it without hiding anything important:",
    ...(list.length ? list.map((l, i) => (i + 1) + ". " + l) : ["(add your locations here)"]),
    "",
    "Spread the landmarks evenly across the whole frame, not clustered, connected by readable roads, rivers and coastlines. Keep a consistent scale, warm natural lighting from the upper left and a calm, uncluttered composition with a clear visual hierarchy. Fill the entire canvas edge to edge with terrain.",
    "",
    "Strictly NO text, NO labels, NO letters, NO numbers, NO legend, NO compass, NO scale bar, NO border, NO frame, NO user interface, NO watermark, NO signature, NO characters or creatures in the foreground.",
  ].join("\n");
}

function PromptHelper({ onClose }) {
  const [world, setWorld] = useState("a medieval kingdom of green valleys, a winding river, snowy mountains to the north and a sea coast to the south");
  const [places, setPlaces] = useState("Peaceful Village Church — a small stone church with a bell tower, lower left\nPort town — wooden docks on the southern coast\nAncient ruined fortress — on a hill, upper right\nDark cave entrance — at the foot of the northern mountains\nTraveler's inn — beside the crossroads in the center");
  const [style, setStyle] = useState("pintado");
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => buildMapPrompt({ world, places, style }), [world, places, style]);
  const ref = useRef(null);
  const copy = () => {
    const fb = () => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) {}
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1800)), fb);
    else fb();
  };
  return (
    <div className="mh-wm-prompt">
      <div className="mh-wm-ph">
        <span><Wand2 size={15} /> Prompt para generar el mapa</span>
        <button type="button" className="mh-inv-x" aria-label="Cerrar" onClick={onClose}><X size={16} /></button>
      </div>
      <p className="mh-wm-note">Escribe tu mundo y tus lugares en inglés (los generadores lo entienden mejor), copia el prompt y pégalo en tu generador de imágenes. Pide siempre formato 16:9 y que no escriba texto: los nombres los pones tú en los marcadores.</p>
      <label className="mh-wm-f"><span>Cómo es el mundo</span><textarea className="mh-input" rows={2} value={world} onChange={(e) => setWorld(e.target.value)} /></label>
      <label className="mh-wm-f"><span>Lugares, uno por línea (nombre — cómo es y dónde)</span><textarea className="mh-input" rows={5} value={places} onChange={(e) => setPlaces(e.target.value)} /></label>
      <label className="mh-wm-f"><span>Estilo</span>
        <select className="mh-input" value={style} onChange={(e) => setStyle(e.target.value)}>{STYLES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
      </label>
      <textarea ref={ref} className="mh-input mh-wm-out" readOnly rows={11} value={text} aria-label="Prompt generado" />
      <div className="mh-wm-row">
        <button type="button" className="mh-btn" onClick={copy}>{copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar prompt</>}</button>
        <span className="mh-wm-note">Consejo: genera varias y quédate con la que deje más espacio libre alrededor de cada lugar.</span>
      </div>
    </div>
  );
}

export default function WorldMap({ campaignId, edit = false, scenes = [], imgSrc, ensureImg, saveImage, dropImage, onOpenScene, onLog, fit = false, showHidden = false }) {
  const [doc, update] = useDoc(docKey(campaignId), EMPTY, 4000);
  const pins = doc.pins || [];
  const [sel, setSel] = useState(null);
  const [tool, setTool] = useState(null); // "add" cuando el DJ va a colocar un marcador
  const [editing, setEditing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ratio, setRatio] = useState(1.6);
  const [drag, setDrag] = useState(null);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState("");
  const [draft, setDraft] = useState({ title: "", text: "" });
  const canvasRef = useRef(null);
  const dragMoved = useRef(false);
  const openEdit = useRef(false); // un marcador recién creado se abre directamente en edición

  const visible = edit || showHidden ? pins : pins.filter((p) => !p.hidden);
  const pin = visible.find((p) => p.id === sel) || null;
  const mapSrc = imgSrc ? imgSrc(doc.image) : "";

  // Descarga las imágenes del mapa y de los marcadores visibles.
  useEffect(() => {
    if (!ensureImg) return;
    ensureImg(doc.image);
    visible.forEach((p) => ensureImg(p.img));
  }, [doc.image, pins]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftId = useRef(null);
  useEffect(() => {
    setEditing(openEdit.current);
    openEdit.current = false;
    draftId.current = null;
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pin) return;
    if (!editing || draftId.current !== pin.id) {
      setDraft({ title: pin.title || "", text: pin.text || "" });
      draftId.current = pin.id;
    }
  }, [pin?.id, pin?.title, pin?.text, editing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sel) return undefined;
    const k = (e) => e.key === "Escape" && (setSel(null), setTool(null));
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [sel]);

  const patchPin = (id, patch) => update((d) => ({ ...d, pins: (d.pins || []).map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: clamp(((e.clientX - r.left) / r.width) * 100, 0, 100), y: clamp(((e.clientY - r.top) / r.height) * 100, 0, 100) };
  };

  const onMapClick = (e) => {
    if (dragMoved.current) return (dragMoved.current = false);
    if (edit && tool === "add") {
      const { x, y } = pos(e);
      const np = { id: "p" + Date.now(), x: +x.toFixed(2), y: +y.toFixed(2), title: "Nuevo lugar", text: "", kind: "interes", img: "", sceneId: "", hidden: true };
      update((d) => ({ ...d, pins: [...(d.pins || []), np] }));
      setTool(null);
      openEdit.current = true;
      setSel(np.id);
    } else setSel(null);
  };

  const startDrag = (e, p) => {
    e.stopPropagation();
    if (!edit || tool === "add") return;
    dragMoved.current = false;
    const sx = e.clientX, sy = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id: p.id, x: p.x, y: p.y, on: false, sx, sy });
  };
  const moveDrag = (e) => {
    if (!drag) return;
    if (!drag.on && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
    dragMoved.current = true;
    const { x, y } = pos(e);
    setDrag((d) => ({ ...d, x, y, on: true }));
  };
  const endDrag = (p) => {
    if (drag && drag.on) patchPin(p.id, { x: +drag.x.toFixed(2), y: +drag.y.toFixed(2) });
    setDrag(null);
    setSel(p.id);
    setTimeout(() => (dragMoved.current = false), 0);
  };

  const uploadMap = async (file) => {
    if (!file || !saveImage) return;
    setBusy("Subiendo el mapa…");
    const ref = await saveImage(file, 2000);
    setBusy("");
    if (!ref) return;
    const old = doc.image;
    await update((d) => ({ ...d, image: ref }));
    if (old && dropImage) dropImage(old);
  };
  const uploadPinImg = async (file) => {
    if (!file || !saveImage || !pin) return;
    setBusy("Subiendo la imagen…");
    const ref = await saveImage(file, 1000);
    setBusy("");
    if (!ref) return;
    const old = pin.img;
    await patchPin(pin.id, { img: ref });
    if (old && dropImage) dropImage(old);
  };
  const removePin = async () => {
    if (!pin) return;
    const old = pin.img;
    await update((d) => ({ ...d, pins: (d.pins || []).filter((p) => p.id !== pin.id) }));
    if (old && dropImage) dropImage(old);
    setSel(null);
  };
  const toggleHidden = () => {
    patchPin(pin.id, { hidden: !pin.hidden });
    if (pin.hidden && onLog) onLog("El DJ revela un lugar en el mapa de mundo: " + (pin.title || "un lugar nuevo") + ".");
  };
  const saveDraft = () => pin && (draft.title !== pin.title || draft.text !== pin.text) && patchPin(pin.id, { title: draft.title.trim() || "Sin nombre", text: draft.text });

  const sceneName = (id) => scenes.find((s) => s.id === id)?.title || "";
  const kind = pin ? KIND[pin.kind] || KIND.interes : null;
  const pinImg = pin && imgSrc ? imgSrc(pin.img) : "";

  // ---- sin mapa ----
  if (!doc.image) {
    return (
      <div className={"mh-wm" + (fit ? " is-fit" : "")}>
        <div className="mh-wm-empty">
          <Sparkles size={26} />
          <b>{edit ? "Sube la imagen de tu mundo" : "El DJ todavía no ha preparado el mapa de mundo."}</b>
          {edit && (
            <>
              <span>Puede ser un mapa pintado, una ilustración o una imagen que generes con IA. Después colocas marcadores encima.</span>
              <div className="mh-wm-row">
                <label className="mh-btn" style={{ cursor: "pointer" }}>
                  <Upload size={14} /> Subir imagen
                  <input type="file" accept="image/*" hidden onChange={(e) => { uploadMap(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                <button type="button" className="mh-btn-ghost" onClick={() => setHelp((v) => !v)}><Wand2 size={14} /> Prompt para generarla</button>
              </div>
              {busy && <span className="mh-wm-note">{busy}</span>}
            </>
          )}
        </div>
        {edit && help && <PromptHelper onClose={() => setHelp(false)} />}
      </div>
    );
  }

  return (
    <div className={"mh-wm" + (fit ? " is-fit" : "")}>
      {edit && (
        <div className="mh-wm-bar">
          <button type="button" className={"mh-btn-ghost" + (tool === "add" ? " is-on" : "")} onClick={() => (setTool(tool === "add" ? null : "add"), setSel(null))} title="Pulsa y luego haz clic en el mapa">
            <Plus size={14} /> {tool === "add" ? "Haz clic en el mapa…" : "Marcador"}
          </button>
          <label className="mh-btn-ghost" style={{ cursor: "pointer" }}>
            <ImagePlus size={14} /> Cambiar mapa
            <input type="file" accept="image/*" hidden onChange={(e) => { uploadMap(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button type="button" className={"mh-btn-ghost" + (help ? " is-on" : "")} onClick={() => setHelp((v) => !v)}><Wand2 size={14} /> Prompt</button>
          <span className="mh-wm-sp" />
          <span className="mh-wm-note">{pins.length} marcador{pins.length === 1 ? "" : "es"} · {pins.filter((p) => p.hidden).length} oculto{pins.filter((p) => p.hidden).length === 1 ? "" : "s"}</span>
        </div>
      )}
      {edit && help && <PromptHelper onClose={() => setHelp(false)} />}
      <div className="mh-wm-wrap">
        <div className={"mh-wm-view" + (tool === "add" ? " is-add" : "")}>
          {fit && mapSrc && <div className="mh-wm-bg" aria-hidden="true" style={{ backgroundImage: `url("${mapSrc.replace(/"/g, "%22")}")` }} />}
          <div className="mh-wm-canvas" ref={canvasRef} style={fit ? { aspectRatio: String(ratio), "--wm-r": ratio } : { width: zoom * 100 + "%" }} onClick={onMapClick}>
            {mapSrc ? <img src={mapSrc} alt="Mapa de mundo" draggable={false} onLoad={(e) => e.currentTarget.naturalHeight && setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} /> : <div className="mh-wm-load">Cargando el mapa…</div>}
            {visible.map((p) => {
              const k = KIND[p.kind] || KIND.interes;
              const d = drag && drag.id === p.id && drag.on ? drag : p;
              const Ic = k.Icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={"mh-wm-pin" + (sel === p.id ? " is-sel" : "") + (p.hidden ? " is-hid" : "") + (drag && drag.id === p.id && drag.on ? " is-drag" : "")}
                  style={{ left: d.x + "%", top: d.y + "%", "--pc": k.color }}
                  title={p.title}
                  aria-label={p.title + (p.hidden ? " (oculto)" : "")}
                  onClick={(e) => { e.stopPropagation(); if (!edit) setSel(p.id); }}
                  onPointerDown={(e) => (edit ? startDrag(e, p) : undefined)}
                  onPointerMove={moveDrag}
                  onPointerUp={() => drag && drag.id === p.id && endDrag(p)}
                >
                  <span className="mh-wm-pin-pulse" aria-hidden="true" /><span className="mh-wm-pin-b"><svg viewBox="0 0 44 54" aria-hidden="true"><path className="mh-wm-pin-tail" d="M15.5 33.5L22 50L28.5 33.5Z" /><circle className="mh-wm-pin-disc" cx="22" cy="21" r="18" /><path className="mh-wm-pin-logo" transform="translate(14.94 9) scale(0.0706)" d="M100 0C101.5 66 106 109 200 115C106 121 102 164 100 340C98 164 94 121 0 115C94 109 98.5 66 100 0Z" /></svg></span>
                  {sel === p.id && <span className="mh-wm-pin-t">{p.title}</span>}
                </button>
              );
            })}
          </div>
          <div className="mh-wm-zoom" hidden={fit}>
            <button type="button" aria-label="Acercar" onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))}><ZoomIn size={15} /></button>
            <button type="button" aria-label="Alejar" onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}><ZoomOut size={15} /></button>
          </div>
          {busy && <div className="mh-wm-busy">{busy}</div>}
        </div>

        {pin && (
          <aside className="mh-wm-card" aria-label={"Lugar: " + pin.title}>
            <button type="button" className="mh-inv-x mh-wm-x" aria-label="Cerrar" onClick={() => setSel(null)}><X size={16} /></button>
            {!editing ? (
              <>
                {pinImg ? <div className="mh-wm-img" style={{ backgroundImage: `url("${pinImg.replace(/"/g, "%22")}")` }} /> : <div className="mh-wm-img is-none" style={{ "--pc": kind.color }}><kind.Icon size={34} strokeWidth={1.4} /></div>}
                <div className="mh-wm-body">
                  <span className="mh-wm-kind" style={{ "--pc": kind.color }}><kind.Icon size={11} /> {kind.label}{pin.hidden && (edit || showHidden) ? " · oculto (solo tú lo ves)" : ""}</span>
                  <h3 className="mh-serif">{pin.title}</h3>
                  {pin.text ? <p>{pin.text}</p> : <p className="mh-wm-note">{edit ? "Sin descripción todavía." : "Un lugar por descubrir."}</p>}
                  {edit && pin.sceneId && sceneName(pin.sceneId) && onOpenScene && (
                    <button type="button" className="mh-btn mh-wm-go" onClick={() => onOpenScene(pin.sceneId)}>Ir a la escena «{sceneName(pin.sceneId)}» <ChevronRight size={14} /></button>
                  )}
                  {edit && (
                    <div className="mh-wm-row">
                      <button type="button" className="mh-btn-ghost" onClick={() => setEditing(true)}><Pencil size={13} /> Editar</button>
                      <button type="button" className="mh-btn-ghost" onClick={toggleHidden}>{pin.hidden ? <><Eye size={13} /> Revelar a los jugadores</> : <><EyeOff size={13} /> Ocultar</>}</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mh-wm-body mh-wm-edit">
                <label className="mh-wm-f"><span>Nombre</span><input className="mh-input" value={draft.title} maxLength={60} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onBlur={saveDraft} /></label>
                <label className="mh-wm-f"><span>Descripción</span><textarea className="mh-input" rows={5} maxLength={900} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} onBlur={saveDraft} /></label>
                <div className="mh-wm-f"><span>Tipo</span>
                  <div className="mh-wm-kinds">{WORLD_KINDS.map((k) => <button key={k.key} type="button" className={pin.kind === k.key ? "is-on" : ""} style={{ "--pc": k.color }} onClick={() => patchPin(pin.id, { kind: k.key })}><k.Icon size={12} /> {k.label}</button>)}</div>
                </div>
                <div className="mh-wm-f"><span>Imagen</span>
                  <div className="mh-wm-row">
                    <label className="mh-btn-ghost" style={{ cursor: "pointer" }}><Upload size={13} /> {pin.img ? "Cambiar" : "Subir"}<input type="file" accept="image/*" hidden onChange={(e) => { uploadPinImg(e.target.files?.[0]); e.target.value = ""; }} /></label>
                    {pin.img && <button type="button" className="mh-btn-ghost" onClick={async () => { const old = pin.img; await patchPin(pin.id, { img: "" }); dropImage && dropImage(old); }}>Quitar</button>}
                  </div>
                </div>
                <label className="mh-wm-f"><span>Escena enlazada</span>
                  <select className="mh-input" value={pin.sceneId || ""} onChange={(e) => patchPin(pin.id, { sceneId: e.target.value })}>
                    <option value="">Ninguna</option>
                    {scenes.map((s) => <option key={s.id} value={s.id}>{s.title || "Sin título"}</option>)}
                  </select>
                </label>
                <div className="mh-wm-row">
                  <button type="button" className="mh-btn" onClick={() => { saveDraft(); setEditing(false); }}><Check size={14} /> Listo</button>
                  <button type="button" className="mh-btn-ghost" onClick={toggleHidden}>{pin.hidden ? <><Eye size={13} /> Revelar</> : <><EyeOff size={13} /> Ocultar</>}</button>
                  <button type="button" className="mh-btn-ghost mh-wm-del" onClick={removePin}><Trash2 size={13} /> Borrar</button>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
      {edit && !pins.length && <p className="mh-wm-note" style={{ marginTop: 8 }}>Pulsa «Marcador» y haz clic en el mapa para añadir tu primer lugar. Los marcadores nuevos están ocultos hasta que los reveles.</p>}
    </div>
  );
}
