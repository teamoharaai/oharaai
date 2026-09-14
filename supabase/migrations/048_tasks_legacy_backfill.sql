-- Migration 048: Goals V2.0 Phase 2B legacy Task backfill
-- Preserves Trackers, tracker_logs, and action_logs in place while creating an
-- idempotent canonical Task representation. No ambiguous history is inferred.
--
-- The implementation remains callable by service_role so release tooling can
-- catch rows written by the previously deployed application after this initial
-- migration pass. Migration 050 performs the final catch-up and write freeze
-- atomically once the canonical Task application is deployed.

create or replace function public.run_tasks_legacy_catchup_v1()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin

insert into public.tasks (
  user_id,
  goal_id,
  title,
  completion_mode,
  target_quantity,
  quantity_unit,
  status,
  source,
  legacy_tracker_id,
  legacy_current_value,
  legacy_target_value,
  legacy_target_unit,
  legacy_frequency,
  legacy_tracker_type,
  legacy_is_ai_suggested,
  sort_order,
  created_at,
  updated_at
)
select
  goal.user_id,
  tracker.goal_id,
  tracker.title,
  case when tracker.type = 'counter' then 'quantity' else 'binary' end,
  case when tracker.type = 'counter' and tracker.target_value > 0 then tracker.target_value else null end,
  case
    when tracker.type = 'counter' and tracker.target_value > 0
      then nullif(btrim(tracker.target_unit), '')
    else null
  end,
  'active',
  'legacy_tracker',
  tracker.id,
  tracker.current_value,
  tracker.target_value,
  tracker.target_unit,
  tracker.frequency,
  tracker.type,
  tracker.is_ai_suggested,
  tracker.sort_order,
  tracker.created_at,
  tracker.updated_at
from public.trackers tracker
join public.goals goal on goal.id = tracker.goal_id
on conflict (legacy_tracker_id) do nothing;

-- Only daily is authoritative enough to generate forward occurrences. Weekly
-- lacks a weekday, monthly lacks a date rule, and null has no cadence.
insert into public.task_schedules (
  user_id,
  task_id,
  version,
  recurrence_kind,
  interval_count,
  weekdays,
  start_date,
  local_time,
  timezone,
  is_active,
  source,
  created_at,
  updated_at
)
select
  task.user_id,
  task.id,
  1,
  'daily',
  1,
  '{}'::smallint[],
  (now() at time zone timezone_choice.name)::date,
  null,
  timezone_choice.name,
  true,
  'legacy_tracker',
  now(),
  now()
from public.tasks task
join public.profiles profile on profile.id = task.user_id
cross join lateral (
  select case
    when exists (
      select 1 from pg_timezone_names zone where zone.name = profile.timezone
    ) then profile.timezone
    else 'UTC'
  end as name
) timezone_choice
where task.source = 'legacy_tracker'
  and task.legacy_frequency = 'daily'
  and not exists (
    select 1 from public.task_schedules schedule where schedule.task_id = task.id
  )
on conflict do nothing;

insert into public.task_occurrences (
  user_id,
  task_id,
  occurrence_key,
  status,
  actual_quantity,
  note,
  completed_at,
  source,
  legacy_tracker_log_id,
  legacy_raw_value,
  created_at,
  updated_at
)
select
  task.user_id,
  task.id,
  'legacy-tracker-log:' || tracker_log.id::text,
  'completed',
  case
    when task.completion_mode = 'quantity' and tracker_log.value >= 0 then tracker_log.value
    else null
  end,
  tracker_log.note,
  tracker_log.logged_at,
  'legacy_tracker',
  tracker_log.id,
  tracker_log.value,
  tracker_log.logged_at,
  tracker_log.logged_at
from public.tracker_logs tracker_log
join public.tasks task on task.legacy_tracker_id = tracker_log.tracker_id
on conflict (legacy_tracker_log_id) do nothing;

insert into public.tasks (
  user_id,
  goal_id,
  title,
  completion_mode,
  status,
  due_date,
  source,
  legacy_action_log_id,
  legacy_status,
  created_at,
  updated_at,
  completed_at,
  archived_at
)
select
  action.user_id,
  action.goal_id,
  action.action_text,
  'binary',
  case
    when action.status = 'complete' then 'complete'
    when action.status = 'skipped' then 'archived'
    else 'active'
  end,
  action.due_date,
  'legacy_action',
  action.id,
  action.status,
  action.created_at,
  action.created_at,
  case when action.status = 'complete' then action.completed_at else null end,
  null
from public.action_logs action
join public.goals goal on goal.id = action.goal_id and goal.user_id = action.user_id
on conflict (legacy_action_log_id) do nothing;

insert into public.task_occurrences (
  user_id,
  task_id,
  occurrence_key,
  scheduled_local_date,
  schedule_timezone,
  status,
  completed_at,
  skipped_at,
  source,
  legacy_action_log_id,
  created_at,
  updated_at
)
select
  task.user_id,
  task.id,
  'legacy-action:' || action.id::text,
  action.due_date,
  timezone_choice.name,
  case
    when action.status = 'complete' then 'completed'
    when action.status = 'skipped' then 'skipped'
    else 'pending'
  end,
  case when action.status = 'complete' then action.completed_at else null end,
  null,
  'legacy_action',
  action.id,
  action.created_at,
  action.created_at
from public.action_logs action
join public.tasks task on task.legacy_action_log_id = action.id
join public.profiles profile on profile.id = task.user_id
cross join lateral (
  select case
    when exists (
      select 1 from pg_timezone_names zone where zone.name = profile.timezone
    ) then profile.timezone
    else 'UTC'
  end as name
) timezone_choice
on conflict (legacy_action_log_id) do nothing;

end;
$$;

revoke all on function public.run_tasks_legacy_catchup_v1()
  from public, anon, authenticated;
grant execute on function public.run_tasks_legacy_catchup_v1()
  to service_role;

select public.run_tasks_legacy_catchup_v1();

comment on column public.tasks.legacy_current_value is
  'Imported Tracker baseline only; never converted into invented historical occurrences.';
comment on column public.task_occurrences.legacy_raw_value is
  'Exact legacy tracker_log value retained independently of canonical quantity semantics.';
