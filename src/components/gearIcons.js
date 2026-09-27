// Iconos de armas y armaduras para la carta abierta.
// Los que existen en lucide se usan tal cual; el resto se dibuja con el mismo estilo (24×24, trazo redondeado).
import { createElement as h } from "react";
import { Axe, BowArrow, Coins, FlaskConical, Flame, Hammer, HandCoins, HandFist, Package, Sword, WandSparkles } from "lucide-react";

const CUSTOM = {
  estoque: [
    ["path", { d: "M20.5 3.5 9.5 14.5" }],
    ["path", { d: "M7 12a4 4 0 0 0 5 5" }],
    ["path", { d: "M8.5 15.5 4.5 19.5" }],
    ["circle", { cx: 3.8, cy: 20.2, r: 1 }],
  ],
  daga: [
    ["path", { d: "M20 4 13.5 13 11 10.5Z" }],
    ["path", { d: "M8.5 9 15 15.5" }],
    ["path", { d: "M11.5 13 6.5 18" }],
    ["circle", { cx: 5.5, cy: 19, r: 1.2 }],
  ],
  maza: [
    ["path", { d: "M3.5 20.5 11.5 12.5" }],
    ["path", { d: "M2.5 19.5l2 2" }],
    ["circle", { cx: 15, cy: 9, r: 3.6 }],
    ["path", { d: "M15 2.4v3M21.6 9h-3M19.7 4.3l-2.1 2.1M10.3 4.3l2.1 2.1M19.7 13.7l-2.1-2.1" }],
  ],
  lanza: [
    ["path", { d: "M3.5 20.5 14 10" }],
    ["path", { d: "M14 10 15.2 5.8 21 3 18.2 8.8Z" }],
    ["path", { d: "M11.5 10.5l2 2" }],
  ],
  alabarda: [
    ["path", { d: "M4 21 17 6" }],
    ["path", { d: "M17 6 19.5 2.5 18.8 6.8Z" }],
    ["path", { d: "M13.2 10.4c1.6 2.6 5.2 3.2 7.6.9-.4-3.1-2.9-5.1-5.2-4.8" }],
    ["path", { d: "M13.6 7.2 10.8 5.4" }],
  ],
  ballesta: [
    ["path", { d: "M3.5 10Q12 3 20.5 10" }],
    ["path", { d: "M3.5 10 12 14.5 20.5 10" }],
    ["path", { d: "M12 4.5V21" }],
    ["path", { d: "M10.3 6.3 12 4.5l1.7 1.8" }],
    ["path", { d: "M10.5 18h3" }],
  ],
  baston: [
    ["path", { d: "M4 21 14 10" }],
    ["path", { d: "M14 10c-2.8-1.2-3-5.2-.4-6.8 2.4-1.5 5.8-.4 6.4 2.4.5 2.4-1.4 4.4-3.6 4" }],
    ["path", { d: "M16.4 6.1 17 4.8 17.6 6.1 17 7.4Z", fill: "currentColor" }],
    ["path", { d: "M8.5 15.5l1.5 1.5" }],
  ],
  cetro: [
    ["path", { d: "M4.5 20.5 13 12" }],
    ["circle", { cx: 16, cy: 9, r: 3.2 }],
    ["path", { d: "M14 4.6 16 2.5l2 2.1" }],
    ["path", { d: "M3.5 19.5l2 2" }],
  ],
  anillos: [
    ["circle", { cx: 9, cy: 15, r: 5 }],
    ["circle", { cx: 15.5, cy: 12.5, r: 4.5 }],
    ["path", { d: "M14 7.2 15.5 5l1.5 2.2" }],
  ],
  runas: [
    ["path", { d: "M7 3h9l3.5 5v10L16 21H8l-4-4V7Z" }],
    ["path", { d: "M10 6.5v11M10 8.5l4.5 3.2M10 14.7l4.5-3" }],
  ],
  canon: [
    ["path", { d: "M3 8.5h13a2.5 2.5 0 0 1 0 5H3Z" }],
    ["path", { d: "M18.5 7v8" }],
    ["path", { d: "M6.5 13.5 5 19h3.2l1.3-5.5" }],
    ["path", { d: "M3 8.5 1.8 5.5" }],
  ],
  latigo: [
    ["path", { d: "M2.5 19.5 4.5 21.5 8 18 6 16Z" }],
    ["path", { d: "M7 17c4-4 10-.5 12.5-4.5 2-3.2-1.2-6.6-4.6-5.2-2.4 1-2 4 .2 4.2 1.4.1 2-1.2 1.4-2.2" }],
  ],
  garfio: [
    ["path", { d: "M9 3h6M12 3v10" }],
    ["path", { d: "M12 13a5 5 0 1 1-6.2 4.8" }],
    ["path", { d: "M5.8 17.8 4 15.6M5.8 17.8l2.6-.6" }],
  ],
  escudoRedondo: [
    ["circle", { cx: 12, cy: 12, r: 9.5 }],
    ["circle", { cx: 12, cy: 12, r: 6.5 }],
    ["circle", { cx: 12, cy: 12, r: 2.2, fill: "currentColor", fillOpacity: 0.8 }],
    ["circle", { cx: 12, cy: 4, r: 0.6, fill: "currentColor" }],
    ["circle", { cx: 12, cy: 20, r: 0.6, fill: "currentColor" }],
    ["circle", { cx: 4, cy: 12, r: 0.6, fill: "currentColor" }],
    ["circle", { cx: 20, cy: 12, r: 0.6, fill: "currentColor" }],
  ],
  escudoTorre: [
    ["path", { d: "M5 4.5Q12 1.8 19 4.5V19.5Q12 22.2 5 19.5Z" }],
    ["path", { d: "M12 3.2V20.8M5 9.5Q12 7.5 19 9.5M5 14.5Q12 12.5 19 14.5" }],
  ],
  // Oro
  bolsa: [
    ["path", { d: "M8 5h8l-2 3c3 1.5 5 4.5 5 8a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5c0-3.5 2-6.5 5-8Z" }],
    ["path", { d: "M9.5 8h5" }],
  ],
  cofre: [
    ["rect", { x: 3, y: 9, width: 18, height: 11, rx: 1.5 }],
    ["path", { d: "M3 9a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5M3 13h18" }],
    ["rect", { x: 10.5, y: 11.5, width: 3, height: 3.5, rx: 0.6 }],
  ],
  // Armaduras
  gambeson: [
    ["path", { d: "M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" }],
    ["path", { d: "M8 12.5h8M8 15.5h8M8 18.5h8" }],
  ],
  cuero: [
    ["path", { d: "M8 2.5 4.5 4.8V20a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V4.8L16 2.5 12 8Z" }],
    ["path", { d: "M12 8v13" }],
    ["path", { d: "M10.5 11l3 1M10.5 14l3 1M10.5 17l3 1" }],
  ],
  malla: [
    ["path", { d: "M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" }],
    ...[9.5, 13, 16.5].flatMap((y, row) =>
      [8.8, 12, 15.2].map((x) => ["circle", { cx: row % 2 ? x + 0.8 : x, cy: y, r: 1.1 }])
    ).filter(([, a]) => a.cx < 16.5),
  ],
  placas: [
    ["path", { d: "M6 4c3 1.3 9 1.3 12 0v8.5c0 4.5-3 7.5-6 8.5-3-1-6-4-6-8.5Z" }],
    ["path", { d: "M12 5.3V21" }],
    ["path", { d: "M6 4 3 7.5l1.5 2.5M18 4l3 3.5-1.5 2.5" }],
    ["path", { d: "M8 11.5c2.5.9 5.5.9 8 0" }],
  ],
};

