"use client";
// Monigote 3D con físicas: cabeza, torso, brazos y piernas separados por el mismo hueco, formas redondeadas y un acabado
// translúcido de pompa de jabón. Las piezas flotan unidas al torso con muelles (three para dibujar, cannon-es para las físicas).
// pose: "idle" (reposo) · "walk" (camina) · "jump" (salta) · "ragdoll" (muñeco de trapo, las piezas se unen y caen).
import { useEffect, useRef } from "react";

export default function Puppet3D({ color = "#E3B04B", pose = "idle", variant = "enaris", className = "" }) {
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
        let cam; // se crea más abajo; el observador de tamaño la usa
        const ro = new ResizeObserver(() => {
          const w = el.clientWidth, h = el.clientHeight;
          if (w > 0 && h > 0 && cam) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
        });
        ro.observe(el);
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
        cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 60);
        const wide = pose === "t"; // en cruz la figura es más ancha: cámara algo más cerca y centrada
        cam.position.set(0, wide ? 2.6 : 3.2, wide ? 8.4 : 12.8);
        cam.lookAt(0, wide ? 1.55 : 1.85, 0);
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

        // Cápsula cónica con los dos extremos semiesféricos de verdad: r0 arriba (junto al torso), r1 abajo.
        // fT y fB aplastan verticalmente cada tapa (1 = esfera completa). Devuelve el perfil de arriba abajo.
        const capsule = (L, r0, r1, fT = 1, fB = 1, n = 18) => {
          const yT = L / 2 - r0 * fT, yB = -L / 2 + r1 * fB, d = Math.max(yT - yB, 1e-3);
          const th = Math.acos(Math.max(-0.99, Math.min(0.99, (r1 - r0) / d)));
          const pts = [];
          for (let k = 0; k <= n; k++) { const a = (th * k) / n; pts.push({ r: r0 * Math.sin(a), y: yT + r0 * fT * Math.cos(a) }); }
          for (let k = 0; k <= n; k++) { const a = th + ((Math.PI - th) * k) / n; pts.push({ r: r1 * Math.sin(a), y: yB + r1 * fB * Math.cos(a) }); }
          return pts;
        };
        const capsuleGeo = (L, r0, r1, fT, fB) => new THREE.LatheGeometry(capsule(L, r0, r1, fT, fB).map((q) => new THREE.Vector2(Math.max(0.0001, q.r), q.y)).reverse(), 56);
        // Interpolación suave (cúbica de Hermite) por los puntos [posición 0..1, valor] medidos sobre AEROSET.
        const interp = (pts, x) => {
          const n = pts.length;
          let i = 0;
          while (i < n - 2 && x > pts[i + 1][0]) i++;
          const m = (k) => (k <= 0 ? (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]) : k >= n - 1 ? (pts[n - 1][1] - pts[n - 2][1]) / (pts[n - 1][0] - pts[n - 2][0]) : (pts[k + 1][1] - pts[k - 1][1]) / (pts[k + 1][0] - pts[k - 1][0]));
          const [s0, v0] = pts[i], [s1, v1] = pts[i + 1], h = s1 - s0, t = (x - s0) / h, t2 = t * t, t3 = t2 * t;
          return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * h * m(i) + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * h * m(i + 1);
        };
        // Extremidad que NO es un cilindro: el grosor sigue un perfil (env = [posición, diámetro en cabezas]) y las dos puntas se cierran en semiesfera.
        const limbPts = (L, env, N = 110) => {
          const rT = (interp(env, 0) * D) / 2, rB = (interp(env, 1) * D) / 2, eT = rT / L, eB = rB / L, pts = [];
          for (let k = 0; k <= N; k++) {
            const u = (1 - Math.cos((Math.PI * k) / N)) / 2; // más puntos en las puntas
            const b = (interp(env, u) * D) / 2;
            const c = u < eT ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - u / eT, 2))) : u > 1 - eB ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - (1 - u) / eB, 2))) : 1;
            pts.push({ r: Math.max(0.0001, b * c), y: L / 2 - u * L });
          }
          return pts;
        };
        const limbGeo = (pts, L) => {
          const g = new THREE.LatheGeometry(pts.map((q) => new THREE.Vector2(q.r, q.y)).reverse(), 56);
          const pos = g.attributes.position, uv = g.attributes.uv;
          for (let k = 0; k < pos.count; k++) uv.setY(k, (L / 2 - pos.getY(k)) / L); // la rejilla sigue el largo real de la extremidad
          return g;
        };
        const aero = variant === "aeroset", tp = pose === "t";
        // Huecos con el torso: los medidos en AEROSET o los nuestros (uniformes). pose "t" = brazos en cruz y sin animación.
        const Gh = aero ? 0.08 : 0.15, Ga = aero ? 0.075 : 0.15, Gl = aero ? 0.02 : 0.15, LX = aero ? 0.18 : 0.25;
        // Proporciones medidas sobre las capturas de AEROSET, en diámetros de cabeza (D = 1).
        const HR = 0.31, D = HR * 2;
        const TH = 2.17 * D, TR0 = (aero ? 0.4 : 0.42) * D, TR1 = (aero ? 0.52 : 0.56) * D; // torso: 2,17 de alto, 0,8 de ancho arriba y 1,1 abajo (medido 0,81 y 1,04)
        const AL = 1.7 * D, LL = 2.0 * D; // largo de brazos y piernas
        // Extremidades lisas, algo más finas junto al torso y más gruesas hacia el extremo (como en AEROSET), con puntas semiesféricas.
        const ARM_ENV = [[0, 0.3], [0.3, 0.36], [0.7, 0.4], [1, 0.42]];
        const LEG_ENV = [[0, 0.4], [0.3, 0.47], [0.7, 0.53], [1, 0.55]];
        const ARM_PTS = limbPts(AL, ARM_ENV), LEG_PTS = limbPts(LL, LEG_ENV);
        const ARn = 0.1; // radio del brazo cerca del hombro (para el hueco)
        const SPL = 0.22; // los brazos se abren unos 12° hacia fuera por abajo
        const LSP = tp ? 0 : 0.07; // pose de reposo: las piernas se abren ligeramente
        const trAt = (y) => TR0 + (TR1 - TR0) * Math.pow(Math.min(1, Math.max(0, (TH / 2 - y) / TH)), 1.1);
        const sy = TH / 2 - (aero || tp ? 0.2 : 0.14); // los brazos salen de lo más alto del torso, junto a los hombros
        const ax = trAt(sy) + Ga + ARn + 0.03 + (AL / 2) * Math.sin(SPL); // el extremo de arriba del brazo es lo más cercano al torso
        const ay = sy - (AL / 2) * Math.cos(SPL) + 0.02;
        const defs = {
          torso: { geo: capsuleGeo(TH, TR0, TR1, 1, aero ? 0.55 : 0.72), scz: 0.8, shape: new C.Box(new C.Vec3(0.3, TH * 0.45, 0.2)), mass: 4, k: 1, a: [0, 0, 0], pv: [0, 0, 0], tor: [0, 0, 0], rest: [0, 0, 0] },
          head: { geo: new THREE.SphereGeometry(HR, 40, 28), scz: 1, shape: new C.Sphere(HR), mass: 0.8, k: 1.12, a: [0, TH / 2 + Gh + HR, 0], pv: [0, -HR, 0], tor: [0, TH / 2, 0], rest: [0, 0, 0] },
          al: { geo: limbGeo(ARM_PTS, AL), grid: true, scz: 1, shape: new C.Box(new C.Vec3(0.09, AL / 2, 0.09)), mass: 0.6, k: 0.92, a: tp ? [-(trAt(sy) + Ga + AL / 2), sy, 0] : [-ax, ay, 0], pv: [0, AL / 2, 0], tor: [-trAt(sy), sy, 0], rest: [0, 0, tp ? -Math.PI / 2 : -SPL] },
          ar: { geo: limbGeo(ARM_PTS, AL), grid: true, scz: 1, shape: new C.Box(new C.Vec3(0.09, AL / 2, 0.09)), mass: 0.6, k: 0.92, a: tp ? [trAt(sy) + Ga + AL / 2, sy, 0] : [ax, ay, 0], pv: [0, AL / 2, 0], tor: [trAt(sy), sy, 0], rest: [0, 0, tp ? Math.PI / 2 : SPL] },
          ll: { geo: limbGeo(LEG_PTS, LL), grid: true, scz: 1, shape: new C.Box(new C.Vec3(0.14, LL / 2, 0.14)), mass: 1, k: 0.8, a: [-LX - (LL / 2) * Math.sin(LSP), -TH / 2 - Gl - (LL / 2) * Math.cos(LSP), 0], pv: [0, LL / 2, 0], tor: [-0.2, -TH / 2 + 0.04, 0], rest: [0, 0, -LSP] },
          lr: { geo: limbGeo(LEG_PTS, LL), grid: true, scz: 1, shape: new C.Box(new C.Vec3(0.14, LL / 2, 0.14)), mass: 1, k: 0.8, a: [LX + (LL / 2) * Math.sin(LSP), -TH / 2 - Gl - (LL / 2) * Math.cos(LSP), 0], pv: [0, LL / 2, 0], tor: [0.2, -TH / 2 + 0.04, 0], rest: [0, 0, LSP] },
        };
        const HOVER = Gl + LL + TH / 2 + 0.06;
        const world = new C.World({ gravity: new C.Vec3(0, -16, 0) });
        const gb = new C.Body({ mass: 0, shape: new C.Plane(), collisionFilterGroup: 1, collisionFilterMask: 2 });
        gb.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        world.addBody(gb);
        const ragdoll = pose === "ragdoll";
        let base;
        try { base = new THREE.Color(color); } catch { base = new THREE.Color("#E3B04B"); }
        const rim = base.clone().lerp(new THREE.Color(0xb48be8), 0.38); // borde violeta de la cáscara
        const gridTex = (() => {
          const cv = document.createElement("canvas");
          cv.width = cv.height = 256;
          const g = cv.getContext("2d");
          g.fillStyle = "#ffffff";
          g.fillRect(0, 0, 256, 256);
          g.strokeStyle = "#8a5a50";
          g.lineWidth = 22;
          g.lineCap = "round";
          for (const v of [0, 128, 256]) { g.beginPath(); g.moveTo(0, v); g.lineTo(256, v); g.stroke(); g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 256); g.stroke(); }
          const tx = new THREE.CanvasTexture(cv);
          tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
          tx.colorSpace = THREE.SRGBColorSpace;
          tx.anisotropy = 4;
          return tx;
        })();
        const P = { parts: {}, springs: [] };
        for (const [n, d] of Object.entries(defs)) {
          // Cristal de dos capas, como en AEROSET: núcleo vivo (con rejilla en las extremidades) y cáscara translúcida con el borde violeta.
          const grp = new THREE.Group();
          const tex = d.grid ? gridTex.clone() : null;
          if (tex) { tex.needsUpdate = true; tex.repeat.set(2, n[0] === "l" ? 2.6 : 3.3); } // casillas casi cuadradas, 4 alrededor de la extremidad
          const core = new THREE.Mesh(d.geo, new THREE.MeshPhysicalMaterial({
            color: base.clone().multiplyScalar(d.k * 0.72), map: tex, emissive: base.clone().multiplyScalar(0.03), roughness: 0.28, metalness: 0,
            clearcoat: 0.7, clearcoatRoughness: 0.06, envMapIntensity: 0.22,
          }));
          core.scale.set(0.85, n === "head" ? 0.85 : 0.93, 0.85 * d.scz); // la cabeza se reduce por igual en los tres ejes para seguir siendo esférica
          const shellMat = new THREE.MeshPhysicalMaterial({
            color: base.clone().lerp(new THREE.Color(0xffffff), 0.18), transparent: true, opacity: 0.4, roughness: 0.04, metalness: 0,
            clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.45, envMapIntensity: 1.8, depthWrite: false,
          });
          shellMat.onBeforeCompile = (sh) => {
            sh.uniforms.rimCol = { value: rim };
            sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 rimCol;").replace("#include <dithering_fragment>", `#include <dithering_fragment>
              float fr = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 1.6);
              gl_FragColor.a = mix(0.2, 0.88, fr);
              gl_FragColor.rgb = mix(gl_FragColor.rgb, rimCol, fr * 0.6);`);
          };
          const shell = new THREE.Mesh(d.geo, shellMat);
          shell.scale.z = d.scz;
          shell.castShadow = true;
          shell.renderOrder = 1;
          grp.add(core, shell);
          const mesh = grp;
          scene.add(mesh);
          const b = new C.Body({ mass: n === "torso" && !ragdoll ? 0 : d.mass, shape: d.shape, collisionFilterGroup: 2, collisionFilterMask: 1, linearDamping: 0.12, angularDamping: 0.5 });
          if (n === "torso" && !ragdoll) b.type = C.Body.KINEMATIC;
          world.addBody(b);
          const qt = new C.Quaternion();
          qt.setFromEuler(d.rest[0], d.rest[1], d.rest[2]);
          P.parts[n] = { b, mesh, d, qt, mats: [core.material, shellMat] };
        }
        const T = P.parts.torso.b;
        for (const n of ["head", "al", "ar", "ll", "lr"]) {
          const q = P.parts[n];
          if (ragdoll) world.addConstraint(new C.PointToPointConstraint(T, new C.Vec3(...q.d.tor), q.b, new C.Vec3(...q.d.pv), 80));
          else {
            const k = n === "head" ? 260 : n[0] === "l" ? 320 : 210;
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
          if (!ragdoll && !tp) {
            let tx = 0, ty = HOVER, sw = 0;
            if (pose === "walk") { tx = 0.7 * Math.sin(t * 1.2); sw = Math.sin(t * 7.5); ty = HOVER + Math.abs(Math.sin(t * 7.5)) * 0.07; }
            else if (pose === "jump") { const ph = (t * 0.8) % 1; ty = HOVER + (ph < 0.5 ? 0.9 * Math.sin((ph / 0.5) * Math.PI) : 0); }
            else { ty = HOVER + Math.sin(t * 2) * 0.025; tx = Math.sin(t * 0.8) * 0.05; sw = Math.sin(t * 1.6) * 0.12; }
            T.velocity.set((tx - T.position.x) / Math.max(dt, 1e-3), (ty - T.position.y) / Math.max(dt, 1e-3), 0);
            const D = defs;
            an("ll", D.ll.a[0] + sw * 0.1, D.ll.a[1] + Math.max(0, sw) * 0.2);
            an("lr", D.lr.a[0] - sw * 0.1, D.lr.a[1] + Math.max(0, -sw) * 0.2);
            an("al", D.al.a[0], D.al.a[1] + sw * 0.12);
            an("ar", D.ar.a[0], D.ar.a[1] - sw * 0.12);
          }
          acc += dt;
          if (!tp) while (acc >= 1 / 120) { forces(); world.step(1 / 120); acc -= 1 / 120; }
          Object.values(P.parts).forEach((q) => { q.mesh.position.copy(q.b.position); q.mesh.quaternion.copy(q.b.quaternion); });
          renderer.render(scene, cam);
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          Object.values(P.parts).forEach((q) => { q.d.geo.dispose(); q.mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
          gridTex.dispose();
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
  }, [color, pose, variant]);
  return <div ref={host} className={"pp3d " + className} style={{ width: "100%", height: "100%" }} aria-hidden="true" />;
}
