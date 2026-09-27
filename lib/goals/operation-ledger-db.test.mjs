// Migration 078 integration: the Goal operation ledger, against an explicitly supplied disposable
// Unix-socket PostgreSQL cluster. Run with `npm run test:goals:db`: the full supabase/migrations chain on a
// Supabase-shaped database. Synthetic rows only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
const socket = process.env.GOAL_TEST_SOCKET;
if (!socket?.startsWith('/tmp/ohara-goal-')) throw Error('Explicit disposable GOAL_TEST_SOCKET required');
const psql = process.env.GOAL_TEST_PSQL ?? '/opt/homebrew/opt/postgresql@17/bin/psql';
const args = ['-h', socket, '-p', process.env.GOAL_TEST_PORT ?? '55450', '-U', 'postgres', '-d', process.env.GOAL_TEST_DB ?? 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq'];
const owner = '33333333-3333-4333-8333-333333333333', other = '44444444-4444-4444-8444-444444444444';
const discoverer = '55555555-5555-4555-8555-555555555555', retainer = '66666666-6666-4666-8666-666666666666';
const capper = '77777777-7777-4777-8777-777777777777';
const sql = (s) => execFileSync(psql, args, { input: s, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const asyncSQL = (s) => new Promise((resolve, reject) => { const p = spawn(psql, args); let out = '', err = ''; p.stdout.on('data', (x) => out += x); p.stderr.on('data', (x) => err += x); p.on('exit', (code) => code ? reject(Error(err)) : resolve(out.trim())); p.stdin.end(s); });
const literal = (x) => "'" + JSON.stringify(x).replaceAll("'", "''") + "'::jsonb";
const as = (who) => `set role authenticated;set request.jwt.claim.sub='${who}';`;
const rpc = (fn) => (action, p = {}, who = owner) => JSON.parse(sql(`${as(who)}select public.${fn}('${action}',${literal(p)});`));
const ops = rpc('goal_operations_v1'), work = rpc('goal_work_v1'), card = rpc('goal_card_v1'), manual = rpc('goal_manual_v1');
let n = 0; const id = () => `dddddddd-dddd-4ddd-8ddd-${String(++n).padStart(12, '0')}`;
const goal = (who = owner) => sql(`insert into public.goals(user_id,title,category,status) values('${who}','Goal','Work & Money','active') returning id;`);
const taskCreate = (goalId, operationId, title = 'Task', dueDate = null) => ({ operationId, operationType: 'task.create', contractVersion: 1, goalId,
  fields: { title, completionMode: 'binary' }, schedule: { kind: 'once', dueDate } });
const createTask = (goalId, operationId = id(), who = owner) => work('mutate', taskCreate(goalId, operationId), who);
const goalVersion = (goalId) => Number(sql(`select goal_version from public.goals where id='${goalId}';`));
const completeGoal = (goalId, operationId = id(), who = owner) =>
  card('mutate', { operationId, operationType: 'goal.complete', contractVersion: 1, goalId, expectedVersion: goalVersion(goalId) }, who);
const vectors = JSON.parse(readFileSync(new URL('./manual-create-v1.fixtures.json', import.meta.url)));
const fixtures = JSON.parse(readFileSync(new URL('./goal-operations-v1.fixtures.json', import.meta.url)));
// The shared native/backend fixture has exactly the RPC's shape (keys and JSON types).
const shape = (x) => Array.isArray(x) ? x.map(shape) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, shape(x[k])])) : x === null ? null : typeof x;
const sameShape = (actual, fixture, name) => assert.deepEqual(shape(actual), shape(fixture), name);
const register = (operationId) => manual('register', { operationId, operationType: 'goal.create.manual', contractVersion: 1, payloadDigest: vectors[0].digest });
const submit = (operationId) => manual('submit', { operationId, operationType: 'goal.create.manual', contractVersion: 1, fields: vectors[0].input });
const count = (q) => Number(sql(`select count(*) from ${q};`));
// Direct ledger rows for retention tests: tombstones (no type, no digest) with chosen timestamps.
const tombstones = (who, rows, { recorded, acknowledged = 'null' }) => sql(`insert into goal_private.operation_ledger
  (owner_id,operation_id,seq,protocol,state,reason,recorded_at,terminal_at,acknowledged_at)
  select '${who}', gen_random_uuid(), goal_private.next_operation_seq('${who}'), 'goal.work', 'not_committed', 'closed_by_owner',
    ${recorded}, ${recorded}, ${acknowledged} from generate_series(1, ${rows});`);

