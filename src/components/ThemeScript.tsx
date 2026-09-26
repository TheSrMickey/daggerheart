"use client";

// Aplica el tema guardado en <html> antes de pintar, para que no parpadee.
// En el cliente se marca como text/plain: React no ejecuta scripts al renderizar y así no avisa.
const html = `(function(){try{if(localStorage.getItem("mh-theme")==="light")document.documentElement.setAttribute("data-mh-theme","light")}catch(e){}})()`;

export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
