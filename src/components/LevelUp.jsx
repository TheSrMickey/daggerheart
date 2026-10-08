"use client";

import { useMemo, useState } from "react";

// Subida de nivel según el manual (capítulo «Leveling Up»): logros de nivel, dos avances del Rango, umbrales y carta de dominio.
// Los avances tienen casillas limitadas por Rango. Las cifras de LEVEL_OPTIONS son las casillas de cada opción en la hoja de nivel.

export const MAX_LEVEL = 10;
export const rankOf = (level) => (level >= 8 ? 4 : level >= 5 ? 3 : level >= 2 ? 2 : 1);
export const isAchievementLevel = (level) => level === 2 || level === 5 || level === 8;

// rank: primer Rango en el que aparece. cost: puntos que gasta (de los 2 que tienes). slots: casillas por Rango.
export const LEVEL_OPTIONS = [
  { id: "traits", name: "Dos rasgos +1", desc: "Elige dos rasgos sin marcar; quedan marcados", rank: 2, cost: 1, slots: 3 },
  { id: "hp", name: "+1 casilla de Vida", desc: "Permanente", rank: 2, cost: 1, slots: 2 },
  { id: "stress", name: "+1 casilla de Estrés", desc: "Permanente", rank: 2, cost: 1, slots: 2 },
  { id: "exp", name: "Dos Experiencias +1", desc: "Sube el bono de dos Experiencias", rank: 2, cost: 1, slots: 2 },
  { id: "dom", name: "Carta de dominio extra", desc: "De nivel igual o menor al tuyo", rank: 2, cost: 1, slots: 1 },
  { id: "eva", name: "+1 Evasión", desc: "Permanente", rank: 2, cost: 1, slots: 1 },
  { id: "sub", name: "Subclase mejorada", desc: "Especialización o Maestría", rank: 3, cost: 1, slots: 1 },
  { id: "prof", name: "+1 Competencia", desc: "Y un dado de daño más en tu arma", rank: 3, cost: 2, slots: 1 },
  { id: "multi", name: "Multiclase", desc: "Segunda clase y dominio", rank: 3, cost: 2, slots: 1, soon: true },
];

export const parseAdvances = (c) => {
  try {
    const a = JSON.parse(c?.f_advances || "{}");
    return { s: a.s || {}, marks: Array.isArray(a.marks) ? a.marks : [], sub: Number(a.sub || 0) };
  } catch (e) {
    return { s: {}, marks: [], sub: 0 };
  }
};

const used = (adv, rank, id) => Number(adv.s?.[rank]?.[id] || 0);
// Casillas libres de una opción, contando las de los Rangos anteriores («o cualquiera del Rango anterior»).
export const freeSlots = (adv, opt, rank) => {
  let n = 0;
  for (let k = opt.rank; k <= rank; k++) n += opt.slots - used(adv, k, opt.id);
  return n;
};
export const totalSlots = (opt, rank) => opt.slots * Math.max(0, rank - opt.rank + 1);

// Marca las casillas gastadas empezando por el Rango actual y bajando.
const spend = (adv, picks, rank) => {
  const s = JSON.parse(JSON.stringify(adv.s || {}));
  picks.forEach((id) => {
    const opt = LEVEL_OPTIONS.find((o) => o.id === id);
    for (let k = rank; k >= opt.rank; k--) {
      if (used({ s }, k, id) < opt.slots) {
        s[k] = { ...(s[k] || {}), [id]: used({ s }, k, id) + 1 };
        break;
      }
    }
  });
  return s;
};

const list = (raw) => {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
};

export const ownedCards = (c) => ({ loadout: list(c?.f_domain_cards), vault: list(c?.f_domain_vault) });

// Cuántas cartas nuevas toca coger con estas elecciones.
export const cardsNeeded = (picks) => 1 + (picks.includes("dom") ? 1 : 0);

