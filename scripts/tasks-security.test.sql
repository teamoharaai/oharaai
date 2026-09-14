\set ON_ERROR_STOP on

insert into auth.users(id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');
insert into public.profiles(id,display_name,timezone) values
  ('00000000-0000-4000-8000-00000000000a','A','America/New_York'),
  ('00000000-0000-4000-8000-00000000000b','B','UTC');
insert into public.goals(id,user_id,title,deadline,status) values
  ('10000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-00000000000a','A active',now()+interval '1 year','active'),
  ('10000000-0000-4000-8000-00000000000b','00000000-0000-4000-8000-00000000000b','B active',now()+interval '1 year','active'),
  ('10000000-0000-4000-8000-00000000001a','00000000-0000-4000-8000-00000000000a','A archived',now()+interval '1 year','archived');
insert into public.milestones(id,goal_id,user_id,title) values
  ('20000000-0000-4000-8000-00000000000a','10000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-00000000000a','A milestone'),
  ('20000000-0000-4000-8000-00000000000b','10000000-0000-4000-8000-00000000000b','00000000-0000-4000-8000-00000000000b','B milestone');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000000a',false);

do $$
declare v_task uuid; v_occurrence uuid; v_again uuid;
begin
  v_task := public.create_task_v1(
    '10000000-0000-4000-8000-00000000000a','No deadline','binary',
    p_idempotency_key => 'create:no-deadline'
  );
  v_again := public.create_task_v1(
    '10000000-0000-4000-8000-00000000000a','No deadline','binary',
    p_idempotency_key => 'create:no-deadline'
  );
  if v_task <> v_again then raise exception 'Task creation retry was not idempotent'; end if;
  select id into v_occurrence from public.task_occurrences where task_id=v_task;
  perform public.set_task_occurrence_status_v1(v_occurrence,'completed','status:complete');
  perform public.set_task_occurrence_status_v1(v_occurrence,'completed','status:complete');
  if (select status from public.tasks where id=v_task) <> 'complete' then
    raise exception 'One-time completion did not complete Task';
  end if;
  perform public.set_task_occurrence_status_v1(v_occurrence,'pending','status:undo');
  if (select status from public.tasks where id=v_task) <> 'active' then
    raise exception 'One-time completion could not not restore active state';
  end if;
end $$;

do $$
declare v_task uuid; v_occurrence uuid; v_value numeric;
begin
  v_task := public.create_task_v1(
    '10000000-0000-4000-8000-00000000000a','Read pages','quantity',
    p_target_quantity => 10,p_quantity_unit => 'pages',
    p_idempotency_key => 'create:quantity'
  );
  select id into v_occurrence from public.task_occurrences where task_id=v_task;
  begin
    perform public.set_task_occurrence_status_v1(v_occurrence,'completed','quantity:invalid-checkbox');
    raise exception 'Quantity Task accepted binary completion';
  exception when others then
    if sqlerrm='Quantity Task accepted binary completion' then raise; end if;
  end;
  v_value := public.adjust_task_occurrence_quantity_v1(v_occurrence,10,'quantity:+10');
  if v_value <> 10 or (select status from public.tasks where id=v_task) <> 'complete' then
    raise exception 'Quantity target did not complete';
  end if;
  v_value := public.adjust_task_occurrence_quantity_v1(v_occurrence,-1,'quantity:-1');
  if v_value <> 9 or (select status from public.tasks where id=v_task) <> 'active' then
    raise exception 'Quantity decrement did not reopen';
  end if;
  begin
    perform public.adjust_task_occurrence_quantity_v1(v_occurrence,-10,'quantity:negative');
    raise exception 'Negative quantity accepted';
  exception when others then
    if sqlerrm='Negative quantity accepted' then raise; end if;
  end;
end $$;

do $$
declare v_task uuid; v_count integer; v_count_again integer;
begin
  v_task := public.create_task_v1(
    '10000000-0000-4000-8000-00000000000a','Weekdays','binary',
    p_idempotency_key => 'create:weekly',p_schedule_kind => 'weekly',
    p_schedule_weekdays => array[1,3,5]::smallint[],p_schedule_timezone => 'America/New_York'
  );
  select count(*) into v_count from public.task_occurrences where task_id=v_task;
  perform public.reconcile_task_occurrences_v1(v_task,current_date+28);
  select count(*) into v_count_again from public.task_occurrences where task_id=v_task;
  if v_count=0 or v_count_again<>v_count then raise exception 'Schedule materialization is not stable'; end if;
end $$;

do $$
declare v_task uuid; v_occurrence uuid; v_rejected boolean := false;
begin
  v_task := public.create_task_v1(
    '10000000-0000-4000-8000-00000000000a','Version safety','binary',
    p_idempotency_key => 'create:version-safety',p_schedule_kind => 'daily',
    p_schedule_timezone => 'America/New_York'
  );
  select id into v_occurrence from public.task_occurrences
    where task_id=v_task and status='pending' order by scheduled_local_date limit 1;
  perform public.replace_task_schedule_v1(
    v_task,'weekly',1,array[1]::smallint[],current_date,null,null,
    'America/New_York',null,'schedule:version-safety'
  );
  begin
    perform public.set_task_occurrence_status_v1(v_occurrence,'completed','status:cancelled');
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'Cancelled occurrence mutation unexpectedly succeeded'; end if;
end $$;

do $$
declare v_task uuid; v_occurrence uuid; v_rejected boolean := false;
begin
  v_task := public.create_task_v1(
    '10000000-0000-4000-8000-00000000000a','Historical mode','binary',
    p_idempotency_key => 'create:historical-mode',p_schedule_kind => 'daily',
    p_schedule_timezone => 'America/New_York'
  );
  select id into v_occurrence from public.task_occurrences
    where task_id=v_task and status='pending' order by scheduled_local_date limit 1;
  perform public.set_task_occurrence_status_v1(v_occurrence,'completed','status:historical-mode');
  begin
    perform public.update_task_v1(v_task,'Historical mode','quantity',null,10,'pages',null,null);
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'Completion mode changed after history existed'; end if;
end $$;

-- Direct client writes are denied; all mutation must use the owned RPCs.
do $$
begin
  begin
    insert into public.tasks(user_id,goal_id,title,completion_mode)
    values ('00000000-0000-4000-8000-00000000000a','10000000-0000-4000-8000-00000000000a','Bypass','binary');
    raise exception 'Direct Task insert was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.task_occurrences set status='completed';
    raise exception 'Direct occurrence update was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.task_schedules(
      user_id,task_id,version,recurrence_kind,start_date,timezone
    ) values (
      '00000000-0000-4000-8000-00000000000a',gen_random_uuid(),1,'daily',current_date,'UTC'
    );
    raise exception 'Direct schedule insert was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Cross-owner calls and inactive-Goal calls must fail without leaking rows.
do $$
begin
  begin
    perform public.create_task_v1('10000000-0000-4000-8000-00000000000b','Cross owner','binary');
    raise exception 'Cross-owner Task creation was allowed';
  exception when others then
    if sqlerrm='Cross-owner Task creation was allowed' then raise; end if;
  end;
  begin
    perform public.create_task_v1(
      '10000000-0000-4000-8000-00000000000a','Mismatched milestone','binary',
      p_milestone_id => '20000000-0000-4000-8000-00000000000b'
    );
    raise exception 'Cross-Goal Milestone link was allowed';
  exception when others then
    if sqlerrm='Cross-Goal Milestone link was allowed' then raise; end if;
  end;
  begin
    perform public.create_task_v1('10000000-0000-4000-8000-00000000001a','Archived','binary');
    raise exception 'Inactive-Goal Task creation was allowed';
  exception when others then
    if sqlerrm='Inactive-Goal Task creation was allowed' then raise; end if;
  end;
  if exists(select 1 from public.tasks where user_id='00000000-0000-4000-8000-00000000000b') then
    raise exception 'RLS exposed another owner Task';
  end if;
end $$;

reset role;
\echo 'Task schema, recurrence, idempotency, ownership, and RLS assertions passed.'
