"use client";

// Imágenes de los d10 que hacen de fichas sobre las cartas. Se renderizan una sola vez con three.js y el mismo vidrio
// que los dados de daño de las tiradas (Dice3D), con el número hacia arriba y la cámara algo inclinada. Si no hay
// WebGL devuelve null y la carta usa el dibujo plano.
let cache = null;

export function d10Sprites() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (cache) return cache;
  cache = (async () => {
    const [THREE, { RoomEnvironment }] = await Promise.all([import("three"), import("three/examples/jsm/environments/RoomEnvironment.js")]);
    const SIZE = 192;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    cam.position.set(0, 3.5, 2.9);
    cam.lookAt(0, 0, 0);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-4, 11, 4);
    scene.add(key);

    // d10: trapezoedro pentagonal (misma construcción que en Dice3D)
    const c = 0.105;
    const U = (i) => new THREE.Vector3(Math.cos((i * 2 * Math.PI) / 5), c, Math.sin((i * 2 * Math.PI) / 5));
    const L = (i) => new THREE.Vector3(Math.cos(((i * 2 + 1) * Math.PI) / 5), -c, Math.sin(((i * 2 + 1) * Math.PI) / 5));
    const n0 = new THREE.Vector3().crossVectors(U(1).clone().sub(U(0)), L(0).clone().sub(U(0)));
    const h = c + (n0.x * U(0).x + n0.z * U(0).z) / n0.y;
    const T = new THREE.Vector3(0, h, 0);
    const B = new THREE.Vector3(0, -h, 0);
    const pts = [];
    const tri = (a, b, d) => {
      const nn = new THREE.Vector3().crossVectors(b.clone().sub(a), d.clone().sub(a));
      const ctr = a.clone().add(b).add(d).divideScalar(3);
      if (nn.dot(ctr) < 0) pts.push(a, d, b);
      else pts.push(a, b, d);
    };
    for (let i = 0; i < 5; i++) {
      tri(T, U(i), L(i));
      tri(T, L(i), U(i + 1));
      tri(B, L(i), U(i + 1));
      tri(B, U(i + 1), L(i + 1));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const m = Math.max(...pts.map((p) => p.length()));
    geo.scale(1 / m, 1 / m, 1 / m);

    // Caras en cometa: triángulos coplanares agrupados
    const pos = geo.attributes.position;
    const byKey = new Map();
    for (let i = 0; i < pos.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, i);
      const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
      const d = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
      const nrm = new THREE.Vector3().crossVectors(b.clone().sub(a), d.clone().sub(a)).normalize();
      const key2 = nrm.toArray().map((v) => Math.round(v * 200)).join(",");
      if (!byKey.has(key2)) byKey.set(key2, { n: nrm, pts: [] });
      byKey.get(key2).pts.push(a, b, d);
    }
    const faces = [...byKey.values()].map((f) => {
      const uniq = [];
      f.pts.forEach((p) => {
        if (!uniq.some((q) => q.distanceTo(p) < 1e-4)) uniq.push(p);
      });
      const ctr = uniq.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(uniq.length);
      // vértices en orden alrededor del centro, para medir el radio interior de la cometa
      const u0 = uniq[0].clone().sub(ctr).normalize();
      const w0 = new THREE.Vector3().crossVectors(f.n, u0);
      const ang = (q) => Math.atan2(q.clone().sub(ctr).dot(w0), q.clone().sub(ctr).dot(u0));
      uniq.sort((a, b) => ang(a) - ang(b));
      let inr = 9;
      for (let i = 0; i < uniq.length; i++) {
        const p = uniq[i];
        const q = uniq[(i + 1) % uniq.length];
        const e = q.clone().sub(p).normalize();
        const v = ctr.clone().sub(p);
        inr = Math.min(inr, v.clone().sub(e.clone().multiplyScalar(v.dot(e))).length());
      }
      return { n: f.n, ctr, size: Math.min(inr * 1.35, 0.7) };
    });

    const numTex = (n) => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 128;
      const g = cv.getContext("2d");
      g.font = "bold 80px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.lineJoin = "round";
      g.lineWidth = 12;
      g.strokeStyle = "#5a0f05";
      g.strokeText(String(n), 64, 70);
      g.fillStyle = "#fff6ee";
      g.fillText(String(n), 64, 70);
      if (n === 6 || n === 9) {
        g.fillRect(52, 112, 24, 6);
      }
      return new THREE.CanvasTexture(cv);
    };

    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffd6c8, transmission: 1, thickness: 1.6, ior: 1.5, roughness: 0.06, attenuationColor: 0xd9482a, attenuationDistance: 1.4, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.6, iridescenceIOR: 1.4, envMapIntensity: 1.1, transparent: true });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    // Pose: apoyado sobre un polo, con una cara superior mirando a la cámara y el número derecho (su parte alta hacia el polo).
    const f = faces.filter((x) => x.n.y > 0.2).sort((p, q) => q.n.y - p.n.y)[0];
    const yA = new THREE.Vector3(0, 1, 0).sub(f.n.clone().multiplyScalar(f.n.y)).normalize();
    const xA = new THREE.Vector3().crossVectors(yA, f.n);
    const local = new THREE.Matrix4().makeBasis(xA, yA, f.n);
    const yaw = Math.atan2(-f.n.x, f.n.z);
    const phi = Math.asin(f.n.y) - 0.4;
    const D = 4.4;
    cam.position.set(Math.sin(0.35) * Math.cos(phi) * D, Math.sin(phi) * D, Math.cos(0.35) * Math.cos(phi) * D);
    cam.lookAt(0, 0, 0);
    const urls = [];
    for (let n = 1; n <= 10; n++) {
      const body = new THREE.Group();
      body.add(new THREE.Mesh(geo, mat));
      body.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      const tex = numTex(n);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(f.size, f.size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.95 }));
      pl.quaternion.setFromRotationMatrix(local);
      pl.position.copy(f.ctr.clone().add(f.n.clone().multiplyScalar(0.012)));
      body.add(pl);
      body.rotation.y = yaw;
      scene.add(body);
      renderer.render(scene, cam);
      urls.push(renderer.domElement.toDataURL("image/png"));
      scene.remove(body);
      tex.dispose();
      pl.geometry.dispose();
      pl.material.dispose();
    }
    mat.dispose();
    edgeMat.dispose();
    pm.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return urls;
  })().catch(() => null);
  return cache;
}