// Campos de la hoja que cambian al subir de nivel.
export function levelUpPatch(c, { nl, picks, traits, expIdx, newExp, cards, swapOut, swapIn, profBase }) {
  const adv = parseAdvances(c);
  const rank = rankOf(nl);
  const ach = isAchievementLevel(nl);
  const patch = { f_level: String(nl) };
  let marks = nl === 5 || nl === 8 ? [] : [...adv.marks];
  let prof = profBase;
  const exps = list(c.f_experiences);
  if (ach) {
    prof += 1;
    if (newExp.trim()) exps.push({ text: newExp.trim(), bonus: 2 });
  }
  if (picks.includes("traits")) {
    traits.forEach((k) => {
      patch[k] = String(Number(c[k] || 0) + 1);
      marks.push(k);
    });
  }
  if (picks.includes("hp")) patch.r_hp = String(Number(c.r_hp || 0) + 1);
  if (picks.includes("stress")) patch.r_stress = String(Number(c.r_stress || 0) + 1);
  if (picks.includes("eva")) patch.r_evasion = String(Number(c.r_evasion || 0) + 1);
  if (picks.includes("prof")) prof += 1;
  if (picks.includes("exp")) expIdx.forEach((i) => exps[i] && (exps[i] = { ...exps[i], bonus: Number(exps[i].bonus || 0) + 1 }));
  patch.f_experiences = JSON.stringify(exps);
  patch.f_proficiency = String(prof);
  // Cartas de dominio: las nuevas van al equipo (máximo 5) y el resto a la bóveda. El intercambio sustituye en el sitio.
  let { loadout, vault } = ownedCards(c);
  if (swapOut && swapIn) {
    if (loadout.includes(swapOut)) loadout = loadout.map((k) => (k === swapOut ? swapIn : k));
    else vault = vault.map((k) => (k === swapOut ? swapIn : k));
  }
  cards.forEach((k) => (loadout.length < 5 ? loadout.push(k) : vault.push(k)));
  patch.f_domain_cards = JSON.stringify(loadout);
  patch.f_domain_vault = vault.length ? JSON.stringify(vault) : "";
  patch.f_advances = JSON.stringify({ s: spend(adv, picks, rank), marks, sub: adv.sub + (picks.includes("sub") ? 1 : 0) });
  return patch;
}

const STEPS = ["Logros", "Avances", "Umbrales", "Carta de dominio"];

