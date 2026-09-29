-- 081 probe: goal_work_v1 for desktop (TD-005 phase a). The storage grant took (B9: if hosted refused it, stop and
-- ask), the new Milestone operations work end to end for a synthetic owner, the ledger admits exactly the new types,
-- and reconcile_my_tasks_v1 materializes like the per-Task RPC. Writes nothing to storage: the photo check is proven
-- by a PHOTO_NOT_FOUND answer, which needs the executor to read storage.objects. Runs inside the preflight's single
-- transaction (rolled back; with --apply, in a savepoint that is rolled back before COMMIT).

do $$
begin
  if not has_schema_privilege('goal_manual_executor', 'storage', 'usage')
    or not has_table_privilege('goal_manual_executor', 'storage.objects', 'select') then
    raise exception '081 probe: the executor cannot read storage.objects (B9: stop and ask before relying on photo checks)';
  end if;
  if not exists(select 1 from pg_constraint where conrelid = 'goal_private.operation_ledger'::regclass and conname = 'operation_ledger_goal_work')
    or (select count(*) from pg_constraint where conrelid = 'goal_private.operation_ledger'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%goal.work%' and pg_get_constraintdef(oid) like '%milestone.complete%') <> 1 then
    raise exception '081 probe: expected exactly one goal.work ledger check, named operation_ledger_goal_work';
  end if;
  if has_function_privilege('anon', 'public.reconcile_my_tasks_v1(uuid[])', 'execute')
    or has_function_privilege('service_role', 'public.reconcile_my_tasks_v1(uuid[])', 'execute')
    or not has_function_privilege('authenticated', 'public.reconcile_my_tasks_v1(uuid[])', 'execute') then
    raise exception '081 probe: reconcile_my_tasks_v1 must be executable by authenticated only';
  end if;
end $$;

insert into auth.users(id,email,raw_user_meta_data) values
  ('11a00e2e-8081-4081-8081-000000000001','goal-work-desktop-probe@local.ohara.test','{}');
update public.profiles set timezone='America/New_York' where id='11a00e2e-8081-4081-8081-000000000001';
do $$
declare
  owner constant text := '11a00e2e-8081-4081-8081-000000000001';
  goal text; a jsonb; b jsonb; r jsonb; step jsonb; task uuid; horizon integer;
begin
  insert into public.goals(user_id, title, category, status) values (owner::uuid, 'Work desktop probe', 'Work & Money', 'active')
    returning id::text into goal;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', owner, true);

  a := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-8081-4081-8081-000000000001', 'operationType', 'milestone.create',
    'contractVersion', 1, 'goalId', goal, 'fields', '{"title":"Probe A","isAiSuggested":true}'::jsonb))#>'{data,milestone}';
  b := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-8081-4081-8081-000000000002', 'operationType', 'milestone.create',
    'contractVersion', 1, 'goalId', goal, 'fields', '{"title":"Probe B"}'::jsonb))#>'{data,milestone}';
  if (a->>'isAiSuggested')::boolean is not true or not a ? 'photoPath' then raise exception '081 probe: DTO lacks the new keys: %', a; end if;

  -- Child fields, then reorder.
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-8081-4081-8081-000000000003', 'operationType', 'milestone.create',
    'contractVersion', 1, 'goalId', goal, 'parentId', a->>'id', 'fields', '{"title":"Step","description":"Note","dueDate":"2030-01-01"}'::jsonb));
  step := r#>'{data,milestone,children,0}';
  if step->>'description' is distinct from 'Note' then raise exception '081 probe: step fields not stored: %', r; end if;
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-8081-4081-8081-000000000004', 'operationType', 'milestone.reorder',
    'contractVersion', 1, 'goalId', goal, 'orderedIds', jsonb_build_array(b->>'id', a->>'id')));
  if r#>>'{data,state}' is distinct from 'committed' then raise exception '081 probe: reorder failed: %', r; end if;
  r := public.goal_work_v1('milestones', jsonb_build_object('goalId', goal));
  if r#>>'{data,items,0,id}' is distinct from b->>'id' then raise exception '081 probe: reorder not visible: %', r; end if;

  -- Photo: the executor reads storage.objects (PHOTO_NOT_FOUND), and a foreign folder is refused.
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-8081-4081-8081-000000000005', 'operationType', 'milestone.update',
    'contractVersion', 1, 'goalId', goal, 'milestoneId', b->>'id', 'expectedRevision', r#>>'{data,items,0,revision}',
    'changes', jsonb_build_object('photoPath', owner || '/' || (b->>'id') || '/probe.jpg')));
  if r#>>'{data,reason}' is distinct from 'PHOTO_NOT_FOUND' then raise exception '081 probe: photo existence check did not run: %', r; end if;

  -- Completed Milestones still take steps; delete takes the Milestone, its steps and its events.
  perform public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-8081-4081-8081-000000000006', 'operationType', 'milestone.complete',
    'contractVersion', 1, 'goalId', goal, 'milestoneId', a->>'id'));
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-8081-4081-8081-000000000007', 'operationType', 'milestone.create',
    'contractVersion', 1, 'goalId', goal, 'parentId', a->>'id', 'fields', '{"title":"Late evidence"}'::jsonb));
  if r#>>'{data,state}' is distinct from 'committed' then raise exception '081 probe: evidence under a completed Milestone refused: %', r; end if;
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-8081-4081-8081-000000000008', 'operationType', 'milestone.delete',
    'contractVersion', 1, 'goalId', goal, 'milestoneId', a->>'id'));
  if r#>>'{data,state}' is distinct from 'committed' or r#>'{data,milestone}' <> 'null'::jsonb then raise exception '081 probe: delete failed: %', r; end if;

  -- Batch reconcile: a schedule never reconciled materializes through today + 28, like the per-Task default.
  perform set_config('role', 'postgres', true);
  insert into public.tasks(user_id, goal_id, title, completion_mode) values (owner::uuid, goal::uuid, 'Probe daily', 'binary') returning id into task;
  insert into public.task_schedules(user_id, task_id, version, recurrence_kind, start_date, timezone)
    values (owner::uuid, task, 1, 'daily', (now() at time zone 'America/New_York')::date - 2, 'America/New_York');
  perform set_config('role', 'authenticated', true);
  perform public.reconcile_my_tasks_v1(array[goal::uuid]);
  perform set_config('role', 'postgres', true);
  select max(scheduled_local_date) - (now() at time zone 'America/New_York')::date into horizon from public.task_occurrences where task_id = task;
  if horizon is distinct from 28 then raise exception '081 probe: batch reconcile horizon is %, expected 28', horizon; end if;
end $$;
reset role;
delete from auth.users where id = '11a00e2e-8081-4081-8081-000000000001';
do $$
begin
  if exists(select 1 from goal_private.operation_ledger where owner_id = '11a00e2e-8081-4081-8081-000000000001')
    or exists(select 1 from public.goals where user_id = '11a00e2e-8081-4081-8081-000000000001') then
    raise exception '081 probe: synthetic rows survived account deletion';
  end if;
end $$;
