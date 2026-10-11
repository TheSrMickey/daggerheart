"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useTexture, Stars } from "@react-three/drei";
import { MOUSE, Vector3, SRGBColorSpace, Color, Fog, CanvasTexture, Matrix4 } from "three";
import { Paintbrush, RotateCw, Tag, Eraser, Crosshair, Sprout, Trash2, Eye, EyeOff, Globe, Dices, Flag, Sun, Snowflake, Leaf, Sunrise, Sunset, Moon, CloudRain, CloudLightning, CloudFog, Repeat, KeyRound, Footprints, Tent } from "lucide-react";
import { useDoc } from "@/lib/campaignDocs";
import { generateWorld } from "@/lib/worldGen";
import { worldKey, WORLD_RADIUS, WORLD_CATS, WORLD_ITEMS, WORLD_ITEM, WORLD_THEMES, HABITATS, TERRAIN_NAMES, ENCOUNTERS, HEX_DIRS, rollEncounterName, rollDice, nowMs, defaultTerrain, hexPos, cellsInRadius } from "@/lib/worldCatalog";

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

// ---------- Ambiente: hora del día, clima y estaciones ----------
const TIMES = {
  amanecer: { hemi: "#ffe6cc", ground: "#5a4a3a", hi: 0.7, dir: "#ffc99a", di: 1.0, pos: [10, 4, 2], star: 0, bg: "#3b2c3f" },
  dia: { hemi: "#ffffff", ground: "#5a5240", hi: 0.75, dir: "#ffffff", di: 1.15, pos: [6, 12, 4], star: 0, bg: null },
  atardecer: { hemi: "#ffe0c4", ground: "#4a3a44", hi: 0.68, dir: "#ffb98a", di: 1.0, pos: [-10, 5, 3], star: 0, bg: "#3a2433" },
  noche: { hemi: "#7f96d8", ground: "#222a42", hi: 0.5, dir: "#9db4ff", di: 0.55, pos: [-4, 10, 6], star: 1, bg: "#060a14" },
};
const CYCLE = ["amanecer", "dia", "atardecer", "noche"];
const DAY_BG = { verano: "#18304a", invierno: "#25384e", otono: "#34261c" };
const WEATHER = {
  despejado: { k: 1, gray: 0, fog: [24, 52] },
  lluvia: { k: 0.7, gray: 0.35, fog: [14, 38] },
  tormenta: { k: 0.5, gray: 0.55, fog: [10, 30] },
  nieve: { k: 0.85, gray: 0.25, fog: [14, 40] },
  niebla: { k: 0.75, gray: 0.5, fog: [5, 24] },
};
export const CYCLE_MS = 6 * 60 * 1000; // un día completo dura 6 minutos
const SNOWY = new Set(["stone-mountain", "stone-hill", "grass-hill", "stone-rocks", "stone", "sand-rocks"]);
const mixN = (a, b, t) => a + (b - a) * t;

