// Aventura de inicio de Daggerheart: «Los mensajeros de Sablewood» (Darrington Press, 2025), adaptada al castellano.
// buildSablewood() devuelve todo lo que necesita una campaña nueva: escenas, pistas (ocultas hasta que el DJ las muestre),
// reparto con sus frases, notas de cada acto para el DJ, mapas guardados con los enemigos colocados y el mapa inicial.

const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const scene = (key) => "/escenas/" + key + ".svg";

// Estadísticas de adversario en el formato del tablero (como el Bandido del Cuchillo Dentado).
const foeStats = (o) => ({ tier: 1, hpMarked: 0, stressMarked: 0, exp: "", motives: "", ...o });

const STRIXWOLF = foeStats({
  base: "Madre strixwolf",
  type: "Estándar",
  desc: "Un gran animal con cuerpo de lobo, cara de búho y alas en el lomo. Protege a sus dos crías.",
  motives: "Proteger a sus crías, comer, huir volando a un árbol",
  difficulty: 10,
  thresholds: [4, 8],
  hp: 3,
  stress: 3,
  atk: 1,
  attack: { name: "Mordisco", range: "Cuerpo a cuerpo", damage: "1d6+3", type: "fís" },
  features: [{ name: "Madre protectora", kind: "Pasiva", text: "Si la atacan, las crías huyen. Si falla cualquier tirada para tratar con ella, sube a sus crías al lomo y vuela a un árbol cercano a vigilar." }],
});
const AMBUSHER = foeStats({
  base: "Emboscador del Cardo",
  type: "Estándar",
  desc: "Un ladrón de la gente del Cardo con daga y armadura de piedras pulidas.",
  motives: "Distraer al grupo mientras el ladrón roba el carruaje",
  difficulty: 13,
  thresholds: [6, 12],
  hp: 3,
  stress: 2,
  atk: 1,
  attack: { name: "Daga", range: "Cuerpo a cuerpo", damage: "1d8+5", type: "fís" },
  features: [{ name: "Emboscada", kind: "Reacción", text: "Si entra en escena sin que lo hayan visto, se mueve al cuerpo a cuerpo de un objetivo y le ataca enseguida. Si acierta, inflige 2d4+8 de daño físico." }],
});
const THIEF = foeStats({
  base: "Ladrón del Cardo",
  type: "Líder",
  desc: "El cabecilla de la emboscada. Quiere llevarse el carruaje con la entrega.",
  motives: "Robar el carruaje, escapar entre las zarzas",
  difficulty: 14,
  thresholds: [7, 14],
  hp: 4,
  stress: 2,
  atk: 3,
  attack: { name: "Hoja dentada", range: "Cuerpo a cuerpo", damage: "2d4+3", type: "fís" },
  features: [{ name: "¡Atrás!", kind: "Acción", text: "Gasta un Miedo y haz una tirada de ataque contra todos los objetivos en Cuerpo a cuerpo. A los que acierte los lanza hacia atrás: 2d6+3 de daño mágico y quedan a alcance Lejano." }],
});
const SKELETON = foeStats({
  base: "Esqueleto antiguo",
  type: "Estándar",
  desc: "Huesos con una espada oxidada, despertados por la magia del ritual.",
  motives: "Atacar a quien tenga más cerca, rodear a la Arcanista",
  difficulty: 12,
  thresholds: [7, null],
  hp: 2,
  stress: 1,
  atk: 0,
  attack: { name: "Espada oxidada", range: "Cuerpo a cuerpo", damage: "1d6+1", type: "fís" },
  features: [{ name: "Ataque en grupo", kind: "Acción", text: "Gasta un Miedo y elige un objetivo: todos los esqueletos a alcance Cercano de él se ponen en Cuerpo a cuerpo y hacen una sola tirada de ataque. Si aciertan, cada uno inflige 4 de daño físico (súmalo todo)." }],
});
const WRAITH = foeStats({
  base: "Espectro del bosque",
  type: "Bruto",
  desc: "Una figura translúcida que flota entre los árboles y se alimenta de recuerdos.",
  motives: "Drenar vida, separar el alma del cuerpo, llegar hasta la Arcanista",
  difficulty: 13,
  thresholds: [7, 14],
  hp: 6,
  stress: 3,
  atk: 3,
  attack: { name: "Drenar vida", range: "Lejano", damage: "2d6+8", type: "mág" },
  features: [
    { name: "Cuerpo espectral", kind: "Pasiva", text: "Tiene resistencia al daño físico (se reduce a la mitad, redondeando hacia arriba)." },
    { name: "Sondear recuerdos", kind: "Acción", text: "Ataca a un objetivo Cercano. Si acierta, vuela a su lado y le toca la mejilla: el jugador describe un recuerdo aterrador de su infancia. 3d4+9 de daño mágico y queda Vulnerable hasta su próximo descanso." },
    { name: "Atravesar", kind: "Acción", text: "Gasta un Miedo y ataca a un objetivo en Cuerpo a cuerpo. Si acierta, lo atraviesa y su alma queda Desligada: no puede actuar hasta que avance la cuenta atrás del ritual. Si todo el grupo queda Desligado, todos marcan 2 PV y vuelven." },
  ],
});

