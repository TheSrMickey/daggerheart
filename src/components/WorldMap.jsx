"use client";

import { useState, useEffect, useRef, useCallback, createElement } from "react";
import WorldPlace from "./WorldPlace";
import { Castle, Home, Mountain, Skull, Anchor, Trees, Landmark, Tent } from "lucide-react";

// Tipos de localización: icono y color del marcador.
const TYPES = {
  capital: { label: "Capitales", icon: Castle, color: "#E3B04B" },
  city: { label: "Ciudades", icon: Landmark, color: "#5E93C9" },
  town: { label: "Pueblos", icon: Home, color: "#6FBF73" },
  port: { label: "Puertos", icon: Anchor, color: "#3FB0AE" },
  wild: { label: "Tierras salvajes", icon: Trees, color: "#9FB35A" },
  ruin: { label: "Ruinas y mazmorras", icon: Skull, color: "#C0504A" },
  peak: { label: "Montañas", icon: Mountain, color: "#9B7FD6" },
  camp: { label: "Campamentos", icon: Tent, color: "#C08B5C" },
};

const PLACES = [
  { id: "aurelia", name: "Aurelia", type: "capital", x: 500, y: 300, desc: "Capital del reino. Su palacio de torres doradas se alza sobre el cruce de todos los caminos reales." },
  { id: "valdoria", name: "Valdoria", type: "city", x: 330, y: 250, desc: "Ciudad de eruditos y gremios de magos, famosa por su gran biblioteca y su academia arcana." },
  { id: "karnath", name: "Karn-Athar", type: "city", x: 700, y: 230, desc: "Fortaleza-ciudad enana tallada en la roca. Sus forjas no se apagan nunca." },
  { id: "puertoluna", name: "Puerto Luna", type: "port", x: 585, y: 440, desc: "Bullicioso puerto comercial donde recalan mercaderes, piratas y exploradores de ultramar." },
  { id: "mareazul", name: "Marea Azul", type: "port", x: 215, y: 400, desc: "Aldea pesquera de la costa oeste, con un faro que guía a los barcos entre las rocas." },
  { id: "roblehondo", name: "Roblehondo", type: "town", x: 420, y: 370, desc: "Pueblo agrícola a la sombra de robles centenarios. Su posada es punto de encuentro de aventureros." },
  { id: "piedragris", name: "Piedragris", type: "town", x: 610, y: 330, desc: "Villa minera en las colinas, rica en hierro y plagada de rumores sobre túneles olvidados." },
  { id: "bosquesusurro", name: "Bosque del Susurro", type: "wild", x: 290, y: 330, desc: "Bosque ancestral donde los árboles murmuran. Hogar de druidas, espíritus y criaturas feéricas." },
  { id: "pantanoniebla", name: "Pantano de la Niebla", type: "wild", x: 470, y: 500, desc: "Ciénaga cubierta de bruma perpetua. Se dice que las luces fatuas atraen a los viajeros a su perdición." },
  { id: "picoescarcha", name: "Pico Escarcha", type: "peak", x: 760, y: 120, desc: "La cumbre más alta del mundo, coronada de hielo eterno. Un dragón blanco duerme en su cima." },
  { id: "cordillera", name: "Colmillos del Norte", type: "peak", x: 520, y: 130, desc: "Cordillera afilada que separa el reino de las tierras heladas del norte." },
  { id: "torreceniza", name: "Torre de Ceniza", type: "ruin", x: 840, y: 330, desc: "Ruinas de una antigua torre de hechicería, abrasada por una magia que aún crepita entre sus muros." },
  { id: "cripta", name: "Cripta del Rey Olvidado", type: "ruin", x: 160, y: 200, desc: "Mazmorra funeraria de un monarca sin nombre. Sus guardianes no descansan." },
  { id: "templosumergido", name: "Templo Sumergido", type: "ruin", x: 800, y: 500, desc: "Santuario hundido en la bahía oriental, visible solo con la marea baja." },
  { id: "campovigia", name: "Campamento Vigía", type: "camp", x: 650, y: 400, desc: "Puesto fortificado de la guardia real que vigila los caminos del sureste." },
];

