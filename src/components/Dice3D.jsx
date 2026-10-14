"use client";

import { useEffect, useRef } from "react";

// Dados de dualidad en 3D (cristal): se tiran con física real (cannon-es) desde un punto, una velocidad y un giro aleatorios.
// La tirada ya está decidida; la física no la cambia: al terminar se renumeran las caras para que la de arriba muestre
// el valor que toca. El resultado se enseña (onReveal) un poco después de que los dados se hayan parado.
export function canDice3d() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const DT = 1 / 120;
const rngOf = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function Dice3D({ hope, fear, onReveal, onEnd }) {
  const host = useRef(null);
  const cb = useRef({ onReveal, onEnd });
  useEffect(() => {
    cb.current = { onReveal, onEnd };
  });

  useEffect(() => {
    let dead = false;
    let raf = 0;
    let cleanup = () => {};
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      cb.current.onReveal && cb.current.onReveal();
    };
    (async () => {
      let THREE, CANNON, RoomEnvironment;
      try {
        [THREE, CANNON, { RoomEnvironment }] = await Promise.all([import("three"), import("cannon-es"), import("three/examples/jsm/environments/RoomEnvironment.js")]);
      } catch {
        reveal();
        cb.current.onEnd && cb.current.onEnd();
        return;
      }
      if (dead || !host.current) return;
      try {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const aspect = W / H;
        const R = rngOf((Math.random() * 1e9) | 0);
        const rr = (a, b) => a + (b - a) * R();

        // Cámara: en vertical se aleja para que la mesa quepa a lo ancho.
        const FOV = 38;
        const dist = Math.max(20.2, 5.4 / (Math.tan((FOV / 2) * (Math.PI / 180)) * aspect));
        const k = dist / 20.2;
        const camPos = new THREE.Vector3(0, 13 * k, 15.5 * k);
        const halfX = Math.min(7, 0.42 * 2 * Math.tan((FOV / 2) * (Math.PI / 180)) * dist * aspect * 1.1);
        const halfZ = Math.min(4.6 * k, 7.5);

        // --- Física: se simula entera por adelantado y luego se reproduce ---
        const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -34, 0) });
        world.allowSleep = true;
        const mDie = new CANNON.Material("die");
        const mTab = new CANNON.Material("tab");
        world.addContactMaterial(new CANNON.ContactMaterial(mDie, mTab, { friction: 0.6, restitution: 0.28 }));
        world.addContactMaterial(new CANNON.ContactMaterial(mDie, mDie, { friction: 0.3, restitution: 0.4 }));
        const addBox = (hx, hy, hz, x, y, z) => {
          const w = new CANNON.Body({ mass: 0, material: mTab, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)) });
          w.position.set(x, y, z);
          world.addBody(w);
        };
        addBox(40, 0.5, 40, 0, -0.5, 0);
        addBox(0.5, 12, 14, -halfX - 0.5, 12, 0);
        addBox(0.5, 12, 14, halfX + 0.5, 12, 0);
        addBox(14, 12, 0.5, 0, 12, -halfZ - 0.5);
        addBox(14, 12, 0.5, 0, 12, halfZ + 0.5);

        const geo = new THREE.DodecahedronGeometry(1, 0);
        const posA = geo.attributes.position;
        const faces = [];
        for (let f = 0; f < 12; f++) {
          const c = new THREE.Vector3();
          for (let i = 0; i < 9; i++) c.add(new THREE.Vector3().fromBufferAttribute(posA, f * 9 + i));
          faces.push(c.divideScalar(9));
        }
        const uniq = [];
        const idx = (p) => {
          const i = uniq.findIndex((u) => u.distanceTo(p) < 1e-4);
          if (i >= 0) return i;
          uniq.push(p.clone());
          return uniq.length - 1;
        };
        const polys = [];
        for (let f = 0; f < 12; f++) {
          const ids = [...new Set([...Array(9).keys()].map((q) => idx(new THREE.Vector3().fromBufferAttribute(posA, f * 9 + q))))];
          const c = faces[f];
          const n = c.clone().normalize();
          const u = uniq[ids[0]].clone().sub(c).normalize();
          const w = new THREE.Vector3().crossVectors(n, u);
          const ang = (p) => Math.atan2(uniq[p].clone().sub(c).dot(w), uniq[p].clone().sub(c).dot(u));
          ids.sort((a, b) => ang(a) - ang(b));
          polys.push(ids);
        }
        const shape = new CANNON.ConvexPolyhedron({ vertices: uniq.map((v) => new CANNON.Vec3(v.x, v.y, v.z)), faces: polys });
        const bodies = [0, 1].map((i) => {
          const b = new CANNON.Body({ mass: 1, material: mDie, shape, sleepSpeedLimit: 0.35, sleepTimeLimit: 0.5, linearDamping: 0.2, angularDamping: 0.4 });
          b.position.set(rr(-halfX * 0.7, halfX * 0.7), rr(8, 11) + i * rr(1.5, 4), rr(-halfZ * 0.6, halfZ * 0.6));
          const dx = -Math.sign(b.position.x || 1) * rr(0.4, 1);
          b.velocity.set(dx * rr(5, 12) + rr(-3, 3), rr(-4, 3), rr(-5, 5));
          b.angularVelocity.set(rr(-14, 14), rr(-14, 14), rr(-14, 14));
          b.quaternion.setFromEuler(rr(0, 6.28), rr(0, 6.28), rr(0, 6.28));
          world.addBody(b);
          return b;
        });
        const rec = [];
        let tt = 0;
        let rest = null;
        for (let s = 0; s < 120 * 7; s++) {
          world.step(DT);
          tt += DT;
          rec.push(bodies.map((b) => [b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w]));
          if (rest === null && bodies.every((b) => b.sleepState === CANNON.Body.SLEEPING)) rest = tt;
          if (rest !== null && tt > rest + 0.3) break;
        }
        if (rest === null) rest = tt;
        const last = rec[rec.length - 1];
        const topFace = (s) => {
          const q = new THREE.Quaternion(s[3], s[4], s[5], s[6]);
          let best = -9;
          let bi = 0;
          faces.forEach((c, i) => {
            const y = c.clone().normalize().applyQuaternion(q).y;
            if (y > best) {
              best = y;
              bi = i;
            }
          });
          return bi;
        };
        // Numeración: la cara que queda arriba muestra el valor decidido (se intercambia con la que lo llevaba).
        const labelsFor = (want, s) => {
          const lab = Array.from({ length: 12 }, (_, i) => i + 1);
          const top = topFace(s);
          const j = lab.indexOf(want);
          [lab[top], lab[j]] = [lab[j], lab[top]];
          return lab;
        };
        const labH = labelsFor(Math.min(12, Math.max(1, hope)), last[0]);
        const labF = labelsFor(Math.min(12, Math.max(1, fear)), last[1]);

        // --- Escena ---
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        const dpr = Math.min(window.devicePixelRatio || 1, W < 820 ? 1.5 : 2);
        renderer.setPixelRatio(dpr);
        renderer.setSize(W, H);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
        host.current.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
        const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 120);
        cam.position.copy(camPos);
        cam.lookAt(0, 0, 0);
        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(-4 * k, 9 * k, 5 * k);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        const sc = 12 * k;
        Object.assign(key.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc, far: 60 });
        key.shadow.radius = 4;
        scene.add(key);
        const catcher = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.42 }));
        catcher.rotation.x = -Math.PI / 2;
        catcher.receiveShadow = true;
        scene.add(catcher);
        const numTex = (n, col) => {
          const c = document.createElement("canvas");
          c.width = c.height = 128;
          const g = c.getContext("2d");
          g.font = "bold 78px Georgia, serif";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillStyle = col;
          g.shadowColor = col;
          g.shadowBlur = 10;
          g.fillText(String(n), 64, 70);
          return new THREE.CanvasTexture(c);
        };
        const disposables = [];
        const makeDie = (tint, att, numCol, labels) => {
          const g = new THREE.Group();
          const mat = new THREE.MeshPhysicalMaterial({ color: tint, transmission: 1, thickness: 1.6, ior: 1.5, roughness: 0.06, attenuationColor: att, attenuationDistance: 1.4, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.6, iridescenceIOR: 1.4, envMapIntensity: 1.6, transparent: true });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          g.add(mesh);
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
          g.add(edges);
          disposables.push(mat, edges.material, edges.geometry);
          faces.forEach((c, i) => {
            const nrm = c.clone().normalize();
            const tex = numTex(labels[i], numCol);
            const pm2 = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.95 });
            const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), pm2);
            pl.position.copy(nrm.clone().multiplyScalar(c.length() + 0.012));
            pl.lookAt(nrm.clone().multiplyScalar(5));
            g.add(pl);
            disposables.push(tex, pm2, pl.geometry);
          });
          return g;
        };
        const dH = makeDie(0xffe9a0, 0xf0a010, "#fff1b8", labH);
        const dF = makeDie(0xd9c4ff, 0x6a2bd6, "#efe3ff", labF);
        scene.add(dH, dF);
        const apply = (g, s) => {
          g.position.set(s[0], s[1], s[2]);
          g.quaternion.set(s[3], s[4], s[5], s[6]);
        };

        const veil = host.current.querySelector(".d3-veil");
        const t0 = performance.now();
        window.__d3rest = rest;
        const revealAt = rest + 0.6;
        const endAt = rest + 1.2;
        const tick = () => {
          if (dead) return;
          const t = (performance.now() - t0) / 1000;
          const i = Math.min(rec.length - 1, Math.max(0, Math.round(t / DT)));
          apply(dH, rec[i][0]);
          apply(dF, rec[i][1]);
          if (t >= revealAt) reveal();
          const fade = t > revealAt ? Math.max(0, 1 - (t - revealAt) / (endAt - revealAt)) : 1;
          host.current.style.opacity = String(Math.min(1, t / 0.12) * fade);
          if (veil) veil.style.opacity = String(0.35 * fade);
          renderer.render(scene, cam);
          if (t >= endAt) {
            cb.current.onEnd && cb.current.onEnd();
            return;
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        cleanup = () => {
          cancelAnimationFrame(raf);
          disposables.forEach((d) => d.dispose && d.dispose());
          geo.dispose();
          pm.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch (e) {
        reveal();
        cb.current.onEnd && cb.current.onEnd();
      }
    })();
    return () => {
      dead = true;
      cleanup();
    };
    // La tirada se decide una vez al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un toque en la pantalla salta la animación.
  const skip = () => {
    cb.current.onReveal && cb.current.onReveal();
    cb.current.onEnd && cb.current.onEnd();
  };
  return (
    <div ref={host} className="d3-host" onClick={skip} role="presentation" style={{ position: "fixed", inset: 0, zIndex: 100050, opacity: 0, cursor: "pointer" }}>
      <div className="d3-veil" style={{ position: "absolute", inset: 0, background: "rgb(8,6,12)", opacity: 0.35 }} />
    </div>
  );
}
