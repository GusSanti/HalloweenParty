  -- HALLOWEEN PARTY 2026
  -- Script completo para executar no SQL Editor de um projeto Supabase novo.
  -- A autenticação e as senhas são administradas por auth.users (Supabase Auth).

  begin;

  create schema if not exists extensions;
  create extension if not exists pgcrypto with schema extensions;

  do $$ begin
    create type public.invitation_status as enum ('pending', 'active', 'used');
  exception when duplicate_object then null;
  end $$;

  do $$ begin
    create type public.staff_role as enum ('admin', 'gate');
  exception when duplicate_object then null;
  end $$;

  do $$ begin
    create type public.post_status as enum ('draft', 'published');
  exception when duplicate_object then null;
  end $$;

  create table if not exists public.event_settings (
    id uuid primary key default gen_random_uuid(),
    event_name text not null check (char_length(event_name) between 1 and 100),
    event_date date not null,
    event_time text,
    location_name text not null check (char_length(location_name) between 1 and 160),
    city text not null check (char_length(city) between 1 and 100),
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

  create unique index if not exists event_settings_one_active_idx
    on public.event_settings (active) where active;

  create table if not exists public.ticket_types (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.event_settings(id) on delete cascade,
    code text not null,
    name text not null check (char_length(name) between 1 and 100),
    price_cents integer not null check (price_cents >= 0),
    max_per_order smallint not null default 1 check (max_per_order between 1 and 20),
    sales_start timestamptz,
    sales_end timestamptz,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (event_id, code),
    check (sales_end is null or sales_start is null or sales_end > sales_start)
  );

  create table if not exists public.attendee_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null check (char_length(full_name) between 1 and 120),
    email text not null check (char_length(email) between 3 and 254),
    phone text not null default '' check (phone = '' or phone ~ '^[0-9]{10,20}$'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create unique index if not exists attendee_profiles_email_idx
    on public.attendee_profiles (lower(email));

  create table if not exists public.staff_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role public.staff_role not null default 'gate',
    active boolean not null default true,
    display_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

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
      (status = 'pending' and activated_at is null and used_at is null) or
      (status = 'active' and activated_at is not null and used_at is null) or
      (status = 'used' and activated_at is not null and used_at is not null)
    )
  );

  create index if not exists invitations_status_created_idx
    on public.invitations (status, created_at desc);
  create index if not exists invitations_attendee_idx
    on public.invitations (attendee_user_id);

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
    check (status = 'draft' or (status = 'published' and published_at is not null))
  );

  create index if not exists posts_published_idx
    on public.posts (published_at desc) where status = 'published';

  create table if not exists public.faqs (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.event_settings(id) on delete cascade,
    question text not null,
    answer text not null,
    sort_order smallint not null default 0,
    published boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (event_id, question)
  );

  create table if not exists public.gallery_items (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.event_settings(id) on delete cascade,
    image_path text not null,
    alt_text text not null,
    caption text,
    archive_year smallint check (archive_year between 1900 and 2200),
    aspect_ratio text check (aspect_ratio in ('portrait', 'landscape', 'wide')),
    sort_order smallint not null default 0,
    published boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table if not exists public.audit_logs (
    id bigint generated always as identity primary key,
    actor_user_id uuid references auth.users(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

  create index if not exists audit_logs_created_idx
    on public.audit_logs (created_at desc);
  create index if not exists audit_logs_entity_idx
    on public.audit_logs (entity_type, entity_id);

  create table if not exists public.rate_limits (
    key_hash text primary key,
    window_started_at timestamptz not null,
    request_count integer not null default 1 check (request_count > 0),
    updated_at timestamptz not null default now()
  );

  create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  set search_path = ''
  as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

  do $$
  declare table_name text;
  begin
    foreach table_name in array array[
      'event_settings', 'ticket_types', 'attendee_profiles', 'staff_profiles',
      'invitations', 'posts', 'faqs', 'gallery_items'
    ] loop
      execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
      execute format(
        'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
        table_name, table_name
      );
    end loop;
  end $$;

  create or replace function public.current_staff_role()
  returns public.staff_role
  language sql
  stable
  security definer
  set search_path = ''
  as $$
    select role
    from public.staff_profiles
    where user_id = auth.uid() and active
    limit 1;
  $$;

  revoke all on function public.current_staff_role() from public;
  grant execute on function public.current_staff_role() to authenticated;

  create or replace function public.generate_invitation_code()
  returns text
  language plpgsql
  volatile
  security definer
  set search_path = ''
  as $$
  declare
    alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    random_bytes bytea := extensions.gen_random_bytes(8);
    generated text := '';
    position integer;
  begin
    for position in 0..7 loop
      generated := generated || substr(
        alphabet,
        (get_byte(random_bytes, position) % char_length(alphabet)) + 1,
        1
      );
    end loop;
    return 'H26-' || substr(generated, 1, 4) || '-' || substr(generated, 5, 4);
  end;
  $$;

  revoke all on function public.generate_invitation_code() from public, anon, authenticated;

  create or replace function public.handle_new_attendee()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    active_event_id uuid;
    candidate_code text;
  begin
    insert into public.attendee_profiles (user_id, full_name, email, phone)
    values (
      new.id,
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        'Convidado'
      ),
      lower(new.email),
      regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g')
    )
    on conflict (user_id) do update set
      full_name = excluded.full_name,
      email = excluded.email,
      phone = excluded.phone;

    select id into active_event_id
    from public.event_settings
    where active
    order by created_at desc
    limit 1;

    if active_event_id is not null then
      loop
        candidate_code := public.generate_invitation_code();
        begin
          insert into public.invitations (event_id, attendee_user_id, code)
          values (active_event_id, new.id, candidate_code)
          on conflict (event_id, attendee_user_id) do nothing;
          exit;
        exception when unique_violation then
          -- Em uma colisão de código, gera outro automaticamente.
        end;
      end loop;
    end if;

    return new;
  end;
  $$;

  revoke all on function public.handle_new_attendee() from public, anon, authenticated;

  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_attendee();

  create or replace function public.set_invitation_status(
    p_invitation_id uuid,
    p_status public.invitation_status
  )
  returns public.invitations
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    actor uuid := auth.uid();
    actor_role public.staff_role;
    target public.invitations%rowtype;
    old_status public.invitation_status;
  begin
    select role into actor_role
    from public.staff_profiles
    where user_id = actor and active;

    if actor_role is null then
      raise exception 'forbidden';
    end if;
    if actor_role = 'gate' and p_status <> 'used' then
      raise exception 'forbidden';
    end if;

    select * into target
    from public.invitations
    where id = p_invitation_id
    for update;

    if not found then
      raise exception 'invitation_not_found';
    end if;
    if actor_role = 'gate' and target.status <> 'active' then
      raise exception 'invalid_invitation_state';
    end if;

    old_status := target.status;

    update public.invitations
    set
      status = p_status,
      activated_at = case
        when p_status in ('active', 'used') then coalesce(activated_at, now())
        else null
      end,
      activated_by = case
        when p_status in ('active', 'used') then coalesce(activated_by, actor)
        else null
      end,
      used_at = case when p_status = 'used' then coalesce(used_at, now()) else null end,
      used_by = case when p_status = 'used' then coalesce(used_by, actor) else null end
    where id = p_invitation_id
    returning * into target;

    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'invitation.status_changed',
      'invitation',
      target.id::text,
      jsonb_build_object('from', old_status, 'to', p_status)
    );

    return target;
  end;
  $$;

  revoke all on function public.set_invitation_status(uuid, public.invitation_status) from public, anon;
  grant execute on function public.set_invitation_status(uuid, public.invitation_status) to authenticated;

  create or replace function public.check_in_invitation(p_code text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    actor uuid := auth.uid();
    actor_role public.staff_role;
    normalized_code text := regexp_replace(upper(trim(p_code)), '^H26:', '');
    target public.invitations%rowtype;
  begin
    select role into actor_role
    from public.staff_profiles
    where user_id = actor and active;

    if actor_role is null or actor_role not in ('admin', 'gate') then
      raise exception 'forbidden';
    end if;

    select * into target
    from public.invitations
    where code = normalized_code
    for update;

    if not found then
      return jsonb_build_object('result', 'invalid');
    end if;
    if target.status = 'used' then
      return jsonb_build_object('result', 'already_used', 'used_at', target.used_at);
    end if;
    if target.status <> 'active' then
      return jsonb_build_object('result', 'invalid', 'status', target.status);
    end if;

    update public.invitations
    set status = 'used', used_at = now(), used_by = actor
    where id = target.id
    returning * into target;

    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'invitation.checkin.success',
      'invitation',
      target.id::text,
      jsonb_build_object('code', target.code)
    );

    return jsonb_build_object(
      'result', 'success',
      'invitation_id', target.id,
      'used_at', target.used_at
    );
  end;
  $$;

  revoke all on function public.check_in_invitation(text) from public, anon;
  grant execute on function public.check_in_invitation(text) to authenticated;

  create or replace function public.consume_rate_limit(
    p_key_hash text,
    p_limit integer,
    p_window_seconds integer
  )
  returns boolean
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare allowed boolean;
  begin
    insert into public.rate_limits (key_hash, window_started_at, request_count)
    values (p_key_hash, now(), 1)
    on conflict (key_hash) do update set
      window_started_at = case
        when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
          then now()
        else public.rate_limits.window_started_at
      end,
      request_count = case
        when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
          then 1
        else public.rate_limits.request_count + 1
      end,
      updated_at = now()
    returning request_count <= p_limit into allowed;

    return allowed;
  end;
  $$;

  revoke all on function public.consume_rate_limit(text, integer, integer)
    from public, anon, authenticated;
  grant execute on function public.consume_rate_limit(text, integer, integer)
    to service_role;

  alter table public.event_settings enable row level security;
  alter table public.ticket_types enable row level security;
  alter table public.attendee_profiles enable row level security;
  alter table public.staff_profiles enable row level security;
  alter table public.invitations enable row level security;
  alter table public.posts enable row level security;
  alter table public.faqs enable row level security;
  alter table public.gallery_items enable row level security;
  alter table public.audit_logs enable row level security;
  alter table public.rate_limits enable row level security;

  drop policy if exists "public reads active event" on public.event_settings;
  create policy "public reads active event"
  on public.event_settings for select to anon, authenticated
  using (active);

  drop policy if exists "admin manages events" on public.event_settings;
  create policy "admin manages events"
  on public.event_settings for all to authenticated
  using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

  drop policy if exists "public reads active ticket types" on public.ticket_types;
  create policy "public reads active ticket types"
  on public.ticket_types for select to anon, authenticated
  using (
    active
    and (sales_start is null or sales_start <= now())
    and (sales_end is null or sales_end > now())
  );

  drop policy if exists "admin manages ticket types" on public.ticket_types;
  create policy "admin manages ticket types"
  on public.ticket_types for all to authenticated
  using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

  drop policy if exists "attendee reads own profile" on public.attendee_profiles;
  create policy "attendee reads own profile"
  on public.attendee_profiles for select to authenticated
  using (user_id = auth.uid());

  drop policy if exists "staff reads attendees" on public.attendee_profiles;
  create policy "staff reads attendees"
  on public.attendee_profiles for select to authenticated
  using (public.current_staff_role() in ('admin', 'gate'));

  drop policy if exists "staff reads own role" on public.staff_profiles;
  create policy "staff reads own role"
  on public.staff_profiles for select to authenticated
  using (user_id = auth.uid());

  drop policy if exists "attendee reads own invitation" on public.invitations;
  create policy "attendee reads own invitation"
  on public.invitations for select to authenticated
  using (attendee_user_id = auth.uid());

  drop policy if exists "staff reads invitations" on public.invitations;
  create policy "staff reads invitations"
  on public.invitations for select to authenticated
  using (public.current_staff_role() in ('admin', 'gate'));

  drop policy if exists "public reads published posts" on public.posts;
  create policy "public reads published posts"
  on public.posts for select to anon, authenticated
  using (status = 'published' and published_at <= now());

  drop policy if exists "admin manages posts" on public.posts;
  create policy "admin manages posts"
  on public.posts for all to authenticated
  using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

  drop policy if exists "public reads published faqs" on public.faqs;
  create policy "public reads published faqs"
  on public.faqs for select to anon, authenticated
  using (published);

  drop policy if exists "admin manages faqs" on public.faqs;
  create policy "admin manages faqs"
  on public.faqs for all to authenticated
  using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

  drop policy if exists "public reads published gallery" on public.gallery_items;
  create policy "public reads published gallery"
  on public.gallery_items for select to anon, authenticated
  using (published);

  drop policy if exists "admin manages gallery" on public.gallery_items;
  create policy "admin manages gallery"
  on public.gallery_items for all to authenticated
  using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

  revoke all on public.attendee_profiles, public.staff_profiles, public.invitations,
    public.audit_logs, public.rate_limits from anon, authenticated;

  grant select on public.event_settings, public.ticket_types, public.posts,
    public.faqs, public.gallery_items to anon, authenticated;
  grant insert, update, delete on public.event_settings, public.ticket_types,
    public.posts, public.faqs, public.gallery_items to authenticated;
  grant select on public.attendee_profiles, public.staff_profiles,
    public.invitations to authenticated;

  insert into storage.buckets (
    id, name, public, file_size_limit, allowed_mime_types
  )
  values (
    'event-media',
    'event-media',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "public reads event media" on storage.objects;
  create policy "public reads event media"
  on storage.objects for select to public
  using (bucket_id = 'event-media');

  -- Dados iniciais usados pelo site e pela função event-assistant.
  do $$
  begin
    if not exists (select 1 from public.event_settings where active) then
      insert into public.event_settings (
        event_name, event_date, event_time, location_name, city,
        instagram_url, whatsapp_url, active
      ) values (
        'HALLOWEEN', '2026-10-24', '20h30', 'Campo do Alencar', 'Abaeté',
        'https://instagram.com/halloween_abaete/',
        'https://wa.me/553798702778',
        true
      );
    end if;
  end $$;

  insert into public.ticket_types (
    event_id, code, name, price_cents, max_per_order, active
  )
  select id, 'GENERAL', 'Ingresso geral', 4500, 1, true
  from public.event_settings
  where active
  on conflict (event_id, code) do nothing;

  insert into public.faqs (event_id, question, answer, sort_order)
  select event.id, faq.question, faq.answer, faq.sort_order
  from public.event_settings event
  cross join (values
    ('Como recebo meu ingresso?', 'Após criar a conta, combine o pagamento pelo WhatsApp. A organização ativará o convite manualmente.', 1),
    ('Preciso imprimir o ingresso?', 'Não. Apresente o QR Code na tela do celular.', 2),
    ('O QR Code pode ser usado mais de uma vez?', 'Não. Cada convite permite somente uma entrada.', 3)
  ) as faq(question, answer, sort_order)
  where event.active
  on conflict (event_id, question) do nothing;

  commit;

  -- DEPOIS DE EXECUTAR ESTE SCRIPT:
  -- 1. Crie o usuário administrador em Authentication > Users no painel Supabase.
  -- 2. Execute o bloco abaixo, trocando pelo e-mail cadastrado:
  --
  -- insert into public.staff_profiles (user_id, role, active, display_name)
  -- select id, 'admin', true, 'Administrador'
  -- from auth.users
  -- where lower(email) = lower('seu-email@exemplo.com')
  -- on conflict (user_id) do update set role = 'admin', active = true;
