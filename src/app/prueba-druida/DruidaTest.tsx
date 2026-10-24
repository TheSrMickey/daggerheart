"use client";

import { useState } from "react";
import { AnimatedSplash } from "@/components/AnimatedSplash";

export default function DruidaTest() {
  const [on, setOn] = useState(true);
  const [k, setK] = useState(1);
  const pill = (a: boolean) => ({ all: "unset" as const, cursor: "pointer", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: a ? "#1c1405" : "#e8ecf8", background: a ? "#E3B04B" : "rgba(14,16,40,.78)", border: "1px solid rgba(255,255,255,.18)" });
  return (
    <div style={{ position: "fixed", inset: 0, background: "radial-gradient(900px 600px at 50% 40%, #16301f 0%, #0c1722 55%, #080a1a 100%)", fontFamily: "Inter, system-ui, sans-serif", color: "#e8ecf8", overflow: "auto" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: 16 }}>
        <button type="button" style={pill(on)} onClick={() => setOn(true)}>Animado</button>
        <button type="button" style={pill(!on)} onClick={() => setOn(false)}>Estático</button>
        <button type="button" style={pill(k === 0.6)} onClick={() => setK(0.6)}>Suave</button>
        <button type="button" style={pill(k === 1)} onClick={() => setK(1)}>Normal</button>
        <button type="button" style={pill(k === 1.7)} onClick={() => setK(1.7)}>Marcado</button>
        <a href="/" style={{ color: "#e8ecf8", fontSize: 13, textDecoration: "none", padding: "9px 12px", background: "rgba(14,16,40,.78)", borderRadius: 10, border: "1px solid rgba(255,255,255,.18)" }}>Volver</a>
        <span style={{ fontSize: 12, opacity: 0.75 }}>Prueba temporal · mueve el ratón sobre la imagen para el parallax</span>
      </div>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", justifyContent: "center", flexWrap: "wrap", padding: "0 16px 24px" }}>
        <AnimatedSplash src="/clases/druida.webp" animate={on} intensity={k} style={{ width: "min(560px, 92vw)", height: "min(680px, 78vh)" }} />
        <div>
          <p style={{ fontSize: 12, opacity: 0.7, margin: "0 0 8px" }}>Así quedaría en la lista de personajes</p>
          <div style={{ width: 300, borderRadius: 18, overflow: "hidden", background: "linear-gradient(160deg, #1a3a26, #101a2e)", border: "1.5px solid rgba(120,200,120,.35)", boxShadow: "0 10px 30px rgba(0,0,0,.4)" }}>
            <AnimatedSplash src="/clases/druida.webp" animate={on} intensity={k} style={{ width: 300, height: 260 }} />
            <div style={{ padding: "10px 14px 14px" }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Kaelen Vox</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Druida · Nv 1</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
