// Aventura de inicio de Daggerheart: «The Wish Thief» (Rob Hebert, Darrington Press 2026), adaptada y resumida al castellano.
// buildWishThief() devuelve lo mismo que buildSablewood(): escenas por acto, pistas (ocultas hasta que el DJ las entregue),
// reparto con sus estadísticas, conversaciones, notas de cada acto para el DJ y mapas con las cuentas atrás ya creadas.

const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const scene = (key) => "/escenas/" + key + ".svg";

// Estadísticas en el formato del tablero.
const foeStats = (o) => ({ tier: 1, hpMarked: 0, stressMarked: 0, exp: "", motives: "", ...o });

const STABITHA = foeStats({
  base: "Stabitha Pluma Oscura: ladrona de deseos",
  type: "Estándar",
  desc: "Maestra ladrona que se hace pasar por una noble. Su glamour imita a otras personas.",
  motives: "Escapar, esquivar, confundir, esconderse, desviar la atención",
  exp: "Embaucadora +4",
  difficulty: 14,
  thresholds: [8, 16],
  hp: 5,
  stress: 4,
  atk: 3,
  attack: { name: "Estilete", range: "Cuerpo a cuerpo", damage: "1d8+5", type: "fís" },
  features: [
    { name: "Manos rápidas", kind: "Acción", text: "Ataca a un objetivo en Cuerpo a cuerpo. Si acierta, inflige 1d8+2 de daño físico y roba un objeto o consumible de su inventario." },
    { name: "Deslumbrar", kind: "Acción", text: "Marca un Estrés para crear un estallido de luz y sonido en cualquier punto. Quien esté a alcance Muy cercano de ese punto hace una tirada de reacción de Instinto (13) o marca 1d4 de Estrés." },
    { name: "La gran revelación", kind: "Reacción", text: "Cuando marca su último PV, sustitúyela por su forma Vespid y dale el foco de inmediato." },
  ],
});
const VESPID = foeStats({
  base: "Stabitha Pluma Oscura: Vespid",
  type: "Solitario",
  desc: "Una faérica alta con rasgos de avispón y alas de insecto: su verdadera forma.",
  motives: "Envenenar, atrapar",
  exp: "Embaucadora +4, Volar +5",
  difficulty: 15,
  thresholds: [8, 16],
  hp: 9,
  stress: 3,
  atk: 5,
  attack: { name: "Ballesta de repetición", range: "Lejano", damage: "1d20+5", type: "mág" },
  features: [
    { name: "Implacable (2)", kind: "Pasiva", text: "Puede recibir el foco hasta dos veces por turno del DJ. Gasta Miedo como siempre para darle el foco." },
    { name: "Impulso", kind: "Pasiva", text: "Cuando acierta un ataque contra un PJ, ganas 1 Miedo." },
    { name: "Punta envenenada", kind: "Pasiva", text: "Cuando daña a un PJ, este también marca 1 Estrés." },
    { name: "Ráfaga rápida", kind: "Acción", text: "Marca un Estrés para atacar a todos los objetivos frente a ella a alcance Lejano. A los que acierte: 1d8+7 de daño físico." },
    { name: "Réplica punzante", kind: "Reacción", text: "Cuando recibe daño de un ataque en Cuerpo a cuerpo, puedes gastar un Miedo: el atacante hace una tirada de reacción de Agilidad o recibe 1d10+2 de daño físico." },
  ],
});
const ARCANIST = foeStats({
  base: "Arcanista Pluma Oscura",
  type: "A distancia",
  desc: "Un mago curtido que teje luz y sombra en destrucción mágica.",
  motives: "Cegar y atar, acumular poder mágico",
  exp: "Magia +3",
  difficulty: 13,
  thresholds: [5, 10],
  hp: 3,
  stress: 3,
  atk: 1,
  attack: { name: "Bastón del eclipse", range: "Lejano", damage: "1d10+6", type: "mág" },
  features: [
    { name: "Paso del vacío", kind: "Pasiva", text: "Antes o después de un ataque normal, puede marcar un Estrés para teletransportarse a un punto a alcance Lejano." },
    { name: "Lluvia de rayos", kind: "Acción", text: "Gasta un Miedo: todos los objetivos de la escena hacen una tirada de reacción de Presencia. Los que fallan reciben 1d12+2 de daño mágico; los que aciertan, la mitad." },
    { name: "Escudo de sombras", kind: "Reacción", text: "Si recibe daño de un ataque a alcance Cercano, inflige 1d6+2 de daño mágico al atacante y pon una ficha en esta ficha. No puede repetirse hasta que gaste una acción en quitarla." },
  ],
});
const ASSASSIN = foeStats({
  base: "Asesino Pluma Oscura",
  type: "Sigiloso",
  desc: "Un canalla astuto, experto en venenos y emboscadas.",
  motives: "Estorbar, desviar la atención, golpear desde las sombras",
  exp: "Magia +3",
  difficulty: 13,
  thresholds: [4, 9],
  hp: 3,
  stress: 3,
  atk: 3,
  attack: { name: "Dagas arrojadizas", range: "Cercano", damage: "1d8+3", type: "fís" },
  features: [
    { name: "Veneno Pluma Oscura", kind: "Pasiva", text: "Quien marque PV por su ataque queda Vulnerable hasta que despeje un PV." },
    { name: "Desde la nada", kind: "Pasiva", text: "Tiene ventaja en los ataques mientras está Oculto." },
    { name: "Bomba de humo", kind: "Acción", text: "Lanza una bomba de humo hasta alcance Lejano: llena de humo un área Cercana y deja Aturdidos a todos dentro (desventaja en sus tiradas hasta que gasten una Esperanza). El Asesino está Oculto mientras esté en el humo." },
  ],
});

