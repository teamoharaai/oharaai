\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002');
insert into public.profiles (id, timezone) values
  ('10000000-0000-0000-0000-000000000001', 'America/New_York'),
  ('10000000-0000-0000-0000-000000000002', 'UTC');

set role service_role;
select set_config('request.jwt.claim.role', 'service_role', false);

select public.publish_momentum_snapshot(
  '10000000-0000-0000-0000-000000000001',
  '2026-07-27', '2026-08-02', 'America/New_York',
  0, 2, 40, 2, 0, 1,
  '{"consistency":{"score":40}}', '{"consistency":1}',
  '{"eligiblePlannedActions":1,"completedPlannedActions":1}',
  '[{"id":"30000000-0000-0000-0000-000000000001"}]',
  '[{"eventType":"action.completed"}]', '["GOAL_PROGRESS"]',
  'momentum-v1.0', repeat('a', 64),
  '[{"eventType":"action.completed","occurredAt":"2026-07-29T12:00:00Z","sourceEntityId":"30000000-0000-0000-0000-000000000001","deduplicationKey":"action.completed:30000000-0000-0000-0000-000000000001","eligibility":"included","exclusionReason":null}]'
);

-- Identical canonical output must return the same snapshot rather than create revision 2.
select public.publish_momentum_snapshot(
  '10000000-0000-0000-0000-000000000001',
  '2026-07-27', '2026-08-02', 'America/New_York',
  0, 2, 40, 2, 0, 1,
  '{"consistency":{"score":40}}', '{"consistency":1}',
  '{"eligiblePlannedActions":1,"completedPlannedActions":1}',
  '[{"id":"30000000-0000-0000-0000-000000000001"}]',
  '[{"eventType":"action.completed"}]', '["GOAL_PROGRESS"]',
  'momentum-v1.0', repeat('a', 64),
  '[{"eventType":"action.completed","occurredAt":"2026-07-29T12:00:00Z","sourceEntityId":"30000000-0000-0000-0000-000000000001","deduplicationKey":"action.completed:30000000-0000-0000-0000-000000000001","eligibility":"included","exclusionReason":null}]'
);

do $$
begin
  if (select count(*) from public.momentum_weekly_snapshots) <> 1 then
    raise exception 'Identical calculation created a duplicate snapshot';
  end if;
  if (select count(*) from public.momentum_events) <> 1 then
    raise exception 'Identical event was not deduplicated';
  end if;
end;
$$;

-- A late canonical input creates an immutable superseding revision.
select public.publish_momentum_snapshot(
  '10000000-0000-0000-0000-000000000001',
  '2026-07-27', '2026-08-02', 'America/New_York',
  0, 3, 60, 3, 0, 1,
  '{"consistency":{"score":60}}', '{"consistency":1}',
  '{"eligiblePlannedActions":2,"completedPlannedActions":2}',
  '[{"id":"30000000-0000-0000-0000-000000000001"},{"id":"30000000-0000-0000-0000-000000000002"}]',
  '[{"eventType":"action.completed"},{"eventType":"action.completed"}]',
  '["CONSISTENCY_HIGH"]', 'momentum-v1.0', repeat('b', 64),
  '[{"eventType":"action.completed","occurredAt":"2026-07-30T12:00:00Z","sourceEntityId":"30000000-0000-0000-0000-000000000002","deduplicationKey":"action.completed:30000000-0000-0000-0000-000000000002","eligibility":"included","exclusionReason":null}]'
);

do $$
declare
  latest public.momentum_weekly_snapshots;
begin
  select * into latest from public.momentum_weekly_snapshots order by revision desc limit 1;
  if latest.revision <> 2 or latest.supersedes_snapshot_id is null then
    raise exception 'Late input did not create a superseding revision';
  end if;
  if (select count(*) from public.momentum_weekly_snapshots where revision = 1) <> 1 then
    raise exception 'Original snapshot history was not preserved';
  end if;
end;
$$;

-- Even a trusted role cannot rewrite history directly; recalculation must insert.
do $$
begin
  begin
    update public.momentum_weekly_snapshots set next_value = 99;
    raise exception 'Direct trusted snapshot update unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm not like 'Momentum snapshots are immutable%' then raise; end if;
  end;
  begin
    delete from public.momentum_weekly_snapshots;
    raise exception 'Direct trusted snapshot delete unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm not like 'Momentum snapshots are immutable%' then raise; end if;
  end;
end;
$$;

reset role;
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);

do $$
begin
  if has_function_privilege('authenticated',
    'public.publish_momentum_snapshot(uuid,date,date,text,numeric,numeric,numeric,numeric,numeric,numeric,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,text,text,jsonb)',
    'EXECUTE') then
    raise exception 'Authenticated role can forge Momentum snapshots';
  end if;
  if has_table_privilege('authenticated', 'public.momentum_weekly_snapshots', 'INSERT')
    or has_table_privilege('authenticated', 'public.momentum_weekly_snapshots', 'UPDATE')
    or has_table_privilege('authenticated', 'public.momentum_weekly_snapshots', 'DELETE') then
    raise exception 'Authenticated role has direct snapshot mutation privileges';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.momentum_weekly_snapshots (
      user_id, week_start, week_end, timezone, previous_value, next_value,
      growth_quality_score, weekly_gain, weekly_drag, difficulty_multiplier,
      pillar_scores, effective_weights, raw_aggregates, input_actions,
      input_events, reason_codes, algorithm_version, calculation_hash
    ) values (
      auth.uid(), '2026-07-27', '2026-08-02', 'UTC', 0, 999, 100, 5, 0, 1,
      '{}', '{}', '{}', '[]', '[]', '["FAKE"]', 'fake', repeat('f', 64)
    );
    raise exception 'Authenticated direct insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- User A can read only A's rows.
do $$
begin
  if (select count(*) from public.momentum_weekly_snapshots) <> 2 then
    raise exception 'Owner cannot read own Momentum revisions';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', false);
do $$
begin
  if (select count(*) from public.momentum_weekly_snapshots) <> 0 then
    raise exception 'Cross-user snapshot read escaped RLS';
  end if;
  if (select count(*) from public.momentum_profiles) <> 0 then
    raise exception 'Cross-user profile read escaped RLS';
  end if;
  if (select count(*) from public.momentum_events) <> 0 then
    raise exception 'Cross-user event read escaped RLS';
  end if;
end;
$$;

reset role;
select 'Momentum database security harness passed.' as result;
