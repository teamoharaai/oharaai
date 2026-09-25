// Migration 075 integration: one scheduled occurrence per Task per day across schedule versions.
// Setup (disposable cluster): manual-v1-db-scaffold.sql → goal-work-v1-db-scaffold.sql → 048/056/057/059/063/064
// → 072 → 073 → 074. This suite reproduces the pre-075 defect, then applies 075 itself so its repair and
// its stop-on-ambiguous-history guard are exercised against real rows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const socket = process.env.GOAL_TEST_SOCKET;
if (!socket?.startsWith('/tmp/ohara-goal-')) throw Error('Explicit disposable GOAL_TEST_SOCKET required');
const psql = process.env.GOAL_TEST_PSQL ?? '/opt/homebrew/opt/postgresql@16/bin/psql';
const base = ['-h', socket, '-p', process.env.GOAL_TEST_PORT ?? '55441', '-U', 'postgres', '-d', process.env.GOAL_TEST_DB ?? 'work', '-v', 'ON_ERROR_STOP=1'];
const migration = new URL('../../supabase/migrations/075_task_schedule_period_continuity.sql', import.meta.url).pathname;
const owner = '11111111-1111-4111-8111-111111111111';
const sql = (s) => execFileSync(psql, [...base, '-Atq'], { input: s, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const apply075 = () => execFileSync(psql, [...base, '-q', '-f', decodeURIComponent(migration)], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const literal = (x) => "'" + JSON.stringify(x).replaceAll("'", "''") + "'::jsonb";
const as = `set role authenticated;set request.jwt.claim.sub='${owner}';`;
let n = 0; const id = () => `dddddddd-dddd-4ddd-8ddd-${String(++n).padStart(12, '0')}`;
const work = (action, p) => JSON.parse(sql(`${as}select public.goal_work_v1('${action}',${literal(p)});`));
const mutate = (goalId, operationType, extra) => work('mutate', { operationId: id(), operationType, contractVersion: 1, goalId, ...extra }).data;
const today = sql(`select to_char((now() at time zone 'America/New_York')::date,'YYYY-MM-DD');`);
const isoToday = Number(sql(`select extract(isodow from '${today}'::date);`));
const otherDay = (isoToday % 7) + 1;
const goal = () => sql(`insert into public.goals(user_id,title,category) values('${owner}','Goal','Work & Money') returning id;`);
const daily = (g, title, fields = {}) => mutate(g, 'task.create', { fields: { title, completionMode: 'binary', ...fields }, schedule: { kind: 'daily' } }).task;
const replace = (taskId, kind, weekdays = []) =>
  sql(`${as}select public.replace_task_schedule_v1('${taskId}','${kind}',1,'{${weekdays.join(',')}}'::smallint[],null,null,null,null,null,'${id()}');`);
const live = (taskId, day = today) => sql(`select string_agg(status,',' order by status) from public.task_occurrences
  where task_id='${taskId}' and scheduled_local_date='${day}' and source='schedule' and status<>'cancelled';`);
const complete = (g, task) => mutate(g, 'task.progress', { taskId: task.id, occurrenceId: task.current.occurrenceId, progress: { action: 'complete' } }).task;

sql(`insert into auth.users values('${owner}') on conflict do nothing;
insert into public.profiles(id,timezone) values('${owner}','America/New_York') on conflict do nothing;`);

const g = goal();
let repaired, ambiguous;

test('before 075: replacing a schedule on a completed day leaves a second live occurrence', () => {
  repaired = complete(g, daily(g, 'Stretch'));
  replace(repaired.id, 'weekly', [isoToday]);
  assert.equal(live(repaired.id), 'completed,pending');
  // Two terminal rows on one day: history 075 must not silently choose between.
  ambiguous = complete(g, daily(g, 'Ambiguous'));
  replace(ambiguous.id, 'daily');
  const second = sql(`select id from public.task_occurrences where task_id='${ambiguous.id}' and scheduled_local_date='${today}' and status='pending';`);
  sql(`update public.task_occurrences set status='completed', completed_at=now() where id='${second}';`);
  assert.equal(live(ambiguous.id), 'completed,completed');
});

test('075 refuses to apply over ambiguous history, then repairs redundant open rows', () => {
  assert.throws(apply075, /TASK_OCCURRENCE_DAY_CONFLICTS: 1 Task-days/);
  assert.equal(live(repaired.id), 'completed,pending', 'a refused migration changes nothing');
  // An operator resolves the ambiguous day explicitly, then 075 applies.
  sql(`update public.task_occurrences set status='cancelled', completed_at=null where id=(select id from public.task_occurrences
    where task_id='${ambiguous.id}' and scheduled_local_date='${today}' and status='completed' order by created_at desc limit 1);`);
  apply075();
  assert.equal(live(repaired.id), 'completed');
  assert.equal(sql(`select count(*) from pg_indexes where indexname='task_occurrences_one_scheduled_per_day';`), '1');
});

test('a completed day continues onto the new version through the desktop RPC', () => {
  const task = complete(g, daily(g, 'Walk'));
  const scheduleId = replace(task.id, 'weekly', [isoToday, otherDay]);
  assert.equal(live(task.id), 'completed');
  assert.equal(sql(`select schedule_id from public.task_occurrences where task_id='${task.id}' and scheduled_local_date='${today}' and status='completed';`), scheduleId);
  assert.equal(sql(`select occurrence_key from public.task_occurrences where task_id='${task.id}' and status='completed';`),
    `schedule:${scheduleId}:v2:${today}:anytime`);
  const page = work('tasks', { goalId: g }).data.items.find((x) => x.id === task.id);
  assert.deepEqual([page.schedule.kind, page.current.state], ['weekly', 'completed']);
});

test('the native schedule change keeps today done and never double-counts Activity', () => {
  const task = complete(g, daily(g, 'Read'));
  const moved = mutate(g, 'task.schedule', { taskId: task.id, expectedRevision: work('tasks', { goalId: g }).data.items.find((x) => x.id === task.id).revision,
    schedule: { kind: 'weekly', weekdays: [isoToday] } });
  assert.equal(moved.state, 'committed');
  assert.deepEqual([moved.task.current.state, moved.task.current.occurrenceId], ['completed', task.current.occurrenceId]);
  assert.equal(sql(`select count(*) from public.task_occurrences where task_id='${task.id}' and status='completed';`), '1');
});

test('a day the new version skips keeps its history but opens nothing new', () => {
  const task = complete(g, daily(g, 'Swim'));
  replace(task.id, 'weekly', [otherDay]);
  assert.equal(live(task.id), 'completed');
  const page = work('tasks', { goalId: g }).data.items.find((x) => x.id === task.id);
  assert.equal(page.current.state, 'not_scheduled');
  // Future open rows the new version doesn't schedule are cancelled; the ones it does are re-keyed.
  const active = sql(`select id from public.task_schedules where task_id='${task.id}' and is_active;`);
  assert.equal(sql(`select count(*) from public.task_occurrences where task_id='${task.id}' and status in ('pending','missed')
    and scheduled_local_date >= '${today}' and schedule_id <> '${active}';`), '0');
  assert.equal(sql(`select count(*) from public.task_occurrences where task_id='${task.id}' and status='pending'
    and schedule_id='${active}' and extract(isodow from scheduled_local_date) <> ${otherDay};`), '0');
});

test('partly logged quantity continues instead of resetting', () => {
  const task = daily(g, 'Pages', { completionMode: 'quantity', targetQuantity: 10, quantityUnit: 'pages' });
  mutate(g, 'task.progress', { taskId: task.id, occurrenceId: task.current.occurrenceId, progress: { action: 'adjust', delta: 4 } });
  replace(task.id, 'weekly', [isoToday]);
  assert.equal(sql(`select actual_quantity from public.task_occurrences where task_id='${task.id}' and scheduled_local_date='${today}' and status='pending';`), '4');
  assert.equal(live(task.id), 'pending');
});

test('the invariant holds for every writer and reconcilers skip occupied days', () => {
  const task = complete(g, daily(g, 'Guarded'));
  const schedule = sql(`select id from public.task_schedules where task_id='${task.id}' and is_active;`);
  assert.throws(() => sql(`insert into public.task_occurrences(user_id,task_id,schedule_id,occurrence_key,scheduled_local_date,status,source)
    values('${owner}','${task.id}','${schedule}','manual-dup','${today}','pending','schedule');`), /task_occurrences_one_scheduled_per_day/);
  // Legacy backfill rows are outside the invariant.
  sql(`insert into public.task_occurrences(user_id,task_id,schedule_id,occurrence_key,scheduled_local_date,status,source)
    values('${owner}','${task.id}','${schedule}','legacy-log','${today}','pending','legacy_tracker');`);
  assert.doesNotThrow(() => sql(`${as}select public.reconcile_task_occurrences_v1('${task.id}', '${today}'::date + 7);`));
  assert.doesNotThrow(() => work('tasks', { goalId: g }));
  assert.equal(live(task.id), 'completed');
});

test('replaying a replacement by idempotency key changes nothing', () => {
  const task = complete(g, daily(g, 'Replay'));
  const key = id();
  const call = `${as}select public.replace_task_schedule_v1('${task.id}','weekly',1,'{${isoToday}}'::smallint[],null,null,null,null,null,'${key}');`;
  const first = sql(call);
  const rows = sql(`select count(*) from public.task_occurrences where task_id='${task.id}';`);
  assert.equal(sql(call), first);
  assert.equal(sql(`select count(*) from public.task_occurrences where task_id='${task.id}';`), rows);
  assert.equal(sql(`select count(*) from public.task_schedules where task_id='${task.id}';`), '2');
});
