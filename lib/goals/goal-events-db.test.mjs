// Migration 080 integration: Goal events (TD-004), against an explicitly supplied disposable Unix-socket
// PostgreSQL cluster. Runs on the chain through 079: it seeds pre-080 rows through the paths desktop uses,
// applies 080 itself (proving the backfill), then checks every IOSB-004 counting rule through every write
// path. Run with `npm run test:goals:db`. Synthetic rows only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const socket = process.env.GOAL_TEST_SOCKET;
if (!socket?.startsWith('/tmp/ohara-goal-')) throw Error('Explicit disposable GOAL_TEST_SOCKET required');
const psql = process.env.GOAL_TEST_PSQL ?? '/opt/homebrew/opt/postgresql@17/bin/psql';
const args = ['-h', socket, '-p', process.env.GOAL_TEST_PORT ?? '55450', '-U', 'postgres', '-d', process.env.GOAL_TEST_DB ?? 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq'];
const migrations = process.env.CHAIN_MIGRATIONS_DIR ?? new URL('../../supabase/migrations', import.meta.url).pathname;
const owner = '80808080-0000-4080-8080-000000000001', other = '80808080-0000-4080-8080-000000000002';
const sql = (s) => execFileSync(psql, args, { input: s, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const literal = (x) => "'" + JSON.stringify(x).replaceAll("'", "''") + "'::jsonb";
const as = (who) => `set role authenticated;set request.jwt.claim.sub='${who}';`;
const rpc = (fn) => (action, p = {}, who = owner) => JSON.parse(sql(`${as(who)}select public.${fn}('${action}',${literal(p)});`));
const work = rpc('goal_work_v1'), card = rpc('goal_card_v1');
let n = 0; const id = () => `80808080-dddd-4ddd-8ddd-${String(++n).padStart(12, '0')}`;
const goal = (who = owner, extra = '') => sql(`insert into public.goals(user_id,title,category,status${extra ? ',project_id' : ''})
  values('${who}','Goal','Work & Money','active'${extra ? `,'${extra}'` : ''}) returning id;`);
const mutate = (goalId, operationType, extra = {}, who = owner) =>
  work('mutate', { operationId: id(), operationType, contractVersion: 1, goalId, ...extra }, who).data;
const dailyTask = (goalId, who = owner) =>
  mutate(goalId, 'task.create', { fields: { title: 'Daily', completionMode: 'binary' }, schedule: { kind: 'daily' } }, who).task;
// Desktop's canonical 048 RPC, called as the signed-in user exactly as /api/task-occurrences does.
const setStatus = (occurrence, status, who = owner) =>
  sql(`${as(who)}select public.set_task_occurrence_status_v1('${occurrence}','${status}','${id()}');`);
const entry = (type = 'reflection', { who = owner, created = 'now()' } = {}) =>
  sql(`${as(who)}insert into public.entries(user_id,entry_type,created_at) values('${who}','${type}',${created}) returning id;`);
const events = (goalId) => sql(`select coalesce(string_agg(kind || ':' || coalesce(entry_type,'-'), ',' order by kind, entry_type), '')
  from goal_private.goal_events where goal_id='${goalId}';`);
const count = (q) => Number(sql(`select count(*) from ${q};`));
const today = (window) => window.days.at(-1);
const week = (goalId, who = owner) => card('activity', { goalId }, who).data;

// auth.users' first column is instance_id, and signup (008/028) creates the profile.
sql(`insert into auth.users(id) values('${owner}'),('${other}') on conflict do nothing;
update public.profiles set timezone='America/New_York' where id in ('${owner}','${other}');`);

// Before 080: rows written through desktop's paths (048 RPC, direct RLS writes) that the backfill must find.
const seeded = {};
test('before 080: seed Task, Milestone and Entry history through desktop paths', () => {
  assert.equal(sql(`select max(version) from supabase_migrations.schema_migrations;`), '079');
  const g = seeded.goal = goal();
  const task = dailyTask(g);
  setStatus(task.current.occurrenceId, 'completed');
  seeded.milestone = sql(`${as(owner)}insert into public.milestones(goal_id,user_id,title,completed_at) values('${g}','${owner}','Done',now()) returning id;`);
  sql(`${as(owner)}insert into public.milestones(goal_id,user_id,title) values('${g}','${owner}','Open');`);
  const direct = entry('note'), viaMilestone = entry('reflection'), both = entry('reflection'), archived = entry('note');
  sql(`${as(owner)}insert into public.entry_goal_links(entry_id,goal_id) values('${direct}','${g}'),('${both}','${g}'),('${archived}','${g}');
    insert into public.reflection_milestone_links(entry_id,milestone_id) values('${viaMilestone}','${seeded.milestone}'),('${both}','${seeded.milestone}');
    update public.entries set archived=true where id='${archived}';`);
  // Pre-080 native Activity: direct links only, archived excluded.
  assert.deepEqual([today(week(g)).taskCompletions, today(week(g)).entriesCreated, today(week(g)).milestonesCompleted], [1, 2, 1]);
});

test('080 backfills existing history under the decided rules, through the same derivation as the triggers', () => {
  sql(`\\i ${migrations}/080_goal_events.sql`);
  const g = seeded.goal;
  // One task, one milestone, and four Entries once each: milestone-linked and archived now count; `both` once.
  assert.equal(events(g), 'entry_created:note,entry_created:note,entry_created:reflection,entry_created:reflection,milestone_completed:-,task_completed:-');
  const t = today(week(g));
  assert.deepEqual([t.taskCompletions, t.entriesCreated, t.milestonesCompleted], [1, 4, 1]);
  // Rebuilding from scratch gives exactly the same rows.
  const snapshot = () => sql(`select string_agg(concat_ws('|',owner_id,goal_id,kind,entity_id,entry_type,occurred_at), E'\\n' order by goal_id,kind,entity_id) from goal_private.goal_events;`);
  const before = snapshot();
  // As the executor, the only role that may run the derivation (as the migration's backfill does).
  sql(`grant goal_manual_executor to current_user; set role goal_manual_executor;
    delete from goal_private.goal_events; select goal_private.sync_goal_events(id) from public.goals;
    reset role; revoke goal_manual_executor from current_user;`);
  assert.equal(snapshot(), before);
});

test('Task completions: work-v1, the 048 RPC and the Project RPC each record one event; un-complete removes it', () => {
  const g = goal(), task = dailyTask(g), occurrence = task.current.occurrenceId;
  const done = mutate(g, 'task.progress', { taskId: task.id, occurrenceId: occurrence, progress: { action: 'complete' } });
  assert.equal(done.state, 'committed');
  assert.equal(events(g), 'task_completed:-');
  assert.equal(sql(`select e.occurred_at = o.completed_at from goal_private.goal_events e join public.task_occurrences o on o.id=e.entity_id where e.goal_id='${g}';`), 't');
  assert.equal(today(week(g)).taskCompletions, 1);
  mutate(g, 'task.progress', { taskId: task.id, occurrenceId: occurrence, progress: { action: 'reopen' } });
  assert.equal(events(g), '');
  setStatus(occurrence, 'completed');
  assert.equal(events(g), 'task_completed:-');
  setStatus(occurrence, 'pending');
  assert.equal(events(g), '');

  // Arthur's Project Task completion (073), as the Project owner.
  const project = sql(`insert into public.projects(user_id,title,mode) values('${owner}','Events Project','personal') returning id;`);
  const pg = goal(owner, project), ptask = dailyTask(pg);
  assert.equal(sql(`${as(owner)}select public.complete_project_task_v11('${ptask.current.occurrenceId}');`), 't');
  assert.equal(events(pg), 'task_completed:-');

  // Pending occurrences written in bulk by reconcile never create events.
  assert.equal(count(`goal_private.goal_events e join public.task_occurrences o on o.id=e.entity_id where o.status<>'completed'`), 0);
});

test('Milestones: direct RLS writes and work-v1 both record; un-complete and delete (with cascade) remove', () => {
  const g = goal();
  const direct = sql(`${as(owner)}insert into public.milestones(goal_id,user_id,title,completed_at) values('${g}','${owner}','Direct',now()) returning id;`);
  assert.equal(events(g), 'milestone_completed:-');
  sql(`${as(owner)}update public.milestones set completed_at=null where id='${direct}';`);
  assert.equal(events(g), '');
  const parent = mutate(g, 'milestone.create', { fields: { title: 'Parent' } }).milestone;
  // A child create returns its parent's projection.
  const child = mutate(g, 'milestone.create', { parentId: parent.id, fields: { title: 'Child' } }).milestone.children[0];
  for (const m of [child, parent]) {
    const r = mutate(g, 'milestone.complete', { milestoneId: m.id });
    assert.equal(r.state, 'committed', r.reason);
  }
  assert.equal(events(g), 'milestone_completed:-,milestone_completed:-');
  assert.equal(today(week(g)).milestonesCompleted, 2);
  sql(`${as(owner)}delete from public.milestones where id='${parent.id}';`); // the child cascades
  assert.equal(events(g), '');
});

test('Entries: direct or Milestone links count once per Goal; archive keeps; unlink and hard delete remove', () => {
  const g = goal(), second = goal();
  const milestone = sql(`${as(owner)}insert into public.milestones(goal_id,user_id,title) values('${g}','${owner}','M') returning id;`);
  const reflection = entry('reflection');
  sql(`${as(owner)}insert into public.entry_goal_links(entry_id,goal_id) values('${reflection}','${g}');`);
  assert.equal(events(g), 'entry_created:reflection');
  sql(`${as(owner)}insert into public.reflection_milestone_links(entry_id,milestone_id) values('${reflection}','${milestone}');`);
  assert.equal(events(g), 'entry_created:reflection', 'a second link to the same Goal is not a second event');
  sql(`${as(owner)}insert into public.entry_goal_links(entry_id,goal_id) values('${reflection}','${second}');`);
  assert.equal(events(second), 'entry_created:reflection', 'each Goal it reaches counts it once');
  sql(`${as(owner)}delete from public.entry_goal_links where entry_id='${reflection}' and goal_id='${g}';`);
  assert.equal(events(g), 'entry_created:reflection', 'still reached through the Milestone');
  sql(`${as(owner)}delete from public.reflection_milestone_links where entry_id='${reflection}';`);
  assert.equal(events(g), '', 'unlinked from the Goal entirely');

  const note = entry('note');
  sql(`${as(owner)}insert into public.entry_goal_links(entry_id,goal_id) values('${note}','${g}');`);
  assert.equal(today(week(g)).entriesCreated, 1, 'Notes and Reflections are one kind');
  sql(`${as(owner)}update public.entries set archived=true where id='${note}';`);
  assert.equal(events(g), 'entry_created:note', 'archiving keeps history');
  assert.equal(today(week(g)).entriesCreated, 1);
  sql(`${as(owner)}delete from public.entries where id='${note}';`);
  assert.equal(events(g), '', 'a hard delete removes it');

  // The event day is the Entry's creation day, even when linked later.
  const old = entry('reflection', { created: `now() - interval '3 days'` });
  sql(`${as(owner)}insert into public.entry_goal_links(entry_id,goal_id) values('${old}','${g}');`);
  assert.equal(week(g).days.at(-4).entriesCreated, 1);
  // Only the Goal owner's rows count (as in 074): another account's Entry linked to this Goal does not.
  const foreign = entry('note', { who: other });
  sql(`insert into public.entry_goal_links(entry_id,goal_id) values('${foreign}','${g}');`);
  assert.equal(count(`goal_private.goal_events where entity_id='${foreign}'`), 0);
});

test('a Task or Milestone moved to another Goal takes its events, including Entries reached through it', () => {
  const from = goal(), to = goal(), task = dailyTask(from);
  setStatus(task.current.occurrenceId, 'completed');
  const milestone = sql(`${as(owner)}insert into public.milestones(goal_id,user_id,title,completed_at) values('${from}','${owner}','Moved',now()) returning id;`);
  const reflection = entry('reflection');
  sql(`${as(owner)}insert into public.reflection_milestone_links(entry_id,milestone_id) values('${reflection}','${milestone}');`);
  assert.equal(events(from), 'entry_created:reflection,milestone_completed:-,task_completed:-');
  sql(`update public.tasks set goal_id='${to}' where id='${task.id}'; update public.milestones set goal_id='${to}' where id='${milestone}';`);
  assert.equal(events(from), '');
  assert.equal(events(to), 'entry_created:reflection,milestone_completed:-,task_completed:-');
});

test('reads: one window for both clients, owner-only; events are not directly readable', () => {
  const g = goal(), task = dailyTask(g);
  setStatus(task.current.occurrenceId, 'completed');
  const long = JSON.parse(sql(`${as(owner)}select public.goal_activity_v1('${g}', 120);`));
  assert.equal(long.data.days.length, 120);
  const short = JSON.parse(sql(`${as(owner)}select public.goal_activity_v1('${g}');`)).data;
  assert.deepEqual(short, week(g), 'desktop and native read the same numbers');
  assert.deepEqual(Object.keys(today(short)).sort(), ['date', 'entriesCreated', 'milestonesCompleted', 'taskCompletions']);
  for (const days of [0, 121]) assert.equal(JSON.parse(sql(`${as(owner)}select public.goal_activity_v1('${g}', ${days});`)).error.code, 'INVALID_FIELD');
  assert.equal(JSON.parse(sql(`${as(other)}select public.goal_activity_v1('${g}');`)).error.code, 'GOAL_UNAVAILABLE');
  assert.equal(JSON.parse(sql(`set role authenticated;select public.goal_activity_v1('${g}');`)).error.code, 'UNAUTHORIZED');
  assert.throws(() => sql(`${as(owner)}select count(*) from goal_private.goal_events;`), /permission denied/);
  assert.throws(() => sql(`set role anon;select public.goal_activity_v1('${g}');`), /permission denied/);
  assert.throws(() => sql(`set role service_role;select public.goal_activity_v1('${g}');`), /permission denied/);
  assert.throws(() => sql(`${as(owner)}select goal_private.sync_goal_events('${g}');`), /permission denied/);
});

test('deleting a Goal or an account removes its events', () => {
  const g = goal(other), task = dailyTask(g, other);
  setStatus(task.current.occurrenceId, 'completed', other);
  assert.equal(events(g), 'task_completed:-');
  sql(`delete from public.goals where id='${g}';`);
  assert.equal(events(g), '');
  const g2 = goal(other), t2 = dailyTask(g2, other);
  setStatus(t2.current.occurrenceId, 'completed', other);
  sql(`delete from auth.users where id='${other}';`);
  assert.equal(count(`goal_private.goal_events where owner_id='${other}'`), 0);
});
