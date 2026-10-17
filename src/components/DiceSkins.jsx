"use client";

import { useEffect, useRef, useState } from "react";
import { Dices, Check, Sparkles } from "lucide-react";

// Aspectos de dado. «cristal» es el de siempre; «cosmico» pinta de nebulosa los dados de 12 caras (Esperanza y Miedo).
export const DICE_SKINS = [
  { key: "cristal", label: "Cristal", desc: "El dado translúcido de siempre, con el tinte de cada tipo de dado.", color: "#6FA3C0" },
  { key: "cosmico", label: "D12 Cósmico", desc: "Una nebulosa que gira muy despacio, estrellas que titilan y el logo de la página en la cara del 12. Se aplica a todos tus dados.", color: "#A58BE8", model: "/modelos/d12-cosmico.glb" },
  { key: "oficial", label: "Oficial Set", desc: "Inspirado en el set oficial de Daggerheart: resina morada y azul con remolinos blancos, brillos y números amarillos; el D12 de Esperanza en ámbar y el de Miedo en azul marino, con números blancos y el logo en el 12 (y en el 20). Se aplica a todos tus dados.", color: "#E3B04B", model: "/modelos/oficial-set.glb", set: true },
];

// ---- Shader galáctico (se inyecta en el material estándar de three.js) ----
// Todo va en coordenadas del objeto, así que la nebulosa «envuelve» el dado y no depende de los UV.
// Velocidad: la nebulosa da una vuelta cada ~2 minutos (0,05 rad/s) y la deformación avanza aún más despacio.
const GLSL = /* glsl */ `
uniform float uTime;
uniform float uWarm;
varying vec3 vOP;
float cHash(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cNoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cHash(i), cHash(i + vec3(1,0,0)), f.x), mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x), mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float cFbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * cNoise(p); p = p * 2.03 + vec3(7.1, 3.7, 1.3); a *= .5; } return s; }
vec3 cRamp(float t){
  vec3 c0 = vec3(.004,.003,.03), c1 = vec3(.06,.015,.25), c2 = vec3(.30,.03,.45), c3 = vec3(.50,.06,.50), c4 = vec3(.06,.30,.80), c5 = vec3(.40,.80,1.0);
  if (t < .25) return mix(c0, c1, t / .25);
  if (t < .5) return mix(c1, c2, (t - .25) / .25);
  if (t < .7) return mix(c2, c3, (t - .5) / .2);
  if (t < .88) return mix(c3, c4, (t - .7) / .18);
  return mix(c4, c5, min(1., (t - .88) / .12));
}
vec3 cosmic(vec3 p){
  float a = uTime * 0.05, c = cos(a), s = sin(a);
  vec3 q = vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z) * 1.35;
  vec3 w = q + 0.35 * vec3(cFbm(q * 1.3 + vec3(0., 0., uTime * 0.012)), cFbm(q * 1.3 + 5.2), cFbm(q * 1.3 + 9.1));
  float n = cFbm(w * 1.15);
  float d = cFbm(q * 3.2);
  vec3 col = cRamp(smoothstep(.30, .80, n)) * mix(.14, 1., smoothstep(.3, .7, d));
  col = mix(col, col * vec3(1.45, 1.0, .55) + vec3(.05,.03,0.), uWarm);
  vec3 g = q * 30.; vec3 id = floor(g); vec3 f = fract(g) - .5;
  float h = cHash(id);
  vec3 off = (vec3(cHash(id + 1.), cHash(id + 2.), cHash(id + 3.)) - .5) * .6;
  float star = smoothstep(.14, .0, length(f - off)) * step(.8, h) * (0.45 + h);
  star *= 0.75 + 0.25 * sin(uTime * 0.9 + h * 60.);
  return (col + star * vec3(.85, .9, 1.) * 2.4) * 1.25;
}
`;

// Material cósmico: tinte cálido (Esperanza) o frío (Miedo / neutro). `uniforms.uTime.value` se actualiza desde fuera.
export function makeCosmicMaterial(THREE, warm = 0) {
  const uniforms = { uTime: { value: 0 }, uWarm: { value: warm } };
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x05030f, roughness: 0.16, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.3 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uWarm = uniforms.uWarm;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vOP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvOP = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GLSL).replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += cosmic(vOP);");
  };
  mat.customProgramCacheKey = () => "cosmic-d12";
  return { mat, uniforms };
}

