\set ON_ERROR_STOP on
begin;
-- Disposable full-chain fixture only. Helpers are invoker-rights, never RLS bypasses.
create function pg_temp.vid(label text) returns uuid language sql immutable as $$ select md5('vault-3d-' || label)::uuid $$;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
select pg_temp.vid(label),'00000000-0000-0000-0000-000000000000','authenticated','authenticated',label||'@vault-3d.invalid','',now(),now(),now()
from unnest(array['owner','admin','member','guide']) label;
insert into public.projects(id,user_id,title,mode)
select pg_temp.vid(label),pg_temp.vid('owner'),label,mode from (values ('team','team'),('personal','personal'),('guided','guide')) v(label,mode);
insert into public.project_members(project_id,user_id,role) values
(pg_temp.vid('team'),pg_temp.vid('admin'),'admin'),(pg_temp.vid('team'),pg_temp.vid('member'),'member'),(pg_temp.vid('guided'),pg_temp.vid('guide'),'guide');
insert into public.goals(id,user_id,title,category,project_id) values
(pg_temp.vid('g1'),pg_temp.vid('owner'),'Owner Goal','Work & Money',pg_temp.vid('team')),
(pg_temp.vid('g2'),pg_temp.vid('owner'),'Second Goal','Work & Money',pg_temp.vid('team'));
-- Current data contract explicitly forbids a multi-owner Goal Project. Test
-- rejection rather than disabling the trigger to fabricate a supported case.
do $$ begin
  begin
    insert into public.goals(id,user_id,title,category,project_id) values
      (pg_temp.vid('foreign-goal'),pg_temp.vid('member'),'Foreign Goal','Work & Money',pg_temp.vid('team'));
    raise exception 'Cross-owner Goal association unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Goal and Project must have the same owner' then raise; end if;
  end;
end $$;
insert into public.entries(id,user_id,entry_type,title,project_id,project_share_scope) values
(pg_temp.vid('private'),pg_temp.vid('owner'),'note','Private Goal Note',null,'private'),
(pg_temp.vid('member-note'),pg_temp.vid('member'),'note','Member Goal Note',null,'private'),
(pg_temp.vid('multi'),pg_temp.vid('owner'),'reflection','Multi Goal Reflection',pg_temp.vid('team'),'project'),
(pg_temp.vid('direct'),pg_temp.vid('owner'),'note','Direct Note',pg_temp.vid('team'),'project'),
(pg_temp.vid('personal-note'),pg_temp.vid('owner'),'note','Personal Note',pg_temp.vid('personal'),'private'),
(pg_temp.vid('guide-note'),pg_temp.vid('owner'),'note','Guide Note',pg_temp.vid('guided'),'guide');
insert into public.entry_goal_links(entry_id,goal_id) values
(pg_temp.vid('private'),pg_temp.vid('g1')),
(pg_temp.vid('member-note'),pg_temp.vid('g2')),
(pg_temp.vid('multi'),pg_temp.vid('g1')),
(pg_temp.vid('multi'),pg_temp.vid('g2'));
insert into public.vaults(goal_id,user_id,vault_type) values(pg_temp.vid('g1'),pg_temp.vid('owner'),'personal') on conflict(goal_id) do nothing;
insert into public.vault_items(vault_id,item_type,content_kind,title,metadata,visibility,created_by)
select id,'link','generic','Source','{"provider":"link","url":"https://example.test"}'::jsonb,'vault_members',pg_temp.vid('owner')
from public.vaults where project_id=pg_temp.vid('team') or goal_id=pg_temp.vid('g1');

-- Mirrors both scoped application paths, with RLS on Project, Goals, links AND Entries.
create function pg_temp.context_entries(pid uuid) returns table(id uuid) language sql as $$
  select e.id from public.entries e where not e.archived
    and exists(select 1 from public.projects p where p.id=pid)
    and (e.project_id=pid or e.id in (
      select l.entry_id from public.entry_goal_links l join public.goals g on g.id=l.goal_id where g.project_id=pid
    ))
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.vid('owner')::text,true);
do $$ begin
  if (select count(*) from pg_temp.context_entries(pg_temp.vid('team')))<>3 then raise exception 'Owner union/dedup/private scope incorrect'; end if;
  if exists(select 1 from pg_temp.context_entries(pg_temp.vid('team')) where id=pg_temp.vid('member-note')) then raise exception 'Participant private Note leaked to owner'; end if;
  if (select count(*) from pg_temp.context_entries(pg_temp.vid('personal')))<>1 then raise exception 'Goal-free personal Project failed'; end if;
