create extension if not exists pgcrypto;

do $$ begin create type public.order_status as enum ('pending','paid','expired','cancelled','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('pending','approved','rejected','cancelled','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.ticket_status as enum ('active','cancelled','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.staff_role as enum ('admin','gate'); exception when duplicate_object then null; end $$;
do $$ begin create type public.post_status as enum ('draft','published'); exception when duplicate_object then null; end $$;
do $$ begin create type public.checkin_result as enum ('success','already_used','invalid'); exception when duplicate_object then null; end $$;
do $$ begin create type public.invitation_status as enum ('pending','active','used'); exception when duplicate_object then null; end $$;

create table if not exists public.event_settings (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (char_length(event_name) between 1 and 100),
  event_date date not null,
  location_name text not null check (char_length(location_name) between 1 and 160),
  city text not null check (char_length(city) between 1 and 100),
  event_time text,
  instagram_url text,
  whatsapp_url text,
  map_url text,
  age_rating text,
  entry_rules text,
  parking_info text,
  dress_code text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists one_active_event on public.event_settings (active) where active;

create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_settings(id) on delete restrict,
  code text not null,
  name text not null,
  price_cents integer not null check (price_cents > 0),
  active boolean not null default true,
  sales_start timestamptz,
  sales_end timestamptz,
  max_per_order smallint not null default 5 check (max_per_order between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, code)
);

-- Cadastro usado pelo fluxo atual de conta do convidado. A senha permanece no
-- Supabase Auth; nunca deve ser armazenada nas tabelas do schema public.
create table if not exists public.attendee_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null default '' check (phone = '' or phone ~ '^[0-9]{10,20}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists attendee_profiles_email_key on public.attendee_profiles (lower(email));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_settings(id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  buyer_name text not null check (char_length(buyer_name) between 2 and 120),
  buyer_email text not null check (char_length(buyer_email) between 3 and 254),
  buyer_phone text not null check (char_length(buyer_phone) between 10 and 20),
  quantity smallint not null check (quantity between 1 and 20),
  unit_price_cents integer not null check (unit_price_cents > 0),
  total_cents integer not null check (total_cents > 0 and total_cents = unit_price_cents * quantity),
  status public.order_status not null default 'pending',
  access_token_hash text not null unique,
  idempotency_key_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_buyer_email_idx on public.orders (lower(buyer_email));
create index if not exists orders_buyer_phone_idx on public.orders (buyer_phone);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null check (provider = 'mercado_pago'),
  provider_payment_id text not null unique,
  status public.payment_status not null default 'pending',
  amount_cents integer not null check (amount_cents > 0),
  raw_status text,
  provider_idempotency_key text not null unique,
  pix_qr_code text,
  pix_qr_code_base64 text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  issue_index smallint not null check (issue_index > 0),
  human_code text not null unique check (human_code ~ '^H26-[A-F0-9]{4}-[A-F0-9]{4}$'),
  status public.ticket_status not null default 'active',
  issued_at timestamptz not null default now(),
  checked_in_at timestamptz,
  unique (order_id, issue_index)
);
create index if not exists tickets_order_idx on public.tickets (order_id);
create index if not exists tickets_checkin_idx on public.tickets (checked_in_at) where checked_in_at is null;

create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.staff_role not null,
  active boolean not null default true,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Convite manual utilizado pela interface atual: nasce pendente, é ativado
-- pela organização e recebe baixa uma única vez na portaria.
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_settings(id) on delete restrict,
  attendee_user_id uuid not null references public.attendee_profiles(user_id) on delete cascade,
  code text not null unique check (code ~ '^H26-[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  status public.invitation_status not null default 'pending',
  activated_at timestamptz,
  activated_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, attendee_user_id),
  check (
    (status = 'pending' and used_at is null) or
    (status = 'active' and activated_at is not null and used_at is null) or
    (status = 'used' and activated_at is not null and used_at is not null)
  )
);
create index if not exists invitations_status_created_idx on public.invitations (status, created_at desc);
create index if not exists invitations_attendee_idx on public.invitations (attendee_user_id);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  staff_user_id uuid not null references auth.users(id) on delete restrict,
  mode text not null check (mode in ('scan','manual')),
  result public.checkin_result not null,
  created_at timestamptz not null default now()
);
create index if not exists checkins_ticket_created_idx on public.checkins (ticket_id, created_at desc);
create index if not exists checkins_staff_created_idx on public.checkins (staff_user_id, created_at desc);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 140),
  excerpt text not null check (char_length(excerpt) between 1 and 300),
  body_markdown text not null,
  cover_image text,
  status public.post_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft') or (status = 'published' and published_at is not null))
);
create index if not exists posts_public_idx on public.posts (published_at desc) where status = 'published';

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_settings(id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order smallint not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_settings(id) on delete cascade,
  image_path text not null,
  alt_text text not null,
  caption text,
  archive_year smallint,
  aspect_ratio text check (aspect_ratio in ('portrait','landscape','wide')),
  sort_order smallint not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  resource_id text,
  payload_hash text not null,
  processed_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create table if not exists public.rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['event_settings','ticket_types','attendee_profiles','orders','payments','staff_profiles','invitations','posts','faqs'] loop execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t); execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t); end loop; end $$;

