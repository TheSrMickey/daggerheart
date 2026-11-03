"use client";

// Imagen del d10 (sin número) que hace de ficha sobre las cartas, teñida con el color del dominio. Se renderiza una vez
// por color con three.js y el mismo vidrio que los dados de las tiradas (Dice3D). Si no hay WebGL devuelve null y la
// carta usa el dibujo plano.
const cache = new Map();

export function d10Sprite(color = "#d9482a") {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (cache.has(color)) return cache.get(color);
  const job = (async () => {
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
      return { n: f.n };
    });

    const mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55), transmission: 1, thickness: 1.6, ior: 1.5, roughness: 0.06, attenuationColor: new THREE.Color(color), attenuationDistance: 1.4, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.6, iridescenceIOR: 1.4, envMapIntensity: 1.1, transparent: true });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    // Pose: apoyado sobre un polo, con una cara superior mirando a la cámara.
    const f = faces.filter((x) => x.n.y > 0.2).sort((p, q) => q.n.y - p.n.y)[0];
    const phi = Math.asin(f.n.y) - 0.4;
    const D = 4.4;
    cam.position.set(Math.sin(0.35) * Math.cos(phi) * D, Math.sin(phi) * D, Math.cos(0.35) * Math.cos(phi) * D);
    cam.lookAt(0, 0, 0);
    const body = new THREE.Group();
    body.add(new THREE.Mesh(geo, mat));
    body.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    body.rotation.y = Math.atan2(-f.n.x, f.n.z);
    scene.add(body);
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL("image/png");
    mat.dispose();
    edgeMat.dispose();
    pm.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return url;
  })().catch(() => null);
  cache.set(color, job);
  return job;
}
