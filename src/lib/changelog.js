// Historial de versiones que se muestra en «Actualizaciones». La primera entrada es la más reciente.
// Cada cambio nuevo se anota aquí (tags: nuevo, mejora, arreglo).
export const CHANGELOG = [
  {
    version: "1.17",
    date: "2026-10-09",
    title: "Foco de la mesa (spotlight)",
    items: [
      { tag: "nuevo", text: "Los jugadores pueden levantar la mano desde el mapa (actuar, hablar, duda o reacción) y se ve sobre su ficha con su puesto en la cola." },
      { tag: "nuevo", text: "El DJ tiene un panel de foco: cola de manos, dar foco a un jugador o a cualquier ficha, apagarlo, bajar las manos, mesa en silencio e interrumpir la mesa." },
      { tag: "nuevo", text: "La ficha con el foco sube y brilla con un haz de luz y el resto del tablero se atenúa. El jugador pulsa «He terminado» al acabar." },
      { tag: "nuevo", text: "Aviso al DJ cuando un jugador lleva mucho tiempo sin foco, con «Dar foco» y «Más tarde»." },
      { tag: "nuevo", text: "Al interrumpir, nadie puede tirar ni moverse hasta que el DJ reanude." },
      { tag: "mejora", text: "El efecto del foco es más sutil: un anillo suave, un atenuado ligero y la ficha sube un poco." },
    ],
  },
  {
    version: "1.16",
    date: "2026-10-09",
    title: "Daño visible en el mapa",
    items: [
      { tag: "nuevo", text: "Cuando un personaje marca Puntos de vida, su ficha en el mapa se sacude con un destello rojo, gotas y un «−N PV» que sube. Lo ven todos los jugadores y el DJ." },
    ],
  },
  {
    version: "1.15",
    date: "2026-10-09",
    title: "La mano del mapa con todas tus cartas",
    items: [
      { tag: "nuevo", text: "La mano del mapa incluye las cartas de Acciones (subclase, características de clase, Esperanza, ascendencia, comunidad y transformación). El orden es: armas, Acciones y cartas de dominio." },
      { tag: "mejora", text: "Con muchas cartas, se juntan para caber en el ancho del mapa. Al pulsar o soltar una carta de Acciones se abre su carta completa." },
    ],
  },
  {
    version: "1.14",
    date: "2026-10-08",
    title: "Carta de subclase del Guardián de los Elementos",
    items: [
      { tag: "mejora", text: "La carta de la mano del mapa tiene el mismo diseño que la de Acciones, con su ilustración." },
      { tag: "mejora", text: "Soltar la carta en cualquier casilla del mapa la activa y pregunta qué elemento canalizar." },
      { tag: "mejora", text: "Aire: se quita el bote de activación y la ficha se eleva de forma continua hasta flotar." },
      { tag: "arreglo", text: "Los elementos del Guardián de los Elementos aparecen tras un instante, cuando el mapa ya está tranquilo, para que la animación no se corte ni dé un salto al empezar." },
    ],
  },
  {
    version: "1.13",
    date: "2026-10-08",
    title: "Vida, Estrés y Esperanza en el mapa",
    items: [
      { tag: "nuevo", text: "Un panel en la esquina superior izquierda del mapa muestra tu Vida, Estrés y Esperanza en casillas, y se pueden marcar o quitar pulsándolas. Cada jugador ve solo el suyo." },
    ],
  },
  {
    version: "1.12",
    date: "2026-10-08",
    title: "Carta de subclase en la mano",
    items: [
      { tag: "nuevo", text: "El Guardián de los Elementos tiene su carta de subclase en la mano del mapa; al abrirla se canaliza Fuego, Tierra, Agua o Aire." },
      { tag: "mejora", text: "Al canalizar Aire, la ficha rebota y se queda flotando sin ningún salto entre el bote y el vuelo suave." },
    ],
  },
  {
    version: "1.11",
    date: "2026-10-08",
    title: "Chat de la campaña",
    items: [
      { tag: "mejora", text: "El chat de la campaña ocupa la columna de la derecha sin caja redondeada, igual que el panel de amigos." },
    ],
  },
  {
    version: "1.10",
    date: "2026-10-08",
    title: "Elementos del Guardián de los Elementos en el mapa",
    items: [
      { tag: "nuevo", text: "Canalizar Fuego, Tierra, Agua o Aire desde el clic derecho de tu ficha: la ficha hace un bote al activarlo." },
      { tag: "nuevo", text: "Fuego: las casillas cuerpo a cuerpo arden y te siguen. Quien te hiere cuerpo a cuerpo tira un d10 pequeño sobre él y recibe el daño mágico con una animación de quemadura." },
      { tag: "nuevo", text: "Agua: al dañar cuerpo a cuerpo, una onda cuadrada marca 1 Estrés a los adversarios Muy cercanos al objetivo, y se avisa en el chat." },
      { tag: "nuevo", text: "Tierra marca la casilla y el borde de la ficha en marrón, y Aire la eleva un poco con un remolino de viento." },
    ],
  },
  {
    version: "1.9",
    date: "2026-10-08",
    title: "Actualizaciones y campañas con el nuevo diseño",
    items: [
      { tag: "nuevo", text: "Pestaña «Actualizaciones» en el menú lateral con el historial de versiones." },
      { tag: "mejora", text: "Campañas con el mismo diseño que Personajes: tarjetas con color, miembros y cabecera propia en cada campaña." },
      { tag: "mejora", text: "El icono de la página del menú se ve en negro en modo día." },
      { tag: "arreglo", text: "Las tarjetas de personajes miden lo mismo y su degradado se ve bien en modo día." },
    ],
  },
  {
    version: "1.8",
    date: "2026-10-08",
    title: "Una sola hoja de personaje",
    items: [
      { tag: "mejora", text: "Siempre se abre la hoja moderna: se quita la hoja clásica y la pregunta de qué hoja abrir." },
      { tag: "mejora", text: "Formas de Bestia en filas con el color de cada forma, su ventaja y las cifras clave a la vista." },
      { tag: "mejora", text: "Los amigos se actualizan en segundos: conectado, ausente, desconectado y la clase con la que juegan." },
      { tag: "arreglo", text: "Las formas de bestia ya no muestran una barra lateral al pasar el ratón." },
      { tag: "arreglo", text: "El texto de +Estrés, +Esperanza y +Favor tiene el mismo estilo que la pérdida de vida." },
    ],
  },
  {
    version: "1.7",
    date: "2026-10-08",
    title: "Multiclase",
    items: [
      { tag: "nuevo", text: "Multiclase desde el nivel 5 con asistente: clase, dominio, carta fundamento y rasgo de conjuro." },
      { tag: "nuevo", text: "En Acciones, las pestañas General y Multiclase separan lo de cada clase." },
      { tag: "mejora", text: "La cabecera mezcla los colores de las dos clases y las ascendencias mixtas comparten fila." },
      { tag: "mejora", text: "La hoja moderna se ve bien en modo día y las ilustraciones de cada clase muestran al personaje." },
    ],
  },
  {
    version: "1.6",
    date: "2026-10-08",
    title: "Subida de nivel y novedades de Inicio",
    items: [
      { tag: "nuevo", text: "Subida de nivel con las reglas del manual: logros, avances por Rango, umbrales y carta de dominio." },
      { tag: "nuevo", text: "Banner de la expansión Hope & Fear en el inicio." },
      { tag: "mejora", text: "Etiquetas de estado en la cabecera de la hoja y rasgo de conjuro marcado." },
      { tag: "mejora", text: "Menú de la cuenta desde el avatar y favicon que se adapta al tema del navegador." },
    ],
  },
  {
    version: "1.5",
    date: "2026-10-08",
    title: "Tablero: criaturas, eventos y Enredo Feroz",
    items: [
      { tag: "nuevo", text: "El DJ muestra u oculta criaturas sueltas o en grupo, aparte de la niebla." },
      { tag: "nuevo", text: "Eventos y desencadenantes: reglas «cuando… si… entonces…», como que los demás huyan al herir a un enemigo." },
      { tag: "nuevo", text: "Enredo Feroz con raíces y enredaderas, con la opción de gastar Esperanza para un segundo adversario." },
      { tag: "mejora", text: "La ficha del enemigo aparece encima del mapa y no cambia su altura." },
    ],
  },
  {
    version: "1.4",
    date: "2026-10-07",
    title: "Hoja moderna y creador de personajes",
    items: [
      { tag: "nuevo", text: "Hoja de personaje moderna en la columna central, con tutorial interactivo la primera vez." },
      { tag: "nuevo", text: "Pestaña de campaña dentro de la hoja, con la escena o el mapa y el chat de la campaña." },
      { tag: "mejora", text: "Creador de personaje con pasos cortos, previsualización de clase y subclase y resumen." },
      { tag: "mejora", text: "Efectos de daño, recursos y ventanas a pantalla completa." },
    ],
  },
  {
    version: "1.3",
    date: "2026-10-07",
    title: "Nueva interfaz",
    items: [
      { tag: "nuevo", text: "Interfaz completa estilo launcher: menú lateral con listas, barra superior y columna de amigos." },
      { tag: "nuevo", text: "Página de inicio, solicitudes de amistad, notificaciones y estado de los amigos." },
      { tag: "mejora", text: "Inicio de sesión y registro a pantalla completa con el logo de la estrella." },
      { tag: "mejora", text: "Abanico de cartas de dominio y de armas en el mapa isométrico." },
    ],
  },
  {
    version: "1.2",
    date: "2026-10-04",
    title: "Aventura de inicio y niebla de guerra",
    items: [
      { tag: "nuevo", text: "«Los mensajeros de Sablewood»: campaña lista con escenas, pistas, reparto, notas por acto y mapas con enemigos." },
      { tag: "nuevo", text: "Niebla de guerra: el DJ la activa, despeja y cubre; los personajes despejan a su alrededor." },
      { tag: "mejora", text: "Tablero con piezas apilables, siluetas tras los muros, giro de piezas y colinas apilables." },
      { tag: "arreglo", text: "Borrar decorados y terreno como DJ es más fácil, con el botón derecho." },
    ],
  },
  {
    version: "1.1",
    date: "2026-10-03",
    title: "Tablero jugable",
    items: [
      { tag: "nuevo", text: "Atacar desde el mapa con alcance, Dificultad, umbrales y daño aplicado a los enemigos." },
      { tag: "nuevo", text: "Enemigos con estadísticas base del manual y tamaño de ficha a elegir." },
      { tag: "nuevo", text: "Regla del clic derecho mantenido que mide la distancia y el alcance en casillas." },
      { tag: "nuevo", text: "Efectos en el mapa para Inmovilizado, Vulnerable, Inconsciente, Volando y Retraído." },
      { tag: "mejora", text: "Clic derecho con las acciones de tu personaje y animaciones de ataque y de movimiento." },
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;
