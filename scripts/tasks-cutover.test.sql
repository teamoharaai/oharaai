\set ON_ERROR_STOP on

-- Migration 049 has already run. These synthetic rows represent writes from
-- the previously deployed application during the migration/deployment gap.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000000c',false);

insert into public.trackers(
  id, goal_id, title, type, target_value, target_unit, frequency,
  current_value, is_ai_suggested, sort_order
) values (
  '26000000-0000-4000-8000-00000000000c',
  (select id from public.goals
   where previous_goal_id = '14000000-0000-4000-8000-00000000000c'),
  'Synthetic late Tracker', 'habit', null, null, 'daily', 1, false, 9
);

insert into public.tracker_logs(id, tracker_id, value, note, logged_at) values (
  '34000000-0000-4000-8000-00000000000c',
  '26000000-0000-4000-8000-00000000000c',
  1, null, now()
);

insert into public.action_logs(
  id, goal_id, user_id, action_text, status, due_date, completed_at, created_at
) values (
  '44000000-0000-4000-8000-00000000000c',
  (select id from public.goals
   where previous_goal_id = '14000000-0000-4000-8000-00000000000c'),
  '00000000-0000-4000-8000-00000000000c',
  'Synthetic late action', 'complete', current_date, now(), now()
);

do $$
declare
  v_denied boolean := false;
begin
  begin
    perform public.run_tasks_legacy_catchup_v1();
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'Authenticated user could invoke the global legacy catch-up';
  end if;
end $$;
reset role;

set role service_role;
do $$
begin
  if not exists (
    select 1 from public.verify_tasks_legacy_cutover_v1()
    where unmapped_rows > 0
  ) then
    raise exception 'Late legacy writes did not create the expected pre-catch-up gap';
  end if;
end $$;

select * from public.finalize_tasks_legacy_cutover_v1();

do $$
declare
  v_task_count bigint;
  v_occurrence_count bigint;
begin
  if exists (
    select 1 from public.verify_tasks_legacy_cutover_v1()
    where unmapped_rows <> 0 or duplicate_mappings <> 0
  ) then
    raise exception 'Final legacy cutover verification was not clean';
  end if;

  if has_table_privilege('authenticated', 'public.trackers', 'INSERT')
    or has_table_privilege('authenticated', 'public.trackers', 'UPDATE')
    or has_table_privilege('authenticated', 'public.trackers', 'DELETE')
    or has_table_privilege('authenticated', 'public.tracker_logs', 'INSERT')
    or has_table_privilege('authenticated', 'public.tracker_logs', 'UPDATE')
    or has_table_privilege('authenticated', 'public.tracker_logs', 'DELETE')
    or has_table_privilege('authenticated', 'public.action_logs', 'INSERT')
    or has_table_privilege('authenticated', 'public.action_logs', 'UPDATE')
    or has_table_privilege('authenticated', 'public.action_logs', 'DELETE') then
    raise exception 'Authenticated legacy writes were not fully frozen';
  end if;

  if not has_table_privilege('authenticated', 'public.trackers', 'SELECT')
    or not has_table_privilege('authenticated', 'public.tracker_logs', 'SELECT')
    or not has_table_privilege('authenticated', 'public.action_logs', 'SELECT') then
    raise exception 'Legacy read access was removed by the write freeze';
  end if;

  if not has_table_privilege('service_role', 'public.trackers', 'INSERT')
    or not has_table_privilege('service_role', 'public.tracker_logs', 'INSERT')
    or not has_table_privilege('service_role', 'public.action_logs', 'INSERT') then
    raise exception 'Service-role legacy audit/rollback access was removed';
  end if;

  if (select legacy_current_value from public.tasks
      where legacy_tracker_id = '26000000-0000-4000-8000-00000000000c') <> 1 then
    raise exception 'Late Tracker baseline was not preserved';
  end if;
  if (select legacy_current_value from public.tasks
      where legacy_tracker_id = '21000000-0000-4000-8000-00000000000c') <> 14 then
    raise exception 'Existing Tracker baseline changed during cutover';
  end if;
  if not exists (
    select 1 from public.task_occurrences
    where legacy_tracker_log_id = '34000000-0000-4000-8000-00000000000c'
      and source = 'legacy_tracker'
      and legacy_raw_value = 1
      and schedule_id is null
      and scheduled_local_date is null
  ) then
    raise exception 'Late Tracker log provenance changed during catch-up';
  end if;
  if not exists (
    select 1 from public.tasks task
    join public.task_occurrences occurrence on occurrence.task_id = task.id
    where task.legacy_action_log_id = '44000000-0000-4000-8000-00000000000c'
      and task.source = 'legacy_action'
      and occurrence.legacy_action_log_id = '44000000-0000-4000-8000-00000000000c'
      and occurrence.source = 'legacy_action'
  ) then
    raise exception 'Late action provenance changed during catch-up';
  end if;

  select count(*) into v_task_count
  from public.tasks where source in ('legacy_tracker', 'legacy_action');
  select count(*) into v_occurrence_count
  from public.task_occurrences where source in ('legacy_tracker', 'legacy_action');

  perform public.run_tasks_legacy_catchup_v1();

  if v_task_count <> (
      select count(*) from public.tasks where source in ('legacy_tracker', 'legacy_action')
    ) or v_occurrence_count <> (
      select count(*) from public.task_occurrences where source in ('legacy_tracker', 'legacy_action')
    ) then
    raise exception 'Catch-up retry created duplicate canonical rows';
  end if;
