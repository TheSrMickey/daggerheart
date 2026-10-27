// Logros del jugador. Cada logro se desbloquea cuando un contador de su cuenta llega a la meta.
// Para añadir o cambiar logros basta con editar esta lista; la interfaz se genera a partir de ella.
export type Tier = "bronce" | "plata" | "oro" | "legendario";
export type Stat = "crit" | "chars" | "campsStarted" | "campsJoined" | "maxLevel" | "fearStreak" | "founder" | "medals";
export type Cat = "Dados" | "Campañas" | "Personaje" | "Especial";
export const CATS: Cat[] = ["Dados", "Campañas", "Personaje", "Especial"];
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
  { id: "medal1", name: "Reconocido", desc: "Recibe tu primera medalla de sesión del DJ.", icon: "estrella", tier: "bronce", cat: "Campañas", stat: "medals", goal: 1 },
  { id: "medal10", name: "Estrella de la mesa", desc: "Recibe 10 medallas de sesión.", icon: "corona", tier: "oro", cat: "Campañas", stat: "medals", goal: 10 },
  // Para quienes estuvieron en la versión 1.0. De momento no hay forma de conseguirlo: ya veremos cómo se concede.
  { id: "founder", name: "Desde los comienzos", desc: "Estuviste en Enaris desde la versión 1.0 de la plataforma.", icon: "amanecer", tier: "legendario", cat: "Especial", stat: "founder", goal: 1 },
];

// Solo para pruebas: cuentas (en minúsculas) a las que se les concede un logro de cada rareza al entrar. Quitar al terminar.
export const TEST_GRANTS: Record<string, string[]> = {
  mickey: ["crit1", "lvl5", "crit10", "founder"], // bronce, plata, oro y legendario
};

export type AchState = { stats: Partial<Record<Stat, number>>; unlocked: Record<string, number> };
export const EMPTY_ACH: AchState = { stats: {}, unlocked: {} };
