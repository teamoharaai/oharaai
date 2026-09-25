\set ON_ERROR_STOP on
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','v11-owner@example.com','',now(),now(),now()),
  ('12000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','v11-admin@example.com','',now(),now(),now()),
  ('13000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','v11-member@example.com','',now(),now(),now()),
  ('14000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','v11-outsider@example.com','',now(),now(),now()),
  ('15000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','v11-guide@example.com','',now(),now(),now());

update public.profiles set username='v11owner',display_name='V11 Owner' where id='11000000-0000-0000-0000-000000000001';
update public.profiles set username='v11admin',display_name='V11 Admin' where id='12000000-0000-0000-0000-000000000002';
update public.profiles set username='v11member',display_name='V11 Member' where id='13000000-0000-0000-0000-000000000003';
update public.profiles set username='v11outsider',display_name='V11 Outsider' where id='14000000-0000-0000-0000-000000000004';
update public.profiles set username='v11guide',display_name='V11 Guide' where id='15000000-0000-0000-0000-000000000005';

insert into public.projects (id,user_id,title,mode) values
  ('a1100000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','Team Project','team'),
  ('a1500000-0000-0000-0000-000000000005','11000000-0000-0000-0000-000000000001','Guide Project','guide'),
  ('a1400000-0000-0000-0000-000000000004','14000000-0000-0000-0000-000000000004','Other Project','personal');

insert into public.project_members(project_id,user_id,role) values
  ('a1100000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000002','admin'),
  ('a1100000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000003','member'),
  ('a1500000-0000-0000-0000-000000000005','15000000-0000-0000-0000-000000000005','guide');

do $$ begin
  begin
    insert into public.project_members(project_id,user_id,role) values
      ('a1100000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000004','member');
    raise exception 'Database participant cap was bypassed';
  exception when others then if sqlerrm='Database participant cap was bypassed' then raise; end if; end;
end $$;

insert into public.goals(id,user_id,title,category,project_id,project_lead_id) values
  ('b1100000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','Shared Goal','Work & Money','a1100000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000002'),
  ('b1500000-0000-0000-0000-000000000005','11000000-0000-0000-0000-000000000001','Guided Goal','Health & Fitness','a1500000-0000-0000-0000-000000000005','11000000-0000-0000-0000-000000000001');
insert into public.goal_momentum_profiles(user_id,goal_id,current_value,status)
values('11000000-0000-0000-0000-000000000001','b1500000-0000-0000-0000-000000000005',64,'active');

set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
select public.create_project_task_v11('b1100000-0000-0000-0000-000000000001','Assigned Task',current_date,'13000000-0000-0000-0000-000000000003','v11-task');
select public.create_project_milestone_v11('b1100000-0000-0000-0000-000000000001','Responsible Milestone',current_date+3,'12000000-0000-0000-0000-000000000002');

do $$ begin
  begin perform public.assign_project_goal_lead_v11('b1100000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000004'); raise exception 'Invalid Goal Lead accepted';
  exception when others then if sqlerrm='Invalid Goal Lead accepted' then raise; end if; end;
  begin perform public.set_project_mode_v11('a1100000-0000-0000-0000-000000000001','personal'); raise exception 'Unsafe Personal transition accepted';
  exception when others then if sqlerrm='Unsafe Personal transition accepted' then raise; end if; end;
end $$;

reset role;
insert into public.entries(id,user_id,entry_type,title,project_id,project_share_scope) values
  ('c1100000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','note','Private Note','a1100000-0000-0000-0000-000000000001','private'),
  ('c1200000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','reflection','Shared Reflection','a1100000-0000-0000-0000-000000000001','project'),
  ('c1500000-0000-0000-0000-000000000005','11000000-0000-0000-0000-000000000001','reflection','Guide Reflection','a1500000-0000-0000-0000-000000000005','guide'),
  ('c1510000-0000-0000-0000-000000000005','11000000-0000-0000-0000-000000000001','reflection','Guide Private','a1500000-0000-0000-0000-000000000005','private');