// Un paso de la animación del ambiente: calcula la luz objetivo (hora fija o ciclo) y se acerca a ella con suavidad.
function stepAtmos(ctx, h, d, scene, dt, elapsed, time, cycle, weather, theme) {
  const base = (name) => ({ ...TIMES[name], bg: TIMES[name].bg || DAY_BG[theme] || DAY_BG.verano });
  let tg;
  if (cycle) {
    const p = (Date.now() % CYCLE_MS) / CYCLE_MS;
    const i = Math.floor(p * 4), f = p * 4 - i;
    const A = base(CYCLE[i]), B = base(CYCLE[(i + 1) % 4]);
    tg = {
      hemi: new Color(A.hemi).lerp(new Color(B.hemi), f), ground: new Color(A.ground).lerp(new Color(B.ground), f), hi: mixN(A.hi, B.hi, f),
      dir: new Color(A.dir).lerp(new Color(B.dir), f), di: mixN(A.di, B.di, f), pos: A.pos.map((v, k) => mixN(v, B.pos[k], f)), star: mixN(A.star, B.star, f),
      bg: new Color(A.bg).lerp(new Color(B.bg), f),
    };
  } else {
    const A = base(time in TIMES ? time : "dia");
    tg = { hemi: new Color(A.hemi), ground: new Color(A.ground), hi: A.hi, dir: new Color(A.dir), di: A.di, pos: A.pos, star: A.star, bg: new Color(A.bg) };
  }
  const w = WEATHER[weather] || WEATHER.despejado;
  tg.bg.lerp(new Color("#5c6674").multiplyScalar(1 - tg.star * 0.75), w.gray);
  tg.hi *= mixN(1, w.k, 0.6);
  tg.di *= w.k;
  // Rayos de la tormenta: destellos breves de luz.
  const fl = ctx.flash;
  if (weather === "tormenta") {
    if (elapsed > fl.next) {
      fl.v = 1;
      fl.next = elapsed + 3 + Math.random() * 7;
    }
    fl.v = Math.max(0, fl.v - dt * 4.5);
  } else fl.v = 0;
  if (!ctx.st) {
    ctx.st = { hemi: tg.hemi.clone(), ground: tg.ground.clone(), hi: tg.hi, dir: tg.dir.clone(), di: tg.di, pos: [...tg.pos], bg: tg.bg.clone(), fogNear: w.fog[0], fogFar: w.fog[1] };
    scene.background = ctx.st.bg;
    scene.fog = new Fog(ctx.st.bg, w.fog[0], w.fog[1]);
  }
  const c = ctx.st, k = 1 - Math.exp(-dt * 2.2);
  c.hemi.lerp(tg.hemi, k); c.ground.lerp(tg.ground, k); c.dir.lerp(tg.dir, k); c.bg.lerp(tg.bg, k);
  c.hi = mixN(c.hi, tg.hi, k); c.di = mixN(c.di, tg.di, k);
  c.pos = c.pos.map((v, i) => mixN(v, tg.pos[i], k));
  c.fogNear = mixN(c.fogNear, w.fog[0], k); c.fogFar = mixN(c.fogFar, w.fog[1], k);
  h.color.copy(c.hemi); h.groundColor.copy(c.ground); h.intensity = c.hi + fl.v * 2.2;
  d.color.copy(c.dir); d.intensity = c.di + fl.v * 2.5; d.position.set(c.pos[0], c.pos[1], c.pos[2]);
  scene.background = c.bg;
  if (scene.fog) { scene.fog.color.copy(c.bg); scene.fog.near = c.fogNear; scene.fog.far = c.fogFar; }
  return tg.star > 0.5;
}

