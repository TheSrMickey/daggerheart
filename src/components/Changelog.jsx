"use client";

import { CHANGELOG } from "@/lib/changelog";

const TAGS = { nuevo: "Nuevo", mejora: "Mejora", arreglo: "Arreglo" };
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const dateEs = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return d + " de " + MONTHS[m - 1] + " de " + y;
};

// Historial de versiones: se muestra en la columna central al pulsar «Actualizaciones».
export function Changelog() {
  return (
    <div className="mh-cl">
      <div className="mh-cl-head">
        <h2 className="mh-serif">Actualizaciones</h2>
        <p>Historial de versiones: lo que se ha añadido, mejorado y arreglado en la plataforma.</p>
      </div>
      <ol className="mh-cl-list">
        {CHANGELOG.map((v, i) => (
          <li key={v.version} className={"mh-cl-v" + (i === 0 ? " is-last" : "")}>
            <span className="mh-cl-dot" aria-hidden="true" />
            <div className="mh-cl-card">
              <div className="mh-cl-top">
                <span className="mh-cl-ver">v{v.version}</span>
                {i === 0 && <span className="mh-cl-new">Última versión</span>}
                <time dateTime={v.date}>{dateEs(v.date)}</time>
              </div>
              <h3>{v.title}</h3>
              <ul>
                {v.items.map((it, k) => (
                  <li key={k}>
                    <span className={"mh-cl-tag is-" + it.tag}>{TAGS[it.tag] || it.tag}</span>
                    <span>{it.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
