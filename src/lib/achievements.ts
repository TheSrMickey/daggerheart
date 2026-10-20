// Logros del jugador. Cada logro se desbloquea cuando un contador de su cuenta llega a la meta.
// Para añadir o cambiar logros basta con editar esta lista; la interfaz se genera a partir de ella.
export type Tier = "bronce" | "plata" | "oro" | "legendario";
export type Stat = "crit" | "chars" | "campsStarted" | "campsJoined" | "maxLevel" | "worldMaps" | "seasons";
export type Achievement = { id: string; name: string; desc: string; icon: string; tier: Tier; stat: Stat; goal: number };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "char1", name: "Nace una leyenda", desc: "Crea tu primer personaje.", icon: "corazon", tier: "bronce", stat: "chars", goal: 1 },
  { id: "camp1", name: "Anfitrión", desc: "Empieza tu primera campaña.", icon: "libro", tier: "bronce", stat: "campsStarted", goal: 1 },
  { id: "join1", name: "Compañero de mesa", desc: "Únete a la campaña de otra persona.", icon: "espadas", tier: "bronce", stat: "campsJoined", goal: 1 },
  { id: "crit1", name: "Corazón de dragón", desc: "Saca tu primer éxito crítico.", icon: "dado", tier: "bronce", stat: "crit", goal: 1 },
  { id: "crit10", name: "Suerte de héroe", desc: "Saca 10 éxitos críticos.", icon: "estrella", tier: "oro", stat: "crit", goal: 10 },
  { id: "lvl5", name: "Veterano", desc: "Lleva a un personaje al nivel 5.", icon: "corona", tier: "plata", stat: "maxLevel", goal: 5 },
  { id: "map1", name: "Cartógrafo", desc: "Sube el mapa de mundo de una campaña.", icon: "mapa", tier: "plata", stat: "worldMaps", goal: 1 },
  { id: "seasons4", name: "Cuatro estaciones", desc: "Dibuja el mapa de mundo en primavera, verano, otoño e invierno.", icon: "estaciones", tier: "legendario", stat: "seasons", goal: 4 },
];

export type AchState = { stats: Partial<Record<Stat, number>>; unlocked: Record<string, number> };
export const EMPTY_ACH: AchState = { stats: {}, unlocked: {} };
