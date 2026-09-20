-- Disposable local 001–060 database only; every fixture rolls back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000096');
insert into public.goals(id,user_id,title,category) values
 ('10000000-0000-4000-8000-000000000096','00000000-0000-4000-8000-000000000096','Mixed phase','body');
insert into public.milestones(id,goal_id,user_id,title) values
 ('20000000-0000-4000-8000-000000000096','10000000-0000-4000-8000-000000000096','00000000-0000-4000-8000-000000000096','Forward milestone');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000096',true);
do $$
declare g uuid := '10000000-0000-4000-8000-000000000096'; successor uuid; t uuid; o uuid; history_count integer;
begin
 perform public.create_task_v1(g,'Once','binary',p_description=>'Once description',p_due_date=>current_date+4,
   p_milestone_id=>'20000000-0000-4000-8000-000000000096');
 t := public.create_task_v1(g,'Daily','binary',p_schedule_kind=>'daily',p_schedule_interval=>2,
   p_schedule_start=>current_date-8,p_schedule_end=>current_date+40,p_schedule_local_time=>'09:30',p_schedule_timezone=>'America/New_York');
 select id into o from public.task_occurrences where task_id=t order by scheduled_local_date limit 1;
 perform public.set_task_occurrence_status_v1(o,'completed','daily-history');
 perform public.create_task_v1(g,'Weekdays','binary',p_schedule_kind=>'weekly',p_schedule_interval=>2,
   p_schedule_weekdays=>array[1,3,5]::smallint[],p_schedule_start=>current_date-7,p_schedule_end=>current_date+40,p_schedule_timezone=>'America/New_York');
 perform public.create_task_v1(g,'Weekly target','binary',p_schedule_kind=>'weekly_count',p_schedule_target_count=>3,p_schedule_timezone=>'America/New_York');
 perform public.create_task_v1(g,'Quantity','quantity',p_description=>'Measured',p_target_quantity=>5,p_quantity_unit=>'km',p_due_date=>current_date+2);
 t := public.create_task_v1(g,'Completed once','binary');
 select id into o from public.task_occurrences where task_id=t;
 perform public.set_task_occurrence_status_v1(o,'completed','once-history');
 select count(*) into history_count from public.task_occurrences o join public.tasks t on t.id=o.task_id where t.goal_id=g;
 successor := public.start_goal_new_phase_v1(g,now()+interval '1 year');
 if (select count(*) from public.tasks where goal_id=successor)<>5 then raise exception 'eligible definition count wrong'; end if;
 if exists(select 1 from public.tasks where goal_id=successor and title='Completed once') then raise exception 'completed definition transferred'; end if;
 if exists(select 1 from public.tasks new join public.tasks old on old.goal_id=g and old.title=new.title
   where new.goal_id=successor and (new.id=old.id or new.description is distinct from old.description
   or new.completion_mode<>old.completion_mode or new.target_quantity is distinct from old.target_quantity
   or new.quantity_unit is distinct from old.quantity_unit or new.due_date is distinct from old.due_date
   or new.sort_order<>old.sort_order)) then raise exception 'definition fields lost'; end if;
 if exists(select 1 from public.task_schedules ns join public.tasks nt on nt.id=ns.task_id
   join public.tasks ot on ot.goal_id=g and ot.title=nt.title
   join public.task_schedules os on os.task_id=ot.id and os.is_active
   where nt.goal_id=successor and (ns.recurrence_kind<>os.recurrence_kind
     or ns.target_count is distinct from os.target_count or ns.weekdays<>os.weekdays
     or ns.interval_count<>os.interval_count or ns.timezone<>os.timezone
     or ns.local_time is distinct from os.local_time or ns.end_date is distinct from os.end_date
     or ns.version<>1 or not ns.is_active)) then raise exception 'schedule configuration lost'; end if;
 if exists(select 1 from public.task_occurrences o join public.tasks t on t.id=o.task_id
   where t.goal_id=successor and (o.status='completed' or o.completed_at is not null or coalesce(o.actual_quantity,0)<>0)) then raise exception 'history copied'; end if;
 if (select count(*) from public.task_occurrences o join public.tasks t on t.id=o.task_id where t.goal_id=g)<>history_count then raise exception 'predecessor history changed'; end if;
 if not exists(select 1 from public.tasks t join public.milestones m on m.id=t.milestone_id
   where t.goal_id=successor and t.title='Once' and m.goal_id=successor and m.title='Forward milestone') then raise exception 'invalid successor milestone link'; end if;
end $$;
rollback;
select 'Mixed Task New Phase definitions, configuration, links and history passed' as result;
