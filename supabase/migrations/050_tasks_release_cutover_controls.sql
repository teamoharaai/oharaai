-- Migration 050: Goals V2.0 Phase 2B release cutover controls
--
-- This migration prepares, but does not execute, the production cutover. The
-- service-role-only finalizer closes the migration/deployment race by locking
-- legacy write sources, rerunning Migration 048's canonical catch-up, proving
-- every surviving source has exactly one mapping, and only then revoking
-- authenticated legacy mutations in the same transaction.

create or replace function public.verify_tasks_legacy_cutover_v1()
returns table (
  source_name text,
  source_rows bigint,
  mapped_rows bigint,
  unmapped_rows bigint,
  duplicate_mappings bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with tracker_mappings as (
    select tracker.id, count(task.id)::bigint as mapping_count
    from public.trackers tracker
    left join public.tasks task on task.legacy_tracker_id = tracker.id
    group by tracker.id
  ), tracker_log_mappings as (
    select tracker_log.id, count(occurrence.id)::bigint as mapping_count
    from public.tracker_logs tracker_log
    left join public.task_occurrences occurrence
      on occurrence.legacy_tracker_log_id = tracker_log.id
    group by tracker_log.id
  ), action_task_mappings as (
    select action.id, count(task.id)::bigint as mapping_count
    from public.action_logs action
    left join public.tasks task on task.legacy_action_log_id = action.id
    group by action.id
  ), action_occurrence_mappings as (
    select action.id, count(occurrence.id)::bigint as mapping_count
    from public.action_logs action
    left join public.task_occurrences occurrence
      on occurrence.legacy_action_log_id = action.id
    group by action.id
  )
  select
    'trackers'::text,
    count(*)::bigint,
    count(*) filter (where mapping_count >= 1)::bigint,
    count(*) filter (where mapping_count = 0)::bigint,
    coalesce(sum(greatest(mapping_count - 1, 0)), 0)::bigint
  from tracker_mappings
  union all
  select
    'tracker_logs'::text,
    count(*)::bigint,
    count(*) filter (where mapping_count >= 1)::bigint,
    count(*) filter (where mapping_count = 0)::bigint,
    coalesce(sum(greatest(mapping_count - 1, 0)), 0)::bigint
  from tracker_log_mappings
  union all
  select
    'action_logs.tasks'::text,
    count(*)::bigint,
    count(*) filter (where mapping_count >= 1)::bigint,
    count(*) filter (where mapping_count = 0)::bigint,
    coalesce(sum(greatest(mapping_count - 1, 0)), 0)::bigint
  from action_task_mappings
  union all
  select
    'action_logs.occurrences'::text,
    count(*)::bigint,
    count(*) filter (where mapping_count >= 1)::bigint,
    count(*) filter (where mapping_count = 0)::bigint,
    coalesce(sum(greatest(mapping_count - 1, 0)), 0)::bigint
  from action_occurrence_mappings
  order by 1;
$$;

create or replace function public.freeze_tasks_legacy_writes_v1()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  lock table public.trackers, public.tracker_logs, public.action_logs
    in share row exclusive mode;

  if exists (
    select 1
    from public.verify_tasks_legacy_cutover_v1() result
    where result.unmapped_rows <> 0
       or result.duplicate_mappings <> 0
  ) then
    raise exception 'Legacy Task cutover verification is not clean';
  end if;

  execute 'revoke insert, update, delete on table public.trackers, public.tracker_logs, public.action_logs from authenticated';
end;
$$;

create or replace function public.restore_tasks_legacy_writes_v1()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  execute 'grant insert, update, delete on table public.trackers, public.tracker_logs to authenticated';
  execute 'grant insert, update on table public.action_logs to authenticated';
end;
$$;

create or replace function public.finalize_tasks_legacy_cutover_v1()
returns table (
  source_name text,
  source_rows bigint,
  mapped_rows bigint,
  unmapped_rows bigint,
  duplicate_mappings bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- The lock prevents a stale client from committing another legacy mutation
  -- between the catch-up, clean verification, and privilege revocation.
  lock table public.trackers, public.tracker_logs, public.action_logs
    in share row exclusive mode;

  perform public.run_tasks_legacy_catchup_v1();
  perform public.freeze_tasks_legacy_writes_v1();

  return query
  select * from public.verify_tasks_legacy_cutover_v1();
end;
$$;

revoke all on function public.verify_tasks_legacy_cutover_v1()
  from public, anon, authenticated;
revoke all on function public.freeze_tasks_legacy_writes_v1()
  from public, anon, authenticated;
revoke all on function public.restore_tasks_legacy_writes_v1()
  from public, anon, authenticated;
revoke all on function public.finalize_tasks_legacy_cutover_v1()
  from public, anon, authenticated;

grant execute on function public.verify_tasks_legacy_cutover_v1()
  to service_role;
grant execute on function public.freeze_tasks_legacy_writes_v1()
  to service_role;
grant execute on function public.restore_tasks_legacy_writes_v1()
  to service_role;
grant execute on function public.finalize_tasks_legacy_cutover_v1()
  to service_role;

comment on function public.run_tasks_legacy_catchup_v1() is
  'Idempotently maps surviving legacy Tracker/action rows using Migration 048 rules; service role only.';
comment on function public.verify_tasks_legacy_cutover_v1() is
  'Returns aggregate-only legacy-to-Task mapping counts without user-generated content; service role only.';
comment on function public.finalize_tasks_legacy_cutover_v1() is
  'Atomically catches late legacy rows, verifies exact mappings, and freezes authenticated legacy writes.';
comment on function public.restore_tasks_legacy_writes_v1() is
  'Restores only the pre-cutover authenticated legacy DML grants for an explicitly authorized app rollback.';