// Bosque alrededor del camino (actos 1 y 2).
const FOREST = [
  [0, 0, "pino"], [2, 0, "arbol"], [4, 0, "pino"], [6, 0, "arbol"], [8, 0, "pino"], [10, 0, "arbol"], [12, 0, "pino"], [14, 0, "arbol"],
  [1, 1, "arbol"], [5, 1, "pino"], [9, 1, "arbol"], [13, 1, "pino"], [15, 1, "pino"],
  [3, 2, "arbusto"], [11, 2, "arbol"],
  [1, 6, "arbusto"], [6, 6, "arbusto"], [12, 6, "arbusto"],
  [0, 7, "arbol"], [3, 7, "pino"], [5, 7, "arbol"], [8, 7, "pino"], [10, 7, "arbol"], [14, 7, "pino"],
  [2, 8, "pino"], [6, 8, "pino"], [9, 8, "arbol"], [12, 8, "pino"], [15, 8, "arbol"],
];
const props = (list) => list.map(([x, y, kind, rot]) => ({ id: uid("p"), kind, x, y, ...(rot ? { rot } : {}) }));
const roadMap = (extraProps) => ({
  terrain: [
    ...Array.from({ length: 16 }, (_, x) => ({ x, y: 4, kind: "camino" })),
    { x: 13, y: 2, kind: "colina" }, { x: 14, y: 2, kind: "colina" }, { x: 14, y: 3, kind: "colina" }, { x: 4, y: 6, kind: "roca" },
  ],
  props: props([...FOREST, [2, 4, "carro"], [9, 4, "carro", 1], [10, 5, "caja"], [8, 5, "barril"], ...extraProps]),
});
const foe = (name, x, y, stats, size) => ({ id: uid("t"), kind: "foe", name, x, y, stats: { ...stats }, ...(size ? { size } : {}) });
const npc = (name, x, y, extra = {}) => ({ id: uid("t"), kind: "npc", name, x, y, ...extra });

