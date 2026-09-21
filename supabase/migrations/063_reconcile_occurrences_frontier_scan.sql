-- 063_reconcile_occurrences_frontier_scan.sql
-- Goal Detail Redesign / Momentum perf. Makes reconcile_task_occurrences_v1 fast
-- on the hot path so it stops dragging (previously 500-ing) momentum and Task
-- reads that trigger it.
--
-- Root cause (measured via EXPLAIN ANALYZE): the prior body ran
-- generate_series(start_date .. through) every pass and fed EVERY matching day to
-- the INSERT — including the many days already materialized, which
-- `on conflict do nothing` discards. But a BEFORE INSERT trigger
-- (validate_task_occurrence_v1) fires for every *proposed* row before the conflict
-- is resolved, and it validates the timezone with `select 1 from pg_timezone_names`
-- — a ~112ms system-view scan. So a task with ~36 existing occurrences burned
-- ~4s of trigger time re-proposing rows that already existed, on every single
-- reconcile, blowing the authenticated statement_timeout.
--
-- Fix: lower-bound the generate_series to the materialization FRONTIER + 1 (the day
-- after the latest existing occurrence for this schedule) instead of start_date, so
-- already-present rows are never re-proposed to that trigger. Steady-state (frontier
-- already at the horizon) proposes zero rows and the call drops from ~seconds to
-- ~tens of ms. Correctness is preserved:
--   * The recurrence filters use mod(candidate.day - start_date, ...), anchored to
--     start_date, so matches are identical regardless of where the series starts.
--   * task_occurrences are insert-only (no delete path anywhere) and the INSERT is
--     atomic (a timeout rolls the whole statement back, never a partial gap), so
--     every matching day at/below the frontier is already present — frontier+1
--     covers exactly the still-missing forward days and loses nothing. A first-ever
--     pass (no occurrences yet, frontier null) still materializes from start_date.
--   * The "mark elapsed pending occurrences missed" UPDATE is unchanged; it only
--     writes `status`, which does not match the trigger's UPDATE-OF column list, so
--     it never pays the timezone validation.
-- Pure function-body change: same signature, no schema/type/RLS change, idempotent
-- (CREATE OR REPLACE). Reproduces the migration-059 body verbatim except the two
-- frontier lines and the generate_series lower bound.
--
-- NOTE: the deeper cost is validate_task_occurrence_v1's pg_timezone_names scan,
-- which still taxes genuinely-new inserts (task creation, forward materialization).
-- Optimizing that trigger is a separate, broader-blast-radius change (touches every
-- occurrence write) and is intentionally NOT bundled here.

create or replace function public.reconcile_task_occurrences_v1(
  p_task_id uuid,
  p_through_date date default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_schedule public.task_schedules;
  v_goal_status text;
  v_today date;
  v_through date;
  v_frontier date;
  v_lower date;
  v_inserted integer := 0;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;

  select schedule.*
  into v_schedule
  from public.task_schedules schedule
  join public.tasks task on task.id = schedule.task_id
  where schedule.task_id = p_task_id
    and schedule.user_id = v_user_id
    and schedule.is_active
    and task.status = 'active';

  if v_schedule.id is null then return 0; end if;
  select goal.status into v_goal_status
  from public.tasks task
  join public.goals goal on goal.id = task.goal_id
  where task.id = p_task_id and task.user_id = v_user_id;
  if v_goal_status <> 'active' then raise exception 'Tasks on inactive Goals are read-only'; end if;

  v_today := (now() at time zone v_schedule.timezone)::date;
  v_through := least(coalesce(p_through_date, v_today + 28), v_today + 180);
  if v_through < v_schedule.start_date then return 0; end if;
  if v_through - v_schedule.start_date > 3660 then
    raise exception 'Task schedule reconciliation window is too large';
  end if;

  -- Only materialize forward of the frontier (latest existing occurrence for this
  -- schedule); a first-ever pass falls back to start_date. Historical days at/below
  -- the frontier already exist (occurrences are insert-only), so re-proposing them
  -- only wastes the expensive BEFORE INSERT validation trigger.
  select max(occurrence.scheduled_local_date) into v_frontier
  from public.task_occurrences occurrence
  where occurrence.task_id = p_task_id
    and occurrence.schedule_id = v_schedule.id;
  v_lower := greatest(v_schedule.start_date, coalesce(v_frontier + 1, v_schedule.start_date));

  insert into public.task_occurrences (
    user_id, task_id, schedule_id, occurrence_key,
    scheduled_local_date, scheduled_local_time, schedule_timezone, scheduled_at,
    status, actual_quantity, source
  )
  select
    v_user_id,
    p_task_id,
    v_schedule.id,
    'schedule:' || v_schedule.id::text || ':v' || v_schedule.version::text || ':'
      || candidate.day::text || ':' || coalesce(v_schedule.local_time::text, 'anytime'),
    candidate.day,
    v_schedule.local_time,
    v_schedule.timezone,
    public.task_local_instant_v1(candidate.day, v_schedule.local_time, v_schedule.timezone),
    case
      when v_schedule.recurrence_kind = 'weekly_count'
        -- A weekly-count period is missed only once its whole ISO week is past.
        then case when (date_trunc('week', candidate.day)::date + 6) < v_today then 'missed' else 'pending' end
      else case when candidate.day < v_today then 'missed' else 'pending' end
    end,
    case when task.completion_mode = 'quantity' then 0 else null end,
    'schedule'
  from generate_series(
    v_lower,
    least(coalesce(v_schedule.end_date, v_through), v_through),
    interval '1 day'
  ) generated(day_value)
  cross join lateral (select generated.day_value::date as day) candidate
  join public.tasks task on task.id = p_task_id
  where (
    v_schedule.recurrence_kind = 'daily'
    and mod(candidate.day - v_schedule.start_date, v_schedule.interval_count) = 0
  ) or (
    v_schedule.recurrence_kind = 'weekly'
    and mod(((candidate.day - v_schedule.start_date) / 7), v_schedule.interval_count) = 0
    and extract(isodow from candidate.day)::smallint = any(v_schedule.weekdays)
  ) or (
    -- weekly_count: exactly one occurrence per ISO week, anchored at the week's
    -- Monday, or at start_date for the (partial) first week.
    v_schedule.recurrence_kind = 'weekly_count'
    and candidate.day = greatest(date_trunc('week', candidate.day)::date, v_schedule.start_date)
  )
  on conflict (task_id, occurrence_key) do nothing;

  get diagnostics v_inserted = row_count;

  -- Mark elapsed pending occurrences missed. weekly_count uses the period end
  -- (the week's Sunday), everything else its own scheduled date.
  update public.task_occurrences occurrence
  set status = 'missed'
  from public.task_schedules sch
  where occurrence.task_id = p_task_id
    and occurrence.user_id = v_user_id
    and occurrence.schedule_id = sch.id
    and occurrence.status = 'pending'
    and case
      when sch.recurrence_kind = 'weekly_count'
        then (date_trunc('week', occurrence.scheduled_local_date)::date + 6) < v_today
      else occurrence.scheduled_local_date < v_today
    end;

  return v_inserted;
end;
$$;
