import { redirect } from "next/navigation";
import DaggerheartApp from "@/components/DaggerheartApp";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./(auth)/actions";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return <DaggerheartApp onSignOut={signOut} />;
}
