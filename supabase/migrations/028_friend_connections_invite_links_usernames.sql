-- ============================================================================
-- 028_friend_connections_invite_links_usernames.sql
--
-- Social graph foundation. Three interdependent parts + supporting RPCs:
--   Part 1  profiles.username  (add nullable citext, backfill, NOT NULL + UNIQUE,
--           format constraint, teach handle_new_user() to populate it)
--   Part 2  friend_connections (request/accept model, RLS)
--   Part 3  invite_links       (crypto-random code, RLS)
--   Part 4  RPCs               (friend count, username search, id hydration,
--           invite redemption) — all SECURITY DEFINER, none broaden profiles RLS
--
-- rls_auto_enable() (001) fires on each CREATE TABLE below and turns RLS on
-- automatically; the explicit policies here are still required or the tables are
-- silent deny-all.
-- ============================================================================

-- citext gives case-insensitive comparison/uniqueness for usernames. Lands in
-- the `extensions` schema, which is already on the database search_path.
create extension if not exists citext;

-- ============================================================================
-- Part 1 — profiles.username
-- ============================================================================

-- Nullable first so existing rows survive the ADD; backfilled below, then locked
-- to NOT NULL + UNIQUE.
alter table public.profiles
  add column if not exists username citext;

-- Shared slugify + collision-dedupe helper. Used by both the one-time backfill
-- and handle_new_user() so signup and backfill produce identical usernames.
-- SECURITY DEFINER so it can always read existing usernames regardless of caller;
-- search_path pinned to public, extensions so the citext type/operators resolve.
create or replace function public.generate_unique_username(p_base text, p_id uuid)
  returns text
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  v_slug      text;
  v_candidate text;
  v_suffix    integer := 1;
  v_maxbase   integer;
begin
  -- slugify: lowercase, non-[a-z0-9_] runs -> '_', collapse '_' runs, trim '_'
  v_slug := lower(coalesce(p_base, ''));
  v_slug := regexp_replace(v_slug, '[^a-z0-9_]+', '_', 'g');
  v_slug := regexp_replace(v_slug, '_+', '_', 'g');
  v_slug := trim(both '_' from v_slug);
  v_slug := left(v_slug, 20);
  v_slug := trim(both '_' from v_slug);  -- truncation may have exposed a trailing '_'

  -- unusable (empty or under the 3-char floor) -> stable per-user fallback
  if v_slug is null or char_length(v_slug) < 3 then
    v_slug := left('user_' || left(replace(p_id::text, '-', ''), 8), 20);
  end if;

  -- dedupe: bare slug first, then slug2, slug3, ... keeping total <= 20 chars
  v_candidate := v_slug;
  loop
    exit when not exists (
      select 1 from public.profiles where username = v_candidate::citext
    );
    v_suffix  := v_suffix + 1;
    v_maxbase := 20 - char_length(v_suffix::text);
    v_candidate := left(v_slug, v_maxbase) || v_suffix::text;
  end loop;

  return v_candidate;
end;
$$;

-- Backfill existing rows in created_at order so the earliest owner of a given
-- slug keeps the bare form and later collisions take the numeric suffix.
do $$
declare
  r record;
begin
  for r in
    select id, display_name
    from public.profiles
    where username is null
    order by created_at asc, id asc
  loop
    update public.profiles
    set username = public.generate_unique_username(r.display_name, r.id)
    where id = r.id;
  end loop;
end;
$$;

-- Lock it down now that every row has a value.
alter table public.profiles
  alter column username set not null;

-- Case-insensitive uniqueness (citext).
alter table public.profiles
  add constraint profiles_username_key unique (username);

-- Format guard. Cast to text so the check is case-SENSITIVE and actually
-- enforces stored-lowercase (citext's own ~ operator is case-insensitive and
-- would let uppercase slip through).
alter table public.profiles
  add constraint profiles_username_format_check
  check (username::text ~ '^[a-z0-9_]{3,20}$');

