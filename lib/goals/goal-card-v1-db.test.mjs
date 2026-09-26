// Migration 074 integration against an explicitly supplied disposable Unix-socket PostgreSQL cluster.
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
const sql = (s) => execFileSync(psql, args, { input: s, encoding: 'utf8' }).trim();
const asyncSQL = (s) => new Promise((resolve, reject) => { const p = spawn(psql, args); let out = '', err = ''; p.stdout.on('data', (x) => out += x); p.stderr.on('data', (x) => err += x); p.on('exit', (code) => code ? reject(Error(err)) : resolve(out.trim())); p.stdin.end(s); });
const literal = (x) => "'" + JSON.stringify(x).replaceAll("'", "''") + "'::jsonb";
const as = (who) => `set role authenticated;set request.jwt.claim.sub='${who}';`;
const card = (action, p = {}, who = owner) => JSON.parse(sql(`${as(who)}select public.goal_card_v1('${action}',${literal(p)});`));
const manual = (action, p = {}, who = owner) => JSON.parse(sql(`${as(who)}select public.goal_manual_v1('${action}',${literal(p)});`));
const vectors = JSON.parse(readFileSync(new URL('./manual-create-v1.fixtures.json', import.meta.url)));
let n = 0; const id = () => `cccccccc-cccc-4ccc-8ccc-${String(++n).padStart(12, '0')}`;
const header = (goalId, who = owner) => manual('header', { goalId }, who);
const createCanonical = (input = vectors[0].input) => {
  const operationId = id();
  const digest = sql(`select goal_private.digest(goal_private.fields(${literal(input)}));`);
  manual('register', { operationId, operationType: 'goal.create.manual', contractVersion: 1, payloadDigest: digest });
  return manual('submit', { operationId, operationType: 'goal.create.manual', contractVersion: 1, fields: input }).data.goalId;
};
const mutate = (goalId, operationType, expectedVersion, extra = {}, who = owner, operationId = id()) =>
  card('mutate', { operationId, operationType, contractVersion: 1, goalId, expectedVersion: String(expectedVersion), ...extra }, who);
const legacy = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

// auth.users' first column is instance_id, and signup (008/028) creates the profile (other defaults to UTC).
sql(`insert into auth.users(id) values('${owner}'),('${other}') on conflict do nothing;
update public.profiles set timezone='America/New_York' where id='${owner}';
insert into goal_private.verification_owners values('${owner}'); -- Only this disposable fixture admits its synthetic owner (072 verification mode).
update goal_private.admission set enabled=true;
insert into public.goals(id,user_id,title,category,deadline) values('${legacy}','${owner}','Legacy','Work & Money','2020-02-02T17:43:00+09');`);

test('child reads establish ownership before returning any collection', () => {
  const goal = createCanonical();
  for (const action of ['activity']) {
    assert.equal(card(action, { goalId: goal }, other).error.code, 'GOAL_UNAVAILABLE', action);
    assert.equal(card(action, { goalId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }).error.code, 'GOAL_UNAVAILABLE', action);
  }
  assert.equal(card('entries', { goalId: goal, entryType: 'note' }, other).error.code, 'GOAL_UNAVAILABLE');
  assert.equal(card('entries', { goalId: goal, entryType: 'sticky' }).error.code, 'INVALID_FIELD');
  assert.equal(card('entries', { goalId: goal, entryType: 'note', extra: 1 }).error.code, 'INVALID_FIELD');
  const empty = card('entries', { goalId: goal, entryType: 'note' }).data;
  assert.deepEqual([empty.items, empty.hasMore, empty.nextCursor], [[], false, null]);
});

