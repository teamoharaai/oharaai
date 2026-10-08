-- 090 probe: Apple export identity is owner-private, relevance-authorized,
-- idempotently reserved, and never cascades into canonical OHARA content.

do $$ begin
  if not exists(select 1 from pg_class where oid='public.calendar_external_links'::regclass and relrowsecurity) then
    raise exception '090 probe: calendar_external_links RLS is not enabled';
  end if;
  if has_table_privilege('anon','public.calendar_external_links','SELECT') then raise exception '090 probe: anon can read links'; end if;
  if has_table_privilege('authenticated','public.calendar_external_links','INSERT')
    or has_table_privilege('authenticated','public.calendar_external_links','UPDATE')
    or has_table_privilege('authenticated','public.calendar_external_links','DELETE') then
    raise exception '090 probe: authenticated has a direct link write grant';
  end if;
  if has_function_privilege('anon','public.reserve_calendar_external_link_v1(text,uuid,text,text,text)','EXECUTE') then raise exception '090 probe: anon can reserve links'; end if;
  if not has_function_privilege('authenticated','public.reserve_calendar_external_link_v1(text,uuid,text,text,text)','EXECUTE') then raise exception '090 probe: authenticated cannot reserve links'; end if;
end $$;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
  ('11a00e2e-8089-4089-8089-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','calendar-link-owner@local.ohara.test','',now(),now(),now()),
  ('11a00e2e-8089-4089-8089-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','calendar-link-outsider@local.ohara.test','',now(),now(),now());
insert into public.projects(id,user_id,title,mode)
values('11a00e2e-8089-4089-8089-000000000005','11a00e2e-8089-4089-8089-000000000001','Calendar link Project','team');
insert into public.project_members(project_id,user_id,role,invited_by)
values('11a00e2e-8089-4089-8089-000000000005','11a00e2e-8089-4089-8089-000000000002','member','11a00e2e-8089-4089-8089-000000000001');
insert into public.goals(id,user_id,title,category,deadline,project_id)
values('11a00e2e-8089-4089-8089-000000000010','11a00e2e-8089-4089-8089-000000000001','Calendar link Goal','Work & Money',current_date+7,'11a00e2e-8089-4089-8089-000000000005');
insert into public.tasks(id,user_id,goal_id,title,completion_mode,status,created_by,assigned_to)
values('11a00e2e-8089-4089-8089-000000000020','11a00e2e-8089-4089-8089-000000000001','11a00e2e-8089-4089-8089-000000000010','Calendar link Task','binary','active','11a00e2e-8089-4089-8089-000000000001','11a00e2e-8089-4089-8089-000000000002');
insert into public.task_occurrences(id,user_id,task_id,occurrence_key,status,source,scheduled_local_date)
values('11a00e2e-8089-4089-8089-000000000030','11a00e2e-8089-4089-8089-000000000001','11a00e2e-8089-4089-8089-000000000020','calendar-link','pending','user',current_date);

set local role authenticated;
select set_config('request.jwt.claim.sub','11a00e2e-8089-4089-8089-000000000001',true);
select public.reserve_calendar_external_link_v1('task_occurrence','11a00e2e-8089-4089-8089-000000000030','apple','calendar-a','operation-a');
select public.reserve_calendar_external_link_v1('task_occurrence','11a00e2e-8089-4089-8089-000000000030','apple','calendar-b','operation-b');
do $$ begin
  if (select count(*) from public.calendar_external_links) <> 1 then raise exception '090 probe: duplicate reservation created'; end if;
  if (select reservation_key from public.calendar_external_links) <> 'operation-a' then raise exception '090 probe: concurrent reservation replaced'; end if;
  begin
    perform public.finalize_calendar_external_link_v1(
      (select id from public.calendar_external_links), 'operation-b', 'calendar-b', 'event-b');
    raise exception '090 probe: wrong reservation finalized';
  exception when others then
    if sqlerrm = '090 probe: wrong reservation finalized' then raise; end if;
  end;
  perform public.finalize_calendar_external_link_v1(
    (select id from public.calendar_external_links), 'operation-a', 'calendar-a', 'event-a');
  if not exists(select 1 from public.calendar_external_links where sync_state='active' and external_event_id='event-a') then
    raise exception '090 probe: reservation did not finalize';
  end if;
end $$;

reset role;
-- A relevance pointer without canonical access must never authorize export.
delete from public.project_members
where project_id='11a00e2e-8089-4089-8089-000000000005'
  and user_id='11a00e2e-8089-4089-8089-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','11a00e2e-8089-4089-8089-000000000002',true);
do $$ begin
  if exists(select 1 from public.calendar_external_links) then raise exception '090 probe: outsider read owner link'; end if;
  begin
    perform public.reserve_calendar_external_link_v1('task_occurrence','11a00e2e-8089-4089-8089-000000000030','apple','calendar-x','operation-x');
    raise exception '090 probe: outsider reserved owner entity';
  exception when others then
    if sqlerrm = '090 probe: outsider reserved owner entity' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claim.sub','11a00e2e-8089-4089-8089-000000000001',true);
select public.set_calendar_external_link_state_v1((select id from public.calendar_external_links),'missing');
select public.reserve_calendar_external_link_v1('task_occurrence','11a00e2e-8089-4089-8089-000000000030','apple','calendar-a','operation-c');
do $$ begin
  if not exists(select 1 from public.calendar_external_links where sync_state='creating' and reservation_key='operation-c' and external_event_id is null) then
    raise exception '090 probe: missing link could not be re-reserved';
  end if;
end $$;
reset role;

delete from auth.users where id in ('11a00e2e-8089-4089-8089-000000000001','11a00e2e-8089-4089-8089-000000000002');
do $$ begin
  if exists(select 1 from public.goals where id='11a00e2e-8089-4089-8089-000000000010')
    or exists(select 1 from public.calendar_external_links where entity_id='11a00e2e-8089-4089-8089-000000000030') then
    raise exception '090 probe: synthetic rows survived cleanup';
  end if;
end $$;
