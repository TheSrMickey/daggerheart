"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import { MOUSE, Vector3, SRGBColorSpace } from "three";
import { Paintbrush, RotateCw, Tag, Eraser, Crosshair, Sprout, Trash2, Eye, EyeOff, Globe, Dices, Flag, Sun, Snowflake, Leaf } from "lucide-react";
import { useDoc } from "@/lib/campaignDocs";
import { generateWorld } from "@/lib/worldGen";
import { worldKey, WORLD_RADIUS, WORLD_CATS, WORLD_ITEMS, WORLD_ITEM, WORLD_THEMES, hexPos, cellsInRadius } from "@/lib/worldCatalog";

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

// Variantes de estilo del kit: verano (la textura original), invierno (nieve) y otoño.
const THEME_TEX = { invierno: BASE + "Textures/variation-a.png", otono: BASE + "Textures/variation-b.png" };
Object.values(THEME_TEX).forEach((u) => useTexture.preload(u));

function PieceBase({ k, rot, y, map }) {
  const { scene } = useGLTF(BASE + k + ".glb");
  const obj = useMemo(() => {
    const c = scene.clone(true);
    if (map) {
      c.traverse((o) => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.material.map = map;
          o.material.needsUpdate = true;
        }
      });
    }
    return c;
  }, [scene, map]);
  return <primitive object={obj} position={[0, y, 0]} rotation={[0, (-rot * Math.PI) / 3, 0]} />;
}
function ThemedPiece({ url, ...p }) {
  const map = useTexture(url, (t) => {
    t.flipY = false;
    t.colorSpace = SRGBColorSpace;
  });
  return <PieceBase {...p} map={map} />;
}
function Piece({ k, rot = 0, y = 0, theme }) {
  const url = THEME_TEX[theme];
  return url ? <ThemedPiece url={url} k={k} rot={rot} y={y} /> : <PieceBase k={k} rot={rot} y={y} map={null} />;
}

// La pieza del grupo: un peón dorado que salta a la casilla donde se deja. Lo mueven el DJ y los jugadores.
function Party({ x, z, top, grabbed, onPick }) {
  const g = useRef(null);
  const pos = useRef(null);
  useFrame(({ clock }, dt) => {
    const el = g.current;
    if (!el) return;
    if (!pos.current) pos.current = { x, z, y: top };
    const p = pos.current;
    const k = 1 - Math.exp(-dt * 7);
    p.x += (x - p.x) * k;
    p.z += (z - p.z) * k;
    p.y += (top - p.y) * k;
    const travel = Math.hypot(x - p.x, z - p.z);
    el.position.set(p.x, p.y + 0.02 + Math.min(0.55, travel * 0.7) + (grabbed ? 0.22 + Math.sin(clock.elapsedTime * 5) * 0.04 : 0), p.z);
  });
  return (
    <group ref={g} onClick={(e) => { e.stopPropagation(); if (e.delta <= 5) onPick(); }} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.06, 20]} />
        <meshStandardMaterial color="#8a6a24" />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <coneGeometry args={[0.15, 0.42, 20]} />
        <meshStandardMaterial color="#E3B04B" emissive="#E3B04B" emissiveIntensity={grabbed ? 0.7 : 0.15} />
      </mesh>
      <mesh position={[0, 0.54, 0]}>
        <sphereGeometry args={[0.1, 20, 16]} />
        <meshStandardMaterial color="#f3d27a" emissive="#E3B04B" emissiveIntensity={grabbed ? 0.7 : 0.2} />
      </mesh>
    </group>
  );
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

