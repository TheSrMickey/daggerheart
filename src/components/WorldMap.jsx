"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Plus, MapPin, Trash2, X, Eye, EyeOff, Landmark, Skull, Flag, Swords, Home, ZoomIn, ZoomOut, ChevronRight, Pencil, Sparkles, Copy, Check, ImagePlus, Wand2, Box, Image as ImageIcon } from "lucide-react";
import { useDoc } from "@/lib/campaignDocs";
import World3D, { starterTiles } from "./World3D";
import { PlacePromptHelper, CopyPrompt, buildPlacePrompt } from "./ImagePrompts";

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
const EMPTY = { image: "", pins: [], seasons: {}, season: "", mode: "", hex: null };
// El mapa normal y, opcionalmente, una versión por estación del año. El DJ elige cuál ven los jugadores.
export const SEASONS = [
  { key: "primavera", label: "Primavera", emoji: "🌱" },
  { key: "verano", label: "Verano", emoji: "☀️" },
  { key: "otono", label: "Otoño", emoji: "🍂" },
  { key: "invierno", label: "Invierno", emoji: "❄️" },
];
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
  const [view, setView] = useState("interior");
  const text = useMemo(() => buildMapPrompt({ world, places, style }), [world, places, style]);
  // «Nombre — descripción» por línea.
  const placeList = useMemo(() => places.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [t, ...r] = l.split(/\s+[—–-]\s+/); return { title: t.trim(), text: r.join(" — ").trim() }; }), [places]);
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
      {placeList.length > 0 && (
        <div className="mh-wm-places">
          <div className="mh-wm-ph"><span><Wand2 size={15} /> Prompts para ilustrar cada lugar</span></div>
          <p className="mh-wm-note">Uno por lugar: al pulsar su marcador saldrá esa imagen en el banner. Interior o exterior según prefieras.</p>
          <div className="mh-wm-row">
            <button type="button" className={"mh-btn-ghost" + (view === "interior" ? " is-on" : "")} onClick={() => setView("interior")}>Interior</button>
            <button type="button" className={"mh-btn-ghost" + (view === "exterior" ? " is-on" : "")} onClick={() => setView("exterior")}>Exterior</button>
          </div>
          {placeList.map((pl, i) => (
            <details key={i} className="mh-wm-place">
              <summary>{pl.title}</summary>
              <CopyPrompt text={buildPlacePrompt({ world, title: pl.title, text: pl.text, kindLabel: "", view, style: "pintado" })} rows={6} label="Copiar prompt del lugar" />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorldMap({ campaignId, edit = false, scenes = [], imgSrc, ensureImg, saveImage, dropImage, onOpenScene, onLog, fit = false, compact = false, showHidden = false, seasonMenu = false }) {
  const [doc, update] = useDoc(docKey(campaignId), EMPTY, 4000);
  const pins = doc.pins || [];
  const [sel, setSel] = useState(null);
  const [tool, setTool] = useState(null); // "add" cuando el DJ va a colocar un marcador
  const [editing, setEditing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ratio, setRatio] = useState(1.6);
  const [ready, setReady] = useState(false);
  const [drag, setDrag] = useState(null);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState("");
  const [draft, setDraft] = useState({ title: "", text: "" });
  const canvasRef = useRef(null);
  const dragMoved = useRef(false);
  const openEdit = useRef(false); // un marcador recién creado se abre directamente en edición

  const is3d = doc.mode === "3d";
  const apiRef = useRef(null);
  const tiles3d = doc.hex || null;
  const visible = edit || showHidden ? pins : pins.filter((p) => !p.hidden);
  const pin = visible.find((p) => p.id === sel) || null;
  const seasons = doc.seasons || {};
  const season = doc.season && seasons[doc.season] ? doc.season : "";
  const shownRef = season ? seasons[season] : doc.image;
  const mapSrc = imgSrc ? imgSrc(shownRef) : "";
  // Al cambiar de estación la imagen anterior se queda debajo mientras la nueva aparece con un fundido suave.
  const [fade, setFade] = useState({ cur: mapSrc, prev: "" });
  if (mapSrc !== fade.cur) setFade({ cur: mapSrc, prev: fade.cur });
  useEffect(() => {
    if (!fade.prev) return undefined;
    const t = setTimeout(() => setFade((f) => ({ ...f, prev: "" })), 1100);
    return () => clearTimeout(t);
  }, [fade.prev]);
  const [smOpen, setSmOpen] = useState(false);

  // Descarga las imágenes del mapa y de los marcadores visibles.
  useEffect(() => {
    if (!ensureImg) return;
    ensureImg(shownRef);
    visible.forEach((p) => ensureImg(p.img));
  }, [shownRef, pins]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const addPinAt = (e) => {
    const { x, y } = pos(e);
    const np = { id: "p" + Date.now(), x: +x.toFixed(2), y: +y.toFixed(2), title: "Nuevo lugar", text: "", kind: "interes", img: "", sceneId: "", hidden: true };
    update((d) => ({ ...d, pins: [...(d.pins || []), np] }));
    setTool(null);
    openEdit.current = true;
    setSel(np.id);
  };
  const placePin3d = ({ wx, wz }) => {
    const np = { id: "p" + Date.now(), wx, wz, title: "Nuevo lugar", text: "", kind: "interes", img: "", sceneId: "", hidden: true };
    update((d) => ({ ...d, pins: [...(d.pins || []), np] }));
    setTool(null);
    openEdit.current = true;
    setSel(np.id);
  };
  const setMode = (m) => update((d) => ({ ...d, mode: m, hex: m === "3d" && !d.hex ? starterTiles() : d.hex }));
  const setTiles = (fn) => update((d) => ({ ...d, hex: fn(d.hex) }));
  const onMapClick = (e) => {
    if (dragMoved.current) return (dragMoved.current = false);
    if (edit && tool === "add") addPinAt(e);
    else setSel(null);
  };
  const onMapDbl = (e) => {
    if (edit && fit && tool !== "add") addPinAt(e);
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
    if (is3d) {
      const g = apiRef.current && apiRef.current.groundAt(e.clientX, e.clientY);
      if (g) setDrag((d) => ({ ...d, wx: g.x, wz: g.z, on: true }));
      return;
    }
    const { x, y } = pos(e);
    setDrag((d) => ({ ...d, x, y, on: true }));
  };
  const endDrag = (p) => {
    if (drag && drag.on) patchPin(p.id, is3d ? { wx: +drag.wx.toFixed(2), wz: +drag.wz.toFixed(2) } : { x: +drag.x.toFixed(2), y: +drag.y.toFixed(2) });
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
  const [seasonPick, setSeasonPick] = useState(null); // estación a la que se sube imagen
  const uploadSeason = async (key, file) => {
    if (!file || !saveImage) return;
    setBusy("Subiendo el mapa de " + SEASONS.find((x) => x.key === key)?.label.toLowerCase() + "…");
    const ref = await saveImage(file, 2000);
    setBusy("");
    if (!ref) return;
    const old = (doc.seasons || {})[key];
    await update((d) => ({ ...d, seasons: { ...(d.seasons || {}), [key]: ref }, season: key }));
    if (old && dropImage) dropImage(old);
  };
  const removeSeason = async (key) => {
    const old = (doc.seasons || {})[key];
    await update((d) => {
      const next = { ...(d.seasons || {}) };
      delete next[key];
      return { ...d, seasons: next, season: d.season === key ? "" : d.season };
    });
    if (old && dropImage) dropImage(old);
  };
  const setSeason = (key) => update((d) => ({ ...d, season: key }));
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

  const pinBtn = (p, flat) => {
      const k = KIND[p.kind] || KIND.interes;
      const d = drag && drag.id === p.id && drag.on ? drag : p;
      const Ic = k.Icon;
      return (
        <button
          key={p.id}
          type="button"
          className={"mh-wm-pin" + (sel === p.id ? " is-sel" : "") + (p.hidden ? " is-hid" : "") + (drag && drag.id === p.id && drag.on ? " is-drag" : "")}
          style={flat ? { left: 0, top: 0, "--pc": k.color } : { left: d.x + "%", top: d.y + "%", "--pc": k.color }}
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
  };

  // ---- sin mapa ----
  if (!is3d && !doc.image) {
    return (
      <div className={"mh-wm" + (fit ? " is-fit" : "")}>
        <div className="mh-wm-empty">
          <Sparkles size={26} />
          <b>{edit ? "Sube la imagen de tu mundo" : "El DJ todavía no ha preparado el mapa de mundo."}</b>
          {edit && (
            <>
              <span>Puede ser un mapa pintado, una ilustración o una imagen que generes con IA. Después colocas marcadores encima.</span>
              <div className="mh-wm-row">
                <button type="button" className="mh-btn" onClick={() => setMode("3d")}><Box size={14} /> Crear un mapa 3D</button>
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
          <div className="mh-wm-seasons mh-wm-modes" role="group" aria-label="Tipo de mapa">
            <button type="button" className={!is3d ? "is-on" : ""} onClick={() => setMode("")} title="Mapa tradicional: una imagen con marcadores"><ImageIcon size={13} /> Tradicional</button>
            <button type="button" className={is3d ? "is-on" : ""} onClick={() => setMode("3d")} title="Mapa 3D con losas hexagonales"><Box size={13} /> 3D</button>
          </div>
          <button type="button" className={"mh-btn-ghost" + (tool === "add" ? " is-on" : "")} onClick={() => (setTool(tool === "add" ? null : "add"), setSel(null))} title="Pulsa y luego haz clic en el mapa">
            <Plus size={14} /> {tool === "add" ? "Haz clic en el mapa…" : "Marcador"}
          </button>
          {!compact && !is3d && <label className="mh-btn-ghost" style={{ cursor: "pointer" }}>
            <ImagePlus size={14} /> Cambiar mapa
            <input type="file" accept="image/*" hidden onChange={(e) => { uploadMap(e.target.files?.[0]); e.target.value = ""; }} />
          </label>}
          {!compact && !is3d && <button type="button" className={"mh-btn-ghost" + (help ? " is-on" : "")} onClick={() => setHelp((v) => !v)}><Wand2 size={14} /> Prompt</button>}
          {!is3d && <div className="mh-wm-seasons" role="group" aria-label="Estación del mapa">
            <button type="button" className={!season ? "is-on" : ""} onClick={() => setSeason("")} title="Mapa normal (el de siempre)">Normal</button>
            {SEASONS.map((x) => {
              const has = !!seasons[x.key];
              return (
                <button key={x.key} type="button" className={(season === x.key ? "is-on " : "") + (has ? "" : "is-empty")} onClick={() => (has ? setSeason(x.key) : setSeasonPick(x.key))} title={has ? x.label + " (los jugadores verán este mapa)" : "Subir el mapa de " + x.label.toLowerCase()}>
                  <span aria-hidden="true">{x.emoji}</span> {x.label}
                </button>
              );
            })}
            <label className="mh-wm-sup" title={season ? "Cambiar el mapa de " + SEASONS.find((x) => x.key === season).label.toLowerCase() : "Subir el mapa de una estación"}>
              <ImagePlus size={13} />
              <input type="file" accept="image/*" hidden onChange={(e) => { const k = season || seasonPick || "primavera"; uploadSeason(k, e.target.files?.[0]); e.target.value = ""; setSeasonPick(null); }} />
            </label>
            {season && <button type="button" className="mh-wm-sup" title={"Quitar el mapa de " + SEASONS.find((x) => x.key === season).label.toLowerCase()} onClick={() => removeSeason(season)}><Trash2 size={13} /></button>}
          </div>}
          {seasonPick && <span className="mh-wm-note">Elige la imagen de {SEASONS.find((x) => x.key === seasonPick).label.toLowerCase()} con el botón de subir.</span>}
          <span className="mh-wm-sp" />
          {compact && !is3d && <span className="mh-wm-note">Doble clic en el mapa para crear · arrastra para mover</span>}
          {!compact && <span className="mh-wm-note">{pins.length} marcador{pins.length === 1 ? "" : "es"} · {pins.filter((p) => p.hidden).length} oculto{pins.filter((p) => p.hidden).length === 1 ? "" : "s"}</span>}
        </div>
      )}
      {edit && help && <PromptHelper onClose={() => setHelp(false)} />}
      <div className="mh-wm-wrap">
        <div className={"mh-wm-view" + (tool === "add" ? " is-add" : "") + (is3d ? " is-3d" : "")}>
          {is3d && (
            <World3D
              tiles={tiles3d}
              edit={edit}
              onTiles={setTiles}
              apiRef={apiRef}
              placing={edit && tool === "add"}
              onPlace={placePin3d}
              onBackground={() => !tool && setSel(null)}
              pins={visible.map((p) => (drag && drag.id === p.id && drag.on ? { ...p, wx: drag.wx, wz: drag.wz } : p))}
              renderPin={(p) => pinBtn(p, true)}
            />
          )}
          {!is3d && fit && fade.prev && <div className="mh-wm-bg is-ready" aria-hidden="true" style={{ backgroundImage: `url("${fade.prev.replace(/"/g, "%22")}")` }} />}
          {!is3d && fit && mapSrc && <div key={mapSrc} className={"mh-wm-bg" + (ready ? " is-ready" : "") + (fade.prev ? " mh-wm-in" : "")} aria-hidden="true" style={{ backgroundImage: `url("${mapSrc.replace(/"/g, "%22")}")` }} />}
          {!is3d && <div className={"mh-wm-canvas" + (ready ? " is-ready" : "")} ref={canvasRef} style={fit ? { aspectRatio: String(ratio), "--wm-r": ratio } : { width: zoom * 100 + "%" }} onClick={onMapClick} onDoubleClick={onMapDbl}>
            {fade.prev && mapSrc && <img className="mh-wm-prev" src={fade.prev} alt="" aria-hidden="true" draggable={false} />}
            {mapSrc ? <img key={mapSrc} className={fade.prev ? "mh-wm-in" : undefined} src={mapSrc} alt="Mapa de mundo" draggable={false} ref={(el) => { if (el && el.complete && el.naturalHeight) { setReady(true); setRatio(el.naturalWidth / el.naturalHeight); } }} onLoad={(e) => { if (e.currentTarget.naturalHeight) { setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight); setReady(true); } }} /> : <div className="mh-wm-load">Cargando el mapa…</div>}
            {!is3d && visible.map((p) => pinBtn(p, false))}
          </div>}
          <div className="mh-wm-zoom" hidden={fit || is3d}>
            <button type="button" aria-label="Acercar" onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))}><ZoomIn size={15} /></button>
            <button type="button" aria-label="Alejar" onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}><ZoomOut size={15} /></button>
          </div>
          {!is3d && seasonMenu && !edit && Object.keys(seasons).length > 0 && (
            <div className="mh-wm-sm">
              <button type="button" className="mh-wm-sm-b" aria-haspopup="true" aria-expanded={smOpen} onClick={() => setSmOpen((v) => !v)} title="Cambiar la estación del mapa">
                <span aria-hidden="true">{season ? SEASONS.find((x) => x.key === season).emoji : "🗺️"}</span> {season ? SEASONS.find((x) => x.key === season).label : "Normal"} <ChevronRight size={12} style={{ transform: smOpen ? "rotate(-90deg)" : "rotate(90deg)" }} />
              </button>
              {smOpen && (
                <div className="mh-wm-sm-l" role="menu">
                  <button type="button" role="menuitem" className={!season ? "is-on" : ""} disabled={!doc.image} onClick={() => (setSeason(""), setSmOpen(false))}>🗺️ Normal</button>
                  {SEASONS.filter((x) => seasons[x.key]).map((x) => (
                    <button key={x.key} type="button" role="menuitem" className={season === x.key ? "is-on" : ""} onClick={() => (setSeason(x.key), setSmOpen(false))}>{x.emoji} {x.label}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!is3d && season && <span className="mh-wm-season">{SEASONS.find((x) => x.key === season).emoji} {SEASONS.find((x) => x.key === season).label}</span>}
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
                  {(edit || showHidden) && pin.sceneId && sceneName(pin.sceneId) && onOpenScene && (
                    <button type="button" className="mh-btn mh-wm-go" onClick={() => onOpenScene(pin.sceneId)}>Ir a la escena «{sceneName(pin.sceneId)}» <ChevronRight size={14} /></button>
                  )}
                  {(edit || showHidden) && (
                    <div className="mh-wm-row">
                      {edit && <button type="button" className="mh-btn-ghost" onClick={() => setEditing(true)}><Pencil size={13} /> Editar</button>}
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
                <PlacePromptHelper title={pin.title === "Nuevo lugar" ? "" : draft.title} text={draft.text} kindLabel={kind.label} />
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
