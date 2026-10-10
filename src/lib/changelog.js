// Historial de versiones que se muestra en «Actualizaciones». La primera entrada es la más reciente.
// Cada cambio nuevo se anota aquí (tags: nuevo, mejora, arreglo).
export const CHANGELOG = [
  {
    version: "1.40",
    date: "2026-10-10",
    title: "Descansos solo con el grupo en campaña",
    items: [
      { tag: "mejora", text: "Un personaje que está en una campaña ya no puede descansar por su cuenta: la pestaña Descansos queda bloqueada con un candado y un botón para pedir al DJ un descanso corto o largo (le llega al chat y a su pestaña Descanso del grupo, donde ve las peticiones)." },
      { tag: "mejora", text: "Cuando el DJ convoca el descanso del grupo, la pestaña Descansos se desbloquea con un aviso, fija el tipo de descanso y, al descansar, el jugador queda marcado como listo. Los personajes sin campaña descansan como siempre." },
    ],
  },
  {
    version: "1.39",
    date: "2026-10-10",
    title: "Hoja sin saltos al cambiar de pestaña",
    items: [
      { tag: "arreglo", text: "Al cambiar de pestaña la hoja recalculaba su escala con una altura distinta en Detalles generales que en el resto, y las cajas (Armadura y estadísticas, etc.) cambiaban de tamaño unas décimas. Ahora todas las pestañas usan la misma escala. Además la caja de armadura se mide con decimales." },
    ],
  },
  {
    version: "1.38",
    date: "2026-10-10",
    title: "Rasgo de conjuro más limpio",
    items: [
      { tag: "mejora", text: "El rasgo de lanzamiento de hechizos ya no lleva la estrellita: se distingue por su borde discontinuo." },
    ],
  },
  {
    version: "1.37",
    date: "2026-10-10",
    title: "Arreglo de la ventana de compartir",
    items: [
      { tag: "arreglo", text: "La ventana de «Compartir ficha» (y las de perfil y ficha recibida) se cortaba por arriba: el título y la X quedaban fuera y no se podían pulsar. Ahora se ven completas." },
    ],
  },
  {
    version: "1.36",
    date: "2026-10-10",
    title: "Creación de personaje en la columna central",
    items: [
      { tag: "mejora", text: "La creación de personaje ya no es una ventana emergente: se hace en la columna central, con el menú y la lista de amigos siempre a la vista. Al cambiar de sección desde el menú se cierra." },
    ],
  },
  {
    version: "1.35",
    date: "2026-10-10",
    title: "Entrada a la hoja de personaje",
    items: [
      { tag: "mejora", text: "Al elegir un personaje en la pestaña Personajes, la hoja entra con una animación: aparece con un zoom suave y los rasgos y la cabecera se colocan uno tras otro." },
    ],
  },
  {
    version: "1.34",
    date: "2026-10-10",
    title: "Lo social, ampliado",
    items: [
      { tag: "nuevo", text: "Invitar a un amigo a una campaña desde su menú: le llega a la campana con un botón para unirse con el personaje que elija." },
      { tag: "nuevo", text: "Mensajes privados entre amigos (pulsa su nombre), con avisos de mensajes sin leer, y grupos de amigos para avisarlos o invitarlos de una vez." },
      { tag: "nuevo", text: "Perfil de jugador («Mi perfil» en tu cuenta y «Ver perfil» en un amigo) con lo que buscas, un texto y los personajes que quieres enseñar." },
      { tag: "nuevo", text: "Nueva página «Buscar mesa»: anuncios de jugadores y DJ que buscan gente, con petición de unirse." },
      { tag: "nuevo", text: "Compartir una ficha con un enlace de solo lectura, con caducidad y qué se ve, o enviarla a un amigo." },
      { tag: "nuevo", text: "Actividad de tus amigos en Inicio: subidas de nivel, campañas nuevas y críticos." },
      { tag: "nuevo", text: "Reacciones con emojis en los mensajes y tiradas del chat, y sellos de la sesión que reparte el DJ en la Crónica." },
      { tag: "nuevo", text: "Estado En línea, No molestar o Invisible, y en la lista de amigos se ve quién está en una sesión." },
      { tag: "nuevo", text: "Privacidad en Ajustes: quién puede invitarte o escribirte, qué compartes y una lista de bloqueados." },
    ],
  },
  {
    version: "1.33",
    date: "2026-10-10",
    title: "Cartas abre al instante",
    items: [
      { tag: "arreglo", text: "La pestaña «Cartas» tardaba unos segundos en aparecer porque pintaba las 103 cartas (con sus ilustraciones) de golpe. Ahora solo pinta las que están cerca de la pantalla y el resto según bajas." },
    ],
  },
  {
    version: "1.32",
    date: "2026-10-10",
    title: "Todas las cartas en «Cartas»",
    items: [
      { tag: "nuevo", text: "La pestaña «Cartas» incluye ahora también las cartas de ascendencia, comunidad, subclase y transformación, además de las de dominio." },
      { tag: "nuevo", text: "Nuevos filtros por tipo de carta (el de dominios sigue ahí) y el buscador mira también en las características." },
    ],
  },
  {
    version: "1.31",
    date: "2026-10-09",
    title: "Cartas más altas",
    items: [
      { tag: "mejora", text: "En la pestaña «Cartas» las cartas tienen exactamente el mismo tamaño (300 × 420) y el mismo diseño que al abrirlas." },
    ],
  },
  {
    version: "1.30",
    date: "2026-10-09",
    title: "Barra del foco",
    items: [
      { tag: "nuevo", text: "Sobre el mapa hay ahora una barra con quién tiene el foco, los últimos pases y un menú «Pasar el foco»." },
      { tag: "nuevo", text: "Quien tiene el foco puede pasárselo a otro jugador (como con Esperanza) o al DJ; el DJ puede dárselo a cualquiera o apagarlo." },
      { tag: "nuevo", text: "Si quien tiene el foco hace una tirada con Miedo, el foco pasa solo al DJ y queda anotado en el mapa." },
    ],
  },
  {
    version: "1.29",
    date: "2026-10-09",
    title: "Crónica y línea de tiempo",
    items: [
      { tag: "nuevo", text: "La campaña guarda ahora sus hitos solos: escenas mostradas, pistas, combates, críticos, subidas de nivel, descansos del grupo y votaciones." },
      { tag: "nuevo", text: "Nueva pestaña «Crónica»: una sesión por día con resumen automático editable, momentos clave que se pueden quitar, quién estuvo y notas privadas del DJ; se puede compartir con la mesa en el chat." },
      { tag: "nuevo", text: "Nueva pestaña «Línea de tiempo»: toda la historia sesión a sesión con filtros por tipo de hito." },
    ],
  },
  {
    version: "1.28",
    date: "2026-10-09",
    title: "Descanso del grupo",
    items: [
      { tag: "nuevo", text: "Nueva pestaña «Descanso» en la campaña: el DJ propone un descanso corto o largo a todo el grupo y ve quién ya ha descansado." },
      { tag: "nuevo", text: "A cada jugador le sale una ventana con las acciones recomendadas según lo que le falta; al descansar se aplica la recuperación de su personaje." },
      { tag: "nuevo", text: "Al terminar, el chat avisa de cuántos han descansado y de lo que gana el DJ en Miedo." },
    ],
  },
  {
    version: "1.27",
    date: "2026-10-09",
    title: "Votaciones rápidas",
    items: [
      { tag: "nuevo", text: "Nueva pestaña «Votaciones» en la campaña: el DJ lanza una pregunta con 2 a 5 opciones, con tiempo límite, voto secreto y cierre automático si votan todos." },
      { tag: "nuevo", text: "Los jugadores ven la votación como una tarjeta sobre el chat y votan con un toque; pueden cambiar su voto." },
      { tag: "nuevo", text: "Al cerrar, el resultado se publica en el chat." },
    ],
  },
  {
    version: "1.26",
    date: "2026-10-09",
    title: "Calendario de sesiones",
    items: [
      { tag: "nuevo", text: "Nueva pestaña «Calendario» en la campaña: el DJ fija la próxima sesión (fecha, hora y lugar) y ve quién viene." },
      { tag: "nuevo", text: "Los jugadores ven la próxima sesión en Inicio, con cuenta atrás, y confirman con Voy, Quizá o No puedo." },
      { tag: "nuevo", text: "Un mes con las sesiones pasadas y la próxima marcadas." },
    ],
  },
  {
    version: "1.25",
    date: "2026-10-09",
    title: "Generadores para el DJ",
    items: [
      { tag: "nuevo", text: "Nueva pestaña «Generadores» en la campaña: nombres, rumores, botín, taberna y PNJ, y encuentros." },
      { tag: "nuevo", text: "El generador de encuentros reparte los puntos de combate (3 por jugador + 2, más o menos según la dificultad) y propone tres composiciones según el ambiente." },
      { tag: "nuevo", text: "Cada resultado se puede enviar al chat, y los encuentros se colocan en el mapa de un clic." },
    ],
  },
  {
    version: "1.24",
    date: "2026-10-09",
    title: "Nueva pestaña: Cartas",
    items: [
      { tag: "nuevo", text: "Nueva pestaña «Cartas» en el menú de la izquierda: todas las cartas de dominio ordenadas por nivel, de 4 en 4." },
      { tag: "nuevo", text: "Filtro por dominio (se pueden elegir varios a la vez) y buscador por nombre o texto." },
      { tag: "nuevo", text: "Al pulsar una carta se ve en grande, con el mismo diseño y la inclinación de las cartas de la hoja." },
    ],
  },
  {
    version: "1.23",
    date: "2026-10-09",
    title: "La mesa en el chat",
    items: [
      { tag: "nuevo", text: "El chat de la campaña muestra arriba los círculos de los jugadores con su estado (en línea, ausente o desconectado). Al pulsarlos se abre la lista de la mesa." },
      { tag: "nuevo", text: "Cuando alguien escribe, el chat avisa con «nombre está escribiendo…»." },
      { tag: "mejora", text: "Los mensajes de texto llevan avatar con el color de la clase y su estado, el nombre del personaje y su clase y jugador, sin burbuja." },
    ],
  },
  {
    version: "1.22",
    date: "2026-10-09",
    title: "Inicio en modo día",
    items: [
      { tag: "arreglo", text: "Las imágenes de «Retoma tus campañas» y «Tus personajes» ahora tienen un degradado claro en modo día, en vez del fondo oscuro." },
    ],
  },
  {
    version: "1.21",
    date: "2026-10-09",
    title: "Tiradas a pantalla completa y etiqueta de multiclase",
    items: [
      { tag: "mejora", text: "La ventana de tirada es más ancha y baja: Tipo y Ventaja comparten fila y los dados, la fórmula y el botón de tirar van en una sola línea." },
      { tag: "arreglo", text: "Las tiradas y sus resultados se muestran siempre a pantalla completa, también desde la pestaña de campaña." },
      { tag: "mejora", text: "Al ganar Esperanza o Favor la fila y el texto tiemblan igual que con la Vida y el Estrés, sin el resplandor." },
      { tag: "mejora", text: "La multiclase ahora es una etiqueta «Multiclase: clase» en la cabecera, con el color de esa clase, junto a la de Hombre Lobo o las formas de bestia." },
    ],
  },
  {
    version: "1.20",
    date: "2026-10-09",
    title: "Ventana de tiradas ordenada y golpes en el aire",
    items: [
      { tag: "mejora", text: "La ventana de tirada es ahora de una sola columna: Tipo y Ventaja arriba, luego Experiencias y Bonificaciones, el desglose plegable y un botón grande para tirar." },
      { tag: "mejora", text: "El resultado de la tirada muestra el total en un recuadro, el resultado destacado en una franja de color y un botón para cerrar." },
      { tag: "arreglo", text: "Si una ficha flota o vuela y recibe daño, ya no baja al suelo: encaja el golpe en el aire, se echa un poco hacia atrás y vuelve a su sitio." },
      { tag: "mejora", text: "Al dejar de flotar o volar la ficha desciende con suavidad en vez de caer de golpe." },
    ],
  },
  {
    version: "1.19",
    date: "2026-10-09",
    title: "Ajuste de la ilustración de la cabecera",
    items: [
      { tag: "nuevo", text: "Nuevo ajuste «Ilustración de la cabecera»: se puede quitar la imagen de la clase del banner de la hoja de personaje y dejar solo el degradado." },
    ],
  },
  {
    version: "1.18",
    date: "2026-10-09",
    title: "Rasgos más claros en la hoja",
    items: [
      { tag: "mejora", text: "Los rasgos se señalan con el mismo código en la cabecera: ✦ para el rasgo de conjuro, etiqueta «+d6» de ventaja, «−d6» de desventaja, y flecha verde o roja con la cantidad cuando el rasgo sube o baja por la forma, el equipo o la evolución." },
    ],
  },
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