test('Goal entries are canonical, type-filtered, newest first and exclude archived or unlinked rows', () => {
  const goal = createCanonical(), otherGoal = createCanonical();
  sql(`insert into public.entries(id,user_id,entry_type,title,plain_text,created_at,archived) values
    ('f0000000-0000-4000-8000-000000000001','${owner}','reflection','Old','old body','2026-01-01T00:00:00Z',false),
    ('f0000000-0000-4000-8000-000000000002','${owner}','reflection','New','${'x'.repeat(400)}','2026-02-01T00:00:00Z',false),
    ('f0000000-0000-4000-8000-000000000003','${owner}','note','Note','note body','2026-02-02T00:00:00Z',false),
    ('f0000000-0000-4000-8000-000000000004','${owner}','reflection','Archived','','2026-03-01T00:00:00Z',true),
    ('f0000000-0000-4000-8000-000000000005','${owner}','reflection','Elsewhere','','2026-03-02T00:00:00Z',false);
    insert into public.entry_goal_links(entry_id,goal_id) values ('f0000000-0000-4000-8000-000000000001','${goal}'),
    ('f0000000-0000-4000-8000-000000000002','${goal}'),('f0000000-0000-4000-8000-000000000003','${goal}'),
    ('f0000000-0000-4000-8000-000000000004','${goal}'),('f0000000-0000-4000-8000-000000000005','${otherGoal}');`);
  const reflections = card('entries', { goalId: goal, entryType: 'reflection', limit: 1 }).data;
  assert.deepEqual(reflections.items.map((x) => x.title), ['New']); assert.equal(reflections.items[0].excerpt.length, 280);
  const rest = card('entries', { goalId: goal, entryType: 'reflection', cursor: reflections.nextCursor }).data;
  assert.deepEqual(rest.items.map((x) => x.title), ['Old']);
  assert.equal(card('entries', { goalId: goal, entryType: 'note', cursor: reflections.nextCursor }).error.code, 'CURSOR_EXPIRED');
  assert.deepEqual(card('entries', { goalId: goal, entryType: 'note' }).data.items.map((x) => x.title), ['Note']);
});

test('Task and Milestone collections are not served here (Migration 075 owns them)', () => {
  const goal = createCanonical();
  for (const action of ['tasks', 'milestones']) assert.equal(card(action, { goalId: goal }).error.code, 'INVALID_FIELD', action);
  assert.equal(sql(`select count(*) from pg_proc where proname='task_projection';`), '0');
});

test('activity buckets by profile-local day across the boundary and never invents a Goal', () => {
  const goal = createCanonical();
  // 23:30 New York local on the previous calendar day must not land on today (UTC would move it forward).
  const yesterday = sql(`select ((now() at time zone 'America/New_York')::date - 1);`);
  sql(`insert into public.milestones(goal_id,user_id,title,completed_at) values
      ('${goal}','${owner}','Late','${yesterday} 23:30'::timestamp at time zone 'America/New_York'),
      ('${goal}','${owner}','Old','${yesterday}'::date - 30);
    insert into public.entries(id,user_id,entry_type,created_at) values('f1000000-0000-4000-8000-000000000001','${owner}','note',now());
    insert into public.entry_goal_links(entry_id,goal_id) values('f1000000-0000-4000-8000-000000000001','${goal}');`);
  const week = card('activity', { goalId: goal }).data;
  assert.equal(week.days.length, 7); assert.equal(week.timezone, 'America/New_York'); assert.equal(week.timezoneSource, 'profile');
  assert.equal(week.days[5].date, yesterday); assert.equal(week.days[5].milestonesCompleted, 1);
  assert.equal(week.days[6].entriesCreated, 1); assert.equal(week.days.reduce((s, d) => s + d.milestonesCompleted, 0), 1);
  sql(`update public.profiles set timezone='' where id='${owner}';`);
  assert.equal(card('activity', { goalId: goal }).data.timezoneSource, 'utc_unconfigured');
  sql(`update public.profiles set timezone='Mars/Olympus' where id='${owner}';`);
  assert.equal(card('activity', { goalId: goal }).error.code, 'DATE_CONTEXT_UNAVAILABLE');
  sql(`update public.profiles set timezone='America/New_York' where id='${owner}';`);
  assert.equal(card('activity', { goalId: goal, days: 29 }).error.code, 'INVALID_FIELD');
});