// Costa del continente principal.
const LAND = "M110 190 C130 130 220 90 330 100 C420 60 560 70 640 90 C720 40 840 60 900 140 C950 210 930 300 910 370 C940 450 880 560 780 575 C700 600 640 560 560 570 C480 600 380 570 320 520 C260 540 180 500 160 440 C110 400 90 330 100 260 Z";
// Isla occidental e isla oriental.
const ISLES = [
  "M60 520 C90 490 150 495 165 530 C170 570 120 595 80 580 C50 570 45 540 60 520 Z",
  "M880 80 C910 60 950 75 955 105 C950 130 915 140 890 125 C870 112 868 92 880 80 Z",
];
const MOUNTAINS = [[500, 150], [530, 120], [560, 145], [740, 140], [775, 100], [800, 135], [715, 195], [690, 265]];
const FORESTS = [[270, 300], [300, 360], [260, 355], [320, 300], [360, 320], [235, 270]];
const RIVER = "M530 130 C520 200 540 250 505 300 C480 340 520 400 585 440";

function RegionMap({ selected, setSelected, here, counts, myChar, myCharId, onVisit, onTravelHere }) {
  const [hidden, setHidden] = useState({});
  const [hover, setHover] = useState(null);
  const sel = PLACES.find((p) => p.id === selected);

  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 520px", minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {Object.entries(TYPES).map(([k, t]) => (
            <div
              key={k}
              className={"mh-chip" + (hidden[k] ? "" : " active")}
              style={{ padding: "5px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
              onClick={() => setHidden((h) => ({ ...h, [k]: !h[k] }))}
            >
              <span style={{ width: 8, height: 8, borderRadius: 4, background: t.color }} />
              {t.label}
            </div>
          ))}
        </div>

        <svg
          viewBox="0 0 1000 640"
          role="img"
          aria-label="Mapa del mundo"
          style={{ width: "100%", height: "auto", borderRadius: 12, border: "1px solid var(--mh-line)", display: "block", background: "#1B3A4F" }}
        >
          <defs>
            <pattern id="wm-waves" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10 Q10 4 20 10 T40 10" fill="none" stroke="#FFFFFF14" strokeWidth="1.2" />
            </pattern>
            <radialGradient id="wm-vignette" cx="50%" cy="50%" r="70%">
              <stop offset="60%" stopColor="#00000000" />
              <stop offset="100%" stopColor="#00000066" />
            </radialGradient>
          </defs>
          <rect width="1000" height="640" fill="url(#wm-waves)" />

          {[LAND, ...ISLES].map((d, i) => (
            <g key={i}>
              <path d={d} fill="none" stroke="#9FD3E6" strokeOpacity=".35" strokeWidth="9" strokeLinejoin="round" />
              <path d={d} fill="#CDB98A" stroke="#7A6335" strokeWidth="2" strokeLinejoin="round" />
            </g>
          ))}

          {/* Zonas */}
          <ellipse cx="300" cy="320" rx="85" ry="70" fill="#5E8A4A" opacity=".55" />
          <ellipse cx="470" cy="510" rx="70" ry="38" fill="#5B6B4A" opacity=".6" />
          <ellipse cx="740" cy="150" rx="110" ry="70" fill="#E9F1F5" opacity=".5" />
          <ellipse cx="350" cy="240" rx="90" ry="45" fill="#A9B96B" opacity=".4" />

          <path d={RIVER} fill="none" stroke="#4F9FC4" strokeWidth="4" strokeLinecap="round" />

          {MOUNTAINS.map(([x, y], i) => (
            <path key={i} d={`M${x - 16} ${y + 10} L${x} ${y - 14} L${x + 16} ${y + 10} Z`} fill="#8A8A94" stroke="#4A4A55" strokeWidth="1.5" />
          ))}
          {FORESTS.map(([x, y], i) => (
            <g key={i}>
              <path d={`M${x - 8} ${y + 8} L${x} ${y - 10} L${x + 8} ${y + 8} Z`} fill="#2F6B3A" />
              <rect x={x - 1.5} y={y + 8} width="3" height="4" fill="#4A3320" />
            </g>
          ))}

          {/* Caminos */}
          <g fill="none" stroke="#7A5A2A" strokeWidth="2" strokeDasharray="6 5" opacity=".7">
            <path d="M500 300 L330 250" />
            <path d="M500 300 L700 230" />
            <path d="M500 300 L420 370 L470 500" />
            <path d="M500 300 L610 330 L585 440" />
            <path d="M610 330 L650 400 L585 440" />
          </g>

          {/* Etiquetas de regiones */}
          <g fontFamily="serif" fontStyle="italic" fill="#3B2C12" opacity=".6" textAnchor="middle">
            <text x="640" y="200" fontSize="22">Reino de Aurelia</text>
            <text x="760" y="60" fontSize="16" fill="#E9F1F5">Tierras Heladas</text>
          </g>
          <g fontFamily="serif" fontStyle="italic" fill="#CFE8F2" opacity=".55" textAnchor="middle">
            <text x="120" y="130" fontSize="26">Mar de Cristal</text>
            <text x="880" y="610" fontSize="24">Océano Oriental</text>
            <text x="320" y="615" fontSize="22">Golfo de la Aurora</text>
          </g>

          {/* Marcadores */}
          {PLACES.filter((p) => !hidden[p.type]).map((p) => {
            const t = TYPES[p.type];
            const active = p.id === selected;
            const big = p.type === "capital";
            const r = big ? 15 : 11;
            return (
              <g
                key={p.id}
                transform={`translate(${p.x} ${p.y})`}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(p.id)}
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover(null)}
              >
                {active && <circle r={r + 8} fill={t.color} opacity=".3" />}
                <circle r={r} fill={t.color} stroke="#1F1606" strokeWidth={active ? 3 : 2} />
                <circle r={r - 5} fill="#1F1606" opacity=".35" />
                <text y={r + 15} textAnchor="middle" fontSize={big ? 15 : 12.5} fontFamily="serif" fontWeight="700" fill="#1F1606" stroke="#F4E9CC" strokeWidth="3" paintOrder="stroke">
                  {p.name}
                </text>
                <title>{p.name}</title>
                {counts[p.id] > 0 && (
                  <g transform={`translate(${r} ${-r})`}>
                    <circle r="9" fill="#C0504A" stroke="#fff" strokeWidth="1.5" />
                    <text textAnchor="middle" y="4" fontSize="11" fontWeight="800" fill="#fff">{counts[p.id]}</text>
                  </g>
                )}
                {hover === p.id && <circle r={r + 3} fill="none" stroke="#fff" strokeWidth="1.5" />}
              </g>
            );
          })}

          {/* Rosa de los vientos */}
          <g transform="translate(70 70)" fill="#F4E9CC" stroke="#1F1606" strokeWidth="1.5">
            <circle r="34" fill="#00000040" stroke="#F4E9CC" strokeOpacity=".5" />
            <path d="M0 -30 L7 0 L0 30 L-7 0 Z" />
            <path d="M-30 0 L0 -7 L30 0 L0 7 Z" fill="#E3B04B" />
            <text y="-38" textAnchor="middle" fontSize="14" fontWeight="700" stroke="none">N</text>
          </g>
          <rect width="1000" height="640" fill="url(#wm-vignette)" pointerEvents="none" />
        </svg>
      </div>

      <div style={{ flex: "1 1 240px", maxWidth: 360 }}>
        {sel && (
          <div style={{ border: "1px solid var(--mh-line)", borderRadius: 12, padding: 14, background: "var(--mh-panel, transparent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 34, height: 34, borderRadius: 17, background: TYPES[sel.type].color, display: "grid", placeItems: "center", color: "#1F1606" }}>
                {createElement(TYPES[sel.type].icon, { size: 18 })}
              </span>
              <div>
                <div className="mh-serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--mh-gold-ink)" }}>{sel.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--mh-muted)" }}>{TYPES[sel.type].label.replace(/s$/, "")}</div>
              </div>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--mh-ink3)" }}>{sel.desc}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <button className="mh-btn" onClick={() => onVisit(sel.id)}>Visitar</button>
              {myChar && (
                <button className="mh-btn-ghost" onClick={() => onTravelHere(sel.id)}>Viajar con {myChar.f_name || "mi personaje"}</button>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--mh-muted)" }}>
              {here.length === 0 ? "Nadie por aquí ahora mismo." : "Aquí ahora: " + here.map((h) => h.name + (h.id === myCharId ? " (tú)" : "")).join(", ")}
            </div>
          </div>
        )}
        <div className="mh-serif" style={{ margin: "14px 0 6px", fontSize: 13, color: "var(--mh-muted)" }}>Localizaciones</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 320, overflowY: "auto" }}>
          {PLACES.map((p) => {
            const t = TYPES[p.type];
            return (
              <div
                key={p.id}
                onClick={() => { setSelected(p.id); setHidden((h) => ({ ...h, [p.type]: false })); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer", fontSize: 13, background: p.id === selected ? "#E3B04B1F" : "transparent", color: "var(--mh-ink3)" }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 5, background: t.color, flex: "none" }} />
                {p.name}{counts[p.id] > 0 && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--mh-muted)" }}>{counts[p.id]} 👤</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const PRESENCE_KEY = "world-presence";
const ACTIVE_MS = 5 * 60 * 1000;
const POLL_MS = 4000;
const parse = (v) => {
  try {
    return JSON.parse(v) || {};
  } catch {
    return {};
  }
};

// Mapa vivo: personajes de todos los jugadores repartidos por el mundo, guardados en el almacén compartido.
export default function WorldMap({ characters = {}, playerName = "", classColor = () => "#E3B04B", store }) {
  const [selected, setSelected] = useState("aurelia");
  const [visiting, setVisiting] = useState(null);
  const [presence, setPresence] = useState({});
  const [myCharId, setMyCharId] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const presenceRef = useRef({});

  const myChars = Object.entries(characters).map(([id, c]) => ({ id, ...c }));
  const effectiveId = myChars.some((c) => c.id === myCharId) ? myCharId : myChars[0]?.id || "";
  const myChar = myChars.find((c) => c.id === effectiveId) || null;

  // Sondeo del estado compartido: cada jugador ve moverse a los demás.
  useEffect(() => {
    if (!store) return;
    let alive = true;
    const load = async () => {
      const r = await store.get(PRESENCE_KEY, true);
      if (!alive) return;
      const data = r ? parse(r.value) : {};
      presenceRef.current = data;
      setPresence(data);
      setNow(Date.now());
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [store]);

  // Lee lo último, cambia solo la entrada de mi personaje y guarda.
  const writeMine = useCallback(
    async (charId, patch) => {
      const c = characters[charId];
      if (!c || !store) return;
      const r = await store.get(PRESENCE_KEY, true);
      const data = r ? parse(r.value) : { ...presenceRef.current };
      data[charId] = {
        ...(data[charId] || {}),
        name: c.f_name || "Sin nombre",
        cls: c.f_class || "",
        color: classColor(c.f_class),
        owner: playerName,
        ...patch,
        t: Date.now(),
      };
      presenceRef.current = data;
      setPresence(data);
      await store.set(PRESENCE_KEY, JSON.stringify(data), true);
    },
    [characters, playerName, classColor, store],
  );

  const entries = Object.entries(presence).map(([id, v]) => ({ id, ...v, active: now - (v.t || 0) < ACTIVE_MS }));
  const at = (placeId) => entries.filter((e) => e.place === placeId);
  const counts = {};
  entries.forEach((e) => {
    if (e.active) counts[e.place] = (counts[e.place] || 0) + 1;
  });

  const travel = (placeId, spawn) => {
    if (!myChar) return;
    writeMine(myChar.id, { place: placeId, x: spawn.x, y: spawn.y });
  };
  const place = PLACES.find((p) => p.id === visiting);

  return (
    <div>
      {myChars.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13, color: "var(--mh-muted)" }}>
          Mi personaje en el mundo:
          <select className="mh-input" style={{ width: "auto" }} value={effectiveId} onChange={(e) => setMyCharId(e.target.value)}>
            {myChars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.f_name || "Sin nombre"}
                {presence[c.id] ? ` — ${PLACES.find((p) => p.id === presence[c.id].place)?.name || ""}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      {place ? (
        <WorldPlace
          place={place}
          typeInfo={TYPES[place.type]}
          present={at(place.id)}
          myCharId={effectiveId}
          myChar={myChar}
          onBack={() => setVisiting(null)}
          onMove={(x, y) => writeMine(effectiveId, { x, y })}
          onTravel={(spawn) => travel(place.id, spawn)}
        />
      ) : (
        <RegionMap
          selected={selected}
          setSelected={setSelected}
          here={at(selected)}
          counts={counts}
          myChar={myChar}
          myCharId={effectiveId}
          onVisit={setVisiting}
          onTravelHere={(id) => {
            setVisiting(id);
            // El punto de entrada lo calcula la vista de la localización; aquí se coloca al llegar.
            import("./worldGen").then(({ generatePlace }) => travel(id, generatePlace(PLACES.find((p) => p.id === id)).spawn));
          }}
        />
      )}
    </div>
  );
}
