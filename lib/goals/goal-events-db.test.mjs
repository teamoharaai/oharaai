// Migration 080 integration: Goal events (TD-004), against an explicitly supplied disposable Unix-socket
// PostgreSQL cluster. Runs on the chain through 079: it seeds pre-080 rows through the paths desktop uses,
// applies 080 itself (proving the backfill), then checks every IOSB-004 counting rule through every write
// path. Then the Echo mirror (TD-005, Migration 086): it seeds Echo history as desktop writes it, applies 081-086
// (proving the backlog copy) and drives every Echo writer. Run with `npm run test:goals:db`. Synthetic rows only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
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

// Echo mirror (TD-005 D3, B3/B4/B10; Migration 086) ----------------------------------------------------------
const echoOwner = '80808080-0000-4080-8080-000000000003';
const text = (s) => (s === null ? 'null' : `'${s.replaceAll("'", "''")}'`);
// Desktop's capture: POST /api/entries -> create_echo_entry_with_container (023), as the signed-in user.
const capture = (content, goalId = null, title = null) => sql(`${as(echoOwner)}select public.create_echo_entry_with_container(
  ${text(content)}, ${text(title)}, ${goalId ? `'${goalId}'` : 'null'}, false, null, null, null);`);
const echoGoal = (category = 'Work & Money') => sql(`insert into public.goals(user_id,title,category,status)
  values('${echoOwner}','Echo goal','${category}','active') returning id;`);
// What the canonical copy holds: type, title, text, version; its Goal links; its inherited categories.
const copy = (e) => sql(`select concat_ws('|', entry_type, title, plain_text, content_version) from public.entries where id='${e}';`);
const linkedGoals = (e) => sql(`select coalesce(string_agg(goal_id::text, ',' order by goal_id), '') from public.entry_goal_links where entry_id='${e}';`);
const inherited = (e) => sql(`select coalesce(string_agg(category_id, ',' order by category_id), '') from public.entry_category_links
  where entry_id='${e}' and link_source='inherited';`);
const eventRows = () => sql(`select coalesce(string_agg(concat_ws('|',id,owner_id,goal_id,kind,entity_id,entry_type,occurred_at,recorded_at), E'\\n' order by id), '')
  from goal_private.goal_events;`);
// The 080 preflight fact: confirmed legacy goal links with no canonical link (the D4 acceptance count).
const legacyOnly = () => count(`public.echo_entry_links l where l.container_type='goal' and l.confirmed and l.goal_id is not null
  and not exists (select 1 from public.entry_goal_links c where c.entry_id=l.echo_entry_id and c.goal_id=l.goal_id)`);
const echo = {};

test('before 086: seed Echo history through desktop paths; Echo writes reach no canonical row', () => {
  const mirrored = () => sql(`select to_regprocedure('goal_private.mirror_echo_entries(uuid[],boolean)') is not null;`);
  assert.equal(mirrored(), 'f', 'the chain is at 080 here (080 was applied above)');
  sql(`insert into auth.users(id) values('${echoOwner}');`);
  const gA = echo.gA = echoGoal(), gB = echo.gB = echoGoal('Health & Fitness');
  echo.linked = capture('Linked before 086', gA);
  echo.folder = capture('Filed before 086');
  // The reconcile pipeline's unconfirmed suggestion (echo-service.ts): never a canonical link.
  sql(`${as(echoOwner)}insert into public.echo_entry_links(echo_entry_id,goal_id,container_type,link_source,confirmed)
    values('${echo.folder}','${gA}','goal','ai_auto',false);`);
  // A 036 copy the user then edited in the library, and later moved to Goal B in Echo (a legacy-only link).
  echo.edited = capture('Old capture');
  sql(`insert into public.entries(id,user_id,entry_type,title,plain_text,reflection_type)
    values('${echo.edited}','${echoOwner}','reflection','Edited in library','Changed in the library','open');`);
  sql(`${as(echoOwner)}update public.echo_entry_links set container_type='goal', goal_id='${gB}', folder_id=null
    where echo_entry_id='${echo.edited}' and confirmed;`);
  // A pre-012 row: only the legacy echo_entries.goal_id, no link (Echo still shows Goal A).
  echo.legacy = sql(`insert into public.echo_entries(user_id,content,goal_id) values('${echoOwner}','Legacy row','${gA}') returning id;`);
  // A canonical Entry with an event already: the backlog must leave existing events byte-identical.
  echo.native = entry('reflection', { who: echoOwner });
  sql(`${as(echoOwner)}insert into public.entry_goal_links(entry_id,goal_id) values('${echo.native}','${gA}');`);
  assert.equal(count(`public.entries where id in ('${echo.linked}','${echo.folder}','${echo.legacy}')`), 0);
  assert.equal(legacyOnly(), 2, 'Goal A for the capture, Goal B for the moved copy');
  echo.eventsBefore = eventRows();
  echo.maxEventBefore = sql(`select max(id) from goal_private.goal_events;`);
});

