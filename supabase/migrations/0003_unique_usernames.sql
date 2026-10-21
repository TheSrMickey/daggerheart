-- Nombres de jugador únicos (sin distinguir mayúsculas).

-- 1) Si ya hay nombres repetidos, la cuenta más antigua conserva el suyo y las más nuevas pasan a «nombre_2», «nombre_3»…
--    (así, la última cuenta creada con un nombre repetido, por ejemplo «Mickey», queda como «Mickey_2»).
with ranked as (
  select id, username, row_number() over (partition by lower(username) order by created_at, id) as n
  from public.profiles
)
update public.profiles p
   set username = left(r.username, 28) || '_' || r.n
  from ranked r
 where p.id = r.id and r.n > 1;

-- 2) Desde ahora no puede haber dos perfiles con el mismo nombre.
create unique index profiles_username_lower_key on public.profiles (lower(username));

-- 3) Pregunta rápida para el registro: ¿está libre este nombre? (también para quien aún no tiene sesión)
create or replace function public.username_available(name text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(name)));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- 4) El alta automática del perfil no debe fallar si el nombre se ocupa justo a la vez: añade un sufijo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  base text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), split_part(new.email, '@', 1));
  chosen text := base;
begin
  if exists (select 1 from public.profiles where lower(username) = lower(chosen)) then
    chosen := left(base, 27) || '_' || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;
  insert into public.profiles (id, username) values (new.id, chosen);
  return new;
end;
$$;
