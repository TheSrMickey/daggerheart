"use client";

import { useEffect, useRef, useState } from "react";

// PRUEBA · splash art animado con la técnica de los «animated splash arts»: la ilustración se trata como un diorama 2.5D.
//  - mapa de profundidad (inflado desde la silueta + el de abajo está más cerca) → parallax con la cámara y con el ratón
//  - máscaras por color → humo que deriva, ojos que brillan, flor que se mece, agua que ondula
//  - micro-movimientos sobre la propia imagen: respiración, capa con viento, cuervo que se balancea
//  - partículas (motas de luz) con su propio parallax y un resplandor detrás
// Para quitarla: borrar este archivo, src/app/prueba-druida y la línea /prueba-druida de src/lib/supabase/proxy.ts.

const blur1 = (src, w, h, r) => {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / (2 * r + 1);
      acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * r + 1);
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
};

// Mapas a partir de la imagen: profundidad y máscaras (R humo, G ojos, B flor, A agua)
const buildMaps = (img) => {
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, w, h).data;
  const N = w * h;
  // distancia a la silueta (chamfer) → «inflado»
  const dist = new Float32Array(N);
  for (let i = 0; i < N; i++) dist[i] = d[i * 4 + 3] > 150 ? 1e6 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = dist[i];
    if (x > 0) v = Math.min(v, dist[i - 1] + 1);
    if (y > 0) { v = Math.min(v, dist[i - w] + 1); if (x > 0) v = Math.min(v, dist[i - w - 1] + 1.414); if (x < w - 1) v = Math.min(v, dist[i - w + 1] + 1.414); }
    dist[i] = v;
  }
  let maxD = 1;
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let v = dist[i];
    if (x < w - 1) v = Math.min(v, dist[i + 1] + 1);
    if (y < h - 1) { v = Math.min(v, dist[i + w] + 1); if (x < w - 1) v = Math.min(v, dist[i + w + 1] + 1.414); if (x > 0) v = Math.min(v, dist[i + w - 1] + 1.414); }
    dist[i] = v; if (v < 1e5 && v > maxD) maxD = v;
  }
  const depth = new Float32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const inflate = Math.sqrt(Math.min(1, dist[i] / (maxD * 0.85)));
    const ty = y / h; // lo de abajo está más cerca de la cámara
    let v = d[i * 4 + 3] > 20 ? 0.12 + 0.5 * inflate + 0.34 * ty : 0.0;
    // el cuervo, delante del hombro
    const rx = (x / w - 0.355) / 0.09, ry = (y / h - 0.16) / 0.13;
    if (rx * rx + ry * ry < 1) v += 0.14;
    // la flor y las manos, más cerca
    const fx = (x / w - 0.5) / 0.14, fy = (y / h - 0.58) / 0.14;
    if (fx * fx + fy * fy < 1) v += 0.12;
    depth[i] = Math.min(1, v);
  }
  const depthB = blur1(blur1(depth, w, h, 7), w, h, 5);
  const smoke = new Float32Array(N), eyes = new Float32Array(N), flower = new Float32Array(N), water = new Float32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, k = i * 4;
    const r = d[k], g = d[k + 1], b = d[k + 2], a = d[k + 3];
    if (a < 235 && r >= g + 6 && b >= g + 6 && (r + g + b) / 3 > 110 && a > 4) smoke[i] = 1;
    if (g > 185 && r > 110 && r < 240 && b < 150 && y < h * 0.3 && x > w * 0.4 && x < w * 0.72) eyes[i] = 1;
    if (r > 185 && g > 55 && g < 165 && b < 105 && y > h * 0.4 && y < h * 0.82 && x > w * 0.35 && x < w * 0.65) flower[i] = 1;
    const wy = (y / h - 0.9) / 0.06; water[i] = a > 40 ? Math.min(1, Math.max(0, wy)) : 0;
  }
  const sm = blur1(smoke, w, h, 3), ey = blur1(eyes, w, h, 2), fl = blur1(flower, w, h, 3);
  const dd = new Uint8Array(N * 4), mm = new Uint8Array(N * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = ((h - 1 - y) * w + x) * 4; // las texturas de datos empiezan por abajo
    dd[o] = Math.round(depthB[i] * 255); dd[o + 1] = 0; dd[o + 2] = 0; dd[o + 3] = 255;
    mm[o] = Math.round(Math.min(1, sm[i] * 1.6) * 255); mm[o + 1] = Math.round(Math.min(1, ey[i] * 1.8) * 255); mm[o + 2] = Math.round(Math.min(1, fl[i] * 1.6) * 255); mm[o + 3] = Math.round(water[i] * 255);
  }
  return { w, h, canvas: cv, dd, mm };
};

const VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex, uDepth, uMask;
uniform vec2 uCam;
uniform float uTime, uAmt;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec2 uv = vUv;
  float t = uTime;
  float d = texture2D(uDepth, uv).r;
  // parallax: lo cercano se desplaza más que lo lejano
  uv -= uCam * (d - 0.34) * 0.06 * uAmt;
  vec4 m0 = texture2D(uMask, uv);
  // respiración (pecho) y balanceo suave de la cabeza
  float chest = smoothstep(0.22, 0.46, uv.y) * (1.0 - smoothstep(0.6, 0.78, uv.y));
  uv.y -= sin(t * 1.15) * 0.0045 * chest * uAmt;
  uv.x += sin(t * 0.8) * 0.0022 * smoothstep(0.68, 0.86, uv.y) * uAmt;
  // la capa recibe el viento por los bordes
  float edge = smoothstep(0.22, 0.5, abs(uv.x - 0.5)) * smoothstep(0.12, 0.4, uv.y) * (1.0 - smoothstep(0.62, 0.84, uv.y));
  uv.x += sin(t * 1.5 + uv.y * 8.0) * 0.0042 * edge * uAmt;
  // cuervo
  vec2 rv = (uv - vec2(0.355, 0.84)) / vec2(0.1, 0.14);
  float wr = 1.0 - smoothstep(0.55, 1.0, length(rv));
  uv.x += sin(t * 1.9) * 0.0035 * wr * uAmt; uv.y += sin(t * 2.6 + 1.0) * 0.0022 * wr * uAmt;
  // la flor se mece
  float fl = m0.b;
  uv.x += sin(t * 1.4 + uv.y * 5.0) * 0.0055 * fl * uAmt;
  // el humo deriva
  float sm = m0.r;
  vec2 q = uv * vec2(3.0, 4.0) + vec2(t * 0.06, -t * 0.09);
  uv += (vec2(noise(q), noise(q + 7.3)) - 0.5) * 0.028 * sm * uAmt;
  // el agua ondula
  float wa = m0.a;
  uv.x += sin(uv.y * 150.0 + t * 2.2) * 0.0016 * wa * uAmt; uv.y += cos(uv.x * 90.0 + t * 1.6) * 0.0012 * wa * uAmt;
  vec4 c = texture2D(uTex, uv);
  vec4 m = texture2D(uMask, uv);
  // humo: la opacidad respira
  float puff = 0.78 + 0.45 * noise(uv * vec2(4.0, 6.0) + vec2(t * 0.1, -t * 0.14));
  c.a *= mix(1.0, puff, m.r);
  // ojos y flor brillan
  float pulse = 0.55 + 0.45 * sin(t * 2.1);
  vec3 add = m.g * pulse * vec3(0.55, 1.0, 0.25) * 0.9 + m.b * (0.35 + 0.3 * sin(t * 1.7)) * vec3(1.0, 0.55, 0.25);
  c.rgb += add * c.a;
  // destello de agua
  float spark = pow(noise(uv * vec2(60.0, 110.0) + vec2(t * 0.8, 0.0)), 6.0) * m.a * 1.6;
  c.rgb += spark * vec3(0.7, 1.0, 0.9) * c.a;
  c.a *= smoothstep(0.0, 0.07, vUv.y) * smoothstep(0.0, 0.03, vUv.x) * smoothstep(0.0, 0.03, 1.0 - vUv.x);
  gl_FragColor = vec4(c.rgb, c.a);
}`;
const PVERT = `
attribute vec4 aSeed;
uniform float uTime, uSize, uAmt; uniform vec2 uCam, uPlane;
varying float vA; varying vec3 vCol;
void main(){
  float depth = aSeed.w;
  float y = fract(aSeed.y + uTime * (0.012 + aSeed.z * 0.02));
  float x = aSeed.x + sin(uTime * 0.6 + aSeed.z * 20.0) * 0.025;
  vec2 p = vec2(x, y) - uCam * (depth - 0.3) * 0.06 * uAmt;
  vec4 mv = modelViewMatrix * vec4((p - 0.5) * uPlane, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.45 + depth * 1.1);
  vA = smoothstep(0.0, 0.12, y) * (1.0 - smoothstep(0.78, 1.0, y)) * (0.45 + 0.55 * sin(uTime * (1.5 + aSeed.z * 3.0) + aSeed.x * 40.0));
  vCol = mix(vec3(0.7, 1.0, 0.45), mix(vec3(0.75, 0.55, 1.0), vec3(1.0, 0.8, 0.45), step(0.66, aSeed.z)), step(0.4, aSeed.z));
}`;
const PFRAG = "varying float vA; varying vec3 vCol; void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); float a = smoothstep(0.5, 0.0, r); gl_FragColor = vec4(vCol, a * a * vA); }";
const GFRAG = "varying vec2 vUv; uniform float uTime; void main(){ vec2 c = vUv - vec2(0.5, 0.46); float r = length(c * vec2(1.0, 0.85)); float p = 0.85 + 0.15 * sin(uTime * 0.9); vec3 col = mix(vec3(0.42, 0.9, 0.3), vec3(0.6, 0.35, 0.95), smoothstep(0.1, 0.5, vUv.x)); float a = smoothstep(0.42, 0.0, r) * 0.5 * p; gl_FragColor = vec4(col, a); }";

export function AnimatedSplash({ src, animate = true, intensity = 1, style }) {
  const host = useRef(null);
  const [state, setState] = useState("load");
  const live = useRef({ animate, intensity });
  useEffect(() => { live.current = { animate, intensity }; }, [animate, intensity]);
  useEffect(() => {
    let dead = false, raf = 0, cleanup = () => {};
    (async () => {
      try {
        const THREE = await import("three");
        const img = new Image(); img.src = src; await img.decode();
        if (dead || !host.current) return;
        const el = host.current;
        const maps = buildMaps(img);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
        const tex = new THREE.CanvasTexture(maps.canvas); tex.anisotropy = 4;
        const dTex = new THREE.DataTexture(maps.dd, maps.w, maps.h, THREE.RGBAFormat); dTex.magFilter = THREE.LinearFilter; dTex.minFilter = THREE.LinearFilter; dTex.needsUpdate = true;
        const mTex = new THREE.DataTexture(maps.mm, maps.w, maps.h, THREE.RGBAFormat); mTex.magFilter = THREE.LinearFilter; mTex.minFilter = THREE.LinearFilter; mTex.needsUpdate = true;
        const U = { uTex: { value: tex }, uDepth: { value: dTex }, uMask: { value: mTex }, uCam: { value: new THREE.Vector2() }, uTime: { value: 0 }, uAmt: { value: 1 } };
        const PW = maps.w / maps.h, PH = 1;
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(PW * 1.5, PH * 1.4), new THREE.ShaderMaterial({ uniforms: { uTime: U.uTime }, vertexShader: VERT, fragmentShader: GFRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.position.z = -1; scene.add(glow);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, premultipliedAlpha: false }));
        scene.add(plane);
        // partículas
        const NP = 120, seeds = new Float32Array(NP * 4);
        for (let i = 0; i < NP; i++) { seeds[i * 4] = Math.random() * 1.1 - 0.05; seeds[i * 4 + 1] = Math.random(); seeds[i * 4 + 2] = Math.random(); seeds[i * 4 + 3] = Math.random(); }
        const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NP * 3), 3)); pg.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
        const PU = { uTime: U.uTime, uSize: { value: 18 * (renderer.getPixelRatio()) }, uCam: U.uCam, uAmt: U.uAmt, uPlane: { value: new THREE.Vector2(PW, PH) } };
        const pts = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms: PU, vertexShader: PVERT, fragmentShader: PFRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        pts.frustumCulled = false; pts.position.z = 0.5; scene.add(pts);

        const fit = () => {
          const w = el.clientWidth, h = Math.max(1, el.clientHeight);
          renderer.setSize(w, h, false);
          const a = w / h, s = 0.56 / Math.min(1, (a / PW));
          // la ilustración ocupa casi todo el alto y queda centrada
          const half = Math.max(PH * 0.56, (PW * 0.56) / a);
          cam.left = -half * a; cam.right = half * a; cam.top = half; cam.bottom = -half; cam.updateProjectionMatrix();
          PU.uSize.value = 18 * renderer.getPixelRatio() * Math.min(1.4, h / 520);
        };
        fit();
        const ro = new ResizeObserver(fit); ro.observe(el);
        const ptr = { x: 0, y: 0, tx: 0, ty: 0, on: false };
        const onMove = (e) => { const r = el.getBoundingClientRect(); ptr.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ptr.ty = -((e.clientY - r.top) / r.height - 0.5) * 2; ptr.on = true; };
        const onLeave = () => { ptr.tx = 0; ptr.ty = 0; ptr.on = false; };
        el.addEventListener("pointermove", onMove); el.addEventListener("pointerleave", onLeave);
        const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const t0 = performance.now();
        let still = 0;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          const { animate: on, intensity: k } = live.current;
          const t = (performance.now() - t0) / 1000;
          const run = on && !reduced;
          if (run) still = 0;
          ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
          // la cámara hace un recorrido lento y además sigue al ratón
          const idleX = Math.sin(t * 0.45) * 0.55 + Math.sin(t * 0.17) * 0.25, idleY = Math.sin(t * 0.33 + 1.2) * 0.32;
          U.uCam.value.set(run ? idleX * (ptr.on ? 0.35 : 1) + ptr.x * 1.1 : 0, run ? idleY * (ptr.on ? 0.35 : 1) + ptr.y * 0.8 : 0);
          U.uTime.value = run ? t : 0;
          U.uAmt.value = run ? k : 0;
          pts.visible = run; glow.visible = run;
          if (!run && still++ > 2) return; // quieto: no hace falta repintar
          renderer.render(scene, cam);
        };
        loop();
        setState("ok");
        cleanup = () => { ro.disconnect(); cancelAnimationFrame(raf); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); tex.dispose(); dTex.dispose(); mTex.dispose(); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); };
      } catch (e) {
        setState("err");
      }
    })();
    return () => { dead = true; cleanup(); };
  }, [src]);
  return (
    <div ref={host} style={{ position: "relative", ...style }}>
      {state === "load" && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#9fb0a6", fontSize: 13 }}>Preparando la animación…</div>}
      {state === "err" && <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
    </div>
  );
}