create or replace function public.current_staff_role() returns public.staff_role
language sql stable security definer set search_path = '' as $$ select role from public.staff_profiles where user_id = auth.uid() and active limit 1 $$;
revoke all on function public.current_staff_role() from public;
grant execute on function public.current_staff_role() to authenticated;

create or replace function public.generate_invitation_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; bytes bytea; result text := ''; idx integer;
begin
  bytes := gen_random_bytes(8);
  for idx in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, idx) % 32) + 1, 1);
  end loop;
  return 'H26-' || substr(result, 1, 4) || '-' || substr(result, 5, 4);
end $$;
revoke all on function public.generate_invitation_code() from public, anon, authenticated;

-- Cria o perfil e o convite do evento ativo logo após o cadastro no Auth.
-- O frontend deve enviar full_name e phone em options.data no auth.signUp().
create or replace function public.handle_new_attendee() returns trigger
language plpgsql security definer set search_path = '' as $$
declare active_event_id uuid; candidate_code text;
begin
  insert into public.attendee_profiles(user_id, full_name, email, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(new.email, '@', 1), ''), 'Convidado'),
    lower(new.email),
    regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g')
  )
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone;

  select id into active_event_id from public.event_settings where active order by created_at desc limit 1;
  if active_event_id is not null then
    loop
      candidate_code := public.generate_invitation_code();
      begin
        insert into public.invitations(event_id, attendee_user_id, code)
        values (active_event_id, new.id, candidate_code)
        on conflict (event_id, attendee_user_id) do nothing;
        exit;
      exception when unique_violation then
        -- Colisão extremamente improvável do código; gera outro valor.
      end;
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.handle_new_attendee() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_attendee();

create or replace function public.set_invitation_status(p_invitation_id uuid, p_status public.invitation_status)
returns public.invitations language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); role_value public.staff_role; target public.invitations%rowtype; previous_status public.invitation_status;
begin
  select role into role_value from public.staff_profiles where user_id = actor and active;
  if role_value is null then raise exception 'forbidden'; end if;
  if role_value = 'gate' and p_status <> 'used' then raise exception 'forbidden'; end if;

  select * into target from public.invitations where id = p_invitation_id for update;
  if not found then raise exception 'invitation_not_found'; end if;
  if role_value = 'gate' and target.status <> 'active' then raise exception 'invalid_invitation_state'; end if;
  previous_status := target.status;

  update public.invitations set
    status = p_status,
    activated_at = case when p_status in ('active','used') then coalesce(activated_at, now()) else null end,
    activated_by = case when p_status in ('active','used') then coalesce(activated_by, actor) else null end,
    used_at = case when p_status = 'used' then coalesce(used_at, now()) else null end,
    used_by = case when p_status = 'used' then coalesce(used_by, actor) else null end
  where id = p_invitation_id returning * into target;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  values (actor, 'invitation.status_changed', 'invitation', target.id::text,
          jsonb_build_object('from', previous_status, 'to', p_status));
  return target;
