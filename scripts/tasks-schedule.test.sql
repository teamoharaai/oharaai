\set ON_ERROR_STOP on

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000000a',false);

do $$
declare
  v_goal uuid := '10000000-0000-4000-8000-00000000000a';
  v_today date := (now() at time zone 'America/New_York')::date;
  v_start date := v_today + 7;
  v_task uuid;
  v_count integer;
begin
  -- Daily, bounded by start/end.
  v_task := public.create_task_v1(
    v_goal,'Daily bounded','binary',p_idempotency_key=>'schedule:daily',
    p_schedule_kind=>'daily',p_schedule_start=>v_start,p_schedule_end=>v_start+4,
    p_schedule_local_time=>'06:00',p_schedule_timezone=>'America/New_York'
  );
  select count(*) into v_count from public.task_occurrences where task_id=v_task;
  if v_count<>5 then raise exception 'Daily schedule expected 5 occurrences, found %',v_count; end if;

  -- Every two days uses the normalized interval.
  v_task := public.create_task_v1(
    v_goal,'Every two days','binary',p_idempotency_key=>'schedule:daily-two',
    p_schedule_kind=>'daily',p_schedule_interval=>2,p_schedule_start=>v_start,
    p_schedule_end=>v_start+6,p_schedule_timezone=>'America/New_York'
  );
  select count(*) into v_count from public.task_occurrences where task_id=v_task;
  if v_count<>4 then raise exception 'Every-two-day schedule expected 4, found %',v_count; end if;

  -- M/W/F within one anchored weekly interval.
  v_start := v_today + ((8-extract(isodow from v_today)::integer)%7);
  v_task := public.create_task_v1(
    v_goal,'MWF','binary',p_idempotency_key=>'schedule:mwf',
    p_schedule_kind=>'weekly',p_schedule_weekdays=>array[1,3,5]::smallint[],
    p_schedule_start=>v_start,p_schedule_end=>v_start+6,p_schedule_timezone=>'America/New_York'
  );
  select count(*) into v_count from public.task_occurrences where task_id=v_task;
  if v_count<>3 then raise exception 'M/W/F expected 3, found %',v_count; end if;

  -- T/Th is a separate valid custom weekday shape.
  v_task := public.create_task_v1(
    v_goal,'TTh','binary',p_idempotency_key=>'schedule:tth',
    p_schedule_kind=>'weekly',p_schedule_weekdays=>array[2,4]::smallint[],
    p_schedule_start=>v_start,p_schedule_end=>v_start+6,p_schedule_timezone=>'America/New_York'
  );
  select count(*) into v_count from public.task_occurrences where task_id=v_task;
  if v_count<>2 then raise exception 'T/Th expected 2, found %',v_count; end if;

  -- Biweekly generation includes the anchored week and skips the next one.
  v_task := public.create_task_v1(
    v_goal,'Biweekly Monday','binary',p_idempotency_key=>'schedule:biweekly',
    p_schedule_kind=>'weekly',p_schedule_interval=>2,
    p_schedule_weekdays=>array[1]::smallint[],p_schedule_start=>v_start,
    p_schedule_end=>v_start+20,p_schedule_timezone=>'America/New_York'
  );
  select count(*) into v_count from public.task_occurrences where task_id=v_task;
  if v_count<>2 then raise exception 'Biweekly expected 2, found %',v_count; end if;
end $$;

do $$
declare
  v_task uuid;
begin
  v_task := public.create_task_v1(
    '10000000-0000-4000-8000-00000000000a','One-time revision','binary',
    p_due_date=>current_date+1,p_idempotency_key=>'schedule:one-time-revision'
  );
  perform public.replace_task_schedule_v1(
    v_task,null,1,'{}'::smallint[],null,null,null,null,current_date+2,'schedule:one-time-replace'
  );
  if (select count(*) from public.task_occurrences where task_id=v_task and status='pending')<>1 then
    raise exception 'One-time schedule edit left duplicate pending occurrences';
  end if;
  if not exists(
    select 1 from public.task_occurrences
    where task_id=v_task and status='pending' and scheduled_local_date=current_date+2
  ) then raise exception 'One-time replacement did not preserve the new deadline'; end if;
end $$;

do $$
declare
  v_goal uuid := '10000000-0000-4000-8000-00000000000a';
  v_today date := (now() at time zone 'America/New_York')::date;
  v_task uuid;
  v_old_schedule uuid;
  v_new_schedule uuid;
  v_kept_completed uuid;
