-- 076 probe: replacing a schedule on a completed day keeps one live occurrence (TD-003), through the
-- canonical desktop RPC replace_task_schedule_v1, as authenticated for a synthetic owner.
-- Runs inside the preflight's single rollback-only transaction (scripts/test-manual-goal-hosted.mjs).
insert into auth.users(id,email,raw_user_meta_data)
values('11a00e2e-7676-4076-8076-000000000001','goal-continuity-probe@local.ohara.test','{}');
update public.profiles set timezone='America/New_York' where id='11a00e2e-7676-4076-8076-000000000001';
do $$
declare
  owner constant text := '11a00e2e-7676-4076-8076-000000000001';
  today constant date := (now() at time zone 'America/New_York')::date;
  goal text; task jsonb; r jsonb; live text;
begin
  insert into public.goals(user_id, title, category, status) values (owner::uuid, 'Continuity probe', 'Work & Money', 'active')
    returning id::text into goal;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', owner, true);
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-7676-4076-8076-000000000001',
    'operationType', 'task.create', 'contractVersion', 1, 'goalId', goal,
    'fields', '{"title":"Stretch","completionMode":"binary"}'::jsonb, 'schedule', '{"kind":"daily"}'::jsonb));
  task := r#>'{data,task}';
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-7676-4076-8076-000000000002',
    'operationType', 'task.progress', 'contractVersion', 1, 'goalId', goal, 'taskId', task->>'id',
    'occurrenceId', task#>>'{current,occurrenceId}', 'progress', '{"action":"complete"}'::jsonb));
  if r#>>'{data,task,current,state}' is distinct from 'completed' then raise exception '076 probe: setup failed: %', r; end if;
  -- The desktop path: replace the schedule on the completed day.
  perform public.replace_task_schedule_v1((task->>'id')::uuid, 'weekly', 1,
    array[extract(isodow from today)::smallint], null, null, null, null, null, '22a00e2e-7676-4076-8076-000000000003');
  perform set_config('role', 'none', true);
  select string_agg(status, ',' order by status) into live from public.task_occurrences
  where task_id = (task->>'id')::uuid and scheduled_local_date = today and source = 'schedule' and status <> 'cancelled';
  if live is distinct from 'completed' then raise exception '076 probe: expected one completed occurrence today, got %', live; end if;
  if not exists (select 1 from pg_indexes where indexname = 'task_occurrences_one_scheduled_per_day') then
    raise exception '076 probe: unique index missing'; end if;
  delete from auth.users where id = owner::uuid;
end $$;
