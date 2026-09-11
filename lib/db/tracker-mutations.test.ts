// Task 5 — shared authenticated tracker-log mutation + prior-phase summary.
//
// Runs under `node --experimental-strip-types --test` with no `@/` map, so this
// suite (and the modules it reaches) use relative imports only (D-004). Database
// access is stubbed through the `TrackerMutationDb` port, so every check here is
// pure orchestration: ownership, successor/read-only rejection, idempotency,
// counter sums, uncomplete-deletes-all, null-cadence rejection, and DTO shape.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mutateTrackerLog,
  periodStateToDto,
  trackerMutationErrorStatus,
  TrackerMutationError,
  type TrackerMutationDb,
  type TrackerMutationMeta,
} from './tracker-mutations.ts';
import type { TrackerPeriodLog } from '../goals/tracker-period.ts';
import { buildPriorPhaseSummary } from '../goals/phase-summary.ts';

const AS_OF = new Date('2026-09-09T12:00:00.000Z');
// Daily cadence in UTC: current period is the 2026-09-09 calendar day.
const CURRENT_PERIOD_LOG = new Date('2026-09-09T08:00:00.000Z');
const PREVIOUS_PERIOD_LOG = new Date('2026-09-08T20:00:00.000Z');

interface FakeOptions {
  hasSuccessor?: boolean;
  owned?: boolean;
  meta?: TrackerMutationMeta | null;
  timezone?: string;
  logs?: TrackerPeriodLog[];
}

interface FakeDb {
  db: TrackerMutationDb;
  inserts: Array<{ trackerId: string; value: number; loggedAtIso: string }>;
  deletes: Array<{ trackerId: string; startIso: string; endIso: string }>;
}

function makeDb(options: FakeOptions = {}): FakeDb {
  const logs = [...(options.logs ?? [])];
  const inserts: FakeDb['inserts'] = [];
  const deletes: FakeDb['deletes'] = [];

  const db: TrackerMutationDb = {
    async hasSuccessor() {
      return options.hasSuccessor ?? false;
    },
    async isGoalOwnedByUser() {
      return options.owned ?? true;
    },
    async getTracker() {
      return options.meta === undefined
        ? { type: 'checklist', targetValue: null, frequency: 'daily' }
        : options.meta;
    },
    async getProfileTimezone() {
      return options.timezone ?? 'UTC';
    },
    async fetchPeriodLogs() {
      // The fake ignores the lower bound; fixtures only include in-window logs.
      return logs.map((log) => ({ ...log }));
    },
    async insertLog(trackerId, value, loggedAtIso) {
      inserts.push({ trackerId, value, loggedAtIso });
      logs.push({ value, loggedAt: new Date(loggedAtIso) });
    },
    async deleteLogsInRange(trackerId, startIso, endIso) {
      deletes.push({ trackerId, startIso, endIso });
      const start = new Date(startIso).getTime();
      const end = new Date(endIso).getTime();
      for (let index = logs.length - 1; index >= 0; index -= 1) {
        const time = logs[index].loggedAt.getTime();
        if (time >= start && time < end) logs.splice(index, 1);
      }
    },
  };

  return { db, inserts, deletes };
}

const BASE = { trackerId: 't1', goalId: 'g1', userId: 'u1' } as const;

async function expectError(
  run: () => Promise<unknown>,
  code: TrackerMutationError['code'],
): Promise<void> {
  await assert.rejects(run, (error: unknown) => {
    assert.ok(error instanceof TrackerMutationError);
    assert.equal(error.code, code);
    return true;
  });
}

// ─── Guard rails: ownership, successor/read-only, existence, cadence ──────────

test('successor/read-only goal is rejected before any write', async () => {
  const { db, inserts } = makeDb({ hasSuccessor: true });
  await expectError(
    () => mutateTrackerLog({ ...BASE, action: 'complete' }, db, AS_OF),
    'GOAL_HAS_SUCCESSOR',
  );
  assert.equal(inserts.length, 0);
});

test('a goal the user does not own is rejected', async () => {
  const { db, inserts } = makeDb({ owned: false });
  await expectError(
    () => mutateTrackerLog({ ...BASE, action: 'complete' }, db, AS_OF),
    'GOAL_NOT_FOUND',
  );
  assert.equal(inserts.length, 0);
});

test('a tracker not in the goal is rejected', async () => {
  const { db } = makeDb({ meta: null });
  await expectError(
    () => mutateTrackerLog({ ...BASE, action: 'complete' }, db, AS_OF),
    'TRACKER_NOT_FOUND',
  );
});

test('null-cadence logging is rejected for every action', async () => {
  for (const action of ['complete', 'counter-log', 'uncomplete'] as const) {
    const type = action === 'counter-log' ? 'counter' : 'checklist';
    const { db, inserts, deletes } = makeDb({
      meta: { type, targetValue: null, frequency: null },
    });
    await expectError(() => mutateTrackerLog({ ...BASE, action }, db, AS_OF), 'CADENCE_NOT_SET');
    assert.equal(inserts.length, 0);
    assert.equal(deletes.length, 0);
  }
});

