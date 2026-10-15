"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Music, Play, Pause, Plus, Trash2, Upload, Volume2, VolumeX, X } from "lucide-react";
import { storageGet, storageSet } from "@/lib/storage";

// Ambiente de la campaña: el DJ prepara pistas de audio (un enlace o un archivo) y las reproduce o pausa para toda la mesa.
// Cada persona controla solo su volumen (se guarda en su navegador). El estado compartido vive en «campaign-ambient:<id>».
const MAX_FILE = 2.5 * 1024 * 1024; // 2,5 MB por archivo
const VOL_KEY = "mh-amb-vol";
const EMPTY = { tracks: [], current: null, playing: false, ts: 0 };

const parse = (raw) => {
  try {
    const v = raw ? JSON.parse(raw) : null;
    return v && Array.isArray(v.tracks) ? { ...EMPTY, ...v } : EMPTY;
  } catch (e) {
    return EMPTY;
  }
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

  // Pone la pista actual en el reproductor y la arranca o pausa según el DJ.
  useEffect(() => {
    const a = audio.current;
    if (!a) return undefined;
    let dead = false;
    (async () => {
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
    if (audio.current) audio.current.volume = muted ? 0 : vol;
    try {
      localStorage.setItem(VOL_KEY, String(vol));
      localStorage.setItem(VOL_KEY + "-m", muted ? "1" : "0");
    } catch (e) {}
  }, [vol, muted]);

  const unlock = async () => {
    try {
      await audio.current?.play();
      setBlocked(false);
    } catch (e) {}
  };

  const addLink = async () => {
    const u = link.trim();
    if (!/^https?:\/\//i.test(u)) return setErr("Pega un enlace que empiece por https://");
    const t = { id: "t" + Date.now(), name: name.trim() || u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40), src: u };
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
    await save({ ...st, tracks, current: gone ? tracks[0]?.id || null : st.current, playing: gone ? false : st.playing });
  };
  const select = (id) => save({ ...st, current: id, playing: true });
  const toggle = () => track && save({ ...st, playing: !st.playing });

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
      <audio ref={audio} preload="none" />
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
              <input className="mh-input" placeholder="Enlace al audio (https://…)" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLink()} />
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
