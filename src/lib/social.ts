"use client";

// Amigos y notificaciones sobre `kv_shared` (no necesita migraciones nuevas).
// - Una fila por pareja: `fr:<idA>:<idB>` (ids ordenados) con { from, to, status: "pending" | "friends" | "none" }.
// - Una fila por aviso: `nt:<destinatario>:<id>` con { type, from, at, read }.
// Así dos personas nunca pisan los datos de una tercera.

import { createClient } from "@/lib/supabase/client";

export type Person = { id: string; username: string };
export type Notice = { key: string; type: "friend_request" | "friend_accepted"; from: Person; at: number; read: boolean };
export type SocialState = { me: Person | null; friends: Person[]; incoming: Person[]; outgoing: Person[]; notices: Notice[] };

type Pair = { from: string; to: string; status: "pending" | "friends" | "none"; at: number };
type NoticeRow = { type: Notice["type"]; from: string; at: number; read: boolean };

const isDev = () => process.env.NODE_ENV === "development" && typeof window !== "undefined" && window.location.pathname.startsWith("/dev-preview");
let client: ReturnType<typeof createClient> | null = null;
const sb = () => (client ??= createClient());
const pairKey = (a: string, b: string) => `fr:${[a, b].sort().join(":")}`;

// --- Vista previa local: datos en memoria para probar la interfaz ---
const DEV_ME: Person = { id: "dev-me", username: "Tú" };
const DEV_PEOPLE: Person[] = [
  { id: "dev-ana", username: "Ana" },
  { id: "dev-bruno", username: "Bruno" },
  { id: "dev-carla", username: "Carla" },
  { id: "dev-dario", username: "Darío" },
];
const devPairs = new Map<string, Pair>([
  [pairKey("dev-me", "dev-ana"), { from: "dev-ana", to: "dev-me", status: "friends", at: Date.now() - 864e5 }],
  [pairKey("dev-me", "dev-bruno"), { from: "dev-bruno", to: "dev-me", status: "pending", at: Date.now() - 36e5 }],
]);
const devNotices: Notice[] = [{ key: "nt:dev-me:1", type: "friend_request", from: DEV_PEOPLE[1], at: Date.now() - 36e5, read: false }];

async function myself(): Promise<Person | null> {
  if (isDev()) return DEV_ME;
  const { data } = await sb().auth.getUser();
  if (!data.user) return null;
  const { data: prof } = await sb().from("profiles").select("username").eq("id", data.user.id).maybeSingle();
  return { id: data.user.id, username: prof?.username || data.user.email?.split("@")[0] || "Jugador" };
}

async function namesOf(ids: string[]): Promise<Map<string, Person>> {
  const map = new Map<string, Person>();
  if (!ids.length) return map;
  if (isDev()) {
    for (const p of [DEV_ME, ...DEV_PEOPLE]) if (ids.includes(p.id)) map.set(p.id, p);
  } else {
    const { data } = await sb().from("profiles").select("id, username").in("id", ids);
    for (const p of data ?? []) map.set(p.id, p);
  }
  for (const id of ids) if (!map.has(id)) map.set(id, { id, username: "Jugador" });
  return map;
}

const parse = <T,>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

async function writeShared(key: string, value: unknown, uid: string) {
  if (isDev()) return;
  const { error } = await sb().from("kv_shared").upsert({ key, value: JSON.stringify(value), updated_by: uid });
  if (error) throw error;
}