// ---- Oficial Set: resina marmoleada con brillos, ámbar (Esperanza) y azul marino (Miedo) ----
const SET_GLSL = /* glsl */ `
uniform float uTime;
varying vec3 vOP;
float sHash(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float sNoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(sHash(i), sHash(i + vec3(1,0,0)), f.x), mix(sHash(i + vec3(0,1,0)), sHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(sHash(i + vec3(0,0,1)), sHash(i + vec3(1,0,1)), f.x), mix(sHash(i + vec3(0,1,1)), sHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float sFbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * sNoise(p); p = p * 2.03 + vec3(7.1, 3.7, 1.3); a *= .5; } return s; }
// Brillos de purpurina: celdas con un punto que centellea
float sGlitter(vec3 p, float k){
  vec3 g = p * k; vec3 id = floor(g); vec3 f = fract(g) - .5;
  float h = sHash(id);
  vec3 off = (vec3(sHash(id + 1.), sHash(id + 2.), sHash(id + 3.)) - .5) * .5;
  float d = length(f - off);
  return smoothstep(.2, .0, d) * step(.78, h) * (.55 + .45 * sin(uTime * 1.3 + h * 70.));
}
vec3 marble(vec3 p){
  vec3 q = p * 1.5;
  float n = sFbm(q * 1.8 + 3.0 * vec3(sFbm(q * 0.9), sFbm(q * 0.9 + 4.1), sFbm(q * 0.9 + 8.3)));
  vec3 c = mix(vec3(.06,.025,.28), vec3(.20,.07,.58), smoothstep(.3, .55, n));
  c = mix(c, vec3(.14,.33,.95), smoothstep(.55, .9, n));
  float w = sFbm(q * 1.5 + 2.2 * vec3(sFbm(q * 1.1 + 1.7)));
  float vein = 1. - smoothstep(0., .06, abs(w - .5));
  float mask = smoothstep(.46, .7, sFbm(q * 1.2 + 9.));
  return mix(c, vec3(.72,.72,.95), clamp(vein * mask, 0., 1.)) * .85;
}
`;
function injectSet(mat, uniforms, body) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vOP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvOP = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + SET_GLSL);
    if (body.diffuse) sh.fragmentShader = sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n" + body.diffuse);
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + body.emissive);
  };
  mat.customProgramCacheKey = () => "set-" + body.key;
}
export function makeMarbleMaterial(THREE) {
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.4 });
  injectSet(mat, uniforms, { key: "marble", diffuse: "diffuseColor.rgb = marble(vOP);", emissive: "totalEmissiveRadiance += sGlitter(vOP, 24.) * vec3(.75,.85,1.) * 3.0;" });
  return { mat, uniforms };
}
export function makeResinMaterial(THREE, kind) {
  const uniforms = { uTime: { value: 0 } };
  const hope = kind === "hope";
  const mat = new THREE.MeshPhysicalMaterial({
    color: hope ? 0xffb81a : 0x0a0a52,
    roughness: 0.1,
    transmission: hope ? 0.45 : 0.4,
    thickness: 1.2,
    ior: 1.5,
    attenuationColor: hope ? new THREE.Color(0xff9d00) : new THREE.Color(0x14146e),
    attenuationDistance: 1.1,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 0.5,
    transparent: true,
  });
  const base = hope ? "vec3(.33,.22,.02)" : "vec3(.012,.012,.07)";
  const gl = hope ? "vec3(1.,.95,.6)" : "vec3(.6,.7,1.)";
  injectSet(mat, uniforms, { key: kind, emissive: "totalEmissiveRadiance += " + base + " + sGlitter(vOP, " + (hope ? "20." : "26.") + ") * " + gl + " * 3.0;" });
  return { mat, uniforms };
}

