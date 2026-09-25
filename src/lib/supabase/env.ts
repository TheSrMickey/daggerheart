const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase ahora llama "publishable key" a la antigua "anon key"; aceptamos cualquiera de las dos.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Faltan variables de entorno de Supabase: define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (y vuelve a desplegar).",
  );
}

export const supabaseUrl = url;
export const supabaseKey = key;
