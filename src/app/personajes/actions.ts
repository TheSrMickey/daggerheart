"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { defaultSheet } from "@/lib/daggerheart";
import { createClient } from "@/lib/supabase/server";

export async function createCharacter() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("characters")
    .insert({ name: "Nuevo personaje", sheet: defaultSheet() })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/personajes/${data.id}`);
}

export async function deleteCharacter(id: string) {
  const supabase = await createClient();
  // RLS garantiza que solo se borra si el personaje es del usuario.
  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/personajes");
  redirect("/personajes");
}