end $$;
revoke all on function public.set_invitation_status(uuid, public.invitation_status) from public, anon;
grant execute on function public.set_invitation_status(uuid, public.invitation_status) to authenticated;

create or replace function public.check_in_invitation(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); role_value public.staff_role; target public.invitations%rowtype;
begin
  select role into role_value from public.staff_profiles where user_id = actor and active;
  if role_value is null or role_value not in ('admin','gate') then raise exception 'forbidden'; end if;

  select * into target from public.invitations where code = upper(trim(p_code)) for update;
  if not found then return jsonb_build_object('result', 'invalid'); end if;
  if target.status = 'used' then return jsonb_build_object('result', 'already_used', 'used_at', target.used_at); end if;
  if target.status <> 'active' then return jsonb_build_object('result', 'invalid', 'status', target.status); end if;

  update public.invitations set status = 'used', used_at = now(), used_by = actor
  where id = target.id returning * into target;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  values (actor, 'invitation.checkin.success', 'invitation', target.id::text, jsonb_build_object('code', target.code));
  return jsonb_build_object('result', 'success', 'invitation_id', target.id, 'used_at', target.used_at);
end $$;
revoke all on function public.check_in_invitation(text) from public, anon;
grant execute on function public.check_in_invitation(text) to authenticated;

create or replace function public.consume_rate_limit(p_key_hash text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare allowed boolean;
begin
  insert into public.rate_limits(key_hash, window_started_at, request_count) values (p_key_hash, now(), 1)
  on conflict (key_hash) do update set
    window_started_at = case when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) then now() else public.rate_limits.window_started_at end,
    request_count = case when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) then 1 else public.rate_limits.request_count + 1 end,
    updated_at = now()
  returning request_count <= p_limit into allowed;
  return allowed;
end $$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create or replace function public.finalize_paid_order(p_order_id uuid, p_provider_payment_id text, p_amount_cents integer, p_raw_status text)
returns setof public.tickets language plpgsql security definer set search_path = '' as $$
declare target public.orders%rowtype; idx integer; code text;
begin
  select * into target from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if target.total_cents <> p_amount_cents then raise exception 'amount_mismatch'; end if;
  if target.status = 'paid' then return query select * from public.tickets where order_id = target.id order by issue_index; return; end if;
  if target.status <> 'pending' then raise exception 'invalid_order_state'; end if;
  update public.payments set status = 'approved', raw_status = p_raw_status, amount_cents = p_amount_cents where order_id = target.id and provider_payment_id = p_provider_payment_id;
  if not found then raise exception 'payment_reference_mismatch'; end if;
  update public.orders set status = 'paid', paid_at = now() where id = target.id;
  for idx in 1..target.quantity loop
    loop
      code := 'H26-' || upper(substr(encode(gen_random_bytes(4), 'hex'),1,4)) || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'),1,4));
      begin
        insert into public.tickets(order_id, ticket_type_id, issue_index, human_code) values (target.id, target.ticket_type_id, idx, code);
        exit;
      exception when unique_violation then null;
      end;
    end loop;
  end loop;
  insert into public.audit_logs(action, entity_type, entity_id, metadata) values ('payment.approved', 'order', target.id::text, jsonb_build_object('provider','mercado_pago','ticket_count',target.quantity));
  return query select * from public.tickets where order_id = target.id order by issue_index;
