"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

const ERRORS: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Todavía no has confirmado tu correo. Revisa tu bandeja de entrada.",
  user_already_exists: "Ya existe una cuenta con ese correo.",
  weak_password: "La contraseña es demasiado débil.",
  over_email_send_rate_limit: "Se han enviado demasiados correos. Espera unos minutos.",
};

function translate(code: string | undefined, fallback: string) {
  return (code && ERRORS[code]) || fallback;
}

function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/personajes";
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Rellena el correo y la contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translate(error.code, error.message) };

  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (username.length < 2 || username.length > 32) return { error: "El nombre debe tener entre 2 y 32 caracteres." };
  if (!email) return { error: "Introduce un correo." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: translate(error.code, error.message) };

  // Con la confirmación por correo desactivada, Supabase devuelve la sesión directamente.
  if (data.session) redirect("/personajes");

  return { message: `Te hemos enviado un correo a ${email}. Confírmalo para entrar.` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
