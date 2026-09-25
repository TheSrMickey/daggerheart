-- Almacenamiento clave-valor que sustituye a window.storage del artifact original.

-- Datos de cada jugador: personajes, campañas propias, nombre, último personaje abierto…
create table public.kv_private (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.kv_private enable row level security;

create policy "Leer mis datos" on public.kv_private for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Crear mis datos" on public.kv_private for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Editar mis datos" on public.kv_private for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis datos" on public.kv_private for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Datos de la mesa, compartidos por todos los jugadores con sesión:
-- chat, mapa y encuentros de campaña, registro de tiradas, contador de Miedo y PNJs.
create table public.kv_shared (
  key text primary key,
  value text not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.kv_shared enable row level security;

create policy "La mesa lee lo compartido" on public.kv_shared for select to authenticated
  using (true);
create policy "La mesa crea lo compartido" on public.kv_shared for insert to authenticated
  with check ((select auth.uid()) = updated_by);
create policy "La mesa edita lo compartido" on public.kv_shared for update to authenticated
  using (true) with check ((select auth.uid()) = updated_by);

create trigger kv_private_updated_at
  before update on public.kv_private
  for each row execute function public.set_updated_at();

create trigger kv_shared_updated_at
  before update on public.kv_shared
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.kv_private to authenticated;
grant select, insert, update on public.kv_shared to authenticated;