test('action/type mismatches are rejected', async () => {
  const counterLogOnHabit = makeDb({ meta: { type: 'habit', targetValue: 1, frequency: 'daily' } });
  await expectError(
    () => mutateTrackerLog({ ...BASE, action: 'counter-log' }, counterLogOnHabit.db, AS_OF),
    'INVALID_ACTION',
  );

  const completeOnCounter = makeDb({ meta: { type: 'counter', targetValue: 5, frequency: 'daily' } });
  await expectError(
    () => mutateTrackerLog({ ...BASE, action: 'complete' }, completeOnCounter.db, AS_OF),
    'INVALID_ACTION',
  );

  const uncompleteOnCounter = makeDb({ meta: { type: 'counter', targetValue: 5, frequency: 'daily' } });
  await expectError(
    () => mutateTrackerLog({ ...BASE, action: 'uncomplete' }, uncompleteOnCounter.db, AS_OF),
    'INVALID_ACTION',
  );
});

// ─── Complete: idempotency + value ────────────────────────────────────────────

test('checklist complete inserts one value-1 log and reports completion', async () => {
  const { db, inserts } = makeDb({ meta: { type: 'checklist', targetValue: null, frequency: 'daily' } });
  const result = await mutateTrackerLog({ ...BASE, action: 'complete' }, db, AS_OF);

  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].value, 1);
  assert.equal(inserts[0].loggedAtIso, AS_OF.toISOString());
  assert.equal(result.success, true);
  assert.equal(result.periodState?.isCompleted, true);
  assert.equal(result.periodState?.currentValue, 1);
});

test('habit complete uses a positive target value, else 1', async () => {
  const withTarget = makeDb({ meta: { type: 'habit', targetValue: 3, frequency: 'daily' } });
  await mutateTrackerLog({ ...BASE, action: 'complete' }, withTarget.db, AS_OF);
  assert.equal(withTarget.inserts[0].value, 3);

  const noTarget = makeDb({ meta: { type: 'habit', targetValue: null, frequency: 'daily' } });
  await mutateTrackerLog({ ...BASE, action: 'complete' }, noTarget.db, AS_OF);
  assert.equal(noTarget.inserts[0].value, 1);
});

test('double complete is idempotent — no second log for the current period', async () => {
  const { db, inserts } = makeDb({
    meta: { type: 'checklist', targetValue: null, frequency: 'daily' },
    logs: [{ value: 1, loggedAt: CURRENT_PERIOD_LOG }],
  });
  const result = await mutateTrackerLog({ ...BASE, action: 'complete' }, db, AS_OF);

  assert.equal(inserts.length, 0);
  assert.equal(result.periodState?.isCompleted, true);
});

test('complete inserts even when a previous-period log exists', async () => {
  const { db, inserts } = makeDb({
    meta: { type: 'habit', targetValue: null, frequency: 'daily' },
    logs: [{ value: 1, loggedAt: PREVIOUS_PERIOD_LOG }],
  });
  const result = await mutateTrackerLog({ ...BASE, action: 'complete' }, db, AS_OF);

  assert.equal(inserts.length, 1);
  assert.equal(result.periodState?.isCompleted, true);
});

// ─── Counter logging ──────────────────────────────────────────────────────────

test('two counter +1 taps write two value-1 logs summing to 2', async () => {
  const { db, inserts } = makeDb({ meta: { type: 'counter', targetValue: 5, frequency: 'daily' } });
  await mutateTrackerLog({ ...BASE, action: 'counter-log' }, db, AS_OF);
  const second = await mutateTrackerLog({ ...BASE, action: 'counter-log' }, db, AS_OF);

  assert.equal(inserts.length, 2);
  assert.deepEqual(inserts.map((row) => row.value), [1, 1]);
  assert.equal(second.periodState?.currentValue, 2);
  assert.equal(second.periodState?.isCompleted, false); // 2 < target 5
});

test('counter reaching its target reports completion', async () => {
  const { db } = makeDb({
    meta: { type: 'counter', targetValue: 2, frequency: 'daily' },
    logs: [{ value: 1, loggedAt: CURRENT_PERIOD_LOG }],
  });
  const result = await mutateTrackerLog({ ...BASE, action: 'counter-log' }, db, AS_OF);
  assert.equal(result.periodState?.currentValue, 2);
  assert.equal(result.periodState?.isCompleted, true);
});

test('counter-log accepts a validated positive value and rejects the rest', async () => {
  const explicit = makeDb({ meta: { type: 'counter', targetValue: 10, frequency: 'daily' } });
  await mutateTrackerLog({ ...BASE, action: 'counter-log', value: 4 }, explicit.db, AS_OF);
  assert.equal(explicit.inserts[0].value, 4);

  for (const value of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
    const { db, inserts } = makeDb({ meta: { type: 'counter', targetValue: 10, frequency: 'daily' } });
    await expectError(
      () => mutateTrackerLog({ ...BASE, action: 'counter-log', value }, db, AS_OF),
      'INVALID_VALUE',
    );
    assert.equal(inserts.length, 0);
  }
});

// ─── Uncomplete ───────────────────────────────────────────────────────────────