const foe = (name, x, y, stats, size) => ({ id: uid("t"), kind: "foe", name, x, y, stats: { ...stats }, ...(size ? { size } : {}) });
const npc = (name, x, y, extra = {}) => ({ id: uid("t"), kind: "npc", name, x, y, ...extra });

// Los doce nobles de la ceremonia: [nombre, descripción, conexión, motivación, secreto, indicio]
const NOBLES = [
  ["Baronesa Ilryelle", "Inmóvil como una estatua, lo observa todo con una mirada fría y fija.", "Informante de la corona que sabe demasiado para fiarse del todo.", "Demostrar su valía como agente ante Parson Redstring.", "En realidad trabaja para una ciudad rival.", "Restos en los dedos de un polvo minado en la ciudad rival, usado como componente mágico."],
  ["Conde Vesparo", "Elegante, sereno y coqueto: esquiva las preguntas con encanto y humor.", "Diplomático de lealtad dudosa que negocia acuerdos comerciales para la corona.", "Averiguar qué otros nobles podrían convertirse en aliados valiosos.", "Conoce una nueva ruta comercial que está a punto de abrirse.", "Un hilo igual que su ropa, hallado en la tarima."],
  ["Duquesa Morraine", "Se desliza por la sala como un ramo de flores vivo, con una nube de perfume tras ella.", "Antigua rival amorosa de la reina Lirica.", "Casarse con riqueza y poder.", "Odia a Gerdi sin motivo.", "Parson Redstring olió su perfume durante el apagón."],
  ["Duque Renshar", "Orco ancho de hombros y rojo de cara, huele a vino especiado.", "Aliado de batalla del rey Terloc que siente que su aportación se ha olvidado en tiempos de paz.", "Reavivar el gusto del rey por la conquista.", "Mantiene una aventura con otro de los presentes.", "Desprende calor, como si hiciera un esfuerzo supremo."],
  ["Lady Brindlethwaite", "Noble goblin nerviosa cuya risa fuera de lugar corta las conversaciones.", "Prima lejana del rey Terloc, noble de sangre pero sin poder.", "Conseguir que el resto de la corte la tome en serio.", "Acaba de descubrir que no tiene ningún parentesco con el rey.", "Intenta escabullirse sin que la vean."],
  ["Lady Solveng", "Despistada y desordenada, suele dejar las frases a medias.", "Amiga de la infancia de la reina Lirica, que adora a Gerdi.", "Solo celebrar el cumpleaños de Gerdi.", "Su memoria se está desvaneciendo.", "No recuerda dónde estaba justo antes ni durante el apagón."],
  ["Lady Vanthella", "Skykin imponente envuelta en capas de terciopelo negro, con el rostro medio oculto tras un velo de encaje.", "Confidente de siempre de la reina Lirica, apartada en silencio desde el nacimiento de Gerdi.", "Volver al círculo íntimo de la reina.", "Mantiene su aspecto joven con un anillo mágico.", "Un leve brillo mágico se le pega a la piel."],
  ["Lord Arcturus", "Viste ropa de una tela que ningún otro noble lleva.", "Recién llegado a la corte desde una tierra lejana.", "Tejer relaciones con los nobles más asentados.", "Tiene un derecho legítimo al trono de Bankburgh.", "Lleva una hoja envenenada escondida en la manga."],
  ["Lord Fenrick", "Noble de lengua afilada que regaña a quien le parece poco inteligente.", "Se encarga de las negociaciones delicadas con gobernantes extranjeros en nombre de la corona.", "Tratar asuntos de Estado urgentes con el rey y la reina.", "Se queda de forma habitual con dinero de las arcas de la ciudad.", "Un desgarro casi imperceptible en el guante, como si se hubiera enganchado con algo punzante."],
  ["Lord Kettlewright", "Empapado en sudor aunque el salón es fresco, se seca la frente sin parar con un pañuelo de seda.", "Financiero de las infraestructuras de Bankburgh, cuya fortuna se ha torcido hace poco.", "Conseguir protección real frente a la bancarrota.", "Debe una fortuna al sindicato del crimen local.", "Va sin una sola joya, algo impropio de él."],
  ["Príncipe Halvek", "Gnomo joven, impecablemente vestido e inmensamente aburrido, que desprecia a todos.", "Posible pretendiente futuro de Gerdi, dentro de muchísimos años.", "Sus padres le obligaron a venir.", "Cambió el regalo que debía entregar por otro.", "Estaba en un sitio distinto antes y después del apagón."],
  ["Sir Caldus Cummerbund", "Un clank seco y formal, hecho de mármol y acero.", "Capitán de la guardia ceremonial y jefe de seguridad en los actos de Estado.", "Mantener el orden, la seguridad y el protocolo.", "La noche anterior se pasó de fiesta y no siguió el protocolo.", "No lleva puesta su insignia."],
];