end $$;
select set_config('request.jwt.claim.sub',pg_temp.vid('admin')::text,true);
do $$ declare affected integer; begin
  if (select count(*) from pg_temp.context_entries(pg_temp.vid('team')))<>2 then raise exception 'Admin union/private scope incorrect'; end if;
  update public.entries set title='UNAUTHORIZED' where id=pg_temp.vid('multi'); get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Admin edited another author Entry'; end if;
  delete from public.entries where id=pg_temp.vid('multi'); get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Admin deleted another author Entry'; end if;
end $$;
select set_config('request.jwt.claim.sub',pg_temp.vid('member')::text,true);
do $$ declare affected integer; begin
  if (select count(*) from pg_temp.context_entries(pg_temp.vid('team')))<>3 then raise exception 'Member union/own Goal content incorrect'; end if;
  if exists(select 1 from pg_temp.context_entries(pg_temp.vid('team')) where id=pg_temp.vid('private')) then raise exception 'Goal link granted private Entry access'; end if;
  if (select count(*) from public.vault_items i join public.vaults v on v.id=i.vault_id where v.project_id=pg_temp.vid('team') or v.goal_id=pg_temp.vid('g1'))<>2 then raise exception 'Direct/Goal Source scope incorrect'; end if;
  update public.vault_items set title='UNAUTHORIZED' where created_by=pg_temp.vid('owner'); get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Member edited owner Source'; end if;
  update public.entries set title='Owner edit' where id=pg_temp.vid('member-note'); get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Author mutation denied'; end if;
end $$;
select set_config('request.jwt.claim.sub',pg_temp.vid('guide')::text,true);
do $$ begin
  if (select count(*) from pg_temp.context_entries(pg_temp.vid('guided')))<>1 then raise exception 'Guide explicit share unreadable'; end if;
  if exists(select 1 from pg_temp.context_entries(pg_temp.vid('team'))) then raise exception 'Guide gained another Project'; end if;
end $$;
select set_config('request.jwt.claim.sub',pg_temp.vid('owner')::text,true);
select public.assign_goals_to_project_v1(pg_temp.vid('personal'),array[pg_temp.vid('g1')],true);
do $$ begin
  if exists(select 1 from pg_temp.context_entries(pg_temp.vid('team')) where id=pg_temp.vid('private')) then raise exception 'Reassigned Goal remained in old Vault scope'; end if;
  if not exists(select 1 from pg_temp.context_entries(pg_temp.vid('personal')) where id=pg_temp.vid('private')) then raise exception 'Reassigned Goal missing from new Vault scope'; end if;
end $$;
select public.assign_goals_to_project_v1(pg_temp.vid('team'),array[pg_temp.vid('g1')],true);
select public.detach_goal_from_project_v1(pg_temp.vid('team'),pg_temp.vid('g1'));
do $$ begin
  if (select count(*) from pg_temp.context_entries(pg_temp.vid('team')))<>2 then raise exception 'Detached Goal Entry remained in Project scope'; end if;
  if not exists(select 1 from public.entries where id=pg_temp.vid('private')) then raise exception 'Detach destroyed Entry'; end if;
end $$;
select public.remove_project_member_v11(pg_temp.vid('team'),pg_temp.vid('member'));
select set_config('request.jwt.claim.sub',pg_temp.vid('member')::text,true);
do $$ declare affected integer; begin
  if exists(select 1 from pg_temp.context_entries(pg_temp.vid('team'))) then raise exception 'Removed member retained contextual access'; end if;
  if exists(select 1 from public.entries where id=pg_temp.vid('multi')) then raise exception 'Removed member retained shared Entry'; end if;
  update public.entries set title='UNAUTHORIZED' where id=pg_temp.vid('direct'); get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Removed member mutated shared Entry'; end if;
end $$;
reset role;
delete from public.goals where id=pg_temp.vid('g1');
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.vid('owner')::text,true);
do $$ begin
  if exists(select 1 from pg_temp.context_entries(pg_temp.vid('team')) where id=pg_temp.vid('private')) then raise exception 'Deleted Goal association survived'; end if;
end $$;
update public.goals set status='archived',archived_at=now() where id=pg_temp.vid('g2');
update public.projects set status='archived' where id=pg_temp.vid('team');
do $$ begin
  if (select count(*) from pg_temp.context_entries(pg_temp.vid('team')))<>2 then raise exception 'Archiving lost authorized historical Entries'; end if;
end $$;
delete from public.projects where id=pg_temp.vid('personal');
do $$ begin
  if exists(select 1 from pg_temp.context_entries(pg_temp.vid('personal'))) then raise exception 'Deleted Project still exposes contextual results'; end if;
  if not exists(select 1 from public.entries where id=pg_temp.vid('personal-note')) then raise exception 'Project deletion destroyed canonical Entry'; end if;
end $$;
rollback;
select 'Vault context authorization, union, deduplication, Sources and mutation boundaries passed.' as result;