test('edit commits once, preserves untouched fields and replays by identity', () => {
  const goal = createCanonical({ ...vectors[0].input, description: 'Keep me' });
  const operationId = id();
  const first = mutate(goal, 'goal.update.manual', 1, { changes: { title: '  Renamed  ' } }, owner, operationId).data;
  assert.equal(first.state, 'committed'); assert.equal(first.goalVersion, '2');
  assert.deepEqual(mutate(goal, 'goal.update.manual', 1, { changes: { title: '  Renamed  ' } }, owner, operationId).data, first);
  assert.equal(mutate(goal, 'goal.update.manual', 1, { changes: { title: 'Other' } }, owner, operationId).error.code, 'OPERATION_PAYLOAD_MISMATCH');
  const h = header(goal).data.header;
  assert.deepEqual([h.title, h.description, h.goalVersion, h.dateState], ['Renamed', 'Keep me', '2', 'no_date']);
  const stale = mutate(goal, 'goal.update.manual', 1, { changes: { description: null } }).data;
  assert.deepEqual([stale.state, stale.reason], ['not_committed', 'VERSION_CONFLICT']);
  assert.equal(mutate(goal, 'goal.update.manual', 2, { changes: { title: 'Renamed' } }).data.reason, 'NO_CHANGES');
  assert.equal(mutate(goal, 'goal.update.manual', 2, { changes: { description: null } }).data.state, 'committed');
  assert.equal(header(goal).data.header.description, null);
  assert.equal(mutate(goal, 'goal.update.manual', 3, { changes: { category: 'Other' } }).error.code, 'INVALID_FIELD');
  assert.equal(mutate(goal, 'goal.update.manual', 3, { changes: {} }).error.code, 'INVALID_FIELD');
});

test('date edits require reviewed profile context and today-or-later calendar dates', () => {
  const goal = createCanonical();
  const ctx = manual('context').data;
  const yesterday = sql(`select to_char('${ctx.localDate}'::date - 1,'YYYY-MM-DD');`);
  assert.equal(mutate(goal, 'goal.update.manual', 1, { changes: { endDate: ctx.localDate } }).error.code, 'INVALID_FIELD');
  assert.equal(mutate(goal, 'goal.update.manual', 1, { changes: { endDate: yesterday }, reviewToken: ctx.reviewToken }).data.reason, 'DATE_IN_PAST');
  assert.equal(mutate(goal, 'goal.update.manual', 1, { changes: { endDate: '2026-02-30' }, reviewToken: ctx.reviewToken }).error.code, 'INVALID_FIELD'); // impossible day; same class as 072
  const due = mutate(goal, 'goal.update.manual', 1, { changes: { endDate: ctx.localDate }, reviewToken: ctx.reviewToken }).data;
  assert.equal(due.state, 'committed');
  assert.deepEqual([header(goal).data.header.endDate, header(goal).data.header.dateState], [ctx.localDate, 'known']);
  const stale = manual('context').data;
  sql(`update public.profiles set timezone='Asia/Tokyo' where id='${owner}';`);
  assert.equal(mutate(goal, 'goal.update.manual', 2, { changes: { endDate: '2099-01-01' }, reviewToken: stale.reviewToken }).data.reason, 'DATE_CONTEXT_CHANGED');
  sql(`update public.profiles set timezone='America/New_York' where id='${owner}';`);
  assert.equal(mutate(goal, 'goal.update.manual', 2, { changes: { endDate: null } }).data.state, 'committed');
  assert.equal(header(goal).data.header.dateState, 'no_date');
});

test('legacy Goals keep their unresolved date; other edits and lifecycle remain available', () => {
  const version = header(legacy).data.header.goalVersion;
  assert.equal(mutate(legacy, 'goal.update.manual', version, { changes: { endDate: null } }).data.reason, 'DATE_ADOPTION_UNAVAILABLE');
  assert.equal(mutate(legacy, 'goal.update.manual', version, { changes: { title: 'Legacy renamed' } }).data.state, 'committed');
  assert.equal(sql(`select deadline at time zone 'UTC' from public.goals where id='${legacy}';`), '2020-02-02 08:43:00');
  assert.equal(header(legacy).data.header.dateState, 'needs_review');
});

