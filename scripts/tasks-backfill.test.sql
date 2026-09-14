\set ON_ERROR_STOP on

do $$
declare
  v_tracker_count integer;
  v_action_count integer;
  v_task_count integer;
  v_log_count integer;
  v_occurrence_count integer;
begin
  if (select status from public.goals where id='11000000-0000-4000-8000-00000000000c')<>'expired' then
    raise exception 'Migration 045 did not reconcile the past-deadline Goal';
  end if;
  if (select status from public.goals where id='12000000-0000-4000-8000-00000000000c')<>'archived' then
    raise exception 'Migration 045 did not repair the active predecessor';
  end if;

  select count(*) into v_tracker_count from public.trackers;
  select count(*) into v_action_count from public.action_logs;
  select count(*) into v_task_count from public.tasks where source in ('legacy_tracker','legacy_action');
  if v_task_count<>v_tracker_count+v_action_count then
    raise exception 'Legacy definition traceability mismatch: expected %, found %',v_tracker_count+v_action_count,v_task_count;
  end if;
  if exists(
    select 1 from public.trackers tracker
    left join public.tasks task on task.legacy_tracker_id=tracker.id
    where task.id is null
  ) then raise exception 'A Tracker lacks a traceable Task'; end if;
  if exists(
    select 1 from public.action_logs action
    left join public.tasks task on task.legacy_action_log_id=action.id
    where task.id is null
  ) then raise exception 'An action_log lacks a traceable Task'; end if;

  select count(*) into v_log_count from public.tracker_logs;
  select count(*) into v_occurrence_count from public.task_occurrences where source='legacy_tracker';
  if v_occurrence_count<>v_log_count then
    raise exception 'Tracker log occurrence mismatch: expected %, found %',v_log_count,v_occurrence_count;
  end if;
  if exists(
    select 1 from public.tracker_logs tracker_log
    join public.task_occurrences occurrence on occurrence.legacy_tracker_log_id=tracker_log.id
    where occurrence.completed_at<>tracker_log.logged_at
      or occurrence.legacy_raw_value<>tracker_log.value
      or occurrence.schedule_id is not null
      or occurrence.scheduled_local_date is not null
  ) then raise exception 'Imported Tracker history was altered or scheduled'; end if;

  if (select count(*) from public.task_schedules where source='legacy_tracker')
      <> (select count(*) from public.trackers where frequency='daily') then
    raise exception 'Only daily legacy cadence should produce an imported schedule';
  end if;
  if exists(
    select 1 from public.task_schedules schedule
    join public.tasks task on task.id=schedule.task_id
    where task.legacy_frequency is distinct from 'daily'
  ) then raise exception 'A non-daily legacy cadence received a guessed schedule'; end if;

  if (select legacy_current_value from public.tasks where legacy_tracker_id='21000000-0000-4000-8000-00000000000c')<>14 then
    raise exception 'Legacy current_value baseline was not preserved';
  end if;
  if (select count(*) from public.task_occurrences occurrence
      join public.tasks task on task.id=occurrence.task_id
      where task.legacy_tracker_id='21000000-0000-4000-8000-00000000000c')<>1 then
    raise exception 'Legacy current_value was converted into invented occurrences';
  end if;

  if (select count(*) from public.tasks where legacy_tracker_id in (
    '22000000-0000-4000-8000-00000000000c','23000000-0000-4000-8000-00000000000c'
  ))<>2 then raise exception 'Phase-cloned Trackers were merged'; end if;
  if (select count(*) from public.action_logs)<>3 then raise exception 'action_logs were modified'; end if;
  if (select count(*) from public.trackers)<>5 then raise exception 'Trackers were modified'; end if;
  if (select count(*) from public.tracker_logs)<>3 then raise exception 'tracker_logs were modified'; end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000000c',false);
do $$
declare
  v_occurrence uuid;
  v_rejected boolean := false;
begin
  if not exists(
    select 1 from public.tasks task
    join public.goals goal on goal.id=task.goal_id
    where goal.status in ('expired','archived')
  ) then raise exception 'Inactive-Goal imported Tasks are not readable as history'; end if;
  select occurrence.id into v_occurrence
  from public.task_occurrences occurrence
  where occurrence.legacy_tracker_log_id='33000000-0000-4000-8000-00000000000c';
  begin
    perform public.set_task_occurrence_status_v1(v_occurrence,'pending','legacy-log:immutable');
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'Imported Tracker history remained mutable'; end if;
end $$;
reset role;

\echo 'Production-shaped migration ordering, preservation, provenance, and idempotency assertions passed.'
