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
  ('c1110000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','reflection','Private Reflection','a1100000-0000-0000-0000-000000000001','private'),
  ('c1210000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','note','Shared Note','a1100000-0000-0000-0000-000000000001','project'),
  ('c1200000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','reflection','Shared Reflection','a1100000-0000-0000-0000-000000000001','project'),
  ('c1520000-0000-0000-0000-000000000005','11000000-0000-0000-0000-000000000001','note','Guide Note','a1500000-0000-0000-0000-000000000005','guide'),
  ('c1530000-0000-0000-0000-000000000005','11000000-0000-0000-0000-000000000001','note','Guide Private Note','a1500000-0000-0000-0000-000000000005','private'),
  ('c1500000-0000-0000-0000-000000000005','11000000-0000-0000-0000-000000000001','reflection','Guide Reflection','a1500000-0000-0000-0000-000000000005','guide'),
  ('c1510000-0000-0000-0000-000000000005','11000000-0000-0000-0000-000000000001','reflection','Guide Private','a1500000-0000-0000-0000-000000000005','private');

insert into storage.objects(bucket_id,name,owner) values
  ('note-images','11000000-0000-0000-0000-000000000001/c1100000-0000-0000-0000-000000000001/private.webp','11000000-0000-0000-0000-000000000001'),
  ('note-images','11000000-0000-0000-0000-000000000001/c1210000-0000-0000-0000-000000000002/shared.webp','11000000-0000-0000-0000-000000000001');

insert into public.vault_items(vault_id,item_type,content_kind,title,visibility,created_by)
select id,'note','generic','Private Vault Item','private','11000000-0000-0000-0000-000000000001' from public.vaults where project_id='a1100000-0000-0000-0000-000000000001';
insert into public.vault_items(vault_id,item_type,content_kind,title,visibility,created_by)
select id,'note','generic','Shared Vault Item','vault_members','11000000-0000-0000-0000-000000000001' from public.vaults where project_id='a1100000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
do $$ declare affected integer; begin
  if (select count(*) from public.entries where project_id='a1100000-0000-0000-0000-000000000001')<>4 then raise exception 'Owner cannot read every private and shared Note/Reflection'; end if;
  update public.entries set title='Private Note' where id='c1100000-0000-0000-0000-000000000001';
  get diagnostics affected = row_count;
  if affected<>1 then raise exception 'Owner cannot edit private Note'; end if;
  update public.entries set title='Shared Reflection' where id='c1200000-0000-0000-0000-000000000002';
  get diagnostics affected = row_count;
  if affected<>1 then raise exception 'Owner cannot edit shared Reflection'; end if;
end $$;

select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000003',true);
do $$ declare affected integer; begin
  if (select count(*) from public.projects where id='a1100000-0000-0000-0000-000000000001')<>1 then raise exception 'Member cannot read Project'; end if;
  if (select count(*) from public.entries where project_id='a1100000-0000-0000-0000-000000000001')<>2 then raise exception 'Entry privacy leaked or shared Entries missing'; end if;
  if exists(select 1 from public.entries where id='c1100000-0000-0000-0000-000000000001') then raise exception 'Private Note leaked'; end if;
  if exists(select 1 from public.entries where id='c1110000-0000-0000-0000-000000000001') then raise exception 'Private Reflection leaked'; end if;
  if not exists(select 1 from public.entries where id='c1210000-0000-0000-0000-000000000002') then raise exception 'Shared Note missing for member'; end if;
  if not exists(select 1 from public.entries where id='c1200000-0000-0000-0000-000000000002') then raise exception 'Shared Reflection missing for member'; end if;
  update public.entries set title='Member rewrite' where id in ('c1210000-0000-0000-0000-000000000002','c1200000-0000-0000-0000-000000000002');
  get diagnostics affected = row_count;
  if affected<>0 then raise exception 'Member edited a shared Entry'; end if;
  if not exists(select 1 from storage.objects where bucket_id='note-images' and name like '%/shared.webp') then raise exception 'Shared Note image missing'; end if;
  if exists(select 1 from storage.objects where bucket_id='note-images' and name like '%/private.webp') then raise exception 'Private Note image leaked'; end if;
  if (select count(*) from public.vault_items vi join public.vaults v on v.id=vi.vault_id where v.project_id='a1100000-0000-0000-0000-000000000001')<>1 then raise exception 'Vault item privacy leaked or shared item missing'; end if;
  begin perform public.assign_project_task_v11((select id from public.tasks where title='Assigned Task'),'13000000-0000-0000-0000-000000000003'); raise exception 'Member assigned a Task';
  exception when others then if sqlerrm='Member assigned a Task' then raise; end if; end;
end $$;
select public.create_project_comment_v11('a1100000-0000-0000-0000-000000000001','goal','b1100000-0000-0000-0000-000000000001','Member context');
select public.create_project_chat_message_v11('a1100000-0000-0000-0000-000000000001','Member chat message');
select public.complete_project_task_v11((select id from public.task_occurrences where task_id=(select id from public.tasks where title='Assigned Task')));

