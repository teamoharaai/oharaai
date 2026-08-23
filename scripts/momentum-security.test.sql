\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002');
insert into public.profiles (id, timezone) values
  ('10000000-0000-0000-0000-000000000001', 'America/New_York'),
  ('10000000-0000-0000-0000-000000000002', 'UTC');
insert into public.goals (id, user_id, title, status) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'V1 owner goal', 'active'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'V1 other goal', 'active');

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

-- V1 Goal Momentum publishes only through the trusted role and is idempotent.
select public.publish_goal_momentum_v1_snapshot(
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '2026-07-27', '2026-08-02', 'America/New_York',
  null, 72.5, 72.5, 'building',
  '{"consistency":80,"progress":70,"reflection":60,"initiative":75}',
  '{"consistency":{},"progress":{},"reflection":{},"initiative":{}}',
  '{"consistency":0.3,"progress":0.3,"reflection":0.2,"initiative":0.2}',
  '{"meaningfulMovement":true}', '[]', '["PACE_ON_TRACK"]',
  'goal-momentum-v1.0', repeat('c', 64), 'plan-revision-1',
  'health_fitness', 'frequency_routine',
  '{"effort":50,"duration":50,"frequency":50,"complexity":50,"magnitude":50,"externalDependency":0}',
  '{"effort":0.25,"duration":0.2,"frequency":0.15,"complexity":0.15,"magnitude":0.15,"externalDependency":0.1}',
  45, 'D2', '{"goalId":"20000000-0000-0000-0000-000000000001"}',
  'difficulty-v1.0', 'momentum-categories-v1.0'
);

select public.publish_goal_momentum_v1_snapshot(
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '2026-07-27', '2026-08-02', 'America/New_York',
  null, 72.5, 72.5, 'building',
  '{"consistency":80,"progress":70,"reflection":60,"initiative":75}',
  '{"consistency":{},"progress":{},"reflection":{},"initiative":{}}',
  '{"consistency":0.3,"progress":0.3,"reflection":0.2,"initiative":0.2}',
  '{"meaningfulMovement":true}', '[]', '["PACE_ON_TRACK"]',
  'goal-momentum-v1.0', repeat('c', 64), 'plan-revision-1',
  'health_fitness', 'frequency_routine',
  '{"effort":50,"duration":50,"frequency":50,"complexity":50,"magnitude":50,"externalDependency":0}',
  '{"effort":0.25,"duration":0.2,"frequency":0.15,"complexity":0.15,"magnitude":0.15,"externalDependency":0.1}',
  45, 'D2', '{"goalId":"20000000-0000-0000-0000-000000000001"}',
  'difficulty-v1.0', 'momentum-categories-v1.0'
);

-- V1 OHARA Momentum is independently persisted and idempotent.
select public.publish_ohara_momentum_v1_snapshot(
  '10000000-0000-0000-0000-000000000001',
  '2026-07-27', '2026-08-02', 'America/New_York',
  null, 68, 68, 'building',
  '{"portfolioProgress":72,"milestoneVelocity":65,"growthCadence":70,"sustainedGrowth":60,"portfolioCoverage":100}',
  '{"portfolioProgress":0.5,"milestoneVelocity":0.2,"growthCadence":0.15,"sustainedGrowth":0.1,"portfolioCoverage":0.05}',
  '{"eligibleGoals":1}', '[]', '["PORTFOLIO_PROGRESS_STRONG"]',
  'ohara-momentum-v1.0', repeat('d', 64), '[]', 'ohara-momentum-v1.0'
);

select public.publish_ohara_momentum_v1_snapshot(
  '10000000-0000-0000-0000-000000000001',
  '2026-07-27', '2026-08-02', 'America/New_York',
  null, 68, 68, 'building',
  '{"portfolioProgress":72,"milestoneVelocity":65,"growthCadence":70,"sustainedGrowth":60,"portfolioCoverage":100}',
  '{"portfolioProgress":0.5,"milestoneVelocity":0.2,"growthCadence":0.15,"sustainedGrowth":0.1,"portfolioCoverage":0.05}',
  '{"eligibleGoals":1}', '[]', '["PORTFOLIO_PROGRESS_STRONG"]',
  'ohara-momentum-v1.0', repeat('d', 64), '[]', 'ohara-momentum-v1.0'
);

do $$
begin
  if (select count(*) from public.goal_momentum_weekly_snapshots) <> 1 then
    raise exception 'Identical Goal Momentum V1 calculation created a duplicate snapshot';
  end if;
  if (select count(*) from public.momentum_weekly_snapshots where algorithm_version = 'ohara-momentum-v1.0') <> 1 then
    raise exception 'Identical OHARA Momentum V1 calculation created a duplicate snapshot';
  end if;
  if (select count(*) from public.goal_difficulty_profiles) <> 1 then
    raise exception 'Identical Goal Difficulty profile was not deduplicated';
  end if;
end;
$$;