-- Teach handle_new_user() to populate username. Prefers a client-supplied
-- raw_user_meta_data->>'username' when present AND valid AND free; otherwise
-- falls back to the same slugify+dedupe used by the backfill, so signup works
-- whether or not the frontend username field has shipped. Existing
-- exception-wrapping preserved so profile creation never blocks signup.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  v_username text;
begin
  v_username := nullif(btrim(lower(NEW.raw_user_meta_data->>'username')), '');

  if v_username is null
     or v_username !~ '^[a-z0-9_]{3,20}$'
     or exists (select 1 from public.profiles where username = v_username::citext)
  then
    v_username := public.generate_unique_username(
      coalesce(NEW.raw_user_meta_data->>'display_name', ''),
      NEW.id
    );
  end if;

  insert into public.profiles (id, display_name, timezone, username)
  values (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'display_name', ''),
    coalesce(NEW.raw_user_meta_data->>'timezone', 'UTC'),
    v_username
  );
  return NEW;
exception when others then
  raise warning '[handle_new_user] Failed to create profile for user %: %', NEW.id, SQLERRM;
  return NEW;
end;
$$;

-- ============================================================================
-- Part 2 — friend_connections (request / accept)
-- ============================================================================

create table public.friend_connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_connections_no_self check (requester_id <> addressee_id)
);

-- One live edge per unordered pair. Blocks simultaneous A->B / B->A pending and
-- duplicate accepted pairs. Declined rows persist as history and are excluded,
-- so a fresh request after a decline is still allowed.
create unique index friend_connections_unique_pair
  on public.friend_connections (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  )
  where status in ('pending', 'accepted');

create index idx_friend_connections_requester on public.friend_connections (requester_id);
create index idx_friend_connections_addressee on public.friend_connections (addressee_id);

alter table public.friend_connections enable row level security;

-- Either party may read the row.
create policy "Users can read own friend connections" on public.friend_connections
  for select using (auth.uid() in (requester_id, addressee_id));

-- Only the requester may create, and only as themselves.
create policy "Users can send friend requests" on public.friend_connections
  for insert with check (auth.uid() = requester_id);

-- Only the addressee may respond, and only while still pending. Prevents the
-- requester self-accepting. WITH CHECK left unrestricted beyond USING so the
-- addressee can move it to accepted/declined.
create policy "Addressee can respond to pending requests" on public.friend_connections
  for update using (auth.uid() = addressee_id and status = 'pending');

-- ============================================================================
-- Part 3 — invite_links
-- ============================================================================

-- URL-safe, crypto-random invite code (96 bits: 12 random bytes -> 16 base64
-- chars, +/ swapped for -_, no padding). Used as the column default.
create or replace function public.generate_invite_code()
  returns text
  language sql
  volatile
  security definer
  set search_path = extensions, public
as $$
  select translate(encode(gen_random_bytes(12), 'base64'), '+/', '-_');
$$;

