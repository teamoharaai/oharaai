-- 080 probe: Goal events (TD-004). The backfill matches the decided counting rules on the target's real rows,
-- every trigger path records and removes events, both reads agree, clients cannot read or write the table,
-- and account deletion cascades. Runs inside the preflight's single transaction (rolled back; with --apply, in
-- a savepoint that is rolled back before COMMIT), after the earlier probes have removed their synthetic accounts.

-- The backfill equals the rules, recomputed independently here (both directions, every kind).
do $$
declare missing bigint; extra bigint;
begin
  create temp table probe_expected_events on commit drop as
    select g.id as goal_id, 'task_completed'::text as kind, o.id as entity_id, null::text as entry_type, o.completed_at as occurred_at
    from public.task_occurrences o join public.tasks t on t.id = o.task_id join public.goals g on g.id = t.goal_id
    where o.status = 'completed' and o.completed_at is not null and t.user_id = g.user_id
    union all
    select g.id, 'milestone_completed', m.id, null, m.completed_at
    from public.milestones m join public.goals g on g.id = m.goal_id where m.completed_at is not null and m.user_id = g.user_id
    union all
    select g.id, 'entry_created', e.id, e.entry_type, e.created_at
    from public.entries e
    join (select entry_id, goal_id from public.entry_goal_links
          union select r.entry_id, m.goal_id from public.reflection_milestone_links r join public.milestones m on m.id = r.milestone_id) l
      on l.entry_id = e.id
    join public.goals g on g.id = l.goal_id and g.user_id = e.user_id;
  select count(*) into missing from (select * from probe_expected_events
    except select goal_id, kind, entity_id, entry_type, occurred_at from goal_private.goal_events) x;
  select count(*) into extra from (select goal_id, kind, entity_id, entry_type, occurred_at from goal_private.goal_events
    except select * from probe_expected_events) x;
  if missing > 0 or extra > 0 then raise exception '080 probe: backfill differs from the rules (% missing, % extra)', missing, extra; end if;
  if exists (select 1 from goal_private.goal_events e join public.goals g on g.id = e.goal_id where e.owner_id <> g.user_id) then
    raise exception '080 probe: an event is not owned by its Goal owner'; end if;
end $$;

insert into auth.users(id,email,raw_user_meta_data) values
  ('11a00e2e-8080-4080-8080-000000000001','goal-events-probe@local.ohara.test','{}'),
  ('11a00e2e-8080-4080-8080-000000000002','goal-events-probe-other@local.ohara.test','{}');
update public.profiles set timezone='America/New_York' where id='11a00e2e-8080-4080-8080-000000000001';
do $$
declare
  owner constant text := '11a00e2e-8080-4080-8080-000000000001';
  other constant text := '11a00e2e-8080-4080-8080-000000000002';
  goal text; task jsonb; milestone uuid; entry uuid; r jsonb; day jsonb;
