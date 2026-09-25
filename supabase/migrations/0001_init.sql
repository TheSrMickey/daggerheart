-- Daggerheart: perfiles y personajes, con seguridad por filas (cada jugador solo ve lo suyo).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (char_length(username) between 2 and 32),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Perfiles visibles para usuarios con sesión"
  on public.profiles for select to authenticated using (true);

create policy "Cada uno edita su perfil"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Crea el perfil automáticamente al registrarse (el nombre llega en user_metadata.username).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Nuevo personaje',
  class text,
  subclass text,
  ancestry text,
  community text,
  level int not null default 1 check (level between 1 and 10),
  sheet jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index characters_user_id_idx on public.characters (user_id);

alter table public.characters enable row level security;

create policy "Ver mis personajes" on public.characters for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Crear mis personajes" on public.characters for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Editar mis personajes" on public.characters for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis personajes" on public.characters for delete to authenticated
  using ((select auth.uid()) = user_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger characters_updated_at
  before update on public.characters
  for each row execute function public.set_updated_at();

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.characters to authenticated;
