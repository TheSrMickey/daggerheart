import { mutateDoc } from "@/lib/campaignDocs";

// Registro de hitos de la campaña: lo que alimenta la Crónica y la Línea de tiempo.
export const logKey = (id) => "campaign-log:" + id;
export const chronKey = (id) => "campaign-chronicle:" + id;

export const TYPES = {
  escena: { label: "Escena", color: "#C9A24A" },
  combate: { label: "Combate", color: "#E0544A" },
  pista: { label: "Pista", color: "#7FB77A" },
  nivel: { label: "Subida de nivel", color: "#E3B04B" },
  critico: { label: "Crítico", color: "#F0786A" },
  descanso: { label: "Descanso", color: "#8E6FC4" },
  voto: { label: "Votación", color: "#5E93C9" },
};

const clean = (t) => String(t || "").replace(/^\s*\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*\s*/u, "").trim();

// Convierte un mensaje del chat en un hito (o null si no merece quedar en la crónica).
export function classify(e) {
  const text = String(e.text || "");
  const who = e.author || "";
  if (e.kind === "event" && e.gm && e.icon === "escena") return { type: "escena", who: "El DJ", text: (text.match(/«(.+?)»/) || [])[1] || clean(text), long: text };
  if (e.kind === "event" && e.gm && e.icon === "pistas") return { type: "pista", who: "El DJ", text: clean(text) };
  if (e.kind === "share" && e.share?.type === "handout") return { type: "pista", who, text: (e.share.name || e.share.handout?.title || "Pista") + " entregada" };
  if (e.kind === "roll" && e.roll && e.roll.hope != null && e.roll.hope === e.roll.fear && !e.roll.reaction) return { type: "critico", who, text: "Crítico de " + who + " (" + e.roll.hope + "+" + e.roll.fear + ")" };
  if (e.kind === "event" && /^\s*⬆/.test(text)) return { type: "nivel", who, text: who + " " + clean(text).toLowerCase() };
  if (e.kind === "event" && /(^\s*(⚔|💥)|de Vida)/u.test(text)) return { type: "combate", who, text: clean(text) };
  if (/^\s*😴/u.test(text) && /terminado/.test(text)) return { type: "descanso", who: "El DJ", text: clean(text) };
  if (/^\s*🗳/u.test(text) && /→/.test(text)) return { type: "voto", who: "El DJ", text: clean(text) };
  return null;
}

export function appendLog(campaignId, entry) {
  const rec = classify(entry);
  if (!rec || !campaignId) return;
  mutateDoc(logKey(campaignId), [], (a) => [...(Array.isArray(a) ? a : []), { ts: entry.ts || Date.now(), ...rec }].slice(-600)).catch(() => {});
}

export const dayOf = (ts) => { const d = new Date(ts); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
