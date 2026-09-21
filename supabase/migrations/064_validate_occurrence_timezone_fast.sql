-- 064_validate_occurrence_timezone_fast.sql
-- Momentum/Tasks write-path perf. Removes the per-row pg_timezone_names scan from
-- the task_occurrences validation trigger.
--
-- Root cause (measured via EXPLAIN ANALYZE): validate_task_occurrence_v1 fires
-- BEFORE INSERT OR UPDATE OF (user_id, task_id, schedule_id, schedule_timezone) on
-- public.task_occurrences and validated the timezone with
-- `not exists (select 1 from pg_timezone_names where name = new.schedule_timezone)`.
-- pg_timezone_names is a system view that materializes the entire IANA tz list on
-- every scan — ~112ms PER ROW — so any occurrence insert paid it once per row.
-- Migration 063 stopped reconcile from re-proposing already-materialized rows, but
-- genuinely-new inserts (task creation, forward materialization) still pay it: a
-- daily task materializing ~28 forward days ≈ ~3s of pure trigger time.
--
-- Fix: validate the timezone by the O(1) criterion that actually matters — whether
-- Postgres can USE it. schedule_timezone is only ever consumed by `at time zone`
-- (see task_local_instant_v1), so probe exactly that in a nested block and reject
-- on the `invalid_parameter_value` (22023 "time zone ... not recognized") a bad
-- zone raises. This never scans pg_timezone_names and never drifts from live tzdata
-- (unlike a cached name table). It is marginally more permissive than the old
-- membership check — it also accepts values `at time zone` accepts beyond
-- pg_timezone_names (abbreviations / numeric offsets) — which is benign and
-- arguably more correct, since those are precisely the values that work downstream.
-- The app only ever stores IANA names, so the accepted/rejected set is unchanged in
-- practice.
--
-- The two ownership checks (occurrence owner must own the Task; schedule must
-- belong to the same Task and owner) are reproduced verbatim. Function-body only:
-- same trigger, same signature, no schema/type/RLS change, idempotent
-- CREATE OR REPLACE.

create or replace function public.validate_task_occurrence_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.tasks task
    where task.id = new.task_id and task.user_id = new.user_id
  ) then
    raise exception 'Occurrence owner must own the Task';
  end if;
  if new.schedule_id is not null and not exists (
    select 1 from public.task_schedules schedule
    where schedule.id = new.schedule_id
      and schedule.task_id = new.task_id
      and schedule.user_id = new.user_id
  ) then
    raise exception 'Occurrence Schedule must belong to the same Task and owner';
  end if;
  if new.schedule_timezone is not null then
    -- O(1) validity probe: schedule_timezone is consumed only by `at time zone`,
    -- so reject exactly what `at time zone` cannot use. Avoids the pg_timezone_names
    -- full-view scan the previous body paid on every row.
    begin
      perform now() at time zone new.schedule_timezone;
    exception when invalid_parameter_value then
      raise exception 'Occurrence timezone must be a valid IANA timezone';
    end;
  end if;
  return new;
end;
$$;
