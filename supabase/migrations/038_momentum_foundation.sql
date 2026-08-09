-- Migration 038: backend-authoritative Momentum foundation
-- Implements private, versioned, reproducible weekly snapshots and normalized
-- event storage. Historical snapshots are immutable; recalculation creates a
-- superseding revision when the deterministic calculation hash changes.

create table if not exists public.momentum_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_value numeric(10,4) not null default 0 check (current_value >= 0),
  current_version text not null default 'momentum-v1.0',
  last_calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.momentum_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null,
  source_entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  deduplication_key text not null,
  eligibility_status text not null check (eligibility_status in ('included', 'excluded')),
  exclusion_reason text,
  created_at timestamptz not null default now(),
  unique (user_id, deduplication_key)
);

create index if not exists idx_momentum_events_user_occurred
  on public.momentum_events (user_id, occurred_at desc);

create table if not exists public.momentum_weekly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  timezone text not null,
  revision integer not null default 1 check (revision > 0),
  supersedes_snapshot_id uuid references public.momentum_weekly_snapshots(id),
  previous_value numeric(10,4) not null check (previous_value >= 0),
  next_value numeric(10,4) not null check (next_value >= 0),
  growth_quality_score numeric(8,4) not null,
  weekly_gain numeric(10,6) not null,
  weekly_drag numeric(10,6) not null,
  difficulty_multiplier numeric(10,6) not null,
  pillar_scores jsonb not null,
  effective_weights jsonb not null,
  raw_aggregates jsonb not null,
  input_actions jsonb not null,
  input_events jsonb not null,
  reason_codes jsonb not null,
  algorithm_version text not null,
  calculation_hash text not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start, algorithm_version, revision),
  unique (user_id, week_start, algorithm_version, calculation_hash),
  check (week_end = week_start + 6)
);

create index if not exists idx_momentum_snapshots_user_week
  on public.momentum_weekly_snapshots (user_id, week_start desc, revision desc);

create or replace function public.reject_momentum_snapshot_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Momentum snapshots are immutable; publish a superseding revision';
end;
$$;

revoke all on function public.reject_momentum_snapshot_mutation() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'momentum_snapshots_are_immutable'
      and tgrelid = 'public.momentum_weekly_snapshots'::regclass
      and not tgisinternal
  ) then
    create trigger momentum_snapshots_are_immutable
      before update or delete on public.momentum_weekly_snapshots
      for each row execute function public.reject_momentum_snapshot_mutation();
  end if;
end
$$;

alter table public.momentum_profiles enable row level security;
alter table public.momentum_events enable row level security;
alter table public.momentum_weekly_snapshots enable row level security;

create policy "Users can view own Momentum profile" on public.momentum_profiles
  for select using (user_id = auth.uid());
create policy "Users can view own Momentum events" on public.momentum_events
  for select using (user_id = auth.uid());
create policy "Users can view own Momentum snapshots" on public.momentum_weekly_snapshots
  for select using (user_id = auth.uid());

-- Defense in depth: RLS already denies these writes because no matching policy
-- exists, but explicit grants make the immutable client boundary auditable.
revoke insert, update, delete on public.momentum_profiles from anon, authenticated;
revoke insert, update, delete on public.momentum_events from anon, authenticated;
revoke insert, update, delete on public.momentum_weekly_snapshots from anon, authenticated;