create table public.invite_links (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique default public.generate_invite_code(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz,
  max_uses   integer,          -- NULL = unlimited
  uses_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_invite_links_created_by on public.invite_links (created_by);

alter table public.invite_links enable row level security;

-- Owner-only. No public SELECT at all — redemption goes through the SECURITY
-- DEFINER RPC below, never a direct row read, so codes can't be enumerated via
-- a permissive policy.
create policy "Users can read own invite links" on public.invite_links
  for select using (created_by = auth.uid());

create policy "Users can create own invite links" on public.invite_links
  for insert with check (created_by = auth.uid());

-- ============================================================================
-- Part 4 — RPCs
-- ============================================================================

-- Public-facing friend count: accepted connections where user_id is either
-- party. This is the ONLY public friend datum — the friend list itself is never
-- exposed to anyone but its owner (via the owner-scoped SELECT on the base table).
create or replace function public.get_friend_count(user_id uuid)
  returns integer
  language sql
  stable
  security definer
  set search_path = public
as $$
  select count(*)::integer
  from public.friend_connections fc
  where fc.status = 'accepted'
    and user_id in (fc.requester_id, fc.addressee_id);
$$;

-- Username search embedded in the send-request flow (not a general directory).
-- 3-char minimum enforced here, not trusted from the caller. Prefix match,
-- case-insensitive via citext, LIKE metacharacters escaped, capped at 20.
create or replace function public.search_profiles_by_username(query text)
  returns table (id uuid, username citext, display_name text, avatar_url text)
  language plpgsql
  stable
  security definer
  set search_path = public, extensions
as $$
declare
  v_q       text := btrim(coalesce(query, ''));
  v_pattern text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;
  if char_length(v_q) < 3 then
    raise exception 'Search query must be at least 3 characters';
  end if;

  -- escape LIKE wildcards so user input matches literally
  v_pattern := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');

  return query
  select p.id, p.username, p.display_name, p.avatar_url
  from public.profiles p
  where p.username like (v_pattern || '%')
  order by char_length(p.username::text), p.username::text
  limit 20;
end;
$$;

-- Hydrate the caller's own friend list once they hold the IDs from their
-- friend_connections rows. Returns the same public fields as search.
create or replace function public.get_profiles_by_ids(user_ids uuid[])
  returns table (id uuid, username citext, display_name text, avatar_url text)
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  return query
  select p.id, p.username, p.display_name, p.avatar_url
  from public.profiles p
  where p.id = any(user_ids)
  limit 500;
end;
$$;

-- Redeem an invite link. Validates expiry/uses/self-redemption, then writes an
-- accepted connection directly (the one place friendship skips 'pending').
-- Increments uses_count atomically under a row lock. Already-connected is
-- returned gracefully rather than raised; an outstanding pending request between
-- the two is upgraded to accepted instead of duplicated.
create or replace function public.redeem_invite_link(code text)
  returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_invite  public.invite_links%rowtype;
  v_creator uuid;
  v_conn    public.friend_connections%rowtype;
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  -- lock the invite row for the duration of the txn (atomic uses_count bump)
  select * into v_invite
  from public.invite_links il
  where il.code = redeem_invite_link.code
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'invalid_code');
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    return jsonb_build_object('success', false, 'error', 'expired');
  end if;
  if v_invite.max_uses is not null and v_invite.uses_count >= v_invite.max_uses then
    return jsonb_build_object('success', false, 'error', 'exhausted');
  end if;

  v_creator := v_invite.created_by;

  if v_creator = v_uid then
    return jsonb_build_object('success', false, 'error', 'self_redemption');
  end if;

  -- existing live edge between the two (either direction), locked
  select * into v_conn
  from public.friend_connections fc
  where fc.status in ('pending', 'accepted')
    and least(fc.requester_id, fc.addressee_id) = least(v_uid, v_creator)
    and greatest(fc.requester_id, fc.addressee_id) = greatest(v_uid, v_creator)
  for update;

  if found then
    if v_conn.status = 'accepted' then
      -- already friends: idempotent no-op, do not consume a use
      return jsonb_build_object(
        'success', true, 'status', 'already_connected', 'friend_id', v_creator
      );
    end if;
    -- outstanding pending request -> accept it rather than insert a duplicate
    update public.friend_connections
    set status = 'accepted', responded_at = now()
    where id = v_conn.id;
  else
    -- fresh accepted edge: creator is modeled as requester, redeemer as addressee
    begin
      insert into public.friend_connections (requester_id, addressee_id, status, responded_at)
      values (v_creator, v_uid, 'accepted', now());
    exception when unique_violation then
      -- raced against a concurrent redemption/accept: treat as connected
      return jsonb_build_object(
        'success', true, 'status', 'already_connected', 'friend_id', v_creator
      );
    end;
  end if;

  update public.invite_links
  set uses_count = uses_count + 1
  where id = v_invite.id;

  return jsonb_build_object('success', true, 'status', 'connected', 'friend_id', v_creator);
end;
$$;

-- Execute grants: lock to authenticated callers (matches 023 convention).
revoke all on function public.get_friend_count(uuid) from public;
revoke all on function public.search_profiles_by_username(text) from public;
revoke all on function public.get_profiles_by_ids(uuid[]) from public;
revoke all on function public.redeem_invite_link(text) from public;

grant execute on function public.get_friend_count(uuid) to authenticated;
grant execute on function public.search_profiles_by_username(text) to authenticated;
grant execute on function public.get_profiles_by_ids(uuid[]) to authenticated;
grant execute on function public.redeem_invite_link(text) to authenticated;
