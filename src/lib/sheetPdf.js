// Hoja de personaje para imprimir o guardar como PDF: A4 vertical, una sola página cuando cabe.
// Recibe los datos ya calculados (ver exportSheetPdf en DaggerheartApp) y devuelve el documento HTML.
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const boxes = (total, marked, color) => Array.from({ length: Math.max(0, total) }, (_, i) => `<i style="${i < marked ? `background:${color};border-color:${color}` : ""}"></i>`).join("");

const LOGO = (c) => `<svg class="logo" viewBox="0 0 200 340" aria-hidden="true"><path fill="${c}" d="M100 0C101.5 66 106 109 200 115C106 121 102 164 100 340C98 164 94 121 0 115C94 109 98.5 66 100 0Z"/></svg>`;
const lines = (n, cls = "") => Array.from({ length: n }, () => `<div class="ln ${cls}"></div>`).join("");
const TRAIT_ACTIONS = { Agilidad: ["Esprintar", "Saltar", "Maniobrar"], Fuerza: ["Levantar", "Golpear", "Agarrar"], Destreza: ["Controlar", "Esconderse", "Manipular"], Instinto: ["Percibir", "Intuir", "Orientarse"], Presencia: ["Encantar", "Actuar", "Engañar"], Conocimiento: ["Recordar", "Analizar", "Comprender"] };
const TIERS = [
  { t: 2, lv: "Niveles 2–4", head: "En el nivel 2, gana una Experiencia adicional con +2 y un +1 a tu Competencia.", opts: ["Gana +1 en dos rasgos sin marcar y márcalos.", "Gana permanentemente un hueco de Punto de vida.", "Gana permanentemente un hueco de Estrés.", "Gana +1 en dos Experiencias.", "Elige una carta de dominio adicional de nivel igual o inferior (hasta nivel 4).", "Gana permanentemente +1 de Evasión."] },
  { t: 3, lv: "Niveles 5–7", head: "En el nivel 5, gana una Experiencia adicional con +2, borra las marcas de rasgos y gana +1 a tu Competencia.", opts: ["Gana +1 en dos rasgos sin marcar y márcalos.", "Gana permanentemente un hueco de Punto de vida.", "Gana permanentemente un hueco de Estrés.", "Gana +1 en dos Experiencias.", "Elige una carta de dominio adicional de nivel igual o inferior (hasta nivel 7).", "Gana permanentemente +1 de Evasión.", "Toma una carta de subclase mejorada y tacha esta opción en este rango.", "Aumenta tu Competencia en +1.", "Multiclase: elige otra clase y tacha una opción sin usar."] },
  { t: 4, lv: "Niveles 8–10", head: "En el nivel 8, gana una Experiencia adicional con +2, borra las marcas de rasgos y gana +1 a tu Competencia.", opts: ["Gana +1 en dos rasgos sin marcar y márcalos.", "Gana permanentemente un hueco de Punto de vida.", "Gana permanentemente un hueco de Estrés.", "Gana +1 en dos Experiencias.", "Elige una carta de dominio adicional de nivel igual o inferior.", "Gana permanentemente +1 de Evasión.", "Toma una carta de subclase mejorada y tacha esta opción en este rango.", "Aumenta tu Competencia en +1.", "Multiclase: elige otra clase y tacha una opción sin usar."] },
];

