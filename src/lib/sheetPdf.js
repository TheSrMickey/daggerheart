// Hoja de personaje para imprimir o guardar como PDF: A4 vertical, una sola página cuando cabe.
// Recibe los datos ya calculados (ver exportSheetPdf en DaggerheartApp) y devuelve el documento HTML.
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const boxes = (total, marked, color) => Array.from({ length: Math.max(0, total) }, (_, i) => `<i style="${i < marked ? `background:${color};border-color:${color}` : ""}"></i>`).join("");

export function sheetHtml(d) {
  const col = d.color || "#7A5AA6";
  const feat = (f) => `<p class="ft"><b>${esc(f.name)}.</b> ${esc(f.text)}</p>`;
  const sec = (title, body, cls = "") => (body ? `<section class="${cls}"><h3>${esc(title)}</h3>${body}</section>` : "");
  const traits = d.traits.map((t) => `<div class="tr${t.spell ? " sp" : ""}"><small>${esc(t.label)}</small><b>${t.value > 0 ? "+" + t.value : t.value}</b>${t.spell ? "<em>conjuro</em>" : ""}</div>`).join("");
  const weapons = d.weapons.map((w) => `<div class="it"><b>${esc(w.key)}</b> <span>${esc(w.kind)} · ${esc(w.hands)}</span><div>${esc(w.trait)} ${w.trait && w.trait !== "—" ? (w.traitValue > 0 ? "+" : "") + w.traitValue : ""} · ${esc(w.range)} · ${esc(w.damage)}</div>${w.feature ? `<p>${esc(w.feature)}</p>` : ""}</div>`).join("");
  const armor = d.armor ? `<div class="it"><b>${esc(d.armor.key)}</b> <span>Armadura · puntuación ${d.armor.score}</span>${d.armor.feature ? `<p>${esc(d.armor.feature)}</p>` : ""}</div>` : "";
  const exps = d.experiences.map((e) => `<div class="row"><span>${esc(e.text)}</span><b>${e.bonus > 0 ? "+" : ""}${e.bonus}</b></div>`).join("");
  const items = d.items.map((i) => `<li><b>${esc(i.name)}</b>${i.count > 1 ? " ×" + i.count : ""}${i.description ? ` <span>${esc(i.description)}</span>` : ""}</li>`).join("");
  const gold = d.gold.filter((g) => g.n > 0).map((g) => `${g.n} ${esc(g.n === 1 ? g.label.toLowerCase().replace(/s$/, "").replace("cofre", "cofre") : g.label.toLowerCase())}`).join(" · ");
  const cards = d.cards.map((c) => `<div class="cd"><div class="ch"><b>${esc(c.key)}</b><span>${esc(c.domain)} · Nv ${c.level}${c.recall != null ? " · ⚡" + c.recall : ""}${c.vault ? " · bóveda" : ""}</span></div><p>${esc(c.text)}</p></div>`).join("");
  const notes = d.notes.map((n) => `<p class="ft"><b>${esc(n.q)}</b> ${esc(n.a)}</p>`).join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(d.name)} · Hoja de personaje</title><style>
