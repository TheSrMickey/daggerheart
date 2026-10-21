"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Botón circular para pasar entre modo claro y oscuro (se guarda igual que en la aplicación).
export function AuthThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLight(document.documentElement.dataset.mhTheme === "light");
  }, []);
  const toggle = () => {
    const next = light ? "dark" : "light";
    setLight(!light);
    document.documentElement.dataset.mhTheme = next;
    try {
      localStorage.setItem("mh-theme", next);
    } catch {}
  };
  return (
    <button type="button" className="auth-theme" onClick={toggle} title={light ? "Cambiar a modo oscuro" : "Cambiar a modo claro"} aria-label={light ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}>
      {light ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
