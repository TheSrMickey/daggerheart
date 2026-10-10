"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { MOUSE, Vector3 } from "three";
import { Paintbrush, RotateCw, Tag, Eraser, Crosshair, Sprout, Trash2, Eye, EyeOff, Globe } from "lucide-react";
import { useDoc } from "@/lib/campaignDocs";
import { worldKey, WORLD_RADIUS, WORLD_CATS, WORLD_ITEMS, WORLD_ITEM, hexPos, cellsInRadius } from "@/lib/worldCatalog";

// Mapa de mundo: casillas hexagonales en 3D (Three.js con React Three Fiber y el Hexagon Kit de Kenney).
// El DJ lo dibuja y los jugadores lo ven (y lo giran) cuando lo pone en directo.
const BASE = "/mundo/modelos/";
const EMPTY = { tiles: {} };
const CELLS = cellsInRadius(WORLD_RADIUS);
const hexLine = (() => {
  const a = [];
  for (let i = 0; i < 6; i++) {
    const t = (Math.PI / 3) * i;
    a.push(Math.sin(t) * 0.56, 0, Math.cos(t) * 0.56);
  }
  return new Float32Array(a);
})();

// Se descargan todas las piezas al abrir el mapa (unos 1,7 MB) para que al pintar no haya huecos.
Object.keys(WORLD_ITEM).forEach((k) => useGLTF.preload(BASE + k + ".glb"));

function Piece({ k, rot = 0, y = 0 }) {
  const { scene } = useGLTF(BASE + k + ".glb");
  const obj = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={obj} position={[0, y, 0]} rotation={[0, (-rot * Math.PI) / 3, 0]} />;
}

function Outline({ q, r, y, color }) {
  const [x, z] = hexPos(q, r);
  return (
    <lineLoop position={[x, y + 0.04, z]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[hexLine, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} />
    </lineLoop>
  );
}

function Tile({ q, r, t }) {
  const [x, z] = hexPos(q, r);
  return (
    <group position={[x, 0, z]}>
      <Suspense fallback={null}>
        <Piece k={t.t} rot={t.r || 0} />
        {t.d && <Piece k={t.d} rot={t.dr || 0} y={WORLD_ITEM[t.t]?.h || 0.2} />}
      </Suspense>
    </group>
  );
}

// Posiciona cada nombre (un div normal fuera del lienzo) sobre su casilla proyectando su punto 3D a la pantalla.
function Labels({ items, place }) {
  const v = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    for (const it of items) {
      v.set(it.x, it.y, it.z).project(camera);
      place(it.key, ((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height, v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2);
    }
  });
  return null;
}

function Scene({ tiles, edit, hover, setHover, onCell, selCell, controlsRef, labels, place }) {
  return (
    <>
      <color attach="background" args={["#121b29"]} />
      <fog attach="fog" args={["#121b29", 22, 46]} />
      <hemisphereLight args={["#ffffff", "#5a5240", 0.75]} />
      <directionalLight position={[6, 12, 4]} intensity={1.15} />
      {Object.entries(tiles).map(([key, t]) => {
        const [q, r] = key.split(",").map(Number);
        return <Tile key={key} q={q} r={r} t={t} />;
      })}
      {edit &&
        CELLS.map(([q, r]) => {
          const [x, z] = hexPos(q, r);
          const key = q + "," + r;
          const on = hover === key;
          return (
            <mesh
              key={key}
              position={[x, 0.02, z]}
              onPointerOver={(e) => (e.stopPropagation(), setHover(key), (document.body.style.cursor = "pointer"))}
              onPointerOut={() => (setHover((h) => (h === key ? null : h)), (document.body.style.cursor = ""))}
              onClick={(e) => {
                e.stopPropagation();
                if (e.delta > 5) return;
                onCell(key);
              }}
            >
              <cylinderGeometry args={[0.575, 0.575, 0.04, 6]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={tiles[key] ? 0 : on ? 0.3 : 0.045} />
            </mesh>
          );
        })}
      {edit && hover && (() => {
        const [q, r] = hover.split(",").map(Number);
        return <Outline q={q} r={r} y={(WORLD_ITEM[tiles[hover]?.t]?.h || 0.02) + (tiles[hover]?.d ? 0.3 : 0)} color="#ffffff" />;
      })()}
      {edit && selCell && (() => {
        const [q, r] = selCell.split(",").map(Number);
        return <Outline q={q} r={r} y={(WORLD_ITEM[tiles[selCell]?.t]?.h || 0.02) + 0.04} color="#E3B04B" />;
      })()}
      <Labels items={labels} place={place} />
      <OrbitControls ref={controlsRef} makeDefault enableDamping maxPolarAngle={1.25} minDistance={3} maxDistance={26} mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }} />
    </>
  );
}

