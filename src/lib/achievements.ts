// Logros del jugador. Cada logro se desbloquea cuando un contador de su cuenta llega a la meta.
// Para añadir o cambiar logros basta con editar esta lista; la interfaz se genera a partir de ella.
export type Tier = "bronce" | "plata" | "oro" | "legendario";
export type Stat = "crit" | "chars" | "campsStarted" | "campsJoined" | "maxLevel" | "fearStreak";
export type Cat = "Dados" | "Campañas" | "Personaje";
export const CATS: Cat[] = ["Dados", "Campañas", "Personaje"];
export type Achievement = { id: string; name: string; desc: string; icon: string; tier: Tier; cat: Cat; stat: Stat; goal: number };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "char1", name: "Nace una leyenda", desc: "Crea tu primer personaje.", icon: "corazon", tier: "bronce", cat: "Personaje", stat: "chars", goal: 1 },
  { id: "camp1", name: "Anfitrión", desc: "Empieza tu primera campaña.", icon: "libro", tier: "bronce", cat: "Campañas", stat: "campsStarted", goal: 1 },
  { id: "join1", name: "Compañero de mesa", desc: "Únete a la campaña de otra persona.", icon: "espadas", tier: "bronce", cat: "Campañas", stat: "campsJoined", goal: 1 },
  { id: "crit1", name: "Corazón de dragón", desc: "Saca tu primer éxito crítico.", icon: "dado", tier: "bronce", cat: "Dados", stat: "crit", goal: 1 },
  { id: "crit10", name: "Suerte de héroe", desc: "Saca 10 éxitos críticos.", icon: "estrella", tier: "oro", cat: "Dados", stat: "crit", goal: 10 },
  { id: "lvl5", name: "Veterano", desc: "Lleva a un personaje al nivel 5.", icon: "estandarte", tier: "plata", cat: "Personaje", stat: "maxLevel", goal: 5 },
  { id: "lvl10", name: "Leyenda viva", desc: "Lleva a un personaje al nivel 10, lo más alto que se puede llegar.", icon: "corona", tier: "legendario", cat: "Personaje", stat: "maxLevel", goal: 10 },
  { id: "fear3", name: "Mala racha", desc: "Saca Miedo tres veces seguidas en tus tiradas. El DJ te lo agradece.", icon: "calavera", tier: "plata", cat: "Dados", stat: "fearStreak", goal: 3 },
];

export type AchState = { stats: Partial<Record<Stat, number>>; unlocked: Record<string, number> };
export const EMPTY_ACH: AchState = { stats: {}, unlocked: {} };
