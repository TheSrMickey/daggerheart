"use client";

// Amigos y notificaciones sobre `kv_shared` (no necesita migraciones nuevas).
// - Una fila por pareja: `fr:<idA>:<idB>` (ids ordenados) con { from, to, status: "pending" | "friends" | "none" }.
// - Una fila por aviso: `nt:<destinatario>:<id>` con { type, from, at, read }.
// Así dos personas nunca pisan los datos de una tercera.

import { createClient } from "@/lib/supabase/client";

export type Status = "on" | "away" | "off";
export type Person = { id: string; username: string; playing?: string; status?: Status; since?: number; lastSeen?: number; dnd?: boolean; camp?: string; role?: string; campSince?: number };
export type NoticeType = "friend_request" | "friend_accepted" | "campaign_invite" | "lf_request";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Notice = { key: string; type: NoticeType; from: Person; at: number; read: boolean; data?: any };
export type SocialState = { me: Person | null; friends: Person[]; incoming: Person[]; outgoing: Person[]; notices: Notice[]; unread?: Record<string, number>; profile?: Profile };

type Pair = { from: string; to: string; status: "pending" | "friends" | "none"; at: number };
type Presence = { cls: string | null; at: number; act: number; away: boolean; off?: boolean; dnd?: boolean; camp?: string; role?: string; campSince?: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NoticeRow = { type: Notice["type"]; from: string; at: number; read: boolean; data?: any };

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
  [pairKey("dev-me", "dev-carla"), { from: "dev-carla", to: "dev-me", status: "friends", at: Date.now() - 864e5 }],
  [pairKey("dev-me", "dev-dario"), { from: "dev-dario", to: "dev-me", status: "friends", at: Date.now() - 864e5 }],
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notify(to: string, type: NoticeRow["type"], from: string, data?: any) {
  if (isDev()) {
    if (to === "dev-me") devNotices.unshift({ key: "nt:dev-me:" + Date.now(), type, from: { id: from, username: from }, at: Date.now(), read: false, data });
    return;
  }
  const key = `nt:${to}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await writeShared(key, { type, from, at: Date.now(), read: false, ...(data ? { data } : {}) } satisfies NoticeRow, from);
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

  const myProfile = await getProfile(me.id);
  const blockedIds = new Set(myProfile.blocked);
  const other = (p: Pair) => (p.from === me.id ? p.to : p.from);
  const ids = [...new Set([...pairs.map(other), ...rows.map((r) => r.value.from)])];
  const names = await namesOf(ids);
  const who = (id: string) => names.get(id)!;

  const byName = (a: Person, b: Person) => a.username.localeCompare(b.username, "es");
  const friends = pairs.filter((p) => p.status === "friends").map((p) => who(other(p))).sort(byName);
  // Presencia de los amigos: señal con latido cada 30 s. Sin señal en 150 s = desconectado.
  const now = Date.now();
  if (isDev()) {
    for (const f of friends) {
      if (f.id === "dev-ana") Object.assign(f, { status: "on", playing: "Druida" });
      else if (f.id === "dev-dario") Object.assign(f, { status: "away", since: now - 12 * 60000 });
      else Object.assign(f, { status: "off", lastSeen: now - 2 * 36e5 });
    }
  } else {
    const { data } = friends.length ? await sb().from("kv_shared").select("key, value").in("key", friends.map((f) => `pr:${f.id}`)) : { data: [] };
    for (const f of friends) {
      const row = (data ?? []).find((r) => r.key === `pr:${f.id}`);
      const v = row ? parse<Presence>(row.value) : null;
      if (v && !v.off && now - v.at < 40000) {
        f.status = v.away ? "away" : "on";
        f.since = v.act;
        if (v.cls) f.playing = v.cls;
        if (v.dnd) f.dnd = true;
        if (v.camp) Object.assign(f, { camp: v.camp, role: v.role, campSince: v.campSince });
      } else {
        f.status = "off";
        f.lastSeen = v?.at;
      }
    }
  }
  return {
    me,
    friends,
    incoming: pairs.filter((p) => p.status === "pending" && p.to === me.id).map((p) => who(p.from)),
    outgoing: pairs.filter((p) => p.status === "pending" && p.from === me.id).map((p) => who(p.to)),
    notices: isDev()
      ? devNotices.filter((n) => !blockedIds.has(n.from.id))
      : rows.filter((r) => !blockedIds.has(r.value.from)).map((r) => ({ key: r.key, type: r.value.type, from: who(r.value.from), at: r.value.at, read: r.value.read, data: r.value.data })),
    unread: await unreadDm(me.id),
    profile: await getProfile(me.id),
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
      await writeShared(n.key, { type: n.type, from: n.from.id, at: n.at, read: true, ...(n.data ? { data: n.data } : {}) } satisfies NoticeRow, me.id);
    }
  }
}

// Presencia propia: latido cada 12 s con la clase de la hoja abierta (si la hay) y si estás ausente
// (10 min sin tocar nada, o con la pestaña en segundo plano).
const AWAY_MS = 10 * 60000;
let presenceCls: string | null = null;
let presenceMode: "on" | "dnd" | "inv" = "on";
let presenceCamp: { name: string; role: string; since: number } | null = null;
export function setPresenceMode(m: "on" | "dnd" | "inv") {
  if (m === presenceMode) return;
  presenceMode = m;
  if (presenceTimer) void publishPresence();
}
export function setPresenceCamp(name: string | null, role = "") {
  if ((presenceCamp?.name || null) === name) return;
  presenceCamp = name ? { name, role, since: Date.now() } : null;
  if (presenceTimer) void publishPresence();
}
let presenceTimer: ReturnType<typeof setInterval> | null = null;
let lastActive = Date.now();
let stopListeners: (() => void) | null = null;
async function publishPresence(off = false) {
  if (isDev()) return;
  const { data } = await sb().auth.getUser();
  if (!data.user) return;
  const away = document.hidden || Date.now() - lastActive > AWAY_MS;
  const value: Presence = { cls: presenceCls, at: Date.now(), act: lastActive, away, ...(off || presenceMode === "inv" ? { off: true } : {}), ...(presenceMode === "dnd" ? { dnd: true } : {}), ...(presenceCamp ? { camp: presenceCamp.name, role: presenceCamp.role, campSince: presenceCamp.since } : {}) };
  await writeShared(`pr:${data.user.id}`, value, data.user.id).catch(() => {});
}
export function startPresence() {
  if (presenceTimer || typeof window === "undefined") return;
  const touch = () => {
    // Al volver de estar ausente se avisa al momento, sin esperar al siguiente latido.
    const wasAway = Date.now() - lastActive > AWAY_MS;
    lastActive = Date.now();
    if (wasAway) void publishPresence();
  };
  const bye = () => void publishPresence(true);
  const vis = () => {
    if (!document.hidden) touch();
    void publishPresence();
  };
  const evs = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
  evs.forEach((e) => window.addEventListener(e, touch, { passive: true }));
  document.addEventListener("visibilitychange", vis);
  window.addEventListener("pagehide", bye);
  stopListeners = () => {
    evs.forEach((e) => window.removeEventListener(e, touch));
    document.removeEventListener("visibilitychange", vis);
    window.removeEventListener("pagehide", bye);
  };
  presenceTimer = setInterval(() => void publishPresence(), 12000);
  void publishPresence();
}
export function stopPresence() {
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = null;
  stopListeners?.();
  stopListeners = null;
  presenceCls = null;
  void publishPresence(true);
}
export function setPresence(cls: string | null) {
  if (cls === presenceCls) return;
  presenceCls = cls;
  if (presenceTimer) void publishPresence();
}

// --- La mesa de una campaña: quién está conectado y quién escribe ---
// Una fila por jugador y campaña (`cpr:<campaña>:<usuario>`), así nadie pisa lo de otro.
export type TableEntry = { uid: string; name: string; as: string; cls: string; chars: string[]; at: number; away: boolean; typing: number; off?: boolean };
type TableRow = Omit<TableEntry, "uid">;
const devTable = new Map<string, TableEntry>();
if (typeof window !== "undefined" && isDev()) (window as unknown as { __devTable?: Map<string, TableEntry> }).__devTable = devTable;
let tableUid: string | null = null;
export async function myUid(): Promise<string | null> {
  if (isDev()) return "dev-me";
  if (tableUid) return tableUid;
  const { data } = await sb().auth.getUser();
  tableUid = data.user?.id ?? null;
  return tableUid;
}

export async function publishTable(campId: string, v: { name: string; as: string; cls: string; chars: string[]; typing: number }, off = false) {
  const uid = await myUid();
  if (!uid) return;
  const row: TableRow = { ...v, at: Date.now(), away: typeof document !== "undefined" && document.hidden, ...(off ? { off: true } : {}) };
  if (isDev()) {
    devTable.set(`${campId}:${uid}`, { uid, ...row });
    return;
  }
  await writeShared(`cpr:${campId}:${uid}`, row, uid).catch(() => {});
}

export async function loadTable(campId: string): Promise<TableEntry[]> {
  const now = Date.now();
  let list: TableEntry[] = [];
  if (isDev()) {
    list = [...devTable.entries()].filter(([k]) => k.startsWith(campId + ":")).map(([, e]) => e);
  } else {
    const { data } = await sb().from("kv_shared").select("key, value").like("key", `cpr:${campId}:%`);
    list = (data ?? [])
      .map((r) => {
        const v = parse<TableRow>(r.value);
        return v ? ({ ...v, uid: r.key.split(":")[2] } as TableEntry) : null;
      })
      .filter((x): x is TableEntry => !!x);
  }
  // Sin latido en 40 s, o con «off», se considera desconectado.
  return list.map((e) => (e.off || now - e.at > 40000 ? { ...e, off: true, typing: 0 } : e));
}

// =====================================================================================
// Social ampliado: perfil y privacidad, mensajes privados, invitaciones, anuncios,
// actividad y fichas compartidas. Todo vive en `kv_shared` con una clave por autor,
// así nadie pisa los datos de otro. Los permisos (quién te escribe o invita) se
// comprueban en el cliente antes de enviar.
// =====================================================================================
type Audience = "all" | "friends" | "none";
export type Profile = {
  bio: string;
  looking: string[];
  chars: { name: string; cls: string; lvl: number }[];
  invites: Audience;
  msgs: Audience;
  classShown: boolean;
  searchable: boolean;
  activity: boolean;
  status: "on" | "dnd" | "inv";
  blocked: string[];
  name?: string;
  since?: number;
};
export const DEFAULT_PROFILE: Profile = { bio: "", looking: [], chars: [], invites: "friends", msgs: "friends", classShown: true, searchable: false, activity: true, status: "on", blocked: [] };
const devKv = new Map<string, string>();

async function kvGet<T>(key: string): Promise<T | null> {
  if (isDev()) return parse<T>(devKv.get(key) ?? "");
  const { data } = await sb().from("kv_shared").select("value").eq("key", key).maybeSingle();
  return data ? parse<T>(data.value) : null;
}
async function kvPut(key: string, value: unknown) {
  const uid = await myUid();
  if (!uid) return;
  if (isDev()) {
    devKv.set(key, JSON.stringify(value));
    return;
  }
  await writeShared(key, value, uid);
}
async function kvList<T>(prefix: string): Promise<{ key: string; value: T }[]> {
  if (isDev()) return [...devKv.entries()].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, value: parse<T>(v)! })).filter((x) => x.value);
  const { data } = await sb().from("kv_shared").select("key, value").like("key", `${prefix}%`).limit(200);
  return (data ?? []).map((r) => ({ key: r.key, value: parse<T>(r.value)! })).filter((x) => x.value);
}

const profCache = new Map<string, { at: number; p: Profile }>();
export async function getProfile(uid: string, fresh = false): Promise<Profile> {
  const c = profCache.get(uid);
  if (c && !fresh && Date.now() - c.at < 20000) return c.p;
  const v = await kvGet<Partial<Profile>>(`pf:${uid}`);
  const p = { ...DEFAULT_PROFILE, ...(v || {}) } as Profile;
  profCache.set(uid, { at: Date.now(), p });
  return p;
}
export async function saveProfile(patch: Partial<Profile>) {
  const me = await myself();
  if (!me) return DEFAULT_PROFILE;
  const next = { ...(await getProfile(me.id, true)), ...patch, name: me.username } as Profile;
  if (!next.since) next.since = Date.now();
  profCache.set(me.id, { at: Date.now(), p: next });
  await kvPut(`pf:${me.id}`, next);
  if (patch.status) setPresenceMode(patch.status);
  return next;
}
// ¿Puede `from` hacer algo (invitar, escribir) a `to`, según la privacidad de `to`?
async function allowed(kind: "invites" | "msgs", to: string, from: string): Promise<string | null> {
  const p = await getProfile(to, true);
  if (p.blocked.includes(from)) return "Esta persona no acepta mensajes tuyos.";
  const rule = p[kind];
  if (rule === "none") return "Esta persona no acepta " + (kind === "msgs" ? "mensajes" : "invitaciones") + ".";
  if (rule === "friends") {
    const pair = isDev() ? devPairs.get(pairKey(from, to)) : parse<Pair>((await sb().from("kv_shared").select("value").eq("key", pairKey(from, to)).maybeSingle()).data?.value ?? "");
    if (pair?.status !== "friends") return "Solo acepta " + (kind === "msgs" ? "mensajes" : "invitaciones") + " de sus amigos.";
  }
  return null;
}
export async function blockPerson(other: Person) {
  const me = await myself();
  if (!me) return;
  const p = await getProfile(me.id, true);
  if (!p.blocked.includes(other.id)) await saveProfile({ blocked: [...p.blocked, other.id] });
  await removeFriend(other).catch(() => {});
}
export async function unblockPerson(id: string) {
  const me = await myself();
  if (!me) return;
  const p = await getProfile(me.id, true);
  await saveProfile({ blocked: p.blocked.filter((x) => x !== id) });
}
export async function namesFor(ids: string[]) {
  return namesOf(ids);
}

// ---------- mensajes privados ----------
export type Dm = { id: string; from: string; at: number; text: string; invite?: { campId: string; name: string; desc?: string } };
export async function sendDm(to: Person, text: string, invite?: Dm["invite"]): Promise<string | null> {
  const me = await myself();
  if (!me) return "Inicia sesión para escribir.";
  const t = text.trim().slice(0, 1000);
  if (!t && !invite) return null;
  const why = await allowed("msgs", to.id, me.id);
  if (why) return why;
  const key = `dm:${to.id}:${me.id}`;
  const cur = (await kvGet<Dm[]>(key)) || [];
  await kvPut(key, [...cur, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), from: me.id, at: Date.now(), text: t, ...(invite ? { invite } : {}) }].slice(-120));
  return null;
}
export async function loadDm(other: string): Promise<Dm[]> {
  const me = await myself();
  if (!me) return [];
  const [a, b] = await Promise.all([kvGet<Dm[]>(`dm:${me.id}:${other}`), kvGet<Dm[]>(`dm:${other}:${me.id}`)]);
  return [...(a || []), ...(b || [])].sort((x, y) => x.at - y.at);
}
const readKey = (id: string) => `mh-dmread:${id}`;
export function markDmRead(other: string) {
  try {
    localStorage.setItem(readKey(other), String(Date.now()));
  } catch {}
}
async function unreadDm(meId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const rows = await kvList<Dm[]>(`dm:${meId}:`);
    for (const r of rows) {
      const from = r.key.split(":")[2];
      let last = 0;
      try {
        last = Number(localStorage.getItem(readKey(from)) || 0);
      } catch {}
      const n = r.value.filter((m) => m.at > last).length;
      if (n) out[from] = n;
    }
  } catch {}
  return out;
}

// ---------- invitaciones a campaña ----------
export type CampInvite = { campId: string; name: string; desc?: string; gm: string; players: number };
export async function inviteToCampaign(to: Person, camp: CampInvite): Promise<string> {
  const me = await myself();
  if (!me) return "Inicia sesión para invitar.";
  const why = await allowed("invites", to.id, me.id);
  if (why) return why;
  await notify(to.id, "campaign_invite", me.id, camp);
  return `Invitación enviada a ${to.username}.`;
}

// ---------- anuncios «Buscar mesa» ----------
export type Post = { id: string; uid: string; name: string; kind: "players" | "table" | "gm"; title: string; desc: string; tags: string[]; at: number; camp?: CampInvite | null };
export async function loadPosts(): Promise<Post[]> {
  const rows = await kvList<Post>("lf:");
  const me = await myself();
  const blocked = me ? new Set((await getProfile(me.id)).blocked) : new Set<string>();
  const now = Date.now();
  const list = rows.map((r) => ({ ...r.value, uid: r.key.slice(3) })).filter((p) => p.title && now - p.at < 30 * 864e5 && !blocked.has(p.uid));
  const out: Post[] = [];
  for (const p of list) {
    const pr = await getProfile(p.uid).catch(() => DEFAULT_PROFILE);
    if (pr.blocked.includes(me?.id || "") || (!pr.searchable && p.uid !== me?.id)) continue;
    out.push(p);
  }
  return out.sort((a, b) => b.at - a.at);
}
export async function publishPost(p: Omit<Post, "id" | "uid" | "name" | "at">) {
  const me = await myself();
  if (!me) return;
  await kvPut(`lf:${me.id}`, { ...p, id: "p" + Date.now(), uid: me.id, name: me.username, at: Date.now() });
}
export async function removePost() {
  const me = await myself();
  if (me) await kvPut(`lf:${me.id}`, {});
}
export async function requestJoin(post: Post): Promise<string> {
  const me = await myself();
  if (!me) return "Inicia sesión para pedir unirte.";
  const why = await allowed("msgs", post.uid, me.id);
  if (why) return why;
  await notify(post.uid, "lf_request", me.id, { title: post.title, camp: post.camp || null });
  return "Solicitud enviada. " + post.name + " te contestará.";
}

// ---------- actividad de amigos ----------
export type Act = { id: string; kind: "level" | "camp" | "crit" | "char"; text: string; at: number };
export async function logActivity(kind: Act["kind"], text: string) {
  try {
    const me = await myself();
    if (!me || !(await getProfile(me.id)).activity) return;
    const cur = (await kvGet<Act[]>(`ac:${me.id}`)) || [];
    await kvPut(`ac:${me.id}`, [{ id: Date.now().toString(36), kind, text, at: Date.now() }, ...cur].slice(0, 20));
  } catch {}
}
export async function friendActivity(friends: Person[]) {
  const out: (Act & { who: Person })[] = [];
  await Promise.all(
    friends.map(async (f) => {
      const pr = await getProfile(f.id).catch(() => DEFAULT_PROFILE);
      if (!pr.activity) return;
      const list = (await kvGet<Act[]>(`ac:${f.id}`)) || [];
      list.filter((a) => Date.now() - a.at < 3 * 864e5).slice(0, 4).forEach((a) => out.push({ ...a, who: f }));
    }),
  );
  return out.sort((a, b) => b.at - a.at).slice(0, 8);
}

// ---------- fichas compartidas ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SharedSheet = { token: string; owner: string; ownerName: string; at: number; exp: number; revoked?: boolean; show: { stats: boolean; gear: boolean; story: boolean }; data: Record<string, any> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function shareSheet(data: Record<string, any>, show: SharedSheet["show"], days: number, token?: string): Promise<string> {
  const me = await myself();
  if (!me) return "";
  const t = token || Math.random().toString(36).slice(2, 10);
  // Se guarda solo lo necesario; el diario y las notas privadas nunca salen.
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (typeof v === "string" && v.length < 4000 && !/^f_(journal|notes|diary)/.test(k)) clean[k] = v;
  const sheet: SharedSheet = { token: t, owner: me.id, ownerName: me.username, at: Date.now(), exp: Date.now() + days * 864e5, show, data: clean };
  await kvPut(`sh:${t}`, sheet);
  return t;
}
export async function revokeSheet(token: string) {
  const s = await kvGet<SharedSheet>(`sh:${token}`);
  if (s) await kvPut(`sh:${token}`, { ...s, revoked: true });
}
export async function loadSheet(token: string): Promise<SharedSheet | null> {
  const s = await kvGet<SharedSheet>(`sh:${token}`);
  return s && !s.revoked && s.exp > Date.now() ? s : null;
}

// ---------- reacciones del chat ----------
export type Rx = Record<string, Record<string, string[]>>; // msgKey -> emoji -> uids
export async function loadReactions(campId: string): Promise<Rx> {
  const rows = await kvList<Record<string, string[]>>(`rx:${campId}:`);
  const out: Rx = {};
  for (const r of rows) {
    const uid = r.key.split(":")[2];
    for (const [mk, ems] of Object.entries(r.value)) for (const e of ems) ((out[mk] ??= {})[e] ??= []).push(uid);
  }
  return out;
}
export async function toggleReaction(campId: string, msgKey: string, emoji: string) {
  const uid = await myUid();
  if (!uid) return;
  const key = `rx:${campId}:${uid}`;
  const mine = (await kvGet<Record<string, string[]>>(key)) || {};
  const cur = mine[msgKey] || [];
  mine[msgKey] = cur.includes(emoji) ? cur.filter((e) => e !== emoji) : [...cur, emoji];
  if (!mine[msgKey].length) delete mine[msgKey];
  const keys = Object.keys(mine);
  if (keys.length > 120) delete mine[keys[0]];
  await kvPut(key, mine);
}

// Datos de la app para los componentes sociales (los rellena DaggerheartApp).
export const bridge: {
  chars: { id: string; name: string; cls: string; lvl: number }[];
  camps: { id: string; name: string; desc: string; players: number }[];
  join: ((camp: CampInvite, charId: string) => void) | null;
  getChar: ((id: string) => Record<string, string> | null) | null;
  campName: string;
} = { chars: [], camps: [], join: null, getChar: null, campName: "" };
