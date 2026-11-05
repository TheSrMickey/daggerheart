const fs=require("fs");const p="src/components/DaggerheartApp.jsx";let s=fs.readFileSync(p,"utf8");const crlf=s.includes("\r\n");s=s.split("\r\n").join("\n");
const r=(a,b)=>{if(s.split(a).length!==2)throw new Error("anchor "+a.slice(0,70));s=s.replace(a,()=>b)};
r('  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);','  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);\n  const [ccStep, setCcStep] = useState(0); // paso del asistente de nueva campaña\n  const [ccDir, setCcDir] = useState(1);');
r('    setNewCampaignStart("blank");\n    setShowNewCampaignForm(false);','    setNewCampaignStart("blank");\n    setCcStep(0);\n    setShowNewCampaignForm(false);');
// bloque del formulario
const a=s.indexOf('                      <section className="mh-cc-sec">\n                        <h3 className="mh-cc-h"><i>1</i> Cómo empezar</h3>');
const endMark='                      </section>\n                    </div>\n\n                    <aside className="mh-cc-side">';
const b=s.indexOf(endMark);
if(a<0||b<0)throw new Error("bloque");
let blk=s.slice(a,b+'                      </section>\n'.length);
// cada sección -> condicionada al paso
const secs=blk.split('                      <section className="mh-cc-sec">\n').slice(1).map(x=>'                      <section className="mh-cc-sec">\n'+x);
if(secs.length!==4)throw new Error("secs "+secs.length);
const [s1,s2,s3,s4]=secs;
// separar sección 2 en nombre / aspecto
const i2=s2.indexOf('                        <div className="mh-cc-f">\n                          <span>Color</span>');
const j2=s2.indexOf('                        <label className={"cc-sw');
const nameP=s2.slice(0,i2);
const look=s2.slice(i2,j2);
const taller=s2.slice(j2).replace('                      </section>\n','');
const sec=(n,title,sub,body)=>`                      <section className="mh-cc-sec">\n                        <h3 className="mh-cc-h"><i>${n}</i> ${title}</h3>\n${sub?`                        <p className="mh-cc-p">${sub}</p>\n`:""}${body}                      </section>\n`;
const strip=(x,h)=>x.replace(/^ *<section className="mh-cc-sec">\n/,"").replace(/ *<h3 className="mh-cc-h">.*<\/h3>\n/,"").replace(/ *<p className="mh-cc-p">.*<\/p>\n/,"").replace(/ *<\/section>\n$/,"");
const body1=strip(s1), body3=strip(s3), body4=strip(s4);
const nameBody=nameP.replace(/^ *<section className="mh-cc-sec">\n/,"").replace(/ *<h3 className="mh-cc-h">.*<\/h3>\n/,"");
const summary=`                        <div className="mh-cc-sum">
                          <span><b>Empiezas con</b>{qs ? qs.name : "Campaña en blanco"}</span>
                          <span><b>Nombre</b>{newCampaignName.trim() || (qs ? qs.name : "—")}</span>
                          <span><b>Contenido del Taller</b>{newCampaignCustom ? "Permitido" : "No permitido"}</span>
                          <span><b>Límites de la mesa</b>{newCampaignLimits.lines.length + newCampaignLimits.veils.length ? newCampaignLimits.lines.length + " línea(s), " + newCampaignLimits.veils.length + " velo(s)" : "Sin definir"}</span>
                        </div>
`;
const out=`                      <div className="mh-cc-stp" role="list" aria-label="Pasos">
                        {ccSteps.map((t, i) => (
                          <button key={t} type="button" role="listitem" disabled={i >= ccStep} title={t + (i < ccStep ? " · volver a este paso" : "")} aria-label={t} className={i < ccStep ? "is-done" : i === ccStep ? "is-on" : ""} onClick={() => i < ccStep && (setCcDir(-1), setCcStep(i))} />
                        ))}
                      </div>
                      <small className="mh-cc-sn">Paso {ccStep + 1} de {ccSteps.length} · {ccSteps[ccStep]}</small>
                      <div key={ccStep} className={"mh-cc-body is-in-" + (ccDir > 0 ? "r" : "l")}>
${ccIf(0,sec(1,"Cómo empezar","Elige si empiezas de cero o con una aventura de inicio ya preparada.",body1))}${ccIf(1,sec(2,"Nombre y descripción","",nameBody))}${ccIf(2,sec(3,"Aspecto","Elige el color y la escena de portada. Verás el resultado a la derecha.",look))}${ccIf(3,sec(4,"La mesa","Qué contenido se permite y qué temas quedan fuera.",taller+'                        <h4 className="mh-cc-h2">Seguridad en la mesa</h4>\n                        <p className="mh-cc-p">Acordad antes de jugar qué temas quedan fuera. Los jugadores los verán en la campaña.</p>\n                        <LinesVeilsEditor lines={newCampaignLimits.lines} veils={newCampaignLimits.veils} onChange={setNewCampaignLimits} />\n'))}${ccIf(4,sec(5,"Imágenes y resumen","",body4.replace(/ *<LinesVeilsEditor[^\n]*\n/,"")+summary))}                      </div>
                      <div className="mh-cc-nav">
                        {ccStep > 0 && <button type="button" className="mh-btn-ghost" onClick={() => (setCcDir(-1), setCcStep(ccStep - 1))}><ChevronLeft size={14} /> Atrás</button>}
                        <span style={{ flex: 1 }} />
                        {ccStep === 1 && !canCreate && <small className="mh-cc-hint">Ponle un nombre para continuar.</small>}
                        {ccStep < ccSteps.length - 1 ? (
                          <button type="button" className="mh-btn" disabled={ccStep === 1 && !canCreate} onClick={() => (setCcDir(1), setCcStep(ccStep + 1))}>Siguiente <ChevronRight size={14} /></button>
                        ) : (
                          <button type="button" className="mh-btn" disabled={!canCreate} onClick={qs ? () => createQuickstart(qs.build) : createCampaign}><Check size={14} /> Crear campaña</button>
                        )}
                      </div>
`;
function ccIf(n,x){return `                      {ccStep === ${n} && (\n${x.split("\n").map(l=>l?"  "+l:l).join("\n")}                      )}\n`;}
// ccIf is hoisted; rebuild 'out' now that it is defined