end $$;
revoke all on function public.finalize_paid_order(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.finalize_paid_order(uuid, text, integer, text) to service_role;

create or replace function public.atomic_check_in(p_ticket_id uuid, p_staff_user_id uuid, p_mode text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare updated_ticket public.tickets%rowtype; existing_ticket public.tickets%rowtype; role_value public.staff_role;
begin
  select role into role_value from public.staff_profiles where user_id = p_staff_user_id and active;
  if role_value is null or role_value not in ('admin','gate') then raise exception 'forbidden'; end if;
  update public.tickets t set checked_in_at = now()
    where t.id = p_ticket_id and t.checked_in_at is null and t.status = 'active'
      and exists (select 1 from public.orders o where o.id = t.order_id and o.status = 'paid')
    returning * into updated_ticket;
  if found then
    insert into public.checkins(ticket_id, staff_user_id, mode, result) values (p_ticket_id, p_staff_user_id, p_mode, 'success');
    insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata) values (p_staff_user_id, 'ticket.checkin.success', 'ticket', p_ticket_id::text, jsonb_build_object('mode',p_mode));
    return jsonb_build_object('result','success','checked_in_at',updated_ticket.checked_in_at);
  end if;
  select * into existing_ticket from public.tickets where id = p_ticket_id;
  if found and existing_ticket.checked_in_at is not null then
    insert into public.checkins(ticket_id, staff_user_id, mode, result) values (p_ticket_id, p_staff_user_id, p_mode, 'already_used');
    insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata) values (p_staff_user_id, 'ticket.checkin.rejected_repeat', 'ticket', p_ticket_id::text, jsonb_build_object('mode',p_mode));
    return jsonb_build_object('result','already_used','checked_in_at',existing_ticket.checked_in_at);
  end if;
  if found then insert into public.checkins(ticket_id, staff_user_id, mode, result) values (p_ticket_id, p_staff_user_id, p_mode, 'invalid'); end if;
  return jsonb_build_object('result','invalid');
end $$;
revoke all on function public.atomic_check_in(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.atomic_check_in(uuid, uuid, text) to service_role;

alter table public.event_settings enable row level security;
alter table public.ticket_types enable row level security;
alter table public.attendee_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.tickets enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.checkins enable row level security;
alter table public.audit_logs enable row level security;
alter table public.posts enable row level security;
alter table public.faqs enable row level security;
alter table public.gallery_items enable row level security;
alter table public.webhook_events enable row level security;
alter table public.rate_limits enable row level security;

create policy "public reads active event" on public.event_settings for select to anon, authenticated using (active);
create policy "public reads active ticket types" on public.ticket_types for select to anon, authenticated using (active and (sales_start is null or sales_start <= now()) and (sales_end is null or sales_end > now()));
create policy "public reads published posts" on public.posts for select to anon, authenticated using (status = 'published' and published_at <= now());
create policy "public reads published faqs" on public.faqs for select to anon, authenticated using (published);
create policy "public reads published gallery" on public.gallery_items for select to anon, authenticated using (published);
create policy "staff reads own profile" on public.staff_profiles for select to authenticated using (user_id = auth.uid());
create policy "attendee reads own profile" on public.attendee_profiles for select to authenticated using (user_id = auth.uid());
create policy "staff reads attendee profiles" on public.attendee_profiles for select to authenticated using (public.current_staff_role() in ('admin','gate'));
create policy "attendee reads own invitation" on public.invitations for select to authenticated using (attendee_user_id = auth.uid());
create policy "staff reads invitations" on public.invitations for select to authenticated using (public.current_staff_role() in ('admin','gate'));

revoke all on public.attendee_profiles, public.invitations, public.orders, public.payments, public.tickets, public.checkins, public.audit_logs, public.webhook_events, public.rate_limits from anon, authenticated;
grant select on public.event_settings, public.ticket_types, public.posts, public.faqs, public.gallery_items to anon, authenticated;
grant select on public.staff_profiles to authenticated;
grant select on public.attendee_profiles, public.invitations to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-media','event-media',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads event media" on storage.objects for select to public using (bucket_id = 'event-media');
-- Uploads are performed through an authorized Edge Function; no browser INSERT policy is granted.
