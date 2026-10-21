import type { ReactNode } from "react";

// Contenido de la columna izquierda de las pantallas de acceso (el marco está en `(auth)/layout.tsx`).
export function AuthShell({ title, mode, children }: { title: string; mode: "login" | "register"; children: ReactNode }) {
  return (
    <div className={"auth-pane is-" + mode}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="auth-logo" src="/logo.svg" alt="Daggerheart" />
      <h1 className="auth-title">{title}</h1>
      <div className="auth-form">{children}</div>
    </div>
  );
}
