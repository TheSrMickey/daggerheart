import type { ReactNode } from "react";
import { AuthSideToggle } from "@/components/AuthSideToggle";
import { AuthThemeToggle } from "@/components/AuthThemeToggle";

// El marco de las pantallas de acceso vive aquí para que no se vuelva a montar al pasar de iniciar sesión a registrarse:
// solo cambia el formulario (con su animación) y el degradado de la derecha sigue en movimiento.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-win">
        <section className="auth-left">
          {children}
          <div className="auth-ctl">
            <AuthThemeToggle />
            <AuthSideToggle />
          </div>
        </section>
        <section className="auth-art" aria-hidden="true" />
      </div>
    </main>
  );
}
