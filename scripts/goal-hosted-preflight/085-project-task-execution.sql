-- Canonical Project Task execution: collaborator authorization, quantity
-- semantics, retry idempotency, and one-time Task state all run in the caller's
-- transaction. These synthetic rows are removed (and --apply rolls the entire
-- probe savepoint back) before any production commit.
do $$
declare
  owner_id uuid := '85000000-0000-4000-8000-000000000001';
  member_id uuid := '85000000-0000-4000-8000-000000000002';
  outsider_id uuid := '85000000-0000-4000-8000-000000000003';
  project_id uuid := '85000000-0000-4000-8000-000000000010';
  goal_id uuid := '85000000-0000-4000-8000-000000000020';
  binary_task uuid := '85000000-0000-4000-8000-000000000030';
  quantity_task uuid := '85000000-0000-4000-8000-000000000031';
  binary_occurrence uuid := '85000000-0000-4000-8000-000000000040';
  quantity_occurrence uuid := '85000000-0000-4000-8000-000000000041';
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    (owner_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@project-task-probe.ohara.test', '', now(), now(), now()),
    (member_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@project-task-probe.ohara.test', '', now(), now(), now()),
    (outsider_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@project-task-probe.ohara.test', '', now(), now(), now());
  update public.profiles set username = 'projecttaskowner' where id = owner_id;
  update public.profiles set username = 'projecttaskmember' where id = member_id;
  update public.profiles set username = 'projecttaskoutsider' where id = outsider_id;

  insert into public.projects (id, user_id, title, mode) values (project_id, owner_id, 'Project Task Probe', 'team');
  insert into public.project_members (project_id, user_id, role) values (project_id, member_id, 'member');
  insert into public.goals (id, user_id, title, category, project_id)
    values (goal_id, owner_id, 'Project Task Goal', 'Work & Money', project_id);
  insert into public.tasks (id, user_id, goal_id, title, completion_mode, target_quantity, quantity_unit, assigned_to)
  values
    (binary_task, owner_id, goal_id, 'Binary Project Task', 'binary', null, null, member_id),
    (quantity_task, owner_id, goal_id, 'Quantity Project Task', 'quantity', 2, 'reps', member_id);
  insert into public.task_occurrences (id, user_id, task_id, occurrence_key, status, actual_quantity, source)
  values
    (binary_occurrence, owner_id, binary_task, 'one-time', 'pending', null, 'user'),
    (quantity_occurrence, owner_id, quantity_task, 'one-time', 'pending', 0, 'user');

  perform set_config('request.jwt.claim.sub', member_id::text, true);
  perform public.mutate_project_task_occurrence_v12(binary_occurrence, 'complete', null, 'binary-complete');
  perform public.mutate_project_task_occurrence_v12(binary_occurrence, 'complete', null, 'binary-complete');
  if not exists (
    select 1 from public.task_occurrences
    where id = binary_occurrence and status = 'completed' and completed_by = member_id
  ) then raise exception '085 probe: member binary completion failed'; end if;
  if not exists (select 1 from public.tasks where id = binary_task and status = 'complete') then
    raise exception '085 probe: one-time Task state did not complete';
  end if;
  if (select count(*) from public.project_activity_events where target_id = binary_task and event_type = 'task.completed') <> 1 then
    raise exception '085 probe: retry created duplicate completion activity';
  end if;
  if (select count(*) from public.task_mutation_receipts where user_id = member_id and idempotency_key = 'binary-complete') <> 1 then
    raise exception '085 probe: retry created duplicate receipt';
  end if;

  perform public.mutate_project_task_occurrence_v12(binary_occurrence, 'reopen', null, 'binary-reopen');
  if not exists (select 1 from public.task_occurrences where id = binary_occurrence and status = 'pending')
     or not exists (select 1 from public.tasks where id = binary_task and status = 'active') then
    raise exception '085 probe: binary reopen failed';
  end if;

  perform public.mutate_project_task_occurrence_v12(quantity_occurrence, 'adjust', 1, 'quantity-one');
  perform public.mutate_project_task_occurrence_v12(quantity_occurrence, 'adjust', 1, 'quantity-two');
  if not exists (
    select 1 from public.task_occurrences
    where id = quantity_occurrence and actual_quantity = 2 and status = 'completed' and completed_by = member_id
  ) then raise exception '085 probe: quantity completion failed'; end if;
  if not exists (select 1 from public.tasks where id = quantity_task and status = 'complete') then
    raise exception '085 probe: quantity one-time Task state did not complete';
  end if;

  perform set_config('request.jwt.claim.sub', outsider_id::text, true);
  begin
    perform public.mutate_project_task_occurrence_v12(binary_occurrence, 'complete', null, 'outsider-denied');
    raise exception '085 probe: outsider completed Project Task';
  exception when others then
    if sqlerrm = '085 probe: outsider completed Project Task' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  delete from auth.users where id in (owner_id, member_id, outsider_id);
  if exists (select 1 from public.projects where id = project_id)
     or exists (select 1 from public.tasks where id in (binary_task, quantity_task))
     or exists (select 1 from public.task_mutation_receipts where entity_id in (binary_occurrence, quantity_occurrence)) then
    raise exception '085 probe: synthetic rows survived cleanup';
  end if;
end $$;
