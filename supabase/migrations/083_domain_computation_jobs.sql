-- Migration 083: bounded domain computation jobs.
--
-- Momentum's open week is a mutable projection, separate from immutable closed
-- weekly snapshots. A short lease serializes recalculation per user/week.
-- Echo reconciliation claims a bounded set of changed legacy entries and uses
-- expiring leases so failed workers can be retried without duplicate AI calls.

alter table public.momentum_profiles
  add column if not exists current_week_start date,
  add column if not exists current_summary jsonb,
  add column if not exists current_calculation_hash text;

create table if not exists public.momentum_recalculation_leases (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  lease_token uuid not null,
  lease_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.momentum_recalculation_leases enable row level security;
revoke all on public.momentum_recalculation_leases from public, anon, authenticated;
grant all on public.momentum_recalculation_leases to service_role;

create or replace function public.claim_momentum_recalculation_v1(
  p_user_id uuid,
  p_week_start date,
  p_lease_token uuid,
  p_lease_seconds integer default 180
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_claimed uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trusted server role required';
  end if;
  if p_lease_seconds < 30 or p_lease_seconds > 600 then
    raise exception 'Momentum lease must be between 30 and 600 seconds';
  end if;

  insert into public.momentum_recalculation_leases (
    user_id, week_start, lease_token, lease_expires_at
  ) values (
    p_user_id, p_week_start, p_lease_token,
    statement_timestamp() + make_interval(secs => p_lease_seconds)
  )
  on conflict (user_id, week_start) do update set
    lease_token = excluded.lease_token,
    lease_expires_at = excluded.lease_expires_at,
    updated_at = statement_timestamp()
  where public.momentum_recalculation_leases.lease_expires_at <= statement_timestamp()
     or public.momentum_recalculation_leases.lease_token = excluded.lease_token
  returning lease_token into v_claimed;

  return v_claimed = p_lease_token;
end;
$$;

create or replace function public.release_momentum_recalculation_v1(
  p_user_id uuid,
  p_week_start date,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trusted server role required';
  end if;
  delete from public.momentum_recalculation_leases
  where user_id = p_user_id
    and week_start = p_week_start
    and lease_token = p_lease_token;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

revoke all on function public.claim_momentum_recalculation_v1(uuid, date, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.release_momentum_recalculation_v1(uuid, date, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_momentum_recalculation_v1(uuid, date, uuid, integer)
  to service_role;
grant execute on function public.release_momentum_recalculation_v1(uuid, date, uuid)
  to service_role;

-- Project Detail reads the owner's canonical open-week Goal projections when
-- available and falls back to immutable closed profiles/snapshots. It never
-- computes a Project-specific Momentum metric.
create or replace function public.get_project_goal_momentum_v11(p_project_id uuid)
returns table(goal_id uuid, current_value numeric, weekly_change numeric, status text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    goal.id,
    coalesce((current_goal.value->>'currentValue')::numeric, goal_profile.current_value),
    coalesce(
      (current_goal.value->>'weeklyChange')::numeric,
      case
        when latest_closed.previous_value is null then 0
        else latest_closed.current_value - latest_closed.previous_value
      end
    ),
    coalesce(current_goal.value->>'status', goal_profile.status)
  from public.goals goal
  left join public.goal_momentum_profiles goal_profile
    on goal_profile.goal_id = goal.id and goal_profile.user_id = goal.user_id
  left join public.momentum_profiles portfolio
    on portfolio.user_id = goal.user_id
  left join lateral (
    select item.value
    from jsonb_array_elements(coalesce(portfolio.current_summary->'goals', '[]'::jsonb)) item(value)
    where item.value->>'goalId' = goal.id::text
    limit 1
  ) current_goal on true
  left join lateral (
    select snapshot.current_value, snapshot.previous_value
    from public.goal_momentum_weekly_snapshots snapshot
    where snapshot.goal_id = goal.id and snapshot.user_id = goal.user_id
    order by snapshot.week_start desc, snapshot.revision desc
    limit 1
  ) latest_closed on true
  where goal.project_id = p_project_id
    and public.is_project_member_v11(p_project_id, auth.uid());
$$;

revoke all on function public.get_project_goal_momentum_v11(uuid) from public, anon;
grant execute on function public.get_project_goal_momentum_v11(uuid) to authenticated;

alter table public.echo_entries
  add column if not exists reconcile_lease_token uuid,
  add column if not exists reconcile_lease_expires_at timestamptz;

create index if not exists idx_echo_entries_reconcile_queue
  on public.echo_entries (user_id, ai_status, last_attempted_at, created_at)
  where ai_status in ('not_requested', 'pending', 'failed');

create or replace function public.claim_echo_reconciliation_v1(
  p_entry_ids uuid[] default null,
  p_limit integer default 5,
  p_lease_token uuid default gen_random_uuid(),
  p_lease_seconds integer default 120
)
returns table (id uuid, content text, retry_count integer)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_limit < 1 or p_limit > 10 then
    raise exception 'Echo reconciliation limit must be between 1 and 10';
  end if;
  if p_lease_seconds < 30 or p_lease_seconds > 300 then
    raise exception 'Echo lease must be between 30 and 300 seconds';
  end if;

  return query
  with candidates as (
    select entry.id
    from public.echo_entries entry
    where entry.user_id = auth.uid()
      and entry.ai_insight_requested = true
      and (p_entry_ids is null or cardinality(p_entry_ids) = 0 or entry.id = any(p_entry_ids))
      and (
        entry.ai_status in ('not_requested', 'pending')
        or (
          entry.ai_status = 'failed'
          and entry.retry_count < 3
          and (entry.last_attempted_at is null or entry.last_attempted_at < statement_timestamp() - interval '10 minutes')
        )
      )
      and (
        entry.reconcile_lease_expires_at is null
        or entry.reconcile_lease_expires_at <= statement_timestamp()
      )
    order by coalesce(entry.last_attempted_at, entry.created_at), entry.id
    for update skip locked
    limit p_limit
  )
  update public.echo_entries entry set
    reconcile_lease_token = p_lease_token,
    reconcile_lease_expires_at = statement_timestamp() + make_interval(secs => p_lease_seconds),
    last_attempted_at = statement_timestamp()
  from candidates
  where entry.id = candidates.id
  returning entry.id, entry.content, entry.retry_count;
end;
$$;

revoke all on function public.claim_echo_reconciliation_v1(uuid[], integer, uuid, integer)
  from public, anon;
grant execute on function public.claim_echo_reconciliation_v1(uuid[], integer, uuid, integer)
  to authenticated;

comment on table public.momentum_recalculation_leases is
  'Expiring single-flight leases for trusted Momentum recalculation by user and authoritative week.';
comment on function public.claim_echo_reconciliation_v1(uuid[], integer, uuid, integer) is
  'Atomically claims a bounded, optionally change-scoped set of retryable Echo entries for the authenticated user.';