function custom(key) {
  function GearIcon({ size = 24, strokeWidth = 1.5 }) {
    return h(
      "svg",
      { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true },
      CUSTOM[key].map(([tag, attrs], i) => h(tag, { key: i, ...attrs }))
    );
  }
  GearIcon.displayName = "GearIcon_" + key;
  return GearIcon;
}
const ICONS = Object.fromEntries(Object.keys(CUSTOM).map((k) => [k, custom(k)]));

// Reglas por nombre (se comprueban en orden; el nombre incluye sufijos como "mejorada" o "legendaria").
const WEAPON_RULES = [
  [/^escudo redondo/i, ICONS.escudoRedondo],
  [/^escudo de torre/i, ICONS.escudoTorre],
  [/^estoque/i, ICONS.estoque],
  [/^(daga|hoja retornable)/i, ICONS.daga],
  [/^hacha/i, Axe],
  [/^martillo/i, Hammer],
  [/^maza/i, ICONS.maza],
  [/^guantelete/i, HandFist],
  [/^alabarda/i, ICONS.alabarda],
  [/^(lanza|pica)/i, ICONS.lanza],
  [/^arco/i, BowArrow],
  [/^ballesta/i, ICONS.ballesta],
  [/^(bastón|gran bastón)/i, ICONS.baston],
  [/^varita/i, WandSparkles],
  [/^cetro/i, ICONS.cetro],
  [/^anillos/i, ICONS.anillos],
  [/^runas/i, ICONS.runas],
  [/^cañón/i, ICONS.canon],
  [/^látigo/i, ICONS.latigo],
  [/^garfio/i, ICONS.garfio],
];
const ARMOR_RULES = [
  [/gambesón/i, ICONS.gambeson],
  [/cuero/i, ICONS.cuero],
  [/malla/i, ICONS.malla],
  [/placas/i, ICONS.placas],
];

export function weaponIcon(name) {
  return WEAPON_RULES.find(([re]) => re.test(name || ""))?.[1] || Sword;
}
export function armorIcon(name) {
  return ARMOR_RULES.find(([re]) => re.test(name || ""))?.[1] || ICONS.placas;
}
export const GEAR_ICON_LIST = { ...ICONS, espada: Sword, hacha: Axe, martillo: Hammer, guantelete: HandFist, arco: BowArrow, varita: WandSparkles };

// Monedas de oro, de mayor a menor valor.
export const GOLD_ICONS = { f_gold_thousands: ICONS.cofre, f_gold_hundreds: ICONS.bolsa, f_gold_tens: HandCoins, f_gold_units: Coins };

// Icono y color para un objeto del inventario, según su nombre.
export function itemVisual(name, { isWeapon, isArmor } = {}) {
  if (isArmor) return { Icon: armorIcon(name), color: "var(--acc)", kind: "Armadura" };
  if (isWeapon) return { Icon: weaponIcon(name), color: "var(--acc)", kind: "Arma" };
  if (/poci|elixir|t[oó]nico|frasco|brebaje|ung[uü]ento/i.test(name || "")) return { Icon: FlaskConical, color: "#D9644E", kind: "Consumible" };
  if (/antorcha|vela|farol|linterna/i.test(name || "")) return { Icon: Flame, color: "#E0823A", kind: "Equipo" };
  return { Icon: Package, color: "#C08B5C", kind: "Objeto" };
}