test('complete and archive respect status, version and confirmation identity', () => {
  const goal = createCanonical();
  assert.equal(mutate(goal, 'goal.complete', 1, { changes: { title: 'x' } }).error.code, 'INVALID_FIELD');
  const done = mutate(goal, 'goal.complete', 1).data;
  assert.deepEqual([done.state, header(goal).data.header.status], ['committed', 'completed']);
  assert.equal(mutate(goal, 'goal.update.manual', 2, { changes: { title: 'No' } }).data.reason, 'STATUS_CONFLICT');
  assert.equal(mutate(goal, 'goal.complete', 2).data.reason, 'STATUS_CONFLICT');
  assert.equal(mutate(goal, 'goal.archive', 1).data.reason, 'VERSION_CONFLICT');
  assert.equal(mutate(goal, 'goal.archive', 2).data.state, 'committed');
  assert.equal(header(goal).data.header.status, 'archived');
  assert.equal(mutate(goal, 'goal.archive', 3).data.reason, 'STATUS_CONFLICT');
  const paused = createCanonical();
  // postgres is not a member of the executor after 072, 074 and 075 (as on hosted); borrow it the way the migrations do.
  sql(`grant goal_manual_executor to current_user; set role goal_manual_executor;
    update public.goals set status='stagnant' where id='${paused}';
    reset role; revoke goal_manual_executor from current_user;`);
  assert.equal(mutate(paused, 'goal.complete', 2).data.reason, 'STATUS_CONFLICT');
  assert.equal(mutate(paused, 'goal.archive', 2).data.state, 'committed');
});

test('owners are isolated; a foreign Goal is an owner-scoped non-commit', () => {
  const goal = createCanonical();
  const foreign = mutate(goal, 'goal.complete', 1, {}, other).data;
  assert.deepEqual([foreign.state, foreign.reason, foreign.goalId], ['not_committed', 'GOAL_UNAVAILABLE', null]);
  assert.equal(card('mutation_lookup', { operationId: foreign.operationId }).error.code, 'HISTORY_UNAVAILABLE');
  assert.equal(header(goal).data.header.status, 'active');
  assert.throws(() => sql(`${as(owner)}update public.goals set title='bypass' where id='${goal}';`));
});

test('close fences a delayed mutation; parallel duplicates commit exactly once', async () => {
  const goal = createCanonical(); const fenced = id();
  assert.equal(card('mutation_close', { operationId: fenced }).data.reason, 'closed_by_owner');
  const late = mutate(goal, 'goal.complete', 1, {}, owner, fenced).data;
  assert.deepEqual([late.state, late.reason], ['not_committed', 'closed_by_owner']);
  assert.equal(header(goal).data.header.status, 'active');
  const operationId = id();
  const cmd = `${as(owner)}select public.goal_card_v1('mutate',${literal({ operationId, operationType: 'goal.update.manual', contractVersion: 1, goalId: goal, expectedVersion: '1', changes: { title: 'Once' } })});`;
  const [a, b] = await Promise.all([asyncSQL(cmd), asyncSQL(cmd)]);
  assert.deepEqual(JSON.parse(a).data, JSON.parse(b).data);
  assert.equal(header(goal).data.header.goalVersion, '2');
  const race = id();
  const [m, c] = await Promise.all([
    asyncSQL(`${as(owner)}select public.goal_card_v1('mutate',${literal({ operationId: race, operationType: 'goal.complete', contractVersion: 1, goalId: goal, expectedVersion: '2' })});`),
    asyncSQL(`${as(owner)}select public.goal_card_v1('mutation_close',${literal({ operationId: race })});`)]);
  assert.equal(JSON.parse(m).data.state, JSON.parse(c).data.state);
});

test('bounded discovery exposes unacknowledged outcomes until acknowledged', () => {
  const page = card('mutation_discover', { limit: 3 }).data;
  assert.equal(page.items.length, 3); assert.ok(page.hasMore);
  assert.deepEqual(card('mutation_discover', {}, other).data.items.map((x) => x.reason), ['GOAL_UNAVAILABLE']);
  let remaining = card('mutation_discover', { limit: 50 }).data;
  while (remaining.items.length) {
    for (const r of remaining.items) assert.ok(card('mutation_ack', { operationId: r.operationId }).data.operationId);
    remaining = card('mutation_discover', { limit: 50 }).data;
  }
  assert.equal(remaining.hasMore, false);
  assert.equal(card('mutation_ack', { operationId: id() }).error.code, 'HISTORY_UNAVAILABLE');
});

test('account deletion cascades mutation receipts', () => {
  sql(`delete from auth.users where id='${other}';`);
  assert.equal(sql(`select count(*) from goal_private.goal_mutations where owner_id='${other}';`), '0');
});
