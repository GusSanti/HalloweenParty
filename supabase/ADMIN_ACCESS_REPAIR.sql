-- One-time production repair. Run manually in the Supabase SQL Editor.
-- It confirms the existing administrator and makes it the only staff account.
-- No password is stored or changed by this script.
begin;

do $$
declare
  admin_email constant text := 'eduardosoares.email@gmail.com';
  admin_id uuid;
begin
  select id into admin_id
  from auth.users
  where lower(email) = lower(admin_email);

  if admin_id is null then
    raise exception 'administrator account not found: %', admin_email;
  end if;

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = admin_id;

  delete from public.staff_profiles where user_id <> admin_id;

  -- Remove only the temporary Auth users created by the automated live checks.
  delete from auth.users
  where lower(email) like 'eduardosoares.email+codex%@gmail.com';

  insert into public.staff_profiles(user_id, role, active, display_name)
  values(admin_id, 'admin', true, 'Administrador')
  on conflict(user_id) do update
  set role = 'admin', active = true, display_name = 'Administrador';
end $$;

commit;

select u.email, u.email_confirmed_at, s.role, s.active
from public.staff_profiles s
join auth.users u on u.id = s.user_id;
