-- Comprobación en vivo del registro: ¿hay ya una cuenta con este correo?
-- Ojo: permite saber si un correo está registrado a cualquiera que use el formulario (es lo que pide el registro en vivo).
create or replace function public.email_available(addr text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select not exists (select 1 from auth.users u where lower(u.email) = lower(trim(addr)));
$$;
revoke all on function public.email_available(text) from public;
grant execute on function public.email_available(text) to anon, authenticated;
