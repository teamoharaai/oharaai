-- ============================================================================
-- 030_friend_connection_security.sql
--
-- Hardens migration 028's social-graph foundation:
--   1. Authenticated clients can read their own edges but cannot write the
--      friend_connections table directly.
--   2. Friend requests and responses go through narrow SECURITY DEFINER RPCs.
--   3. The database enforces immutable participants and the one-way
--      pending -> accepted/declined state machine.
--   4. get_profiles_by_ids only hydrates the caller or a live connection,
--      rather than acting as an arbitrary authenticated profile lookup.
--   5. A requester must wait seven days before re-requesting the same person
--      after that person declines. The person who declined may still initiate
--      a request in the opposite direction.
-- ============================================================================

begin;

-- Normalize any pre-existing terminal rows before adding the timestamp
-- invariant. Invite redemption already writes responded_at; this is defensive
-- for rows created through the overly-permissive 028 insert policy.
update public.friend_connections
set responded_at = created_at
where status in ('accepted', 'declined')
  and responded_at is null;

update public.friend_connections
set responded_at = null
where status = 'pending'
  and responded_at is not null;

alter table public.friend_connections
  add constraint friend_connections_response_timestamp_consistent
  check (
    (status = 'pending' and responded_at is null)
    or
    (status in ('accepted', 'declined') and responded_at is not null)
  );

-- Participant identity and lifecycle are immutable outside an explicit future
-- migration. This protects the table even if broad UPDATE privileges are
-- accidentally granted again later.
create or replace function public.enforce_friend_connection_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.requester_id is distinct from old.requester_id
    or new.addressee_id is distinct from old.addressee_id
    or new.created_at is distinct from old.created_at
  then
    raise exception using
      errcode = '23514',
      message = 'friend_connection_participants_are_immutable';
  end if;

  if old.status <> 'pending'
    or new.status not in ('accepted', 'declined')
    or new.responded_at is null
  then
    raise exception using
      errcode = '23514',
      message = 'invalid_friend_connection_transition';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_friend_connection_update() from public;
revoke all on function public.enforce_friend_connection_update() from anon;
revoke all on function public.enforce_friend_connection_update() from authenticated;

drop trigger if exists enforce_friend_connection_update
  on public.friend_connections;

create trigger enforce_friend_connection_update
before update on public.friend_connections
for each row
execute function public.enforce_friend_connection_update();

-- Keep explicit policies as defense in depth, but remove all client-side write
-- privileges below. The 028 INSERT policy did not require pending status, and
-- its UPDATE policy implicitly reused status='pending' as WITH CHECK, blocking
-- the intended transition.
drop policy if exists "Users can send friend requests"
  on public.friend_connections;
drop policy if exists "Users can send pending friend requests"
  on public.friend_connections;
drop policy if exists "Addressee can respond to pending requests"
  on public.friend_connections;

create policy "Users can send pending friend requests"
on public.friend_connections
for insert
to authenticated
with check (
  auth.uid() = requester_id
  and status = 'pending'
  and responded_at is null
);

create policy "Addressee can respond to pending requests"
on public.friend_connections
for update
to authenticated
using (
  auth.uid() = addressee_id
  and status = 'pending'
)
with check (
  auth.uid() = addressee_id
  and status in ('accepted', 'declined')
  and responded_at is not null
);

-- The table is read-only to authenticated clients. Mutations are capabilities
-- exposed by the RPCs below, keeping writable columns and transitions narrow.
revoke all on table public.friend_connections from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.friend_connections
  from authenticated;
grant select on table public.friend_connections to authenticated;

