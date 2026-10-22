-- Borrar la propia cuenta desde Ajustes. La función borra al usuario que la llama (no acepta parámetros, así que nadie puede borrar a otra persona):
-- sus datos privados, el perfil y los personajes caen en cascada al borrar el usuario, y aquí se limpian además sus filas sociales compartidas.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No hay sesión';
  end if;

  -- Filas sociales de esta cuenta en la tabla compartida: perfil, logros, actividad, presencia, anuncio, avisos y mensajes privados enviados/recibidos,
  -- y las parejas de amistad en las que aparece.
  delete from public.kv_shared
   where key in ('pf:' || uid, 'ach:' || uid, 'ac:' || uid, 'pr:' || uid, 'lf:' || uid)
      or key like 'nt:' || uid || ':%'
      or key like 'dm:' || uid || ':%'
      or key like 'dm:%:' || uid
      or key like 'fr:%' || uid || '%';

  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
-- Las filas compartidas no tenían política de borrado; la función corre con los permisos de su propietario, así que no hace falta añadirla.
