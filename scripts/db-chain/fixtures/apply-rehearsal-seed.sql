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
