import Link from "next/link";
import { Plus } from "lucide-react";
import { classInfo, type Character } from "@/lib/daggerheart";
import { createClient } from "@/lib/supabase/server";
import { createCharacter } from "./actions";

export default async function PersonajesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("characters")
    .select("id, name, class, subclass, ancestry, community, level, updated_at")
    .order("updated_at", { ascending: false });
  const characters = (data ?? []) as Omit<Character, "sheet" | "user_id">[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Mis personajes</h1>
        <form action={createCharacter}>
          <button className="btn btn-primary">
            <Plus size={16} /> Nuevo personaje
          </button>
        </form>
      </div>

      {error && <p className="text-danger">No se pudieron cargar los personajes: {error.message}</p>}

      {characters.length === 0 && !error ? (
        <div className="card py-12 text-center">
          <p className="font-display text-lg">Aún no tienes personajes</p>
          <p className="mt-1 text-sm text-muted">Crea el primero para empezar tu aventura.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((c) => {
            const info = classInfo(c.class);
            return (
              <li key={c.id}>
                <Link href={`/personajes/${c.id}`} className="card block transition hover:border-gold">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-lg font-bold">{c.name}</h2>
                    <span className="shrink-0 rounded-full bg-panel-2 px-2 py-0.5 text-xs font-semibold">Nv. {c.level}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {[c.ancestry, c.community].filter(Boolean).join(" · ") || "Sin ascendencia ni comunidad"}
                  </p>
                  <p className="mt-2 text-sm">
                    {c.class ? `${c.class}${c.subclass ? ` — ${c.subclass}` : ""}` : "Sin clase"}
                  </p>
                  {info && <p className="mt-1 text-xs text-gold">{info.domains.join(" & ")}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
