"use client";

// Sustituto de `window.storage` (el almacenamiento de los artifacts de Claude) sobre Supabase.
// - Privado (shared = false): una fila por clave y usuario en `kv_private`.
// - Compartido (shared = true): una fila por clave en `kv_shared`, visible para toda la mesa.
// Devuelve { key, value } como hacía window.storage.get.

import { createClient } from "@/lib/supabase/client";

type Entry = { key: string; value: string };

let client: ReturnType<typeof createClient> | null = null;
const sb = () => (client ??= createClient());
const WRITE_DELAY_MS = 400;

// En la vista previa local nada se guarda en Supabase (la base de datos es la real).
const isDevPreview = () =>
  process.env.NODE_ENV === "development" && typeof window !== "undefined" && window.location.pathname.startsWith("/dev-preview");

let userIdPromise: Promise<string | null> | null = null;
let privateCache: Promise<Map<string, string>> | null = null;
const pendingWrites = new Map<string, { value: string; shared: boolean; timer: ReturnType<typeof setTimeout> }>();

function getUserId() {
  userIdPromise ??= sb().auth.getUser().then(({ data }) => data.user?.id ?? null);
  return userIdPromise;
}

// Todas las claves privadas del jugador se cargan de una vez (personajes, campañas, preferencias).
function loadPrivate() {
  privateCache ??= (async () => {
    const map = new Map<string, string>();
    const { data, error } = await sb().from("kv_private").select("key, value");
    if (error && !isDevPreview()) throw error;
    for (const row of data ?? []) map.set(row.key, row.value);

    // Vista previa local: personajes de ejemplo (en producción este bloque desaparece).
    if (isDevPreview()) {
      const { DEV_SEED } = await import("@/app/dev-preview/seed");
      for (const [key, value] of Object.entries(DEV_SEED)) if (!map.has(key)) map.set(key, value);
      // Con sesión iniciada en local, añadimos los de ejemplo a la lista de personajes del jugador.
      const index = JSON.parse(map.get("character-index") || "[]") as string[];
      const seedIndex = JSON.parse(DEV_SEED["character-index"]) as string[];
      map.set("character-index", JSON.stringify([...index, ...seedIndex.filter((id) => !index.includes(id))]));
    }

    // Primera vez: usamos el nombre de registro como "Jugando como".
    if (!map.has("player-name")) {
      const uid = await getUserId();
      if (uid) {
        const { data: profile } = await sb().from("profiles").select("username").eq("id", uid).maybeSingle();
        if (profile?.username) map.set("player-name", profile.username);
      }
    }
    return map;
  })();
  privateCache.catch(() => {
    privateCache = null;
  });
  return privateCache;
}

const pendingKey = (key: string, shared: boolean) => `${shared ? "s" : "p"}:${key}`;

export async function storageGet(key: string, shared = false): Promise<Entry | null> {
  const pending = pendingWrites.get(pendingKey(key, shared));
  if (pending) return { key, value: pending.value };

  if (!shared) {
    const value = (await loadPrivate()).get(key);
    return value === undefined ? null : { key, value };
  }

  const { data, error } = await sb().from("kv_shared").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return data ? { key, value: data.value } : null;
}

export async function storageSet(key: string, value: string, shared = false): Promise<Entry> {
  if (!shared) (await loadPrivate()).set(key, value);
  if (isDevPreview()) return { key, value };

  // La app guarda en cada pulsación: agrupamos las escrituras de una misma clave.
  const id = pendingKey(key, shared);
  const previous = pendingWrites.get(id);
  if (previous) clearTimeout(previous.timer);
  const timer = setTimeout(() => void flush(id), WRITE_DELAY_MS);
  pendingWrites.set(id, { value, shared, timer });
  return { key, value };
}

async function flush(id: string) {
  const entry = pendingWrites.get(id);
  if (!entry) return;
  pendingWrites.delete(id);
  clearTimeout(entry.timer);

  const key = id.slice(2);
  const uid = await getUserId();
  if (!uid) return;

  const { error } = entry.shared
    ? await sb().from("kv_shared").upsert({ key, value: entry.value, updated_by: uid })
    : await sb().from("kv_private").upsert({ user_id: uid, key, value: entry.value });
  if (error) console.error(`No se pudo guardar "${key}":`, error.message);
}

export function flushAll() {
  return Promise.all([...pendingWrites.keys()].map(flush));
}

if (typeof window !== "undefined") {
  // Al cambiar de pestaña o cerrar, enviamos lo que quede pendiente.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushAll();
  });
  window.addEventListener("pagehide", () => void flushAll());
}