end $$;
reset role;

-- Every direct legacy mutation fails after the freeze.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000000c',false);
do $$
declare
  v_tracker_denied boolean := false;
  v_log_denied boolean := false;
  v_action_denied boolean := false;
  v_task_id uuid;
  v_active_goal_id uuid;
begin
  begin
    update public.trackers
    set current_value = current_value
    where id = '26000000-0000-4000-8000-00000000000c';
  exception when insufficient_privilege then v_tracker_denied := true;
  end;
  begin
    insert into public.tracker_logs(tracker_id, value)
    values ('26000000-0000-4000-8000-00000000000c', 1);
  exception when insufficient_privilege then v_log_denied := true;
  end;
  begin
    update public.action_logs
    set status = status
    where id = '44000000-0000-4000-8000-00000000000c';
  exception when insufficient_privilege then v_action_denied := true;
  end;
  if not v_tracker_denied or not v_log_denied or not v_action_denied then
    raise exception 'A frozen authenticated legacy mutation unexpectedly succeeded';
  end if;

  select id into v_active_goal_id from public.goals
  where previous_goal_id = '14000000-0000-4000-8000-00000000000c';
  v_task_id := public.create_task_v1(
    v_active_goal_id,
    'Canonical write after freeze',
    'binary',
    p_idempotency_key => 'cutover:canonical-write'
  );
  if v_task_id is null then
    raise exception 'Canonical Task mutation failed after legacy write freeze';
  end if;
end $$;
reset role;

-- The rollback operation restores only the historical authenticated grants.
set role service_role;
select public.restore_tasks_legacy_writes_v1();
do $$
begin
  if not has_table_privilege('authenticated', 'public.trackers', 'INSERT')
    or not has_table_privilege('authenticated', 'public.trackers', 'UPDATE')
    or not has_table_privilege('authenticated', 'public.trackers', 'DELETE')
    or not has_table_privilege('authenticated', 'public.tracker_logs', 'INSERT')
    or not has_table_privilege('authenticated', 'public.tracker_logs', 'UPDATE')
    or not has_table_privilege('authenticated', 'public.tracker_logs', 'DELETE')
    or not has_table_privilege('authenticated', 'public.action_logs', 'INSERT')
    or not has_table_privilege('authenticated', 'public.action_logs', 'UPDATE')
    or has_table_privilege('authenticated', 'public.action_logs', 'DELETE') then
    raise exception 'Rollback did not restore the exact pre-cutover legacy DML grants';
  end if;
end $$;

select public.freeze_tasks_legacy_writes_v1();
reset role;

\echo 'Late-write catch-up, aggregate verification, freeze, canonical write, retry, provenance, and rollback assertions passed.'