test('uncomplete deletes ALL current-period logs and flips completion to false', async () => {
  const { db, deletes } = makeDb({
    meta: { type: 'checklist', targetValue: null, frequency: 'daily' },
    // Two duplicate current-period logs (e.g. from retries) plus a prior period.
    logs: [
      { value: 1, loggedAt: CURRENT_PERIOD_LOG },
      { value: 1, loggedAt: new Date('2026-09-09T09:30:00.000Z') },
      { value: 1, loggedAt: PREVIOUS_PERIOD_LOG },
    ],
  });
  const result = await mutateTrackerLog({ ...BASE, action: 'uncomplete' }, db, AS_OF);

  assert.equal(deletes.length, 1);
  assert.equal(result.periodState?.isCompleted, false);
  assert.equal(result.periodState?.currentValue, 0);
  // The previous-period bucket still shows its log (uncomplete cannot reach it).
  const buckets = result.periodState!.recentPeriods;
  assert.equal(buckets[buckets.length - 1].hasLog, false);
  assert.equal(buckets[buckets.length - 2].hasLog, true);
});

test('uncomplete cannot delete a previous-period log', async () => {
  const { db, deletes } = makeDb({
    meta: { type: 'habit', targetValue: null, frequency: 'daily' },
    logs: [{ value: 1, loggedAt: PREVIOUS_PERIOD_LOG }],
  });
  const result = await mutateTrackerLog({ ...BASE, action: 'uncomplete' }, db, AS_OF);

  // The delete is scoped to the current period only; the prior log survives.
  const del = deletes[0];
  assert.ok(new Date(PREVIOUS_PERIOD_LOG).getTime() < new Date(del.startIso).getTime());
  assert.equal(result.periodState?.isCompleted, false);
  const buckets = result.periodState!.recentPeriods;
  assert.equal(buckets[buckets.length - 2].hasLog, true);
});

// ─── DTO shape ────────────────────────────────────────────────────────────────

test('mutation returns {success:true, periodState} with ISO strings and 7 buckets', async () => {
  const { db } = makeDb({ meta: { type: 'checklist', targetValue: null, frequency: 'daily' } });
  const result = await mutateTrackerLog({ ...BASE, action: 'complete' }, db, AS_OF);

  assert.equal(result.success, true);
  const state = result.periodState!;
  assert.equal(typeof state.asOf, 'string');
  assert.equal(state.asOf, AS_OF.toISOString());
  assert.equal(state.timezone, 'UTC');
  assert.equal(typeof state.startInclusive, 'string');
  assert.equal(typeof state.endExclusive, 'string');
  assert.equal(state.recentPeriods.length, 7);
  assert.equal(typeof state.recentPeriods[0].startInclusive, 'string');
});

test('periodStateToDto passes null through for null cadence', () => {
  assert.equal(periodStateToDto(null), null);
});

test('trackerMutationErrorStatus maps causes to HTTP statuses', () => {
  assert.equal(trackerMutationErrorStatus('GOAL_HAS_SUCCESSOR'), 409);
  assert.equal(trackerMutationErrorStatus('GOAL_NOT_FOUND'), 404);
  assert.equal(trackerMutationErrorStatus('TRACKER_NOT_FOUND'), 404);
  assert.equal(trackerMutationErrorStatus('CADENCE_NOT_SET'), 422);
  assert.equal(trackerMutationErrorStatus('INVALID_ACTION'), 400);
  assert.equal(trackerMutationErrorStatus('INVALID_VALUE'), 400);
});

// ─── Prior-phase summary (log-derived, replaces stale current_value) ──────────

test('prior-phase summary derives counter sums, habit/checklist counts from logs', () => {
  const trackers = [
    { id: 'c', title: 'Pushups', type: 'counter' as const, targetValue: 100 },
    { id: 'h', title: 'Meditate', type: 'habit' as const, targetValue: null },
    { id: 'k', title: 'Journal', type: 'checklist' as const, targetValue: null },
    { id: 'empty', title: 'Untouched', type: 'counter' as const, targetValue: 10 },
  ];
  const logs = [
    { trackerId: 'c', value: 20 },
    { trackerId: 'c', value: 30 },
    { trackerId: 'h', value: 1 },
    { trackerId: 'h', value: 1 },
    { trackerId: 'h', value: 1 },
    { trackerId: 'k', value: 1 },
  ];

  assert.deepEqual(buildPriorPhaseSummary(trackers, logs), [
    { title: 'Pushups', achieved: 50, target: 100 },
    { title: 'Meditate', completions: 3 },
    { title: 'Journal', completions: 1 },
    { title: 'Untouched', achieved: 0, target: 10 },
  ]);
});

test('prior-phase counter sum stays correct across >1000 logs', () => {
  const trackers = [{ id: 'c', title: 'Reps', type: 'counter' as const, targetValue: 5000 }];
  const logs = Array.from({ length: 1500 }, () => ({ trackerId: 'c', value: 2 }));
  const [summary] = buildPriorPhaseSummary(trackers, logs);
  assert.deepEqual(summary, { title: 'Reps', achieved: 3000, target: 5000 });
});
