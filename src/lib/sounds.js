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
