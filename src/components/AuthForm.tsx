"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/(auth)/actions";

export function AuthForm({ mode, next, notice }: { mode: "login" | "register"; next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});
  const isRegister = mode === "register";
  const router = useRouter();
  // Al cambiar de pantalla, el formulario sale deslizándose y la nueva entra desde el otro lado.
  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.closest(".auth-pane")?.classList.add("is-leaving");
    router.prefetch(href);
    setTimeout(() => router.push(href), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
  };

  if (state.message) {
    return <p className="text-sm leading-relaxed">{state.message}</p>;
  }

  return (
    <form action={action} className="space-y-3">
      {notice && <p className="rounded-md bg-panel-2 px-3 py-2 text-sm">{notice}</p>}
      {next && <input type="hidden" name="next" value={next} />}

      {isRegister && (
        <div>
          <label className="label sr-only" htmlFor="username">Nombre de jugador</label>
          <input className="field" id="username" name="username" placeholder="Nombre de jugador" required minLength={2} maxLength={32} autoComplete="nickname" />
        </div>
      )}
      <div>
        <label className="label sr-only" htmlFor="email">Correo</label>
        <input className="field" id="email" name="email" placeholder="Correo electrónico" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label sr-only" htmlFor="password">Contraseña</label>
        <input
          className="field"
          id="password"
          name="password"
          placeholder="Contraseña"
          type="password"
          required
          minLength={isRegister ? 8 : undefined}
          autoComplete={isRegister ? "new-password" : "current-password"}
        />
      </div>
      {isRegister && (
        <div>
          <label className="label sr-only" htmlFor="confirm">Repite la contraseña</label>
          <input className="field" id="confirm" name="confirm" placeholder="Repite la contraseña" type="password" required autoComplete="new-password" />
        </div>
      )}

      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Un momento…" : isRegister ? "Crear cuenta" : "Entrar"}
      </button>

      <p className="text-center text-sm text-muted">
        {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
        <Link className="text-gold underline" href={isRegister ? "/login" : "/register"} onClick={(e) => go(e, isRegister ? "/login" : "/register")}>
          {isRegister ? "Inicia sesión" : "Regístrate"}
        </Link>
      </p>
    </form>
  );
}
