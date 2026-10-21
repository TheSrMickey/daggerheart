"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { checkField, signIn, signUp, type AuthState, type FieldCheck } from "@/app/(auth)/actions";

export function AuthForm({ mode, next, notice }: { mode: "login" | "register"; next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});
  const isRegister = mode === "register";
  const router = useRouter();

  // Registro: avisa en cuanto se escribe un nombre o un correo que ya están en uso (con una pequeña espera al teclear).
  const [checks, setChecks] = useState<{ username?: FieldCheck; email?: FieldCheck }>({});
  const timers = useRef<Partial<Record<"username" | "email", ReturnType<typeof setTimeout>>>>({});
  const seq = useRef({ username: 0, email: 0 });
  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach((x) => x && clearTimeout(x));
  }, []);
  const watch = (field: "username" | "email", value: string, delay = 450) => {
    clearTimeout(timers.current[field]);
    const id = ++seq.current[field];
    setChecks((c) => ({ ...c, [field]: undefined }));
    if (!value.trim()) return;
    timers.current[field] = setTimeout(async () => {
      const r = await checkField(field, value).catch(() => "unknown" as FieldCheck);
      if (seq.current[field] === id) setChecks((c) => ({ ...c, [field]: r }));
    }, delay);
  };
  const taken = checks.username === "taken" || checks.email === "taken";
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
          <input
            className={"field" + (checks.username === "taken" ? " is-bad" : "")}
            id="username"
            name="username"
            placeholder="Nombre de jugador"
            required
            minLength={2}
            maxLength={32}
            autoComplete="nickname"
            aria-invalid={checks.username === "taken"}
            onChange={(e) => watch("username", e.target.value)}
            onBlur={(e) => watch("username", e.target.value, 0)}
          />
          <p className={"auth-hint" + (checks.username === "taken" ? " is-bad" : checks.username === "free" ? " is-ok" : "")} aria-live="polite">
            {checks.username === "taken" ? "Ese nombre de jugador ya está en uso." : checks.username === "free" ? "Nombre disponible." : ""}
          </p>
        </div>
      )}
      <div>
        <label className="label sr-only" htmlFor="email">Correo</label>
        <input
          className={"field" + (isRegister && checks.email === "taken" ? " is-bad" : "")}
          id="email"
          name="email"
          placeholder="Correo electrónico"
          type="email"
          required
          autoComplete="email"
          aria-invalid={isRegister && checks.email === "taken"}
          {...(isRegister ? { onChange: (e: React.ChangeEvent<HTMLInputElement>) => watch("email", e.target.value), onBlur: (e: React.FocusEvent<HTMLInputElement>) => watch("email", e.target.value, 0) } : {})}
        />
        {isRegister && (
          <p className={"auth-hint" + (checks.email === "taken" ? " is-bad" : "")} aria-live="polite">
            {checks.email === "taken" ? (
              <>
                Ya hay una cuenta con este correo.{" "}
                <Link className="underline" href="/login" onClick={(e) => go(e, "/login")}>Inicia sesión</Link>
              </>
            ) : (
              ""
            )}
          </p>
        )}
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

      <button className="btn btn-primary w-full" disabled={pending || (isRegister && taken)}>
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
