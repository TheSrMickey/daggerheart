"use client";

import { useEffect, useMemo } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { generatePlace, isWalkable, GRID_W, GRID_H, TILE_STYLE } from "./worldGen";

const TILE = 32;

// Vista de una localización como mapa de cuadrícula, con los personajes presentes.
export default function WorldPlace({ place, typeInfo, present, myCharId, myChar, onBack, onMove, onTravel }) {
  const { grid, pois, spawn } = useMemo(() => generatePlace(place), [place]);
  const mine = present.find((p) => p.id === myCharId);

  // Movimiento con flechas / WASD.
  useEffect(() => {
    if (!mine) return;
    const onKey = (e) => {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      const d = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault();
      const nx = mine.x + d[0], ny = mine.y + d[1];
      if (isWalkable(grid, nx, ny)) onMove(nx, ny);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mine, grid, onMove]);

  const clickTile = (x, y) => {
    if (!mine || !isWalkable(grid, x, y)) return;
    onMove(x, y);
  };

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
          <button className="mh-btn" onClick={() => onTravel(spawn)} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <MapPin size={14} /> Viajar aquí con {myChar.f_name || "tu personaje"}
          </button>
        )}
        {mine && <span style={{ fontSize: 12, color: "var(--mh-muted)" }}>Haz clic en una casilla o usa las flechas / WASD para moverte.</span>}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
        <svg
          viewBox={`0 0 ${GRID_W * TILE} ${GRID_H * TILE}`}
          role="img"
          aria-label={`Mapa de ${place.name}`}
          style={{ flex: "1 1 560px", minWidth: 0, width: "100%", height: "auto", borderRadius: 12, border: "1px solid var(--mh-line)", background: "#222" }}
        >
          {grid.map((row, y) =>
            row.map((ch, x) => {
              const st = TILE_STYLE[ch] || TILE_STYLE["."];
              const walk = isWalkable(grid, x, y);
              return (
                <g key={`${x}-${y}`} onClick={() => clickTile(x, y)} style={{ cursor: mine && walk ? "pointer" : "default" }}>
                  <rect x={x * TILE} y={y * TILE} width={TILE} height={TILE} fill={(x + y) % 2 ? st.fill : st.alt} stroke="#00000022" strokeWidth="1" />
                  {ch === "t" && <circle cx={x * TILE + TILE / 2} cy={y * TILE + TILE / 2} r="11" fill="#1F4F2A" />}
                  {ch === "o" && <path d={`M${x * TILE + 6} ${y * TILE + 26} L${x * TILE + 16} ${y * TILE + 6} L${x * TILE + 26} ${y * TILE + 26} Z`} fill="#6A6A74" />}
                  {ch === "x" && <circle cx={x * TILE + TILE / 2} cy={y * TILE + TILE / 2} r="9" fill="#F2A23A" stroke="#7A2E0E" strokeWidth="2" />}
                  {ch === "d" && <rect x={x * TILE + 9} y={y * TILE + 6} width="14" height="20" rx="3" fill="#5A3A14" />}
                </g>
              );
            }),
          )}

          {pois.map((p) => (
            <text key={p.label} x={p.x * TILE + TILE / 2} y={p.y * TILE + 4} textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="serif" fill="#1F1606" stroke="#F4E9CC" strokeWidth="3" paintOrder="stroke" pointerEvents="none">
              {p.label}
            </text>
          ))}

          {present.map((p) => {
            const isMe = p.id === myCharId;
            return (
              <g key={p.id} transform={`translate(${p.x * TILE + TILE / 2} ${p.y * TILE + TILE / 2})`} pointerEvents="none" opacity={p.active ? 1 : 0.55}>
                <circle r="13" fill={p.color} stroke={isMe ? "#FFFFFF" : "#1F1606"} strokeWidth={isMe ? 3 : 2} />
                <text textAnchor="middle" y="4.5" fontSize="12" fontWeight="800" fill="#1F1606">{(p.name || "?").slice(0, 1).toUpperCase()}</text>
                <text textAnchor="middle" y="-18" fontSize="11" fontWeight="700" fill="#FFF" stroke="#000" strokeWidth="3" paintOrder="stroke">{p.name}</text>
              </g>
            );
          })}
        </svg>

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
          <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--mh-muted)", lineHeight: 1.6 }}>
            Casillas: hierba, camino, muro, edificio, agua (no se cruza), árbol. Los personajes atenuados llevan un rato inactivos.
          </div>
        </div>
      </div>
    </div>
  );
}