const TOOLS = [
  { key: "pintar", label: "Pintar", Icon: Paintbrush },
  { key: "girar", label: "Girar", Icon: RotateCw },
  { key: "nombrar", label: "Nombrar", Icon: Tag },
  { key: "borrar", label: "Borrar", Icon: Eraser },
];

export default function WorldMap({ campaignId, edit = false }) {
  const [doc, update] = useDoc(worldKey(campaignId), EMPTY, 4000);
  const [opt, setOpt] = useState(null);
  const pending = useRef(0);
  const controlsRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [cat, setCat] = useState("terreno");
  const [sel, setSel] = useState("grass");
  const [tool, setTool] = useState("pintar");
  const [brushRot, setBrushRot] = useState(0);
  const [selCell, setSelCell] = useState(null);
  const labelRefs = useRef({});
  // Mueve el nombre de una casilla a su posición en pantalla (se llama en cada fotograma).
  const place = (key, x, y, vis) => {
    const el = labelRefs.current[key];
    if (!el) return;
    el.style.opacity = vis ? "1" : "0";
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  };
  const cur = opt || doc;
  const tiles = cur.tiles || {};
  const labels = Object.entries(tiles)
    .filter(([, t]) => t.n && (!t.h || edit))
    .map(([key, t]) => {
      const [q, r] = key.split(",").map(Number);
      const [x, z] = hexPos(q, r);
      return { key, x, z, y: (WORLD_ITEM[t.t]?.h || 0.2) + (t.d ? (WORLD_ITEM[t.d]?.h || 0) : 0) + 0.12, n: t.n, h: !!t.h };
    });
  const count = Object.keys(tiles).length;

  // El cambio se ve al momento y se guarda en segundo plano.
  const apply = (fn) => {
    pending.current += 1;
    setOpt(fn(cur));
    update(fn).finally(() => {
      pending.current -= 1;
      if (pending.current === 0) setOpt(null);
    });
  };
  const setTile = (key, fn) =>
    apply((d) => {
      const ts = { ...(d.tiles || {}) };
      const next = fn(ts[key] ? { ...ts[key] } : null);
      if (next) ts[key] = next;
      else delete ts[key];
      return { ...d, tiles: ts };
    });

  const onCell = (key) => {
    if (tool === "nombrar") return setSelCell(key);
    if (tool === "borrar") return setTile(key, (t) => (t && t.d ? { ...t, d: undefined, dr: undefined } : null));
    if (tool === "girar") return setTile(key, (t) => (t ? (t.d ? { ...t, dr: ((t.dr || 0) + 1) % 6 } : { ...t, r: ((t.r || 0) + 1) % 6 }) : t));
    const item = WORLD_ITEM[sel];
    if (!item) return;
    setTile(key, (t) => (item.cat === "detalles" ? { ...(t || { t: "grass", r: 0 }), d: sel, dr: brushRot } : { ...(t || {}), t: sel, r: brushRot }));
  };
  const fillStart = () =>
    apply((d) => {
      const ts = { ...(d.tiles || {}) };
      cellsInRadius(3).forEach(([q, r]) => {
        const k = q + "," + r;
        if (!ts[k]) ts[k] = { t: Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) === 3 ? "water" : "grass", r: 0 };
      });
      return { ...d, tiles: ts };
    });
  const clearAll = () => {
    if (!window.confirm("¿Vaciar todo el mapa de mundo?")) return;
    setSelCell(null);
    apply((d) => ({ ...d, tiles: {} }));
  };
  const cell = selCell ? tiles[selCell] : null;

  const stage = (
    <div className="wm-stage">
      <Canvas camera={{ position: [0, 9, 10], fov: 40 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
        <Scene tiles={tiles} edit={edit} hover={hover} setHover={setHover} onCell={onCell} selCell={tool === "nombrar" ? selCell : null} controlsRef={controlsRef} labels={labels} place={place} />
      </Canvas>
      <div className="wm-labels" aria-hidden="true">
        {labels.map((l) => (
          <div key={l.key} ref={(el) => (labelRefs.current[l.key] = el)} className={"wm-lbl" + (l.h ? " is-hidden" : "")} style={{ opacity: 0 }}>
            {l.h && <EyeOff size={11} />}
            {l.n}
          </div>
        ))}
      </div>
      {count === 0 && (
        <div className="wm-empty">
          <Globe size={26} strokeWidth={1.6} />
          <div>{edit ? "El mapa de mundo está vacío. Empieza con el terreno inicial o pinta casillas del cuadrado." : "El DJ todavía no ha dibujado el mapa de mundo."}</div>
          {edit && (
            <button type="button" className="mh-btn" onClick={fillStart}>
              <Sprout size={14} /> Crear terreno inicial
            </button>
          )}
        </div>
      )}
      <button type="button" className="wm-center" onClick={() => controlsRef.current?.reset()} title="Volver a la vista inicial" aria-label="Volver a la vista inicial">
        <Crosshair size={15} />
      </button>
      <div className="wm-help">Arrastra para girar · rueda para acercar · botón derecho para mover{edit ? " · pulsa una casilla para aplicar la herramienta" : ""}</div>
    </div>
  );

  if (!edit) return <div className="wm wm-view">{stage}</div>;

  return (
    <div className="wm">
      {stage}
      <aside className="wm-side">
        <div className="wm-sec">
          <span className="wm-lab">Herramienta</span>
          <div className="mh-seg is-fit">
            {TOOLS.map((t) => (
              <button key={t.key} type="button" className={tool === t.key ? "on" : ""} onClick={() => setTool(t.key)} title={t.label}>
                <t.Icon size={14} /> {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="wm-sec">
          <span className="wm-lab">Piezas</span>
          <div className="mh-seg is-fit">
            {WORLD_CATS.map((c) => (
              <button key={c.key} type="button" className={cat === c.key ? "on" : ""} onClick={() => setCat(c.key)}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="wm-pal">
            {WORLD_ITEMS[cat].map((i) => (
              <button key={i.k} type="button" className={"wm-it" + (sel === i.k && tool === "pintar" ? " on" : "")} onClick={() => (setSel(i.k), setTool("pintar"))} title={i.n}>
                <img src={"/mundo/previews/" + i.k + ".png"} alt="" loading="lazy" />
                <span>{i.n}</span>
              </button>
            ))}
          </div>
          <button type="button" className="mh-btn-ghost" onClick={() => setBrushRot((r) => (r + 1) % 6)} title="Gira la pieza antes de colocarla (ríos, caminos…)">
            <RotateCw size={13} /> Orientación de la pieza: {brushRot * 60}°
          </button>
        </div>
        {tool === "nombrar" && (
          <div className="wm-sec">
            <span className="wm-lab">Nombre del lugar</span>
            {cell ? (
              <>
                <input key={selCell} className="mh-input" defaultValue={cell.n || ""} placeholder="Ej.: Puerto Marea" maxLength={40} onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (cell.n || "")) setTile(selCell, (t) => (t ? { ...t, n: v || undefined } : t));
                  }} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
                <label className="wm-chk">
                  <input type="checkbox" checked={!!cell.h} onChange={(e) => setTile(selCell, (t) => (t ? { ...t, h: e.target.checked || undefined } : t))} />
                  <EyeOff size={13} /> Oculto para los jugadores
                </label>
              </>
            ) : (
              <p className="wm-note">Pulsa una casilla con terreno para ponerle nombre.</p>
            )}
          </div>
        )}
        <div className="wm-sec wm-row">
          <button type="button" className="mh-btn-ghost" onClick={fillStart}>
            <Sprout size={13} /> Terreno inicial
          </button>
          <button type="button" className="mh-btn-ghost" onClick={clearAll} disabled={!count}>
            <Trash2 size={13} /> Vaciar
          </button>
        </div>
        <p className="wm-note">
          <Eye size={12} /> Los jugadores ven este mapa cuando lo pones en directo desde «Mesa». {count} casilla{count === 1 ? "" : "s"}.
        </p>
      </aside>
    </div>
  );
}