function Tile({ q, r, t, theme }) {
  const [x, z] = hexPos(q, r);
  return (
    <group position={[x, 0, z]}>
      <Suspense fallback={null}>
        <Piece k={t.t} rot={t.r || 0} theme={theme} />
        {t.d && <Piece k={t.d} rot={t.dr || 0} y={WORLD_ITEM[t.t]?.h || 0.2} theme={theme} />}
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

// Aleja o acerca la cámara según lo grande que sea el mapa (solo cuando el tamaño cambia de verdad).
function FitCamera({ extent, controlsRef }) {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const last = useRef(-9);
  useEffect(() => {
    if (Math.abs(extent - last.current) < 2) return;
    last.current = extent;
    const e = Math.max(3, extent);
    // Distancia a la que cabe todo el mapa a lo ancho (con el aspecto real del lienzo) y a lo alto.
    const dist = Math.max(8, ((e * 0.95 + 1.2) / (0.364 * Math.min(aspect, 1.7))) * 0.82);
    camera.position.set(0, dist * 0.82, dist * 0.57);
    camera.lookAt(0, 0, 0);
    const c = controlsRef.current;
    if (c) {
      c.target.set(0, 0, 0);
      c.update();
      c.saveState();
    }
  }, [extent, camera, controlsRef, aspect]);
  return null;
}

const topOf = (t) => (WORLD_ITEM[t?.t]?.h || 0.2) + (t?.d && t.d.startsWith("unit-") ? 0.3 : 0);

function Scene({ tiles, edit, hover, setHover, onCell, selCell, controlsRef, labels, place, theme, party, moving, onParty }) {
  const bg = theme === "invierno" ? "#1a2736" : theme === "otono" ? "#231a14" : "#121b29";
  const ghosts = edit ? CELLS : moving ? CELLS.filter(([q, r]) => tiles[q + "," + r]) : [];
  const pk = party ? party.q + "," + party.r : null;
  const [px, pz] = party ? hexPos(party.q, party.r) : [0, 0];
  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 22, 46]} />
      <hemisphereLight args={["#ffffff", "#5a5240", 0.75]} />
      <directionalLight position={[6, 12, 4]} intensity={1.15} />
      {Object.entries(tiles).map(([key, t]) => {
        const [q, r] = key.split(",").map(Number);
        return <Tile key={key} q={q} r={r} t={t} theme={theme} />;
      })}
      {party && pk && tiles[pk] && <Party x={px} z={pz} top={topOf(tiles[pk])} grabbed={moving} onPick={onParty} />}
      {ghosts.map(([q, r]) => {
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
      {(edit || moving) && hover && (() => {
        const [q, r] = hover.split(",").map(Number);
        return <Outline q={q} r={r} y={tiles[hover] ? topOf(tiles[hover]) : 0.02} color={moving ? "#E3B04B" : "#ffffff"} />;
      })()}
      {edit && selCell && (() => {
        const [q, r] = selCell.split(",").map(Number);
        return <Outline q={q} r={r} y={(WORLD_ITEM[tiles[selCell]?.t]?.h || 0.02) + 0.04} color="#E3B04B" />;
      })()}
      <FitCamera extent={Object.keys(tiles).reduce((m, k) => { const [q, r] = k.split(",").map(Number); return Math.max(m, Math.abs(q), Math.abs(r), Math.abs(-q - r)); }, 0)} controlsRef={controlsRef} />
      <Labels items={labels} place={place} />
      <OrbitControls ref={controlsRef} makeDefault enableDamping maxPolarAngle={1.25} minDistance={3} maxDistance={70} mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }} />
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
  const [moving, setMoving] = useState(false);
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
  const theme = cur.theme || "verano";
  const party = cur.party || null;
  const labels = Object.entries(tiles)
    .filter(([, t]) => t.n && (!t.h || edit))
    .map(([key, t]) => {
      const [q, r] = key.split(",").map(Number);
      const [x, z] = hexPos(q, r);
      return { key, x, z, y: (WORLD_ITEM[t.t]?.h || 0.2) + (t.d ? (WORLD_ITEM[t.d]?.h || 0) : 0) + 0.12, n: t.n, h: !!t.h };
    });
  if (party && tiles[party.q + "," + party.r]) {
    const [x, z] = hexPos(party.q, party.r);
    labels.push({ key: "party", x, z, y: topOf(tiles[party.q + "," + party.r]) + 0.95, n: "Grupo", party: true });
  }
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

  const moveParty = (key) => {
    if (!tiles[key]) return;
    const [q, r] = key.split(",").map(Number);
    apply((d) => ({ ...d, party: { q, r } }));
    setMoving(false);
  };
  const onCell = (key) => {
    if (moving) return moveParty(key);
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
  // Mapa de mundo aleatorio: llena todo el campo con continentes, islas, biomas y lugares con nombre.
  const randomize = () => {
    if (count > 0 && !window.confirm("¿Sustituir el mapa de mundo actual por uno aleatorio?")) return;
    setSelCell(null);
    const g = generateWorld();
    apply((d) => ({ ...d, tiles: g.tiles, theme: g.theme, party: g.party }));
  };
  const clearAll = () => {
    if (!window.confirm("¿Vaciar todo el mapa de mundo?")) return;
    setSelCell(null);
    apply((d) => ({ ...d, tiles: {}, party: null }));
  };
  const cell = selCell ? tiles[selCell] : null;

  const stage = (
    <div className="wm-stage">
      <Canvas camera={{ position: [0, 9, 10], fov: 40 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
        <Scene tiles={tiles} edit={edit} hover={hover} setHover={setHover} onCell={onCell} selCell={tool === "nombrar" ? selCell : null} controlsRef={controlsRef} labels={labels} place={place} theme={theme} party={party} moving={moving} onParty={() => setMoving((m) => !m)} />
      </Canvas>
      <div className="wm-labels" aria-hidden="true">
        {labels.map((l) => (
          <div key={l.key} ref={(el) => (labelRefs.current[l.key] = el)} className={"wm-lbl" + (l.h ? " is-hidden" : "") + (l.party ? " is-party" : "")} style={{ opacity: 0 }}>
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
            <div className="wm-row2">
              <button type="button" className="mh-btn" onClick={randomize}>
                <Dices size={14} /> Mapa aleatorio
              </button>
              <button type="button" className="mh-btn-ghost" onClick={fillStart}>
                <Sprout size={14} /> Terreno inicial
              </button>
            </div>
          )}
        </div>
      )}
      {moving && (
        <div className="wm-banner">
          <Flag size={13} /> Pulsa la casilla a la que quieres llevar al grupo
          <button type="button" onClick={() => setMoving(false)}>Cancelar</button>
        </div>
      )}
      <button type="button" className="wm-center" onClick={() => controlsRef.current?.reset()} title="Volver a la vista inicial" aria-label="Volver a la vista inicial">
        <Crosshair size={15} />
      </button>
      <div className="wm-help">Arrastra para girar · rueda para acercar · botón derecho para mover{party ? " · pulsa al grupo para moverlo" : ""}{edit ? " · pulsa una casilla para aplicar la herramienta" : ""}</div>
    </div>
  );

  if (!edit) return <div className="wm wm-view">{stage}</div>;

  return (
    <div className="wm">
      {stage}
      <aside className="wm-side">
        <div className="wm-sec">
          <span className="wm-lab">Estilo del mapa</span>
          <div className="mh-seg is-fit">
            {WORLD_THEMES.map((t) => {
              const I = t.k === "invierno" ? Snowflake : t.k === "otono" ? Leaf : Sun;
              return (
                <button key={t.k} type="button" className={theme === t.k ? "on" : ""} onClick={() => apply((d) => ({ ...d, theme: t.k }))}>
                  <I size={14} /> {t.n}
                </button>
              );
            })}
          </div>
          <button type="button" className={"mh-btn-ghost" + (moving ? " is-on" : "")} onClick={() => setMoving((m) => !m)} title="Pon o mueve la pieza del grupo: pulsa después la casilla de destino">
            <Flag size={13} /> {party ? "Mover al grupo" : "Colocar al grupo"}
          </button>
        </div>
        <div className="wm-sec">
          <span className="wm-lab">Herramienta</span>
          <div className="mh-seg is-fit">
            {TOOLS.map((t) => (
              <button key={t.key} type="button" className={tool === t.key ? "on" : ""} onClick={() => (setMoving(false), setTool(t.key))} title={t.label}>
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
        <div className="wm-sec">
          <button type="button" className="mh-btn" onClick={randomize} title="Genera un mundo nuevo que ocupa todo el campo: continentes, islas, biomas y lugares con nombre">
            <Dices size={14} /> Generar mapa aleatorio
          </button>
        </div>
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