function Atmosphere({ time, cycle, weather, theme, onNight }) {
  const hemi = useRef(null);
  const dir = useRef(null);
  const scene = useThree((s) => s.scene);
  const ctx = useRef({ st: null, flash: { v: 0, next: 0 }, night: false });
  useFrame(({ clock }, dt) => {
    if (!hemi.current || !dir.current) return;
    const isNight = stepAtmos(ctx.current, hemi.current, dir.current, scene, dt, clock.elapsedTime, time, cycle, weather, theme);
    if (isNight !== ctx.current.night) {
      ctx.current.night = isNight;
      onNight(isNight);
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#ffffff", "#5a5240", 0.75]} />
      <directionalLight ref={dir} position={[6, 12, 4]} intensity={1.15} />
    </>
  );
}

// Copo redondo y suave (un punto blanco con borde difuminado) para la nieve.
const makeDot = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,.8)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new CanvasTexture(c);
};
// Lluvia (rayitas que caen) o nieve (copos que se balancean) sobre todo el mapa.
const makeDrops = (n, rain) => ({
  p: new Float32Array(n * (rain ? 6 : 3)),
  o: Array.from({ length: n }, () => ({ x: (Math.random() - 0.5) * 30, z: (Math.random() - 0.5) * 30, y: Math.random() * 13, v: rain ? 15 + Math.random() * 7 : 0.9 + Math.random() * 1.2, ph: Math.random() * 6.28 })),
});
function stepDrops(data, n, rain, dt, t) {
  const { p, o } = data;
  for (let i = 0; i < n; i++) {
    const d = o[i];
    d.y -= d.v * dt;
    if (d.y < 0) { d.y = 13; d.x = (Math.random() - 0.5) * 30; d.z = (Math.random() - 0.5) * 30; }
    if (rain) {
      const b = i * 6;
      p[b] = d.x; p[b + 1] = d.y; p[b + 2] = d.z;
      p[b + 3] = d.x + 0.07; p[b + 4] = d.y + 0.45; p[b + 5] = d.z;
    } else {
      const b = i * 3;
      p[b] = d.x + Math.sin(t * 0.8 + d.ph) * 0.4; p[b + 1] = d.y; p[b + 2] = d.z + Math.cos(t * 0.6 + d.ph) * 0.3;
    }
  }
}
function Weather({ kind }) {
  const rain = kind === "lluvia" || kind === "tormenta";
  const N = rain ? (kind === "tormenta" ? 1300 : 800) : 1100;
  const geo = useRef(null);
  const data = useMemo(() => makeDrops(N, rain), [N, rain]);
  const dot = useMemo(() => (rain ? null : makeDot()), [rain]);
  useFrame(({ clock }, dt) => {
    if (!geo.current) return;
    stepDrops(data, N, rain, dt, clock.elapsedTime);
    geo.current.attributes.position.needsUpdate = true;
  });
  return rain ? (
    <lineSegments frustumCulled={false}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[data.p, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#b9d4ff" transparent opacity={0.55} />
    </lineSegments>
  ) : (
    <points frustumCulled={false}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[data.p, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" map={dot} size={0.16} sizeAttenuation transparent opacity={0.95} depthWrite={false} />
    </points>
  );
}

// Casilla aún sin explorar: una losa gris oscura con relieve plano.
function FogHex({ q, r }) {
  const [x, z] = hexPos(q, r);
  return (
    <mesh position={[x, 0.06, z]}>
      <cylinderGeometry args={[0.55, 0.55, 0.12, 6]} />
      <meshStandardMaterial color="#262b41" roughness={1} />
    </mesh>
  );
}

// Puntitos de la clave del DJ: tantos como el rango de terreno de cada casilla y un aviso rojo si lleva encuentro.
const PIP_COL = ["#4CC36B", "#E3B04B", "#e07a5f", "#c0392b"];
function fillMarks(mesh, items) {
  const m = new Matrix4(), c = new Color();
  let i = 0;
  for (const it of items) {
    for (let j = 0; j < it.n; j++) {
      m.makeTranslation(it.x + (j - (it.n - 1) / 2) * 0.17, it.y, it.z + 0.3);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(PIP_COL[Math.min(3, Math.max(0, it.n - 1))]));
      i++;
    }
    if (it.enc) {
      m.makeScale(1.7, 1.7, 1.7).setPosition(it.x + 0.36, it.y + 0.05, it.z - 0.12);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set("#ff3b30"));
      i++;
    }
  }
  mesh.count = i;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
function KeyMarks({ items }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) fillMarks(ref.current, items);
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 1800]} frustumCulled={false}>
      <sphereGeometry args={[0.055, 10, 8]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

function Tile({ q, r, t, theme, weather }) {
  // Con nieve, las montañas y colinas se cubren de blanco (variante de invierno) aunque el resto siga en su estación.
  const snowy = weather === "nieve" && SNOWY.has(t.t);
  const th = snowy ? "invierno" : theme;
  const [x, z] = hexPos(q, r);
  return (
    <group position={[x, 0, z]}>
      <Suspense fallback={null}>
        <Piece k={t.t} rot={t.r || 0} theme={th} />
        {t.d && <Piece k={t.d} rot={t.dr || 0} y={WORLD_ITEM[t.t]?.h || 0.2} theme={th} />}
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

// Mar abierto: todo lo que queda fuera del mapa es agua (solo diseño). El color sigue el estilo del mapa.
const OCEAN = { verano: "#4f9fd6", invierno: "#8fc0dd", otono: "#4a86a8" };
function Ocean({ theme }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.094, 0]}>
      <circleGeometry args={[160, 48]} />
      <meshStandardMaterial color={OCEAN[theme] || OCEAN.verano} roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

// Nubes de pocos polígonos (esferas planas, como las piezas del kit) que cruzan el mapa por encima.
// Se apartan de la zona donde está el grupo para dejar un hueco por el que el jugador ve el terreno.
const CLOUD_SEEDS = (() => {
  let a = 7;
  const rnd = () => ((a = (a * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 11 }, () => ({
    x: (rnd() - 0.5) * 36, z: (rnd() - 0.5) * 30, y: 3.3 + rnd() * 1.4, sc: 0.8 + rnd() * 0.9, v: 0.12 + rnd() * 0.2,
    puffs: Array.from({ length: 5 }, (_, i) => [(i - 2) * 0.55 + (rnd() - 0.5) * 0.3, (i === 2 ? 0.18 : 0) + rnd() * 0.12, (rnd() - 0.5) * 0.5, 0.5 + rnd() * 0.3 + (i === 2 ? 0.2 : 0)]),
  }));
})();
const CLOUD_COLOR = { despejado: "#ffffff", lluvia: "#c7cdd8", tormenta: "#8b93a3", niebla: "#d6dbe2", nieve: "#f1f5fa" };
function Clouds({ center, weather }) {
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const R = 4.6;
    CLOUD_SEEDS.forEach((c, i) => {
      const g = refs.current[i];
      if (!g) return;
      let x = ((c.x + c.v * t + 20) % 40 + 40) % 40 - 20;
      let z = c.z;
      const dx = x - center[0], dz = z - center[1];
      const d = Math.hypot(dx, dz);
      let k = 1;
      if (d < R) {
        const f = 1 - d / R;
        const ease = f * f * (3 - 2 * f);
        const n = d || 1;
        x += (dx / n || 1) * ease * R * 1.15;
        z += (dz / n) * ease * R * 1.15;
        k = 1 - ease * 0.65;
      }
      g.position.set(x, c.y, z);
      g.scale.setScalar(c.sc * k);
    });
  });
  return (
    <>
      {CLOUD_SEEDS.map((c, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          {c.puffs.map((p, j) => (
            <mesh key={j} position={[p[0], p[1], p[2]]} scale={[p[3] * 1.25, p[3] * 0.8, p[3]]}>
              <sphereGeometry args={[1, 7, 5]} />
              <meshStandardMaterial color={CLOUD_COLOR[weather] || "#ffffff"} flatShading transparent opacity={0.9} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function Scene({ tiles, edit, clouds, hover, setHover, onCell, selCell, controlsRef, labels, place, theme, party, moving, onParty, atmos, fogged, ghostKeys, marks }) {
  const [night, setNight] = useState(false);
  const weather = atmos.weather || "despejado";
  const ghosts = edit ? CELLS : moving ? CELLS.filter(([q, r]) => (ghostKeys ? ghostKeys.has(q + "," + r) : tiles[q + "," + r])) : [];
  const pk = party ? party.q + "," + party.r : null;
  const [px, pz] = party ? hexPos(party.q, party.r) : [0, 0];
  return (
    <>
      <Atmosphere time={atmos.time || "dia"} cycle={!!atmos.cycle} weather={weather} theme={theme} onNight={setNight} />
      <Ocean theme={theme} />
      {clouds && <Clouds center={[px, pz]} weather={weather} />}
      {night && <Stars radius={70} depth={25} count={1800} factor={3.2} saturation={0} fade speed={0.4} />}
      {(weather === "lluvia" || weather === "tormenta" || weather === "nieve") && <Weather kind={weather} />}
      {Object.entries(tiles).map(([key, t]) => {
        const [q, r] = key.split(",").map(Number);
        return fogged && fogged.has(key) ? <FogHex key={key} q={q} r={r} /> : <Tile key={key} q={q} r={r} t={t} theme={theme} weather={weather} />;
      })}
      {marks && marks.length > 0 && <KeyMarks items={marks} />}
      {party && pk && tiles[pk] && <Party x={px} z={pz} top={topOf(tiles[pk])} grabbed={moving} onPick={onParty} />}
      {ghosts.map(([q, r]) => {
          const [x, z] = hexPos(q, r);
          const key = q + "," + r;
          const on = hover === key;
          return (
            <mesh
              key={key}
              position={[x, 0.12, z]}
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

const TIME_ICONS = { amanecer: Sunrise, dia: Sun, atardecer: Sunset, noche: Moon };
const TIME_LABELS = { amanecer: "Amanecer", dia: "Día", atardecer: "Atardecer", noche: "Noche" };
const WEATHER_ICONS = { despejado: Sun, lluvia: CloudRain, tormenta: CloudLightning, nieve: Snowflake, niebla: CloudFog };
const WEATHER_LABELS = { despejado: "Despejado", lluvia: "Lluvia", tormenta: "Tormenta", nieve: "Nieve", niebla: "Niebla" };

const TOOLS = [
  { key: "clave", label: "Clave", Icon: KeyRound },
  { key: "pintar", label: "Pintar", Icon: Paintbrush },
  { key: "girar", label: "Girar", Icon: RotateCw },
  { key: "nombrar", label: "Nombrar", Icon: Tag },
  { key: "borrar", label: "Borrar", Icon: Eraser },
];

const around = (q, r) => Object.fromEntries([[q + "," + r, true], ...HEX_DIRS.map(([dq, dr]) => [q + dq + "," + (r + dr), true])]);

export default function WorldMap({ campaignId, edit = false, onLog }) {
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
  const [preview, setPreview] = useState(false); // el DJ ve el mapa como lo ven los jugadores
  const [showKey, setShowKey] = useState(false);
  const [toast, setToast] = useState("");
  const toastT = useRef(null);
  const flash = (msg) => {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(""), 3500);
  };
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
  const atmos = cur.atmos || {};
  const party = cur.party || null;
  const info = cur.info || {};
  const travel = !!cur.travel;
  const fogOn = !!cur.fog;
  const day = cur.day || 1;
  const rests = cur.rests || 0;
  const lastRoll = cur.lastRoll || null;
  const asPlayer = !edit || preview;
  // Niebla: el grupo conoce su hex y los contiguos, y todo lo que ya ha descubierto.
  const known = fogOn && asPlayer ? { ...(cur.explored || {}), ...(party ? around(party.q, party.r) : {}) } : null;
  const fogged = known ? new Set(Object.keys(tiles).filter((k) => !known[k])) : null;
  const pKey = party ? party.q + "," + party.r : null;
  const nearKeys = party ? new Set(HEX_DIRS.map(([dq, dr]) => party.q + dq + "," + (party.r + dr))) : null;
  const ghostKeys = travel && party && moving ? new Set([...nearKeys].filter((k) => tiles[k])) : null;
  const labels = Object.entries(tiles)
    .filter(([key, t]) => t.n && (!t.h || edit) && !(fogged && fogged.has(key)))
    .map(([key, t]) => {
      const [q, r] = key.split(",").map(Number);
      const [x, z] = hexPos(q, r);
      return { key, x, z, y: (WORLD_ITEM[t.t]?.h || 0.2) + (t.d ? (WORLD_ITEM[t.d]?.h || 0) : 0) + 0.12, n: t.n, h: !!t.h };
    });
  if (party && tiles[party.q + "," + party.r]) {
    const [x, z] = hexPos(party.q, party.r);
    labels.push({ key: "party", x, z, y: topOf(tiles[party.q + "," + party.r]) + 0.95, n: "Grupo", party: true });
  }
  // Con las reglas de viaje, al agarrar al grupo cada hex contiguo muestra cuántos días cuesta entrar.
  if (travel && moving && nearKeys) {
    for (const k of nearKeys) {
      const t = tiles[k];
      if (!t) continue;
      const [q, r] = k.split(",").map(Number);
      const [x, z] = hexPos(q, r);
      const ter = info[k]?.ter || defaultTerrain(t);
      labels.push({ key: "adj:" + k, x, z, y: topOf(t) + 0.3, n: ter === 0 ? "mar · d4" : ter + (ter === 1 ? " día" : " días"), adj: ter });
    }
  }
  const marks = edit && showKey && !preview ? Object.entries(tiles).map(([k, t]) => { const [q, r] = k.split(",").map(Number); const [x, z] = hexPos(q, r); return { x, z, y: topOf(t) + 0.1, n: info[k]?.ter || defaultTerrain(t), enc: !!info[k]?.enc }; }) : null;
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

  const setInfo = (key, patch) => apply((d) => ({ ...d, info: { ...(d.info || {}), [key]: { ...((d.info || {})[key] || {}), ...patch } } }));
  const moveParty = (key) => {
    if (!tiles[key]) return;
    const [q, r] = key.split(",").map(Number);
    if (travel && party) {
      if (!nearKeys.has(key)) return flash("Con las reglas de viaje solo se puede ir a un hex contiguo.");
      const tile = tiles[key];
      let ter = info[key]?.ter || defaultTerrain(tile);
      let days = ter, sea = "";
      if (ter === 0) {
        days = rollDice(1, 4)[0];
        ter = days;
        sea = " (mar abierto: tiempo " + days + ")";
      }
      const dice = rollDice(ter);
      const hit = dice.includes(1);
      const roll = { dice, hit, key, days, enc: hit ? info[key]?.enc || null : null, at: nowMs() };
      apply((d) => ({ ...d, party: { q, r }, day: (d.day || 1) + days, explored: { ...(d.explored || {}), ...around(q, r) }, lastRoll: roll }));
      onLog?.("El grupo viaja a " + (tile.n || "un hex nuevo") + ": " + days + (days === 1 ? " día" : " días") + sea + ". Dados de encuentro (" + ter + "d6): " + dice.join(", ") + " → " + (hit ? "¡sale un 1! Se activa un encuentro" : "sin encuentro") + ".");
    } else {
      apply((d) => ({ ...d, party: { q, r }, explored: { ...(d.explored || {}), ...around(q, r) } }));
    }
    setMoving(false);
  };
  // Descansos del viaje: fuera de un santuario solo cortos (1 día cada uno, máximo 3 seguidos); el largo, en un santuario.
  const restNow = (kind) => {
    if (kind === "corto") {
      if (rests >= 3) return flash("Ya son 3 descansos cortos seguidos: el siguiente debe ser largo, en un santuario.");
      apply((d) => ({ ...d, day: (d.day || 1) + 1, rests: (d.rests || 0) + 1 }));
      onLog?.("El grupo hace un descanso corto (1 día). Descansos cortos seguidos: " + (rests + 1) + "/3.");
      return;
    }
    const here = pKey && tiles[pKey];
    const sanctuary = here && (here.t.startsWith("building-") || info[pKey]?.sanc);
    if (!sanctuary && !edit) return flash("El descanso largo solo se hace en un santuario.");
    apply((d) => ({ ...d, day: (d.day || 1) + 3, rests: 0 }));
    onLog?.("El grupo hace un descanso largo (3 días)" + (sanctuary ? " en un santuario" : "") + ".");
  };
  const copyKey = (inf) => {
    const [q0, r0] = selCell.split(",").map(Number);
    const base = tiles[selCell];
    apply((d) => {
      const next = { ...(d.info || {}) };
      for (const [dq, dr] of HEX_DIRS) {
        const k = q0 + dq + "," + (r0 + dr);
        const t = (d.tiles || {})[k];
        if (t && base && t.t === base.t && !next[k]) next[k] = { hab: inf.hab, ter: inf.ter };
      }
      return { ...d, info: next };
    });
  };
  const forceEncounter = () => {
    apply((d) => ({ ...d, lastRoll: { ...(d.lastRoll || {}), hit: true, enc: (d.info || {})[(d.lastRoll || {}).key]?.enc || null } }));
    onLog?.("El DJ gasta Miedo y activa un encuentro.");
  };
  const onCell = (key) => {
    if (moving) return moveParty(key);
    if (tool === "nombrar" || tool === "clave") return setSelCell(key);
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
        <Scene tiles={tiles} edit={edit} clouds={asPlayer} hover={hover} setHover={setHover} onCell={onCell} selCell={tool === "nombrar" || tool === "clave" ? selCell : null} controlsRef={controlsRef} labels={labels} place={place} theme={theme} party={party} moving={moving} onParty={() => setMoving((m) => !m)} atmos={atmos} fogged={fogged} ghostKeys={ghostKeys} marks={marks} />
      </Canvas>
      <div className="wm-labels" aria-hidden="true">
        {labels.map((l) => (
          <div key={l.key} ref={(el) => (labelRefs.current[l.key] = el)} className={"wm-lbl" + (l.h ? " is-hidden" : "") + (l.party ? " is-party" : "") + (l.adj !== undefined ? " is-adj a" + l.adj : "")} style={{ opacity: 0 }}>
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
      {(atmos.cycle || (atmos.time && atmos.time !== "dia") || (atmos.weather && atmos.weather !== "despejado")) && (
        <div className="wm-env">
          {atmos.cycle ? <Repeat size={12} /> : (() => { const T = TIME_ICONS[atmos.time] || Sun; return <T size={12} />; })()}
          <span>{atmos.cycle ? "Ciclo día y noche" : TIME_LABELS[atmos.time] || "Día"}</span>
          {atmos.weather && atmos.weather !== "despejado" && (() => { const W = WEATHER_ICONS[atmos.weather] || CloudRain; return <><W size={12} /><span>{WEATHER_LABELS[atmos.weather]}</span></>; })()}
        </div>
      )}
      {toast && <div className="wm-toast">{toast}</div>}
      {travel && (
        <div className="wm-trip">
          <div className="wm-trip-h">
            <b>Día {day}</b>
            {party && tiles[pKey] && (() => { const ter = info[pKey]?.ter || defaultTerrain(tiles[pKey]); return <span>{ter === 0 ? "Mar abierto" : "Terreno " + TERRAIN_NAMES[ter].toLowerCase()}</span>; })()}
          </div>
          <div className="wm-trip-r">
            <Tent size={12} /> Descansos cortos
            {[0, 1, 2].map((i) => <i key={i} className={i < rests ? "on" : ""} />)}
            <span>{rests}/3</span>
          </div>
          {lastRoll && (
            <div className={"wm-trip-d" + (lastRoll.hit ? " is-hit" : "")}>
              {lastRoll.dice.map((v, i) => <i key={i} className={v === 1 ? "one" : ""}>{v}</i>)}
              <span>{lastRoll.hit ? "¡Encuentro!" : "Sin encuentro"}</span>
              {edit && lastRoll.enc && <em>{lastRoll.enc}</em>}
            </div>
          )}
          <div className="wm-trip-b">
            <button type="button" onClick={() => restNow("corto")}>Descanso corto</button>
            <button type="button" onClick={() => restNow("largo")}>Descanso largo</button>
            {edit && lastRoll && !lastRoll.hit && <button type="button" onClick={forceEncounter} title="El DJ puede gastar Miedo para activar un encuentro aunque no salga un 1">Activar encuentro</button>}
          </div>
        </div>
      )}
      {moving && (
        <div className="wm-banner">
          <Flag size={13} /> {travel ? "Pulsa un hex contiguo para viajar" : "Pulsa la casilla a la que quieres llevar al grupo"}
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
          <span className="wm-lab">Hora del día</span>
          <div className="mh-seg is-fit wm-wrap">
            {Object.keys(TIME_LABELS).map((k) => {
              const I = TIME_ICONS[k];
              return (
                <button key={k} type="button" className={!atmos.cycle && (atmos.time || "dia") === k ? "on" : ""} onClick={() => apply((d) => ({ ...d, atmos: { ...(d.atmos || {}), time: k, cycle: false } }))} title={TIME_LABELS[k]}>
                  <I size={14} /> {TIME_LABELS[k]}
                </button>
              );
            })}
          </div>
          <button type="button" className={"mh-btn-ghost" + (atmos.cycle ? " is-on" : "")} onClick={() => apply((d) => ({ ...d, atmos: { ...(d.atmos || {}), cycle: !(d.atmos || {}).cycle } }))} title="El día y la noche pasan solos (un día completo dura 6 minutos) y todos lo ven igual">
            <Repeat size={13} /> Ciclo automático (6 min por día)
          </button>
          <span className="wm-lab">Clima</span>
          <div className="mh-seg is-fit wm-wrap">
            {Object.keys(WEATHER_LABELS).map((k) => {
              const I = WEATHER_ICONS[k];
              return (
                <button key={k} type="button" className={(atmos.weather || "despejado") === k ? "on" : ""} onClick={() => apply((d) => ({ ...d, atmos: { ...(d.atmos || {}), weather: k } }))} title={WEATHER_LABELS[k]}>
                  <I size={14} /> {WEATHER_LABELS[k]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="wm-sec">
          <span className="wm-lab">Estación (estilo del mapa)</span>
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
          <span className="wm-lab">Viaje por hexágonos (opcional)</span>
          <label className="wm-chk"><input type="checkbox" checked={travel} onChange={(e) => apply((d) => ({ ...d, travel: e.target.checked }))} /><Footprints size={13} /> Reglas de viaje: días, dados de encuentro y descansos</label>
          <label className="wm-chk"><input type="checkbox" checked={fogOn} onChange={(e) => apply((d) => ({ ...d, fog: e.target.checked }))} /><Eye size={13} /> Niebla: los jugadores solo ven lo que descubren</label>
          <div className="wm-row2" style={{ justifyContent: "flex-start" }}>
            <button type="button" className={"mh-btn-ghost" + (preview ? " is-on" : "")} onClick={() => setPreview((v) => !v)} title="Mira el mapa como lo ven los jugadores">Ver como jugadores</button>
            <button type="button" className={"mh-btn-ghost" + (showKey ? " is-on" : "")} onClick={() => setShowKey((v) => !v)} title="Muestra el rango de terreno (puntos) y los encuentros preparados (rojo)">Ver clave</button>
          </div>
          {(travel || fogOn) && (
            <button type="button" className="mh-btn-ghost" onClick={() => window.confirm("¿Reiniciar el viaje (día 1, sin explorar)?") && apply((d) => ({ ...d, day: 1, rests: 0, explored: {}, lastRoll: null }))}>
              Reiniciar viaje
            </button>
          )}
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
        {tool === "clave" && (
          <div className="wm-sec">
            <span className="wm-lab">Clave de la casilla</span>
            {cell ? (() => {
              const inf = info[selCell] || {};
              const auto = defaultTerrain(cell);
              return (
                <>
                  <label className="wm-f">Hábitat
                    <select className="mh-input" value={inf.hab || ""} onChange={(e) => setInfo(selCell, { hab: e.target.value || undefined })}>
                      <option value="">—</option>
                      {HABITATS.map((h) => <option key={h}>{h}</option>)}
                    </select>
                  </label>
                  <label className="wm-f">Terreno (días para entrar)
                    <select className="mh-input" value={inf.ter || ""} onChange={(e) => setInfo(selCell, { ter: Number(e.target.value) || undefined })}>
                      <option value="">Automático ({auto === 0 ? "mar" : TERRAIN_NAMES[auto]})</option>
                      {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{TERRAIN_NAMES[n]} · {n} {n === 1 ? "día" : "días"}</option>)}
                    </select>
                  </label>
                  <label className="wm-f">Encuentro preparado
                    <span className="wm-row2" style={{ justifyContent: "flex-start", flexWrap: "nowrap" }}>
                      <select className="mh-input" style={{ flex: 1, minWidth: 0 }} value={inf.enc || ""} onChange={(e) => setInfo(selCell, { enc: e.target.value || undefined })}>
                        <option value="">Ninguno</option>
                        {ENCOUNTERS.map((x) => <option key={x}>{x}</option>)}
                      </select>
                      <button type="button" className="mh-btn-ghost" onClick={() => setInfo(selCell, { enc: rollEncounterName() })} title="Tira d8 + d6 en la tabla de encuentros"><Dices size={13} /></button>
                    </span>
                  </label>
                  <label className="wm-f">Rumor
                    <input key={selCell + "r"} className="mh-input" defaultValue={inf.rumor || ""} placeholder="Algo que se cuenta de esta zona" maxLength={120} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (inf.rumor || "")) setInfo(selCell, { rumor: v || undefined }); }} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
                  </label>
                  <label className="wm-chk"><input type="checkbox" checked={!!inf.sanc} onChange={(e) => setInfo(selCell, { sanc: e.target.checked || undefined })} /> Santuario (permite descanso largo)</label>
                  <button type="button" className="mh-btn-ghost" onClick={() => copyKey(inf)}>Copiar hábitat y terreno a las vecinas iguales</button>
                </>
              );
            })() : <p className="wm-note">Pulsa una casilla con terreno para rellenar su ficha (solo la ve el DJ).</p>}
          </div>
        )}
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
          <Eye size={12} /> Los jugadores ven este mapa cuando lo pones en directo desde «Mesa». {count} casilla{count === 1 ? "" : "s"}. La clave del DJ (hábitat, rumores…) se guarda en el mismo documento: no es un secreto técnico.
        </p>
      </aside>
    </div>
  );
}
