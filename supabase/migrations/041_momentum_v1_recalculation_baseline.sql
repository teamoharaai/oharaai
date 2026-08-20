-- Migration 041: Correct first-week OHARA Momentum V1 recalculation baselines.
--
-- Migration 040 was applied to the isolated local validation database before
-- this edge case was discovered. Keep the applied migration immutable and
-- supersede only the affected trusted publication function.

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
  if v_existing.id is null and p_previous_value is distinct from v_latest_before_week then
    raise exception 'OHARA Momentum previous value does not match the latest earlier V1 snapshot';
  end if;
  if v_existing.id is null and p_previous_value is not null
    and v_profile.current_version = p_algorithm_version
    and abs(v_profile.current_value - p_previous_value) > 0.0001 then
    raise exception 'OHARA Momentum profile changed during calculation';
  end if;
  if v_existing.id is not null
    and abs(v_existing.previous_value - coalesce(p_previous_value, 0)) > 0.0001 then
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