insert into public.vault_items(vault_id,item_type,content_kind,title,visibility,created_by)
select id,'note','sticky_note','Private Sticky','private','11000000-0000-0000-0000-000000000001' from public.vaults where project_id='a1100000-0000-0000-0000-000000000001';
insert into public.vault_items(vault_id,item_type,content_kind,title,visibility,created_by)
select id,'note','sticky_note','Shared Sticky','vault_members','11000000-0000-0000-0000-000000000001' from public.vaults where project_id='a1100000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000003',true);
do $$ begin
  if (select count(*) from public.projects where id='a1100000-0000-0000-0000-000000000001')<>1 then raise exception 'Member cannot read Project'; end if;
  if (select count(*) from public.entries where project_id='a1100000-0000-0000-0000-000000000001')<>1 then raise exception 'Entry privacy leaked or shared Entry missing'; end if;
  if exists(select 1 from public.entries where id='c1100000-0000-0000-0000-000000000001') then raise exception 'Private Note leaked'; end if;
  if (select count(*) from public.vault_items vi join public.vaults v on v.id=vi.vault_id where v.project_id='a1100000-0000-0000-0000-000000000001')<>1 then raise exception 'Sticky Note privacy leaked or shared item missing'; end if;
  begin perform public.assign_project_task_v11((select id from public.tasks where title='Assigned Task'),'13000000-0000-0000-0000-000000000003'); raise exception 'Member assigned a Task';
  exception when others then if sqlerrm='Member assigned a Task' then raise; end if; end;
end $$;
select public.create_project_comment_v11('a1100000-0000-0000-0000-000000000001','goal','b1100000-0000-0000-0000-000000000001','Member context');
select public.complete_project_task_v11((select id from public.task_occurrences where task_id=(select id from public.tasks where title='Assigned Task')));

select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000002',true);
select public.assign_project_task_v11((select id from public.tasks where title='Assigned Task'),'12000000-0000-0000-0000-000000000002');

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000005',true);
do $$ begin
  if not exists(select 1 from public.entries where id='c1500000-0000-0000-0000-000000000005') then raise exception 'Guide-shared Reflection missing'; end if;
  if exists(select 1 from public.entries where id='c1510000-0000-0000-0000-000000000005') then raise exception 'Private Guide Reflection leaked'; end if;
  if not exists(select 1 from public.get_project_goal_momentum_v11('a1500000-0000-0000-0000-000000000005') where goal_id='b1500000-0000-0000-0000-000000000005' and current_value=64) then raise exception 'Guide Momentum projection missing'; end if;
end $$;
select public.create_project_task_v11('b1500000-0000-0000-0000-000000000005','Guide Task',current_date+1,'11000000-0000-0000-0000-000000000001','guide-task');
select public.create_project_milestone_v11('b1500000-0000-0000-0000-000000000005','Guide Milestone',current_date+5,'11000000-0000-0000-0000-000000000001');
select public.create_project_comment_v11('a1500000-0000-0000-0000-000000000005','goal','b1500000-0000-0000-0000-000000000005','Guide context');

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000004',true);
do $$ begin
  if exists(select 1 from public.projects where id='a1100000-0000-0000-0000-000000000001') then raise exception 'Cross-Project access leaked'; end if;
  if exists(select 1 from public.project_comments where project_id='a1100000-0000-0000-0000-000000000001') then raise exception 'Cross-Project comments leaked'; end if;
  begin perform public.create_project_comment_v11('a1100000-0000-0000-0000-000000000001','goal','b1100000-0000-0000-0000-000000000001','Unauthorized'); raise exception 'Non-member commented';
  exception when others then if sqlerrm='Non-member commented' then raise; end if; end;
end $$;

select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
select public.set_project_member_role_v11('a1100000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000002','member',null);
do $$ begin
  if public.project_has_capability_v11('a1100000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000002','assign_task') then raise exception 'Role downgrade retained Admin capability'; end if;
end $$;
select public.set_project_member_role_v11('a1100000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000002','admin',null);
select public.create_project_invitation_v11('a1500000-0000-0000-0000-000000000005','14000000-0000-0000-0000-000000000004',null,'guide','Tutor');
select public.revoke_project_invitation_v11((select id from public.project_invitations where project_id='a1500000-0000-0000-0000-000000000005' and invited_user_id='14000000-0000-0000-0000-000000000004'));
do $$ begin
  if exists(select 1 from public.project_invitations where project_id='a1500000-0000-0000-0000-000000000005' and invited_user_id='14000000-0000-0000-0000-000000000004' and status<>'revoked') then raise exception 'Invitation revocation failed'; end if;
end $$;
select public.remove_project_member_v11('a1100000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000003');
update public.projects set status='archived' where id='a1100000-0000-0000-0000-000000000001';
do $$ begin
  if public.project_has_capability_v11('a1100000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','create_task') then raise exception 'Archived Project retained mutation capability'; end if;
end $$;

select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000003',true);
do $$ begin
  if exists(select 1 from public.projects where id='a1100000-0000-0000-0000-000000000001') then raise exception 'Removed member retained Project access'; end if;
end $$;

reset role;
rollback;
\echo 'Projects V1.1 database security assertions passed.'
