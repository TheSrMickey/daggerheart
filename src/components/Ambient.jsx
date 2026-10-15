"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Music, Play, Pause, Plus, Trash2, Upload, Volume2, VolumeX, X } from "lucide-react";
import { storageGet, storageSet } from "@/lib/storage";

// Ambiente de la campaña: el DJ prepara pistas de audio (un enlace o un archivo) y las reproduce o pausa para toda la mesa.
// Cada persona controla solo su volumen (se guarda en su navegador). El estado compartido vive en «campaign-ambient:<id>».
const MAX_FILE = 2.5 * 1024 * 1024; // 2,5 MB por archivo
const VOL_KEY = "mh-amb-vol";
const EMPTY = { tracks: [], current: null, playing: false, pos: 0, at: 0, ts: 0 };

const parse = (raw) => {
  try {
    const v = raw ? JSON.parse(raw) : null;
    return v && Array.isArray(v.tracks) ? { ...EMPTY, ...v } : EMPTY;
  } catch (e) {
    return EMPTY;
  }
};
// Identificador de un vídeo de YouTube (watch, youtu.be, shorts, embed, live o música), o null.
const ytId = (u) => {
  const m = String(u || "").match(/^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  return m ? m[1] : null;
};
let ytApi = null; // carga única de la API de reproductor de YouTube
const loadYT = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("sin ventana"));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!ytApi)
    ytApi = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        resolve(window.YT);
      };
      const sc = document.createElement("script");
      sc.src = "https://www.youtube.com/iframe_api";
      sc.onerror = () => {
        ytApi = null;
        reject(new Error("YouTube"));
      };
      document.head.appendChild(sc);
    });
  return ytApi;
};
const readFile = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("lectura"));
    r.readAsDataURL(file);
  });

