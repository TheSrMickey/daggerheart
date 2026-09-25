# Daggerheart · Mesa

Hojas de personaje de Daggerheart para tu grupo. Cada jugador se registra y solo ve y edita sus propios personajes.

**Stack:** Next.js 16 · Supabase (Auth + Postgres con RLS) · Tailwind 4 · Vercel.

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto nuevo en [supabase.com/dashboard](https://supabase.com/dashboard).
2. **SQL Editor → New query**: pega el contenido de `supabase/migrations/0001_init.sql` y pulsa *Run*.
3. **Project Settings → API**: copia la *Project URL* y la *Publishable key* (o la `anon` key).
4. (Opcional, recomendado para un grupo de amigos) **Authentication → Sign In / Providers → Email**: desactiva *Confirm email*.
   El SMTP gratuito de Supabase solo envía unos pocos correos por hora.
5. **Authentication → URL Configuration**: pon la URL de Vercel en *Site URL* y añade
   `https://TU-APP.vercel.app/auth/callback` y `http://localhost:3001/auth/callback` en *Redirect URLs*.

### 2. Local

```bash
cp .env.example .env.local   # y rellena las dos variables
npm install
npm run dev
```

### 3. Vercel

1. Sube el repo a GitHub.
2. En Vercel: **Add New → Project**, importa el repo.
3. Añade las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Deploy. Después, vuelve al paso 1.5 con la URL definitiva.

## Estructura

- `src/proxy.ts` – refresca la sesión y protege las rutas privadas.
- `src/app/(auth)` – login, registro y sus server actions.
- `src/app/personajes` – lista de personajes y hoja (`[id]`).
- `src/components/CharacterSheet.tsx` – hoja editable con guardado automático.
- `src/lib/daggerheart.ts` – datos del SRD (clases, dominios, ascendencias, armaduras…).
- `supabase/migrations` – esquema y políticas RLS.
