// Monigote 3D con físicas (three para dibujar, cannon-es para las físicas), compartido por todos los sitios que lo usan.
// Cristal de dos capas inspirado en AEROSET: cáscara translúcida con el borde violeta y núcleo vivo del color indicado.
// Cabeza, torso, brazos y piernas son piezas sueltas que flotan unidas al torso con muelles; los huecos con el torso son los medidos en AEROSET.

let kitPromise;
export function loadKit() {
  if (!kitPromise) kitPromise = (async () => ({ THREE: await import("three"), C: await import("cannon-es") }))();
  return kitPromise;
}

// Escenario: render transparente con entorno de cielo, luces, suelo que solo recibe sombra y mundo de físicas.
export function createStage({ THREE, C }, el) {
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
  // Entorno de cielo azul con ventanales luminosos: da los reflejos de cristal brillante del estilo Frutiger Aero.
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: "varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 p; void main(){ float h = p.y; vec3 top = vec3(.08,.34,.82); vec3 mid = vec3(.52,.80,1.0); vec3 low = vec3(.93,.97,1.0); vec3 c = h > 0. ? mix(mid, top, pow(h, .6)) : mix(mid, low, pow(-h, .5)); gl_FragColor = vec4(c, 1.0); }",
  })));
  [[-14, 9, 16, 9, 6], [16, 7, 8, 7, 5], [0, 22, 0, 16, 12], [-18, 5, -8, 6, 9]].forEach(([x, y, z, w, h]) => {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 7, 7.5), side: THREE.DoubleSide }));
    win.position.set(x, y, z);
    win.lookAt(0, 1, 0);
    envScene.add(win);
  });
  const envTex = pmrem.fromScene(envScene, 0.02).texture;
  scene.environment = envTex;
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 80);
  cam.position.set(0, 2.45, 9.6);
  cam.lookAt(0, 2.45, 0); // cámara horizontal: el suelo queda justo en el borde inferior del lienzo
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x4a3a66, 0.7));
  const dl = new THREE.DirectionalLight(0xffe2b0, 2.2);
  dl.position.set(-3.5, 6, 4.5);
  dl.castShadow = true;
  dl.shadow.mapSize.set(1024, 1024);
  Object.assign(dl.shadow.camera, { left: -11, right: 11, top: 8, bottom: -8 });
  scene.add(dl);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.25 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const world = new C.World({ gravity: new C.Vec3(0, -16, 0) });
  const gb = new C.Body({ mass: 0, shape: new C.Plane(), collisionFilterGroup: 1, collisionFilterMask: 2 });
  gb.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(gb);
  const ro = new ResizeObserver(() => {
    const w = el.clientWidth, h = el.clientHeight;
    if (w > 0 && h > 0) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  });
  ro.observe(el);
  const v = new THREE.Vector3();
  return {
    THREE, scene, world, cam, renderer,
    // medio ancho visible (unidades de mundo) en el plano del suelo
    halfWidth: () => Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z * cam.aspect,
    // posición en píxeles dentro del contenedor
    project: (x, y, z) => { v.set(x, y, z).project(cam); return [((v.x + 1) / 2) * el.clientWidth, ((1 - v.y) / 2) * el.clientHeight]; },
    render: () => renderer.render(scene, cam),
    dispose: () => { ro.disconnect(); envTex.dispose(); pmrem.dispose(); renderer.dispose(); el.innerHTML = ""; },
  };
}

