-- Migration 040: OHARA Momentum V1 bounded goal + portfolio scoring
-- Additive successor to the shared Phase 1 foundation in Migration 038.

alter table public.momentum_profiles
  add column if not exists status text not null default 'building'
    check (status in ('building', 'active', 'paused', 'limited', 'unavailable'));

alter table public.momentum_weekly_snapshots
  add column if not exists raw_score numeric(8,4)
    check (raw_score is null or raw_score between 0 and 100),
  add column if not exists portfolio_components jsonb,
  add column if not exists source_goal_snapshot_ids jsonb not null default '[]'::jsonb,
  add column if not exists score_status text
    check (score_status is null or score_status in ('building', 'active', 'paused', 'limited', 'unavailable')),
  add column if not exists configuration_version text;

create table if not exists public.goal_difficulty_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  plan_revision_key text not null,
  category text not null,
  goal_mode text not null check (goal_mode in (
    'numeric_target', 'milestone_project', 'frequency_routine', 'maintenance', 'qualitative'
  )),
  dimension_scores jsonb not null,
  effective_weights jsonb not null,
  composite_score numeric(8,4) not null check (composite_score between 0 and 100),
  difficulty_band text not null check (difficulty_band in ('D1', 'D2', 'D3', 'D4')),
  source_inputs jsonb not null,
  difficulty_version text not null,
  category_config_version text not null,
  created_at timestamptz not null default now(),
  unique (user_id, goal_id, plan_revision_key, difficulty_version, category_config_version)
);

create table if not exists public.goal_momentum_profiles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  current_value numeric(8,4) not null default 0 check (current_value between 0 and 100),
  status text not null default 'building'
    check (status in ('building', 'active', 'paused', 'limited')),
  algorithm_version text not null default 'goal-momentum-v1.0',
  difficulty_profile_version text not null default 'difficulty-v1.0',
  last_calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, goal_id)
);

create table if not exists public.goal_momentum_weekly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  difficulty_profile_id uuid not null references public.goal_difficulty_profiles(id),
  week_start date not null,
  week_end date not null,
  timezone text not null,
  revision integer not null default 1 check (revision > 0),
  supersedes_snapshot_id uuid references public.goal_momentum_weekly_snapshots(id),
  previous_value numeric(8,4),
  raw_score numeric(8,4) not null check (raw_score between 0 and 100),
  current_value numeric(8,4) not null check (current_value between 0 and 100),
  score_status text not null check (score_status in ('building', 'active', 'paused', 'limited')),
  pillar_scores jsonb not null,
  pillar_components jsonb not null,
  effective_weights jsonb not null,
  raw_aggregates jsonb not null,
  input_events jsonb not null,
  reason_codes jsonb not null,
  algorithm_version text not null,
  difficulty_version text not null,
  category_config_version text not null,
  calculation_hash text not null check (calculation_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (user_id, goal_id, week_start, algorithm_version, revision),
  unique (user_id, goal_id, week_start, algorithm_version, calculation_hash),
  check (week_end = week_start + 6)
);

create index if not exists idx_goal_difficulty_user_goal
  on public.goal_difficulty_profiles (user_id, goal_id, created_at desc);
create index if not exists idx_goal_momentum_snapshots_user_goal_week
  on public.goal_momentum_weekly_snapshots (user_id, goal_id, week_start desc, revision desc);

alter table public.goal_difficulty_profiles enable row level security;
alter table public.goal_momentum_profiles enable row level security;
alter table public.goal_momentum_weekly_snapshots enable row level security;

create policy "Users can view own Goal Difficulty profiles" on public.goal_difficulty_profiles
  for select using (user_id = auth.uid());
create policy "Users can view own Goal Momentum profiles" on public.goal_momentum_profiles
  for select using (user_id = auth.uid());
create policy "Users can view own Goal Momentum snapshots" on public.goal_momentum_weekly_snapshots
  for select using (user_id = auth.uid());

