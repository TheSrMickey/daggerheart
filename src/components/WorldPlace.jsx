"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { generatePlace, isWalkable } from "./worldGen";

// Vista de una localización con el tablero isométrico de las campañas.
// `renderBoard` lo aporta la app (el tablero vive en DaggerheartApp) y recibe terreno, decorados y fichas.
export default function WorldPlace({ place, typeInfo, present, myCharId, myChar, renderBoard, onBack, onMove, onTravel }) {
  const layout = useMemo(() => generatePlace(place), [place]);
  const mine = present.find((p) => p.id === myCharId);
  const [selectedId, setSelectedId] = useState(null);

  const tokens = present.map((p) => ({
    id: "w:" + p.id,
    kind: "pc",
    charId: p.id,
    name: p.name,
    color: p.color,
    x: p.x,
    y: p.y,
    conds: [],
    hp: null,
  }));
  const myTokenId = mine ? "w:" + mine.id : null;

  const move = (x, y) => {
    if (!mine || !isWalkable(layout, x, y)) return;
    if (present.some((p) => p.id !== mine.id && p.x === x && p.y === y)) return;
    onMove(x, y);
  };

  // Movimiento con flechas / WASD.
  useEffect(() => {
    if (!mine) return;
    const onKey = (e) => {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      const d = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault();
      move(mine.x + d[0], mine.y + d[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <button className="mh-btn-ghost" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <ArrowLeft size={14} /> Volver al mapa
        </button>
        <div className="mh-serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--mh-gold-ink)" }}>{place.name}</div>
        <span style={{ fontSize: 12, color: "var(--mh-muted)" }}>{typeInfo.label.replace(/s$/, "")}</span>
        <div style={{ flex: 1 }} />
        {!mine && myChar && (
          <button className="mh-btn" onClick={() => onTravel(layout.spawn)} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <MapPin size={14} /> Viajar aquí con {myChar.f_name || "tu personaje"}
          </button>
        )}
        {mine && <span style={{ fontSize: 12, color: "var(--mh-muted)" }}>Arrastra tu ficha, elígela y pulsa una casilla, o usa las flechas / WASD.</span>}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 560px", minWidth: 0 }}>
          {renderBoard({
            terrain: layout.terrain,
            props: layout.props,
            tokens,
            canMove: (t) => t.id === myTokenId,
            onMove: (_id, x, y) => move(x, y),
            selectedId,
            onSelect: setSelectedId,
          })}
        </div>

        <div style={{ flex: "1 1 200px", maxWidth: 300 }}>
          <div className="mh-serif" style={{ fontSize: 13, color: "var(--mh-muted)", marginBottom: 6 }}>Aquí ahora ({present.length})</div>
          {present.length === 0 && <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--mh-muted)" }}>Nadie por aquí todavía.</div>}
          {present.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "var(--mh-ink3)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: p.color, opacity: p.active ? 1 : 0.5 }} />
              <b style={{ color: "var(--mh-ink)" }}>{p.name}</b>
              <span style={{ color: "var(--mh-muted)", fontSize: 12 }}>{p.cls}{p.owner ? ` · ${p.owner}` : ""}</span>
            </div>
          ))}
          <div className="mh-serif" style={{ fontSize: 13, color: "var(--mh-muted)", margin: "14px 0 6px" }}>Lugares de interés</div>
          {layout.pois.map((poi) => (
            <div
              key={poi.label + poi.x}
              onClick={() => move(poi.x, poi.y)}
              style={{ padding: "5px 8px", borderRadius: 8, fontSize: 13, cursor: mine ? "pointer" : "default", color: "var(--mh-ink3)" }}
              title={mine ? "Ir allí" : ""}
            >
              {poi.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
