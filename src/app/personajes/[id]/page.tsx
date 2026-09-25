import { notFound } from "next/navigation";
import { CharacterSheet } from "@/components/CharacterSheet";
import type { Character } from "@/lib/daggerheart";
import { createClient } from "@/lib/supabase/server";

export default async function CharacterPage({ params }: PageProps<"/personajes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("characters").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return <CharacterSheet initial={data as Character} />;
}
