export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Supabase ahora llama "publishable key" a la antigua "anon key"; aceptamos cualquiera de las dos.
export const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
