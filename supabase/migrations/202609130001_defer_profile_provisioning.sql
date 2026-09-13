-- Keep Supabase Auth signup independent from application tables.
-- This fixes opaque "Database error saving new user" failures caused by a
-- custom auth.users trigger while preserving all checks in ensure_my_invitation.
begin;

drop trigger if exists h26_validate_attendee_signup on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.validate_attendee_signup();
drop function if exists public.handle_new_attendee();

commit;
