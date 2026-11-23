"use client";
// Monigote 3D con físicas: cabeza, torso, brazos y piernas separados por el mismo hueco, formas redondeadas y un acabado
// translúcido de pompa de jabón. Las piezas flotan unidas al torso con muelles (three para dibujar, cannon-es para las físicas).
// pose: "idle" (reposo) · "walk" (camina) · "jump" (salta) · "ragdoll" (muñeco de trapo, las piezas se unen y caen).
import { useEffect, useRef } from "react";

export default function Puppet3D({ color = "#E3B04B", pose = "idle", className = "" }) {
  const host = useRef(null);
  useEffect(() => {
    let dead = false, raf = 0, cleanup = () => {};
    (async () => {
      try {
        const THREE = await import("three");
        const C = await import("cannon-es");
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
        const el = host.current;
        if (dead || !el) return;
        const W = Math.max(40, el.clientWidth), H = Math.max(40, el.clientHeight);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(W, H);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTex;
        const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 60);
        cam.position.set(0, 2.3, 9.2);
        cam.lookAt(0, 1.3, 0);
        scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x4a3a66, 0.7));
        const dl = new THREE.DirectionalLight(0xffe2b0, 2.2);
        dl.position.set(-3.5, 6, 4.5);
        dl.castShadow = true;
        dl.shadow.mapSize.set(512, 512);
        Object.assign(dl.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
        scene.add(dl);
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.25 }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Cuerpo de revolución con los dos extremos totalmente redondeados: r0 arriba, r1 abajo, eT/eB = fracción de cada tapa redondeada.
        const lathe = (L, r0, r1, eT, eB, shape, seg = 44) => {
          const pts = [];
          for (let i = 0; i <= seg; i++) {
            const t = i / seg;
            const base = r0 + (r1 - r0) * Math.pow(t, shape);
            let c = 1;
            if (t < eT) c = Math.sqrt(Math.max(0, 1 - Math.pow(1 - t / eT, 2)));
            else if (t > 1 - eB) c = Math.sqrt(Math.max(0, 1 - Math.pow(1 - (1 - t) / eB, 2)));
            pts.push(new THREE.Vector2(Math.max(0.0001, base * c), L / 2 - t * L));
          }
          return new THREE.LatheGeometry(pts.reverse(), 48);
        };
        const G = 0.15; // misma separación entre el torso y cada pieza
        const TH = 0.96, TR0 = 0.17, TR1 = 0.35; // torso en pera: fino arriba, ancho abajo
        const trAt = (y) => TR0 + (TR1 - TR0) * Math.pow(Math.min(1, Math.max(0, (TH / 2 - y) / TH)), 0.95);
        const HR = 0.27, AL = 0.66, LL = 0.7, AR0 = 0.055, AR1 = 0.135, LR0 = 0.07, LR1 = 0.155;
        const sy = 0.41; // los brazos salen de la parte alta del torso, junto a los hombros
        const defs = {
          torso: { geo: lathe(TH, TR0, TR1, 0.3, 0.3, 0.9), scz: 0.8, shape: new C.Box(new C.Vec3(0.26, 0.45, 0.2)), mass: 3, k: 1, a: [0, 0, 0], pv: [0, 0, 0], tor: [0, 0, 0], rest: [0, 0, 0] },
          head: { geo: new THREE.SphereGeometry(HR, 40, 28), scz: 1, shape: new C.Sphere(HR), mass: 0.8, k: 1.12, a: [0, TH / 2 + G + HR, 0], pv: [0, -HR, 0], tor: [0, TH / 2, 0], rest: [0, 0, 0] },
          al: { geo: lathe(AL, AR0, AR1, AR0 / AL, AR1 / AL, 1.15), scz: 1, shape: new C.Box(new C.Vec3(0.1, AL / 2, 0.1)), mass: 0.5, k: 0.92, a: [-(trAt(sy) + G + AR0 + 0.03), sy - AL / 2 + 0.02, 0], pv: [0, AL / 2, 0], tor: [-trAt(sy), sy, 0], rest: [0, 0, 0.16] },
          ar: { geo: lathe(AL, AR0, AR1, AR0 / AL, AR1 / AL, 1.15), scz: 1, shape: new C.Box(new C.Vec3(0.1, AL / 2, 0.1)), mass: 0.5, k: 0.92, a: [trAt(sy) + G + AR0 + 0.03, sy - AL / 2 + 0.02, 0], pv: [0, AL / 2, 0], tor: [trAt(sy), sy, 0], rest: [0, 0, -0.16] },
          ll: { geo: lathe(LL, LR0, LR1, LR0 / LL, LR1 / LL, 1.15), scz: 1, shape: new C.Box(new C.Vec3(0.12, LL / 2, 0.12)), mass: 0.7, k: 0.8, a: [-0.19, -TH / 2 - G - LL / 2, 0], pv: [0, LL / 2, 0], tor: [-0.19, -TH / 2 + 0.04, 0], rest: [0, 0, 0] },
          lr: { geo: lathe(LL, LR0, LR1, LR0 / LL, LR1 / LL, 1.15), scz: 1, shape: new C.Box(new C.Vec3(0.12, LL / 2, 0.12)), mass: 0.7, k: 0.8, a: [0.19, -TH / 2 - G - LL / 2, 0], pv: [0, LL / 2, 0], tor: [0.19, -TH / 2 + 0.04, 0], rest: [0, 0, 0] },
        };
        const HOVER = G + LL + TH / 2 + 0.06;
        const world = new C.World({ gravity: new C.Vec3(0, -16, 0) });
        const gb = new C.Body({ mass: 0, shape: new C.Plane(), collisionFilterGroup: 1, collisionFilterMask: 2 });
        gb.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        world.addBody(gb);
        const ragdoll = pose === "ragdoll";
        let base;
        try { base = new THREE.Color(color); } catch { base = new THREE.Color("#E3B04B"); }
        const P = { parts: {}, springs: [] };
        for (const [n, d] of Object.entries(defs)) {
          // acabado de pompa: translúcido, brillante y con reflejos iridiscentes
          const mat = new THREE.MeshPhysicalMaterial({
            color: base.clone().multiplyScalar(d.k), transparent: true, opacity: 0.6, roughness: 0.07, metalness: 0,
            clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [160, 520],
            envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false,
          });
          const mesh = new THREE.Mesh(d.geo, mat);
          mesh.scale.z = d.scz;
          mesh.castShadow = true;
          mesh.renderOrder = n === "torso" ? 0 : n === "head" ? 2 : 1;
          scene.add(mesh);
          const b = new C.Body({ mass: n === "torso" && !ragdoll ? 0 : d.mass, shape: d.shape, collisionFilterGroup: 2, collisionFilterMask: 1, linearDamping: 0.12, angularDamping: 0.5 });
          if (n === "torso" && !ragdoll) b.type = C.Body.KINEMATIC;
          world.addBody(b);
          const qt = new C.Quaternion();
          qt.setFromEuler(d.rest[0], d.rest[1], d.rest[2]);
          P.parts[n] = { b, mesh, d, qt };
        }
        const T = P.parts.torso.b;
        for (const n of ["head", "al", "ar", "ll", "lr"]) {
          const q = P.parts[n];
          if (ragdoll) world.addConstraint(new C.PointToPointConstraint(T, new C.Vec3(...q.d.tor), q.b, new C.Vec3(...q.d.pv), 80));
          else P.springs.push({ n, sp: new C.Spring(T, q.b, { localAnchorA: new C.Vec3(...q.d.a), localAnchorB: new C.Vec3(0, 0, 0), restLength: 0, stiffness: n === "head" ? 260 : n[0] === "l" ? 230 : 190, damping: n === "head" ? 10 : 8 }) });
        }
        const reset = () => {
          const y0 = ragdoll ? 2.9 : HOVER;
          for (const q of Object.values(P.parts)) {
            q.b.position.set(q.d.a[0], y0 + q.d.a[1], 0);
            q.b.velocity.set(0, 0, 0);
            q.b.angularVelocity.set(0, 0, 0);
            if (ragdoll) q.b.quaternion.setFromEuler(0.4, 0, 0.5); else q.b.quaternion.copy(q.qt);
          }
          T.position.set(0, y0, 0);
          T.quaternion.set(0, 0, 0, 1);
        };
        reset();
        let t = 0, acc = 0, last = performance.now(), lastReset = 0;
        const an = (n, x, y) => P.springs.find((z) => z.n === n).sp.localAnchorA.set(x, y, 0);
        const step = () => {
          const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
          last = now; t += dt;
          if (ragdoll && t - lastReset > 3.6) { lastReset = t; reset(); }
          if (!ragdoll) {
            let tx = 0, ty = HOVER, sw = 0;
            if (pose === "walk") { tx = 0.7 * Math.sin(t * 1.2); sw = Math.sin(t * 7.5); ty = HOVER + Math.abs(Math.sin(t * 7.5)) * 0.07; }
            else if (pose === "jump") { const ph = (t * 0.8) % 1; ty = HOVER + (ph < 0.5 ? 0.9 * Math.sin((ph / 0.5) * Math.PI) : 0); }
            else ty = HOVER + Math.sin(t * 2) * 0.03;
            T.velocity.set((tx - T.position.x) / Math.max(dt, 1e-3), (ty - T.position.y) / Math.max(dt, 1e-3), 0);
            const D = defs;
            an("ll", D.ll.a[0] + sw * 0.1, D.ll.a[1] + Math.max(0, sw) * 0.2);
            an("lr", D.lr.a[0] - sw * 0.1, D.lr.a[1] + Math.max(0, -sw) * 0.2);
            an("al", D.al.a[0], D.al.a[1] + sw * 0.12);
            an("ar", D.ar.a[0], D.ar.a[1] - sw * 0.12);
            P.springs.forEach((z) => z.sp.applyForce());
            // par que mantiene cada pieza en su postura, como un músculo blando
            for (const n of ["head", "al", "ar", "ll", "lr"]) {
              const q = P.parts[n], b = q.b;
              const qe = new C.Quaternion();
              b.quaternion.mult(q.qt.inverse(), qe);
              const w = qe.w < 0 ? -1 : 1, ang = 2 * Math.acos(Math.min(1, Math.abs(qe.w))), sn = Math.sqrt(Math.max(1e-9, 1 - qe.w * qe.w));
              const kp = 26 * b.mass, kd = 3.4 * b.mass;
              b.torque.x += -kp * ang * ((qe.x * w) / sn) - kd * b.angularVelocity.x;
              b.torque.y += -kp * ang * ((qe.y * w) / sn) - kd * b.angularVelocity.y;
              b.torque.z += -kp * ang * ((qe.z * w) / sn) - kd * b.angularVelocity.z;
            }
          }
          acc += dt;
          while (acc >= 1 / 120) { world.step(1 / 120); acc -= 1 / 120; }
          Object.values(P.parts).forEach((q) => { q.mesh.position.copy(q.b.position); q.mesh.quaternion.copy(q.b.quaternion); });
          renderer.render(scene, cam);
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        cleanup = () => {
          cancelAnimationFrame(raf);
          Object.values(P.parts).forEach((q) => { q.mesh.geometry.dispose(); q.mesh.material.dispose(); });
          envTex.dispose();
          pmrem.dispose();
          renderer.dispose();
          el.innerHTML = "";
        };
      } catch {
        // sin WebGL no se muestra el monigote y el contenedor queda vacío
      }
    })();
    return () => { dead = true; cleanup(); };
  }, [color, pose]);
  return <div ref={host} className={"pp3d " + className} aria-hidden="true" />;
}