revoke insert, update, delete on public.goal_difficulty_profiles from anon, authenticated;
revoke insert, update, delete on public.goal_momentum_profiles from anon, authenticated;
revoke insert, update, delete on public.goal_momentum_weekly_snapshots from anon, authenticated;

revoke all on public.goal_difficulty_profiles from anon;
revoke all on public.goal_momentum_profiles from anon;
revoke all on public.goal_momentum_weekly_snapshots from anon;
grant select on public.goal_difficulty_profiles to authenticated;
grant select on public.goal_momentum_profiles to authenticated;
grant select on public.goal_momentum_weekly_snapshots to authenticated;
grant all on public.goal_difficulty_profiles to service_role;
grant all on public.goal_momentum_profiles to service_role;
grant all on public.goal_momentum_weekly_snapshots to service_role;

create trigger goal_momentum_snapshots_are_immutable
  before update or delete on public.goal_momentum_weekly_snapshots
  for each row execute function public.reject_momentum_snapshot_mutation();

create or replace function public.publish_goal_momentum_v1_snapshot(
  p_user_id uuid,
  p_goal_id uuid,
  p_week_start date,
  p_week_end date,
  p_timezone text,
  p_previous_value numeric,
  p_raw_score numeric,
  p_current_value numeric,
  p_score_status text,
  p_pillar_scores jsonb,
  p_pillar_components jsonb,
  p_effective_weights jsonb,
  p_raw_aggregates jsonb,
  p_input_events jsonb,
  p_reason_codes jsonb,
  p_algorithm_version text,
  p_calculation_hash text,
  p_plan_revision_key text,
  p_category text,
  p_goal_mode text,
  p_difficulty_dimensions jsonb,
  p_difficulty_effective_weights jsonb,
  p_difficulty_score numeric,
  p_difficulty_band text,
  p_difficulty_source_inputs jsonb,
  p_difficulty_version text,
  p_category_config_version text
)
returns public.goal_momentum_weekly_snapshots
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.goal_momentum_weekly_snapshots;
  v_profile public.goal_momentum_profiles;
  v_difficulty public.goal_difficulty_profiles;
  v_snapshot public.goal_momentum_weekly_snapshots;
  v_revision integer := 1;
  v_latest_before_week numeric;