test('086 copies the backlog once, add-only, through the same mapping as the triggers', () => {
  for (const file of readdirSync(migrations).filter((f) => /^\d{3}_.+\.sql$/.test(f) && f.slice(0, 3) > '080').sort()) {
    sql(`\\i ${migrations}/${file}`);
  }
  assert.equal(sql(`select to_regprocedure('goal_private.mirror_echo_entries(uuid[],boolean)') is not null;`), 't');
  const { gA, gB } = echo;
  assert.equal(copy(echo.linked), 'reflection|Reflection|Linked before 086|1', "036's mapping: an untitled capture is 'Reflection'");
  assert.equal(linkedGoals(echo.linked), gA);
  assert.equal(inherited(echo.linked), 'Work & Money', "the Goal's product category (068)");
  assert.equal(copy(echo.folder), 'reflection|Reflection|Filed before 086|1');
  assert.equal(linkedGoals(echo.folder), '', 'a folder means no Goal; the unconfirmed suggestion is ignored');
  assert.equal(copy(echo.edited), 'reflection|Edited in library|Changed in the library|1', 'the backlog never overwrites a copy');
  assert.equal(linkedGoals(echo.edited), gB, 'but adds the missing link');
  assert.equal(linkedGoals(echo.legacy), gA, 'no confirmed container: the legacy goal_id, as Echo shows it');
  assert.equal(legacyOnly(), 0, 'the D4 acceptance count');
  // Existing events are untouched; every new one is for an Echo-origin Entry (what the --apply invariant allows).
  assert.equal(sql(`select coalesce(string_agg(concat_ws('|',id,owner_id,goal_id,kind,entity_id,entry_type,occurred_at,recorded_at), E'\\n' order by id), '')
    from goal_private.goal_events where id <= ${echo.maxEventBefore};`), echo.eventsBefore);
  assert.equal(count(`goal_private.goal_events where id > ${echo.maxEventBefore}`), 3);
  assert.equal(count(`goal_private.goal_events e where id > ${echo.maxEventBefore}
    and not (e.kind='entry_created' and exists (select 1 from public.echo_entries ee where ee.id=e.entity_id))`), 0);
  assert.equal(events(gA), 'entry_created:reflection,entry_created:reflection,entry_created:reflection');
  // Copying again changes nothing.
  const after = eventRows();
  sql(`grant goal_manual_executor to current_user; set role goal_manual_executor;
    select goal_private.mirror_echo_entries(array(select id from public.echo_entries), false);
    reset role; revoke goal_manual_executor from current_user;`);
  assert.equal(eventRows(), after);
});

test('capture: the 023 RPC writes the canonical Entry, its Goal link and the event in the same transaction', () => {
  const g = echoGoal(), withGoal = capture('Captured with a Goal', g, 'Titled');
  assert.equal(copy(withGoal), 'reflection|Titled|Captured with a Goal|1');
  assert.equal(linkedGoals(withGoal), g);
  assert.equal(events(g), 'entry_created:reflection');
  assert.equal(sql(`select e.occurred_at = ee.created_at from goal_private.goal_events e join public.echo_entries ee on ee.id=e.entity_id
    where e.goal_id='${g}';`), 't');
  assert.equal(today(week(g, echoOwner)).entriesCreated, 1, 'native and desktop Activity now see desktop captures');
  const filed = capture('Captured into General');
  assert.equal(copy(filed), 'reflection|Reflection|Captured into General|1');
  assert.equal(linkedGoals(filed), '');
  // Visible to the owner's canonical reads (native Reflections, desktop library) under RLS.
  assert.equal(sql(`${as(echoOwner)}select count(*) from public.entries where id in ('${withGoal}','${filed}');`), '2');
});