create or replace function public.publish_momentum_snapshot(
  p_user_id uuid,
  p_week_start date,
  p_week_end date,
  p_timezone text,
  p_previous_value numeric,
  p_next_value numeric,
  p_growth_quality_score numeric,
  p_weekly_gain numeric,
  p_weekly_drag numeric,
  p_difficulty_multiplier numeric,
  p_pillar_scores jsonb,
  p_effective_weights jsonb,
  p_raw_aggregates jsonb,
  p_input_actions jsonb,
  p_input_events jsonb,
  p_reason_codes jsonb,
  p_algorithm_version text,
  p_calculation_hash text,
  p_events jsonb
)
returns public.momentum_weekly_snapshots
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := p_user_id;
  v_profile public.momentum_profiles;
  v_existing public.momentum_weekly_snapshots;
  v_snapshot public.momentum_weekly_snapshots;
  v_revision integer := 1;
  v_event jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'Trusted server role required'; end if;
  if v_user_id is null then raise exception 'Momentum user is required'; end if;
  if p_week_end <> p_week_start + 6 then raise exception 'Momentum week must be Monday through Sunday'; end if;
  if extract(isodow from p_week_start) <> 1 then raise exception 'Momentum week must start on Monday'; end if;
  if not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'Momentum timezone must be a valid IANA timezone';
  end if;
  if p_previous_value < 0 or p_next_value < 0 then raise exception 'Momentum values must be non-negative'; end if;
  if p_growth_quality_score < 0 or p_growth_quality_score > 100 then
    raise exception 'Momentum GQS must be between zero and one hundred';
  end if;
  if p_weekly_gain < 0 or p_weekly_drag < 0 or p_difficulty_multiplier < 1 then
    raise exception 'Momentum gain, drag, or difficulty is invalid';
  end if;
  if p_algorithm_version is null or length(trim(p_algorithm_version)) = 0 then
    raise exception 'Momentum algorithm version is required';
  end if;
  if p_calculation_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Momentum calculation hash must be lowercase SHA-256';
  end if;
  if jsonb_typeof(p_pillar_scores) <> 'object'
    or jsonb_typeof(p_effective_weights) <> 'object'
    or jsonb_typeof(p_raw_aggregates) <> 'object'
    or jsonb_typeof(p_input_actions) <> 'array'
    or jsonb_typeof(p_input_events) <> 'array'
    or jsonb_typeof(p_reason_codes) <> 'array'
    or jsonb_typeof(p_events) <> 'array' then
    raise exception 'Momentum diagnostic payload shape is invalid';
  end if;

  insert into public.momentum_profiles (user_id, current_value, current_version)
  values (v_user_id, 0, p_algorithm_version)
  on conflict (user_id) do nothing;

  select * into v_profile from public.momentum_profiles
  where user_id = v_user_id for update;

  select * into v_existing
  from public.momentum_weekly_snapshots
  where user_id = v_user_id
    and week_start = p_week_start
    and algorithm_version = p_algorithm_version
  order by revision desc
  limit 1;

  if v_existing.id is not null and v_existing.calculation_hash = p_calculation_hash then
    return v_existing;
  end if;

  if v_existing.id is null and abs(v_profile.current_value - p_previous_value) > 0.0001 then
    raise exception 'Momentum profile changed during calculation';
  end if;

  if v_existing.id is not null and abs(v_existing.previous_value - p_previous_value) > 0.0001 then
    raise exception 'Momentum recalculation baseline does not match the stored snapshot';
  end if;

  if v_existing.id is not null then
    v_revision := v_existing.revision + 1;
  end if;

  for v_event in select * from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) loop
    insert into public.momentum_events (
      user_id, event_type, occurred_at, source_entity_id, payload,
      deduplication_key, eligibility_status, exclusion_reason
    ) values (
      v_user_id,
      v_event->>'eventType',
      (v_event->>'occurredAt')::timestamptz,
      nullif(v_event->>'sourceEntityId', '')::uuid,
      '{}'::jsonb,
      v_event->>'deduplicationKey',
      v_event->>'eligibility',
      nullif(v_event->>'exclusionReason', '')
    ) on conflict (user_id, deduplication_key) do nothing;
  end loop;

  insert into public.momentum_weekly_snapshots (
    user_id, week_start, week_end, timezone, revision, supersedes_snapshot_id,
    previous_value, next_value, growth_quality_score, weekly_gain, weekly_drag,
    difficulty_multiplier, pillar_scores, effective_weights, raw_aggregates,
    input_actions, input_events, reason_codes, algorithm_version, calculation_hash
  ) values (
    v_user_id, p_week_start, p_week_end, p_timezone, v_revision, v_existing.id,
    p_previous_value, p_next_value, p_growth_quality_score, p_weekly_gain, p_weekly_drag,
    p_difficulty_multiplier, p_pillar_scores, p_effective_weights, p_raw_aggregates,
    p_input_actions, p_input_events, p_reason_codes, p_algorithm_version, p_calculation_hash
  ) returning * into v_snapshot;

  update public.momentum_profiles set
    current_value = case
      when v_existing.id is null then p_next_value
      else greatest(0, current_value + (p_next_value - v_existing.next_value))
    end,
    current_version = p_algorithm_version,
    last_calculated_at = now(),
    updated_at = now()
  where user_id = v_user_id;

  return v_snapshot;
end;
$$;

revoke all on function public.publish_momentum_snapshot(
  uuid, date, date, text, numeric, numeric, numeric, numeric, numeric, numeric,
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text, text, jsonb
) from public;
revoke all on function public.publish_momentum_snapshot(
  uuid, date, date, text, numeric, numeric, numeric, numeric, numeric, numeric,
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text, text, jsonb
) from anon, authenticated;
grant execute on function public.publish_momentum_snapshot(
  uuid, date, date, text, numeric, numeric, numeric, numeric, numeric, numeric,
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text, text, jsonb
) to service_role;
