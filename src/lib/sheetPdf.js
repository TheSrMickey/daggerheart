// Hoja de personaje para imprimir o guardar como PDF: A4 vertical, una sola página cuando cabe.
// Recibe los datos ya calculados (ver exportSheetPdf en DaggerheartApp) y devuelve el documento HTML.
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const boxes = (total, marked, color) => Array.from({ length: Math.max(0, total) }, (_, i) => `<i style="${i < marked ? `background:${color};border-color:${color}` : ""}"></i>`).join("");

const LOGO = (c) => `<svg class="logo" viewBox="0 0 200 340" aria-hidden="true"><path fill="${c}" d="M100 0C101.5 66 106 109 200 115C106 121 102 164 100 340C98 164 94 121 0 115C94 109 98.5 66 100 0Z"/></svg>`;
const lines = (n) => Array.from({ length: n }, () => `<div class="ln"></div>`).join("");

export function sheetHtml(d) {
  const col = d.color || "#7A5AA6";
  const feat = (f) => `<p class="ft"><b>${esc(f.name)}.</b> ${esc(f.text)}</p>`;
  const sign = (n) => (n > 0 ? "+" + n : String(n));
  const traits = d.traits.map((t) => `<div class="tr${t.spell ? " sp" : ""}"><div><small>${esc(t.label)}</small>${t.spell ? "<em>rasgo de conjuro</em>" : ""}</div><b>${sign(t.value)}</b></div>`).join("");
  const weapon = (w, label) => w
    ? `<div class="wp"><small>${label}</small><b>${esc(w.key)}</b><div class="mt">${esc(w.trait)}${w.trait && w.trait !== "—" ? " " + sign(w.traitValue) : ""} · ${esc(w.range)} · ${esc(w.hands)}</div><div class="dm">${esc(w.damage)}</div>${w.feature ? `<p>${esc(w.feature)}</p>` : ""}</div>`
    : `<div class="wp is-empty"><small>${label}</small><div class="ln"></div><div class="ln"></div></div>`;
  const prim = d.weapons.find((w) => /principal/i.test(w.kind));
  const sec = d.weapons.find((w) => /secundaria/i.test(w.kind));
  const armor = d.armor
    ? `<div class="wp"><small>Armadura</small><b>${esc(d.armor.key)}</b><div class="mt">Puntuación ${d.armor.score}</div>${d.armor.feature ? `<p>${esc(d.armor.feature)}</p>` : ""}</div>`
    : `<div class="wp is-empty"><small>Armadura</small><div class="ln"></div></div>`;
  const expRows = Array.from({ length: Math.max(5, d.experiences.length) }, (_, i) => d.experiences[i]);
  const exps = expRows.map((e) => `<div class="row">${e ? `<span>${esc(e.text)}</span><b>${sign(e.bonus)}</b>` : `<span></span><b class="mut">+</b>`}</div>`).join("");
  const slots = 5;
  const itemRows = Array.from({ length: Math.max(slots, d.items.length) }, (_, i) => d.items[i]);
  const items = itemRows.map((i) => `<div class="row">${i ? `<span><b>${esc(i.name)}</b>${i.count > 1 ? " ×" + i.count : ""}${i.description ? ` <em>${esc(i.description)}</em>` : ""}</span>` : `<span></span>`}</div>`).join("");
  const gold = d.gold.map((g) => `<div class="gd"><small>${esc(g.label)}</small><b>${g.n}</b></div>`).join("");
  const loadout = d.cards.filter((c) => !c.vault);
  const vault = d.cards.filter((c) => c.vault);
  const handRows = Array.from({ length: Math.max(5, loadout.length) }, (_, i) => loadout[i]);
  const hand = handRows.map((c) => `<div class="row">${c ? `<span><b>${esc(c.key)}</b> <em>${esc(c.domain)} · Nv ${c.level}</em></span><b>⚡${c.recall ?? "–"}</b>` : "<span></span>"}</div>`).join("");
  const card = (c) => `<div class="cd"><div class="ch"><b>${esc(c.key)}</b><span>${esc(c.domain)} · Nv ${c.level}${c.recall != null ? " · ⚡" + c.recall : ""}${c.vault ? " · bóveda" : ""}</span></div><p>${esc(c.text)}</p></div>`;
  const qa = (list) => list.map((n) => `<div class="qa"><b>${esc(n.q)}</b><p>${n.a ? esc(n.a) : ""}</p>${n.a ? "" : lines(1)}</div>`).join("");
  const head = (pg) => `<div class="hd"><div class="id"><h1>${esc(d.name)}</h1><div class="sub"><b>${esc(d.cls)}</b>${d.subclass ? " · " + esc(d.subclass) : ""}${d.multi ? " · Multiclase " + esc(d.multi) : ""}${d.pronouns ? " · " + esc(d.pronouns) : ""}</div><div class="sub">${esc([d.ancestry, d.community, d.transformation].filter(Boolean).join(" · "))}</div></div><div class="lv"><b>Nv ${d.level}</b>Rango ${d.rank} · Competencia ${d.proficiency}</div><div class="brand">${LOGO(col)}<span>ENARIS</span><small>Hoja de personaje · ${pg}/2</small></div></div>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(d.name)} · Hoja de personaje</title><style>
@page { size: A4 portrait; margin: 8mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; background: #fff; }
body { font: 8.2pt/1.34 "Inter", "Segoe UI", Arial, sans-serif; color: #1d1a24; width: 194mm; }
h1, h3 { font-family: Georgia, "Cinzel", serif; margin: 0; }
p { margin: 0; } em { font-style: normal; color: #6d6478; font-size: 6.9pt; } small { font-size: 6.2pt; text-transform: uppercase; letter-spacing: .09em; color: #6d6478; }
.pg { width: 194mm; min-height: 279mm; display: flex; flex-direction: column; gap: 3mm; break-after: page; } .pg:last-child { break-after: auto; } .pg.p1 { height: 279mm; overflow: hidden; } .pg.p1 .bot { min-height: 0; }
.hd { display: grid; grid-template-columns: 1fr auto auto; align-items: end; gap: 7mm; border-bottom: 2.2pt solid ${col}; padding-bottom: 2mm; }
.hd h1 { font-size: 22pt; line-height: 1; } .hd .sub { margin-top: 1mm; font-size: 8.6pt; color: #4a4457; } .hd .sub b { color: ${col}; }
.lv { text-align: right; font-size: 7pt; color: #6d6478; } .lv b { display: block; font: 700 20pt/1 Georgia, serif; color: ${col}; }
.brand { display: flex; flex-direction: column; align-items: center; gap: .3mm; padding-left: 5mm; border-left: .8pt solid #d9d3e2; } .brand .logo { width: 5.2mm; height: 8.8mm; } .brand span { font: 700 8.5pt/1 Georgia, serif; letter-spacing: .28em; color: #2b2236; padding-left: .28em; } .brand small { font-size: 5.4pt; letter-spacing: .06em; text-transform: none; }
.box { border: 1pt solid #cfc8da; border-radius: 2mm; padding: 1.8mm 2.4mm; background: #fff; }
h3 { font-size: 8.8pt; text-transform: uppercase; letter-spacing: .09em; color: ${col}; border-bottom: .8pt solid ${col}66; padding-bottom: .7mm; margin-bottom: 1.2mm; break-after: avoid; }
.top { display: grid; grid-template-columns: 58mm 1fr; gap: 3.5mm; }
.col { display: flex; flex-direction: column; gap: 3mm; min-width: 0; }
.tr { display: flex; align-items: center; justify-content: space-between; gap: 2mm; border: 1pt solid #cfc8da; border-radius: 2mm; padding: 0 3mm; flex: 1; min-height: 14mm; } .tr.sp { border-color: ${col}; background: ${col}12; }
.tr small { display: block; font-size: 7pt; color: #2b2236; font-weight: 700; } .tr em { display: block; color: ${col}; } .tr b { font: 700 21pt/1 Georgia, serif; min-width: 12mm; text-align: center; border-left: .8pt dotted #b6aec6; padding-left: 3mm; }
.dfn { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; } .dfn .big { font: 700 22pt/1 Georgia, serif; margin-top: .6mm; }
.th { display: flex; gap: 2mm; } .th span { flex: 1; text-align: center; font-size: 6.6pt; color: #6d6478; text-transform: uppercase; letter-spacing: .06em; } .th b { display: block; font: 700 15pt/1.1 Georgia, serif; color: #1d1a24; letter-spacing: 0; }
.pips { display: flex; flex-wrap: wrap; gap: 1mm; margin-top: 1mm; } .pips i { width: 4.4mm; height: 4.4mm; border: 1.1pt solid #8d88a3; border-radius: .9mm; display: block; } .pips.ci i { border-radius: 50%; }
.vit { display: flex; flex-direction: column; gap: 3mm; } .vit .box { padding: 1.6mm 2.4mm; } .vit small b { color: #1d1a24; }
.row { display: flex; justify-content: space-between; align-items: flex-end; gap: 3mm; border-bottom: .6pt solid #d9d3e2; min-height: 5.6mm; padding: .6mm 0 .4mm; } .row b { font-size: 8pt; } .row b.mut { color: #c9c2d6; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
.wp { border: 1pt solid #cfc8da; border-radius: 2mm; padding: 1.6mm 2.4mm; min-height: 19mm; } .wp b { display: block; font: 700 9.4pt/1.2 Georgia, serif; } .wp .mt { color: #4a4457; font-size: 7.2pt; } .wp .dm { font-weight: 700; color: ${col}; font-size: 8.6pt; } .wp p { color: #5a5368; font-size: 7pt; margin-top: .6mm; }
.gold { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin-top: 1.5mm; } .gd { border: 1pt solid #cfc8da; border-radius: 1.6mm; text-align: center; padding: .8mm 0; } .gd b { display: block; font: 700 11pt/1.1 Georgia, serif; }
.tags span { display: inline-block; border: .8pt solid ${col}88; border-radius: 99px; padding: 0 2.4mm; margin: 0 1.2mm 1mm 0; font-size: 7pt; }
.fill { flex: 1; display: flex; flex-direction: column; min-height: 22mm; } .fill .ln { flex: 1; min-height: 5.6mm; }
.ln { border-bottom: .6pt solid #d9d3e2; height: 5.8mm; }
.bot { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; flex: 1; } .bot > .box { display: flex; flex-direction: column; }
.ft { margin-bottom: 1.1mm; } .ft b { color: #2b2236; }
.feats { column-count: 2; column-gap: 4.5mm; } .feats .ft { break-inside: avoid; }
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 2.6mm 3.5mm; } .cd { break-inside: avoid; border: 1pt solid #cfc8da; border-left: 2.4pt solid ${col}; border-radius: 1.6mm; padding: 1.4mm 2.4mm; } .ch { display: flex; justify-content: space-between; gap: 2mm; margin-bottom: .6mm; } .ch b { font: 700 8.6pt Georgia, serif; } .ch span { color: #6d6478; font-size: 6.6pt; white-space: nowrap; } .cd p { color: #3a3347; font-size: 7.4pt; }
.qa { margin-bottom: 1.2mm; break-inside: avoid; } .qa b { font-size: 7.6pt; color: #2b2236; } .qa p { color: #3a3347; font-size: 7.8pt; border-bottom: .6pt solid #d9d3e2; min-height: 0; }
.foot { text-align: center; font-size: 6pt; color: #8d88a3; margin-top: auto; padding-top: 1.5mm; }
</style></head><body>
<div class="pg p1">
${head(1)}
<div class="top">
<div class="col">${traits}
<div class="dfn"><div class="box"><small>Evasión</small><div class="big">${esc(d.evasion)}</div></div><div class="box"><small>Armadura · ${d.armorTotal}</small><div class="pips">${boxes(d.armorTotal, d.armorLeft, col)}</div></div></div>
<div class="box"><small>Umbrales de daño</small><div class="th"><span>Menor<b>${d.minor}</b></span><span>Mayor<b>${d.major}</b></span><span>Grave<b>${d.severe}</b></span></div></div>
</div>
<div class="col">
<div class="vit">
<div class="box"><small>Puntos de vida · <b>${d.hpMarked}/${d.hpTotal}</b> marcados</small><div class="pips">${boxes(d.hpTotal, d.hpMarked, "#D9644E")}</div></div>
<div class="box"><small>Estrés · <b>${d.stressMarked}/${d.stressTotal}</b> marcados</small><div class="pips">${boxes(d.stressTotal, d.stressMarked, "#8E6FC4")}</div></div>
<div class="box"><small>Esperanza · <b>${d.hope}/${d.hopeTotal}</b></small><div class="pips ci">${boxes(d.hopeTotal, d.hope, "#E3B04B")}</div></div>
</div>
<div class="box"><h3>Experiencias</h3>${exps}</div>
<div class="two">${weapon(prim, "Arma principal")}${weapon(sec, "Arma secundaria")}</div>
${armor}
<div class="box"><h3>Inventario</h3>${items}<div class="gold">${gold}</div></div>
</div>
</div>
<div class="bot">
<div class="box"><h3>Estados y notas rápidas</h3>${d.conditions.length ? `<div class="tags">${d.conditions.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}<div class="fill">${lines(8)}</div></div>
<div class="box"><h3>Mano de dominio</h3>${hand}${vault.length ? `<p class="ft" style="margin-top:1.4mm"><em>Bóveda:</em> ${vault.map((c) => esc(c.key)).join(" · ")}</p>` : ""}</div>
</div>
<div class="foot">Enaris · ${esc(d.name)} · ${esc(d.date)}</div>
</div>
<div class="pg">
${head(2)}
<div class="box"><h3>Características</h3><div class="feats">${d.features.map(feat).join("")}</div></div>
<div class="box"><h3>Cartas de dominio</h3><div class="cards">${d.cards.map(card).join("") || '<p class="ft"><em>Sin cartas de dominio.</em></p>'}</div></div>
<div class="bot" style="grid-template-columns:1fr 1fr">
<div class="box"><h3>Trasfondo</h3>${qa(d.background)}<div class="fill">${lines(3)}</div></div>
<div class="box"><h3>Conexiones</h3>${qa(d.connections)}<div class="fill">${lines(3)}</div></div>
</div>
<div class="foot">Enaris · ${esc(d.name)} · ${esc(d.date)}</div>
</div>
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
  setTimeout(() => {
    try { w.focus(); w.print(); } catch (e) {}
    setTimeout(done, 60000);
  }, 350);
  return html;
}