// ---- Visor 3D del dado (el .glb de Blender con el shader animado) ----
function Viewer({ model }) {
  const host = useRef(null);
  const [state, setState] = useState("load"); // load | ok | err
  useEffect(() => {
    let dead = false;
    let raf = 0;
    let cleanup = () => {};
    (async () => {
      try {
        const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([import("three"), import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/environments/RoomEnvironment.js")]);
        if (dead || !host.current) return;
        const el = host.current;
        const W = el.clientWidth || 320;
        const H = el.clientHeight || 320;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(W, H);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none;cursor:grab";
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
        const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 50);
        cam.position.set(0, 0, 4.6);
        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(-3, 4, 5);
        scene.add(key);
        const gltf = await new GLTFLoader().loadAsync(model);
        if (dead) return;
        const root = gltf.scene;
        const { mat, uniforms } = makeCosmicMaterial(THREE, 0);
        let bodyMesh = null;
        let logo = null;
        root.traverse((o) => {
          if (!o.isMesh) return;
          if (/^D12$|^D12Mesh/.test(o.name) || /^D12Mesh/.test(o.geometry?.name || "")) bodyMesh = bodyMesh || o;
          if (/Curve|Logo/.test(o.name)) logo = o;
        });
        if (!bodyMesh) {
          // El cuerpo es la malla con más vértices que no sea un número ni el logo.
          let best = 0;
          root.traverse((o) => {
            if (o.isMesh && o.geometry.attributes.position.count > best) {
              best = o.geometry.attributes.position.count;
              bodyMesh = o;
            }
          });
        }
        bodyMesh.material = mat;
        // Oro de los números y del logo, con algo de brillo propio
        root.traverse((o) => {
          if (o.isMesh && o !== bodyMesh) {
            o.material = new THREE.MeshStandardMaterial({ color: 0xffd27a, metalness: 1, roughness: 0.22, emissive: 0xffb347, emissiveIntensity: 0.55 });
          }
        });
        const pivot = new THREE.Group();
        pivot.add(root);
        scene.add(pivot);
        // Encuadre: el logo (cara del 12) mira a la cámara, con la punta larga hacia arriba.
        root.updateMatrixWorld(true);
        if (logo) {
          const c = new THREE.Box3().setFromObject(logo).getCenter(new THREE.Vector3());
          const b = new THREE.Box3().setFromObject(bodyMesh).getCenter(new THREE.Vector3());
          const n = c.clone().sub(b).normalize();
          const q1 = new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, 0, 1));
          root.quaternion.premultiply(q1);
          root.updateMatrixWorld(true);
          // eje largo del logo: el de mayor extensión en su caja local, llevado al mundo
          logo.geometry.computeBoundingBox();
          const sz = logo.geometry.boundingBox.getSize(new THREE.Vector3());
          const axis = sz.x >= sz.y && sz.x >= sz.z ? new THREE.Vector3(1, 0, 0) : sz.y >= sz.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
          const v = axis.applyQuaternion(logo.getWorldQuaternion(new THREE.Quaternion()));
          const ang = Math.atan2(v.x, v.y);
          root.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -ang));
        }
        // Arrastrar para girar; si no, gira muy despacio sobre sí mismo.
        let rx = 0;
        let ry = 0;
        let vx = 0;
        let drag = null;
        const down = (e) => { drag = { x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); renderer.domElement.style.cursor = "grabbing"; };
        const move = (e) => {
          if (!drag) return;
          ry += (e.clientX - drag.x) * 0.012;
          rx += (e.clientY - drag.y) * 0.012;
          drag = { x: e.clientX, y: e.clientY };
        };
        const up = () => { drag = null; renderer.domElement.style.cursor = "grab"; };
        renderer.domElement.addEventListener("pointerdown", down);
        renderer.domElement.addEventListener("pointermove", move);
        renderer.domElement.addEventListener("pointerup", up);
        renderer.domElement.addEventListener("pointercancel", up);
        const t0 = performance.now();
        const tick = () => {
          if (dead) return;
          const t = (performance.now() - t0) / 1000;
          uniforms.uTime.value = t;
          if (!drag) {
            // vuelve poco a poco a mirar de frente, con un balanceo suave
            rx += (Math.sin(t * 0.35) * 0.18 - rx) * 0.02;
            ry += (Math.sin(t * 0.23) * 0.35 - ry) * 0.02;
          }
          pivot.rotation.set(rx, ry, 0);
          renderer.render(scene, cam);
          raf = requestAnimationFrame(tick);
        };
        setState("ok");
        raf = requestAnimationFrame(tick);
        cleanup = () => {
          cancelAnimationFrame(raf);
          renderer.domElement.removeEventListener("pointerdown", down);
          renderer.domElement.removeEventListener("pointermove", move);
          renderer.domElement.removeEventListener("pointerup", up);
          renderer.domElement.removeEventListener("pointercancel", up);
          pm.dispose();
          mat.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch (e) {
        console.warn("DiceSkins", e);
        if (!dead) setState("err");
      }
    })();
    return () => {
      dead = true;
      cleanup();
    };
  }, [model]);
  return (
    <div className="mh-dice-view" ref={host}>
      {state === "load" && <span className="mh-dice-hint">Cargando dado…</span>}
      {state === "err" && <span className="mh-dice-hint">No se pudo mostrar el dado 3D en este navegador.</span>}
    </div>
  );
}

