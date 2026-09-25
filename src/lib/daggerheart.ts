// Datos básicos del SRD de Daggerheart (Darrington Press Community Gaming License).

export type TraitKey = "agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge";

export const TRAITS: { key: TraitKey; label: string; verbs: string }[] = [
  { key: "agility", label: "Agilidad", verbs: "Esprintar · Saltar · Maniobrar" },
  { key: "strength", label: "Fuerza", verbs: "Levantar · Golpear · Agarrar" },
  { key: "finesse", label: "Destreza", verbs: "Controlar · Esconderse · Trastear" },
  { key: "instinct", label: "Instinto", verbs: "Percibir · Sentir · Orientarse" },
  { key: "presence", label: "Presencia", verbs: "Encantar · Actuar · Engañar" },
  { key: "knowledge", label: "Conocimiento", verbs: "Recordar · Analizar · Comprender" },
];

/** Modificadores iniciales que se reparten entre los seis rasgos. */
export const STARTING_TRAIT_ARRAY = [2, 1, 1, 0, 0, -1];

export type ClassInfo = {
  name: string;
  domains: [string, string];
  evasion: number;
  hp: number;
  subclasses: [string, string];
};

export const CLASSES: ClassInfo[] = [
  { name: "Bard", domains: ["Grace", "Codex"], evasion: 10, hp: 5, subclasses: ["Troubadour", "Wordsmith"] },
  { name: "Druid", domains: ["Sage", "Arcana"], evasion: 10, hp: 6, subclasses: ["Warden of the Elements", "Warden of Renewal"] },
  { name: "Guardian", domains: ["Valor", "Blade"], evasion: 9, hp: 7, subclasses: ["Stalwart", "Vengeance"] },
  { name: "Ranger", domains: ["Bone", "Sage"], evasion: 12, hp: 6, subclasses: ["Beastbound", "Wayfinder"] },
  { name: "Rogue", domains: ["Midnight", "Grace"], evasion: 12, hp: 6, subclasses: ["Nightwalker", "Syndicate"] },
  { name: "Seraph", domains: ["Splendor", "Valor"], evasion: 9, hp: 7, subclasses: ["Divine Wielder", "Winged Sentinel"] },
  { name: "Sorcerer", domains: ["Arcana", "Midnight"], evasion: 10, hp: 6, subclasses: ["Elemental Origin", "Primal Origin"] },
  { name: "Warrior", domains: ["Blade", "Bone"], evasion: 11, hp: 6, subclasses: ["Call of the Brave", "Call of the Slayer"] },
  { name: "Wizard", domains: ["Codex", "Splendor"], evasion: 11, hp: 5, subclasses: ["School of Knowledge", "School of War"] },
];

export const DOMAINS = ["Arcana", "Blade", "Bone", "Codex", "Grace", "Midnight", "Sage", "Splendor", "Valor"];

export const ANCESTRIES = [
  "Clank", "Drakona", "Dwarf", "Elf", "Faerie", "Faun", "Firbolg", "Fungril", "Galapa",
  "Giant", "Goblin", "Halfling", "Human", "Infernis", "Katari", "Orc", "Ribbet", "Simiah",
];

export const COMMUNITIES = [
  "Highborne", "Loreborne", "Orderborne", "Ridgeborne", "Seaborne",
  "Slyborne", "Underborne", "Wanderborne", "Wildborne",
];

export type ArmorPreset = { name: string; score: number; major: number; severe: number; feature: string };

export const ARMOR_PRESETS: ArmorPreset[] = [
  { name: "Gambeson Armor", score: 3, major: 5, severe: 11, feature: "Flexible: +1 a Evasión" },
  { name: "Leather Armor", score: 3, major: 6, severe: 13, feature: "" },
  { name: "Chainmail Armor", score: 4, major: 7, severe: 15, feature: "Heavy: −1 a Evasión" },
  { name: "Full Plate Armor", score: 4, major: 8, severe: 17, feature: "Very Heavy: −2 a Evasión, −1 a Agilidad" },
];

export const RANGES = ["Melee", "Very Close", "Close", "Far", "Very Far"];

export const MAX_HOPE = 6;
export const BASE_STRESS = 6;

export type Weapon = { name: string; trait: string; range: string; damage: string; feature: string };
export type DomainCard = { name: string; domain: string; level: number; recall: number; text: string; vault: boolean };
export type Experience = { name: string; bonus: number };

export type Sheet = {
  pronouns: string;
  traits: Record<TraitKey, number>;
  evasion: number;
  proficiency: number;
  hp: { max: number; marked: number };
  stress: { max: number; marked: number };
  hope: number;
  armor: { name: string; score: number; major: number; severe: number; feature: string; marked: number };
  experiences: Experience[];
  weapons: { primary: Weapon; secondary: Weapon };
  inventory: string;
  gold: { handfuls: number; bags: number; chests: number };
  domainCards: DomainCard[];
  background: string;
  connections: string;
  notes: string;
};

export type Character = {
  id: string;
  user_id: string;
  name: string;
  class: string | null;
  subclass: string | null;
  ancestry: string | null;
  community: string | null;
  level: number;
  sheet: Partial<Sheet>;
  updated_at: string;
};

const emptyWeapon = (): Weapon => ({ name: "", trait: "", range: "", damage: "", feature: "" });

export function defaultSheet(): Sheet {
  return {
    pronouns: "",
    traits: { agility: 0, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0 },
    evasion: 10,
    proficiency: 1,
    hp: { max: 6, marked: 0 },
    stress: { max: BASE_STRESS, marked: 0 },
    hope: 2,
    armor: { name: "", score: 0, major: 0, severe: 0, feature: "", marked: 0 },
    experiences: [
      { name: "", bonus: 2 },
      { name: "", bonus: 2 },
    ],
    weapons: { primary: emptyWeapon(), secondary: emptyWeapon() },
    inventory: "",
    gold: { handfuls: 1, bags: 0, chests: 0 },
    domainCards: [],
    background: "",
    connections: "",
    notes: "",
  };
}

/** Mezcla la hoja guardada con los valores por defecto (por si faltan campos de versiones antiguas). */
export function normalizeSheet(saved: Partial<Sheet> | null | undefined): Sheet {
  const d = defaultSheet();
  const s = saved ?? {};
  return {
    ...d,
    ...s,
    traits: { ...d.traits, ...s.traits },
    hp: { ...d.hp, ...s.hp },
    stress: { ...d.stress, ...s.stress },
    armor: { ...d.armor, ...s.armor },
    gold: { ...d.gold, ...s.gold },
    weapons: {
      primary: { ...d.weapons.primary, ...s.weapons?.primary },
      secondary: { ...d.weapons.secondary, ...s.weapons?.secondary },
    },
    experiences: s.experiences ?? d.experiences,
    domainCards: s.domainCards ?? d.domainCards,
  };
}

export function classInfo(name: string | null | undefined) {
  return CLASSES.find((c) => c.name === name);
}

export function formatMod(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}
