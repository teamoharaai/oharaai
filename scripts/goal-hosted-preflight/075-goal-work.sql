-- 075 probe: goal_work_v1 read and mutate round trip for Tasks and Milestones, as authenticated for a
-- synthetic owner, plus executor ownership and grants. Task writes delegate to the canonical 048-064 Task
-- RPCs that desktop also uses, so this exercises them with the executor on hosted.
-- Runs inside the preflight's single rollback-only transaction (scripts/test-manual-goal-hosted.mjs).
insert into auth.users(id,email,raw_user_meta_data) values
  ('11a00e2e-7575-4075-8075-000000000001','goal-work-probe@local.ohara.test','{}'),
  ('11a00e2e-7575-4075-8075-000000000002','goal-work-probe-other@local.ohara.test','{}');
update public.profiles set timezone='America/New_York' where id='11a00e2e-7575-4075-8075-000000000001';
do $$
declare
  owner constant text := '11a00e2e-7575-4075-8075-000000000001';
  other constant text := '11a00e2e-7575-4075-8075-000000000002';
  goal text; create_task jsonb; first jsonb; r jsonb; task jsonb; milestone text;
begin
  insert into public.goals(user_id, title, category, status) values (owner::uuid, 'Work probe', 'Work & Money', 'active')
    returning id::text into goal;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', owner, true);

  r := public.goal_work_v1('tasks', jsonb_build_object('goalId', goal));
  if r#>'{data,items}' is distinct from '[]'::jsonb or r#>>'{data,ownerId}' is distinct from owner then
    raise exception '075 probe: empty Task page failed: %', r; end if;

  -- Task create commits once per identity and returns the confirmed Task with today's occurrence.
  create_task := jsonb_build_object('operationId', '22a00e2e-7575-4075-8075-000000000001', 'operationType', 'task.create',
    'contractVersion', 1, 'goalId', goal, 'fields', '{"title":"Probe task","completionMode":"binary"}'::jsonb,
    'schedule', '{"kind":"daily"}'::jsonb);
  first := public.goal_work_v1('mutate', create_task);
  task := first#>'{data,task}';
  if first#>>'{data,state}' is distinct from 'committed' or task#>>'{current,state}' is distinct from 'pending'
    or task#>>'{current,occurrenceId}' is null then raise exception '075 probe: Task create failed: %', first; end if;
  r := public.goal_work_v1('mutate', create_task);
  if r->'data' is distinct from first->'data' then raise exception '075 probe: Task replay changed the receipt: %', r; end if;
  r := public.goal_work_v1('tasks', jsonb_build_object('goalId', goal));
  if jsonb_array_length(r#>'{data,items}') <> 1 or r#>>'{data,items,0,id}' is distinct from task->>'id' then
    raise exception '075 probe: Task page failed: %', r; end if;

  -- Progress applies to the current occurrence.
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-7575-4075-8075-000000000002',
    'operationType', 'task.progress', 'contractVersion', 1, 'goalId', goal, 'taskId', task->>'id',
    'occurrenceId', task#>>'{current,occurrenceId}', 'progress', '{"action":"complete"}'::jsonb));
  if r#>>'{data,state}' is distinct from 'committed' or r#>>'{data,task,current,state}' is distinct from 'completed' then
    raise exception '075 probe: Task progress failed: %', r; end if;

  -- Milestone create and one-way completion.
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-7575-4075-8075-000000000003',
    'operationType', 'milestone.create', 'contractVersion', 1, 'goalId', goal, 'fields', '{"title":"Probe milestone"}'::jsonb));
  if r#>>'{data,state}' is distinct from 'committed' then raise exception '075 probe: Milestone create failed: %', r; end if;
  milestone := r#>>'{data,milestone,id}';
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-7575-4075-8075-000000000004',
    'operationType', 'milestone.complete', 'contractVersion', 1, 'goalId', goal, 'milestoneId', milestone));
  if r#>>'{data,state}' is distinct from 'committed' or r#>>'{data,milestone,completedAt}' is null then
    raise exception '075 probe: Milestone complete failed: %', r; end if;
  r := public.goal_work_v1('milestones', jsonb_build_object('goalId', goal));
  if jsonb_array_length(r#>'{data,items}') <> 1 or r#>>'{data,items,0,completedAt}' is null then
    raise exception '075 probe: Milestone page failed: %', r; end if;

  -- Another owner sees nothing and cannot commit.
  perform set_config('request.jwt.claim.sub', other, true);
  r := public.goal_work_v1('tasks', jsonb_build_object('goalId', goal));
  if r#>>'{error,code}' is distinct from 'GOAL_UNAVAILABLE' then raise exception '075 probe: cross-owner read allowed: %', r; end if;
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-7575-4075-8075-000000000005',
    'operationType', 'milestone.create', 'contractVersion', 1, 'goalId', goal, 'fields', '{"title":"Sneaky"}'::jsonb));
  if r#>>'{data,state}' is distinct from 'not_committed' then raise exception '075 probe: cross-owner mutate allowed: %', r; end if;
  perform set_config('role', 'none', true);

  -- The writes landed in the canonical tables, once.
  if (select count(*) from public.task_occurrences where task_id = (task->>'id')::uuid and status = 'completed') <> 1 then
    raise exception '075 probe: expected exactly one completed occurrence'; end if;
  if (select count(*) from public.milestones where goal_id = goal::uuid and title = 'Sneaky') <> 0 then
    raise exception '075 probe: cross-owner Milestone was written'; end if;

  -- Executor ownership and grants as deployed.
  if (select pg_get_userbyid(proowner) from pg_proc where oid = 'public.goal_work_v1(text,jsonb)'::regprocedure) <> 'goal_manual_executor'
    or not (select prosecdef from pg_proc where oid = 'public.goal_work_v1(text,jsonb)'::regprocedure) then
    raise exception '075 probe: goal_work_v1 is not a security definer owned by goal_manual_executor'; end if;
  if has_function_privilege('anon', 'public.goal_work_v1(text,jsonb)', 'EXECUTE')
    or has_function_privilege('service_role', 'public.goal_work_v1(text,jsonb)', 'EXECUTE') then
    raise exception '075 probe: anon or service_role can execute goal_work_v1'; end if;
  if not has_function_privilege('authenticated', 'public.goal_work_v1(text,jsonb)', 'EXECUTE') then
    raise exception '075 probe: authenticated cannot execute goal_work_v1'; end if;
  if exists (select 1 from pg_auth_members where roleid = 'goal_manual_executor'::regrole and (inherit_option or set_option)) then
    raise exception '075 probe: temporary SET/INHERIT membership survived'; end if;
  if has_schema_privilege('goal_manual_executor', 'public', 'CREATE') or has_schema_privilege('goal_manual_executor', 'goal_private', 'CREATE') then
    raise exception '075 probe: temporary schema CREATE survived'; end if;

  -- Account deletion cascades the receipts.
  delete from auth.users where id in (owner::uuid, other::uuid);
  if exists (select 1 from goal_private.work_mutations where owner_id in (owner::uuid, other::uuid)) then
    raise exception '075 probe: account cascade failed'; end if;
end $$;
