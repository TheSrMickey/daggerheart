// Piezas del Mapa de mundo (Hexagon Kit de Kenney, CC0). h = altura de la cara superior de la loseta.
export const worldKey = (id) => "campaign-world:" + id;
export const WORLD_RADIUS = 9;

export const WORLD_CATS = [
  { key: "terreno", label: "Terreno" },
  { key: "lugares", label: "Lugares" },
  { key: "detalles", label: "Detalles" },
];

// Terreno y lugares ocupan toda la casilla; los detalles se colocan encima.
export const WORLD_ITEMS = {
  terreno: [
    { k: "grass", n: "Hierba", h: 0.2 },
    { k: "grass-forest", n: "Bosque", h: 0.68 },
    { k: "grass-hill", n: "Colina", h: 0.8 },
    { k: "dirt", n: "Tierra", h: 0.1 },
    { k: "dirt-lumber", n: "Leñadores", h: 0.48 },
    { k: "sand", n: "Arena", h: 0.2 },
    { k: "sand-desert", n: "Desierto", h: 0.51 },
    { k: "sand-rocks", n: "Arena y rocas", h: 0.24 },
    { k: "stone", n: "Piedra", h: 0.2 },
    { k: "stone-hill", n: "Colina rocosa", h: 0.64 },
    { k: "stone-mountain", n: "Montaña", h: 1.09 },
    { k: "stone-rocks", n: "Rocas", h: 0.41 },
    { k: "water", n: "Agua", h: 0.1 },
    { k: "water-rocks", n: "Agua con rocas", h: 0.26 },
    { k: "water-island", n: "Isla", h: 0.24 },
    { k: "river-straight", n: "Río recto", h: 0.2 },
    { k: "river-corner", n: "Río curvo", h: 0.2 },
    { k: "river-start", n: "Nacimiento", h: 0.2 },
    { k: "river-end", n: "Desembocadura", h: 0.2 },
    { k: "river-crossing", n: "Cruce de ríos", h: 0.2 },
    { k: "bridge", n: "Puente", h: 0.54 },
  ],
  lugares: [
    { k: "building-village", n: "Aldea", h: 0.6 },
    { k: "building-house", n: "Casa", h: 0.6 },
    { k: "building-cabin", n: "Cabaña", h: 0.77 },
    { k: "building-castle", n: "Castillo", h: 0.8 },
    { k: "building-tower", n: "Torre", h: 1.02 },
    { k: "building-wizard-tower", n: "Torre de mago", h: 1.09 },
    { k: "building-walls", n: "Murallas", h: 0.64 },
    { k: "building-market", n: "Mercado", h: 0.58 },
    { k: "building-port", n: "Puerto", h: 0.72 },
    { k: "building-dock", n: "Embarcadero", h: 0.58 },
    { k: "building-farm", n: "Granja", h: 0.4 },
    { k: "building-sheep", n: "Ovejas", h: 0.33 },
    { k: "building-mill", n: "Molino", h: 0.88 },
    { k: "building-watermill", n: "Molino de agua", h: 0.52 },
    { k: "building-mine", n: "Mina", h: 0.54 },
    { k: "building-smelter", n: "Fundición", h: 0.6 },
    { k: "building-archery", n: "Campo de tiro", h: 0.92 },
  ],
  detalles: [
    { k: "path-straight", n: "Camino recto", h: 0.03 },
    { k: "path-corner", n: "Camino curvo", h: 0.03 },
    { k: "path-crossing", n: "Cruce de caminos", h: 0.03 },
    { k: "path-start", n: "Inicio de camino", h: 0.03 },
    { k: "path-end", n: "Fin de camino", h: 0.03 },
    { k: "unit-tree", n: "Árbol", h: 0.38 },
    { k: "unit-house", n: "Casita", h: 0.38 },
    { k: "unit-mansion", n: "Mansión", h: 0.38 },
    { k: "unit-tower", n: "Atalaya", h: 0.82 },
    { k: "unit-wall-tower", n: "Torre de muro", h: 0.35 },
    { k: "unit-mill", n: "Molino pequeño", h: 0.68 },
    { k: "unit-ship", n: "Barco", h: 0.16 },
    { k: "unit-ship-large", n: "Barco grande", h: 0.51 },
  ],
};

export const WORLD_ITEM = Object.fromEntries(Object.entries(WORLD_ITEMS).flatMap(([cat, list]) => list.map((i) => [i.k, { ...i, cat }])));

// Coordenadas axiales (q, r) → posición en el plano (casillas con punta hacia arriba, de 1 de ancho).
export const hexPos = (q, r) => [q + r / 2, 0.8660254 * r];
export const cellsInRadius = (R) => {
  const out = [];
  for (let q = -R; q <= R; q++) for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) out.push([q, r]);
  return out;
};
