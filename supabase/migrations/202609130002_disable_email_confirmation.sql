-- The application now gives access immediately after signup. Supabase Auth must
-- also have Authentication > Providers > Email > Confirm email disabled.
begin;

create or replace function public.ensure_my_invitation() returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); event_id_value uuid; invitation_id uuid; person auth.users%rowtype;
begin
  if actor is null then raise exception 'unauthorized'; end if;
  select * into person from auth.users where id = actor;
  select id into event_id_value from public.event_settings where active;
  if event_id_value is null then raise exception 'active_event_not_found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  if not exists(select 1 from public.attendee_profiles where user_id = actor) then
    if char_length(trim(coalesce(person.raw_user_meta_data->>'full_name',''))) not between 3 and 120
      or regexp_replace(coalesce(person.raw_user_meta_data->>'phone',''),'[^0-9]','','g') !~ '^[0-9]{10,15}$'
    then raise exception 'invalid_attendee_metadata'; end if;
    insert into public.attendee_profiles(user_id,full_name,email,phone)
    values(actor,trim(person.raw_user_meta_data->>'full_name'),lower(person.email),
      regexp_replace(person.raw_user_meta_data->>'phone','[^0-9]','','g'));
  end if;
  if not exists(select 1 from public.attendee_profiles
    where user_id=actor and char_length(trim(full_name)) between 3 and 120
      and phone ~ '^[0-9]{10,15}$') then
    raise exception 'invalid_attendee_profile';
  end if;
  insert into public.invitations(event_id,attendee_user_id,code)
  values(event_id_value,actor,public.generate_invitation_code())
  on conflict(event_id,attendee_user_id) do nothing;
  select id into invitation_id from public.invitations
  where event_id = event_id_value and attendee_user_id = actor;
  return invitation_id;
end $$;
revoke all on function public.ensure_my_invitation() from public, anon;
grant execute on function public.ensure_my_invitation() to authenticated;

commit;
