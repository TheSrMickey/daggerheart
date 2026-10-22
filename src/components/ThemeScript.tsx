"use client";

// Aplica en <html> antes de pintar lo que se guarda en este navegador (tema, ilustraciones oficiales y lado del formulario de acceso), para que no parpadee.
// En el cliente se marca como text/plain: React no ejecuta scripts al renderizar y así no avisa.
const html = `(function(){try{var d=document.documentElement;if(localStorage.getItem("mh-theme")==="light")d.setAttribute("data-mh-theme","light");if(localStorage.getItem("mh-art")==="off")d.setAttribute("data-mh-art","off");if(localStorage.getItem("mh-auth-side")==="right")d.setAttribute("data-mh-auth-side","right")}catch(e){}})()`;

export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
