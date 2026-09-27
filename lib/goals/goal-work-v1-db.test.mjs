// Migration 075 integration against an explicitly supplied disposable Unix-socket PostgreSQL cluster.
// Run with `npm run test:goals:db`: the full supabase/migrations chain on a Supabase-shaped database.
// Synthetic rows only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
const socket = process.env.GOAL_TEST_SOCKET;
if (!socket?.startsWith('/tmp/ohara-goal-')) throw Error('Explicit disposable GOAL_TEST_SOCKET required');
const psql = process.env.GOAL_TEST_PSQL ?? '/opt/homebrew/opt/postgresql@17/bin/psql';
const args = ['-h', socket, '-p', process.env.GOAL_TEST_PORT ?? '55450', '-U', 'postgres', '-d', process.env.GOAL_TEST_DB ?? 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq'];
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const sql = (s) => execFileSync(psql, args, { input: s, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const asyncSQL = (s) => new Promise((resolve, reject) => { const p = spawn(psql, args); let out = '', err = ''; p.stdout.on('data', (x) => out += x); p.stderr.on('data', (x) => err += x); p.on('exit', (code) => code ? reject(Error(err)) : resolve(out.trim())); p.stdin.end(s); });
const literal = (x) => "'" + JSON.stringify(x).replaceAll("'", "''") + "'::jsonb";
const as = (who) => `set role authenticated;set request.jwt.claim.sub='${who}';`;
const call = (action, p, who) => `${as(who)}select public.goal_work_v1('${action}',${literal(p)});`;
const work = (action, p = {}, who = owner) => JSON.parse(sql(call(action, p, who)));
let n = 0; const id = () => `cccccccc-cccc-4ccc-8ccc-${String(++n).padStart(12, '0')}`;
const mutate = (goalId, operationType, extra = {}, who = owner, operationId = id()) =>
  work('mutate', { operationId, operationType, contractVersion: 1, goalId, ...extra }, who);
const today = (zone = 'America/New_York') => sql(`select to_char((now() at time zone '${zone}')::date,'YYYY-MM-DD');`);
const shift = (day, days) => sql(`select to_char('${day}'::date + ${days},'YYYY-MM-DD');`);
const goal = (who = owner, status = 'active') => {
  const goalId = sql(`insert into public.goals(user_id,title,category,status) values('${who}','Goal','Work & Money','${status}') returning id;`);
  return goalId;
};
const count = (q) => Number(sql(`select count(*) from ${q};`));
const createTask = (goalId, fields, schedule = { kind: 'once', dueDate: null }, who = owner) =>
  mutate(goalId, 'task.create', { fields, schedule }, who).data;
const fixtures = JSON.parse(readFileSync(new URL('./goal-work-v1.fixtures.json', import.meta.url)));

// auth.users' first column is instance_id, and signup (008/028) creates the profile (other defaults to UTC).
sql(`insert into auth.users(id) values('${owner}'),('${other}') on conflict do nothing;
update public.profiles set timezone='America/New_York' where id='${owner}';`);

test('reads establish ownership first; an empty Goal is an authoritative empty page', () => {
  const g = goal();
  for (const action of ['tasks', 'milestones']) {
    assert.equal(work(action, { goalId: g }, other).error.code, 'GOAL_UNAVAILABLE', action);
    assert.equal(work(action, { goalId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }).error.code, 'GOAL_UNAVAILABLE', action);
    const empty = work(action, { goalId: g }).data;
    assert.deepEqual([empty.ownerId, empty.contractVersion, empty.goalId, empty.items, empty.hasMore, empty.nextCursor], [owner, 1, g, [], false, null]);
  }
  assert.equal(work('tasks', { goalId: g, limit: 51 }).error.code, 'INVALID_FIELD');
  assert.equal(work('tasks', { goalId: g, extra: 1 }).error.code, 'INVALID_FIELD');
  assert.equal(work('tasks', {}).error.code, 'INVALID_FIELD');
  assert.equal(work('milestones', { goalId: 'nope' }).error.code, 'INVALID_FIELD');
});

test('task create commits once per identity, returns the confirmed Task and refuses a changed payload', async () => {
  const g = goal(); const operationId = id();
  const due = shift(today(), 3);
  const request = { fields: { title: '  Buy  shoes ', completionMode: 'binary' }, schedule: { kind: 'once', dueDate: due } };
  const first = mutate(g, 'task.create', request, owner, operationId).data;
  assert.deepEqual([first.state, first.reason, first.operationType, first.goalId], ['committed', null, 'task.create', g]);
  assert.deepEqual([first.task.title, first.task.status, first.task.schedule, first.task.current.state, first.task.current.period],
    ['Buy  shoes', 'active', { kind: 'once', dueDate: due }, 'pending', 'once']);
  assert.ok(first.task.current.occurrenceId); assert.match(first.task.revision, /^[0-9]+$/);
  const replay = mutate(g, 'task.create', request, owner, operationId).data;
  assert.deepEqual(replay, first);
  assert.equal(mutate(g, 'task.create', { ...request, fields: { title: 'Other', completionMode: 'binary' } }, owner, operationId).error.code, 'OPERATION_PAYLOAD_MISMATCH');
  assert.equal(count(`public.tasks where goal_id='${g}'`), 1);
  // Parallel duplicates of one identity commit exactly once.
  const race = id();
  const cmd = call('mutate', { operationId: race, operationType: 'task.create', contractVersion: 1, goalId: g, fields: { title: 'Race', completionMode: 'binary' }, schedule: { kind: 'daily' } }, owner);
  const [a, b] = await Promise.all([asyncSQL(cmd), asyncSQL(cmd)]);
  assert.deepEqual(JSON.parse(a).data, JSON.parse(b).data);
  assert.equal(count(`public.tasks where goal_id='${g}' and title='Race'`), 1);
  assert.equal(count(`public.task_schedules s join public.tasks t on t.id=s.task_id where t.title='Race' and t.goal_id='${g}'`), 1);
});

test('task create validates structure before identity and gates state-dependent rules with receipts', () => {
  const g = goal();
  for (const [fields, schedule] of [
    [{ title: '   ', completionMode: 'binary' }, { kind: 'daily' }],
    [{ title: 'x'.repeat(201), completionMode: 'binary' }, { kind: 'daily' }],
    [{ title: 'T', completionMode: 'binary', targetQuantity: 3 }, { kind: 'daily' }],
    [{ title: 'T', completionMode: 'quantity', targetQuantity: 0 }, { kind: 'daily' }],
    [{ title: 'T', completionMode: 'quantity', targetQuantity: 1.005 }, { kind: 'daily' }],
    [{ title: 'T', completionMode: 'binary' }, { kind: 'weekly_count', targetCount: 3 }],
    [{ title: 'T', completionMode: 'quantity', targetQuantity: 3 }, { kind: 'weekly_count', targetCount: 3 }],
    [{ title: 'T', completionMode: 'binary' }, { kind: 'weekly', weekdays: [] }],
    [{ title: 'T', completionMode: 'binary' }, { kind: 'weekly', weekdays: [1, 1] }],
    [{ title: 'T', completionMode: 'binary' }, { kind: 'weekly', weekdays: [8] }],
    [{ title: 'T', completionMode: 'binary' }, { kind: 'monthly' }],
    [{ title: 'T', completionMode: 'binary' }, { kind: 'once', dueDate: '2026-02-30' }],
    [{ title: 'T', completionMode: 'binary', color: 'red' }, { kind: 'daily' }],
  ]) assert.equal(mutate(g, 'task.create', { fields, schedule }).error.code, 'INVALID_FIELD', JSON.stringify([fields, schedule]));
  assert.equal(work('mutate', { operationId: id(), operationType: 'task.create', contractVersion: 2, goalId: g, fields: {}, schedule: {} }).error.code, 'UNSUPPORTED_CONTRACT');
  assert.equal(mutate(g, 'task.create', { fields: { title: 'T', completionMode: 'binary' } }).error.code, 'INVALID_FIELD');
  const past = mutate(g, 'task.create', { fields: { title: 'Late', completionMode: 'binary' }, schedule: { kind: 'once', dueDate: shift(today(), -1) } }).data;
  assert.deepEqual([past.state, past.reason, past.task], ['not_committed', 'DATE_IN_PAST', null]);
  assert.equal(count(`goal_private.operation_ledger where protocol='goal.work' and state='not_committed' and reason='DATE_IN_PAST'`), 1);
  assert.equal(count(`public.tasks where goal_id='${g}'`), 0);
});

test('schedules: daily, weekdays and weekly-count Tasks expose one current occurrence', () => {
  const g = goal(); const day = today();
  const isoToday = Number(sql(`select extract(isodow from '${day}'::date);`));
  const daily = createTask(g, { title: 'Stretch', completionMode: 'binary' }, { kind: 'daily' }).task;
  assert.deepEqual([daily.schedule.kind, daily.schedule.intervalCount, daily.schedule.startDate, daily.current.date, daily.current.state, daily.current.period],
    ['daily', 1, day, day, 'pending', 'day']);
  const off = createTask(g, { title: 'Off day', completionMode: 'binary' }, { kind: 'weekly', weekdays: [(isoToday % 7) + 1] }).task;
  assert.deepEqual([off.current.state, off.current.occurrenceId], ['not_scheduled', null]);
  const weekly = createTask(g, { title: 'Run', completionMode: 'quantity', targetQuantity: null, quantityUnit: null }, { kind: 'weekly_count', targetCount: 3 }).task;
  assert.deepEqual([weekly.completionMode, weekly.targetQuantity, weekly.schedule.targetCount, weekly.current.period, weekly.current.actualQuantity],
    ['quantity', 3, 3, 'week', 0]);
  const qty = createTask(g, { title: 'Read', completionMode: 'quantity', targetQuantity: 20, quantityUnit: 'pages' }).task;
  assert.deepEqual([qty.targetQuantity, qty.quantityUnit, qty.current.actualQuantity, qty.schedule.dueDate], [20, 'pages', 0, null]);
});

test('task pages are bounded and reconcile only the page, in one set-based pass per read', () => {
  const g = goal(); const day = today();
  for (let i = 0; i < 22; i++) createTask(g, { title: `T${String(i).padStart(2, '0')}`, completionMode: 'binary' });
  // A scheduled Task created on desktop 10 days ago and never reconciled since: no occurrences yet.
  const stale = sql(`insert into public.tasks(user_id,goal_id,title,completion_mode,sort_order) values('${owner}','${g}','Old daily','binary',1) returning id;`);
  sql(`insert into public.task_schedules(user_id,task_id,version,recurrence_kind,start_date,timezone) values('${owner}','${stale}',1,'daily','${day}'::date-9,'America/New_York');`);
  const first = work('tasks', { goalId: g }).data;
  assert.equal(first.items.length, 20); assert.ok(first.hasMore); assert.ok(first.nextCursor);
  assert.equal(first.items.at(-1).title, 'T19');
  assert.equal(count(`public.task_occurrences where task_id='${stale}'`), 0, 'not on this page, so untouched');
  assert.equal(work('tasks', { goalId: goal(), cursor: first.nextCursor }).error.code, 'CURSOR_EXPIRED');
  assert.equal(work('tasks', { goalId: g, cursor: first.nextCursor }, other).error.code, 'GOAL_UNAVAILABLE');
  const second = work('tasks', { goalId: g, cursor: first.nextCursor }).data;
  assert.deepEqual(second.items.map((x) => x.title), ['T20', 'T21', 'Old daily']);
  assert.equal(second.hasMore, false);
  // Frontier-to-today materialization with the canonical keys and missed rule; nothing ahead of today.
  assert.equal(sql(`select string_agg(status,',' order by scheduled_local_date) from public.task_occurrences where task_id='${stale}';`),
    'missed,missed,missed,missed,missed,missed,missed,missed,missed,pending');
  assert.equal(count(`public.task_occurrences where task_id='${stale}' and occurrence_key like 'schedule:%:v1:%:anytime'`), 10);
  assert.equal(second.items[2].current.state, 'pending');
  // Re-reading is idempotent; desktop's forward reconcile continues from the same frontier.
  work('tasks', { goalId: g, cursor: first.nextCursor });
  assert.equal(count(`public.task_occurrences where task_id='${stale}'`), 10);
  sql(`${as(owner)}select public.reconcile_task_occurrences_v1('${stale}', '${day}'::date + 3);`);
  assert.equal(count(`public.task_occurrences where task_id='${stale}'`), 13);
});

test('edits use the Task revision, preserve untouched fields and follow canonical mode rules', () => {
  const g = goal();
  const created = createTask(g, { title: 'Draft', completionMode: 'binary', description: 'Keep me' }, { kind: 'once', dueDate: shift(today(), 2) }).task;
  sql(`update public.task_occurrences set scheduled_local_time='09:30' where task_id='${created.id}';`);
  const edit = mutate(g, 'task.update', { taskId: created.id, expectedRevision: created.revision, changes: { title: 'Final draft' } }).data;
  assert.equal(edit.state, 'committed');
  assert.deepEqual([edit.task.title, edit.task.description, edit.task.schedule.dueDate], ['Final draft', 'Keep me', created.schedule.dueDate]);
  assert.equal(sql(`select scheduled_local_time from public.task_occurrences where task_id='${created.id}';`), '09:30:00');
  assert.notEqual(edit.task.revision, created.revision);
  assert.equal(mutate(g, 'task.update', { taskId: created.id, expectedRevision: created.revision, changes: { title: 'Stale' } }).data.reason, 'VERSION_CONFLICT');
  assert.equal(mutate(g, 'task.update', { taskId: created.id, expectedRevision: edit.task.revision, changes: { title: 'Final draft' } }).data.reason, 'NO_CHANGES');
  assert.equal(mutate(g, 'task.update', { taskId: created.id, expectedRevision: edit.task.revision, changes: { targetQuantity: 3 } }).data.reason, 'FIELD_CONFLICT');
  const toQty = mutate(g, 'task.update', { taskId: created.id, expectedRevision: edit.task.revision, changes: { completionMode: 'quantity', targetQuantity: 3, quantityUnit: 'km', description: null } }).data;
  assert.deepEqual([toQty.state, toQty.task.completionMode, toQty.task.targetQuantity, toQty.task.description, toQty.task.current.actualQuantity], ['committed', 'quantity', 3, null, 0]);
  assert.equal(mutate(g, 'task.update', { taskId: created.id, expectedRevision: '1', changes: {} }).error.code, 'INVALID_FIELD');
  // Mode cannot change once history exists (canonical 048 rule).
  const daily = createTask(g, { title: 'Daily', completionMode: 'binary' }, { kind: 'daily' }).task;
  const done = mutate(g, 'task.progress', { taskId: daily.id, occurrenceId: daily.current.occurrenceId, progress: { action: 'complete' } }).data.task;
  assert.equal(mutate(g, 'task.update', { taskId: daily.id, expectedRevision: done.revision, changes: { completionMode: 'quantity' } }).data.reason, 'MODE_LOCKED');
  const weekly = createTask(g, { title: 'Weekly', completionMode: 'quantity' }, { kind: 'weekly_count', targetCount: 2 }).task;
  assert.equal(mutate(g, 'task.update', { taskId: weekly.id, expectedRevision: weekly.revision, changes: { targetQuantity: 5 } }).data.reason, 'FIELD_CONFLICT');
});

test('schedule changes move one-time dates in place and replace recurring versions', () => {
  const g = goal(); const day = today();
  const task = createTask(g, { title: 'Log', completionMode: 'quantity', targetQuantity: 5 }, { kind: 'once', dueDate: shift(day, 1) }).task;
  const logged = mutate(g, 'task.progress', { taskId: task.id, occurrenceId: task.current.occurrenceId, progress: { action: 'adjust', delta: 2 } }).data.task;
  const moved = mutate(g, 'task.schedule', { taskId: task.id, expectedRevision: logged.revision, schedule: { kind: 'once', dueDate: shift(day, 5) } }).data.task;
  assert.deepEqual([moved.schedule.dueDate, moved.current.occurrenceId, moved.current.actualQuantity], [shift(day, 5), task.current.occurrenceId, 2]);
  assert.equal(mutate(g, 'task.schedule', { taskId: task.id, expectedRevision: moved.revision, schedule: { kind: 'once', dueDate: shift(day, 5) } }).data.reason, 'NO_CHANGES');
  assert.equal(mutate(g, 'task.schedule', { taskId: task.id, expectedRevision: moved.revision, schedule: { kind: 'once', dueDate: shift(day, -2) } }).data.reason, 'DATE_IN_PAST');
  const daily = mutate(g, 'task.schedule', { taskId: task.id, expectedRevision: moved.revision, schedule: { kind: 'daily' } }).data.task;
  assert.deepEqual([daily.schedule.kind, daily.schedule.dueDate, daily.current.state, daily.current.actualQuantity], ['daily', undefined, 'pending', 0]);
  assert.equal(sql(`select status from public.task_occurrences where id='${task.current.occurrenceId}';`), 'cancelled');
  const weekly = mutate(g, 'task.schedule', { taskId: task.id, expectedRevision: daily.revision, schedule: { kind: 'weekly', weekdays: [7, 1] } }).data.task;
  assert.deepEqual([weekly.schedule.kind, weekly.schedule.weekdays], ['weekly', [1, 7]]);
  assert.equal(count(`public.task_schedules where task_id='${task.id}' and is_active`), 1);
  assert.equal(count(`public.task_schedules where task_id='${task.id}'`), 2);
  const once = mutate(g, 'task.schedule', { taskId: task.id, expectedRevision: weekly.revision, schedule: { kind: 'once', dueDate: null } }).data.task;
  assert.deepEqual([once.schedule, once.current.state], [{ kind: 'once', dueDate: null }, 'pending']);
  assert.equal(mutate(g, 'task.schedule', { taskId: task.id, expectedRevision: once.revision, schedule: { kind: 'weekly_count', targetCount: 3 } }).data.reason, 'SCHEDULE_UNSUPPORTED');
  const counter = createTask(g, { title: 'Swim', completionMode: 'quantity' }, { kind: 'weekly_count', targetCount: 2 }).task;
  assert.equal(mutate(g, 'task.schedule', { taskId: counter.id, expectedRevision: counter.revision, schedule: { kind: 'daily' } }).data.reason, 'SCHEDULE_UNSUPPORTED');
});

test('progress writes apply once per identity and only to the current occurrence', () => {
  const g = goal(); const day = today();
  const daily = createTask(g, { title: 'Stretch', completionMode: 'binary' }, { kind: 'daily' }).task;
  const operationId = id();
  const complete = { taskId: daily.id, occurrenceId: daily.current.occurrenceId, progress: { action: 'complete' } };
  const done = mutate(g, 'task.progress', complete, owner, operationId).data;
  assert.deepEqual([done.state, done.task.current.state], ['committed', 'completed']);
  assert.deepEqual(mutate(g, 'task.progress', complete, owner, operationId).data, done);
  assert.equal(mutate(g, 'task.progress', complete).data.reason, 'NO_CHANGES');
  const reopened = mutate(g, 'task.progress', { ...complete, progress: { action: 'reopen' } }).data.task;
  assert.equal(reopened.current.state, 'pending');
  assert.equal(mutate(g, 'task.progress', { ...complete, progress: { action: 'adjust', delta: 1 } }).data.reason, 'PROGRESS_INVALID');
  // Yesterday's occurrence exists but is not the current period.
  const yesterday = sql(`insert into public.task_occurrences(user_id,task_id,schedule_id,occurrence_key,scheduled_local_date,status,source)
    select '${owner}',task_id,schedule_id,'manual-y',scheduled_local_date-1,'missed','schedule' from public.task_occurrences where id='${daily.current.occurrenceId}' returning id;`);
  assert.equal(mutate(g, 'task.progress', { ...complete, occurrenceId: yesterday }).data.reason, 'OCCURRENCE_STALE');
  assert.equal(mutate(g, 'task.progress', { ...complete, occurrenceId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }).data.reason, 'OCCURRENCE_STALE');

  const counter = createTask(g, { title: 'Pages', completionMode: 'quantity', targetQuantity: 3, quantityUnit: 'pages' }, { kind: 'daily' }).task;
  const step = { taskId: counter.id, occurrenceId: counter.current.occurrenceId, progress: { action: 'adjust', delta: 2 } };
  const stepId = id();
  assert.equal(mutate(g, 'task.progress', step, owner, stepId).data.task.current.actualQuantity, 2);
  assert.equal(mutate(g, 'task.progress', step, owner, stepId).data.task.current.actualQuantity, 2, 'a repeated identity never double-counts');
  const reached = mutate(g, 'task.progress', { ...step, progress: { action: 'adjust', delta: 1 } }).data.task;
  assert.deepEqual([reached.current.actualQuantity, reached.current.state], [3, 'completed']);
  assert.equal(mutate(g, 'task.progress', { ...step, progress: { action: 'adjust', delta: -5 } }).data.reason, 'PROGRESS_INVALID');
  assert.equal(mutate(g, 'task.progress', { ...step, progress: { action: 'set', quantity: 3 } }).data.reason, 'NO_CHANGES');
  const lowered = mutate(g, 'task.progress', { ...step, progress: { action: 'set', quantity: 1 } }).data.task;
  assert.deepEqual([lowered.current.actualQuantity, lowered.current.state], [1, 'pending']);
  assert.equal(mutate(g, 'task.progress', { ...step, progress: { action: 'complete' } }).data.reason, 'PROGRESS_INVALID');
  assert.equal(mutate(g, 'task.progress', { ...step, progress: { action: 'adjust', delta: 0 } }).error.code, 'INVALID_FIELD');

  const todo = createTask(g, { title: 'Buy shoes', completionMode: 'binary' }).task;
  const closed = mutate(g, 'task.progress', { taskId: todo.id, occurrenceId: todo.current.occurrenceId, progress: { action: 'complete' } }).data.task;
  assert.deepEqual([closed.status, closed.current.state], ['complete', 'completed']);
  assert.equal(mutate(g, 'task.update', { taskId: todo.id, expectedRevision: closed.revision, changes: { title: 'x' } }).data.reason, 'TASK_NOT_ACTIVE');
  const open = mutate(g, 'task.progress', { taskId: todo.id, occurrenceId: todo.current.occurrenceId, progress: { action: 'reopen' } }).data.task;
  assert.deepEqual([open.status, open.current.state], ['active', 'pending']);
  assert.equal(count(`public.task_occurrences where task_id='${todo.id}' and status='completed'`), 0);
  void day;
});

test('archive hides the Task, preserves history and ends further writes', () => {
  const g = goal();
  const daily = createTask(g, { title: 'Stretch', completionMode: 'binary' }, { kind: 'daily' }).task;
  mutate(g, 'task.progress', { taskId: daily.id, occurrenceId: daily.current.occurrenceId, progress: { action: 'complete' } });
  const archived = mutate(g, 'task.archive', { taskId: daily.id }).data;
  assert.deepEqual([archived.state, archived.task.status], ['committed', 'archived']);
  assert.deepEqual(work('tasks', { goalId: g }).data.items, []);
  assert.equal(count(`public.task_occurrences where task_id='${daily.id}' and status='completed'`), 1);
  assert.equal(count(`public.task_schedules where task_id='${daily.id}' and is_active`), 0);
  const again = mutate(g, 'task.archive', { taskId: daily.id }).data;
  assert.deepEqual([again.reason, again.task], ['TASK_UNAVAILABLE', null]);
  const todo = createTask(g, { title: 'Once', completionMode: 'binary' }).task;
  mutate(g, 'task.progress', { taskId: todo.id, occurrenceId: todo.current.occurrenceId, progress: { action: 'complete' } });
  assert.equal(mutate(g, 'task.archive', { taskId: todo.id }).data.reason, 'TASK_NOT_ACTIVE');
});

test('owners are isolated: foreign Goals, Tasks and Milestones are non-commits that reveal nothing', () => {
  const g = goal(); const mine = goal(other);
  const task = createTask(g, { title: 'Private', completionMode: 'binary' }, { kind: 'daily' }).task;
  const milestone = mutate(g, 'milestone.create', { fields: { title: 'Private milestone' } }).data.milestone;
  const foreign = mutate(g, 'task.archive', { taskId: task.id }, other).data;
  assert.deepEqual([foreign.state, foreign.reason, foreign.goalId, foreign.task], ['not_committed', 'GOAL_UNAVAILABLE', null, null]);
  // Pointing an owned Goal at someone else's child never reaches it.
  const cross = mutate(mine, 'task.progress', { taskId: task.id, occurrenceId: task.current.occurrenceId, progress: { action: 'complete' } }, other).data;
  assert.deepEqual([cross.reason, cross.task], ['TASK_UNAVAILABLE', null]);
  const crossMilestone = mutate(mine, 'milestone.complete', { milestoneId: milestone.id }, other).data;
  assert.deepEqual([crossMilestone.reason, crossMilestone.milestone], ['MILESTONE_UNAVAILABLE', null]);
  assert.equal(mutate(mine, 'milestone.create', { parentId: milestone.id, fields: { title: 'Sneaky' } }, other).data.reason, 'PARENT_INVALID');
  assert.equal(sql(`select status from public.task_occurrences where id='${task.current.occurrenceId}';`), 'pending');
  assert.equal(count(`public.milestones where completed_at is not null and id='${milestone.id}'`), 0);
  // Operation identities are per owner: the same ID from another owner is a separate operation.
  const shared = id();
  mutate(g, 'task.create', { fields: { title: 'Mine', completionMode: 'binary' }, schedule: { kind: 'daily' } }, owner, shared);
  assert.equal(mutate(mine, 'task.create', { fields: { title: 'Theirs', completionMode: 'binary' }, schedule: { kind: 'daily' } }, other, shared).data.state, 'committed');
  // Raw writes stay closed to clients.
  assert.throws(() => sql(`${as(owner)}insert into public.tasks(user_id,goal_id,title,completion_mode) values('${owner}','${g}','bypass','binary');`));
  assert.throws(() => sql(`${as(owner)}insert into goal_private.operation_ledger(owner_id,operation_id,seq,protocol,state,reason,recorded_at,terminal_at) values('${owner}','${id()}',999,'goal.work','not_committed','x',now(),now());`));
});

test('inactive Goals stay readable but reject every child write', () => {
  const g = goal();
  const task = createTask(g, { title: 'Stretch', completionMode: 'binary' }, { kind: 'daily' }).task;
  const milestone = mutate(g, 'milestone.create', { fields: { title: 'Ten km' } }).data.milestone;
  sql(`update public.goals set status='complete' where id='${g}';`);
  assert.equal(work('tasks', { goalId: g }).data.items.length, 1);
  assert.equal(work('milestones', { goalId: g }).data.items.length, 1);
  for (const [op, extra] of [
    ['task.create', { fields: { title: 'x', completionMode: 'binary' }, schedule: { kind: 'daily' } }],
    ['task.update', { taskId: task.id, expectedRevision: task.revision, changes: { title: 'y' } }],
    ['task.progress', { taskId: task.id, occurrenceId: task.current.occurrenceId, progress: { action: 'complete' } }],
    ['task.archive', { taskId: task.id }],
    ['milestone.create', { fields: { title: 'x' } }],
    ['milestone.complete', { milestoneId: milestone.id }],
  ]) assert.equal(mutate(g, op, extra).data.reason, 'GOAL_NOT_ACTIVE', op);
  // A Goal continued into a new phase is read-only too.
  const phased = goal();
  sql(`insert into public.goals(user_id,title,category,previous_goal_id) values('${owner}','Next','Work & Money','${phased}');`);
  assert.equal(mutate(phased, 'milestone.create', { fields: { title: 'x' } }).data.reason, 'GOAL_NOT_ACTIVE');
});

test('milestones keep one visible child level with explicit, one-way completion', () => {
  const g = goal(); const otherGoal = goal();
  const top = mutate(g, 'milestone.create', { fields: { title: 'Cook 3 new recipes', targetCount: 3, dueDate: '2026-12-01', description: 'Proof' } }).data;
  assert.equal(top.state, 'committed');
  assert.deepEqual([top.milestone.title, top.milestone.parentId, top.milestone.targetCount, top.milestone.dueDate, top.milestone.childCount, top.milestone.children],
    ['Cook 3 new recipes', null, 3, '2026-12-01', 0, []]);
  const child = mutate(g, 'milestone.create', { parentId: top.milestone.id, fields: { title: 'Ramen' } }).data.milestone;
  assert.deepEqual([child.id, child.childCount, child.children.map((c) => c.title)], [top.milestone.id, 1, ['Ramen']], 'child writes return the parent');
  assert.equal(mutate(g, 'milestone.create', { parentId: child.children[0].id, fields: { title: 'Too deep' } }).data.reason, 'PARENT_INVALID');
  assert.equal(mutate(otherGoal, 'milestone.create', { parentId: top.milestone.id, fields: { title: 'Wrong Goal' } }).data.reason, 'PARENT_INVALID');
  assert.equal(mutate(g, 'milestone.create', { parentId: top.milestone.id, fields: { title: 'Dated', dueDate: '2026-12-01' } }).error.code, 'INVALID_FIELD');
  assert.equal(mutate(g, 'milestone.create', { fields: { title: 'Bad target', targetCount: 0 } }).error.code, 'INVALID_FIELD');
  // Editing: revision-checked, subset preserving, children title-only.
  const edited = mutate(g, 'milestone.update', { milestoneId: top.milestone.id, expectedRevision: top.milestone.revision, changes: { title: 'Cook 3 recipes', dueDate: null } }).data.milestone;
  assert.deepEqual([edited.title, edited.dueDate, edited.description, edited.targetCount], ['Cook 3 recipes', null, 'Proof', 3]);
  assert.equal(mutate(g, 'milestone.update', { milestoneId: top.milestone.id, expectedRevision: top.milestone.revision, changes: { title: 'x' } }).data.reason, 'VERSION_CONFLICT');
  assert.equal(mutate(g, 'milestone.update', { milestoneId: top.milestone.id, expectedRevision: edited.revision, changes: { title: 'Cook 3 recipes' } }).data.reason, 'NO_CHANGES');
  const kid = edited.children[0];
  assert.equal(mutate(g, 'milestone.update', { milestoneId: kid.id, expectedRevision: kid.revision, changes: { targetCount: 2 } }).data.reason, 'FIELD_CONFLICT');
  assert.equal(mutate(g, 'milestone.update', { milestoneId: kid.id, expectedRevision: kid.revision, changes: { title: 'Tonkotsu ramen' } }).data.milestone.children[0].title, 'Tonkotsu ramen');
  // Completion: child first, parent sealed explicitly (early allowed), never reopened here.
  const afterChild = mutate(g, 'milestone.complete', { milestoneId: kid.id }).data.milestone;
  assert.deepEqual([afterChild.completedChildCount, afterChild.completedAt], [1, null]);
  const completeId = id();
  const sealed = mutate(g, 'milestone.complete', { milestoneId: top.milestone.id }, owner, completeId).data;
  assert.ok(sealed.milestone.completedAt);
  assert.deepEqual(mutate(g, 'milestone.complete', { milestoneId: top.milestone.id }, owner, completeId).data, sealed);
  assert.equal(mutate(g, 'milestone.complete', { milestoneId: top.milestone.id }).data.reason, 'MILESTONE_COMPLETE');
  assert.equal(mutate(g, 'milestone.update', { milestoneId: top.milestone.id, expectedRevision: sealed.milestone.revision, changes: { title: 'x' } }).data.reason, 'MILESTONE_COMPLETE');
  assert.equal(mutate(g, 'milestone.create', { parentId: top.milestone.id, fields: { title: 'Late' } }).data.reason, 'MILESTONE_COMPLETE');
  // Grandchildren written by other clients are never writable through this contract.
  const deep = sql(`insert into public.milestones(goal_id,user_id,title,parent_id) values('${g}','${owner}','Deep','${kid.id}') returning id;`);
  assert.equal(mutate(g, 'milestone.complete', { milestoneId: deep }).data.reason, 'MILESTONE_UNAVAILABLE');
});

test('milestone pages are bounded, top-level only and embed a bounded child list', () => {
  const g = goal();
  for (let i = 1; i <= 22; i++) mutate(g, 'milestone.create', { fields: { title: `M${i}` } });
  const first = work('milestones', { goalId: g }).data;
  assert.equal(first.items.length, 20); assert.ok(first.hasMore);
  const parent = first.items[0];
  for (let i = 1; i <= 20; i++) assert.equal(mutate(g, 'milestone.create', { parentId: parent.id, fields: { title: `Step ${i}` } }).data.state, 'committed');
  assert.equal(mutate(g, 'milestone.create', { parentId: parent.id, fields: { title: 'Step 21' } }).data.reason, 'LIMIT_REACHED');
  sql(`insert into public.milestones(goal_id,user_id,title,parent_id,sort_order) values('${g}','${owner}','Desktop step','${parent.id}',99);`);
  const reread = work('milestones', { goalId: g }).data.items[0];
  assert.deepEqual([reread.childCount, reread.children.length, reread.children[0].title, reread.children.at(-1).title], [21, 20, 'Step 1', 'Step 20']);
  const second = work('milestones', { goalId: g, cursor: first.nextCursor }).data;
  assert.deepEqual(second.items.map((x) => x.title), ['M21', 'M22']);
});

test('a failure inside the canonical Task engine leaves no Task, no receipt and a reusable identity', () => {
  const g = goal(); const operationId = id();
  const request = { fields: { title: 'Timezone', completionMode: 'binary' }, schedule: { kind: 'daily' } };
  // An unusable profile timezone makes the canonical schedule trigger raise mid-write.
  sql(`update public.profiles set timezone='Mars/Olympus' where id='${owner}';`);
  assert.throws(() => mutate(g, 'task.create', request, owner, operationId));
  assert.equal(count(`public.tasks where goal_id='${g}'`), 0);
  assert.equal(count(`goal_private.operation_ledger where operation_id='${operationId}'`), 0);
  sql(`update public.profiles set timezone='America/New_York' where id='${owner}';`);
  const retried = mutate(g, 'task.create', request, owner, operationId).data;
  assert.equal(retried.state, 'committed');
  assert.equal(count(`public.tasks where goal_id='${g}'`), 1);
});

test('shared contract fixtures round-trip through the real RPC', () => {
  const g = goal(); const day = today();
  const sub = (value, ids) => JSON.parse(JSON.stringify(value).replaceAll('<GOAL>', g).replaceAll('<TODAY+7>', shift(day, 7))
    .replaceAll('<TASK>', ids.task ?? '').replaceAll('<OCCURRENCE>', ids.occurrence ?? '').replaceAll('<REVISION>', ids.revision ?? '')
    .replaceAll('<MILESTONE>', ids.milestone ?? '').replaceAll('<MILESTONE_REVISION>', ids.milestoneRevision ?? ''));
  const ids = {};
  for (const example of fixtures.requests) {
    const result = work('mutate', { ...sub(example.body, ids), operationId: id() });
    assert.equal(result.data?.state, 'committed', `${example.name}: ${JSON.stringify(result)}`);
    if (result.data.task) Object.assign(ids, { task: result.data.task.id, occurrence: result.data.task.current?.occurrenceId, revision: result.data.task.revision });
    if (result.data.milestone) Object.assign(ids, { milestone: result.data.milestone.id, milestoneRevision: result.data.milestone.revision });
  }
  const tasks = work('tasks', { goalId: g }).data; const milestones = work('milestones', { goalId: g }).data;
  // Every fixture key exists in the real payload with the same JSON type (nullable fixture values excepted).
  const covered = (fixture, real, path) => {
    if (fixture === null || real === null) return;
    assert.equal(typeof real, typeof fixture, path);
    if (Array.isArray(fixture)) { if (fixture.length && real.length) covered(fixture[0], real[0], `${path}[0]`); return; }
    if (typeof fixture === 'object') {
      assert.deepEqual(Object.keys(real).sort(), Object.keys(fixture).sort(), path);
      for (const k of Object.keys(fixture)) covered(fixture[k], real[k], `${path}.${k}`);
    }
  };
  covered(fixtures.responses.taskPage, tasks, 'taskPage');
  covered(fixtures.responses.milestonePage, milestones, 'milestonePage');
  const committed = mutate(g, 'milestone.complete', { milestoneId: ids.milestone }).data;
  covered(fixtures.responses.mutationCommitted, committed, 'mutationCommitted');
  covered(fixtures.responses.mutationNotCommitted, mutate(g, 'milestone.complete', { milestoneId: ids.milestone }).data, 'mutationNotCommitted');
});

test('account deletion cascades work receipts', () => {
  sql(`delete from auth.users where id='${other}';`);
  assert.equal(count(`goal_private.operation_ledger where owner_id='${other}'`), 0);
});