// ---- Visor del Oficial Set: los 9 dados del .glb con sus materiales ----
function SetViewer({ model }) {
  const host = useRef(null);
  const [state, setState] = useState("load");
  useEffect(() => {
    let dead = false;
    let raf = 0;
    let cleanup = () => {};
    (async () => {
      try {
        const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([import("three"), import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/environments/RoomEnvironment.js")]);
        if (dead || !host.current) return;
        const el = host.current;
        const W = el.clientWidth || 600;
        const H = el.clientHeight || 340;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(W, H);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none;cursor:grab";
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
        const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 80);
        const dist = 15.8;
        cam.position.set(0, 0, dist);
        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(-4, 6, 9);
        scene.add(key);
        const gltf = await new GLTFLoader().loadAsync(model);
        if (dead) return;
        const root = gltf.scene;
        const mats = [];
        const marble = makeMarbleMaterial(THREE);
        const hope = makeResinMaterial(THREE, "hope");
        const fear = makeResinMaterial(THREE, "fear");
        mats.push(marble, hope, fear);
        const yellow = new THREE.MeshStandardMaterial({ color: 0xffb81a, metalness: 0.5, roughness: 0.3, emissive: 0xff9d00, emissiveIntensity: 0.25 });
        const white = new THREE.MeshStandardMaterial({ color: 0xf5f5ff, metalness: 0.1, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.18 });
        root.traverse((o) => {
          if (!o.isMesh) return;
          const nm = o.name || o.parent?.name || "";
          const isNum = /^Num_/.test(nm);
          const hopeD = /Esperanza/.test(nm);
          const fearD = /Miedo/.test(nm);
          if (isNum) o.material = hopeD || fearD ? white : yellow;
          else o.material = hopeD ? hope.mat : fearD ? fear.mat : marble.mat;
        });
        // El .glb sale de Blender con las caras bonitas hacia +Y: se levanta para mirarlas de frente.
        root.rotation.x = Math.PI / 2;
        const pivot = new THREE.Group();
        pivot.add(root);
        scene.add(pivot);
        let rx = 0;
        let ry = 0;
        let drag = null;
        const down = (e) => { drag = { x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); renderer.domElement.style.cursor = "grabbing"; };
        const move = (e) => {
          if (!drag) return;
          ry += (e.clientX - drag.x) * 0.008;
          rx += (e.clientY - drag.y) * 0.008;
          drag = { x: e.clientX, y: e.clientY };
        };
        const up = () => { drag = null; renderer.domElement.style.cursor = "grab"; };
        renderer.domElement.addEventListener("pointerdown", down);
        renderer.domElement.addEventListener("pointermove", move);
        renderer.domElement.addEventListener("pointerup", up);
        renderer.domElement.addEventListener("pointercancel", up);
        const t0 = performance.now();
        const tick = () => {
          if (dead) return;
          const t = (performance.now() - t0) / 1000;
          mats.forEach((m) => (m.uniforms.uTime.value = t));
          if (!drag) {
            rx += (Math.sin(t * 0.3) * 0.16 - rx) * 0.02;
            ry += (Math.sin(t * 0.21) * 0.28 - ry) * 0.02;
          }
          pivot.rotation.set(rx, ry, 0);
          renderer.render(scene, cam);
          raf = requestAnimationFrame(tick);
        };
        setState("ok");
        raf = requestAnimationFrame(tick);
        cleanup = () => {
          cancelAnimationFrame(raf);
          renderer.domElement.removeEventListener("pointerdown", down);
          renderer.domElement.removeEventListener("pointermove", move);
          renderer.domElement.removeEventListener("pointerup", up);
          renderer.domElement.removeEventListener("pointercancel", up);
          pm.dispose();
          mats.forEach((m) => m.mat.dispose());
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch (e) {
        console.warn("DiceSkins set", e);
        if (!dead) setState("err");
      }
    })();
    return () => {
      dead = true;
      cleanup();
    };
  }, [model]);
  return (
    <div className="mh-dice-view" ref={host}>
      {state === "load" && <span className="mh-dice-hint">Cargando dados…</span>}
      {state === "err" && <span className="mh-dice-hint">No se pudo mostrar los dados 3D en este navegador.</span>}
    </div>
  );
}

// ---- Página «Dados» ----
export function DicePage({ skin, onEquip }) {
  return (
    <div className="mh-dice-page">
      <div className="mh-dice-h">
        <h1 className="mh-serif">Dados</h1>
        <p>Elige el aspecto de tus dados. El que equipes se usa en las tiradas de tus personajes.</p>
      </div>
      <div className="mh-dice-grid">
        {DICE_SKINS.map((s) => {
          const on = skin === s.key;
          return (
            <div key={s.key} className={"mh-dice-card" + (on ? " is-on" : "") + (s.set ? " is-wide" : "")} style={{ "--dc": s.color }}>
              <div className="mh-dice-prev">
                {s.set ? (
                  <SetViewer model={s.model} />
                ) : s.model ? (
                  <Viewer model={s.model} />
                ) : (
                  <div className="mh-dice-glass" aria-hidden="true">
                    <Dices size={78} strokeWidth={1.2} />
                  </div>
                )}
                {on && (
                  <span className="mh-dice-badge">
                    <Check size={12} strokeWidth={3} /> Equipado
                  </span>
                )}
              </div>
              <div className="mh-dice-body">
                <h3 className="mh-serif">{s.label}</h3>
                <p>{s.desc}</p>
                <button type="button" className={"mh-btn mh-dice-btn" + (on ? " is-on" : "")} disabled={on} onClick={() => onEquip(s.key)}>
                  {on ? (
                    <>
                      <Check size={15} /> Equipado
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} /> Equipar
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