async function notify(to: string, type: NoticeRow["type"], from: string) {
  if (isDev()) return;
  const key = `nt:${to}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await writeShared(key, { type, from, at: Date.now(), read: false } satisfies NoticeRow, from);
}

export async function loadSocial(): Promise<SocialState> {
  const me = await myself();
  if (!me) return { me: null, friends: [], incoming: [], outgoing: [], notices: [] };

  let pairs: Pair[] = [];
  let rows: { key: string; value: NoticeRow }[] = [];
  if (isDev()) {
    pairs = [...devPairs.values()];
  } else {
    const [p, n] = await Promise.all([
      sb().from("kv_shared").select("key, value").like("key", `fr:%${me.id}%`),
      sb().from("kv_shared").select("key, value").like("key", `nt:${me.id}:%`).order("updated_at", { ascending: false }).limit(30),
    ]);
    pairs = (p.data ?? []).map((r) => parse<Pair>(r.value)).filter((x): x is Pair => !!x);
    rows = (n.data ?? []).map((r) => ({ key: r.key, value: parse<NoticeRow>(r.value)! })).filter((r) => r.value);
  }

  const other = (p: Pair) => (p.from === me.id ? p.to : p.from);
  const ids = [...new Set([...pairs.map(other), ...rows.map((r) => r.value.from)])];
  const names = await namesOf(ids);
  const who = (id: string) => names.get(id)!;

  const byName = (a: Person, b: Person) => a.username.localeCompare(b.username, "es");
  return {
    me,
    friends: pairs.filter((p) => p.status === "friends").map((p) => who(other(p))).sort(byName),
    incoming: pairs.filter((p) => p.status === "pending" && p.to === me.id).map((p) => who(p.from)),
    outgoing: pairs.filter((p) => p.status === "pending" && p.from === me.id).map((p) => who(p.to)),
    notices: isDev()
      ? devNotices
      : rows.map((r) => ({ key: r.key, type: r.value.type, from: who(r.value.from), at: r.value.at, read: r.value.read })),
  };
}

export async function searchPeople(query: string): Promise<Person[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const me = await myself();
  if (isDev()) return DEV_PEOPLE.filter((p) => p.username.toLowerCase().startsWith(q.toLowerCase()));
  const { data } = await sb().from("profiles").select("id, username").ilike("username", `${q.replace(/[%_]/g, "")}%`).neq("id", me?.id ?? "").limit(6);
  return data ?? [];
}

export async function sendRequest(target: Person): Promise<string> {
  const me = await myself();
  if (!me) return "Inicia sesión para añadir amigos.";
  if (target.id === me.id) return "No puedes añadirte a ti mismo.";
  const key = pairKey(me.id, target.id);
  const existing = isDev() ? devPairs.get(key) : parse<Pair>((await sb().from("kv_shared").select("value").eq("key", key).maybeSingle()).data?.value ?? "");
  if (existing?.status === "friends") return `${target.username} ya es tu amigo.`;
  if (existing?.status === "pending" && existing.from === me.id) return "Ya le has enviado una solicitud.";
  if (existing?.status === "pending" && existing.from === target.id) {
    await respond(target, true);
    return `Ahora ${target.username} y tú sois amigos.`;
  }
  const pair: Pair = { from: me.id, to: target.id, status: "pending", at: Date.now() };
  if (isDev()) devPairs.set(key, pair);
  await writeShared(key, pair, me.id);
  await notify(target.id, "friend_request", me.id);
  return `Solicitud enviada a ${target.username}.`;
}

export async function respond(from: Person, accept: boolean) {
  const me = await myself();
  if (!me) return;
  const key = pairKey(me.id, from.id);
  const pair: Pair = { from: from.id, to: me.id, status: accept ? "friends" : "none", at: Date.now() };
  if (isDev()) devPairs.set(key, pair);
  await writeShared(key, pair, me.id);
  if (accept) await notify(from.id, "friend_accepted", me.id);
}

export async function removeFriend(other: Person) {
  const me = await myself();
  if (!me) return;
  const key = pairKey(me.id, other.id);
  const pair: Pair = { from: me.id, to: other.id, status: "none", at: Date.now() };
  if (isDev()) devPairs.set(key, pair);
  await writeShared(key, pair, me.id);
}

export async function markNoticesRead(list: Notice[]) {
  const me = await myself();
  if (!me) return;
  for (const n of list) {
    if (isDev()) {
      const d = devNotices.find((x) => x.key === n.key);
      if (d) d.read = true;
    } else {
      await writeShared(n.key, { type: n.type, from: n.from.id, at: n.at, read: true } satisfies NoticeRow, me.id);
    }
  }
}
