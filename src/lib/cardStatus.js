// Registro de qué hace cada carta en la plataforma (solo lo ve el administrador en la sección Cartas).
// Cada entrada: sheet = hoja de personaje · hand = mano de la baraja · map = mapa de combate.
// Texto = función aplicada (qué hace); false = sin función. Las cartas que no están aquí salen como «sin registrar».
// Al habilitar una carta nueva, añade o actualiza su entrada.
const NO = false;
export const CARD_STATUS = {
  "Desatar el Caos": { sheet: "Fichas de caos y recarga con el descanso", hand: "Fichas (dados d10) y carta «Recargar fichas»", map: "Se apunta a un adversario, gasta fichas y lanza orbes de caos" },
  "Palabras Inspiradoras": { sheet: "Fichas según Presencia, se rellenan con el descanso largo", hand: "Fichas sobre la carta", map: "Se apunta a un aliado Cercano y da PV, Estrés o Esperanza" },
  "Embelesar": { sheet: "Marca de «una vez por descanso» para el Estrés extra", hand: "Carta auxiliar «Romper el embeleso»", map: "Tirada de conjuro, estado Embelesado e hilo rosa" },
  "Enredo Feroz": { sheet: "Tirada de conjuro desde la hoja", hand: "Cartas auxiliares «Inmovilizar» y «Liberar»", map: "Raíces, Inmovilizado e hilo de raíces" },
  "Guarda Rúnica": { sheet: "Amuleto imbuido guardado en la ficha", hand: "Indicador del amuleto sobre la carta", map: "Elegir portador y objeto; se usa al recibir un ataque" },
  "Lengua de la Naturaleza": { sheet: "Ventaja en tiradas de conjuro de la hoja", hand: "Se arrastra al mapa", map: "Se revela a la mesa (sin efecto de reglas)" },
  "Rastreador Dotado": { sheet: NO, hand: "Se arrastra al mapa", map: "Se revela a la mesa (sin efecto de reglas)" },
  "Caminar por Paredes": { sheet: NO, hand: "Se arrastra al mapa", map: "Se revela a la mesa (sin efecto de reglas)" },
  "Engañador Hábil": { sheet: NO, hand: "Se arrastra al mapa", map: "Gasta 1 Esperanza, revelación y onda dorada" },
  "Empujón Contundente": { sheet: NO, hand: "Se arrastra a un adversario", map: "Ataque con el arma principal, empuje a Cercano, +d6 y Vulnerable" },
  "Conjurar Enjambre": { sheet: "Escarabajos Blindados: marca de escarabajos en la ficha", hand: "Se arrastra al mapa y se elige el enjambre", map: "Escarabajos orbitando (bajan un umbral el próximo daño, con Esperanza se quedan) o Luciérnagas en Cercano con 2d8+3 y nube de luz" },
  "Puedes con esto": { sheet: NO, hand: NO, map: NO },
  "Todo es justo": { sheet: NO, hand: NO, map: NO },
  "Apoyo comunitario": { sheet: NO, hand: NO, map: NO },
  "Te cubro las espaldas": { sheet: NO, hand: NO, map: NO },
  "Tómate tu tiempo": { sheet: NO, hand: NO, map: NO },
  "Juntos en esto": { sheet: NO, hand: NO, map: NO },
  "Solo estamos empezando": { sheet: NO, hand: NO, map: NO },
  "Revigorizado": { sheet: NO, hand: NO, map: NO },
  "Huesos Desnudos": { sheet: "Armadura 3 + Fuerza y umbrales por rango sin armadura", hand: "Cartel «Pasiva» y halo activa/inactiva", map: NO },
  "Libro de Ava": { sheet: "Armadura de Tava suma +1 a la Armadura hasta el descanso", hand: "Se arrastra a una ficha y se elige el hechizo", map: "Empujón de Poder, Armadura de Tava y Pico de Hielo" },
  "Libro de Illiat": { sheet: "Descarga Arcana y Telepatía se reinician con el descanso", hand: "Se arrastra a una ficha; carta fugaz «Cortar la telepatía»", map: "Sopor (Dormido), Descarga Arcana y Telepatía (hilo)" },
  "Libro de Tyfar": { sheet: NO, hand: "Se arrastra a una ficha y se elige el hechizo", map: "Llama Salvaje, Mano Mágica (ficha rombo) y Niebla Misteriosa (zona)" },
};
const KIND_STATUS = {
  arma: { sheet: "Casilla de arma, tiradas y daño", hand: "Carta de arma en la mano", map: "Ataque con alcance, daño y efectos" },
  armadura: { sheet: "Casilla de armadura, puntuación y umbrales", hand: NO, map: NO },
};
export function cardStatus(c) {
  const e = CARD_STATUS[c.key] || KIND_STATUS[c.kind];
  if (!e) return { registered: false, sheet: NO, hand: NO, map: NO };
  return { registered: true, ...e };
}
export const isAdminName = (name) => (name || "").toLowerCase() === "mickey";