begin
  if auth.role() <> 'service_role' then raise exception 'Trusted server role required'; end if;
  if not exists (select 1 from public.goals where id = p_goal_id and user_id = p_user_id) then
    raise exception 'Goal ownership validation failed';
  end if;
  if p_week_end <> p_week_start + 6 or extract(isodow from p_week_start) <> 1 then
    raise exception 'Momentum week must be Monday through Sunday';
  end if;
  if not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'Momentum timezone must be a valid IANA timezone';
  end if;
  if p_raw_score not between 0 and 100 or p_current_value not between 0 and 100
    or (p_previous_value is not null and p_previous_value not between 0 and 100) then
    raise exception 'Goal Momentum values must be between zero and one hundred';
  end if;
  if p_calculation_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Momentum calculation hash must be lowercase SHA-256';
  end if;

  insert into public.goal_difficulty_profiles (
    user_id, goal_id, plan_revision_key, category, goal_mode, dimension_scores,
    effective_weights, composite_score, difficulty_band, source_inputs,
    difficulty_version, category_config_version
  ) values (
    p_user_id, p_goal_id, p_plan_revision_key, p_category, p_goal_mode,
    p_difficulty_dimensions, p_difficulty_effective_weights, p_difficulty_score,
    p_difficulty_band, p_difficulty_source_inputs, p_difficulty_version,
    p_category_config_version
  ) on conflict (user_id, goal_id, plan_revision_key, difficulty_version, category_config_version)
  do nothing;

  select * into v_difficulty
  from public.goal_difficulty_profiles
  where user_id = p_user_id
    and goal_id = p_goal_id
    and plan_revision_key = p_plan_revision_key
    and difficulty_version = p_difficulty_version
    and category_config_version = p_category_config_version;

  insert into public.goal_momentum_profiles (user_id, goal_id, algorithm_version, difficulty_profile_version)
  values (p_user_id, p_goal_id, p_algorithm_version, p_difficulty_version)
  on conflict (user_id, goal_id) do nothing;

  select * into v_profile from public.goal_momentum_profiles
  where user_id = p_user_id and goal_id = p_goal_id for update;

  select * into v_existing from public.goal_momentum_weekly_snapshots
  where user_id = p_user_id and goal_id = p_goal_id
    and week_start = p_week_start and algorithm_version = p_algorithm_version
  order by revision desc limit 1;

  if v_existing.id is not null and v_existing.calculation_hash = p_calculation_hash then
    return v_existing;
  end if;
  select current_value into v_latest_before_week
  from public.goal_momentum_weekly_snapshots
  where user_id = p_user_id and goal_id = p_goal_id
    and algorithm_version = p_algorithm_version and week_start < p_week_start
  order by week_start desc, revision desc limit 1;
  if p_previous_value is distinct from v_latest_before_week then
    raise exception 'Goal Momentum previous value does not match the latest earlier V1 snapshot';
  end if;
  if v_existing.id is null and p_previous_value is not null
    and abs(v_profile.current_value - p_previous_value) > 0.0001 then
    raise exception 'Goal Momentum profile changed during calculation';
  end if;
  if v_existing.id is not null and v_existing.previous_value is distinct from p_previous_value then
    raise exception 'Goal Momentum recalculation baseline does not match the stored snapshot';
  end if;
  if v_existing.id is not null then v_revision := v_existing.revision + 1; end if;

  insert into public.goal_momentum_weekly_snapshots (
    user_id, goal_id, difficulty_profile_id, week_start, week_end, timezone,
    revision, supersedes_snapshot_id, previous_value, raw_score, current_value,
    score_status, pillar_scores, pillar_components, effective_weights, raw_aggregates,
    input_events, reason_codes, algorithm_version, difficulty_version,
    category_config_version, calculation_hash
  ) values (
    p_user_id, p_goal_id, v_difficulty.id, p_week_start, p_week_end, p_timezone,
    v_revision, v_existing.id, p_previous_value, p_raw_score, p_current_value,
    p_score_status, p_pillar_scores, p_pillar_components, p_effective_weights,
    p_raw_aggregates, p_input_events, p_reason_codes, p_algorithm_version,
    p_difficulty_version, p_category_config_version, p_calculation_hash
  ) returning * into v_snapshot;

  update public.goal_momentum_profiles set
    current_value = p_current_value,
    status = p_score_status,
    algorithm_version = p_algorithm_version,
    difficulty_profile_version = p_difficulty_version,
    last_calculated_at = now(),
    updated_at = now()
  where user_id = p_user_id and goal_id = p_goal_id;

  return v_snapshot;
end;
$$;

