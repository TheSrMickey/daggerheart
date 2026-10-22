"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

// Cambia el formulario de acceso de lado (izquierda o derecha). La preferencia se guarda en este navegador
// y se aplica en <html> antes de pintar (ver ThemeScript); el movimiento lo hace el CSS.
export function AuthSideToggle() {
  const [right, setRight] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRight(document.documentElement.dataset.mhAuthSide === "right");
  }, []);
  const toggle = () => {
    const next = !right;
    setRight(next);
    if (next) document.documentElement.dataset.mhAuthSide = "right";
    else delete document.documentElement.dataset.mhAuthSide;
    try {
      localStorage.setItem("mh-auth-side", next ? "right" : "left");
    } catch {}
  };
  const label = right ? "Mover el formulario a la izquierda" : "Mover el formulario a la derecha";
  return (
    <button type="button" className="auth-swap" onClick={toggle} title={label} aria-label={label}>
      <ArrowRight size={18} />
    </button>
  );
}