test('edit: the PATCH route rewrites the copy and its BRT (B10: one-way, even over library edits); AI updates never fire', () => {
  sql(`${as(echoOwner)}update public.echo_entries set title='Retitled', content='Edited in Echo' where id='${echo.edited}';`);
  assert.equal(copy(echo.edited), 'reflection|Retitled|Edited in Echo|2');
  assert.equal(sql(`select content->'blocks'->0->>'text' || '|' || (conversation_turns->0->>'content') from public.entries where id='${echo.edited}';`),
    'Edited in Echo|Edited in Echo');
  const updatedAt = () => sql(`select updated_at from public.entries where id='${echo.edited}';`);
  const before = [copy(echo.edited), updatedAt()];
  // The reflect/reconcile pipeline (as the user, like the server routes) and 083's claim.
  sql(`${as(echoOwner)}update public.echo_entries set ai_insight_requested=true, ai_status='pending' where id='${echo.edited}';`);
  sql(`${as(echoOwner)}select count(*) from public.claim_echo_reconciliation_v1(array['${echo.edited}'::uuid]);`);
  sql(`${as(echoOwner)}update public.echo_entries set ai_status='completed', brt='{"bud":"x"}', emotion='{}', themes='{a}',
    ai_response='r', processed_at=now(), embedding_text='e', retry_count=1 where id='${echo.edited}';`);
  assert.deepEqual([copy(echo.edited), updatedAt()], before);
  // Re-saving the same text is not a change either.
  sql(`${as(echoOwner)}update public.echo_entries set content='Edited in Echo' where id='${echo.edited}';`);
  assert.deepEqual([copy(echo.edited), updatedAt()], before);
  // The user's Bud/Rose/Thorn choice (the PATCH route's brtCategory) is the copy's BRT, as 045 made it.
  sql(`${as(echoOwner)}update public.echo_entries set brt_category='thorn' where id='${echo.edited}';`);
  assert.equal(sql(`select brt_category || '|' || content_version from public.entries where id='${echo.edited}';`), 'thorn|3');
});

test('move: moveEntryContainer relinks; a folder removes the Goal, its category and its event', () => {
  const { gA, gB } = echo, e = echo.linked;
  const move = (target) => sql(`${as(echoOwner)}update public.echo_entry_links set ${target} where echo_entry_id='${e}' and confirmed;`);
  const folder = sql(`${as(echoOwner)}insert into public.echo_folders(user_id,name) values('${echoOwner}','Ideas') returning id;`);
  move(`container_type='goal', goal_id='${gB}', folder_id=null`);
  assert.equal(linkedGoals(e), gB);
  assert.equal(inherited(e), 'Health & Fitness');
  assert.equal(count(`goal_private.goal_events where entity_id='${e}' and goal_id='${gB}'`), 1);
  assert.equal(count(`goal_private.goal_events where entity_id='${e}' and goal_id='${gA}'`), 0);
  move(`container_type='folder', goal_id=null, folder_id='${folder}'`);
  assert.equal(linkedGoals(e), '');
  assert.equal(inherited(e), '');
  assert.equal(count(`goal_private.goal_events where entity_id='${e}'`), 0);
  // An entry with no confirmed link gets one inserted; the legacy goal_id no longer decides.
  sql(`${as(echoOwner)}insert into public.echo_entry_links(echo_entry_id,folder_id,container_type,link_source,confirmed)
    values('${echo.legacy}','${folder}','folder','manual',true);`);
  assert.equal(linkedGoals(echo.legacy), '');
  // A confirmed link to another account's Goal never becomes a canonical link (080 counts the owner's Goals only).
  const foreignGoal = goal(owner);
  sql(`update public.echo_entry_links set container_type='goal', goal_id='${foreignGoal}', folder_id=null where echo_entry_id='${e}' and confirmed;`);
  assert.equal(linkedGoals(e), '');
});

test('delete: deleting the Echo entry or its Goal removes the copy or the link; Echo owns its copies (B10)', () => {
  const g = echoGoal(), e = capture('Will be deleted', g);
  assert.throws(() => sql(`${as(echoOwner)}update public.entries set title='Library edit' where id='${e}';`), /ECHO_OWNED/);
  assert.throws(() => sql(`${as(echoOwner)}delete from public.entries where id='${e}';`), /ECHO_OWNED/);
  sql(`${as(echoOwner)}delete from public.echo_entries where id='${e}';`);
  assert.equal(count(`public.entries where id='${e}'`), 0);
  assert.equal(events(g), '');
  const kept = capture('Goal goes away', g);
  sql(`delete from public.goals where id='${g}';`); // link cascade; echo_entries.goal_id is set null
  assert.equal(linkedGoals(kept), '');
  assert.equal(copy(kept), 'reflection|Reflection|Goal goes away|1');
  assert.throws(() => sql(`${as(echoOwner)}select goal_private.mirror_echo_entries(array['${kept}'::uuid], true);`), /permission denied/);
  // Deleting the account cascades through both tables; the guard does not block it.
  sql(`delete from auth.users where id='${echoOwner}';`);
  assert.equal(count(`public.entries where user_id='${echoOwner}'`), 0);
  assert.equal(count(`goal_private.goal_events where owner_id='${echoOwner}'`), 0);
});