revoke all on function public.publish_goal_momentum_v1_snapshot(
  uuid, uuid, date, date, text, numeric, numeric, numeric, text,
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text, text, text, text, text,
  jsonb, jsonb, numeric, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.publish_goal_momentum_v1_snapshot(
  uuid, uuid, date, date, text, numeric, numeric, numeric, text,
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text, text, text, text, text,
  jsonb, jsonb, numeric, text, jsonb, text, text
) to service_role;

create or replace function public.publish_ohara_momentum_v1_snapshot(
  p_user_id uuid,
  p_week_start date,
  p_week_end date,
  p_timezone text,
  p_previous_value numeric,
  p_raw_score numeric,
  p_current_value numeric,
  p_score_status text,
  p_portfolio_components jsonb,
  p_effective_weights jsonb,
  p_raw_aggregates jsonb,
  p_input_events jsonb,
  p_reason_codes jsonb,
  p_algorithm_version text,
  p_calculation_hash text,
  p_source_goal_snapshot_ids jsonb,
  p_configuration_version text
)
returns public.momentum_weekly_snapshots
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.momentum_weekly_snapshots;
  v_profile public.momentum_profiles;
  v_snapshot public.momentum_weekly_snapshots;
  v_revision integer := 1;
  v_latest_before_week numeric;
begin
  if auth.role() <> 'service_role' then raise exception 'Trusted server role required'; end if;
  if p_week_end <> p_week_start + 6 or extract(isodow from p_week_start) <> 1 then
    raise exception 'Momentum week must be Monday through Sunday';
  end if;
  if not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'Momentum timezone must be a valid IANA timezone';
  end if;
  if p_raw_score not between 0 and 100 or p_current_value not between 0 and 100
    or (p_previous_value is not null and p_previous_value not between 0 and 100) then
    raise exception 'OHARA Momentum values must be between zero and one hundred';
  end if;
  if p_calculation_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Momentum calculation hash must be lowercase SHA-256';
  end if;

  insert into public.momentum_profiles (user_id, current_value, current_version, status)
  values (p_user_id, 0, p_algorithm_version, 'building')
  on conflict (user_id) do nothing;
  select * into v_profile from public.momentum_profiles where user_id = p_user_id for update;
  select * into v_existing from public.momentum_weekly_snapshots
  where user_id = p_user_id and week_start = p_week_start and algorithm_version = p_algorithm_version
  order by revision desc limit 1;
  if v_existing.id is not null and v_existing.calculation_hash = p_calculation_hash then return v_existing; end if;
  select next_value into v_latest_before_week
  from public.momentum_weekly_snapshots
  where user_id = p_user_id and algorithm_version = p_algorithm_version
    and week_start < p_week_start
  order by week_start desc, revision desc limit 1;
  if p_previous_value is distinct from v_latest_before_week then
    raise exception 'OHARA Momentum previous value does not match the latest earlier V1 snapshot';
  end if;
  if v_existing.id is null and p_previous_value is not null
    and v_profile.current_version = p_algorithm_version
    and abs(v_profile.current_value - p_previous_value) > 0.0001 then
    raise exception 'OHARA Momentum profile changed during calculation';
  end if;
  if v_existing.id is not null and v_existing.previous_value is distinct from p_previous_value then
    raise exception 'OHARA Momentum recalculation baseline does not match the stored snapshot';
  end if;
  if v_existing.id is not null then v_revision := v_existing.revision + 1; end if;

  insert into public.momentum_weekly_snapshots (
    user_id, week_start, week_end, timezone, revision, supersedes_snapshot_id,
    previous_value, next_value, growth_quality_score, weekly_gain, weekly_drag,
    difficulty_multiplier, pillar_scores, effective_weights, raw_aggregates,
    input_actions, input_events, reason_codes, algorithm_version, calculation_hash,
    raw_score, portfolio_components, source_goal_snapshot_ids, score_status,
    configuration_version
  ) values (
    p_user_id, p_week_start, p_week_end, p_timezone, v_revision, v_existing.id,
    coalesce(p_previous_value, 0), p_current_value, p_raw_score,
    greatest(0, p_current_value - coalesce(p_previous_value, 0)), 0, 1,
    '{}'::jsonb, p_effective_weights, p_raw_aggregates, '[]'::jsonb,
    p_input_events, p_reason_codes, p_algorithm_version, p_calculation_hash,
    p_raw_score, p_portfolio_components, p_source_goal_snapshot_ids, p_score_status,
    p_configuration_version
  ) returning * into v_snapshot;

  update public.momentum_profiles set
    current_value = p_current_value,
    current_version = p_algorithm_version,
    status = p_score_status,
    last_calculated_at = now(),
    updated_at = now()
  where user_id = p_user_id;
  return v_snapshot;
end;
$$;

revoke all on function public.publish_ohara_momentum_v1_snapshot(
  uuid, date, date, text, numeric, numeric, numeric, text,
  jsonb, jsonb, jsonb, jsonb, jsonb, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.publish_ohara_momentum_v1_snapshot(
  uuid, date, date, text, numeric, numeric, numeric, text,
  jsonb, jsonb, jsonb, jsonb, jsonb, text, text, jsonb, text
) to service_role;
