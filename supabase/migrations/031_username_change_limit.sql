-- ============================================================================
-- 031_username_change_limit.sql
--
-- Lets authenticated users change profiles.username while enforcing at most
-- three successful changes in any rolling seven-day window. The limiter lives
-- in Postgres so direct profile updates cannot bypass it.
-- ============================================================================

create table public.username_change_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  change_timestamps timestamptz[] not null default '{}'::timestamptz[]
);

alter table public.username_change_limits enable row level security;

create policy "Users can read own username change limit"
  on public.username_change_limits
  for select
  using (user_id = auth.uid());

-- No client INSERT, UPDATE, or DELETE policies are intentional. Only the
-- SECURITY DEFINER trigger below can mutate limiter rows.

create or replace function public.enforce_username_change_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_recorded boolean;
begin
  -- Match signup and availability-check normalization. Normalizing before the
  -- comparison means whitespace/case-only submissions do not consume a change.
  new.username := lower(btrim(new.username::text));

  if new.username is not distinct from old.username then
    return new;
  end if;

  insert into public.username_change_limits as limits (
    user_id,
    change_timestamps
  )
  values (
    old.id,
    array[v_now]
  )
  on conflict (user_id) do update
  set change_timestamps =
    array(
      select changed_at
      from unnest(limits.change_timestamps) as changed_at
      where changed_at > v_now - interval '7 days'
      order by changed_at
    ) || array[v_now]
  where (
    select count(*)
    from unnest(limits.change_timestamps) as changed_at
    where changed_at > v_now - interval '7 days'
  ) < 3
  returning true into v_recorded;

  if not coalesce(v_recorded, false) then
    raise exception using
      errcode = 'P0001',
      message = 'USERNAME_CHANGE_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_username_change_limit() from public;

create trigger enforce_username_change_limit_before_update
before update of username on public.profiles
for each row
execute function public.enforce_username_change_limit();