@page { size: A4 portrait; margin: 8mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; background: #fff; }
body { font: 8.2pt/1.34 "Inter", "Segoe UI", Arial, sans-serif; color: #1d1a24; width: 194mm; }
h1, h3 { font-family: Georgia, "Cinzel", serif; margin: 0; }
.hd { display: flex; align-items: flex-end; justify-content: space-between; gap: 8mm; border-bottom: 2.2pt solid ${col}; padding-bottom: 2mm; }
.hd h1 { font-size: 21pt; line-height: 1; letter-spacing: .01em; }
.hd .sub { margin-top: 1mm; font-size: 8.4pt; color: #4a4457; } .hd .sub b { color: ${col}; }
.hd .lv { text-align: right; font-size: 7pt; color: #6d6478; } .hd .lv b { display: block; font: 700 19pt/1 Georgia, serif; color: ${col}; }
.stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 2mm; margin: 2.5mm 0 2mm; }
.tr { border: 1pt solid #cfc8da; border-radius: 2mm; text-align: center; padding: 1.2mm 0 1mm; } .tr.sp { border-color: ${col}; background: ${col}14; }
.tr small { display: block; font-size: 6.2pt; text-transform: uppercase; letter-spacing: .08em; color: #6d6478; } .tr b { font: 700 15pt/1.1 Georgia, serif; } .tr em { display: block; font-size: 5.6pt; font-style: normal; color: ${col}; }
.vit { display: grid; grid-template-columns: 1fr 1.25fr 1.5fr 1fr; gap: 2mm; margin-bottom: 2.5mm; }
.bx { border: 1pt solid #cfc8da; border-radius: 2mm; padding: 1.3mm 2mm; } .bx small { display: block; font-size: 6pt; text-transform: uppercase; letter-spacing: .08em; color: #6d6478; margin-bottom: .6mm; }
.bx .big { font: 700 14pt/1 Georgia, serif; } .bx .th { display: flex; gap: 2mm; font-size: 7pt; } .bx .th span { flex: 1; text-align: center; } .bx .th b { display: block; font: 700 11pt/1.1 Georgia, serif; }
.pips { display: flex; flex-wrap: wrap; gap: .8mm; margin-top: .8mm; } .pips i { width: 3mm; height: 3mm; border: 1pt solid #8d88a3; border-radius: .6mm; display: block; } .pips.ci i { border-radius: 50%; }
.cols { column-count: 2; column-gap: 4.5mm; }
section { margin-bottom: 2.4mm; break-inside: auto; }
.ft, .it, .row, li, .cd, .tags { break-inside: avoid; }
h3 { font-size: 8.6pt; text-transform: uppercase; letter-spacing: .09em; color: ${col}; border-bottom: .8pt solid ${col}66; padding-bottom: .6mm; margin-bottom: 1mm; break-after: avoid; }
p { margin: 0; } .ft { margin-bottom: .9mm; } .ft b { color: #2b2236; }
.it { margin-bottom: 1.4mm; } .it b { font-size: 8pt; } .it span { color: #6d6478; font-size: 6.8pt; } .it div { color: #3a3347; } .it p { color: #5a5368; font-size: 7.5pt; }
.row { display: flex; justify-content: space-between; gap: 3mm; border-bottom: .5pt dotted #cfc8da; padding: .5mm 0; } .row b { color: ${col}; }
ul { list-style: none; margin: 0; padding: 0; } li { padding: .5mm 0; border-bottom: .5pt dotted #cfc8da; } li span { color: #6d6478; font-size: 6.8pt; }
.cd { break-inside: avoid; border-left: 1.6pt solid ${col}; padding: .2mm 0 .2mm 2mm; margin-bottom: 1.5mm; } .ch { display: flex; justify-content: space-between; gap: 2mm; } .ch b { font-size: 8pt; } .ch span { color: #6d6478; font-size: 6.6pt; white-space: nowrap; } .cd p { color: #3a3347; font-size: 7.5pt; }
.tags { margin-top: .6mm; } .tags span { display: inline-block; border: .8pt solid ${col}88; border-radius: 99px; padding: 0 2mm; margin: 0 1mm 0 0; font-size: 6.6pt; color: #3a3347; }
.foot { margin-top: 2mm; text-align: center; font-size: 6pt; color: #8d88a3; }
</style></head><body>
<div class="hd"><div><h1>${esc(d.name)}</h1><div class="sub"><b>${esc(d.cls)}</b>${d.subclass ? " · " + esc(d.subclass) : ""}${d.multi ? " · Multiclase " + esc(d.multi) : ""}${d.pronouns ? " · " + esc(d.pronouns) : ""}</div><div class="sub">${esc([d.ancestry, d.community, d.transformation].filter(Boolean).join(" · "))}</div></div><div class="lv"><b>Nv ${d.level}</b>Rango ${d.rank} · Competencia ${d.proficiency}</div></div>
<div class="stats">${traits}</div>
<div class="vit">
<div class="bx"><small>Evasión</small><div class="big">${esc(d.evasion)}</div></div>
<div class="bx"><small>Armadura · ${d.armorTotal}</small><div class="pips">${boxes(d.armorTotal, d.armorLeft, col)}</div></div>
<div class="bx"><small>Umbrales de daño</small><div class="th"><span>Menor<b>${d.minor}</b></span><span>Mayor<b>${d.major}</b></span><span>Grave<b>${d.severe}</b></span></div></div>
<div class="bx"><small>Esperanza · ${d.hope}/${d.hopeTotal}</small><div class="pips ci">${boxes(d.hopeTotal, d.hope, "#E3B04B")}</div></div>
</div>
<div class="vit" style="grid-template-columns:1fr 1fr">
<div class="bx"><small>Puntos de vida · ${d.hpMarked}/${d.hpTotal} marcados</small><div class="pips">${boxes(d.hpTotal, d.hpMarked, "#D9644E")}</div></div>
<div class="bx"><small>Estrés · ${d.stressMarked}/${d.stressTotal} marcados</small><div class="pips">${boxes(d.stressTotal, d.stressMarked, "#8E6FC4")}</div></div>
</div>
<div class="cols">
${sec("Armas y armadura", weapons + armor)}
${sec("Experiencias", exps)}
${d.conditions.length ? sec("Estados", `<div class="tags">${d.conditions.map((c) => `<span>${esc(c)}</span>`).join("")}</div>`) : ""}
${sec("Inventario", (items ? `<ul>${items}</ul>` : "") + (gold ? `<p class="ft" style="margin-top:1mm"><b>Oro:</b> ${gold}</p>` : ""))}
${sec("Trasfondo y conexiones", notes)}
${sec("Características", d.features.map(feat).join(""))}
${sec("Cartas de dominio", cards)}
</div>
<div class="foot">Enaris · hoja de ${esc(d.name)} · ${esc(d.date)}</div>
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