export function buildWishThief() {
  const campId = "camp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const S = { city: uid("s"), gifts: uid("s"), lock: uid("s"), chase: uid("s"), docks: uid("s"), end: uid("s") };
  const C = {
    gerdi: uid("c"), terloc: uid("c"), lirica: uid("c"), redstring: uid("c"), stabitha: uid("c"),
    nobles: NOBLES.map(() => uid("c")),
  };
  const line = (castId, text, expr = "tranquila") => ({ id: uid("l"), castId, expr, text });

  const campaign = {
    id: campId,
    name: "La ladrona de deseos",
    description: "Aventura de inicio de nivel 1 para 3-5 jugadores (The Wish Thief, de Rob Hebert). En la ciudad de Bankburgh se celebra el primer cumpleaños de la princesa Gerdi, pero una tiara que concede un deseo desaparece en pleno salón de ceremonias: investigación social, persecución por las calles de la fiesta y un combate final en el puerto.",
    characterIds: [],
  };

  const extra = (title, key, fx) => ({ id: uid("s"), title, image: scene(key), ...(fx ? { fx } : {}) });
  const scenes = [
    { id: S.city, title: "Acto 1 · Una ciudad en fiesta", image: scene("ciudad"), extras: [extra("El palacio al fondo", "castillo")] },
    { id: S.gifts, title: "Acto 2 · La ceremonia de los regalos", image: scene("castillo"), extras: [extra("La entrega de la tiara", "castillo", ["gold"])] },
    { id: S.lock, title: "Acto 3 · Cierre del salón", image: scene("castillo"), extras: [extra("La vidriera rota", "castillo", ["rays"])] },
    { id: S.chase, title: "Acto 4 · Persecución por Bankburgh", image: scene("ciudad"), extras: [extra("Anochece en el festival", "ciudad", ["gold"])] },
    { id: S.docks, title: "Acto 5 · Enfrentamiento en el puerto", image: scene("puerto"), extras: [extra("La Vespid", "puerto", ["purple"])] },
    { id: S.end, title: "Acto 6 · Recompensa", image: scene("castillo") },
  ];

  const handout = (sceneId, title, text, hidden = true, kind = "nota") => ({ id: uid("h"), kind, sceneId, title, image: "", text, ts: Date.now(), ...(hidden ? { hidden: true } : {}) });
  const handouts = [
    handout(S.city, "El encargo de Parson Redstring", "Llevad la tiara de platino, regalo de los reyes de Bankburgh, hasta el palacio antes de que empiece la ceremonia de los regalos. Se os confía a vosotros: no la perdáis de vista. — Parson Redstring, consejero real", false, "objeto"),
    handout(S.gifts, "La tiara de la estrella caída", "Una delicada tiara de platino cuyos arcos sujetan una única gema tallada del corazón de una estrella fugaz. La luz se curva dentro de ella. Irá reuniendo poder con los años y, el día que Gerdi tome la corona, le concederá un deseo.", true, "objeto"),
    handout(S.gifts, "El salón y la barrera mágica", "Una barrera invisible une las columnas de runas iridiscentes: los efectos de los hechizos no cruzan del pasillo central a las galerías laterales, ni al revés. Es como un cristal insonorizado: se puede hablar, pero no se oye al otro lado. Por eso solo los nobles del centro son sospechosos.", true),
    ...NOBLES.map(([name, , , motive, secret, clue]) => handout(S.lock, name + " · indicio", "Motivación: " + motive + "\nSecreto: " + secret + "\nIndicio: " + clue)),
    handout(S.chase, "Un reguero de brillo", "Allí por donde pasa la ladrona queda un rastro de aura ilusoria que se emborrona. Se mueve como si volara y trepara por las paredes como un insecto.", true),
    handout(S.docks, "La tiara brilla con la luz de las estrellas", "Al caer la noche, la gema de la tiara se carga de energía estelar y envuelve a quien la lleva en un aura de buena suerte.", true, "objeto"),
    handout(S.end, "Las recompensas del rey y la reina", "Podéis pedir: una propiedad en Bankburgh (base de operaciones), un puesto en la corte, un botín (quizá uno de los regalos de Gerdi) u oro, mucho oro.", true),
  ];

  const stage = { live: "escena", scenes, activeSceneId: null, scene: { title: "", image: "", fx: [] }, handouts };

  const cast = [
    { id: C.gerdi, name: "La princesa Gerdi", imgs: {}, kind: "Aliado", role: "La cumpleañera" },
    { id: C.terloc, name: "El rey Terloc", imgs: {}, kind: "Aliado", role: "Rey de Bankburgh, padre de Gerdi" },
    { id: C.lirica, name: "La reina Lirica", imgs: {}, kind: "Aliado", role: "Reina de Bankburgh, madre de Gerdi" },
    { id: C.redstring, name: "Parson Redstring", imgs: {}, kind: "Aliado", role: "Consejero real" },
    { id: C.stabitha, name: "Stabitha Pluma Oscura", imgs: {}, kind: "Enemigo", role: "La ladrona de deseos", stats: { ...STABITHA } },
    { id: uid("c"), name: "Stabitha Pluma Oscura: Vespid", imgs: {}, kind: "Enemigo", role: "Forma verdadera de la ladrona", stats: { ...VESPID } },
    ...NOBLES.map(([name, , conn], i) => ({ id: C.nobles[i], name, imgs: {}, kind: "Neutral", role: conn })),
  ];

  const convs = [
    {
      id: uid("v"), sceneId: S.city, title: "Llegada al salón",
      lines: [
        line(C.redstring, "Lo dejáis todo para el último momento, ¿eh? Venid, venid, antes de que se den cuenta.", "enfadada"),
        line(C.redstring, "La tiara, por favor. La reina la presentará cuando llegue el momento. Y que nadie diga que no llegasteis a tiempo."),
      ],
    },
    {
      id: uid("v"), sceneId: S.gifts, title: "La tiara de la estrella",
      lines: [
        line(C.terloc, "Esta gema fue tallada del corazón de una estrella fugaz.", "feliz"),
        line(C.lirica, "Con los años reunirá poder. Y el día que lleves la corona, hija mía, te concederá un deseo."),
        line(C.redstring, "Majestades."),
      ],
    },
    {
      id: uid("v"), sceneId: S.lock, title: "El apagón y el cierre del salón",
      lines: [
        line(C.redstring, "Este crimen exigió un momento y una posición exactos. Quien conjuró esa oscuridad estaba en el centro de la ceremonia.", "enfadada"),
        line(C.redstring, "Vosotros trajisteis la tiara: sois los únicos por encima de toda sospecha. Encontrad al culpable sin provocar una crisis política."),
        line(C.redstring, "Creo que vais por buen camino… ¿Qué os sugieren estas contradicciones? ¡Deprisa, amigos míos, el tiempo no está de nuestra parte!"),
      ],
    },
    {
      id: uid("v"), sceneId: S.docks, title: "La ladrona derrotada",
      lines: [
        line(C.stabitha, "Mmm, bien jugado. Esperaba algo menos… tenaz.", "feliz"),
        line(C.stabitha, "A mí me contrataron. Alguien a quien nunca he visto reúne artefactos poderosos de toda la región. Para qué, no lo sé; nada bueno."),
        line(C.stabitha, "La noble a la que suplanté está viva, algo incómoda en algún trastero. No soy una asesina… de nobles."),
      ],
    },
    {
      id: uid("v"), sceneId: S.end, title: "Recompensa",
      lines: [
        line(C.terloc, "Habéis prestado un gran servicio a este reino. Pedid lo que queráis: oro, tierras, un título… o un favor pendiente.", "feliz"),
        line(C.lirica, "Habéis devuelto más que un regalo: habéis protegido nuestro futuro. Siempre seréis bienvenidos en Bankburgh."),
      ],
    },
  ];

  const encounters = [
    {
      id: uid("e"),
      sceneId: S.city,
      name: "Acto 1 · Una ciudad en fiesta",
      notes:
        "Lee: Bankburgh se alza entre colores y ruido: estandartes en las torres, farolillos con guirnaldas flotando en el aire, música que se mezcla en oleadas, artistas, mercaderes y juerguistas en cada avenida. En el centro, el castillo real. Y vosotros… llegáis tarde.\n\nPregunta a la mesa: ¿por qué llegáis tarde y a quién culpáis? ¿Por qué os eligió Redstring para llevar la tiara de platino (el regalo de los reyes)? ¿Cómo la guardáis durante el viaje?\n\nLa carrera hasta el palacio (acción de grupo con «iniciativa palomita»):\n1. Elige a un jugador que empieza y hazle una pregunta de ambientación (qué recurso o poder sostiene la prosperidad de la ciudad, cómo presume de su riqueza, qué suceso histórico la define, qué tradición única tiene, qué peligro se esconde bajo su prosperidad).\n2. Tras responder, ese jugador describe un obstáculo del camino y elige a otro jugador, que lo supera con una tirada de reacción (12). Cada uno responde una pregunta distinta, describe un obstáculo y elige a otro.\n3. Si a alguien le cuesta, que tire el dado de Miedo (d12) y usa la tabla: 1 arrollados por el desfile · 2 ¡los fuegos artificiales estallan! · 3 seducidos por el ritmo · 4 disputa de carritos de comida · 5 choque de carruajes · 6 magia callejera descontrolada · 7 tormenta de purpurina · 8 desafío a un juego de… habilidad · 9 bestia suelta · 10 plataformas de observación inestables · 11 barcaza de fiesta desbocada · 12 bromistas juveniles.\n\nVaría los rasgos de las tiradas: Fuerza para abrirse paso entre la multitud, Finura para colarse entre carrozas, Presencia para engañar a un control de la guardia, Conocimiento para recordar un atajo.\n\nCuando todos hayan jugado, el primer jugador hace la última tirada con Dificultad 13: +1 por cada PJ que acertó su reacción y −1 por cada PJ que falló.\n• Éxito: llegan justo a tiempo; Redstring los recibe en la puerta (conversación «Llegada al salón»).\n• Fallo: abren las puertas con un chirrido en plena invocación y todos los miran. Cada PJ marca 2 Estrés por la vergüenza.\n\nSigue con el Acto 2.",
    },
    {
      id: uid("e"),
      sceneId: S.gifts,
      name: "Acto 2 · La ceremonia de los regalos",
      notes:
        "El gran salón: rectangular, con las puertas en un extremo y la tarima de los tronos en el otro. A los lados hay galerías separadas del pasillo central por columnatas de mármol con runas iridiscentes: una barrera mágica que impide que los efectos de los hechizos crucen del pasillo a las galerías (y al revés). Funciona como un cristal insonorizado. Es lo que limita a los sospechosos de la investigación. Cualquier PJ con rasgo de Lanzamiento que inspeccione las runas lo entiende (pista «El salón y la barrera mágica»).\n\nSi llegaron antes de empezar, Redstring llama a los invitados al orden con una invocación breve. Si llegaron tarde, los fulmina con la mirada y reanuda.\n\nCrear los regalos y los nobles (clave para la investigación):\n1. Reparte al azar una tarjeta de regalo a cada jugador (es sutilmente peligroso · vivo o reactivo · extraño o sospechoso · pensado para impresionar · profundamente significativo · de motivación política · ridículamente caro · insultante o descortés). Cada uno decide qué es.\n2. Mientras escriben, baraja las doce tarjetas de nobles (están en el reparto y en las pistas del Acto 3). Para cada regalo, revela un noble y responde en grupo: ¿por qué lo eligió? ¿qué mensaje tiene? ¿cómo reacciona el público? ¿por qué hace reír o llorar a Gerdi?\n3. Necesitas cinco o seis nobles. Con tres PJ, cada uno rellena dos tarjetas; con cuatro, tú rellenas una.\n\nAnota quién da qué: lo usarás en el Acto 3. Los nobles están en el pasillo central; el resto (criados, soldados) mira desde las galerías. Describe la reacción de la corte: aplausos corteses, silencios incómodos, cuchicheos, envidia.\n\nEjemplos de regalos: caja de música con una melodía desconocida, orbe de cristal con niebla, talismán con runas, peluche que obedece órdenes, botella con luz de tormenta, cuento que se escribe solo, pajarito mecánico, anillo de hueso pulido, máscara de rostro cambiante, sonajero de plata, semilla en ámbar, tapiz mágico.\n\nÚltimo regalo: Redstring pide la tiara y la pone en un estuche con joyas para la reina. Termina con la conversación «La tiara de la estrella»: el rey (hazle una voz graciosa) dice que la gema se talló del corazón de una estrella fugaz, y la reina (otra voz graciosa) que le concederá un deseo cuando tome la corona. Redstring alza la tiara hacia la cabeza de Gerdi, que ríe… y la luz se apaga. Silencio total un latido. Vuelven luz y sonido: las manos de Redstring están vacías, el estuche abierto, la tiara ha desaparecido.\n\nLo que ocurre: Stabitha Pluma Oscura, disfrazada de uno de los nobles, creó la oscuridad mágica y robó la tiara. Planeaba salir con ella escondida en el caos, pero los reyes cerraron el salón y ahora decide ocultarse a plena vista.",
    },
    {
      id: uid("e"),
      sceneId: S.lock,
      name: "Acto 3 · Cierre del salón",
      notes:
        "Lee: los reyes ordenan sellar el salón. Los plebeyos callan y los nobles protestan. Los guardias registran a criados, artistas y asistentes; uno a uno quedan descartados. Redstring habla: la barrera mágica rodea esta parte del salón; quien conjuró la oscuridad estaba en el centro de la ceremonia. Nadie lo dice, pero el ladrón sigue aquí y es uno de los invitados de honor. Redstring os pide discreción: «Vosotros traísteis la tiara, así que estáis por encima de toda sospecha. Encontrad al culpable sin provocar una crisis política».\n\nPregunta: ¿a quién queréis interrogar primero? Sé claro con la mesa: el ladrón es uno de los nobles que dieron un regalo a Gerdi. Da pistas solo sobre nobles; usa a otros PNJ para apoyar o confirmar sospechas, no para confundir; si fijan la atención en criados, resuélvelo rápido y redirige.\n\nCuenta atrás de la investigación (mapa «Acto 3 · Investigación»): empieza en 1 + nº de jugadores (con cuatro, 5). Baja 1 con cada tirada fallida. Cuando llegue a 0, la ladrona actúa.\n\nEl culpable cuántico: no elijas al ladrón de antemano. Es el primer sospechoso al que el grupo se comprometa con pruebas reales. Reparte la sospecha, refuerza sus teorías y alinea discretamente las pistas con su conclusión. No introduzcas pistas falsas: ellos ya aportarán las suyas. Si sospechan de alguien fuera de los nobles (como Redstring), añádelo con una tarjeta en blanco.\n\nBucle de juego: 1) ¿qué quieren hacer? (interrogar, escrutar la sala, examinar pruebas, usar magia). 2) Aclara qué aprenden y qué arriesgan. 3) Tirada de acción, Dificultad 14 por defecto. 4) En un éxito, da una respuesta clara o una pista sólida; en un fallo, información parcial o ambigua y baja la cuenta atrás. 5) Repite.\n\nA medida que avanza, los nobles se impacientan, se acusan entre sí y piden salir; la fe de Redstring o de la familia real puede flaquear. Usa a Redstring para reorientar (conversación «El apagón y el cierre del salón»). No resuelvas el misterio por ellos.\n\nSecretos, motivaciones e indicios: están en las pistas ocultas de este acto, una por noble. Entrégalas según lo que investiguen.\n\nRevelación y huida:\n• Si acusan a alguien con pruebas fiables antes de que la cuenta atrás llegue a 0, Stabitha admite el engaño («Lista… pero no tanto») y su forma se emborrona como pintura bajo la lluvia. Un estallido de luz y sonido llena el salón: cada PJ hace una tirada de reacción de Instinto (11) y marca 1 Estrés si falla. Cuando se pasa el aturdimiento, ha huido por una vidriera rota. Al mirar la ventana la ven correr por el jardín del palacio.\n• Si la cuenta atrás llega a 0 antes, una espectadora grita: uno de los sospechosos se está derritiendo, pierde el control de su glamour y busca una salida. Un estallido de luz: tirada de reacción de Instinto (14), 1d4 de Estrés si falla. Cuando pasa, ha huido por una vidriera rota; la ven trepando el muro exterior del jardín.\n\nPasa a la acción física: Acto 4.",
    },
    {
      id: uid("e"),
      sceneId: S.chase,
      name: "Acto 4 · Persecución por Bankburgh",
      notes:
        "El sol se pone sobre el festival. Stabitha mantiene su glamour a medias: su aura ilusoria se emborrona y deja rastro, y se mueve como si volara y trepara paredes como un insecto.\n\nEntorno «Persecución por Bankburgh» (Evento, nivel 1, Dificultad 12). Impulsos: desorientar y distraer, ganar distancia, marear al grupo. Adversarios posibles: Guardia de la ciudad (arquero, guardia con espada), maleantes (bandido de cuchillo dentado, secuaz), juerguistas (cortesano, mercader barón, noble menor, ladrón enmascarado).\n\nCuentas atrás dinámicas (mapa «Acto 4 · Persecución»): Progreso (8) y Consecuencia (5). Si identificaron a la ladrona antes de que acabara la investigación, baja el Progreso 2.\n\nTabla de resultados de cada tirada: fallo con Miedo → no avanza y la Consecuencia baja 3 · fallo con Esperanza → no avanza, Consecuencia 2 · éxito con Miedo → Progreso baja 1 y Consecuencia 1 · éxito con Esperanza → Progreso baja 2 · éxito crítico → Progreso baja 3.\n\nRasgos del entorno:\n• La partida ha comenzado (Pasiva): ¿la ladrona confía más en el sigilo, la velocidad o la acrobacia? ¿hacia qué parte de la ciudad va?\n• Oleada de gente (Acción, 1 Miedo): la marea de festejantes separa a un PJ del grupo. ¿Adónde va la gente? ¿cómo se reorienta?\n• Escondida a plena vista (Acción, 1 Miedo): la ladrona se disfraza de un transeúnte cualquiera. El PJ más cercano hace una tirada de reacción de Instinto para verla o la Consecuencia baja 1. ¿De quién se disfraza? ¿cómo se delata en la prisa?\n\nDescribe cómo ha cambiado el festival al caer la noche: ¿cambia el ánimo de la multitud? ¿qué eventos, festivos o no, esperan al anochecer?\n\nFin de la persecución cuando una o ambas cuentas atrás se agoten:\n• Si la Consecuencia llega a 0 primero, la ladrona llega al puerto y prepara una trampa: gana 2 Miedo y da el foco a uno de los adversarios al revelarse.\n• Si el Progreso llega a 0 primero, el grupo la corta el paso y la espera en el puerto: los jugadores eligen a un PJ para tener el foco, ganan 1 Esperanza y ventaja en su primera tirada de acción.\n• Si se agotan a la vez, ganas 1 Miedo y el foco pasa a los jugadores.\n\nSigue con el Acto 5.",
    },
    {
      id: uid("e"),
      sceneId: S.docks,
      name: "Acto 5 · Enfrentamiento en el puerto",
      notes:
        "Stabitha se reúne con su equipo de arcanistas y asesinos en el puerto principal de Bankburgh (mapa «Acto 5 · El puerto», ya con los adversarios para cuatro PJ).\n\nComposición según los jugadores: 3 PJ → Stabitha, 2 Arcanistas, 1 Asesino · 4 PJ → Stabitha, 2 Arcanistas, 2 Asesinos · 5 PJ → Stabitha, 3 Arcanistas, 3 Asesinos. Cambia las fichas del mapa si hace falta.\n\nEs probablemente el único combate de la sesión: los enemigos actúan en equipo y golpean fuerte. Stabitha usa Deslumbrar para debilitar a distancia y, si alguien se acerca, Manos rápidas para robar pociones. Los Arcanistas usan Paso del vacío para mantenerse lejos y sacar la tiara del alcance del grupo. Los Asesinos usan Bomba de humo contra quienes se agrupan y golpean Ocultos para dejarlos Vulnerables.\n\nLos muelles están casi desiertos porque todos están de fiesta, pero puedes meter transeúntes o un desfile para añadir caos.\n\nLa tiara empieza en manos de Stabitha. Mantén el movimiento pasando la tiara entre ella y sus aliados.\n\nEvento «A tomar la tiara» (nivel 1, Dificultad 12): impulsos: desviar la atención, mover la tiara, dispersar al grupo.\n• Portador de la corona (Pasiva): al empezar, la tiara brilla con luz de estrellas. Quien la lleve está Favorecido: ventaja en las tiradas de acción y no puede quedar Oculto. Un combatiente puede quitársela con una tirada de acción con éxito contra el portador. El portador la suelta si recibe daño Grave o mayor. ¿Cómo cambia la luz estelar el aspecto de la tiara y de su portador?\n• Pasar la tiara (Acción): un adversario la lanza a un aliado a alcance Lejano. Cada PJ junto al que pasa a alcance Muy cercano puede hacer una tirada de reacción de Finura contra el lanzador para interceptarla.\n\nAl derrotar a Stabitha, suelta el glamour y revela su forma Vespid, aún más temible: sustitúyela por la ficha «Vespid» y dale el foco (La gran revelación).\n\nTras la batalla, el grupo puede interrogar a Stabitha o a sus cómplices sin tirada (conversación «La ladrona derrotada»): la contrató alguien a quien no ha visto, que reúne artefactos poderosos de la región con un fin desconocido y, sin duda, malvado. Si se lo preguntan, revela que la noble a la que suplantó está viva en algún trastero.",
    },
    {
      id: uid("e"),
      sceneId: S.end,
      name: "Acto 6 · Recompensa",
      notes:
        "Lee: al entrar en el gran salón los nobles se apartan, con susurros tras ellos. Al fondo, el rey y la reina se alzan. Presentáis la tiara y todos suspiran aliviados. Terloc la toma con ambas manos («Habéis prestado un gran servicio a este reino»; haz las voces); Lirica la mira con gratitud medida («Habéis devuelto más que un regalo: habéis protegido nuestro futuro») y la coloca sobre la cabeza de Gerdi. La gema cambia un instante de color, Gerdi ríe y alza las manos, y la tensión se disuelve en risas y aplausos. «Siempre seréis bienvenidos en Bankburgh».\n\nTerloc: «Nombrad vuestra recompensa: oro, tierras, un título… o un favor pendiente». Deja que el grupo lo hable: una propiedad en Bankburgh (base para futuras aventuras), un puesto en la corte, un botín (quizá uno de los regalos de Gerdi) u oro, mucho oro. Los reyes lo conceden y brindan por ellos.\n\nTermina en un punto alto: un chiste, una referencia a un regalo anterior, o Gerdi haciendo algo gracioso, como sonarle la nariz a un PJ o decir su primera frase completa.\n\nDespués: Parson Redstring puede ser un buen dador de misiones, o el grupo puede investigar quién contrató a Stabitha.\n\nSi se desvían del guion:\n• La party impide la huida (bloquea salidas, sella el salón, retiene a los sospechosos): recompénsalos. Opción A: la ladrona huye hacia dentro del palacio. Mantén el entorno y las mecánicas de la persecución, sustituyendo festival por palacio: calles abarrotadas → pasillos de servicio, puestos → cocinas, armerías o archivos, carrozas → carritos de banquete o montacargas, juerguistas → guardias, criados y nobles asustados. El combate final puede ser en los muelles reales, donde el río pasa bajo el palacio. Opción B: salta la persecución y pasa al combate final en el propio salón. Los Arcanistas y los Asesinos se revelan entre invitados y personal. Recuerda la barrera de las columnatas para el posicionamiento. Decide si los reyes y Gerdi se quedan (más tensión) o Redstring los aparta por pasadizos secretos.\n• La party usa la tiara: no digas que «no funciona». Concede un deseo imperfecto: una versión debilitada, retorcida, literal, o cumplida a un gran coste. Usarla antes de tiempo la destruye: la gema arde con luz cegadora y la tiara se deshace en polvo brillante. Juega las consecuencias: los reyes no lo tomarán bien (pueden perder el favor de la corona, ir presos o huir de Bankburgh).",
    },
  ];

  // Mapas guardados (el DJ los carga desde la pestaña Mapa): solo fichas y cuentas atrás.
  const mapLock = { terrain: [], props: [], tokens: [], counters: [{ id: uid("k"), name: "Investigación", value: 5, visible: true }] };
  const mapChase = { terrain: [], props: [], tokens: [], counters: [{ id: uid("k"), name: "Progreso", value: 8, visible: true }, { id: uid("k"), name: "Consecuencia", value: 5, visible: true }] };
  const mapDocks = {
    terrain: [],
    props: [],
    tokens: [
      foe("Stabitha Pluma Oscura", 12, 4, STABITHA),
      foe("Arcanista Pluma Oscura 1", 13, 2, ARCANIST),
      foe("Arcanista Pluma Oscura 2", 13, 6, ARCANIST),
      foe("Asesino Pluma Oscura 1", 10, 3, ASSASSIN),
      foe("Asesino Pluma Oscura 2", 10, 5, ASSASSIN),
    ],
    counters: [],
  };
  const mLockId = uid("m");
  const maps = [
    { id: mLockId, sceneId: S.lock, name: "Acto 3 · Investigación", map: mapLock },
    { id: uid("m"), sceneId: S.chase, name: "Acto 4 · Persecución", map: mapChase },
    { id: uid("m"), sceneId: S.docks, name: "Acto 5 · El puerto", map: mapDocks },
  ];
  return { campaign, stage, cast, convs, encounters, maps, liveMap: { ...mapLock, mapId: mLockId } };
}