// auth.users' first column is instance_id, and signup (008/028) creates the profile (other defaults to UTC).
sql(`insert into auth.users(id) values('${owner}'),('${other}'),('${discoverer}'),('${retainer}'),('${capper}') on conflict do nothing;
update public.profiles set timezone='America/New_York' where id in ('${owner}','${discoverer}');
insert into goal_private.verification_owners values('${owner}');update goal_private.admission set enabled=true;`); // ONLY this disposable fixture enables it.

test('every protocol writes one ledger row, visible through lookup and still through its v1 contract', () => {
  const workGoal = goal(), cardGoal = goal(), workOp = id(), cardOp = id(), createOp = id();
  const task = createTask(workGoal, workOp).data.task;
  assert.equal(completeGoal(cardGoal, cardOp).data.state, 'committed');
  assert.equal(register(createOp).data.state, 'registered');
  const created = submit(createOp).data;
  assert.equal(created.state, 'committed');

  const w = ops('lookup', { operationId: workOp }).data;
  assert.deepEqual([w.protocol, w.operationType, w.state, w.entityId, w.goalId, w.revision, w.acknowledged, w.reason],
    ['goal.work', 'task.create', 'committed', task.id, workGoal, '1', false, null]);
  sameShape(w, fixtures.responses.workCommitted, 'workCommitted');
  const c = ops('lookup', { operationId: cardOp }).data;
  assert.deepEqual([c.protocol, c.operationType, c.state, c.goalId, c.entityId], ['goal.mutate', 'goal.complete', 'committed', cardGoal, null]);
  const m = ops('lookup', { operationId: createOp }).data;
  assert.deepEqual([m.protocol, m.operationType, m.state, m.goalId, m.revision], ['goal.create', 'goal.create.manual', 'committed', created.goalId, '2']);
  // One per-owner sequence, in commit order, across protocols.
  assert.equal(sql(`select string_agg(protocol, ',' order by seq) from goal_private.operation_ledger where owner_id='${owner}';`), 'goal.work,goal.mutate,goal.create');
  // The v1 lookups read the same rows.
  assert.equal(card('mutation_lookup', { operationId: cardOp }).data.state, 'committed');
  assert.equal(manual('lookup', { operationId: createOp }).data.goalId, created.goalId);
  // The manual Goal's provenance now lives in the ledger, and its projection still validates.
  assert.equal(manual('header', { goalId: created.goalId }).data.header.dateState, 'no_date');
});