export function LevelUpDialog({ c, color, traitList, pool, domainColors, profBase, thresholds, onClose, onConfirm }) {
  const nl = Number(c.f_level || 1) + 1;
  const rank = rankOf(nl);
  const ach = isAchievementLevel(nl);
  const clear = nl === 5 || nl === 8;
  const adv = useMemo(() => parseAdvances(c), [c]);
  const marks = clear ? [] : adv.marks;
  const exps = list(c.f_experiences);
  const { loadout, vault } = ownedCards(c);
  const owned = [...loadout, ...vault];

  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState([]);
  const [traits, setTraits] = useState([]);
  const [expIdx, setExpIdx] = useState([]);
  const [newExp, setNewExp] = useState("");
  const [cards, setCards] = useState([]);
  const [swapOn, setSwapOn] = useState(false);
  const [swapOut, setSwapOut] = useState("");
  const [swapIn, setSwapIn] = useState("");
  const [msg, setMsg] = useState("");

  const opts = LEVEL_OPTIONS.filter((o) => o.rank <= rank);
  const spent = picks.reduce((a, id) => a + LEVEL_OPTIONS.find((o) => o.id === id).cost, 0);
  const available = pool.filter((k) => !owned.includes(k.key) && k.level <= nl);
  const need = Math.min(cardsNeeded(picks), available.length);

  const pick = (o) => {
    setMsg("");
    if (picks.includes(o.id)) {
      setPicks(picks.filter((x) => x !== o.id));
      if (o.id === "traits") setTraits([]);
      if (o.id === "exp") setExpIdx([]);
      return;
    }
    if (o.soon) return setMsg("La multiclase todavía no está disponible en la app.");
    if (freeSlots(adv, o, rank) < 1) return setMsg(o.name + ": ya no te quedan casillas.");
    if (spent + o.cost > 2) return setMsg("Solo tienes 2 puntos. Quita un avance antes de elegir «" + o.name.toLowerCase() + "».");
    setPicks([...picks, o.id]);
  };
  const toggle = (arr, set, v, max) => {
    setMsg("");
    if (arr.includes(v)) set(arr.filter((x) => x !== v));
    else if (arr.length < max) set([...arr, v]);
  };
  const toggleCard = (k) => {
    setMsg("");
    if (cards.includes(k)) setCards(cards.filter((x) => x !== k));
    else if (cards.length < need) setCards([...cards, k]);
    else setCards([...cards.slice(1), k]);
  };

  const stepError = (s) => {
    if (s === 0 && ach && !newExp.trim()) return "Escribe la nueva Experiencia.";
    if (s === 1) {
      if (spent !== 2) return "Elige avances hasta usar los 2 puntos.";
      if (picks.includes("traits") && traits.length !== 2) return "Elige los dos rasgos que suben.";
      if (picks.includes("exp") && expIdx.length !== 2) return "Elige las dos Experiencias que suben.";
    }
    if (s === 3) {
      if (cards.length !== need) return need ? "Elige " + (need === 1 ? "una carta" : need + " cartas") + " de dominio." : "";
      if (swapOn && (!swapOut || !swapIn)) return "Elige la carta que cambias y por cuál.";
    }
    return "";
  };
  const next = () => {
    const e = stepError(step);
    if (e) return setMsg(e);
    setMsg("");
    setStep(step + 1);
  };
  const confirm = () => {
    const e = stepError(3);
    if (e) return setMsg(e);
    onConfirm(levelUpPatch(c, { nl, picks, traits, expIdx, newExp, cards, swapOut: swapOn ? swapOut : "", swapIn: swapOn ? swapIn : "", profBase }), nl);
  };

  const hp = picks.includes("hp") ? 1 : 0;
  const st = picks.includes("stress") ? 1 : 0;
  const prof = (ach ? 1 : 0) + (picks.includes("prof") ? 1 : 0);

  return (
    <div className="lv-bg" onClick={onClose}>
      <div className="lv" role="dialog" aria-label={"Subir al nivel " + nl} style={{ "--lvc": color }} onClick={(e) => e.stopPropagation()}>
        <div className="lv-head">
          <svg viewBox="0 0 52 58" width="40" height="45" aria-hidden="true" className="lv-shield">
            <path d="M4 4 H48 V31 C48 43 38 51 26 55 C14 51 4 43 4 31 Z" />
            <text x="26" y="17" className="lv-sl">NIVEL</text>
            <text x="26" y="40" className="lv-sn">{nl}</text>
          </svg>
          <div>
            <div className="mh-serif lv-title">{c.f_name || "Tu personaje"} sube al nivel {nl}</div>
            <div className="lv-sub">{ach ? "Empieza el Rango " + rank : "Rango " + rank}</div>
          </div>
          <button type="button" className="lv-x" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="lv-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={"lv-step" + (i === step ? " is-on" : i < step ? " is-ok" : "")}>{i < step ? "✓ " : i + 1 + " · "}{s}</div>
          ))}
        </div>

        <div className="lv-body">
          {step === 0 && (
            <>
              <p className="lv-p">{ach ? "Al empezar el Rango " + rank + " ganas estos logros de nivel:" : "Este nivel no abre un Rango nuevo, así que no hay logros de nivel. Pasa a elegir tus avances."}</p>
              {ach && (
                <>
                  <div className="lv-chips">
                    <span>Nueva Experiencia +2</span>
                    <span>Competencia +1</span>
                    {clear && <span>Se desmarcan todos los rasgos</span>}
                  </div>
                  <label className="lv-lab">Nueva Experiencia (empieza con +2)</label>
                  <input className="lv-in" value={newExp} maxLength={60} placeholder="Por ejemplo: Siempre caigo de pie" onChange={(e) => (setNewExp(e.target.value), setMsg(""))} />
                </>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <p className="lv-p">Elige dos avances del Rango {rank} (o de los anteriores con casillas libres). <b>Puntos usados: {spent} / 2</b></p>
              <div className="lv-opts">
                {opts.map((o) => {
                  const fr = freeSlots(adv, o, rank);
                  const tt = totalSlots(o, rank);
                  const sel = picks.includes(o.id);
                  const off = (fr < 1 && !sel) || o.soon;
                  return (
                    <button type="button" key={o.id} className={"lv-opt" + (sel ? " is-on" : "") + (off ? " is-off" : "")} onClick={() => pick(o)}>
                      <span className="lv-cost">{o.cost} pt</span>
                      <b>{o.name}</b>
                      <small>{o.soon ? "Próximamente" : o.desc}</small>
                      <span className="lv-pips">
                        {Array.from({ length: tt }, (_, i) => (
                          <i key={i} className={i < tt - fr ? "u" : sel && i === tt - fr ? "n" : ""} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
              {picks.includes("traits") && (
                <div className="lv-sec">
                  <label className="lv-lab">Rasgos que suben (+1)</label>
                  <div className="lv-row">
                    {traitList.map((t) => {
                      const m = marks.includes(t.key);
                      return (
                        <button type="button" key={t.key} className={"lv-chipb" + (traits.includes(t.key) ? " is-on" : "") + (m ? " is-mk" : "")} onClick={() => (m ? setMsg(t.label + " está marcado: se desmarca en los niveles 5 y 8.") : toggle(traits, setTraits, t.key, 2))}>
                          {t.label} {t.value >= 0 ? "+" : ""}{t.value}{m ? " ●" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {picks.includes("exp") && (
                <div className="lv-sec">
                  <label className="lv-lab">Experiencias que suben (+1)</label>
                  <div className="lv-row">
                    {exps.map((e, i) => (
                      <button type="button" key={i} className={"lv-chipb" + (expIdx.includes(i) ? " is-on" : "")} onClick={() => toggle(expIdx, setExpIdx, i, 2)}>
                        {e.text} +{e.bonus}
                      </button>
                    ))}
                    {!exps.length && <span className="lv-sub">No tienes Experiencias todavía.</span>}
                  </div>
                </div>
              )}
              {picks.includes("sub") && <div className="lv-note">Subes tu subclase al siguiente nivel de mejora y se tacha la multiclase de este Rango.</div>}
              {picks.includes("prof") && <div className="lv-note">Tu Competencia sube y tu arma gana un dado de daño.</div>}
            </>
          )}

          {step === 2 && (
            <>
              <p className="lv-p">Tus umbrales de daño suman tu nivel, así que suben +1 automáticamente.</p>
              <div className="lv-chips">
                <span>Mayor {thresholds.major} → {thresholds.major + 1}</span>
                <span>Grave {thresholds.severe} → {thresholds.severe + 1}</span>
              </div>
              <div className="lv-sum">
                <div><small>Competencia</small><b>{prof ? "+" + prof : "—"}</b></div>
                <div><small>Vida / Estrés</small><b>+{hp} / +{st}</b></div>
                <div><small>Evasión</small><b>{picks.includes("eva") ? "+1" : "—"}</b></div>
                <div><small>Experiencias</small><b>{ach ? "1 nueva" : "—"}{picks.includes("exp") ? " · +1 a 2" : ""}</b></div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="lv-p">
                {need ? "Elige " + (need === 1 ? "una carta" : need + " cartas") + " de dominio de nivel " + nl + " o menor" + (picks.includes("dom") ? " (una es el avance extra)." : ".") : "No hay cartas nuevas de tus dominios cargadas para este nivel."}
              </p>
              <div className="lv-cards">
                {available.map((k) => (
                  <button type="button" key={k.key} className={"lv-card" + (cards.includes(k.key) ? " is-on" : "")} style={{ "--dc": domainColors[k.domain] || color }} onClick={() => toggleCard(k.key)}>
                    <span className="lv-dom">{k.domain} · nivel {k.level}</span>
                    <b>{k.key}</b>
                    <small>{k.text}</small>
                  </button>
                ))}
              </div>
              {owned.length > 0 && (
                <div className="lv-sec">
                  <label className="lv-chk"><input type="checkbox" checked={swapOn} onChange={(e) => (setSwapOn(e.target.checked), setMsg(""))} /> Cambiar una carta que ya tengo por otra de nivel igual o menor</label>
                  {swapOn && (
                    <div className="lv-row">
                      <select className="lv-in" value={swapOut} onChange={(e) => setSwapOut(e.target.value)}>
                        <option value="">Carta que dejo</option>
                        {owned.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <select className="lv-in" value={swapIn} onChange={(e) => setSwapIn(e.target.value)}>
                        <option value="">Carta que cojo</option>
                        {pool.filter((k) => !owned.includes(k.key) && !cards.includes(k.key)).map((k) => <option key={k.key} value={k.key}>{k.key} (nivel {k.level})</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              {loadout.length + cards.length > 5 && <div className="lv-note">Superas las 5 cartas del equipo: las que sobran van a la bóveda y puedes cambiarlas desde la hoja.</div>}
            </>
          )}
          <div className="lv-err">{msg}</div>
        </div>

        <div className="lv-foot">
          <button type="button" className="lv-btn" onClick={() => (setMsg(""), step === 0 ? onClose() : setStep(step - 1))}>{step === 0 ? "Cancelar" : "Atrás"}</button>
          {step < 3 ? (
            <button type="button" className="lv-btn is-go" onClick={next}>Siguiente</button>
          ) : (
            <button type="button" className="lv-btn is-go" onClick={confirm}>Confirmar nivel {nl}</button>
          )}
        </div>
      </div>
    </div>
  );
}
