"use client";

import { useState } from "react";
import { Dices, Shield, Heart, Zap, Sparkles, ExternalLink } from "lucide-react";
import { weaponIcon } from "./gearIcons";

// Hoja de personaje "moderna": vive en la columna central. Recibe los datos ya calculados y las acciones de la app.
const TABS = [
  ["general", "Detalles generales"],
  ["acciones", "Acciones"],
  ["descanso", "Descanso"],
  ["inventario", "Inventario"],
  ["trasfondo", "Trasfondo"],
];

const signed = (n) => (n > 0 ? "+" + n : String(n));

function Track({ label, Icon, total, filled, onToggle, color, shape = "box" }) {
  return (
    <div className="mhm-track">
      <div className="mhm-track-l">
        <Icon size={13} /> {label}
        <small>{filled}/{total}</small>
      </div>
      <div className="mhm-pips">
        {Array.from({ length: total }, (_, i) => (
          <button key={i} type="button" className={"mhm-pip is-" + shape + (i < filled ? " is-on" : "")} style={{ "--pc": color }} onClick={() => onToggle(i)} aria-label={`${label} ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

export function ModernSheet({ d, actions }) {
  const [tab, setTab] = useState("general");
  const Emblem = d.Emblem;
  return (
    <div className="mhm" style={{ "--cc": d.color }}>
      <section className="mhm-head">
        <span className="mhm-head-emb" aria-hidden="true"><Emblem size={190} strokeWidth={1} /></span>
        <div className="mhm-head-top">
          <div className="mhm-level"><small>NIVEL</small><b>{d.level}</b></div>
          <div>
            <h2 className="mh-serif">{d.name || "Sin nombre"}</h2>
            <p>{[d.cls, d.subclass].filter(Boolean).join(" · ") || "Sin clase asignada"}</p>
          </div>
        </div>
        <div className="mhm-traits">
          {d.traits.map((t) => (
            <button key={t.key} type="button" onClick={() => actions.rollTrait(t.label, t.value)} title={"Tirar " + t.label}>
              <span>{t.label}</span>
              <b>{signed(t.value)}</b>
            </button>
          ))}
        </div>
      </section>

      <nav className="mhm-tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>

      {tab === "general" ? (
        <div className="mhm-grid">
          <section className="mhm-panel">
            <h3 className="mh-serif">Armadura y estadísticas</h3>
            <div className="mhm-two">
              <div className="mhm-big"><small>Evasión</small><b className="mh-serif">{d.evasion}</b></div>
              <div className="mhm-big">
                <small>Armadura</small>
                <div className="mhm-armor">
                  <b className="mh-serif">{d.armorTotal}</b>
                  <span>
                    {Array.from({ length: d.armorTotal }, (_, i) => (
                      <button key={i} type="button" className={"mhm-shield" + (i < d.armorLeft ? " is-on" : "")} onClick={() => actions.setArmor(i < d.armorLeft && i + 1 === d.armorLeft ? i : i + 1)} aria-label={`Armadura ${i + 1}`}>
                        <Shield size={15} />
                      </button>
                    ))}
                  </span>
                </div>
              </div>
            </div>
            <div className="mhm-thr">
              <div><small>Menor</small><b>{d.minor}</b></div>
              <div><small>Mayor</small><b>{d.major}</b></div>
              <div className="is-severe"><small>Grave</small><b>{d.severe}</b></div>
            </div>
            <Track label="Puntos de vida" Icon={Heart} total={d.hpTotal} filled={d.hpMarked} color="#E0544A" onToggle={actions.markHp} />
            <Track label="Estrés" Icon={Zap} total={d.stressTotal} filled={d.stressMarked} color="#A58BE8" onToggle={actions.markStress} />
            <Track label="Esperanza" Icon={Sparkles} total={d.hopeTotal} filled={d.hope} color="#E3B04B" shape="diamond" onToggle={actions.setHope} />
          </section>

          <div className="mhm-col">
            <section className="mhm-panel">
              <h3 className="mh-serif">Armas <small>Competencia {d.proficiency}</small></h3>
              {d.weapons.length === 0 && <p className="mhm-empty">Sin armas equipadas.</p>}
              {d.weapons.map((w) => {
                const Icon = weaponIcon(w.key);
                return (
                  <div key={w.kind} className="mhm-weapon">
                    <div className="mhm-wicon" style={{ "--tc": w.tierColor }}>
                      <Icon size={34} strokeWidth={1.5} />
                      <i>{w.tierLabel}</i>
                    </div>
                    <div className="mhm-winfo">
                      <small>{w.kind} · {w.hands}</small>
                      <b className="mh-serif">{w.key}</b>
                      <div className="mhm-wdmg"><strong>{w.damage.split(" ")[0]}</strong> {w.damage.split(" ").slice(1).join(" ")} · {w.trait} · {w.range}</div>
                      {w.feature && <div className="mhm-wfeat">{w.feature}</div>}
                      <div className="mhm-wact">
                        <button type="button" className="is-primary" onClick={() => actions.attack(w)}><Dices size={13} /> Atacar</button>
                        <button type="button" onClick={() => actions.damage(w)}>{w.damage.split(" ")[0]}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
            <section className="mhm-panel">
              <h3 className="mh-serif">Experiencias</h3>
              {d.experiences.length === 0 && <p className="mhm-empty">Aún no tienes experiencias.</p>}
              {d.experiences.map((e, i) => (
                <div key={i} className="mhm-exp">
                  <div><small>Experiencia</small><b className="mh-serif">{e.text}</b></div>
                  <span className="mh-serif">{signed(e.bonus)}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      ) : (
        <section className="mhm-panel mhm-soon">
          <h3 className="mh-serif">{TABS.find((t) => t[0] === tab)[1]}</h3>
          <p>Esta sección todavía no está en la hoja moderna. Puedes usarla en la hoja clásica.</p>
          <button type="button" className="is-primary" onClick={actions.openClassic}><ExternalLink size={14} /> Abrir hoja clásica</button>
        </section>
      )}
    </div>
  );
}
