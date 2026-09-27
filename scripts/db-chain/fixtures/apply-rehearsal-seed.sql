-- Production-shaped existing rows for scripts/db-chain/apply-rehearsal.sh, loaded on the chain at the
-- state hosted is at. --apply must leave every one of them unchanged.
insert into auth.users(id, email, raw_user_meta_data) values ('5eed0000-0000-4000-8000-000000000001', 'seed@local.ohara.test', '{}');
insert into public.goals(id, user_id, title, category, status) values
  ('5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-000000000001', 'Seed goal', 'Work & Money', 'active');
insert into public.milestones(goal_id, user_id, title) values ('5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-000000000001', 'Seed milestone');
insert into public.tasks(id, user_id, goal_id, title, completion_mode) values
  ('5eed0000-0000-4000-8000-0000000000b1', '5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-00000000000a', 'Seed task', 'binary');
insert into public.task_schedules(id, user_id, task_id, version, recurrence_kind, start_date, timezone) values
  ('5eed0000-0000-4000-8000-0000000000c1', '5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-0000000000b1', 1, 'daily', current_date - 2, 'America/New_York');
insert into public.task_occurrences(user_id, task_id, schedule_id, occurrence_key, scheduled_local_date, status, source, completed_at) values
  ('5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-0000000000b1', '5eed0000-0000-4000-8000-0000000000c1', 'seed-1', current_date - 1, 'completed', 'schedule', now()),
  ('5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-0000000000b1', '5eed0000-0000-4000-8000-0000000000c1', 'seed-2', current_date, 'pending', 'schedule', null);
-- Goal receipts in each pre-078 store (078 copies them into the operation ledger and must leave them unchanged).
insert into goal_private.counters(owner_id, last_seq) values ('5eed0000-0000-4000-8000-000000000001', 2);
insert into goal_private.operations(owner_id, operation_id, seq, digest, first_recorded_at, admission_deadline, state, reason, terminal_at) values
  ('5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-0000000000d1', 1, repeat('a', 64), now() - interval '1 hour', now() + interval '23 hours', 'registered', null, null),
  ('5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-0000000000d2', 2, null, now() - interval '2 hours', null, 'not_committed', 'closed_by_owner', now() - interval '2 hours');
insert into goal_private.goal_mutations(owner_id, operation_id, operation_type, goal_id, expected_version, digest, state, reason, goal_version, recorded_at, acknowledged_at) values
  ('5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-0000000000e1', 'goal.archive', '5eed0000-0000-4000-8000-00000000000a', 1, repeat('b', 64), 'not_committed', 'VERSION_CONFLICT', null, now() - interval '3 hours', now() - interval '1 hour'),
  ('5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-0000000000e2', null, null, null, null, 'not_committed', 'closed_by_owner', null, now() - interval '4 hours', null);
insert into goal_private.work_mutations(owner_id, operation_id, operation_type, goal_id, entity_id, digest, state, reason, recorded_at) values
  ('5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-0000000000f1', 'task.create', '5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-0000000000b1', repeat('c', 64), 'committed', null, now() - interval '5 hours'),
  ('5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-0000000000f2', 'task.archive', '5eed0000-0000-4000-8000-00000000000a', null, repeat('d', 64), 'not_committed', 'TASK_UNAVAILABLE', now() - interval '6 hours');
