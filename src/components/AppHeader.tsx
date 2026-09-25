import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";

export async function AppHeader() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  const { data: profile } = userId
    ? await supabase.from("profiles").select("username").eq("id", userId).single()
    : { data: null };

  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/personajes" className="font-display text-lg font-bold tracking-wide text-gold">
          Daggerheart
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {profile?.username && <span className="text-muted">{profile.username}</span>}
          <form action={signOut}>
            <button className="btn btn-ghost px-3 py-1.5" title="Cerrar sesión">
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