// Un monigote: devuelve las piezas y los métodos para moverlo (drive), aplicar sus muelles en cada paso de física (forces),
// copiar la física al dibujo (sync) y liberarlo (dispose).
export function createRig({ THREE, C }, scene, world, { color = "#E3B04B", x = 0, z = 0 } = {}) {
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
  // Interpolación suave (cúbica de Hermite) por los puntos [posición 0..1, valor].
  const interp = (pts, xx) => {
    const n = pts.length;
    let i = 0;
    while (i < n - 2 && xx > pts[i + 1][0]) i++;
    const m = (k) => (k <= 0 ? (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]) : k >= n - 1 ? (pts[n - 1][1] - pts[n - 2][1]) / (pts[n - 1][0] - pts[n - 2][0]) : (pts[k + 1][1] - pts[k - 1][1]) / (pts[k + 1][0] - pts[k - 1][0]));
    const [s0, v0] = pts[i], [s1, v1] = pts[i + 1], h = s1 - s0, t = (xx - s0) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * h * m(i) + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * h * m(i + 1);
  };
  // Extremidad lisa que no es un cilindro: el grosor sigue un perfil (diámetro en cabezas) y las puntas se cierran en semiesfera.
  const limbGeo = (L, env, N = 110) => {
    const rT = (interp(env, 0) * D) / 2, rB = (interp(env, 1) * D) / 2, eT = rT / L, eB = rB / L, pts = [];
    for (let k = 0; k <= N; k++) {
      const u = (1 - Math.cos((Math.PI * k) / N)) / 2; // más puntos en las puntas
      const b = (interp(env, u) * D) / 2;
      const c = u < eT ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - u / eT, 2))) : u > 1 - eB ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - (1 - u) / eB, 2))) : 1;
      pts.push(new THREE.Vector2(Math.max(0.0001, b * c), L / 2 - u * L));
    }
    return new THREE.LatheGeometry(pts.reverse(), 56);
  };
  // Proporciones medidas sobre las capturas de AEROSET, en diámetros de cabeza (D = 1).
  const HR = 0.31, D = HR * 2;
  const Gh = 0.08, Ga = 0.075, Gl = 0.02, LX = 0.18; // huecos con el torso (AEROSET)
  const TH = 2.17 * D, TR0 = 0.42 * D, TR1 = 0.56 * D; // torso: 2,17 de alto, más fino arriba que abajo
  const AL = 1.7 * D, LL = 2.0 * D; // largo de brazos y piernas
  const ARM_ENV = [[0, 0.3], [0.3, 0.36], [0.7, 0.4], [1, 0.42]]; // diámetro en cabezas, de arriba abajo: más fino junto al torso
  const LEG_ENV = [[0, 0.4], [0.3, 0.47], [0.7, 0.53], [1, 0.55]];
  const SPL = 0.22, LSP = 0.07; // brazos y piernas se abren ligeramente hacia fuera por abajo
  const trAt = (y) => TR0 + (TR1 - TR0) * Math.pow(Math.min(1, Math.max(0, (TH / 2 - y) / TH)), 1.1);
  const sy = TH / 2 - 0.2; // los brazos salen de lo más alto del torso, junto a los hombros
  const rTop = (ARM_ENV[0][1] * D) / 2;
  const ax = trAt(sy) + Ga + rTop + (AL / 2) * Math.sin(SPL); // el extremo de arriba del brazo es lo más cercano al torso
  const ay = sy - (AL / 2) * Math.cos(SPL);
  const armGeo = limbGeo(AL, ARM_ENV), legGeo = limbGeo(LL, LEG_ENV);
  const defs = {
    torso: { geo: capsuleGeo(TH, TR0, TR1, 1, 0.72), scz: 0.8, shape: new C.Box(new C.Vec3(0.3, TH * 0.45, 0.2)), mass: 4, k: 1, a: [0, 0, 0], rest: [0, 0, 0] },
    head: { geo: new THREE.SphereGeometry(HR, 40, 28), scz: 1, shape: new C.Sphere(HR), mass: 0.8, k: 1.12, a: [0, TH / 2 + Gh + HR, 0], rest: [0, 0, 0] },
    al: { geo: armGeo, scz: 1, shape: new C.Box(new C.Vec3(0.09, AL / 2, 0.09)), mass: 0.6, k: 0.92, a: [-ax, ay, 0], rest: [0, 0, -SPL] },
    ar: { geo: armGeo, scz: 1, shape: new C.Box(new C.Vec3(0.09, AL / 2, 0.09)), mass: 0.6, k: 0.92, a: [ax, ay, 0], rest: [0, 0, SPL] },
    ll: { geo: legGeo, scz: 1, shape: new C.Box(new C.Vec3(0.14, LL / 2, 0.14)), mass: 1, k: 0.8, a: [-LX - (LL / 2) * Math.sin(LSP), -TH / 2 - Gl - (LL / 2) * Math.cos(LSP), 0], rest: [0, 0, -LSP] },
    lr: { geo: legGeo, scz: 1, shape: new C.Box(new C.Vec3(0.14, LL / 2, 0.14)), mass: 1, k: 0.8, a: [LX + (LL / 2) * Math.sin(LSP), -TH / 2 - Gl - (LL / 2) * Math.cos(LSP), 0], rest: [0, 0, LSP] },
  };
  const HOVER = Gl + LL + TH / 2 + 0.06; // altura del torso para que los pies casi toquen el suelo
  let base;
  try { base = new THREE.Color(color); } catch { base = new THREE.Color("#E3B04B"); }
  const rim = base.clone().lerp(new THREE.Color(0xb48be8), 0.38); // borde violeta de la cáscara
  const parts = {}, springs = [];
  for (const [n, d] of Object.entries(defs)) {
    // Cristal de dos capas: núcleo vivo por dentro y cáscara translúcida por fuera.
    const grp = new THREE.Group();
    const core = new THREE.Mesh(d.geo, new THREE.MeshPhysicalMaterial({
      color: base.clone().multiplyScalar(d.k * 0.72), emissive: base.clone().multiplyScalar(0.03), roughness: 0.28, metalness: 0,
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
    scene.add(grp);
    const b = new C.Body({ mass: n === "torso" ? 0 : d.mass, shape: d.shape, collisionFilterGroup: 2, collisionFilterMask: 1, linearDamping: 0.12, angularDamping: 0.5 });
    if (n === "torso") b.type = C.Body.KINEMATIC;
    world.addBody(b);
    const qt = new C.Quaternion();
    qt.setFromEuler(d.rest[0], d.rest[1], d.rest[2]);
    parts[n] = { b, grp, d, qt, mats: [core.material, shellMat] };
  }
  const T = parts.torso.b;
  for (const n of ["head", "al", "ar", "ll", "lr"]) {
    const q = parts[n];
    const k = n === "head" ? 260 : n[0] === "l" ? 320 : 210;
    q.sag = (q.d.mass * 16) / k; // lo que la gravedad hunde la pieza en reposo: se compensa para que el hueco sea el previsto
    springs.push({ n, sp: new C.Spring(T, q.b, { localAnchorA: new C.Vec3(q.d.a[0], q.d.a[1] + q.sag, q.d.a[2]), localAnchorB: new C.Vec3(0, 0, 0), restLength: 0, stiffness: k, damping: n === "head" ? 10 : 8 }) });
  }
  for (const q of Object.values(parts)) {
    q.b.position.set(x + q.d.a[0], HOVER + q.d.a[1], z + q.d.a[2]);
    q.b.quaternion.copy(q.qt);
  }
  T.position.set(x, HOVER, z);
  T.quaternion.set(0, 0, 0, 1);
  const an = (n, ax2, ay2) => springs.find((s) => s.n === n).sp.localAnchorA.set(ax2, ay2 + parts[n].sag, 0);
  return {
    HOVER,
    topY: HOVER + TH / 2 + Gh + 2 * HR, // altura de lo más alto de la cabeza
    // Mueve el torso hasta (tx, ty, tz); sw = balanceo de brazos y piernas (-1..1).
    drive(dt, tx, ty, tz, sw) {
      const k = Math.max(dt, 1e-3);
      T.velocity.set((tx - T.position.x) / k, (ty - T.position.y) / k, (tz - T.position.z) / k);
      an("ll", defs.ll.a[0] + sw * 0.1, defs.ll.a[1] + Math.max(0, sw) * 0.2);
      an("lr", defs.lr.a[0] - sw * 0.1, defs.lr.a[1] + Math.max(0, -sw) * 0.2);
      an("al", defs.al.a[0], defs.al.a[1] + sw * 0.12);
      an("ar", defs.ar.a[0], defs.ar.a[1] - sw * 0.12);
    },
    // Las fuerzas se aplican en cada paso de la física (el motor las borra tras cada paso).
    forces() {
      springs.forEach((s) => s.sp.applyForce());
      // par que mantiene cada pieza en su postura, como un músculo blando
      for (const n of ["head", "al", "ar", "ll", "lr"]) {
        const q = parts[n], b = q.b;
        const qe = new C.Quaternion();
        b.quaternion.mult(q.qt.inverse(), qe);
        const w = qe.w < 0 ? -1 : 1, ang = 2 * Math.acos(Math.min(1, Math.abs(qe.w))), sn = Math.sqrt(Math.max(1e-9, 1 - qe.w * qe.w));
        const kp = 26 * b.mass, kd = 3.4 * b.mass;
        b.torque.x += -kp * ang * ((qe.x * w) / sn) - kd * b.angularVelocity.x;
        b.torque.y += -kp * ang * ((qe.y * w) / sn) - kd * b.angularVelocity.y;
        b.torque.z += -kp * ang * ((qe.z * w) / sn) - kd * b.angularVelocity.z;
      }
    },
    sync() { Object.values(parts).forEach((q) => { q.grp.position.copy(q.b.position); q.grp.quaternion.copy(q.b.quaternion); }); },
    dispose() {
      Object.values(parts).forEach((q) => { scene.remove(q.grp); world.removeBody(q.b); q.mats.forEach((m) => m.dispose()); });
      armGeo.dispose(); legGeo.dispose();
      Object.values(defs).forEach((d) => d.geo.dispose());
    },
  };
}