export function buildSablewood() {
  const campId = "camp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const S = { cart: uid("s"), ambush: uid("s"), hush: uid("s"), tavern: uid("s"), tree: uid("s"), vale: uid("s"), end: uid("s") };
  const C = { arcanist: uid("c"), fidget: uid("c"), lausa: uid("c"), halython: uid("c") };
  const line = (castId, text, expr = "tranquila") => ({ id: uid("l"), castId, expr, text });

  const campaign = {
    id: campId,
    name: "Los mensajeros de Sablewood",
    description: "Aventura de inicio de Daggerheart. Marlowe Fairwind, la hechicera del rey Emeris, reúne a sus aliados para llevar una caja sellada con magia hasta Hush, una aldea del antiguo bosque de Sablewood, y entregarla a la Arcanista Fuegoblanco.",
    characterIds: [],
  };

  const scenes = [
    { id: S.cart, title: "Acto 1 · El carro volcado", image: scene("camino") },
    { id: S.ambush, title: "Acto 2 · Ladrones de la espesura", image: scene("bosque") },
    { id: S.hush, title: "Acto 3 · La aldea de Hush", image: scene("campamento") },
    { id: S.tavern, title: "Acto 3 · La Taberna del Trébol", image: scene("posada") },
    { id: S.tree, title: "Acto 4 · La casa del árbol", image: scene("bosque") },
    { id: S.vale, title: "Acto 5 · El Valle Abierto", image: scene("ruinas") },
    { id: S.end, title: "Epílogo · La piedra angular", image: scene("posada") },
  ];

  const handout = (title, text, hidden = true) => ({ id: uid("h"), kind: "nota", title, image: "", text, ts: Date.now(), ...(hidden ? { hidden: true } : {}) });
  const handouts = [
    handout("El encargo del rey", "Llevad la caja sellada con magia hasta Hush, en el bosque de Sablewood, y entregadla a la Arcanista Fuegoblanco. Tenéis un mapa, un carruaje y la promesa de una recompensa a la llegada. — Por orden del rey Emeris", false),
    handout("Zarzas en la rueda", "Restos de zarzas espinosas enredados en la rueda del carro volcado y esparcidos por el camino. Alguien preparó esto."),
    handout("El cuerpo del mercader", "El strixwolf se comió parte del brazo, pero no fue lo que lo mató: al conductor le cortaron el cuello."),
    handout("El Festival del Primer Musgo", "Hush celebra la llegada de la primavera: los cultivos de las Granjas Sin Sol se cubren con el primer musgo azul. Hay pulsos amistosos, una clase de pintar piedras y un mercadillo de baratijas."),
    handout("Indicaciones hacia la Arcanista", "Su casa está al sur, cruzando los campos de cultivo. Cuelga de uno de los viejos árboles del Sablewood como una fruta madura. No tiene pérdida."),
    handout("La piedra angular", "Dentro de la caja hay una enorme piedra con un rostro de león tallado: la clave del arco de la puerta principal de la capital. Sin ella, la ciudad no tiene barrera."),
    handout("La Aguja del oeste", "A unas horas a pie al oeste se alza una de las Agujas de piedra con una llama dentro. Su luz es más débil de lo que debería: algo le pasa a su guardián. La Arcanista os dará su mapa cuando estéis listos."),
  ];

  const stage = { live: "escena", scenes, activeSceneId: S.cart, scene: { title: scenes[0].title, image: scenes[0].image }, handouts };

  const cast = [
    { id: C.arcanist, name: "La Arcanista Fuegoblanco", imgs: {} },
    { id: C.fidget, name: "Fidget", imgs: {} },
    { id: C.lausa, name: "Lausa Standworth", imgs: {} },
    { id: C.halython, name: "Halython Fives", imgs: {} },
  ];

  const convs = [
    {
      id: uid("v"), sceneId: S.hush, title: "Vecinos de Hush",
      lines: [
        line(C.fidget, "¿Venís de fuera? ¿Cómo es el mundo más allá del bosque? ¿Hay árboles más altos que estos?", "feliz"),
        line(C.lausa, "Antes de nada: ¿cómo se llaman vuestras armas? ¿Y en qué fecha las forjaron?"),
        line(C.halython, "¿Os habéis cruzado con la gente del Cardo por el camino?"),
      ],
    },
    {
      id: uid("v"), sceneId: S.tavern, title: "Dónde está la Arcanista",
      lines: [
        line(C.lausa, "La Arcanista está muy ocupada, pero si habéis venido desde tan lejos seguro que os recibe. Sin ella estaríamos perdidos."),
        line(C.lausa, "Mantiene una barrera que impide que los peligros del Sablewood entren en el pueblo."),
        line(C.lausa, "Su casa está al sur, cruzando los campos. Cuelga de uno de los viejos árboles del bosque; no tiene pérdida.", "feliz"),
      ],
    },
    {
      id: uid("v"), sceneId: S.tree, title: "La Arcanista",
      lines: [
        line(C.arcanist, "¿Sois el grupo que mandó Emeris desde la capital? Vaya, llegáis tardísimo, ¿no? Pasad, pasad."),
        line(C.arcanist, "Contadme: ¿quién os indicó el camino? ¿Y cómo os imagináis que moriréis algún día?", "feliz"),
        line(C.arcanist, "Claro que el rey lo quería en secreto. Si alguien supiera que vuestra ciudad ya no está protegida, la tomarían antes del amanecer.", "enfadada"),
        line(C.arcanist, "Tenemos que ir al Valle Abierto a renovar la barrera. Una magia así atraerá criaturas peligrosas de lo más oscuro del bosque. Necesitaré vuestra ayuda."),
      ],
    },
    {
      id: uid("v"), sceneId: S.vale, title: "El ritual",
      lines: [
        line(C.arcanist, "Aquí, aquí. Parad. Ahora venid a ayudarme, que ya soy mayor."),
        line(C.arcanist, "Necesito una hora para prepararlo. Disfrutad del aire de la noche mientras podáis: luego estaremos muy ocupados."),
        line(C.arcanist, "¡La piedra ha respondido por fin! ¡Rodeadme, el ritual tiene que empezar ya o perderé el camino! ¡Deprisa!", "enfadada"),
      ],
    },
    {
      id: uid("v"), sceneId: S.end, title: "Despedida",
      lines: [
        line(C.arcanist, "Habéis luchado bien. No me sorprende: el rey sabe rodearse de buena gente. Me alegro mucho de que estuvierais allí.", "feliz"),
        line(C.arcanist, "La piedra necesitará una semana, quizá más, para que la magia se asiente. Tendré que vigilar que no se agriete... ni cobre conciencia, ya sabéis cómo es esto."),
        line(C.arcanist, "Hay una Aguja al oeste, a unas horas a pie. Su luz es más débil de lo que debería. Cuando estéis listos, volved y os daré mi mapa. Es bueno volver a tener héroes en el Sablewood."),
      ],
    },
  ];

  const encounters = [
    {
      id: uid("e"),
      name: "Acto 1 · El carro volcado",
      notes:
        "Lee: el grupo llega al Sablewood al anochecer (árboles colosales, caminos hundidos, animales híbridos: polillas-alondra, sapos-lémur, murciélagos-zorro). Pregunta quién conduce el carruaje y qué tienen de especial los árboles; usa su respuesta.\n\nEn una curva hay un carro de mercader volcado que bloquea el paso, con fruta por el suelo. Una madre strixwolf (cuerpo de lobo, cara de búho, alas) se come la mano del mercader muerto y os mira con curiosidad; detrás, dos crías.\n\nPrimera tirada: quien se acerque hace una tirada de Presencia (Dificultad 10).\n• Éxito: calma a sus crías. Con Miedo, añade una complicación (aúlla y parece llamar a otro strixwolf).\n• Fallo con Esperanza: sube a las crías al lomo y vuela a una rama a vigilar.\n• Fallo con Miedo: gruñe y el PJ marca 1 Estrés.\n• Crítico: el PJ gana Esperanza y puede quitarse 1 Estrés; ella se acerca con la cabeza gacha y se sienta.\n\nMapa: «Acto 1 · El carro volcado» (ya cargado).",
    },
    {
      id: uid("e"),
      name: "Acto 2 · Ladrones de la espesura",
      notes:
        "Tras el acto 1:\n• Si registran el carro: está desvalijado. Si examinan el cuerpo, al mercader le cortaron el cuello (pista «El cuerpo del mercader»).\n• Si atacan al strixwolf: Dificultad 10; las crías huyen.\n• Si buscan algo raro: zarzas en la rueda y por el camino (pista «Zarzas en la rueda»).\n• Si mueven el carro, intentan seguir o salen del camino: emboscada.\n\nLa emboscada: un PJ atento hace una tirada de Instinto (14).\n• Éxito: ven a cuatro de la gente del Cardo acercarse. El grupo actúa primero. Con Miedo, el PJ marca 1 Estrés.\n• Fallo: emboscada. Los Emboscadores actúan primero con su reacción Emboscada (se ponen en Cuerpo a cuerpo y atacan: 2d4+8 si aciertan). Con Miedo, el PJ también marca 1 Estrés.\n\nCarga el mapa «Acto 2 · Emboscada». Objetivo de la gente del Cardo: los Emboscadores entretienen al grupo mientras el Ladrón intenta llevarse el carruaje. Pregunta qué nivel de violencia prefiere la mesa (¿matar, dejar inconscientes?).\n\nFin: cuando caen todos. Pide un breve montaje del resto del viaje hasta Hush.",
    },
    {
      id: uid("e"),
      name: "Acto 3 · Buscando a la Arcanista",
      notes:
        "Hush: un pilar de piedra con símbolos enanos marca la entrada; al cruzarlo se nota un pequeño «pop», como una burbuja. Ambiente tranquilo, saludos y música desde la taberna.\n\nVecinos (escena «Acto 3 · La aldea de Hush», conversación «Vecinos de Hush»):\n• Fidget (humano, elle): niño inquieto que enciende los farolillos de los árboles; conoce los atajos y quiere saber cómo es el mundo de fuera.\n• Lausa Standworth (enana, ella): mayor, con barba y un barril de cerveza al hombro; pregunta el nombre y la fecha de forja de cada arma.\n• Halython Fives (clank, él): autómata tranquilo con un murciélago-zorro en el hombro; juega con cartas y bellotas; pregunta por la gente del Cardo.\n\nElige un segundo vecino que sabe dónde vive la Arcanista y que la vio por última vez en la taberna.\n\nLa Taberna del Trébol: seis pisos curvos subiendo por un árbol antiguo. Los recién llegados cuelgan los zapatos en una cuerda; al irse están lustrados y llenos de baratijas. Pide a los jugadores detalles (¿por qué el segundo piso es tan distinto?, ¿a qué huele?, ¿qué costumbre tienen los vecinos?).\n\nOpcional: el Festival del Primer Musgo (pista). Cuando estén listos, muestra la conversación «Dónde está la Arcanista» y la pista «Indicaciones hacia la Arcanista».",
    },
    {
      id: uid("e"),
      name: "Acto 4 · La casa del árbol",
      notes:
        "Camino al sur por las Granjas Sin Sol: los cultivos tienen un musgo azul que late como un corazón; los árboles tienen cientos de caras talladas. La casa de la Arcanista cuelga de un árbol enorme, sujeta por una cuerda gruesa como el brazo de un gigante y un contrapeso de piedra con símbolos; las ventanas brillan con luz verde amarillenta.\n\n• Si llaman desde abajo: no responde, pero la luz parpadea.\n• Si intentan cortar la cuerda: salen despedidos y marcan 1 Estrés.\n• Si trepan: Agilidad (13). Si fallan, una rama los agarra y los deja con suavidad en el suelo.\n\nLa Arcanista: una faérica de dos metros, mezcla de humanoide y luciérnaga, de movimientos lentos y bruscos; mayor pero ágil y pícara. Despliega su casa como una flor para meter la caja.\n\nAl abrirla: la piedra angular del arco de la capital (pista «La piedra angular»). Marlowe la reconoce. Usa la conversación «La Arcanista». Si el grupo quiere ayudar, salta al acto 5.",
    },
    {
      id: uid("e"),
      name: "Acto 5 · El Valle Abierto",
      notes:
        "Un claro perfectamente circular, el único sitio del bosque donde se ve el cielo: aquí la Arcanista forjó los pilares que protegen Hush (y casi muere).\n\nDescanso corto: cada PJ elige dos opciones (puede repetir): Curar heridas (1d4+1 PV, o a un aliado), Quitarse Estrés (1d4+1), Reparar armadura (1d4+1 casillas), Prepararse (1 Esperanza; si se preparan juntos, 2 cada uno). El DJ gana 1d4 de Miedo.\n\nEl ritual: carga el mapa «Acto 5 · El Valle Abierto». La Arcanista en el centro; cuatro Esqueletos antiguos a alcance Cercano y dos Espectros del bosque a alcance Lejano.\n\nCuenta atrás del ritual: empieza en 8 (ya creada en el mapa). Baja 1 cada vez que cae un adversario y sube 1 cada vez que golpean a la Arcanista (Dificultad 11; no marca PV ni Estrés, el daño es narrativo). Al llegar a 0, el ritual termina.\n\nEntorno · Venganza del Valle (Acción): gasta un Miedo para que salgan dos Esqueletos antiguos a alcance Muy cercano de un PJ. Úsalo si la cuenta atrás va lenta o si los Espectros han Desligado a mucha gente.\n\nSi nadie más está a su alcance, los adversarios atacan a la Arcanista. Movimiento de muerte: si un PJ marca su último PV, queda inconsciente hasta que lo curen o pase el peligro.",
    },
    {
      id: uid("e"),
      name: "Epílogo · La piedra angular",
      notes:
        "Al terminar el ritual, el carruaje cae al suelo y una explosión silenciosa sale de la Arcanista y disipa a los enemigos que queden.\n\nUna hora después, en la casa del árbol, la piedra flota sobre el fuego. La Arcanista, más vieja que antes, descansa en un sillón (conversación «Despedida»).\n\nPlano final: el bosque desde arriba, con agujas de piedra retorcidas sobresaliendo de las copas, cada una con una llama dentro. Pista «La Aguja del oeste».\n\nFin de la sesión.",
    },
  ];

  // Mapas guardados (el DJ los carga desde la pestaña Mapa).
  const map1 = {
    ...roadMap([]),
    tokens: [foe("Madre strixwolf", 10, 3, STRIXWOLF, "g"), npc("Cría de strixwolf", 11, 3, { size: "p" }), npc("Cría de strixwolf", 11, 5, { size: "p" })],
    counters: [],
  };
  const map2 = {
    ...roadMap([]),
    tokens: [foe("Emboscador del Cardo 1", 7, 2, AMBUSHER), foe("Emboscador del Cardo 2", 7, 6, AMBUSHER), foe("Emboscador del Cardo 3", 12, 5, AMBUSHER), foe("Ladrón del Cardo", 12, 3, THIEF)],
    counters: [],
  };
  // Valle Abierto: claro circular rodeado de árboles.
  const valeTokens = [
    npc("La Arcanista Fuegoblanco", 7, 4, { castId: C.arcanist }),
    foe("Esqueleto antiguo 1", 4, 2, SKELETON), foe("Esqueleto antiguo 2", 11, 2, SKELETON), foe("Esqueleto antiguo 3", 4, 6, SKELETON), foe("Esqueleto antiguo 4", 11, 6, SKELETON),
    foe("Espectro del bosque 1", 0, 4, WRAITH), foe("Espectro del bosque 2", 15, 4, WRAITH),
  ];
  const taken = new Set([...valeTokens.map((t) => t.x + "," + t.y), "8,4"]);
  const ring = [];
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 16; x++) {
      const e = ((x + 0.5 - 8) / 7.5) ** 2 + ((y + 0.5 - 4.5) / 4.2) ** 2;
      if (e > 0.82 && !taken.has(x + "," + y)) ring.push([x, y, (x * 3 + y) % 5 === 0 ? "arbusto" : (x + y) % 2 ? "pino" : "arbol"]);
    }
  const map3 = {
    terrain: [],
    props: props([...ring, [8, 4, "carro"], [5, 4, "roca"], [10, 5, "roca"]]),
    tokens: valeTokens,
    counters: [{ id: uid("k"), name: "Ritual", value: 8, visible: true }],
  };
  const maps = [
    { id: uid("m"), name: "Acto 1 · El carro volcado", map: map1 },
    { id: uid("m"), name: "Acto 2 · Emboscada", map: map2 },
    { id: uid("m"), name: "Acto 5 · El Valle Abierto", map: map3 },
  ];
  return { campaign, stage, cast, convs, encounters, maps, liveMap: { ...map1 } };
}
