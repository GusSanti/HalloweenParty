-- Atualização do esquema atual. Execute no banco selecionado em .env.local
-- somente se esta migração ainda não foi aplicada.
begin;

-- UUIDv4 gives each new bearer code 122 random bits. Existing codes stay valid.
alter table public.invitations drop constraint if exists invitations_code_check;
alter table public.invitations add constraint invitations_code_check
  check (code ~ '^H26-([A-Z2-9]{4}-[A-Z2-9]{4}|[A-F0-9]{32})$');
create or replace function public.generate_invitation_code() returns text
language sql volatile set search_path = '' as $$
  select 'H26-' || upper(replace(gen_random_uuid()::text, '-', ''));
$$;
revoke all on function public.generate_invitation_code() from public, anon, authenticated;

-- Runs before Auth inserts: browser metadata must be validated server-side.
-- Admin-created accounts can omit attendee fields; they cannot obtain a ticket
-- until a valid attendee profile has been supplied.
create or replace function public.validate_attendee_signup() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.raw_user_meta_data ? 'full_name' or new.raw_user_meta_data ? 'phone' then
    if char_length(trim(coalesce(new.raw_user_meta_data->>'full_name',''))) not between 3 and 120
       or regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''),'[^0-9]','','g') !~ '^[0-9]{10,15}$'
    then raise exception 'invalid_attendee_metadata'; end if;
  end if;
  return new;
end $$;
drop trigger if exists h26_validate_attendee_signup on auth.users;
create trigger h26_validate_attendee_signup before insert on auth.users
for each row execute function public.validate_attendee_signup();
revoke all on function public.validate_attendee_signup() from public, anon, authenticated;

-- Replace the previous trigger: only valid attendees receive profiles/tickets.
-- Provisioning is deferred until email confirmation and authenticated access.
create or replace function public.handle_new_attendee() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if char_length(trim(coalesce(new.raw_user_meta_data->>'full_name',''))) between 3 and 120
     and regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''),'[^0-9]','','g') ~ '^[0-9]{10,15}$'
     and new.email is not null then
    insert into public.attendee_profiles(user_id,full_name,email,phone)
    values(new.id,trim(new.raw_user_meta_data->>'full_name'),lower(new.email),
      regexp_replace(new.raw_user_meta_data->>'phone','[^0-9]','','g'))
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

revoke all on function public.handle_new_attendee() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_attendee();

create or replace function public.ensure_my_invitation() returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); event_id_value uuid; invitation_id uuid; person auth.users%rowtype;
begin
  if actor is null then raise exception 'unauthorized'; end if;
  select * into person from auth.users where id = actor;
  if person.email_confirmed_at is null then raise exception 'email_not_confirmed'; end if;
  select id into event_id_value from public.event_settings where active;
  if event_id_value is null then raise exception 'active_event_not_found'; end if;
  -- Serialize provisioning for this user, including simultaneous tabs.
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

create or replace function public.set_invitation_status(p_invitation_id uuid, p_status public.invitation_status)
returns public.invitations language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); staff public.staff_role; ticket public.invitations%rowtype; old_status public.invitation_status;
begin
  select role into staff from public.staff_profiles where user_id = actor and active for share;
  if staff is null or p_status is null then raise exception 'forbidden'; end if;
  if staff = 'gate' and p_status <> 'used' then raise exception 'forbidden'; end if;
  select i.* into ticket from public.invitations i
  join public.event_settings e on e.id=i.event_id and e.active
  where i.id=p_invitation_id for update of i;
  if not found then raise exception 'invitation_not_found'; end if;
  if ticket.status = p_status then raise exception 'invalid_invitation_state'; end if;
  if p_status = 'used' and ticket.status <> 'active' then raise exception 'invalid_invitation_state'; end if;
  old_status := ticket.status;
  update public.invitations set status=p_status,
    activated_at=case when p_status='pending' then null else coalesce(activated_at,now()) end,
    activated_by=case when p_status='pending' then null else coalesce(activated_by,actor) end,
    used_at=case when p_status='used' then now() else null end,
    used_by=case when p_status='used' then actor else null end
  where id=p_invitation_id returning * into ticket;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
  values(actor,'invitation.status_changed','invitation',ticket.id::text,
    jsonb_build_object('from',old_status,'to',p_status));
  return ticket;
end $$;
revoke all on function public.set_invitation_status(uuid,public.invitation_status) from public,anon;
grant execute on function public.set_invitation_status(uuid,public.invitation_status) to authenticated;

create or replace function public.check_in_invitation(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ticket public.invitations%rowtype;
begin
  if public.current_staff_role() is null then raise exception 'forbidden'; end if;
  select i.* into ticket from public.invitations i join public.event_settings e on e.id=i.event_id and e.active
  where i.code=regexp_replace(upper(trim(p_code)),'^H26:','') for update of i;
  if not found then return jsonb_build_object('result','invalid'); end if;
  if ticket.status='used' then return jsonb_build_object('result','already_used','used_at',ticket.used_at); end if;
  if ticket.status<>'active' then return jsonb_build_object('result','invalid'); end if;
  ticket := public.set_invitation_status(ticket.id,'used');
  return jsonb_build_object('result','success','invitation_id',ticket.id,'used_at',ticket.used_at);
end $$;
revoke all on function public.check_in_invitation(text) from public,anon;
grant execute on function public.check_in_invitation(text) to authenticated;

-- Explicitly remove grants, including TRUNCATE (which RLS does not protect).
revoke all on public.attendee_profiles,public.invitations,public.staff_profiles,
  public.audit_logs,public.rate_limits from anon,authenticated;
grant select on public.attendee_profiles,public.invitations,public.staff_profiles to authenticated;
revoke all on public.event_settings,public.ticket_types,public.posts,public.faqs,public.gallery_items from anon,authenticated;
grant select on public.event_settings,public.ticket_types,public.posts,public.faqs,public.gallery_items to anon,authenticated;
grant insert,update,delete on public.event_settings,public.ticket_types,public.posts,public.faqs,public.gallery_items to authenticated;

-- Email remains sourced from Auth after a verified email change.
create or replace function public.sync_attendee_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.attendee_profiles set email=lower(new.email) where user_id=new.id;
  return new;
end $$;
drop trigger if exists h26_sync_attendee_email on auth.users;
create trigger h26_sync_attendee_email after update of email on auth.users
for each row when (old.email is distinct from new.email) execute function public.sync_attendee_email();
revoke all on function public.sync_attendee_email() from public,anon,authenticated;
commit;
