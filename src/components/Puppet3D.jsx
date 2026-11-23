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
        const el = host.current;
        if (dead || !el) return;
        const W = Math.max(40, el.clientWidth), H = Math.max(40, el.clientHeight);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(W, H);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        // Entorno de cielo azul con ventanales luminosos: da los reflejos de cristal brillante del estilo Frutiger Aero (como en AEROSET).
        const envScene = new THREE.Scene();
        envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
          side: THREE.BackSide,
          vertexShader: "varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
          fragmentShader: "varying vec3 p; void main(){ float h = p.y; vec3 top = vec3(.08,.34,.82); vec3 mid = vec3(.52,.80,1.0); vec3 low = vec3(.93,.97,1.0); vec3 c = h > 0. ? mix(mid, top, pow(h, .6)) : mix(mid, low, pow(-h, .5)); gl_FragColor = vec4(c, 1.0); }",
        })));
        [[-14, 9, 16, 9, 6], [16, 7, 8, 7, 5], [0, 22, 0, 16, 12], [-18, 5, -8, 6, 9]].forEach(([x, y, z, w, h], i) => {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 7, 7.5), side: THREE.DoubleSide }));
          win.position.set(x, y, z);
          win.lookAt(0, 1, 0);
          envScene.add(win);
        });
        const envTex = pmrem.fromScene(envScene, 0.02).texture;
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
        const TH = 1.0, TR0 = 0.21, TR1 = 0.33; // torso en alubia: algo más fino arriba que abajo
        const trAt = (y) => TR0 + (TR1 - TR0) * Math.pow(Math.min(1, Math.max(0, (TH / 2 - y) / TH)), 0.95);
        const HR = 0.31, AL = 0.64, LL = 0.68, AR0 = 0.085, AR1 = 0.14, LR0 = 0.095, LR1 = 0.16; // extremidades gruesas, como fideos
        const sy = 0.41; // los brazos salen de la parte alta del torso, junto a los hombros
        const defs = {
          torso: { geo: lathe(TH, TR0, TR1, 0.3, 0.3, 0.9), scz: 0.8, shape: new C.Box(new C.Vec3(0.26, 0.45, 0.2)), mass: 3, k: 1, a: [0, 0, 0], pv: [0, 0, 0], tor: [0, 0, 0], rest: [0, 0, 0] },
          head: { geo: new THREE.SphereGeometry(HR, 40, 28), scz: 1, shape: new C.Sphere(HR), mass: 0.8, k: 1.12, a: [0, TH / 2 + G + HR, 0], pv: [0, -HR, 0], tor: [0, TH / 2, 0], rest: [0, 0, 0] },
          al: { geo: lathe(AL, AR0, AR1, AR0 / AL, AR1 / AL, 1.15), scz: 1, shape: new C.Box(new C.Vec3(0.1, AL / 2, 0.1)), mass: 0.5, k: 0.92, a: [-(trAt(sy) + G + AR0 + 0.03 + 0.053), sy - AL / 2 + 0.02, 0], pv: [0, AL / 2, 0], tor: [-trAt(sy), sy, 0], rest: [0, 0, -0.16] },
          ar: { geo: lathe(AL, AR0, AR1, AR0 / AL, AR1 / AL, 1.15), scz: 1, shape: new C.Box(new C.Vec3(0.1, AL / 2, 0.1)), mass: 0.5, k: 0.92, a: [trAt(sy) + G + AR0 + 0.03 + 0.053, sy - AL / 2 + 0.02, 0], pv: [0, AL / 2, 0], tor: [trAt(sy), sy, 0], rest: [0, 0, 0.16] },
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
            color: base.clone().multiplyScalar(d.k), emissive: base.clone().multiplyScalar(0.2), transparent: true, opacity: 0.82, roughness: 0.04, metalness: 0,
            clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.45, specularIntensity: 1,
            envMapIntensity: 1.7, side: THREE.DoubleSide, depthWrite: false,
          });
          // borde más intenso y centro más translúcido, como la jalea de cristal de AEROSET
          mat.onBeforeCompile = (sh) => {
            sh.fragmentShader = sh.fragmentShader.replace("#include <dithering_fragment>", `#include <dithering_fragment>
              float fr = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 1.4);
              gl_FragColor.a = mix(0.58, 0.97, fr);
              gl_FragColor.rgb *= mix(1.04, 0.78, fr);`);
          };
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
          else {
            const k = n === "head" ? 260 : n[0] === "l" ? 230 : 190;
            q.sag = (q.d.mass * 16) / k; // lo que la gravedad hunde la pieza en reposo: se compensa para que el hueco sea el previsto
            P.springs.push({ n, sp: new C.Spring(T, q.b, { localAnchorA: new C.Vec3(q.d.a[0], q.d.a[1] + q.sag, q.d.a[2]), localAnchorB: new C.Vec3(0, 0, 0), restLength: 0, stiffness: k, damping: n === "head" ? 10 : 8 }) });
          }
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
        const an = (n, x, y) => P.springs.find((z) => z.n === n).sp.localAnchorA.set(x, y + P.parts[n].sag, 0);
        // Las fuerzas se aplican en cada paso de la física (el motor las borra tras cada paso).
        const forces = () => {
          if (ragdoll) return;
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
        };
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
          }
          acc += dt;
          while (acc >= 1 / 120) { forces(); world.step(1 / 120); acc -= 1 / 120; }
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
  return <div ref={host} className={"pp3d " + className} style={{ width: "100%", height: "100%" }} aria-hidden="true" />;
}
