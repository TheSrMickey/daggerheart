"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { ArrowLeft, Check, CloudOff, Loader2, Minus, Plus, Trash2, X } from "lucide-react";
import { deleteCharacter } from "@/app/personajes/actions";
import {
  ANCESTRIES,
  ARMOR_PRESETS,
  CLASSES,
  COMMUNITIES,
  DOMAINS,
  MAX_HOPE,
  RANGES,
  STARTING_TRAIT_ARRAY,
  TRAITS,
  classInfo,
  formatMod,
  normalizeSheet,
  type Character,
  type DomainCard,
  type Sheet,
  type Weapon,
} from "@/lib/daggerheart";
import { createClient } from "@/lib/supabase/client";

type Meta = Pick<Character, "name" | "class" | "subclass" | "ancestry" | "community" | "level">;
type SaveStatus = "saved" | "pending" | "saving" | "error";

export function CharacterSheet({ initial }: { initial: Character }) {
  const [meta, setMeta] = useState<Meta>({
    name: initial.name,
    class: initial.class,
    subclass: initial.subclass,
    ancestry: initial.ancestry,
    community: initial.community,
    level: initial.level,
  });
  const [sheet, setSheet] = useState<Sheet>(() => normalizeSheet(initial.sheet));
  const status = useAutosave(initial.id, meta, sheet);

  const info = classInfo(meta.class);
  const patch = (p: Partial<Sheet>) => setSheet((s) => ({ ...s, ...p }));
  const patchMeta = (p: Partial<Meta>) => setMeta((m) => ({ ...m, ...p }));

  function changeClass(name: string) {
    const next = classInfo(name);
    patchMeta({ class: name || null, subclass: null });
    if (next) {
      patch({
        evasion: next.evasion,
        hp: { max: next.hp, marked: Math.min(sheet.hp.marked, next.hp) },
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/personajes" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft size={16} /> Mis personajes
        </Link>
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          <DeleteButton id={initial.id} name={meta.name} />
        </div>
      </div>

      {/* Identidad */}
      <section className="card">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div>
              <label className="label" htmlFor="name">Nombre</label>
              <input
                id="name"
                className="field font-display text-xl font-bold"
                value={meta.name}
                onChange={(e) => patchMeta({ name: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="pronouns">Pronombres</label>
              <input id="pronouns" className="field" value={sheet.pronouns} onChange={(e) => patch({ pronouns: e.target.value })} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <span className="label">Nivel</span>
              <Stepper value={meta.level} min={1} max={10} onChange={(level) => patchMeta({ level })} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Clase" value={meta.class} options={CLASSES.map((c) => c.name)} onChange={changeClass} />
          <Select
            label="Subclase"
            value={meta.subclass}
            options={info?.subclasses ?? []}
            disabled={!info}
            onChange={(v) => patchMeta({ subclass: v || null })}
          />
          <Select label="Ascendencia" value={meta.ancestry} options={ANCESTRIES} onChange={(v) => patchMeta({ ancestry: v || null })} />
          <Select label="Comunidad" value={meta.community} options={COMMUNITIES} onChange={(v) => patchMeta({ community: v || null })} />
        </div>
        {info && (
          <p className="mt-3 text-sm text-muted">
            Dominios: <span className="font-semibold text-gold">{info.domains.join(" & ")}</span> · Evasión inicial {info.evasion} · PG
            iniciales {info.hp}
          </p>
        )}
      </section>

      {/* Rasgos */}
      <section className="card">
        <h2 className="card-title">Rasgos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {TRAITS.map((t) => (
            <div key={t.key} className="rounded-lg border border-line bg-panel-2 p-3 text-center">
              <p className="font-display text-sm font-bold">{t.label}</p>
              <p className="my-2 text-3xl font-bold tabular-nums">{formatMod(sheet.traits[t.key])}</p>
              <Stepper
                compact
                value={sheet.traits[t.key]}
                min={-5}
                max={9}
                onChange={(v) => patch({ traits: { ...sheet.traits, [t.key]: v } })}
              />
              <p className="mt-2 text-[11px] leading-tight text-muted">{t.verbs}</p>
            </div>
          ))}
        </div>
        <TraitArrayHint traits={Object.values(sheet.traits)} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Defensa */}
        <section className="card space-y-4">
          <h2 className="card-title">Defensa</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Evasión" value={sheet.evasion} onChange={(evasion) => patch({ evasion })} big />
            <NumberField
              label="Armadura"
              value={sheet.armor.score}
              onChange={(score) => patch({ armor: { ...sheet.armor, score, marked: Math.min(sheet.armor.marked, score) } })}
              big
            />
          </div>

          <div>
            <label className="label" htmlFor="armor-preset">Armadura equipada</label>
            <select
              id="armor-preset"
              className="field"
              value={ARMOR_PRESETS.some((a) => a.name === sheet.armor.name) ? sheet.armor.name : ""}
              onChange={(e) => {
                const a = ARMOR_PRESETS.find((p) => p.name === e.target.value);
                if (a) patch({ armor: { ...a, marked: Math.min(sheet.armor.marked, a.score) } });
              }}
            >
              <option value="">Personalizada…</option>
              {ARMOR_PRESETS.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name} ({a.major}/{a.severe}, {a.score})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              className="field col-span-3"
              placeholder="Nombre de la armadura"
              value={sheet.armor.name}
              onChange={(e) => patch({ armor: { ...sheet.armor, name: e.target.value } })}
            />
            <NumberField label="Umbral mayor" value={sheet.armor.major} onChange={(major) => patch({ armor: { ...sheet.armor, major } })} />
            <NumberField label="Umbral grave" value={sheet.armor.severe} onChange={(severe) => patch({ armor: { ...sheet.armor, severe } })} />
            <div className="flex flex-col justify-end text-xs text-muted">Se suma tu nivel automáticamente</div>
            <input
              className="field col-span-3"
              placeholder="Rasgo de la armadura"
              value={sheet.armor.feature}
              onChange={(e) => patch({ armor: { ...sheet.armor, feature: e.target.value } })}
            />
          </div>

          <div>
            <span className="label">Espacios de armadura</span>
            <Tracker
              total={sheet.armor.score}
              marked={sheet.armor.marked}
              onChange={(marked) => patch({ armor: { ...sheet.armor, marked } })}
              shape="shield"
            />
          </div>
        </section>

        {/* Daño y salud */}
        <section className="card space-y-4">
          <h2 className="card-title">Daño y salud</h2>
          <Thresholds major={sheet.armor.major + meta.level} severe={sheet.armor.severe + meta.level} />
          <DamageHelper
            major={sheet.armor.major + meta.level}
            severe={sheet.armor.severe + meta.level}
            onApply={(n) => patch({ hp: { ...sheet.hp, marked: Math.min(sheet.hp.max, sheet.hp.marked + n) } })}
          />
          <div>
            <div className="flex items-center justify-between">
              <span className="label">Puntos de golpe</span>
              <Stepper compact value={sheet.hp.max} min={1} max={12} onChange={(max) => patch({ hp: { max, marked: Math.min(sheet.hp.marked, max) } })} />
            </div>
            <Tracker total={sheet.hp.max} marked={sheet.hp.marked} onChange={(marked) => patch({ hp: { ...sheet.hp, marked } })} tone="danger" />
            {sheet.hp.marked >= sheet.hp.max && <p className="mt-2 text-sm font-semibold text-danger">Último PG marcado: haz tu movimiento de muerte.</p>}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="label">Estrés</span>
              <Stepper
                compact
                value={sheet.stress.max}
                min={1}
                max={12}
                onChange={(max) => patch({ stress: { max, marked: Math.min(sheet.stress.marked, max) } })}
              />
            </div>
            <Tracker
              total={sheet.stress.max}
              marked={sheet.stress.marked}
              onChange={(marked) => patch({ stress: { ...sheet.stress, marked } })}
              tone="fear"
            />
            {sheet.stress.marked >= sheet.stress.max && <p className="mt-2 text-sm font-semibold text-fear">Estrés al máximo: estás Vulnerable.</p>}
          </div>
        </section>

        {/* Esperanza y experiencias */}
        <section className="card space-y-4">
          <h2 className="card-title">Esperanza</h2>
          <Tracker total={MAX_HOPE} marked={sheet.hope} onChange={(hope) => patch({ hope })} tone="hope" shape="diamond" />
          <p className="text-xs text-muted">Gasta 1 para ayudar a un aliado, 1 para usar una Experiencia, 3 para una Tirada en Equipo.</p>

          <div>
            <span className="label">Competencia</span>
            <Tracker total={6} marked={sheet.proficiency} onChange={(proficiency) => patch({ proficiency: Math.max(1, proficiency) })} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Experiencias</span>
              <button
                className="btn btn-ghost px-2 py-1 text-xs"
                onClick={() => patch({ experiences: [...sheet.experiences, { name: "", bonus: 2 }] })}
              >
                <Plus size={14} /> Añadir
              </button>
            </div>
            <ul className="space-y-2">
              {sheet.experiences.map((exp, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    className="field"
                    placeholder="p. ej. Cazador de recompensas"
                    value={exp.name}
                    onChange={(e) => patch({ experiences: replaceAt(sheet.experiences, i, { ...exp, name: e.target.value }) })}
                  />
                  <input
                    className="field w-16 text-center"
                    type="number"
                    value={exp.bonus}
                    aria-label="Bonificador"
                    onChange={(e) => patch({ experiences: replaceAt(sheet.experiences, i, { ...exp, bonus: Number(e.target.value) }) })}
                  />
                  <IconButton label="Quitar experiencia" onClick={() => patch({ experiences: removeAt(sheet.experiences, i) })}>
                    <X size={16} />
                  </IconButton>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Armas */}
      <section className="card">
        <h2 className="card-title">Armas activas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <WeaponEditor title="Principal" weapon={sheet.weapons.primary} proficiency={sheet.proficiency} onChange={(primary) => patch({ weapons: { ...sheet.weapons, primary } })} />
          <WeaponEditor title="Secundaria" weapon={sheet.weapons.secondary} proficiency={sheet.proficiency} onChange={(secondary) => patch({ weapons: { ...sheet.weapons, secondary } })} />
        </div>
      </section>

      {/* Cartas de dominio */}
      <DomainCards cards={sheet.domainCards} classDomains={info?.domains} onChange={(domainCards) => patch({ domainCards })} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="card-title">Inventario</h2>
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Puñados" value={sheet.gold.handfuls} onChange={(handfuls) => patch({ gold: { ...sheet.gold, handfuls } })} />
            <NumberField label="Bolsas" value={sheet.gold.bags} onChange={(bags) => patch({ gold: { ...sheet.gold, bags } })} />
            <NumberField label="Cofres" value={sheet.gold.chests} onChange={(chests) => patch({ gold: { ...sheet.gold, chests } })} />
          </div>
          <TextArea label="Objetos" value={sheet.inventory} onChange={(inventory) => patch({ inventory })} rows={6} />
        </section>
        <section className="card space-y-3">
          <h2 className="card-title">Historia</h2>
          <TextArea label="Trasfondo" value={sheet.background} onChange={(background) => patch({ background })} />
          <TextArea label="Vínculos" value={sheet.connections} onChange={(connections) => patch({ connections })} />
          <TextArea label="Notas" value={sheet.notes} onChange={(notes) => patch({ notes })} />
        </section>
      </div>
    </div>
  );
}

/* ---------- Guardado automático ---------- */

function useAutosave(id: string, meta: Meta, sheet: Sheet): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const first = useRef(true);
  const supabase = useRef(createClient());

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("pending");
    const timer = setTimeout(async () => {
      setStatus("saving");
      const { error } = await supabase.current
        .from("characters")
        .update({ ...meta, name: meta.name.trim() || "Sin nombre", sheet })
        .eq("id", id);
      setStatus(error ? "error" : "saved");
    }, 700);
    return () => clearTimeout(timer);
  }, [id, meta, sheet]);

  useEffect(() => {
    if (status !== "pending" && status !== "saving") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  return status;
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 text-sm text-danger">
        <CloudOff size={16} /> Error al guardar
      </span>
    );
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted">
        <Check size={16} /> Guardado
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted">
      <Loader2 size={16} className="animate-spin" /> Guardando…
    </span>
  );
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-ghost px-3 py-1.5 text-danger"
      disabled={pending}
      onClick={() => {
        if (confirm(`¿Borrar a ${name || "este personaje"}? No se puede deshacer.`)) start(() => deleteCharacter(id));
      }}
    >
      <Trash2 size={16} /> <span className="hidden sm:inline">Borrar</span>
    </button>
  );
}

/* ---------- Piezas de la hoja ---------- */

function Tracker({
  total,
  marked,
  onChange,
  tone = "gold",
  shape = "box",
}: {
  total: number;
  marked: number;
  onChange: (n: number) => void;
  tone?: "gold" | "danger" | "fear" | "hope";
  shape?: "box" | "diamond" | "shield";
}) {
  const fill = { gold: "bg-gold border-gold", danger: "bg-danger border-danger", fear: "bg-fear border-fear", hope: "bg-hope border-hope" }[tone];
  const form = { box: "rounded-sm", diamond: "rotate-45 rounded-[3px] scale-90", shield: "rounded-b-full rounded-t-sm" }[shape];
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const on = i < marked;
        return (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1} de ${total}${on ? " (marcado)" : ""}`}
            aria-pressed={on}
            onClick={() => onChange(marked === i + 1 ? i : i + 1)}
            className={`h-7 w-7 border-2 transition ${form} ${on ? fill : "border-line bg-panel hover:border-muted"}`}
          />
        );
      })}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
  compact,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  compact?: boolean;
}) {
  const size = compact ? "h-7 w-7" : "h-10 w-10";
  return (
    <div className="inline-flex items-center gap-1">
      <button type="button" className={`btn btn-ghost p-0 ${size}`} aria-label="Restar" disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus size={14} />
      </button>
      {!compact && <span className="w-8 text-center text-lg font-bold tabular-nums">{value}</span>}
      {compact && <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>}
      <button type="button" className={`btn btn-ghost p-0 ${size}`} aria-label="Sumar" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus size={14} />
      </button>
    </div>
  );
}

function TraitArrayHint({ traits }: { traits: number[] }) {
  const sorted = [...traits].sort((a, b) => b - a);
  const matches = sorted.every((v, i) => v === STARTING_TRAIT_ARRAY[i]);
  return (
    <p className={`mt-3 text-xs ${matches ? "text-gold" : "text-muted"}`}>
      Reparto inicial: {STARTING_TRAIT_ARRAY.map(formatMod).join(", ")}
      {matches ? " ✓" : ` — ahora tienes ${sorted.map(formatMod).join(", ")}`}
    </p>
  );
}

function Thresholds({ major, severe }: { major: number; severe: number }) {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-line text-center text-xs">
      <div className="bg-panel-2 p-2">
        <p className="font-semibold">Leve</p>
        <p className="text-muted">1 PG</p>
        <p className="mt-1 font-bold tabular-nums">&lt; {major}</p>
      </div>
      <div className="border-x border-line p-2">
        <p className="font-semibold">Mayor</p>
        <p className="text-muted">2 PG</p>
        <p className="mt-1 font-bold tabular-nums">{major}+</p>
      </div>
      <div className="bg-panel-2 p-2">
        <p className="font-semibold">Grave</p>
        <p className="text-muted">3 PG</p>
        <p className="mt-1 font-bold tabular-nums">{severe}+</p>
      </div>
    </div>
  );
}

function DamageHelper({ major, severe, onApply }: { major: number; severe: number; onApply: (hp: number) => void }) {
  const [damage, setDamage] = useState("");
  const n = Number(damage);
  const hp = !damage || n <= 0 ? 0 : n >= severe ? 3 : n >= major ? 2 : 1;
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (hp) onApply(hp);
        setDamage("");
      }}
    >
      <div className="flex-1">
        <label className="label" htmlFor="damage">Recibir daño</label>
        <input id="damage" className="field" type="number" min={0} inputMode="numeric" value={damage} onChange={(e) => setDamage(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={!hp}>
        {hp ? `Marcar ${hp} PG` : "Marcar"}
      </button>
    </form>
  );
}

function WeaponEditor({ title, weapon, proficiency, onChange }: { title: string; weapon: Weapon; proficiency: number; onChange: (w: Weapon) => void }) {
  const set = (p: Partial<Weapon>) => onChange({ ...weapon, ...p });
  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold">{title}</p>
        <p className="text-xs text-muted">Competencia: tira {proficiency} dado{proficiency > 1 ? "s" : ""} de daño</p>
      </div>
      <input className="field" placeholder="Nombre" value={weapon.name} onChange={(e) => set({ name: e.target.value })} />
      <div className="grid grid-cols-3 gap-2">
        <select className="field" value={weapon.trait} onChange={(e) => set({ trait: e.target.value })} aria-label="Rasgo">
          <option value="">Rasgo</option>
          {TRAITS.map((t) => (
            <option key={t.key} value={t.label}>{t.label}</option>
          ))}
        </select>
        <select className="field" value={weapon.range} onChange={(e) => set({ range: e.target.value })} aria-label="Alcance">
          <option value="">Alcance</option>
          {RANGES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input className="field" placeholder="d8+1 phy" value={weapon.damage} onChange={(e) => set({ damage: e.target.value })} aria-label="Daño" />
      </div>
      <input className="field" placeholder="Rasgo del arma" value={weapon.feature} onChange={(e) => set({ feature: e.target.value })} />
    </div>
  );
}

const emptyCard = (domain = ""): DomainCard => ({ name: "", domain, level: 1, recall: 0, text: "", vault: false });

function DomainCards({ cards, classDomains, onChange }: { cards: DomainCard[]; classDomains?: [string, string]; onChange: (c: DomainCard[]) => void }) {
  const loadout = cards.filter((c) => !c.vault).length;
  return (
    <section className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="card-title mb-0">Cartas de dominio</h2>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${loadout > 5 ? "text-danger" : "text-muted"}`}>Equipadas: {loadout}/5</span>
          <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => onChange([...cards, emptyCard(classDomains?.[0])])}>
            <Plus size={14} /> Añadir carta
          </button>
        </div>
      </div>
      {cards.length === 0 ? (
        <p className="text-sm text-muted">Empiezas con 2 cartas de nivel 1 de los dominios de tu clase.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => {
            const set = (p: Partial<DomainCard>) => onChange(replaceAt(cards, i, { ...card, ...p }));
            return (
              <li key={i} className={`space-y-2 rounded-lg border p-3 ${card.vault ? "border-dashed border-line opacity-70" : "border-gold/50"}`}>
                <div className="flex gap-2">
                  <input className="field font-semibold" placeholder="Nombre de la carta" value={card.name} onChange={(e) => set({ name: e.target.value })} />
                  <IconButton label="Quitar carta" onClick={() => onChange(removeAt(cards, i))}>
                    <X size={16} />
                  </IconButton>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select className="field px-2" value={card.domain} onChange={(e) => set({ domain: e.target.value })} aria-label="Dominio">
                    <option value="">Dominio</option>
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                        {classDomains?.includes(d) ? " ★" : ""}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-muted">
                    Nv.
                    <input className="field px-2" type="number" min={1} max={10} value={card.level} onChange={(e) => set({ level: Number(e.target.value) })} />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-muted">
                    Rec.
                    <input className="field px-2" type="number" min={0} max={9} value={card.recall} onChange={(e) => set({ recall: Number(e.target.value) })} />
                  </label>
                </div>
                <textarea className="field text-sm" rows={3} placeholder="Efecto" value={card.text} onChange={(e) => set({ text: e.target.value })} />
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input type="checkbox" checked={card.vault} onChange={(e) => set({ vault: e.target.checked })} /> En la bóveda
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------- Campos genéricos ---------- */

function Select({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string | null;
  options: readonly string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const id = `sel-${label}`;
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="field" value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function NumberField({ label, value, onChange, big }: { label: string; value: number; onChange: (n: number) => void; big?: boolean }) {
  const id = `num-${label}`;
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`field text-center tabular-nums ${big ? "text-2xl font-bold" : ""}`}
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const id = `txt-${label}`;
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <textarea id={id} className="field" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="btn btn-ghost h-9 w-9 shrink-0 p-0" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function replaceAt<T>(list: T[], i: number, item: T) {
  return list.map((x, j) => (j === i ? item : x));
}

function removeAt<T>(list: T[], i: number) {
  return list.filter((_, j) => j !== i);
}
