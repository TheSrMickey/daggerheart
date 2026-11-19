// Sonidos de la plataforma. El aviso es un wav de `public/sonidos` (dos notas de campanita); se puede silenciar con localStorage "mh-sound-notif" = "off".
let notif = null;
let last = 0;
export const noticeSoundOn = () => {
  try {
    return localStorage.getItem("mh-sound-notif") !== "off";
  } catch {
    return true;
  }
};
export const playNoticeSound = () => {
  if (typeof window === "undefined" || !noticeSoundOn()) return;
  const now = Date.now();
  if (now - last < 1500) return; // varios avisos a la vez suenan una sola vez
  last = now;
  try {
    notif = notif || new Audio("/sonidos/notificacion.wav");
    notif.volume = 0.55;
    notif.currentTime = 0;
    notif.play().catch(() => {}); // el navegador puede bloquearlo hasta que la persona toque la página
  } catch {
    /* sin audio */
  }
};

// Rasgado de sobre: se sintetiza con ruido filtrado (no hay archivo). Cada trozo que se rasga suena como un crujido corto de papel;
// el último, al abrir del todo, es más largo y grave. Se silencia con localStorage "mh-sound-fx" = "off".
let ctx = null;
let noise = null;
let lastGrain = 0;
const fxOn = () => {
  try {
    return localStorage.getItem("mh-sound-fx") !== "off";
  } catch {
    return true;
  }
};
const audio = () => {
  if (typeof window === "undefined" || !fxOn()) return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  } catch {
    return null;
  }
};
const grain = (c, { dur, vol, lo, hi, at = 0 }) => {
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = lo + Math.random() * (hi - lo);
  bp.Q.value = 0.7;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900;
  const g = c.createGain();
  // envolvente con "dientes": el papel se rompe a tirones
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  const bits = Math.max(2, Math.round(dur / 0.012));
  for (let i = 1; i <= bits; i++) g.gain.linearRampToValueAtTime(vol * (i % 2 ? 0.35 : 0.9) * (1 - i / (bits + 1)), t + 0.004 + (dur * i) / bits);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
  src.connect(bp).connect(hp).connect(g).connect(c.destination);
  src.start(t, Math.random() * 0.8);
  src.stop(t + dur + 0.05);
};
// Mientras se arrastra: `amount` es lo que se ha rasgado desde el último aviso (0–1 del ancho del sobre).
export const playTearStep = (amount = 0.05) => {
  const now = Date.now();
  if (now - lastGrain < 45) return;
  const c = audio();
  if (!c) return;
  lastGrain = now;
  const a = Math.min(1, Math.max(0.15, amount * 8));
  grain(c, { dur: 0.03 + a * 0.05, vol: 0.12 + a * 0.2, lo: 2200, hi: 5200 });
};
// Al abrir el sobre del todo.
export const playTearOpen = () => {
  const c = audio();
  if (!c) return;
  grain(c, { dur: 0.34, vol: 0.4, lo: 1600, hi: 3200 });
  grain(c, { dur: 0.2, vol: 0.28, lo: 3800, hi: 6200, at: 0.05 });
  grain(c, { dur: 0.12, vol: 0.2, lo: 900, hi: 1500, at: 0.22 });
};