begin
  insert into public.goals(user_id, title, category, status) values (owner::uuid, 'Events probe', 'Work & Money', 'active')
    returning id::text into goal;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', owner, true);

  -- A Task completion through work-v1 (the same 048 engine desktop's RPCs use).
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-8080-4080-8080-000000000001', 'operationType', 'task.create',
    'contractVersion', 1, 'goalId', goal, 'fields', '{"title":"Events task","completionMode":"binary"}'::jsonb, 'schedule', '{"kind":"daily"}'::jsonb));
  task := r#>'{data,task}';
  if r#>>'{data,state}' is distinct from 'committed' then raise exception '080 probe: task create failed: %', r; end if;
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', '22a00e2e-8080-4080-8080-000000000002', 'operationType', 'task.progress',
    'contractVersion', 1, 'goalId', goal, 'taskId', task->>'id', 'occurrenceId', task#>>'{current,occurrenceId}', 'progress', '{"action":"complete"}'::jsonb));
  if r#>>'{data,state}' is distinct from 'committed' then raise exception '080 probe: task complete failed: %', r; end if;

  -- A Milestone completed and a Reflection linked only through it, both by direct RLS writes (desktop's path).
  insert into public.milestones(goal_id, user_id, title, completed_at) values (goal::uuid, owner::uuid, 'Events milestone', now()) returning id into milestone;
  insert into public.entries(user_id, entry_type) values (owner::uuid, 'reflection') returning id into entry;
  insert into public.reflection_milestone_links(entry_id, milestone_id) values (entry, milestone);
  insert into public.entry_goal_links(entry_id, goal_id) values (entry, goal::uuid); -- a second link: still one event

  r := public.goal_card_v1('activity', jsonb_build_object('goalId', goal));
  day := r#>'{data,days}'->-1;
  if (day->>'taskCompletions', day->>'entriesCreated', day->>'milestonesCompleted') is distinct from ('1', '1', '1') then
    raise exception '080 probe: activity does not count the events: %', r; end if;
  if r#>'{data,days}' is distinct from (public.goal_activity_v1(goal::uuid))#>'{data,days}' then
    raise exception '080 probe: goal_activity_v1 and card-v1 disagree'; end if;
  if jsonb_array_length(public.goal_activity_v1(goal::uuid, 120)#>'{data,days}') <> 120 then raise exception '080 probe: long window failed'; end if;

  -- Archive keeps; un-complete and unlink remove.
  update public.entries set archived = true where id = entry;
  update public.milestones set completed_at = null where id = milestone;
  delete from public.reflection_milestone_links where entry_id = entry;
  day := public.goal_card_v1('activity', jsonb_build_object('goalId', goal))#>'{data,days}'->-1;
  if (day->>'entriesCreated', day->>'milestonesCompleted') is distinct from ('1', '0') then
    raise exception '080 probe: archive/un-complete/unlink rules failed: %', day; end if;

  perform set_config('request.jwt.claim.sub', other, true);
  if public.goal_activity_v1(goal::uuid)#>>'{error,code}' is distinct from 'GOAL_UNAVAILABLE' then raise exception '080 probe: cross-owner read allowed'; end if;
  perform set_config('role', 'none', true); -- back to the preflight's own role

  if has_table_privilege('authenticated', 'goal_private.goal_events', 'SELECT') or has_table_privilege('service_role', 'goal_private.goal_events', 'SELECT')
    or has_table_privilege('authenticated', 'goal_private.goal_events', 'INSERT') then
    raise exception '080 probe: clients can access goal_events'; end if;
  if has_function_privilege('anon', 'public.goal_activity_v1(uuid,integer)', 'EXECUTE')
    or has_function_privilege('service_role', 'public.goal_activity_v1(uuid,integer)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.goal_activity_v1(uuid,integer)', 'EXECUTE') then
    raise exception '080 probe: goal_activity_v1 grants are wrong'; end if;
  if has_function_privilege('authenticated', 'goal_private.sync_goal_events(uuid)', 'EXECUTE') then
    raise exception '080 probe: clients can run the derivation'; end if;
  if (select count(*) from pg_trigger where tgname like 'goal_events_%' and not tgisinternal) <> 11 then
    raise exception '080 probe: expected 11 goal_events triggers'; end if;
  if exists (select 1 from pg_auth_members where roleid = 'goal_manual_executor'::regrole and (inherit_option or set_option)) then
    raise exception '080 probe: temporary SET/INHERIT membership survived'; end if;
  if has_schema_privilege('goal_manual_executor', 'public', 'CREATE') or has_schema_privilege('goal_manual_executor', 'goal_private', 'CREATE') then
    raise exception '080 probe: temporary schema CREATE survived'; end if;

  -- Account deletion cascades the events.
  delete from auth.users where id in (owner::uuid, other::uuid);
  if exists (select 1 from goal_private.goal_events where owner_id in (owner::uuid, other::uuid)) then
    raise exception '080 probe: account cascade failed'; end if;
end $$;