test('discover pages every protocol under one barrier; ack needs the seen revision', () => {
  const g1 = goal(discoverer), g2 = goal(discoverer), first = id(), second = id(), third = id(), late = id();
  createTask(g1, first, discoverer); createTask(g1, second, discoverer); completeGoal(g2, third, discoverer);
  const page1 = ops('discover', { limit: 2 }, discoverer).data;
  assert.deepEqual(page1.items.map((i) => i.operationId), [first, second]);
  assert.equal(page1.hasMore, true); assert.equal(page1.hasOutstandingAtBarrier, true);
  createTask(g1, late, discoverer); // after the barrier: not part of this pass
  const page2 = ops('discover', { limit: 2, cursor: page1.nextCursor }, discoverer).data;
  assert.deepEqual(page2.items.map((i) => i.operationId), [third]);
  assert.equal(page2.hasMore, false); assert.equal(page2.barrier, page1.barrier);
  assert.equal(page2.items[0].protocol, 'goal.mutate');
  sameShape({ ...page2, items: page2.items.slice(0, 1) }, fixtures.responses.discoverPage, 'discoverPage');

  assert.equal(ops('ack', { operationId: first, revision: '2' }, discoverer).error.code, 'RECEIPT_REVISION_MISMATCH');
  for (const item of [...page1.items, ...page2.items]) assert.equal(ops('ack', { operationId: item.operationId, revision: item.revision }, discoverer).data.acknowledged, true);
  assert.equal(ops('ack', { operationId: first, revision: '1' }, discoverer).data.acknowledged, true); // idempotent
  const fresh = ops('discover', {}, discoverer).data;
  assert.deepEqual(fresh.items.map((i) => i.operationId), [late]);
  // 074's own inbox agrees: the acknowledged goal.mutate outcome left it too.
  assert.deepEqual(card('mutation_discover', {}, discoverer).data.items, []);
});

test('close writes a permanent tombstone that fences a delayed request of every protocol', () => {
  const g = goal(), workOp = id(), cardOp = id(), createOp = id();
  const tomb = ops('close', { operationId: workOp, protocol: 'goal.work' }).data;
  assert.deepEqual([tomb.state, tomb.reason, tomb.protocol, tomb.operationType], ['not_committed', 'closed_by_owner', 'goal.work', null]);
  sameShape(tomb, fixtures.responses.workTombstone, 'workTombstone');
  const late = work('mutate', taskCreate(g, workOp, 'Late')).data;
  assert.deepEqual([late.state, late.reason, late.operationType, late.task, late.goalId], ['not_committed', 'closed_by_owner', 'task.create', null, null]);
  assert.equal(count(`public.tasks where goal_id='${g}' and title='Late'`), 0);

  ops('close', { operationId: cardOp, protocol: 'goal.mutate' });
  const lateCard = completeGoal(g, cardOp).data;
  assert.deepEqual([lateCard.state, lateCard.reason], ['not_committed', 'closed_by_owner']);
  assert.equal(sql(`select status from public.goals where id='${g}';`), 'active');

  ops('close', { operationId: createOp, protocol: 'goal.create' });
  assert.deepEqual([register(createOp).data.state, submit(createOp).data.reason], ['not_committed', 'closed_by_owner']);

  // Idempotent, and a terminal outcome is returned unchanged.
  assert.deepEqual(ops('close', { operationId: workOp, protocol: 'goal.work' }).data, tomb);
  const committedOp = id(); createTask(g, committedOp);
  assert.equal(ops('close', { operationId: committedOp, protocol: 'goal.work' }).data.state, 'committed');
  // A pending registration ends as not_committed and can no longer submit.
  const pending = id(); register(pending);
  sameShape(ops('lookup', { operationId: pending }).data, fixtures.responses.createRegistered, 'createRegistered');
  const closed = ops('close', { operationId: pending, protocol: 'goal.create' }).data;
  assert.deepEqual([closed.state, closed.reason, closed.revision], ['not_committed', 'closed_by_owner', '2']);
  assert.equal(submit(pending).data.state, 'not_committed');
});