reset role;
update public.project_comments set id='d1300000-0000-0000-0000-000000000003'
  where project_id='a1100000-0000-0000-0000-000000000001' and author_id='13000000-0000-0000-0000-000000000003';
update public.project_chat_messages set id='e1300000-0000-0000-0000-000000000003'
  where project_id='a1100000-0000-0000-0000-000000000001' and author_id='13000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000003',true);
do $$ begin
  if not public.edit_project_comment_v11('d1300000-0000-0000-0000-000000000003','Member context updated') then raise exception 'Author edit failed'; end if;
  if not exists(select 1 from public.project_comments where id='d1300000-0000-0000-0000-000000000003' and body='Member context updated' and edited_at is not null) then raise exception 'Edited comment did not persist'; end if;
  begin
    perform public.edit_project_comment_v11('d1300000-0000-0000-0000-000000000003','   ');
    raise exception 'Empty comment edit accepted';
  exception when others then if sqlerrm='Empty comment edit accepted' then raise; end if; end;
  if not public.edit_project_chat_message_v11('e1300000-0000-0000-0000-000000000003','Member chat updated') then raise exception 'Chat author edit failed'; end if;
  if not exists(select 1 from public.project_chat_messages where id='e1300000-0000-0000-0000-000000000003' and body='Member chat updated' and edited_at is not null) then raise exception 'Edited chat message did not persist'; end if;
end $$;

select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000002',true);
select public.assign_project_task_v11((select id from public.tasks where title='Assigned Task'),'12000000-0000-0000-0000-000000000002');
do $$ declare affected integer; begin
  if (select count(*) from public.entries where project_id='a1100000-0000-0000-0000-000000000001')<>2 then raise exception 'Admin Entry privacy leaked or shared Entries missing'; end if;
  if exists(select 1 from public.entries where id in ('c1100000-0000-0000-0000-000000000001','c1110000-0000-0000-0000-000000000001')) then raise exception 'Private Note or Reflection leaked to Admin'; end if;
  if not exists(select 1 from public.entries where id='c1210000-0000-0000-0000-000000000002') then raise exception 'Shared Note missing for Admin'; end if;
  if not exists(select 1 from public.entries where id='c1200000-0000-0000-0000-000000000002') then raise exception 'Shared Reflection missing for Admin'; end if;
  if exists(select 1 from public.entries where id in ('c1520000-0000-0000-0000-000000000005','c1500000-0000-0000-0000-000000000005')) then raise exception 'Guide-only Entry leaked to unrelated Admin'; end if;
  update public.entries set title='Admin rewrite' where id in ('c1210000-0000-0000-0000-000000000002','c1200000-0000-0000-0000-000000000002');
  get diagnostics affected = row_count;
  if affected<>0 then raise exception 'Admin edited another owner shared Entry'; end if;
end $$;
select public.save_entry_v4(
  null,'note','Admin Project Note','{"type":"doc","blocks":[]}'::jsonb,'Admin Project Note',
  null,'[]'::jsonb,null,false,false,null,'{}'::uuid[],'{}'::text[],'{}'::uuid[],
  'a1100000-0000-0000-0000-000000000001',null,'[]'::jsonb,null,false,
  'e1200000-0000-0000-0000-000000000002'
);
select public.set_entry_project_share_v11(
  (select id from public.entries where user_id='12000000-0000-0000-0000-000000000002' and title='Admin Project Note'),
  'project'
);
insert into public.vault_items(vault_id,item_type,content_kind,title,visibility,created_by)
select id,'note','generic','Admin Shared Note','vault_members','12000000-0000-0000-0000-000000000002'
  from public.vaults where project_id='a1100000-0000-0000-0000-000000000001';
do $$ begin
  if not public.project_has_capability_v11('a1100000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000002','add_shared_content') then raise exception 'Admin missing shared Vault capability'; end if;
  if not exists(select 1 from public.entries where title='Admin Project Note' and user_id='12000000-0000-0000-0000-000000000002' and project_id='a1100000-0000-0000-0000-000000000001' and project_share_scope='project') then raise exception 'Admin could not create and share Project Note'; end if;
  if not exists(select 1 from public.vault_items where title='Admin Shared Note' and created_by='12000000-0000-0000-0000-000000000002') then raise exception 'Admin could not create shared Project Vault Note'; end if;
  if public.edit_project_comment_v11('d1300000-0000-0000-0000-000000000003','Admin rewrite') then raise exception 'Admin edited another author comment'; end if;
  if public.delete_project_comment_v11('d1300000-0000-0000-0000-000000000003') then raise exception 'Admin deleted another author comment'; end if;
  if public.edit_project_chat_message_v11('e1300000-0000-0000-0000-000000000003','Admin rewrite') then raise exception 'Admin edited another author chat message'; end if;
  if public.delete_project_chat_message_v11('e1300000-0000-0000-0000-000000000003') then raise exception 'Admin deleted another author chat message'; end if;
end $$;

