\set ON_ERROR_STOP on

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000000c',false);

do $$
declare
  v_recurring uuid;
  v_pending uuid;
  v_completed uuid;
  v_completed_occurrence uuid;
  v_successor uuid;
begin
  select public.create_task_v1(
    p_goal_id => '14000000-0000-4000-8000-00000000000c',
    p_title => 'Native recurring', p_completion_mode => 'binary',
    p_idempotency_key => 'phase-recurring', p_schedule_kind => 'weekly',
    p_schedule_interval => 1, p_schedule_weekdays => array[1,3,5]::smallint[],
    p_schedule_start => current_date, p_schedule_local_time => '09:00',
    p_schedule_timezone => 'America/New_York'
  ) into v_recurring;
  select public.create_task_v1(
    p_goal_id => '14000000-0000-4000-8000-00000000000c',
    p_title => 'Native pending', p_completion_mode => 'binary',
    p_due_date => current_date + 3, p_idempotency_key => 'phase-pending'
  ) into v_pending;
  select public.create_task_v1(
    p_goal_id => '14000000-0000-4000-8000-00000000000c',
    p_title => 'Native completed', p_completion_mode => 'binary',
    p_due_date => current_date, p_idempotency_key => 'phase-completed'
  ) into v_completed;
  select id into v_completed_occurrence from public.task_occurrences where task_id = v_completed;
  perform public.set_task_occurrence_status_v1(v_completed_occurrence,'completed','phase-complete-occurrence');

  select public.start_goal_new_phase_v1(
    '14000000-0000-4000-8000-00000000000c', now() + interval '2 years', 'Successor', null, null
  ) into v_successor;

  if (select status from public.goals where id = '14000000-0000-4000-8000-00000000000c') <> 'archived' then
    raise exception 'Predecessor did not leave Active';
  end if;
  if (select status from public.goals where id = v_successor) <> 'active' then
    raise exception 'Successor is not Active';
  end if;
  if (select count(*) from public.trackers where goal_id = v_successor) <> 0 then
    raise exception 'New Phase cloned legacy Trackers';
  end if;
  if exists (select 1 from public.tasks where goal_id = v_successor and title = 'Native completed') then
    raise exception 'Completed one-time Task was copied';
  end if;
  if not exists (select 1 from public.tasks where goal_id = v_successor and title = 'Native recurring') then
    raise exception 'Active recurring Task was not copied';
  end if;
  if not exists (select 1 from public.tasks where goal_id = v_successor and title = 'Native pending') then
    raise exception 'Pending one-time Task was not copied';
  end if;
  if exists (
    select 1 from public.task_occurrences occurrence
    join public.tasks task on task.id = occurrence.task_id
    where task.goal_id = v_successor
      and occurrence.status in ('completed','missed','skipped')
  ) then
    raise exception 'Historical occurrence state leaked into successor';
  end if;
  if exists (
    select 1 from public.tasks
    where goal_id = v_successor
      and (legacy_tracker_id is not null or legacy_action_log_id is not null or legacy_current_value is not null)
  ) then
    raise exception 'Legacy provenance/history was copied into successor';
  end if;
  if not exists (select 1 from public.task_occurrences where task_id = v_completed and status = 'completed') then
    raise exception 'Predecessor history was lost';
  end if;
end;
$$;

reset role;
\echo 'New Phase canonical Task continuity assertions passed.'
