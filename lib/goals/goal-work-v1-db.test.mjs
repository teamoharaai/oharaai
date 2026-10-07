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
  // Steps take a title, description and date (081, desktop's steps and evidence notes); the counter target stays top-level.
  const dated = mutate(g, 'milestone.create', { parentId: top.milestone.id, fields: { title: 'Dated', description: 'Note', dueDate: '2026-12-01' } }).data.milestone;
  assert.deepEqual(dated.children.map((c) => [c.title, c.description, c.dueDate]), [['Ramen', null, null], ['Dated', 'Note', '2026-12-01']]);
  mutate(g, 'milestone.delete', { milestoneId: dated.children[1].id });
  assert.equal(mutate(g, 'milestone.create', { parentId: top.milestone.id, fields: { title: 'Counted', targetCount: 2 } }).error.code, 'INVALID_FIELD');
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
  // A completed Milestone still takes evidence (081, Justin 2026-09-29): a new step commits under it.
  assert.equal(mutate(g, 'milestone.create', { parentId: top.milestone.id, fields: { title: 'Late' } }).data.state, 'committed');
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
    .replaceAll('<PREVIOUS_MILESTONE>', ids.previousMilestone ?? '').replaceAll('<MILESTONE_REVISION>', ids.milestoneRevision ?? '')
    .replaceAll('<MILESTONE>', ids.milestone ?? '').replaceAll('<PHOTO_PATH>', ids.photoPath ?? ''));
  const ids = {};
  for (const example of fixtures.requests) {
    // The photo example needs an uploaded object at the Milestone's own path.
    if (example.name === 'milestone.update.photo') {
      ids.photoPath = `${owner}/${ids.milestone}/fixture.jpg`;
      sql(`insert into storage.objects(bucket_id,name) values('milestone-photos','${ids.photoPath}');`);
    }
    const result = work('mutate', { ...sub(example.body, ids), operationId: id() });
    assert.equal(result.data?.state, 'committed', `${example.name}: ${JSON.stringify(result)}`);
    if (result.data.task) Object.assign(ids, { task: result.data.task.id, occurrence: result.data.task.current?.occurrenceId, revision: result.data.task.revision });
    if (result.data.milestone) {
      if (result.data.milestone.id !== ids.milestone) ids.previousMilestone = ids.milestone;
      Object.assign(ids, { milestone: result.data.milestone.id, milestoneRevision: result.data.milestone.revision });
    }
    // A deleted top-level Milestone projects nothing; carry on with the one before it.
    if (example.name === 'milestone.delete') Object.assign(ids, { milestone: ids.previousMilestone });
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

test('milestone delete removes the Milestone with its steps and events, once per identity (081)', () => {
  const g = goal();
  const top = mutate(g, 'milestone.create', { fields: { title: 'Half marathon' } }).data.milestone;
  const withStep = mutate(g, 'milestone.create', { parentId: top.id, fields: { title: 'Ten km' } }).data.milestone;
  const step = withStep.children[0];
  mutate(g, 'milestone.complete', { milestoneId: step.id });
  mutate(g, 'milestone.complete', { milestoneId: top.id });
  assert.equal(count(`goal_private.goal_events where goal_id='${g}' and kind='milestone_completed'`), 2);
  // Deleting a step projects the parent; completed Milestones can be deleted (desktop parity).
  const stepGone = mutate(g, 'milestone.delete', { milestoneId: step.id }).data;
  assert.deepEqual([stepGone.state, stepGone.milestone.id, stepGone.milestone.childCount], ['committed', top.id, 0]);
  mutate(g, 'milestone.create', { parentId: top.id, fields: { title: 'Five km' } });
  const operationId = id();
  const gone = mutate(g, 'milestone.delete', { milestoneId: top.id }, owner, operationId).data;
  assert.deepEqual([gone.state, gone.reason, gone.milestone, gone.operationType], ['committed', null, null, 'milestone.delete']);
  assert.deepEqual(mutate(g, 'milestone.delete', { milestoneId: top.id }, owner, operationId).data, gone, 'a replay returns the recorded outcome');
  assert.equal(count(`public.milestones where goal_id='${g}'`), 0, 'steps cascade');
  assert.equal(count(`goal_private.goal_events where goal_id='${g}'`), 0, 'their completion events go too (080)');
  assert.equal(mutate(g, 'milestone.delete', { milestoneId: top.id }).data.reason, 'MILESTONE_UNAVAILABLE');
  assert.equal(mutate(g, 'milestone.delete', { milestoneId: top.id, expectedRevision: '1' }).error.code, 'INVALID_FIELD');
  // Foreign and too-deep Milestones are never reachable.
  const mine = mutate(g, 'milestone.create', { fields: { title: 'Mine' } }).data.milestone;
  assert.equal(mutate(goal(other), 'milestone.delete', { milestoneId: mine.id }, other).data.reason, 'MILESTONE_UNAVAILABLE');
  const kid = mutate(g, 'milestone.create', { parentId: mine.id, fields: { title: 'Kid' } }).data.milestone.children[0];
  const deep = sql(`insert into public.milestones(goal_id,user_id,title,parent_id) values('${g}','${owner}','Deep','${kid.id}') returning id;`);
  assert.equal(mutate(g, 'milestone.delete', { milestoneId: deep }).data.reason, 'MILESTONE_UNAVAILABLE');
  sql(`update public.goals set status='archived' where id='${g}';`);
  assert.equal(mutate(g, 'milestone.delete', { milestoneId: mine.id }).data.reason, 'GOAL_NOT_ACTIVE');
});

test('milestone reorder takes the exact current siblings and refuses a stale list (081)', () => {
  const g = goal();
  const [a, b, c] = ['A', 'B', 'C'].map((title) => mutate(g, 'milestone.create', { fields: { title } }).data.milestone);
  const order = () => work('milestones', { goalId: g }).data.items.map((x) => x.title).join('');
  const operationId = id();
  const moved = mutate(g, 'milestone.reorder', { orderedIds: [c.id, a.id, b.id] }, owner, operationId).data;
  assert.deepEqual([moved.state, moved.milestone.id, order()], ['committed', c.id, 'CAB']);
  assert.deepEqual(mutate(g, 'milestone.reorder', { orderedIds: [c.id, a.id, b.id] }, owner, operationId).data, moved);
  assert.equal(mutate(g, 'milestone.reorder', { orderedIds: [c.id, a.id, b.id] }).data.reason, 'NO_CHANGES');
  for (const stale of [[a.id, b.id], [a.id, b.id, c.id, id()]])
    assert.equal(mutate(g, 'milestone.reorder', { orderedIds: stale }).data.reason, 'MILESTONE_ORDER_STALE', JSON.stringify(stale));
  // Malformed lists are refused before identity: empty, duplicated, non-UUID, non-string, over 100.
  for (const bad of [[], [a.id, a.id, b.id], ['nope'], [1], Array.from({ length: 101 }, id)])
    assert.equal(mutate(g, 'milestone.reorder', { orderedIds: bad }).error.code, 'INVALID_FIELD', JSON.stringify(bad).slice(0, 40));
  // Steps reorder under their parent and project it with the new order.
  const s1 = mutate(g, 'milestone.create', { parentId: a.id, fields: { title: 'one' } }).data.milestone.children[0];
  const s2 = mutate(g, 'milestone.create', { parentId: a.id, fields: { title: 'two' } }).data.milestone.children[1];
  const steps = mutate(g, 'milestone.reorder', { parentId: a.id, orderedIds: [s2.id, s1.id] }).data.milestone;
  assert.deepEqual([steps.id, steps.children.map((x) => x.title)], [a.id, ['two', 'one']]);
  assert.equal(mutate(g, 'milestone.reorder', { parentId: s1.id, orderedIds: [s1.id] }).data.reason, 'PARENT_INVALID');
  assert.equal(mutate(g, 'milestone.reorder', { parentId: a.id, orderedIds: [s2.id, s1.id] }, other).data.reason, 'GOAL_UNAVAILABLE');
  assert.equal(order(), 'CAB', 'top level untouched by a step reorder');
});

test('photo paths must be the owner\'s own upload for this Milestone; completed Milestones still take evidence (081)', () => {
  const g = goal();
  const m = mutate(g, 'milestone.create', { fields: { title: 'Finish a 10 km race', isAiSuggested: true } }).data.milestone;
  assert.deepEqual([m.isAiSuggested, m.photoPath], [true, null]);
  const path = `${owner}/${m.id}/abc-123.jpg`;
  const update = (changes, revision) => mutate(g, 'milestone.update', { milestoneId: m.id, expectedRevision: revision, changes }).data;
  assert.equal(update({ photoPath: path }, m.revision).reason, 'PHOTO_NOT_FOUND', 'not uploaded yet');
  sql(`insert into storage.objects(bucket_id,name) values('milestone-photos','${path}'),('note-images','${owner}/${m.id}/other.jpg');`);
  assert.equal(update({ photoPath: `${owner}/${m.id}/other.jpg` }, m.revision).reason, 'PHOTO_NOT_FOUND', 'another bucket does not count');
  assert.equal(update({ photoPath: `${other}/${m.id}/abc-123.jpg` }, m.revision).reason, 'PHOTO_PATH_INVALID', 'another owner\'s folder');
  assert.equal(update({ photoPath: `${owner}/${id()}/abc-123.jpg` }, m.revision).reason, 'PHOTO_PATH_INVALID', 'another Milestone\'s folder');
  for (const bad of ['https://example.com/a.jpg', `${owner}/${m.id}/../x.jpg`, `${owner}/${m.id}/a b.jpg`, `${owner}/${m.id}/noext`, 7])
    assert.equal(mutate(g, 'milestone.update', { milestoneId: m.id, expectedRevision: m.revision, changes: { photoPath: bad } }).error.code, 'INVALID_FIELD', String(bad));
  const withPhoto = update({ photoPath: path }, m.revision);
  assert.deepEqual([withPhoto.state, withPhoto.milestone.photoPath], ['committed', path]);
  assert.equal(update({ photoPath: path }, withPhoto.milestone.revision).reason, 'NO_CHANGES');
  assert.equal(mutate(g, 'milestone.create', { fields: { title: 'x', photoPath: path } }).error.code, 'INVALID_FIELD', 'photo is edit-only');
  assert.equal(mutate(g, 'milestone.update', { milestoneId: m.id, expectedRevision: m.revision, changes: { isAiSuggested: false } }).error.code, 'INVALID_FIELD', 'AI flag is create-only');
  // Completed: photo changes and steps are still accepted; text is sealed (Justin 2026-09-29, IOSQ-007).
  const sealed = mutate(g, 'milestone.complete', { milestoneId: m.id }).data.milestone;
  const cleared = update({ photoPath: null }, sealed.revision);
  assert.deepEqual([cleared.state, cleared.milestone.photoPath], ['committed', null]);
  assert.equal(update({ title: 'Renamed' }, cleared.milestone.revision).reason, 'MILESTONE_COMPLETE');
  assert.equal(update({ title: 'Renamed', photoPath: path }, cleared.milestone.revision).reason, 'MILESTONE_COMPLETE', 'a mixed edit is still an edit');
  const evidence = mutate(g, 'milestone.create', { parentId: m.id, fields: { title: 'Medal', description: 'Proof' } }).data.milestone.children[0];
  const stepPath = `${owner}/${evidence.id}/medal.png`;
  sql(`insert into storage.objects(bucket_id,name) values('milestone-photos','${stepPath}');`);
  assert.equal(mutate(g, 'milestone.update', { milestoneId: evidence.id, expectedRevision: evidence.revision, changes: { photoPath: stepPath } }).data.milestone.children[0].photoPath, stepPath);
  assert.equal(mutate(g, 'milestone.complete', { milestoneId: m.id }).data.reason, 'MILESTONE_COMPLETE', 'never re-completed');
});

test('the ledger admits the two new work types and nothing else (081)', () => {
  const g = goal();
  assert.throws(() => sql(`insert into goal_private.operation_ledger(owner_id,operation_id,seq,protocol,operation_type,goal_id,digest,state,reason,recorded_at,terminal_at)
    values('${owner}','${id()}',99999,'goal.work','milestone.move','${g}',repeat('a',64),'not_committed','x',now(),now());`), /operation_ledger_goal_work/);
  assert.equal(count(`goal_private.operation_ledger where protocol='goal.work' and operation_type in ('milestone.delete','milestone.reorder')`) > 0, true);
  assert.equal(work('mutate', { operationId: id(), operationType: 'milestone.move', contractVersion: 1, goalId: g }).error.code, 'UNSUPPORTED_CONTRACT');
});

test('reconcile_my_tasks_v1 equals one reconcile_task_occurrences_v1 per Task, in one call (081)', () => {
  const g = goal(); const day = today(); const inactive = goal(owner, 'complete');
  // Each Task has a schedule that started days ago and was never reconciled, in every schedule kind.
  const seed = (goalId, title, kind, extra = '') => {
    const t = sql(`insert into public.tasks(user_id,goal_id,title,completion_mode) values('${owner}','${goalId}','${title}','binary') returning id;`);
    sql(`insert into public.task_schedules(user_id,task_id,version,recurrence_kind,start_date,timezone${extra ? ',' + extra.split('=')[0] : ''})
      values('${owner}','${t}',1,'${kind}','${day}'::date-9,'America/New_York'${extra ? ',' + extra.split('=')[1] : ''});`);
    return t;
  };
  const make = () => [seed(g, 'daily', 'daily'), seed(g, 'weekdays', 'weekly', "weekdays='{1,3,5}'"), seed(g, 'count', 'weekly_count', 'target_count=3'),
    seed(g, 'every2', 'daily', 'interval_count=2')];
  const perTask = make(); const batch = make(); const idle = seed(inactive, 'inactive', 'daily');
  for (const t of perTask) sql(`${as(owner)}select public.reconcile_task_occurrences_v1('${t}');`);
  sql(`${as(owner)}select public.reconcile_my_tasks_v1();`);
  const shape = (t) => sql(`select string_agg(scheduled_local_date - '${day}'::date || ':' || status || ':' || split_part(occurrence_key, ':', 4), ',' order by scheduled_local_date)
    from public.task_occurrences where task_id='${t}';`);
  for (let i = 0; i < perTask.length; i++) assert.equal(shape(batch[i]), shape(perTask[i]), `kind ${i}`);
  assert.ok(shape(batch[0]).includes('28:pending'), 'materialized through today + 28, like the per-Task default');
  assert.equal(count(`public.task_occurrences where task_id='${idle}'`), 0, 'inactive Goals are skipped, not an error');
  // Idempotent; Goal-scoped; foreign callers reconcile only their own; signed-out callers are refused.
  const before = count('public.task_occurrences');
  sql(`${as(owner)}select public.reconcile_my_tasks_v1(array['${g}'::uuid]);`);
  sql(`${as(other)}select public.reconcile_my_tasks_v1(array['${g}'::uuid]);`);
  assert.equal(count('public.task_occurrences'), before);
  const scoped = seed(g, 'scoped', 'daily'); const elsewhere = seed(goal(), 'elsewhere', 'daily');
  sql(`${as(owner)}select public.reconcile_my_tasks_v1(array['${g}'::uuid]);`);
  assert.deepEqual([count(`public.task_occurrences where task_id='${scoped}'`) > 0, count(`public.task_occurrences where task_id='${elsewhere}'`)], [true, 0]);
  assert.throws(() => sql(`set role authenticated;select public.reconcile_my_tasks_v1();`), /Unauthorized/);
  assert.throws(() => sql(`set role anon;select public.reconcile_my_tasks_v1();`), /permission denied/);
  // goal_work_v1's own page reconcile still stops at today (horizon 0).
  const page = seed(g, 'page', 'daily');
  work('tasks', { goalId: g });
  assert.equal(sql(`select max(scheduled_local_date) - '${day}'::date from public.task_occurrences where task_id='${page}';`), '0');
});

test('milestone.create leaves the same row shape as lib/db/goals.ts\'s direct insert (B7/B8)', () => {
  // The two write paths desktop can take for a Goal's initial Milestones: today's direct RLS insert
  // (lib/db/goals.ts's milestoneInserts), and goal_work_v1's milestone.create behind milestone_work_v1
  // (lib/db/goals.ts's cut-over branch). Same input, diffed row state, proving the switch changes
  // nothing about what lands in the table.
  const direct = goal(); const viaWork = goal();
  const rows = [
    { title: '  Write outline  ', description: ' First draft ', dueDate: shift(today(), 5) },
    { title: 'Edit', description: null, dueDate: null },
  ];
  const directRows = rows.map((row, index) => ({
    title: row.title.trim(), description: row.description?.trim() ?? null, due_date: row.dueDate, sort_order: index, is_ai_suggested: false,
  }));
  sql(`insert into public.milestones(goal_id,user_id,title,description,due_date,sort_order,is_ai_suggested)
    select '${direct}','${owner}',title,description,due_date::date,sort_order,is_ai_suggested
    from jsonb_to_recordset(${literal(directRows)}) as x(title text, description text, due_date text, sort_order int, is_ai_suggested boolean);`);
  for (const [index, row] of rows.entries()) {
    const result = mutate(viaWork, 'milestone.create', {
      fields: { title: row.title.trim(), description: row.description?.trim() ?? null, dueDate: row.dueDate, isAiSuggested: false },
    }, owner, id()).data;
    assert.equal(result.state, 'committed', `row ${index}`);
  }
  const shape = (goalId) => sql(`select title, coalesce(description,'') as description, coalesce(due_date::text,'') as due_date, sort_order, is_ai_suggested
    from public.milestones where goal_id='${goalId}' order by sort_order;`);
  assert.equal(shape(viaWork), shape(direct));
});

test('my_client_cutovers_v1 lists only the caller\'s own allowlisted features (089)', () => {
  const cutovers = (who = owner) => JSON.parse(sql(`${as(who)}select public.my_client_cutovers_v1();`));
  assert.deepEqual(cutovers().data.features, []);
  sql(`insert into goal_private.client_cutover(owner_id,feature) values('${owner}','milestone_work_v1');`);
  assert.deepEqual(cutovers().data.features, ['milestone_work_v1']);
  assert.deepEqual(cutovers(other).data.features, [], 'another account is not allowlisted just because this one is');
  sql(`insert into goal_private.client_cutover(owner_id,feature) values('${owner}','activity_window_v1');`);
  assert.deepEqual(cutovers().data.features, ['activity_window_v1', 'milestone_work_v1'], 'sorted');
  assert.throws(() => sql(`insert into goal_private.client_cutover(owner_id,feature) values('${owner}','bogus_feature');`), /violates check constraint/);
  assert.equal(JSON.parse(sql('set role authenticated;select public.my_client_cutovers_v1();')).error.code, 'UNAUTHORIZED');
  assert.throws(() => sql('set role anon;select public.my_client_cutovers_v1();'), /permission denied/);
  sql(`delete from goal_private.client_cutover where owner_id='${owner}';`); // leave the table clean for later tests
});

test('account deletion cascades work receipts and client cut-over flags', () => {
  sql(`insert into goal_private.client_cutover(owner_id,feature) values('${other}','milestone_work_v1');`);
  sql(`delete from auth.users where id='${other}';`);
  assert.equal(count(`goal_private.operation_ledger where owner_id='${other}'`), 0);
  assert.equal(count(`goal_private.client_cutover where owner_id='${other}'`), 0);
});