export default function Ambient({ campaignId, isGm, open, onClose, anchorRef }) {
  const key = "campaign-ambient:" + campaignId;
  const [st, setSt] = useState(EMPTY);
  const [vol, setVol] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false); // el navegador no deja sonar hasta tocar la pantalla
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [ytTick, setYtTick] = useState(0);
  const popRef = useRef(null);

  // Mini popup pegado al botón «Ambiente»: se coloca bajo él y se cierra al pulsar fuera o con Escape.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const b = anchorRef?.current?.getBoundingClientRect();
      const w = Math.min(340, window.innerWidth - 24);
      if (!b) return setPos({ top: 70, left: Math.max(12, window.innerWidth - w - 12) });
      const left = Math.max(12, Math.min(b.right - w, window.innerWidth - w - 12));
      setPos({ top: Math.min(b.bottom + 8, window.innerHeight - 140), left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const away = (e) => {
      if (popRef.current?.contains(e.target) || anchorRef?.current?.contains(e.target)) return;
      onClose();
    };
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const audio = useRef(null);
  const ytBox = useRef(null); // contenedor del reproductor oculto de YouTube
  const yt = useRef({ player: null, vid: null, ready: false });
  const srcCache = useRef({}); // id de pista -> url reproducible
  const stRef = useRef(EMPTY);
  stRef.current = st;

  useEffect(() => {
    try {
      const v = parseFloat(localStorage.getItem(VOL_KEY));
      if (!isNaN(v)) setVol(Math.max(0, Math.min(1, v)));
      setMuted(localStorage.getItem(VOL_KEY + "-m") === "1");
    } catch (e) {}
  }, []);

  // Lee el estado compartido cada pocos segundos.
  useEffect(() => {
    if (!campaignId) return undefined;
    let alive = true;
    srcCache.current = {};
    const load = async () => {
      const r = await storageGet(key, true).catch(() => null);
      if (!alive) return;
      const next = parse(r?.value);
      setSt((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
    };
    load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [campaignId, key]);

  const save = async (next) => {
    const full = { ...next, ts: Date.now() };
    setSt(full);
    await storageSet(key, JSON.stringify(full), true);
  };

  const track = st.tracks.find((t) => t.id === st.current) || null;

  // Sincronía: el estado guarda en qué segundo de la pista estaba (pos) y a qué hora (at). Cada dispositivo calcula dónde
  // debería ir ahora mismo (pos + tiempo transcurrido, en bucle) y, si se desvía más de ~1 s, salta a ese punto.
  const targetPos = () => {
    const c = stRef.current;
    return c.playing ? (c.pos || 0) + (Date.now() - (c.at || Date.now())) / 1000 : c.pos || 0;
  };
  const playerTime = () => {
    const c = stRef.current;
    const tr = c.tracks.find((x) => x.id === c.current);
    if (!tr) return null;
    if (ytId(tr.src)) {
      const y = yt.current;
      return y.ready && y.player.getCurrentTime ? { cur: y.player.getCurrentTime(), dur: y.player.getDuration() } : null;
    }
    const a = audio.current;
    return a && a.readyState >= 1 ? { cur: a.currentTime, dur: a.duration } : null;
  };
  const syncNow = () => {
    const c = stRef.current;
    const tr = c.tracks.find((x) => x.id === c.current);
    if (!tr || !c.playing) return;
    const p = playerTime();
    if (!p) return;
    let tg = targetPos();
    const hasDur = p.dur > 0 && isFinite(p.dur);
    if (hasDur) tg %= p.dur;
    let d = Math.abs(p.cur - tg);
    if (hasDur) d = Math.min(d, p.dur - d);
    if (d <= 1.2) return;
    try {
      if (ytId(tr.src)) yt.current.player.seekTo(tg, true);
      else audio.current.currentTime = tg;
    } catch (e) {}
  };
  useEffect(() => {
    if (!st.playing) return undefined;
    const t = setInterval(syncNow, 2500);
    return () => clearInterval(t);
  }, [st.playing, st.current, st.pos, st.at]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pone la pista actual en el reproductor y la arranca o pausa según el DJ.
  useEffect(() => {
    const a = audio.current;
    if (!a) return undefined;
    let dead = false;
    (async () => {
      const vid = track ? ytId(track.src) : null;
      if (vid) {
        a.pause();
        try {
          const YT = await loadYT();
          if (dead) return;
          const y = yt.current;
          if (!y.player) {
            const host = document.createElement("div");
            ytBox.current.appendChild(host);
            y.player = new YT.Player(host, {
              width: "200",
              height: "200",
              videoId: vid,
              playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: vid, playsinline: 1, rel: 0, modestbranding: 1 },
              events: { onReady: () => (y.ready = true, setYtTick((n) => n + 1)), onStateChange: (e) => (e.data === 0 && y.player.playVideo(), e.data === 1 && syncNow()) },
            });
            y.vid = vid;
          } else if (y.vid !== vid && y.ready) {
            y.vid = vid;
            y.player.loadVideoById({ videoId: vid });
            if (!st.playing) y.player.pauseVideo();
          }
        } catch (e) {}
        return;
      }
      if (yt.current.ready) yt.current.player.pauseVideo();
      if (!track) {
        a.pause();
        a.removeAttribute("src");
        a.load();
        return;
      }
      let url = srcCache.current[track.id];
      if (!url) {
        if (track.src.startsWith("file:")) {
          const r = await storageGet("campaign-audio:" + track.src.slice(5), true).catch(() => null);
          url = r?.value || "";
        } else url = track.src;
        srcCache.current[track.id] = url;
      }
      if (dead || !url) return;
      if (a.dataset.tid !== track.id) {
        a.src = url;
        a.dataset.tid = track.id;
      }
      a.loop = true;
      if (st.playing) {
        try {
          await a.play();
          setBlocked(false);
        } catch (e) {
          setBlocked(true);
        }
      } else a.pause();
    })();
    return () => {
      dead = true;
    };
  }, [track?.id, track?.src, st.playing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const y = yt.current;
    if (!y.ready || !track || !ytId(track.src)) return;
    try {
      y.player.setVolume(Math.round((muted ? 0 : vol) * 100));
      if (st.playing) {
        y.player.playVideo();
        setTimeout(syncNow, 1200);
        // sin un toque en la pantalla, el navegador no deja sonar: se avisa si no arranca
        setTimeout(() => {
          const stt = y.player.getPlayerState && y.player.getPlayerState();
          setBlocked(stt !== 1 && stt !== 3);
        }, 1800);
      } else {
        y.player.pauseVideo();
        setBlocked(false);
      }
    } catch (e) {}
  }, [ytTick, track?.id, st.playing, vol, muted]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (audio.current) audio.current.volume = muted ? 0 : vol;
    try {
      localStorage.setItem(VOL_KEY, String(vol));
      localStorage.setItem(VOL_KEY + "-m", muted ? "1" : "0");
    } catch (e) {}
  }, [vol, muted]);

  const unlock = async () => {
    const y = yt.current;
    if (y.ready && track && ytId(track.src)) {
      try {
        y.player.playVideo();
        setTimeout(syncNow, 1200);
        setBlocked(false);
      } catch (e) {}
      return;
    }
    try {
      await audio.current?.play();
      setBlocked(false);
    } catch (e) {}
  };

  const addLink = async () => {
    const u = link.trim();
    if (!/^https?:\/\//i.test(u)) return setErr("Pega un enlace que empiece por https://");
    let nm = name.trim();
    if (ytId(u) && !nm) {
      try {
        const r = await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(u));
        nm = ((await r.json()).title || "").slice(0, 60);
      } catch (e) {}
      nm = nm || "Vídeo de YouTube";
    }
    const t = { id: "t" + Date.now(), name: nm || u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40), src: u };
    await save({ ...st, tracks: [...st.tracks, t], current: st.current || t.id });
    setLink("");
    setName("");
    setErr("");
  };
  const addFile = async (file) => {
    if (!file) return;
    setErr("");
    if (!/^audio\//.test(file.type)) return setErr("Ese archivo no es de audio.");
    if (file.size > MAX_FILE) return setErr("El archivo pesa más de 2,5 MB. Usa un enlace para pistas largas.");
    setBusy(true);
    try {
      const data = await readFile(file);
      const id = "t" + Date.now();
      await storageSet("campaign-audio:" + id, data, true);
      const t = { id, name: name.trim() || file.name.replace(/\.[^.]+$/, "").slice(0, 40), src: "file:" + id };
      await save({ ...st, tracks: [...st.tracks, t], current: st.current || t.id });
      setName("");
    } catch (e) {
      setErr("No se pudo subir el audio.");
    }
    setBusy(false);
  };
  const remove = async (id) => {
    const t = st.tracks.find((x) => x.id === id);
    if (t && t.src.startsWith("file:")) storageSet("campaign-audio:" + t.src.slice(5), "", true);
    const tracks = st.tracks.filter((x) => x.id !== id);
    const gone = st.current === id;
    await save({ ...st, tracks, current: gone ? tracks[0]?.id || null : st.current, playing: gone ? false : st.playing, ...(gone ? { pos: 0, at: Date.now() } : {}) });
  };
  const select = (id) => save({ ...st, current: id, playing: true, pos: 0, at: Date.now() });
  const toggle = () => {
    if (!track) return;
    if (st.playing) {
      const p = playerTime();
      return save({ ...st, playing: false, pos: p ? p.cur : targetPos(), at: Date.now() });
    }
    return save({ ...st, playing: true, pos: st.pos || 0, at: Date.now() });
  };

  const volEl = (
    <div className="mh-amb-vol">
      <button type="button" className="mh-amb-ib" aria-label={muted ? "Activar sonido" : "Silenciar"} title={muted ? "Activar sonido" : "Silenciar (solo para ti)"} onClick={() => setMuted((m) => !m)}>
        {muted || vol === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : vol} aria-label="Tu volumen" onChange={(e) => (setMuted(false), setVol(parseFloat(e.target.value)))} />
    </div>
  );

  const live = !!track && st.playing;
  return (
    <>
      <audio ref={audio} preload="none" onLoadedMetadata={syncNow} onPlaying={syncNow} />
      {/* Reproductor de YouTube: solo se oye el audio, el vídeo queda fuera de la pantalla */}
      <div ref={ytBox} aria-hidden="true" style={{ position: "fixed", left: -9999, top: 0, width: 200, height: 200, overflow: "hidden", pointerEvents: "none" }} />
      {/* Mini reproductor: lo ve toda la mesa mientras suena una pista */}
      {live && !open && (
        <div className="mh-amb-pill" role="group" aria-label="Ambiente de la campaña">
          <Music size={15} className="mh-amb-note" />
          <span className="mh-amb-pn">{track.name}</span>
          {blocked && (
            <button type="button" className="mh-amb-un" onClick={unlock}>
              Activar sonido
            </button>
          )}
          {volEl}
        </div>
      )}
      {isGm && open && typeof document !== "undefined" &&
        createPortal(
          <div ref={popRef} className="mh-amb-pop" style={{ top: pos.top, left: pos.left, width: Math.min(340, (typeof window !== "undefined" ? window.innerWidth : 360) - 24) }} role="dialog" aria-label="Ambiente">
            <div className="mh-amb-now">
              <button type="button" className="mh-amb-play" disabled={!track} onClick={toggle} aria-label={st.playing ? "Pausar" : "Reproducir"}>
                {st.playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="mh-amb-nt">
                <small>{track ? (st.playing ? "Suena para toda la mesa" : "En pausa") : "Ambiente"}</small>
                <b>{track ? track.name : "Añade una pista"}</b>
              </div>
              {volEl}
            </div>
            {blocked && st.playing && (
              <button type="button" className="mh-amb-un is-wide" onClick={unlock}>
                Activar sonido aquí
              </button>
            )}
            {st.tracks.length > 0 && (
              <div className="mh-amb-list">
                {st.tracks.map((t) => (
                  <div key={t.id} className={"mh-amb-row" + (t.id === st.current ? " is-on" : "")}>
                    <button type="button" className="mh-amb-rb" onClick={() => (t.id === st.current ? toggle() : select(t.id))}>
                      {t.id === st.current && st.playing ? <Pause size={13} /> : <Play size={13} />}
                      <span>{t.name}</span>
                    </button>
                    <button type="button" className="mh-amb-ib" aria-label={"Quitar " + t.name} title="Quitar la pista" onClick={() => remove(t.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mh-amb-addrow">
              <input className="mh-input" placeholder="Enlace de audio o de YouTube" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLink()} />
              <button type="button" className="mh-amb-ib" aria-label="Añadir el enlace" title="Añadir el enlace" disabled={!link.trim()} onClick={addLink}>
                <Plus size={15} />
              </button>
              <label className={"mh-amb-ib" + (busy ? " is-busy" : "")} title="Subir un archivo de audio (máx. 2,5 MB)" style={{ cursor: "pointer" }}>
                <Upload size={14} />
                <input type="file" accept="audio/*" style={{ display: "none" }} onChange={(e) => (addFile(e.target.files?.[0]), (e.target.value = ""))} />
              </label>
            </div>
            {err && <div className="mh-gm-err">{err}</div>}
          </div>,
          document.querySelector(".mh-root") || document.body
        )}
    </>
  );
}
