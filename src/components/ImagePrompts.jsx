"use client";

import { useMemo, useRef, useState } from "react";
import { Wand2, Copy, Check } from "lucide-react";

// Prompts para generar imágenes con una IA externa: lugares del mapa de mundo y figuras de diálogo.
export const ART_STYLES = [
  { key: "pintado", label: "Pintado de fantasía", txt: "painterly high-detail fantasy digital illustration, rich saturated colors, soft atmospheric lighting, premium tabletop RPG art" },
  { key: "anime", label: "Novela visual / anime", txt: "polished visual-novel / anime illustration, clean line art, soft cel shading, expressive and readable" },
  { key: "cartografico", label: "Ilustración antigua", txt: "aged storybook illustration with hand-inked lines and watercolor washes, warm parchment tones" },
];
const styleOf = (k) => ART_STYLES.find((s) => s.key === k) || ART_STYLES[0];

// Banner de un lugar: la imagen que sale al pulsar su marcador (formato apaisado 16:9).
export function buildPlacePrompt({ world, title, text, kindLabel, view, style }) {
  const st = styleOf(style);
  const subject = [title, text].map((x) => (x || "").trim()).filter(Boolean).join(" — ");
  return [
    "A wide 16:9 banner illustration of " + (subject || "(describe the place here)") + (kindLabel ? " (" + kindLabel.toLowerCase() + ")" : "") + (world.trim() ? ", in " + world.trim() : "") + ".",
    view === "interior" ? "Show the INTERIOR of the place, from eye level, with a clear focal point and lived-in details." : "Show the EXTERIOR of the place in its surroundings, from a slightly low cinematic angle.",
    "Style: " + st.txt + ".",
    "Atmospheric lighting, strong depth with foreground, midground and background, a calm composition with the main subject slightly off-center, and room at the bottom for a caption.",
    "Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO border, NO user interface, NO modern objects.",
  ].join("\n");
}

const POSES = {
  tranquila: "calm, neutral and friendly expression, relaxed posture",
  feliz: "happy, warmly smiling expression, open and cheerful posture",
  enfadada: "angry, frowning expression with intense eyes, tense and confrontational posture",
};

// Figura de un PNJ para los diálogos: personaje de medio cuerpo sobre fondo liso (se recorta después).
export function buildDialoguePrompt({ name, desc, expr, style }) {
  const st = styleOf(style);
  return [
    "Character portrait of " + ((name || "").trim() ? name.trim() + ", " : "") + ((desc || "").trim() || "(describe the character here)") + ".",
    "Waist-up, centered, facing the viewer with a slight three-quarter turn, " + (POSES[expr] || POSES.tranquila) + ".",
    "Style: " + st.txt + ". Same character design, outfit, colors and proportions in every expression.",
    "Isolated on a perfectly plain flat chroma-green (#00FF00) background with no shadows on the background, clean crisp edges so it can be cut out as a transparent PNG, portrait orientation 3:4.",
    "Strictly NO text, NO letters, NO watermark, NO frame, NO other characters, NO props cropped by the edges.",
  ].join("\n");
}

export function CopyPrompt({ text, label = "Copiar prompt", rows = 6 }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const copy = () => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };
    const fb = () => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.select();
      try {
        document.execCommand("copy");
        done();
      } catch (e) {}
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fb);
    else fb();
  };
  return (
    <>
      <textarea ref={ref} className="mh-input mh-wm-out" readOnly rows={rows} value={text} aria-label="Prompt generado" />
      <div className="mh-wm-row">
        <button type="button" className="mh-btn" onClick={copy}>
          {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> {label}</>}
        </button>
      </div>
    </>
  );
}

// Ayuda para ilustrar un lugar (se abre desde el editor del marcador).
export function PlacePromptHelper({ title, text, kindLabel }) {
  const [open, setOpen] = useState(false);
  const [world, setWorld] = useState("");
  const [view, setView] = useState("interior");
  const [style, setStyle] = useState("pintado");
  const out = useMemo(() => buildPlacePrompt({ world, title, text, kindLabel, view, style }), [world, title, text, kindLabel, view, style]);
  if (!open)
    return (
      <button type="button" className="mh-btn-ghost" style={{ alignSelf: "flex-start" }} onClick={() => setOpen(true)}>
        <Wand2 size={13} /> Prompt para ilustrar este lugar
      </button>
    );
  return (
    <div className="mh-wm-prompt">
      <div className="mh-wm-ph">
        <span><Wand2 size={15} /> Prompt de la imagen del lugar</span>
        <button type="button" className="mh-btn-ghost" onClick={() => setOpen(false)}>Cerrar</button>
      </div>
      <p className="mh-wm-note">Usa el nombre y la descripción del marcador (mejor en inglés). Copia el prompt, genera la imagen y súbela en «Imagen».</p>
      <label className="mh-wm-f"><span>Cómo es el mundo (opcional)</span><input className="mh-input" value={world} onChange={(e) => setWorld(e.target.value)} placeholder="a gloomy medieval kingdom of green valleys" /></label>
      <div className="mh-wm-row">
        <label className="mh-wm-f" style={{ flex: 1 }}><span>Qué mostrar</span>
          <select className="mh-input" value={view} onChange={(e) => setView(e.target.value)}><option value="interior">Interior</option><option value="exterior">Exterior</option></select>
        </label>
        <label className="mh-wm-f" style={{ flex: 1 }}><span>Estilo</span>
          <select className="mh-input" value={style} onChange={(e) => setStyle(e.target.value)}>{ART_STYLES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
        </label>
      </div>
      <CopyPrompt text={out} rows={8} />
    </div>
  );
}

// Ayuda para la imagen de diálogo de un PNJ: un prompt por expresión, con el mismo personaje.
export function DialoguePromptHelper({ name, role, exprs = [], current }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState(role || "");
  const [style, setStyle] = useState("pintado");
  const [expr, setExpr] = useState(current || "tranquila");
  const out = useMemo(() => buildDialoguePrompt({ name, desc, expr, style }), [name, desc, expr, style]);
  if (!open)
    return (
      <button type="button" className="mh-btn-ghost" style={{ alignSelf: "flex-start" }} onClick={() => setOpen(true)}>
        <Wand2 size={13} /> Prompt para la imagen del diálogo
      </button>
    );
  return (
    <div className="mh-wm-prompt">
      <div className="mh-wm-ph">
        <span><Wand2 size={15} /> Prompt de la imagen de {name || "el personaje"}</span>
        <button type="button" className="mh-btn-ghost" onClick={() => setOpen(false)}>Cerrar</button>
      </div>
      <p className="mh-wm-note">Describe al personaje en inglés (edad, rasgos, ropa, colores). Genera una imagen por expresión con el mismo prompt, quita el fondo verde (PNG transparente) y súbela en su expresión.</p>
      <label className="mh-wm-f"><span>Cómo es el personaje</span><textarea className="mh-input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="a stern middle-aged innkeeper woman with braided red hair, a green apron and rolled-up sleeves" /></label>
      <div className="mh-wm-row">
        <label className="mh-wm-f" style={{ flex: 1 }}><span>Expresión</span>
          <select className="mh-input" value={expr} onChange={(e) => setExpr(e.target.value)}>{exprs.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select>
        </label>
        <label className="mh-wm-f" style={{ flex: 1 }}><span>Estilo</span>
          <select className="mh-input" value={style} onChange={(e) => setStyle(e.target.value)}>{ART_STYLES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
        </label>
      </div>
      <CopyPrompt text={out} rows={8} />
    </div>
  );
}