export function sheetHtml(d) {
  const col = d.color || "#7A5AA6";
  const sign = (n) => (n > 0 ? "+" + n : String(n));
  const marks = d.marks || [];
  const feat = (f) => `<p class="ft"><b>${esc(f.name)}.</b> ${esc(f.text)}</p>`;
  const traits = d.traits.map((t) => `<div class="tc"><div class="th2"><span>${esc(t.label)}</span><i class="${marks.includes(t.label) ? "on" : ""}"></i></div><div class="tv${t.spell ? " sp" : ""}">${sign(t.value)}${t.spell ? "<em>conjuro</em>" : ""}</div><div class="ta">${(TRAIT_ACTIONS[t.label] || []).map((a) => `<span>${a}</span>`).join("")}</div></div>`).join("");
  const slotRow = (n, marked, color, max = 12) => Array.from({ length: max }, (_, i) => `<i class="${i < n ? "sl" : "sl off"}" style="${i < marked ? `background:${color};border-color:${color}` : ""}"></i>`).join("");
  const armorUsed = Math.max(0, d.armorTotal - d.armorLeft);
  const armorSlots = Array.from({ length: 12 }, (_, i) => `<i class="ar${i < d.armorTotal ? "" : " off"}" style="${i < armorUsed ? `background:${col};border-color:${col}` : ""}"></i>`).join("");
  const diamonds = Array.from({ length: 6 }, (_, i) => `<i class="dm${i < d.hopeTotal ? "" : " off"}" style="${i < d.hope ? "background:#E3B04B;border-color:#E3B04B" : ""}"></i>`).join("");
  const exps = Array.from({ length: Math.max(5, d.experiences.length) }, (_, i) => d.experiences[i]).map((e) => `<div class="xr"><span>${e ? esc(e.text) : ""}</span><b>${e ? sign(e.bonus) : ""}</b></div>`).join("");
  const goldRow = (label, n, max, shape) => `<div class="gr"><div class="gp">${Array.from({ length: max }, (_, i) => `<i class="${shape}" style="${i < n ? `background:#E3B04B;border-color:#E3B04B` : ""}"></i>`).join("")}</div><small>${label}</small></div>`;
  const g = Object.fromEntries(d.gold.map((x) => [x.label, x.n]));
  const prim = d.weapons.find((w) => /principal/i.test(w.kind));
  const sec = d.weapons.find((w) => /secundaria/i.test(w.kind));
  const wp = (w, label) => `<div class="wb"><div class="wl">${label}</div><div class="fl3"><div><b>${w ? esc(w.key) : ""}</b><small>Nombre</small></div><div><b>${w ? esc(w.trait) + (w.trait && w.trait !== "—" ? " " + sign(w.traitValue) : "") + " · " + esc(w.range) : ""}</b><small>Rasgo y alcance</small></div><div><b>${w ? esc(w.damage) : ""}</b><small>Dados y tipo de daño</small></div></div><div class="fe"><b>${w && w.feature ? esc(w.feature) : ""}</b><small>Característica</small></div></div>`;
  const invWeapons = (d.invWeapons || []).concat([null, null]).slice(0, 2).map((w) => `<div class="wb"><div class="wl">Arma de inventario <span class="ck"><i></i>Principal <i></i>Secundaria</span></div><div class="fl3"><div><b>${w ? esc(w.key) : ""}</b><small>Nombre</small></div><div><b>${w ? esc(w.trait) + " · " + esc(w.range) : ""}</b><small>Rasgo y alcance</small></div><div><b>${w ? esc(w.damage) : ""}</b><small>Dados y tipo de daño</small></div></div><div class="fe"><b>${w && w.feature ? esc(w.feature) : ""}</b><small>Característica</small></div></div>`).join("");
  const itemRows = Array.from({ length: Math.max(5, d.items.length) }, (_, i) => d.items[i]).map((i) => `<div class="xr"><span>${i ? `<b>${esc(i.name)}</b>${i.count > 1 ? " ×" + i.count : ""}${i.description ? ` <em>${esc(i.description)}</em>` : ""}` : ""}</span></div>`).join("");
  const card = (c) => `<div class="cd"><div class="ch"><b>${esc(c.key)}</b><span>${esc(c.domain)} · Nv ${c.level}${c.recall != null ? " · ⚡" + c.recall : ""}${c.vault ? " · bóveda" : ""}</span></div><p>${esc(c.text)}</p></div>`;
  const qa = (list) => list.map((n) => `<div class="qa"><b>${esc(n.q)}</b>${n.a ? `<p>${esc(n.a)}</p>` : lines(2)}</div>`).join("");
  const cfLen = (d.classFeatures || []).reduce((n, f) => n + f.name.length + f.text.length, 0);
  // Si el texto de clase no cabe en la página 1, allí se resume y la página 2 lo trae completo.
  const long = cfLen > 760;
  const cut = (t, n) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n)).replace(/[,;:.\s]+$/, "") + "…");
  const per = Math.floor(560 / Math.max(1, (d.classFeatures || []).length));
  const classFeat = (d.classFeatures || []).map((f) => feat(long ? { name: f.name, text: cut(f.text, per) } : f)).join("") + (long ? '<p class="ft"><em>Texto completo en la página 2.</em></p>' : "");
  const cfSize = long ? "7pt" : "7.8pt";
  const pg2Feats = [...(long ? d.classFeatures.map((f) => ({ name: f.name + " · Clase", text: f.text })) : []), ...d.features];
  const banner = `<div class="bnr"><div class="cn">${esc(d.cls || "Daggerheart")}</div><div class="dd">${esc((d.domains || []).join(" · "))}</div><div class="bl">${LOGO("#fff")}<span>ENARIS</span></div></div>`;
  const fields = (pg) => `<div class="flds"><div class="f w2"><b>${esc(d.name)}</b><small>Nombre</small></div><div class="f"><b>${esc(d.pronouns)}</b><small>Pronombres</small></div><div class="f w2"><b>${esc([d.ancestry, d.community, d.transformation].filter(Boolean).join(" · "))}</b><small>Herencia</small></div><div class="f"><b>${esc(d.cls)}${d.subclass ? " · " + esc(d.subclass) : ""}${d.multi ? " + " + esc(d.multi) : ""}</b><small>Clase y subclase</small></div></div><div class="lvl"><b>${d.level}</b><small>Nivel</small></div>`;
  const weight = pg2Feats.reduce((n, f) => n + f.name.length + f.text.length, 0) + d.cards.reduce((n, c) => n + c.text.length, 0);
  // Cartas para recortar: 9 por hoja (3 × 3), tamaño de carta de juego (63,5 × 88,9 mm), con líneas de corte.
  const cutDom = (c) => `<div class="cc" style="--k:${esc(c.color || col)}"><div class="ca">${c.image ? `<img src="${esc(c.image)}" alt="">` : ""}<b class="cg">${c.level}</b><span class="ctp">${esc(c.type || "")}</span></div><div class="cn2">${esc(c.key)}</div><div class="cb2" style="font-size:${c.text.length > 520 ? "5.1pt" : c.text.length > 380 ? "5.5pt" : c.text.length > 260 ? "5.8pt" : "6.3pt"}">${esc(c.text)}</div><div class="cf2"><span>${esc(c.domain)}</span><span>⚡ ${c.recall ?? "–"}${c.vault ? " · bóveda" : ""}</span></div></div>`;
  const cutGear = (g) => `<div class="cc gear" style="--k:${esc(g.color || col)}"><div class="gh"><span>${esc(g.kind)}</span><i>${esc(g.tier || "")}</i></div><div class="cn2">${esc(g.key)}</div><div class="gbig">${esc(g.big)}</div><div class="gsub">${esc(g.sub)}</div><div class="cb2">${esc(g.feature || "")}</div><div class="cf2"><span>${esc(g.foot || "")}</span><span>Enaris</span></div></div>`;
  const cutAll = d.cutPack ? d.cutPack.cells.map((h) => `<div class="cell">${h}</div>`) : [...(d.cut?.domain || []).map(cutDom), ...(d.cut?.gear || []).map(cutGear)];
  const cutPages = Array.from({ length: Math.ceil(cutAll.length / 9) }, (_, i) => cutAll.slice(i * 9, i * 9 + 9));
  const cutHtml = cutPages.map((pg, i) => `<div class="pg cut"><div class="cgrid">${pg.join("")}</div><div class="foot">${LOGO("#8d88a3")} Recorta por las líneas discontinuas · cartas de ${esc(d.name)} · hoja ${i + 1}/${cutPages.length}</div></div>`).join("");
  const sh = (t) => `<div class="sh"><span>${t}</span></div>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="${esc(d.origin || "")}/"><title>${esc(d.name)} · Hoja de personaje</title>${d.cutPack ? d.cutPack.styles : ""}<style>
@page { size: A4 portrait; margin: 8mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; background: #fff; }
body { font: 7.8pt/1.3 "Inter", "Segoe UI", Arial, sans-serif; color: #1d1a24; width: 194mm; }
h1, h3 { margin: 0; } p { margin: 0; } em { font-style: normal; color: #6d6478; font-size: 6.6pt; } small { font-size: 5.8pt; text-transform: uppercase; letter-spacing: .1em; color: #6d6478; }
:root { --dk: #3b3a3f; --ln: #b9b4c4; }
.pg { width: 194mm; min-height: 0; display: flex; flex-direction: column; gap: 2.6mm; break-after: page; } .pg:last-child { break-after: auto; } .pg.p1 { height: 280mm; overflow: hidden; }
.top, .def { flex: none; }
.top { display: grid; grid-template-columns: 56mm 1fr 19mm; gap: 2.4mm; height: 21mm; align-items: stretch; margin-bottom: .6mm; }
.bnr { position: relative; background: var(--dk); color: #fff; border-radius: 1.6mm 6mm 1.6mm 1.6mm; padding: 2mm 3.4mm; display: flex; flex-direction: column; justify-content: center; border-bottom: 1.4mm solid ${col}; } .bnr .cn { font: 800 16pt/1 "Inter", Arial, sans-serif; letter-spacing: .03em; text-transform: uppercase; } .bnr .dd { margin-top: 1mm; font-size: 7pt; letter-spacing: .14em; text-transform: uppercase; color: #d8d4e0; } .bnr .bl { position: absolute; right: 3mm; top: 2mm; display: flex; flex-direction: column; align-items: center; gap: .6mm; } .bnr .bl .logo { width: 3.6mm; height: 6.1mm; } .bnr .bl span { font: 700 5.2pt/1 Georgia, serif; letter-spacing: .24em; padding-left: .24em; color: #e9e5f0; }
.flds { display: grid; grid-template-columns: 1.45fr 1fr; grid-template-rows: 1fr 1fr; gap: 1.8mm; min-width: 0; } .f { border: 1.1pt solid var(--ln); border-radius: 1.4mm; padding: .4mm 2mm 0; display: flex; flex-direction: column; justify-content: space-between; min-height: 0; min-width: 0; overflow: hidden; } .f b { font-size: 7.8pt; padding-top: .8mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .f small { margin-bottom: .5mm; }
.lvl { background: var(--dk); color: #fff; border-radius: 1.6mm 1.6mm 6mm 6mm; text-align: center; display: flex; flex-direction: column; justify-content: center; border-bottom: 1.4mm solid ${col}; } .lvl b { font: 800 19pt/1 Georgia, serif; } .lvl small { color: #d8d4e0; margin-top: .6mm; }
.def { display: grid; grid-template-columns: 22mm 34mm 1fr; gap: 3mm; padding-bottom: 2.6mm; border-bottom: 1.1pt solid var(--ln); }
.shld { border: 1.4pt solid var(--dk); border-radius: 2mm 2mm 7mm 7mm; text-align: center; display: flex; flex-direction: column; justify-content: space-between; height: 30mm; padding-top: 3mm; overflow: hidden; } .shld b { font: 800 22pt/1 Georgia, serif; } .shld span { background: var(--dk); color: #fff; font: 700 6.6pt/1 Arial; letter-spacing: .16em; text-transform: uppercase; padding: 1.6mm 0; }
.arm { display: grid; grid-template-columns: 19mm 1fr; gap: 1.6mm; } .arm .shld span { font-size: 5.4pt; letter-spacing: .05em; } .arm .slots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2mm; align-content: start; padding-top: 1.5mm; } .ar { display: block; width: 100%; aspect-ratio: 1; border: 1.1pt solid var(--dk); border-radius: 1mm 1mm 50% 50%; } .ar.off { border-style: dashed; border-color: #cfcad8; }
.tcs { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1.8mm; } .tc { display: flex; flex-direction: column; align-items: stretch; }
.th2 { display: flex; align-items: center; justify-content: space-between; gap: 1mm; background: var(--dk); color: #fff; border-radius: 1.2mm 1.2mm 0 0; padding: .9mm 1.2mm .9mm 1.4mm; font: 700 5.2pt/1 Arial; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; } .th2 i { flex: none; width: 2.8mm; height: 2.8mm; border-radius: 50%; border: 1pt solid #fff; background: #fff; display: block; } .th2 i.on { background: ${col}; }
.tv { border: 1.4pt solid var(--dk); border-top: 0; border-radius: 0 0 4mm 4mm; text-align: center; font: 800 18pt/1 Georgia, serif; padding: 2.4mm 0 2mm; position: relative; } .tv.sp { background: ${col}14; } .tv em { display: block; font: 600 5.4pt Arial; color: ${col}; letter-spacing: .08em; text-transform: uppercase; margin-top: .6mm; }
.ta { display: flex; flex-direction: column; align-items: center; margin-top: 1.4mm; font-size: 6.6pt; color: #4a4457; line-height: 1.4; }
.main { display: grid; grid-template-columns: 78mm 1fr; gap: 3.6mm; flex: 1; min-height: 0; } .colx { display: flex; flex-direction: column; gap: 2.6mm; min-height: 0; }
.sh { display: flex; justify-content: center; margin-bottom: 1.4mm; } .sh span { background: var(--dk); color: #fff; font: 800 8pt/1 Arial; letter-spacing: .14em; text-transform: uppercase; padding: 1.4mm 7mm; clip-path: polygon(4mm 0, calc(100% - 4mm) 0, 100% 50%, calc(100% - 4mm) 100%, 4mm 100%, 0 50%); }
.pnl { border: 1.1pt solid var(--ln); border-radius: 2mm; padding: 1.4mm 2.4mm 2mm; } .pnl.grow { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.cap { text-align: center; font-size: 6.4pt; color: #6d6478; margin-bottom: 1.6mm; }
.thr { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.6mm; margin-bottom: 2mm; } .thr div { background: var(--dk); color: #fff; text-align: center; border-radius: 1mm; padding: 1mm 0 .8mm; } .thr b { display: block; font: 800 12pt/1.1 Georgia, serif; } .thr span { font: 700 5.8pt Arial; letter-spacing: .1em; text-transform: uppercase; } .thr small { color: #d8d4e0; font-size: 5.2pt; display: block; }
.bars { display: flex; align-items: center; gap: 2mm; margin: 1.2mm 0; } .bars b { width: 11mm; font: 800 7.6pt Arial; letter-spacing: .06em; } .bars .rw { display: flex; gap: .9mm; flex: 1; } .sl { display: block; flex: 1; height: 4.2mm; border: 1.1pt solid var(--dk); border-radius: 1.4mm; } .sl.off { border-style: dashed; border-color: #cfcad8; }
.hope { display: flex; gap: 2mm; justify-content: center; margin: 1mm 0 1.4mm; } .dm { display: block; width: 5.4mm; height: 5.4mm; border: 1.2pt solid var(--dk); transform: rotate(45deg) scale(.82); border-radius: .6mm; } .dm.off { border-style: dashed; border-color: #cfcad8; }
.xr { display: flex; align-items: flex-end; justify-content: space-between; gap: 2mm; border-bottom: .8pt solid var(--ln); min-height: 5.6mm; padding: 0 1mm .3mm; font-size: 8pt; } .xr > b { font-size: 8.4pt; color: ${col}; min-width: 7mm; text-align: right; } .xr em { margin-left: 1mm; }
.gr { display: flex; align-items: flex-end; gap: 2mm; margin-bottom: 1.4mm; } .gr small { width: 14mm; text-align: right; } .gp { display: flex; gap: .8mm; flex: 1; } .gp i { display: block; width: 100%; max-width: 4.6mm; aspect-ratio: 1; border: 1.1pt solid var(--dk); } .gp i.c { border-radius: 50%; } .gp i.b { border-radius: 1.4mm 1.4mm 50% 50%; } .gp i.x { border-radius: .8mm; }
.cf { flex: 1; min-height: 0; overflow: hidden; } .ft { margin-bottom: 1.2mm; } .ft b { color: #2b2236; }
.prof { display: flex; align-items: center; justify-content: center; gap: 1.2mm; margin: -.4mm 0 1.4mm; font: 700 6.4pt Arial; letter-spacing: .1em; text-transform: uppercase; } .prof i { width: 3.4mm; height: 3.4mm; border-radius: 50%; border: 1.1pt solid var(--dk); display: block; }
.wb { margin-bottom: 2.2mm; } .wl { font: 800 8pt Arial; letter-spacing: .06em; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; margin-bottom: .6mm; } .ck { font: 600 6pt Arial; letter-spacing: .04em; } .ck i { display: inline-block; width: 2.6mm; height: 2.6mm; border: 1pt solid var(--dk); margin: 0 1mm 0 2mm; vertical-align: -.5mm; }
.fl3 { display: grid; grid-template-columns: 1.2fr 1.4fr 1.4fr; gap: 2mm; } .fl3 > div, .fe { border-bottom: 1.1pt solid var(--dk); min-height: 6.2mm; display: flex; flex-direction: column; justify-content: flex-end; } .fl3 small, .fe small { border-top: 0; margin-top: .3mm; } .fl3 b { font-size: 8pt; } .fe { margin-top: 1.2mm; min-height: 8mm; } .fe b { font-size: 7pt; font-weight: 500; color: #3a3347; }
.ln { border-bottom: .8pt solid var(--ln); height: 5.6mm; } .ln.f1 { flex: 1; }
.fill { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; } .fill .ln { flex: 1; min-height: 5.4mm; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 3.4mm; } .tre { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.4mm; }
.feats { column-count: 2; column-gap: 4.5mm; } .feats .ft { break-inside: avoid; }
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 3mm; } .cd { break-inside: avoid; border: 1pt solid var(--ln); border-left: 2.4pt solid ${col}; border-radius: 1.4mm; padding: 1.2mm 2.2mm; } .ch { display: flex; justify-content: space-between; gap: 2mm; margin-bottom: .5mm; } .ch b { font: 700 8pt Georgia, serif; } .ch span { color: #6d6478; font-size: 6.2pt; white-space: nowrap; } .cd p { color: #3a3347; font-size: 7pt; }
.qa { margin-bottom: 1.6mm; break-inside: avoid; } .qa b { font-size: 7.2pt; color: #2b2236; display: block; } .qa p { color: #3a3347; font-size: 7.4pt; border-bottom: .8pt solid var(--ln); } .qa .ln { height: 4.4mm; }
.tier { border: 1.1pt solid var(--ln); border-radius: 2mm; overflow: hidden; } .tier .th3 { background: var(--dk); color: #fff; padding: 1.2mm 2mm; font: 800 7pt Arial; letter-spacing: .06em; text-transform: uppercase; } .tier .th3 span { font-weight: 500; } .tier .hd3 { font-style: italic; font-size: 6.4pt; text-align: center; padding: 1.2mm 2mm; background: #ebe8f0; } .tier ul { list-style: none; padding: 1.2mm 2mm 1.4mm; margin: 0; } .tier li { display: flex; gap: 1.6mm; font-size: 6.2pt; line-height: 1.25; margin-bottom: .7mm; } .tier li i { flex: none; width: 2.8mm; height: 2.8mm; border: 1pt solid var(--dk); border-radius: .5mm; margin-top: .3mm; }
.desc div { display: flex; align-items: flex-end; gap: 2mm; font-size: 7pt; } .desc b { white-space: nowrap; }
.pg.cmp .feats { font-size: 6.5pt !important; } .pg.cmp .cd p { font-size: 6.4pt; } .pg.cmp .cd { padding: .8mm 2mm; } .pg.cmp .qa .ln { height: 3.6mm; } .pg.cmp .tier li { font-size: 5.8pt; margin-bottom: .4mm; } .pg.cmp .tier .hd3 { font-size: 5.8pt; padding: .6mm 2mm; } .pg.cmp .pnl { padding-bottom: 1.2mm; } .pg.cmp .desc { display: none; } .pg.cmp .sh { margin-bottom: 1mm; }
.pg.cut { height: 280mm; overflow: hidden; gap: 0; } .cgrid { width: 100%; display: grid; grid-template-columns: repeat(3, 63.5mm); grid-auto-rows: 88.9mm; justify-content: center; align-content: start; margin-top: 4mm; }
.cell { position: relative; width: 63.5mm; height: 88.9mm; overflow: hidden; border-radius: 4.65mm; background: #fff; } .cell::after { content: ""; position: absolute; inset: 0; border: .8pt dashed #fff; border-radius: 4.65mm; mix-blend-mode: difference; pointer-events: none; z-index: 9; } .cell > * { transform: scale(.8); transform-origin: 0 0; margin: 0 !important; box-shadow: none !important; width: 300px !important; height: 420px !important; max-width: none !important; }
.cc { position: relative; width: 63.5mm; height: 88.9mm; border: .5pt dashed #8a8497; padding: 2.2mm; display: flex; flex-direction: column; overflow: hidden; background: #fff; } .cc::before { content: ""; position: absolute; inset: 1.4mm; border: 1.6pt solid var(--k); border-radius: 3mm; pointer-events: none; }
.ca { position: relative; height: 30mm; margin: .4mm; border-radius: 2.2mm 2.2mm 0 0; background: linear-gradient(135deg, var(--k), #2b2236); overflow: hidden; } .ca img { width: 100%; height: 100%; object-fit: cover; display: block; } .cg { position: absolute; left: 2mm; top: 0; background: var(--k); color: #fff; font: 800 10pt/1 Georgia, serif; padding: 1.4mm 1.6mm 2.4mm; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 1mm), 0 100%); } .ctp { position: absolute; left: 50%; bottom: 1.4mm; transform: translateX(-50%); background: var(--k); color: #fff; font: 800 5.6pt Arial; letter-spacing: .16em; text-transform: uppercase; padding: .6mm 3mm; border-radius: 99px; }
.cn2 { font: 700 9.6pt/1.15 Georgia, serif; text-align: center; margin: 2mm 2mm .8mm; } .cb2 { flex: 1; font-size: 6.1pt; line-height: 1.28; color: #2b2a35; text-align: center; padding: 0 2.4mm; overflow: hidden; } .cf2 { display: flex; justify-content: space-between; font-size: 5.8pt; color: #6d6478; padding: 0 3mm 1.6mm; }
.cc.gear .gh { display: flex; justify-content: space-between; align-items: center; background: var(--k); color: #fff; margin: .4mm; padding: 2.6mm 3mm; border-radius: 2.2mm 2.2mm 0 0; font: 800 6.4pt Arial; letter-spacing: .14em; text-transform: uppercase; } .gh i { font-style: normal; opacity: .9; } .gbig { text-align: center; font: 800 20pt/1.1 Georgia, serif; margin-top: 1mm; color: var(--k); } .gsub { text-align: center; font-size: 6.6pt; color: #4a4457; margin-bottom: 1.6mm; }
.foot { text-align: center; font-size: 6pt; color: #8d88a3; display: flex; align-items: center; justify-content: center; gap: 2mm; } .foot .logo { width: 2mm; height: 3.4mm; }
</style></head><body>
<div class="pg p1">
<div class="top">${banner}${fields(1)}</div>
<div class="def">
<div class="shld"><b>${esc(d.evasion)}</b><span>Evasión</span></div>
<div class="arm"><div class="shld"><b>${d.armorTotal}</b><span>Armadura</span></div><div class="slots">${armorSlots}</div></div>
<div class="tcs">${traits}</div>
</div>
<div class="main">
<div class="colx">
<div class="pnl">${sh("Daño y salud")}<div class="cap">Suma tu nivel actual a tus umbrales de daño.</div>
<div class="thr"><div><span>Daño menor</span><b>${d.minor}</b><small>Marca 1 PV</small></div><div><span>Daño mayor</span><b>${d.major}</b><small>Marca 2 PV</small></div><div><span>Daño grave</span><b>${d.severe}</b><small>Marca 3 PV</small></div></div>
<div class="bars"><b>PV</b><div class="rw">${slotRow(d.hpTotal, d.hpMarked, "#D9644E")}</div></div>
<div class="bars"><b>ESTRÉS</b><div class="rw">${slotRow(d.stressTotal, d.stressMarked, "#8E6FC4")}</div></div></div>
<div class="pnl">${sh("Esperanza")}<div class="cap">Gasta 1 Esperanza para usar una experiencia o ayudar a un aliado.</div><div class="hope">${diamonds}</div>${d.hopeFeature ? `<p class="ft" style="margin-top:2mm"><b>${esc(d.hopeFeature.name)}:</b> ${esc(d.hopeFeature.text)}</p>` : ""}</div>
<div class="pnl">${sh("Experiencia")}${exps}</div>
<div class="pnl">${sh("Oro")}${goldRow("Puñados", g["Puñados"] || 0, 10, "c")}${goldRow("Bolsas", g["Bolsas"] || 0, 9, "b")}${goldRow("Cofre", g["Cofres"] || 0, 1, "x")}</div>
<div class="pnl grow">${sh("Característica de clase")}<div class="cf" style="font-size:${cfSize}">${classFeat}</div></div>
</div>
<div class="colx">
<div class="pnl">${sh("Armas activas")}<div class="prof">Competencia ${Array.from({ length: 6 }, (_, i) => `<i style="${i < d.proficiency ? `background:${col};border-color:${col}` : ""}"></i>`).join("")}</div>${wp(prim, "Principal")}${wp(sec, "Secundaria")}</div>
<div class="pnl">${sh("Armadura activa")}<div class="wb"><div class="fl3" style="grid-template-columns:1.6fr 1.2fr 1fr"><div><b>${d.armor ? esc(d.armor.key) : ""}</b><small>Nombre</small></div><div><b>${d.armor ? d.armor.major + " / " + d.armor.severe : ""}</b><small>Umbrales base</small></div><div><b>${d.armor ? d.armor.score : ""}</b><small>Puntuación base</small></div></div><div class="fe"><b>${d.armor && d.armor.feature ? esc(d.armor.feature) : ""}</b><small>Característica</small></div></div></div>
<div class="pnl">${sh("Inventario")}${itemRows}</div>
<div class="pnl grow">${invWeapons}</div>
</div>
</div>
<div class="foot">${LOGO("#8d88a3")} Enaris · hoja de ${esc(d.name)} · ${esc(d.date)} · 1/2</div>
</div>
<div class="pg ${weight > 2900 ? "cmp" : ""}">
<div class="top">${banner}${fields(2)}</div>
<div class="pnl">${sh("Características")}<div class="feats" style="font-size:${pg2Feats.reduce((n, f) => n + f.name.length + f.text.length, 0) > 2600 ? "6.8pt" : "7.8pt"}">${pg2Feats.map(feat).join("")}</div></div>
<div class="pnl">${sh("Cartas de dominio")}<div class="cards">${d.cards.map(card).join("") || '<p class="ft"><em>Sin cartas de dominio.</em></p>'}</div></div>
<div class="two">
<div class="pnl">${sh("Preguntas de trasfondo")}${qa(d.background)}</div>
<div class="pnl">${sh("Conexiones")}${qa(d.connections)}<div class="desc" style="margin-top:2mm"><div><b>Ropa:</b><span class="ln" style="flex:1"></span></div><div><b>Ojos:</b><span class="ln" style="flex:1"></span></div><div><b>Cuerpo:</b><span class="ln" style="flex:1"></span></div><div><b>Piel:</b><span class="ln" style="flex:1"></span></div><div><b>Actitud:</b><span class="ln" style="flex:1"></span></div></div></div>
</div>
<div class="tre">${TIERS.map((t) => `<div class="tier"><div class="th3">Rango ${t.t} <span>· ${t.lv}</span></div><div class="hd3">${t.head}</div><ul>${t.opts.map((o) => `<li><i></i><span>${o}</span></li>`).join("")}</ul></div>`).join("")}</div>
<div class="foot">${LOGO("#8d88a3")} Enaris · hoja de ${esc(d.name)} · ${esc(d.date)} · 2/2</div>
</div>
${cutHtml}
</body></html>`;
}

// Abre el diálogo de impresión con la hoja (en el diálogo se elige «Guardar como PDF»).
export function printSheet(d) {
  const html = sheetHtml(d);
  try { window.__lastSheetPdfHtml = html; } catch (e) {}
  const fr = document.createElement("iframe");
  fr.setAttribute("aria-hidden", "true");
  fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(fr);
  const w = fr.contentWindow;
  w.document.open();
  w.document.write(html);
  w.document.close();
  const done = () => setTimeout(() => fr.remove(), 1500);
  w.addEventListener("afterprint", done);
  // Espera a que carguen las ilustraciones de las cartas (máx. 4 s) y abre la impresión.
  const imgs = [...w.document.images];
  const ready = Promise.race([Promise.all(imgs.map((im) => (im.complete ? 1 : new Promise((r) => { im.onload = im.onerror = r; })))), new Promise((r) => setTimeout(r, 4000))]);
  ready.then(() => setTimeout(() => {
    try { w.focus(); w.print(); } catch (e) {}
    setTimeout(done, 60000);
  }, 250));
  return html;
}
