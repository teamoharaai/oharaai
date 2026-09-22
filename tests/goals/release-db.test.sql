-- Run only against a disposable local database with migrations 001–069.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000091'),
 ('00000000-0000-4000-8000-000000000092');
insert into public.goals(id,user_id,title,category,status,deadline,visibility) values
 ('10000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000091','Release fixture','Health & Fitness','active',now()+interval '1 year','private');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
insert into public.vaults(id,goal_id,user_id) values
 ('30000000-0000-4000-8000-000000000091','10000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000091');
insert into public.vault_items(id,vault_id,created_by,item_type,title,content) values
 ('20000000-0000-4000-8000-000000000091','30000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000091','note','Private fixture','Never shared');
do $$
declare t uuid; o uuid; again uuid; successor uuid; n integer;
begin
 t := public.create_task_v1('10000000-0000-4000-8000-000000000091','Three runs','binary',
   p_idempotency_key=>'release-weekly',p_schedule_kind=>'weekly_count',
   p_schedule_start=>date_trunc('week',current_date)::date,p_schedule_timezone=>'UTC',p_schedule_target_count=>3);
 again := public.create_task_v1('10000000-0000-4000-8000-000000000091','Three runs','binary',
   p_idempotency_key=>'release-weekly',p_schedule_kind=>'weekly_count',p_schedule_target_count=>3);
 if t<>again then raise exception 'weekly create is not idempotent'; end if;
 if not exists(select 1 from public.task_schedules where task_id=t and recurrence_kind='weekly_count' and target_count=3) then
   raise exception 'weekly target lost'; end if;
 if not exists(select 1 from public.tasks where id=t and completion_mode='quantity' and target_quantity=3) then
   raise exception 'quantity target not mirrored'; end if;
 select id into strict o from public.task_occurrences where task_id=t and scheduled_local_date=date_trunc('week',current_date)::date;
 perform public.reconcile_task_occurrences_v1(t);
 select count(*) into n from public.task_occurrences where task_id=t and scheduled_local_date=date_trunc('week',current_date)::date;
 if n<>1 then raise exception 'weekly occurrence duplicated'; end if;
 if (select status from public.task_occurrences where id=o)<>'pending' then raise exception 'current week prematurely missed'; end if;
 perform public.adjust_task_occurrence_quantity_v1(o,1,'release-plus-1');
 perform public.adjust_task_occurrence_quantity_v1(o,1,'release-plus-1');
 if (select actual_quantity from public.task_occurrences where id=o)<>1 then raise exception 'quantity retry duplicated'; end if;
 perform public.adjust_task_occurrence_quantity_v1(o,2,'release-plus-2');
 if (select status from public.task_occurrences where id=o)<>'completed' then raise exception 'threshold not completed'; end if;
 perform public.adjust_task_occurrence_quantity_v1(o,-1,'release-minus');
 if (select status from public.task_occurrences where id=o)<>'pending' then raise exception 'quantity undo failed'; end if;
 perform public.update_task_v1(t,'Three runs edited','quantity',p_target_quantity=>3);
 if not exists(select 1 from public.task_schedules where task_id=t and recurrence_kind='weekly_count' and target_count=3) then
   raise exception 'edit erased weekly target'; end if;
 successor := public.start_goal_new_phase_v1('10000000-0000-4000-8000-000000000091',now()+interval '2 years');
 if not exists(select 1 from public.goals where id=successor and status='active' and visibility='private')
   or not exists(select 1 from public.goals where id='10000000-0000-4000-8000-000000000091' and status='archived' and visibility='private') then
   raise exception 'private phase visibility changed'; end if;
 if not exists(select 1 from public.task_schedules s join public.tasks t on t.id=s.task_id
   where t.goal_id=successor and s.recurrence_kind='weekly_count' and s.target_count=3) then
   raise exception 'New Phase lost weekly target'; end if;
 if not exists(select 1 from public.vault_items where id='20000000-0000-4000-8000-000000000091'
   and vault_id='30000000-0000-4000-8000-000000000091' and content='Never shared')
   or exists(select 1 from public.vault_items i join public.vaults v on v.id=i.vault_id where v.goal_id=successor) then raise exception 'private note history changed or copied'; end if;
 if (select momentum_scoring_profile from public.goals where id=successor) <> 'health_fitness' then raise exception 'New Phase scoring profile changed'; end if;
end $$;
update public.goals set visibility='public' where id='10000000-0000-4000-8000-000000000091';
update public.vault_items set title='Edited private fixture' where id='20000000-0000-4000-8000-000000000091';
do $$ begin
 if not exists(select 1 from public.vault_items where title='Edited private fixture') then raise exception 'owner note edit failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
do $$ begin
 if exists(select 1 from public.vault_items where vault_id='30000000-0000-4000-8000-000000000091') then raise exception 'public/viewer note leak'; end if;
 update public.vault_items set title='Viewer mutation' where id='20000000-0000-4000-8000-000000000091';
 if found then raise exception 'viewer changed owner note'; end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from public.milestones where kind='prep') then raise exception 'Prep survived'; end if;
 if (select public from storage.buckets where id='goal-note-photos') then raise exception 'note photos are public'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and (p.proname like '%shared%' or p.proname like '%public_goal%' or p.proname like '%project%')
   and p.prosrc like '%goal_notes%') then raise exception 'notes exposed by aggregation'; end if;
end $$;
rollback;
select 'Release weekly-count and Sticky Notes privacy checks passed' as result;