select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000005',true);
do $$ declare affected integer; begin
  if not exists(select 1 from public.entries where id='c1520000-0000-0000-0000-000000000005') then raise exception 'Guide-shared Note missing'; end if;
  if exists(select 1 from public.entries where id='c1530000-0000-0000-0000-000000000005') then raise exception 'Private Guide Note leaked'; end if;
  if not exists(select 1 from public.entries where id='c1500000-0000-0000-0000-000000000005') then raise exception 'Guide-shared Reflection missing'; end if;
  if exists(select 1 from public.entries where id='c1510000-0000-0000-0000-000000000005') then raise exception 'Private Guide Reflection leaked'; end if;
  update public.entries set title='Guide rewrite' where id in ('c1520000-0000-0000-0000-000000000005','c1500000-0000-0000-0000-000000000005');
  get diagnostics affected = row_count;
  if affected<>0 then raise exception 'Guide edited an owner shared Entry'; end if;
  if not exists(select 1 from public.get_project_goal_momentum_v11('a1500000-0000-0000-0000-000000000005') where goal_id='b1500000-0000-0000-0000-000000000005' and current_value=64) then raise exception 'Guide Momentum projection missing'; end if;
end $$;
select public.create_project_task_v11('b1500000-0000-0000-0000-000000000005','Guide Task',current_date+1,'11000000-0000-0000-0000-000000000001','guide-task');
select public.create_project_milestone_v11('b1500000-0000-0000-0000-000000000005','Guide Milestone',current_date+5,'11000000-0000-0000-0000-000000000001');
select public.create_project_comment_v11('a1500000-0000-0000-0000-000000000005','goal','b1500000-0000-0000-0000-000000000005','Guide context');

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000004',true);
do $$ begin
  if exists(select 1 from public.projects where id='a1100000-0000-0000-0000-000000000001') then raise exception 'Cross-Project access leaked'; end if;
  if exists(select 1 from public.project_comments where project_id='a1100000-0000-0000-0000-000000000001') then raise exception 'Cross-Project comments leaked'; end if;
  if exists(select 1 from public.project_chat_messages where project_id='a1100000-0000-0000-0000-000000000001') then raise exception 'Cross-Project chat leaked'; end if;
  if exists(select 1 from public.entries where project_id='a1100000-0000-0000-0000-000000000001') then raise exception 'Cross-Project Entry access leaked'; end if;
  if exists(select 1 from storage.objects where bucket_id='note-images' and name like '%/shared.webp') then raise exception 'Cross-Project image access leaked'; end if;
  begin perform public.create_project_comment_v11('a1100000-0000-0000-0000-000000000001','goal','b1100000-0000-0000-0000-000000000001','Unauthorized'); raise exception 'Non-member commented';
  exception when others then if sqlerrm='Non-member commented' then raise; end if; end;
  if public.edit_project_comment_v11('d1300000-0000-0000-0000-000000000003','Outsider rewrite') then raise exception 'Non-member edited a comment'; end if;
  if public.delete_project_comment_v11('d1300000-0000-0000-0000-000000000003') then raise exception 'Non-member deleted a comment'; end if;
  begin perform public.create_project_chat_message_v11('a1100000-0000-0000-0000-000000000001','Unauthorized'); raise exception 'Non-member chatted';
  exception when others then if sqlerrm='Non-member chatted' then raise; end if; end;
end $$;

select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000003',true);
do $$ begin
  if not public.delete_project_comment_v11('d1300000-0000-0000-0000-000000000003') then raise exception 'Author soft delete failed'; end if;
  if exists(select 1 from public.project_comments where id='d1300000-0000-0000-0000-000000000003') then raise exception 'Deleted comment body remained readable'; end if;
  if not public.delete_project_chat_message_v11('e1300000-0000-0000-0000-000000000003') then raise exception 'Chat author soft delete failed'; end if;
  if exists(select 1 from public.project_chat_messages where id='e1300000-0000-0000-0000-000000000003') then raise exception 'Deleted chat body remained readable'; end if;
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

select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000002',true);
do $$ begin
  if not exists(select 1 from public.entries where id='c1210000-0000-0000-0000-000000000002') then raise exception 'Archived Project unexpectedly hid shared Entry from current member'; end if;
  if not exists(select 1 from storage.objects where bucket_id='note-images' and name like '%/shared.webp') then raise exception 'Archived Project unexpectedly hid shared image from current member'; end if;
end $$;

select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000003',true);
do $$ begin
  if exists(select 1 from public.projects where id='a1100000-0000-0000-0000-000000000001') then raise exception 'Removed member retained Project access'; end if;
  if exists(select 1 from public.entries where id='c1210000-0000-0000-0000-000000000002') then raise exception 'Removed member retained shared Entry access'; end if;
  if exists(select 1 from storage.objects where bucket_id='note-images' and name like '%/shared.webp') then raise exception 'Removed member retained shared image access'; end if;
end $$;

reset role;
rollback;
\echo 'Projects V1.1 database security assertions passed.'