create or replace function public.send_friend_request(p_addressee_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_requester_id uuid := auth.uid();
  v_connection_id uuid;
  v_existing public.friend_connections%rowtype;
  v_last_declined_at timestamptz;
begin
  if v_requester_id is null then
    raise exception using errcode = '42501', message = 'unauthorized';
  end if;

  if p_addressee_id is null then
    raise exception using errcode = '22023', message = 'addressee_id_required';
  end if;

  if p_addressee_id = v_requester_id then
    raise exception using errcode = '22023', message = 'cannot_friend_self';
  end if;

  perform 1
  from public.profiles p
  where p.id = p_addressee_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'profile_not_found';
  end if;

  -- Serialize against an existing live edge. Replaying the same outgoing
  -- request is idempotent; an incoming request must still be explicitly
  -- accepted by its addressee.
  select fc.*
  into v_existing
  from public.friend_connections fc
  where fc.status in ('pending', 'accepted')
    and least(fc.requester_id, fc.addressee_id)
      = least(v_requester_id, p_addressee_id)
    and greatest(fc.requester_id, fc.addressee_id)
      = greatest(v_requester_id, p_addressee_id)
  for update;

  if found then
    if v_existing.status = 'pending'
      and v_existing.requester_id = v_requester_id
    then
      return v_existing.id;
    end if;

    if v_existing.status = 'pending' then
      raise exception using
        errcode = 'P0001',
        message = 'friend_request_pending_incoming';
    end if;

    raise exception using
      errcode = '23505',
      message = 'friend_connection_exists';
  end if;

  -- A decline only cools down the requester who was declined. The addressee
  -- retains agency to initiate a new request in the opposite direction.
  select max(coalesce(fc.responded_at, fc.created_at))
  into v_last_declined_at
  from public.friend_connections fc
  where fc.requester_id = v_requester_id
    and fc.addressee_id = p_addressee_id
    and fc.status = 'declined';

  if v_last_declined_at is not null
    and v_last_declined_at > now() - interval '7 days'
  then
    raise exception using
      errcode = 'P0001',
      message = 'friend_request_cooldown',
      detail = 'A declined request cannot be resent for seven days.';
  end if;

  begin
    insert into public.friend_connections (requester_id, addressee_id)
    values (v_requester_id, p_addressee_id)
    returning id into v_connection_id;
  exception
    when unique_violation then
      -- A concurrent request may have won after the locked lookup above.
      select fc.*
      into v_existing
      from public.friend_connections fc
      where fc.status in ('pending', 'accepted')
        and least(fc.requester_id, fc.addressee_id)
          = least(v_requester_id, p_addressee_id)
        and greatest(fc.requester_id, fc.addressee_id)
          = greatest(v_requester_id, p_addressee_id);

      if found
        and v_existing.status = 'pending'
        and v_existing.requester_id = v_requester_id
      then
        return v_existing.id;
      end if;

      raise exception using
        errcode = '23505',
        message = 'friend_connection_exists';
  end;

  return v_connection_id;
end;
$$;

revoke all on function public.send_friend_request(uuid) from public;
revoke all on function public.send_friend_request(uuid) from anon;
grant execute on function public.send_friend_request(uuid) to authenticated;

create or replace function public.respond_to_friend_request(
  p_connection_id uuid,
  p_response text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_response text := lower(btrim(coalesce(p_response, '')));
  v_connection_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'unauthorized';
  end if;

  if p_connection_id is null then
    raise exception using errcode = '22023', message = 'connection_id_required';
  end if;

  if v_response not in ('accepted', 'declined') then
    raise exception using
      errcode = '22023',
      message = 'friend_response_must_be_accepted_or_declined';
  end if;

  update public.friend_connections fc
  set
    status = v_response,
    responded_at = now()
  where fc.id = p_connection_id
    and fc.addressee_id = v_user_id
    and fc.status = 'pending'
  returning fc.id into v_connection_id;

  if v_connection_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'friend_request_not_found_or_already_handled';
  end if;

  return v_connection_id;
end;
$$;

revoke all on function public.respond_to_friend_request(uuid, text) from public;
revoke all on function public.respond_to_friend_request(uuid, text) from anon;
grant execute on function public.respond_to_friend_request(uuid, text) to authenticated;

-- Migration 028 described this helper as connection hydration, but its original
-- SECURITY DEFINER body accepted arbitrary profile IDs. Restrict it to self or
-- the other party of a live pending/accepted edge.
create or replace function public.get_profiles_by_ids(user_ids uuid[])
returns table (id uuid, username citext, display_name text, avatar_url text)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'unauthorized';
  end if;

  if coalesce(cardinality(user_ids), 0) > 500 then
    raise exception using
      errcode = '22023',
      message = 'too_many_profile_ids';
  end if;

  return query
  select p.id, p.username, p.display_name, p.avatar_url
  from public.profiles p
  where p.id = any(user_ids)
    and (
      p.id = v_user_id
      or exists (
        select 1
        from public.friend_connections fc
        where fc.status in ('pending', 'accepted')
          and (
            (fc.requester_id = v_user_id and fc.addressee_id = p.id)
            or
            (fc.addressee_id = v_user_id and fc.requester_id = p.id)
          )
      )
    )
  limit 500;
end;
$$;

revoke all on function public.get_profiles_by_ids(uuid[]) from public;
revoke all on function public.get_profiles_by_ids(uuid[]) from anon;
grant execute on function public.get_profiles_by_ids(uuid[]) to authenticated;

comment on function public.send_friend_request(uuid) is
  'Creates an idempotent pending friend request and enforces a seven-day same-direction cooldown after decline.';
comment on function public.respond_to_friend_request(uuid, text) is
  'Allows only the pending request addressee to accept or decline a friend request.';
comment on function public.get_profiles_by_ids(uuid[]) is
  'Hydrates self or profiles connected to the caller by a live pending/accepted friend edge.';

commit;
