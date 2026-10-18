"use client";

import { useEffect, useRef, useState } from "react";

// Efectos para las escenas: partículas dibujadas en un lienzo 2D sobre la imagen (lluvia, nieve, fuego, niebla…).
// Los rayos de luz son un vídeo con transparencia. Cada escena guarda la lista de efectos que lleva.
export const SCENE_FX = [
  { k: "campfire", n: "Hoguera" },
  { k: "dust", n: "Polvo" },
  { k: "fire", n: "Fuego" },
  { k: "fog", n: "Niebla" },
  { k: "rays", n: "Rayos de luz" },
  { k: "gold", n: "Presencia mágica (dorada)" },
  { k: "purple", n: "Presencia mágica (morada)" },
  { k: "rain", n: "Lluvia" },
  { k: "storm", n: "Tormenta" },
  { k: "snow", n: "Nieve" },
  { k: "tavern", n: "Taberna" },
  { k: "wind", n: "Viento" },
];

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rgba = (c, a) => "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";

// ---- Lluvia y tormenta ----
const rainInit = (n, fast) => (w, h) => ({
  d: Array.from({ length: n }, () => ({ x: rnd(-60, w + 60), y: rnd(0, h), l: rnd(12, 26), v: rnd(fast ? 2.2 : 1.5, fast ? 3.2 : 2.3) * h, a: rnd(0.25, 0.55) })),
  flash: 0,
  next: rnd(2, 5),
  bolt: null,
});
function rainDraw(ctx, st, dt, t, w, h, storm) {
  ctx.fillStyle = storm ? "rgba(10,16,32,.28)" : "rgba(16,26,46,.14)";
  ctx.fillRect(0, 0, w, h);
  const slant = storm ? 0.3 : 0.16;
  ctx.lineWidth = storm ? 1.4 : 1.1;
  ctx.lineCap = "round";
  for (const p of st.d) {
    p.y += p.v * dt;
    p.x -= p.v * slant * dt;
    if (p.y > h + 30) {
      p.y = -p.l;
      p.x = rnd(0, w + 120);
    }
    ctx.strokeStyle = "rgba(205,222,255," + p.a + ")";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.l * slant, p.y - p.l);
    ctx.stroke();
  }
  if (storm) {
    st.next -= dt;
    if (st.next <= 0) {
      st.flash = 1;
      st.next = rnd(4, 9);
      const pts = [[rnd(0.2, 0.8) * w, 0]];
      let y = 0;
      while (y < h * rnd(0.45, 0.8)) {
        y += rnd(0.05, 0.1) * h;
        pts.push([pts[pts.length - 1][0] + rnd(-0.07, 0.07) * w, y]);
      }
      st.bolt = pts;
    }
    if (st.flash > 0) {
      ctx.fillStyle = "rgba(220,230,255," + st.flash * 0.45 + ")";
      ctx.fillRect(0, 0, w, h);
      if (st.bolt && st.flash > 0.45) {
        ctx.strokeStyle = "rgba(255,255,255,.95)";
        ctx.lineWidth = 2.4;
        ctx.shadowColor = "#bcd0ff";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        st.bolt.forEach(([x, yy], i) => (i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy)));
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      st.flash = Math.max(0, st.flash - dt * 2.6);
    }
  }
}

// ---- Nieve ----
const snowInit = (w, h) => ({ d: Array.from({ length: 140 }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(1, 3.6), v: rnd(26, 70) * (h / 400), ph: rnd(0, 6.28), sw: rnd(8, 30), a: rnd(0.55, 0.95) })) });
function snowDraw(ctx, st, dt, t, w, h) {
  for (const p of st.d) {
    p.y += p.v * dt;
    if (p.y > h + 6) {
      p.y = -6;
      p.x = rnd(0, w);
    }
    ctx.fillStyle = "rgba(255,255,255," + p.a + ")";
    ctx.beginPath();
    ctx.arc(p.x + Math.sin(t * 0.8 + p.ph) * p.sw, p.y, p.r, 0, 6.283);
    ctx.fill();
  }
}