test('a close racing a delayed write is serialized: the first to take the identity wins, once', async () => {
  const g = goal(), op = id();
  const write = asyncSQL(`${as(owner)}begin;select public.goal_work_v1('mutate',${literal(taskCreate(g, op, 'Raced'))});select pg_sleep(1);commit;`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const close = asyncSQL(`${as(owner)}select public.goal_operations_v1('close',${literal({ operationId: op, protocol: 'goal.work' })});`);
  const [, closeOut] = await Promise.all([write, close]);
  assert.equal(JSON.parse(closeOut).data.state, 'committed'); // the write held the identity; close waited and saw its outcome
  assert.equal(count(`public.tasks where goal_id='${g}' and title='Raced'`), 1);
  assert.equal(count(`goal_private.operation_ledger where operation_id='${op}'`), 1);
});

test('one identity space across protocols, per owner', () => {
  const g = goal(), op = id();
  createTask(g, op);
  assert.equal(completeGoal(g, op).error.code, 'OPERATION_PAYLOAD_MISMATCH');
  assert.equal(register(op).error.code, 'OPERATION_PAYLOAD_MISMATCH');
  assert.equal(manual('lookup', { operationId: op }).error.code, 'HISTORY_UNAVAILABLE');
  assert.equal(card('mutation_lookup', { operationId: op }).error.code, 'HISTORY_UNAVAILABLE');
  assert.equal(card('mutation_ack', { operationId: op }).error.code, 'HISTORY_UNAVAILABLE');
  assert.equal(ops('close', { operationId: op, protocol: 'goal.mutate' }).data.protocol, 'goal.work'); // returned unchanged
  // Another owner's identical ID is a separate operation.
  assert.equal(createTask(goal(other), op, other).data.state, 'committed');
});

test('owners are isolated, and a receipt stops naming a Goal that is no longer theirs', () => {
  const g = goal(), op = id();
  createTask(g, op);
  assert.equal(ops('lookup', { operationId: op }, other).error.code, 'HISTORY_UNAVAILABLE');
  assert.equal(ops('ack', { operationId: op, revision: '1' }, other).error.code, 'HISTORY_UNAVAILABLE');
  assert.ok(!ops('discover', {}, other).data.items.some((i) => i.operationId === op));
  // A not_committed outcome on a Goal that is then deleted keeps its receipt but no longer links it.
  const gone = goal(), past = id();
  const yesterday = sql(`select to_char((now() at time zone 'America/New_York')::date - 1,'YYYY-MM-DD');`);
  assert.equal(work('mutate', taskCreate(gone, past, 'Past', yesterday)).data.reason, 'DATE_IN_PAST');
  sql(`delete from public.goals where id='${gone}';`);
  const receipt = ops('lookup', { operationId: past }).data;
  assert.deepEqual([receipt.state, receipt.goalId, receipt.reason], ['not_committed', null, 'DATE_IN_PAST']);
  // Clients never touch the ledger or the retention job directly.
  assert.throws(() => sql(`${as(owner)}select count(*) from goal_private.operation_ledger;`));
  assert.throws(() => sql(`${as(owner)}select goal_private.prune_operations();`));
  assert.throws(() => sql(`set role anon;select public.goal_operations_v1('discover','{}');`));
});

test('retention: 30 days after ack, unacknowledged bounded by age and count, expired registrations, Task engine receipts', () => {
  tombstones(retainer, 1, { recorded: "now() - interval '40 days'", acknowledged: "now() - interval '31 days'" });
  tombstones(retainer, 1, { recorded: "now() - interval '40 days'", acknowledged: "now() - interval '29 days'" });
  tombstones(retainer, 1, { recorded: "now() - interval '181 days'" });
  tombstones(retainer, 1, { recorded: "now() - interval '179 days'" });
  const registered = id();
  sql(`insert into goal_private.operation_ledger(owner_id,operation_id,seq,protocol,operation_type,digest,state,recorded_at,admission_deadline)
    values('${retainer}','${registered}',goal_private.next_operation_seq('${retainer}'),'goal.create','goal.create.manual','${'e'.repeat(64)}',
      'registered',now() - interval '25 hours',now() - interval '1 hour');`);
  tombstones(capper, 505, { recorded: 'now()' });
  const cappedOut = sql(`select string_agg(seq::text, ',' order by seq) from (select seq from goal_private.operation_ledger where owner_id='${capper}' order by seq limit 5) s;`);
  sql(`insert into public.task_mutation_receipts(user_id,idempotency_key,operation,entity_id,created_at) values
    ('${retainer}','old','task.create',gen_random_uuid(),now() - interval '31 days'),('${retainer}','recent','task.create',gen_random_uuid(),now() - interval '1 day');`);

  const result = JSON.parse(sql(`select goal_private.prune_operations();`));
  assert.deepEqual(result, { expired: 1, acknowledged: 1, aged: 1, capped: 5, taskReceipts: 1 });
  assert.equal(count(`goal_private.operation_ledger where owner_id='${retainer}'`), 3); // 29-day ack, 179-day unacked, expired registration
  assert.equal(sql(`select state || ' ' || reason || ' ' || revision from goal_private.operation_ledger where operation_id='${registered}';`),
    'not_committed SUBMISSION_WINDOW_ENDED 2');
  assert.equal(count(`goal_private.operation_ledger where owner_id='${capper}'`), 500);
  assert.equal(count(`goal_private.operation_ledger where owner_id='${capper}' and seq in (${cappedOut})`), 0); // the oldest five went
  assert.deepEqual(sql(`select string_agg(idempotency_key, ',') from public.task_mutation_receipts where user_id='${retainer}';`), 'recent');
  // Bounded batches, and a second run finds nothing left to do.
  tombstones(retainer, 3, { recorded: "now() - interval '200 days'" });
  assert.equal(JSON.parse(sql(`select goal_private.prune_operations(2);`)).aged, 2);
  assert.deepEqual(JSON.parse(sql(`select goal_private.prune_operations();`)), { expired: 0, acknowledged: 0, aged: 1, capped: 0, taskReceipts: 0 });
});

test("retention never removes a Goal's provenance, and the FK refuses a direct delete", () => {
  const op = id();
  register(op);
  const goalId = submit(op).data.goalId;
  sql(`update goal_private.operation_ledger set acknowledged_at = now() - interval '400 days' where operation_id='${op}';`);
  sql(`select goal_private.prune_operations();`);
  assert.equal(count(`goal_private.operation_ledger where operation_id='${op}'`), 1);
  assert.throws(() => sql(`delete from goal_private.operation_ledger where operation_id='${op}';`), /provenance_operation_fkey/);
  assert.equal(manual('header', { goalId }).data.header.id, goalId);
});

test('the retention job is scheduled daily as the migration role', () => {
  assert.equal(sql(`select schedule || ' ' || command || ' ' || username from cron.job where jobname='goal-operation-retention';`),
    '17 3 * * * select goal_private.prune_operations() postgres');
});

test('input is strict before any lookup', () => {
  assert.equal(ops('bogus').error.code, 'INVALID_FIELD');
  assert.equal(ops('lookup', { operationId: 'not-a-uuid' }).error.code, 'INVALID_FIELD');
  assert.equal(ops('lookup', { operationId: id(), extra: 1 }).error.code, 'INVALID_FIELD');
  assert.equal(ops('close', { operationId: id() }).error.code, 'INVALID_FIELD');
  assert.equal(ops('close', { operationId: id(), protocol: 'goal.other' }).error.code, 'INVALID_FIELD');
  assert.equal(ops('ack', { operationId: id(), revision: '1' }).error.code, 'HISTORY_UNAVAILABLE');
  for (const limit of [0, 51]) assert.equal(ops('discover', { limit }).error.code, 'INVALID_FIELD');
  assert.equal(ops('discover', { cursor: 'garbage' }).error.code, 'CURSOR_EXPIRED');
  assert.equal(JSON.parse(sql(`set role authenticated;select public.goal_operations_v1('discover','{}');`)).error.code, 'UNAUTHORIZED');
});

test('account deletion cascades the ledger, provenance included', () => {
  sql(`delete from auth.users where id='${owner}';`);
  assert.equal(count(`goal_private.operation_ledger where owner_id='${owner}'`), 0);
  assert.equal(count(`goal_private.provenance where owner_id='${owner}'`), 0);
});