begin
  v_task := public.create_task_v1(
    v_goal,'Versioned schedule','binary',p_idempotency_key=>'schedule:versioned',
    p_schedule_kind=>'daily',p_schedule_start=>v_today,p_schedule_end=>v_today+14,
    p_schedule_local_time=>'08:15',p_schedule_timezone=>'America/New_York'
  );
  select id into v_old_schedule from public.task_schedules where task_id=v_task and is_active;
  select id into v_kept_completed from public.task_occurrences
    where task_id=v_task and scheduled_local_date=v_today;
  perform public.set_task_occurrence_status_v1(v_kept_completed,'completed','versioned:complete');
  v_new_schedule := public.replace_task_schedule_v1(
    v_task,'weekly',1,array[2,4]::smallint[],v_today+1,v_today+30,'09:30',
    'America/New_York',null,'versioned:replace'
  );
  if v_new_schedule=v_old_schedule then raise exception 'Schedule version did not change identity'; end if;
  if (select version from public.task_schedules where id=v_new_schedule)<>2 then
    raise exception 'Schedule version did not increment';
  end if;
  if not exists(select 1 from public.task_occurrences where id=v_kept_completed and status='completed') then
    raise exception 'Completed occurrence was reinterpreted during schedule edit';
  end if;
  if exists(
    select 1 from public.task_occurrences
    where schedule_id=v_old_schedule and scheduled_local_date>=v_today+1 and status='pending'
  ) then raise exception 'Superseded future occurrences remain pending'; end if;
  if not exists(select 1 from public.task_occurrences where schedule_id=v_new_schedule) then
    raise exception 'Replacement schedule produced no occurrences';
  end if;
end $$;

do $$
declare
  v_spring_task uuid;
  v_fall_task uuid;
  v_midnight_task uuid;
  v_spring timestamptz;
  v_fall timestamptz;
  v_midnight timestamptz;
  v_task uuid;
  v_occurrence public.task_occurrences;
begin
  -- PostgreSQL applies IANA rules at nonexistent/ambiguous local times. These
  -- expected UTC instants pin the chosen database semantics for both edges.
  v_spring_task := public.create_task_v1(
    '10000000-0000-4000-8000-00000000000a','DST spring','binary',
    p_idempotency_key=>'schedule:dst-spring',p_schedule_kind=>'daily',
    p_schedule_start=>'2026-03-08',p_schedule_end=>'2026-03-08',
    p_schedule_local_time=>'02:30',p_schedule_timezone=>'America/New_York'
  );
  v_fall_task := public.create_task_v1(
    '10000000-0000-4000-8000-00000000000a','DST fall','binary',
    p_idempotency_key=>'schedule:dst-fall',p_schedule_kind=>'daily',
    p_schedule_start=>'2026-11-01',p_schedule_end=>'2026-11-01',
    p_schedule_local_time=>'01:30',p_schedule_timezone=>'America/New_York'
  );
  v_midnight_task := public.create_task_v1(
    '10000000-0000-4000-8000-00000000000a','Midnight','binary',
    p_idempotency_key=>'schedule:midnight',p_schedule_kind=>'daily',
    p_schedule_start=>'2026-09-12',p_schedule_end=>'2026-09-12',
    p_schedule_local_time=>'00:00',p_schedule_timezone=>'America/New_York'
  );
  select scheduled_at into v_spring from public.task_occurrences where task_id=v_spring_task;
  select scheduled_at into v_fall from public.task_occurrences where task_id=v_fall_task;
  select scheduled_at into v_midnight from public.task_occurrences where task_id=v_midnight_task;
  if v_spring<>'2026-03-08 07:30:00+00'::timestamptz then
    raise exception 'Unexpected DST spring normalization: %',v_spring;
  end if;
  if v_fall<>'2026-11-01 06:30:00+00'::timestamptz then
    raise exception 'Unexpected DST fall normalization: %',v_fall;
  end if;
  if v_midnight <> '2026-09-12 04:00:00+00'::timestamptz then
    raise exception 'Midnight local-time conversion changed';
  end if;

  v_task := public.create_task_v1(
    '10000000-0000-4000-8000-00000000000a','Timezone persistence','binary',
    p_idempotency_key=>'schedule:timezone-persist',p_schedule_kind=>'daily',
    p_schedule_start=>(now() at time zone 'America/New_York')::date+3,
    p_schedule_end=>(now() at time zone 'America/New_York')::date+3,
    p_schedule_local_time=>'07:00',p_schedule_timezone=>'America/New_York'
  );
  update public.profiles set timezone='America/Los_Angeles'
    where id='00000000-0000-4000-8000-00000000000a';
  select * into v_occurrence from public.task_occurrences where task_id=v_task;
  if v_occurrence.schedule_timezone<>'America/New_York' then
    raise exception 'Profile timezone change moved historical occurrence semantics';
  end if;
end $$;

reset role;
\echo 'Task recurrence, schedule versioning, midnight, DST, and timezone assertions passed.'