-- V1.1 must continue from the latest closed V1.0 baseline without rewriting it.
select public.publish_goal_momentum_v1_snapshot(
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '2026-08-03', '2026-08-09', 'America/New_York',
  72.5, 76, 76, 'active',
  '{"consistency":82,"progress":76,"reflection":65,"initiative":78}',
  '{"consistency":{},"progress":{},"reflection":{},"initiative":{}}',
  '{"consistency":0.3,"progress":0.3,"reflection":0.2,"initiative":0.2}',
  '{"meaningfulMovement":true}', '[]', '["PACE_ON_TRACK"]',
  'goal-momentum-v1.1', repeat('e', 64), 'plan-revision-1',
  'health_fitness', 'frequency_routine',
  '{"effort":50,"duration":50,"frequency":50,"complexity":50,"magnitude":50,"externalDependency":0}',
  '{"effort":0.25,"duration":0.2,"frequency":0.15,"complexity":0.15,"magnitude":0.15,"externalDependency":0.1}',
  45, 'D2', '{"goalId":"20000000-0000-0000-0000-000000000001"}',
  'difficulty-v1.0', 'momentum-categories-v1.0'
);

select public.publish_ohara_momentum_v1_snapshot(
  '10000000-0000-0000-0000-000000000001',
  '2026-08-03', '2026-08-09', 'America/New_York',
  68, 70, 70, 'active',
  '{"portfolioProgress":74,"milestoneVelocity":68,"growthCadence":72,"sustainedGrowth":62,"portfolioCoverage":100}',
  '{"portfolioProgress":0.5,"milestoneVelocity":0.2,"growthCadence":0.15,"sustainedGrowth":0.1,"portfolioCoverage":0.05}',
  '{"eligibleGoals":1}', '[]', '["PORTFOLIO_PROGRESS_STRONG"]',
  'ohara-momentum-v1.1', repeat('f', 64), '[]', 'ohara-momentum-v1.1'
);

do $$
begin
  if (select count(*) from public.goal_momentum_weekly_snapshots
      where algorithm_version = 'goal-momentum-v1.0') <> 1 then
    raise exception 'V1.1 Goal publication rewrote V1.0 history';
  end if;
  if (select count(*) from public.goal_momentum_weekly_snapshots
      where algorithm_version = 'goal-momentum-v1.1' and previous_value = 72.5) <> 1 then
    raise exception 'V1.1 Goal publication did not accept the V1.0 closed baseline';
  end if;
  if (select count(*) from public.momentum_weekly_snapshots
      where algorithm_version = 'ohara-momentum-v1.0') <> 1 then
    raise exception 'V1.1 OHARA publication rewrote V1.0 history';
  end if;
  if (select count(*) from public.momentum_weekly_snapshots
      where algorithm_version = 'ohara-momentum-v1.1' and previous_value = 68) <> 1 then
    raise exception 'V1.1 OHARA publication did not accept the V1.0 closed baseline';
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
  select * into latest from public.momentum_weekly_snapshots
  where algorithm_version = 'momentum-v1.0' order by revision desc limit 1;
  if latest.revision <> 2 or latest.supersedes_snapshot_id is null then
    raise exception 'Late input did not create a superseding revision';
  end if;
  if (select count(*) from public.momentum_weekly_snapshots
      where algorithm_version = 'momentum-v1.0' and revision = 1) <> 1 then
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
  begin
    update public.goal_momentum_weekly_snapshots set current_value = 99;
    raise exception 'Direct trusted Goal Momentum snapshot update unexpectedly succeeded';
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
  if has_function_privilege('authenticated',
    'public.publish_goal_momentum_v1_snapshot(uuid,uuid,date,date,text,numeric,numeric,numeric,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,text,text,text,text,text,jsonb,jsonb,numeric,text,jsonb,text,text)',
    'EXECUTE') then
    raise exception 'Authenticated role can forge Goal Momentum V1 snapshots';
  end if;
  if has_function_privilege('authenticated',
    'public.publish_ohara_momentum_v1_snapshot(uuid,date,date,text,numeric,numeric,numeric,text,jsonb,jsonb,jsonb,jsonb,jsonb,text,text,jsonb,text)',
    'EXECUTE') then
    raise exception 'Authenticated role can forge OHARA Momentum V1 snapshots';
  end if;
  if has_table_privilege('authenticated', 'public.momentum_weekly_snapshots', 'INSERT')
    or has_table_privilege('authenticated', 'public.momentum_weekly_snapshots', 'UPDATE')
    or has_table_privilege('authenticated', 'public.momentum_weekly_snapshots', 'DELETE') then
    raise exception 'Authenticated role has direct snapshot mutation privileges';
  end if;
  if has_table_privilege('authenticated', 'public.goal_momentum_weekly_snapshots', 'INSERT')
    or has_table_privilege('authenticated', 'public.goal_momentum_weekly_snapshots', 'UPDATE')
    or has_table_privilege('authenticated', 'public.goal_momentum_weekly_snapshots', 'DELETE') then
    raise exception 'Authenticated role has direct Goal Momentum snapshot mutation privileges';
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
  if (select count(*) from public.momentum_weekly_snapshots) <> 4 then
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
  if (select count(*) from public.goal_momentum_weekly_snapshots) <> 0 then
    raise exception 'Cross-user Goal Momentum V1 snapshot read escaped RLS';
  end if;
  if (select count(*) from public.goal_difficulty_profiles) <> 0 then
    raise exception 'Cross-user Goal Difficulty read escaped RLS';
  end if;
end;
$$;

reset role;
select 'Momentum database security harness passed.' as result;
