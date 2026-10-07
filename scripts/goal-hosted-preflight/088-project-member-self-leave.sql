-- 088 probe: non-owner collaborators can remove only their own Project
-- membership. Their responsibility pointers are cleared without deleting
-- canonical Project, Goal, Task, or Milestone content.

do $$ begin
  if not exists (
    select 1 from pg_proc
    where oid = 'public.leave_project_v11(uuid)'::regprocedure and prosecdef
  ) then raise exception '088 probe: leave_project_v11 is missing or not security definer'; end if;
  if has_function_privilege('anon', 'public.leave_project_v11(uuid)', 'EXECUTE') then
    raise exception '088 probe: anon can leave a Project';
  end if;
  if not has_function_privilege('authenticated', 'public.leave_project_v11(uuid)', 'EXECUTE') then
    raise exception '088 probe: authenticated users cannot leave a Project';
  end if;
end $$;

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11a00e2e-8088-4088-8088-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','project-leave-owner@local.ohara.test','',now(),now(),now()),
  ('11a00e2e-8088-4088-8088-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','project-leave-member@local.ohara.test','',now(),now(),now()),
  ('11a00e2e-8088-4088-8088-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','project-leave-outsider@local.ohara.test','',now(),now(),now());

insert into public.projects(id,user_id,title,mode)
values('11a00e2e-8088-4088-8088-000000000010','11a00e2e-8088-4088-8088-000000000001','Leave probe','team');
insert into public.project_members(project_id,user_id,role)
values('11a00e2e-8088-4088-8088-000000000010','11a00e2e-8088-4088-8088-000000000002','member');
insert into public.goals(id,user_id,title,category,project_id,project_lead_id)
values('11a00e2e-8088-4088-8088-000000000020','11a00e2e-8088-4088-8088-000000000001','Leave probe Goal','Work & Money','11a00e2e-8088-4088-8088-000000000010','11a00e2e-8088-4088-8088-000000000002');
insert into public.tasks(id,user_id,goal_id,title,completion_mode,status,assigned_to,created_by)
values('11a00e2e-8088-4088-8088-000000000030','11a00e2e-8088-4088-8088-000000000001','11a00e2e-8088-4088-8088-000000000020','Leave probe Task','binary','active','11a00e2e-8088-4088-8088-000000000002','11a00e2e-8088-4088-8088-000000000001');
insert into public.milestones(id,user_id,goal_id,title,responsible_user_id,created_by)
values('11a00e2e-8088-4088-8088-000000000040','11a00e2e-8088-4088-8088-000000000001','11a00e2e-8088-4088-8088-000000000020','Leave probe Milestone','11a00e2e-8088-4088-8088-000000000002','11a00e2e-8088-4088-8088-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','11a00e2e-8088-4088-8088-000000000001',true);
do $$ begin
  begin
    perform public.leave_project_v11('11a00e2e-8088-4088-8088-000000000010');
    raise exception '088 probe: owner left their Project';
  exception when others then
    if sqlerrm = '088 probe: owner left their Project' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claim.sub','11a00e2e-8088-4088-8088-000000000003',true);
do $$ begin
  begin
    perform public.leave_project_v11('11a00e2e-8088-4088-8088-000000000010');
    raise exception '088 probe: outsider left a Project';
  exception when others then
    if sqlerrm = '088 probe: outsider left a Project' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claim.sub','11a00e2e-8088-4088-8088-000000000002',true);
do $$ begin
  if not public.leave_project_v11('11a00e2e-8088-4088-8088-000000000010') then
    raise exception '088 probe: member leave returned false';
  end if;
end $$;
reset role;

do $$ begin
  if exists(select 1 from public.project_members where project_id='11a00e2e-8088-4088-8088-000000000010' and user_id='11a00e2e-8088-4088-8088-000000000002') then raise exception '088 probe: membership remained'; end if;
  if not exists(select 1 from public.project_members where project_id='11a00e2e-8088-4088-8088-000000000010' and role='owner') then raise exception '088 probe: owner membership was removed'; end if;
  if exists(select 1 from public.goals where id='11a00e2e-8088-4088-8088-000000000020' and project_lead_id is not null) then raise exception '088 probe: Goal Lead remained'; end if;
  if exists(select 1 from public.tasks where id='11a00e2e-8088-4088-8088-000000000030' and assigned_to is not null) then raise exception '088 probe: Task assignment remained'; end if;
  if exists(select 1 from public.milestones where id='11a00e2e-8088-4088-8088-000000000040' and responsible_user_id is not null) then raise exception '088 probe: Milestone responsibility remained'; end if;
  if not exists(select 1 from public.tasks where id='11a00e2e-8088-4088-8088-000000000030')
    or not exists(select 1 from public.milestones where id='11a00e2e-8088-4088-8088-000000000040') then
    raise exception '088 probe: canonical content was deleted';
  end if;
end $$;

delete from auth.users where id in (
  '11a00e2e-8088-4088-8088-000000000001',
  '11a00e2e-8088-4088-8088-000000000002',
  '11a00e2e-8088-4088-8088-000000000003'
);

do $$ begin
  if exists(select 1 from public.projects where id='11a00e2e-8088-4088-8088-000000000010') then
    raise exception '088 probe: synthetic Project survived cleanup';
  end if;
end $$;