// ---- Niebla ----
const fogInit = (w, h) => ({ d: Array.from({ length: 7 }, () => ({ x: rnd(0, w), y: rnd(0.35, 1) * h, r: rnd(0.3, 0.6) * w, v: rnd(5, 15) * (Math.random() < 0.5 ? -1 : 1), a: rnd(0.11, 0.2) })) });
function fogDraw(ctx, st, dt, t, w, h) {
  for (const b of st.d) {
    b.x += b.v * dt;
    if (b.x > w + b.r) b.x = -b.r;
    if (b.x < -b.r) b.x = w + b.r;
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, "rgba(222,228,238," + b.a + ")");
    g.addColorStop(1, "rgba(222,228,238,0)");
    ctx.fillStyle = g;
    ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
}

// ---- Polvo (y motas de taberna) ----
const dustInit = (n, col) => (w, h) => ({ col, d: Array.from({ length: n }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.7, 2.1), vx: rnd(-6, 6), vy: rnd(-8, 3), ph: rnd(0, 6.28) })) });
function dustDraw(ctx, st, dt, t, w, h) {
  for (const p of st.d) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < -5) p.x = w + 5;
    if (p.x > w + 5) p.x = -5;
    if (p.y < -5) p.y = h + 5;
    if (p.y > h + 5) p.y = -5;
    const a = 0.2 + 0.4 * Math.pow(Math.sin(t * 0.8 + p.ph), 2);
    ctx.fillStyle = rgba(st.col, a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, 6.283);
    ctx.fill();
  }
}

// ---- Viento ----
const windInit = (w, h) => ({
  s: Array.from({ length: 28 }, () => ({ x: rnd(0, w), y: rnd(0, h), len: rnd(60, 170), v: rnd(500, 900) * (w / 600), a: rnd(0.1, 0.26), wob: rnd(-14, 14) })),
  l: Array.from({ length: 14 }, () => ({ x: rnd(0, w), y: rnd(0, h), vx: rnd(300, 620) * (w / 600), vy: rnd(-30, 60), rot: rnd(0, 6.28), vr: rnd(-6, 6), s: rnd(3, 6.5), c: pick(["#8a6b3a", "#5f7f3a", "#a8843f", "#7a5a2c"]) })),
});
function windDraw(ctx, st, dt, t, w, h) {
  ctx.lineCap = "round";
  ctx.lineWidth = 1.2;
  for (const s of st.s) {
    s.x += s.v * dt;
    if (s.x - s.len > w) {
      s.x = -20;
      s.y = rnd(0, h);
    }
    ctx.strokeStyle = "rgba(255,255,255," + s.a + ")";
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.quadraticCurveTo(s.x - s.len / 2, s.y + s.wob, s.x - s.len, s.y);
    ctx.stroke();
  }
  for (const l of st.l) {
    l.x += l.vx * dt;
    l.y += (l.vy + Math.sin(t * 3 + l.rot) * 40) * dt;
    l.rot += l.vr * dt;
    if (l.x > w + 20) {
      l.x = -20;
      l.y = rnd(0, h);
    }
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.rot);
    ctx.fillStyle = l.c;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(0, 0, l.s, l.s * 0.5, 0, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }
}

// ---- Fuego y hoguera: llamas de partículas con brillo aditivo ----
const fireInit = () => ({ f: [], sp: [], acc: 0, acc2: 0 });
const FLAME = [[255, 244, 190], [255, 190, 70], [235, 100, 30], [150, 40, 20]];
const flameCol = (u) => {
  const x = Math.min(2.999, Math.max(0, u * 3)), i = Math.floor(x), f = x - i, a = FLAME[i], b = FLAME[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
};
function fireDraw(ctx, st, dt, t, w, h, camp) {
  const cx = w * 0.5, flick = 0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 7.3);
  // brillo de la luz del fuego
  ctx.globalCompositeOperation = "lighter";
  if (camp) {
    const g = ctx.createRadialGradient(cx, h * 0.9, 0, cx, h * 0.9, h * 0.7);
    g.addColorStop(0, "rgba(255,150,50," + 0.38 * flick + ")");
    g.addColorStop(1, "rgba(255,120,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    const g = ctx.createLinearGradient(0, h, 0, h * 0.45);
    g.addColorStop(0, "rgba(255,120,30," + 0.34 * flick + ")");
    g.addColorStop(1, "rgba(255,90,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.4, w, h * 0.6);
  }
  // llamas
  st.acc += dt * (camp ? 170 : 320);
  while (st.acc >= 1 && st.f.length < 260) {
    st.acc -= 1;
    const x = camp ? cx + (Math.random() + Math.random() + Math.random() - 1.5) * w * 0.045 : rnd(0, w);
    st.f.push({ x, y: h + 2, vx: rnd(-8, 8), vy: -rnd(camp ? 0.22 : 0.3, camp ? 0.5 : 0.62) * h, life: 0, max: rnd(0.65, 1.25), s: rnd(camp ? 0.02 : 0.028, camp ? 0.042 : 0.062) * h });
  }
  st.f = st.f.filter((p) => p.life < p.max);
  for (const p of st.f) {
    p.life += dt;
    p.x += (p.vx + Math.sin(t * 5 + p.x) * 14) * dt;
    p.y += p.vy * dt;
    const u = p.life / p.max, r = p.s * (1 - u * 0.6), c = flameCol(u);
    // Cada llama es un óvalo alargado hacia arriba que se afina y se enfría al subir.
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(0.62, 1.7);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(c, 0.6 * (1 - u)));
    g.addColorStop(0.5, rgba(c, 0.25 * (1 - u)));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  // chispas
  st.acc2 += dt * (camp ? 14 : 22);
  while (st.acc2 >= 1 && st.sp.length < 60) {
    st.acc2 -= 1;
    st.sp.push({ x: camp ? cx + rnd(-0.03, 0.03) * w : rnd(0, w), y: h * rnd(0.9, 1), vx: rnd(-25, 25), vy: -rnd(0.2, 0.55) * h, life: 0, max: rnd(0.8, 1.8) });
  }
  st.sp = st.sp.filter((p) => p.life < p.max);
  for (const p of st.sp) {
    p.life += dt;
    p.x += (p.vx + Math.sin(t * 4 + p.max * 9) * 20) * dt;
    p.y += p.vy * dt;
    ctx.fillStyle = "rgba(255,200,110," + (1 - p.life / p.max) + ")";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6, 0, 6.283);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  if (camp) {
    ctx.fillStyle = "rgba(255,140,40," + (0.05 + 0.04 * flick) + ")";
    ctx.fillRect(0, 0, w, h);
  }
}

// ---- Presencia mágica: destellos que suben y titilan ----
const magicInit = (col) => (w, h) => ({ col, d: Array.from({ length: 60 }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(1.2, 4.2), vy: -rnd(8, 38), sw: rnd(6, 26), ph: rnd(0, 6.28), tw: rnd(1.4, 3.4) })) });
function magicDraw(ctx, st, dt, t, w, h) {
  const [c1, c2] = st.col;
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(w * 0.5, h * 0.62, 0, w * 0.5, h * 0.62, Math.max(w, h) * 0.6);
  g.addColorStop(0, rgba(c1, 0.16 + 0.06 * Math.sin(t * 1.3)));
  g.addColorStop(1, rgba(c1, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (const p of st.d) {
    p.y += p.vy * dt;
    if (p.y < -10) {
      p.y = h + 10;
      p.x = rnd(0, w);
    }
    const x = p.x + Math.sin(t * 0.9 + p.ph) * p.sw, a = Math.max(0, Math.sin(t * p.tw + p.ph));
    const r = p.r * (0.6 + a * 0.8);
    const gg = ctx.createRadialGradient(x, p.y, 0, x, p.y, r * 3);
    gg.addColorStop(0, rgba(c2, 0.85 * a));
    gg.addColorStop(0.4, rgba(c1, 0.35 * a));
    gg.addColorStop(1, rgba(c1, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(x - r * 3, p.y - r * 3, r * 6, r * 6);
    if (p.r > 2.6) {
      ctx.strokeStyle = rgba(c2, 0.7 * a);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - r * 2.2, p.y);
      ctx.lineTo(x + r * 2.2, p.y);
      ctx.moveTo(x, p.y - r * 2.2);
      ctx.lineTo(x, p.y + r * 2.2);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

// ---- Taberna: luz cálida de farolillos que parpadea y motas de polvo ----
const tavernInit = (w, h) => ({ ...dustInit(34, [255, 214, 150])(w, h) });
function tavernDraw(ctx, st, dt, t, w, h) {
  const f1 = 0.8 + 0.2 * Math.sin(t * 6.1 + 1) * Math.sin(t * 3.7), f2 = 0.8 + 0.2 * Math.sin(t * 5.3) * Math.sin(t * 2.9 + 2);
  ctx.fillStyle = "rgba(255,150,50," + (0.05 + 0.025 * f1) + ")";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  [[0.17, 0.3, f1], [0.84, 0.26, f2], [0.5, 0.1, (f1 + f2) / 2]].forEach(([x, y, f], i) => {
    const r = h * (i === 2 ? 0.5 : 0.42), cx = w * x, cy = h * y;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,190,100," + (i === 2 ? 0.1 : 0.3) * f + ")");
    g.addColorStop(1, "rgba(255,150,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  });
  ctx.globalCompositeOperation = "source-over";
  dustDraw(ctx, st, dt, t, w, h);
}

const FX = {
  rain: { init: rainInit(200, false), draw: (c, s, d, t, w, h) => rainDraw(c, s, d, t, w, h, false) },
  storm: { init: rainInit(430, true), draw: (c, s, d, t, w, h) => rainDraw(c, s, d, t, w, h, true) },
  snow: { init: snowInit, draw: snowDraw },
  fog: { init: fogInit, draw: fogDraw },
  dust: { init: dustInit(70, [255, 238, 205]), draw: dustDraw },
  wind: { init: windInit, draw: windDraw },
  fire: { init: fireInit, draw: (c, s, d, t, w, h) => fireDraw(c, s, d, t, w, h, false) },
  campfire: { init: fireInit, draw: (c, s, d, t, w, h) => fireDraw(c, s, d, t, w, h, true) },
  gold: { init: magicInit([[255, 200, 80], [255, 232, 150]]), draw: magicDraw },
  purple: { init: magicInit([[150, 110, 235], [205, 175, 255]]), draw: magicDraw },
  tavern: { init: tavernInit, draw: tavernDraw },
};
// El orden de pintado: primero las luces y nieblas, encima la lluvia y el viento.
const ORDER = ["fog", "tavern", "fire", "campfire", "gold", "purple", "dust", "snow", "wind", "rain", "storm"];

// Cada efecto va en su propio lienzo para poder aparecer y desaparecer con un fundido.
function FxLayer({ k, active }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShown(active), 30);
    return () => clearTimeout(id);
  }, [active]);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const ctx = cv.getContext("2d");
    const box = cv.parentElement;
    let w = 1, h = 1, st = null, raf = 0, last = performance.now();
    const fit = () => {
      const r = box.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st = FX[k].init(w, h);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      FX[k].draw(ctx, st, dt, now / 1000, w, h);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [k]);
  return <canvas ref={ref} className={"mh-fx mh-fx-l" + (shown ? " is-in" : "")} aria-hidden="true" />;
}

function RaysLayer({ active }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShown(active), 30);
    return () => clearTimeout(id);
  }, [active]);
  return <video className={"mh-fx mh-fx-rays mh-fx-l" + (shown ? " is-in" : "")} src="/escenas/efectos/light_rays.webm" autoPlay loop muted playsInline aria-hidden="true" />;
}

const FADE_MS = 900;

// Capa de efectos: se coloca como primer hijo de la imagen de la escena (que debe ser position: relative).
export default function SceneFx({ fx }) {
  const want = ORDER.filter((k) => (fx || []).includes(k) && FX[k]);
  const rays = (fx || []).includes("rays");
  const wantKey = want.join(",") + (rays ? "|rays" : "");
  const [keep, setKeep] = useState({ keys: want, rays });
  useEffect(() => {
    // Los efectos nuevos entran enseguida; los que se quitan siguen montados mientras se desvanecen.
    setKeep((p) => ({ keys: ORDER.filter((k) => want.includes(k) || p.keys.includes(k)), rays: rays || p.rays }));
    const t = setTimeout(() => setKeep({ keys: want, rays }), FADE_MS);
    return () => clearTimeout(t);
  }, [wantKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {keep.rays && <RaysLayer active={rays} />}
      {keep.keys.map((k) => <FxLayer key={k} k={k} active={want.includes(k)} />)}
    </>
  );
}
