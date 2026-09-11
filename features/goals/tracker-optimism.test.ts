import assert from 'node:assert/strict';
import test from 'node:test';
import type { TrackerPeriodState } from '../../lib/goals/tracker-period.ts';
import {
  applyOptimisticComplete,
  applyOptimisticCounter,
  applyOptimisticUncomplete,
  beginMutation,
  completionValueForTracker,
  createMutationRegistry,
  endMutation,
  isLatestMutation,
  patchTrackerInGoals,
  resetRegistry,
} from './tracker-optimism.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function periodState(overrides: Partial<TrackerPeriodState> = {}): TrackerPeriodState {
  const start = new Date('2026-09-07T00:00:00.000Z');
  const end = new Date('2026-09-14T00:00:00.000Z');
  return {
    asOf: new Date('2026-09-11T12:00:00.000Z'),
    timezone: 'UTC',
    startInclusive: start,
    endExclusive: end,
    currentValue: 0,
    isCompleted: false,
    recentPeriods: [
      { startInclusive: new Date('2026-08-31T00:00:00.000Z'), endExclusive: start, value: 0, hasLog: false },
      { startInclusive: start, endExclusive: end, value: 0, hasLog: false },
    ],
    ...overrides,
  };
}

// ─── completionValueForTracker (mirror of the server rule) ────────────────────

test('completion value: checklist is always 1, habit uses positive target else 1', () => {
  assert.equal(completionValueForTracker('checklist', 5), 1);
  assert.equal(completionValueForTracker('habit', 5), 5);
  assert.equal(completionValueForTracker('habit', null), 1);
  assert.equal(completionValueForTracker('habit', 0), 1);
  assert.equal(completionValueForTracker('habit', -3), 1);
});

// ─── Optimistic transforms ────────────────────────────────────────────────────

test('optimistic complete marks the current period logged and completed without mutating the input', () => {
  const before = periodState();
  const after = applyOptimisticComplete(before, 1);
  assert.ok(after);
  assert.equal(after.isCompleted, true);
  assert.equal(after.currentValue, 1);
  const current = after.recentPeriods[after.recentPeriods.length - 1];
  assert.equal(current.hasLog, true);
  assert.equal(current.value, 1);
  // Immutability: the previous state (used for rollback) is untouched.
  assert.equal(before.isCompleted, false);
  assert.equal(before.recentPeriods[1].hasLog, false);
  assert.notEqual(after, before);
});

test('optimistic uncomplete clears the current period', () => {
  const before = periodState({
    currentValue: 1,
    isCompleted: true,
    recentPeriods: [
      { startInclusive: new Date('2026-08-31T00:00:00.000Z'), endExclusive: new Date('2026-09-07T00:00:00.000Z'), value: 0, hasLog: false },
      { startInclusive: new Date('2026-09-07T00:00:00.000Z'), endExclusive: new Date('2026-09-14T00:00:00.000Z'), value: 1, hasLog: true },
    ],
  });
  const after = applyOptimisticUncomplete(before);
  assert.ok(after);
  assert.equal(after.isCompleted, false);
  assert.equal(after.currentValue, 0);
  assert.equal(after.recentPeriods[1].hasLog, false);
  assert.equal(after.recentPeriods[1].value, 0);
  // Prior period untouched.
  assert.equal(after.recentPeriods[0].value, 0);
});

test('optimistic counter bumps the current bucket and completes only at/above a positive target', () => {
  const below = applyOptimisticCounter(periodState({ currentValue: 1 }), 1, 3);
  assert.ok(below);
  assert.equal(below.currentValue, 1);
  assert.equal(below.isCompleted, false);

  const reaches = applyOptimisticCounter(
    periodState({ currentValue: 2, recentPeriods: [
      { startInclusive: new Date('2026-08-31T00:00:00.000Z'), endExclusive: new Date('2026-09-07T00:00:00.000Z'), value: 0, hasLog: false },
      { startInclusive: new Date('2026-09-07T00:00:00.000Z'), endExclusive: new Date('2026-09-14T00:00:00.000Z'), value: 2, hasLog: true },
    ] }),
    1,
    3,
  );
  assert.ok(reaches);
  assert.equal(reaches.currentValue, 3);
  assert.equal(reaches.isCompleted, true);

  // No positive target → never completes on value.
  const noTarget = applyOptimisticCounter(periodState(), 1, null);
  assert.ok(noTarget);
  assert.equal(noTarget.isCompleted, false);
});

test('optimistic transforms are no-ops on a null (unhydrated/null-cadence) period state', () => {
  assert.equal(applyOptimisticComplete(null, 1), null);
  assert.equal(applyOptimisticUncomplete(null), null);
  assert.equal(applyOptimisticCounter(null, 1, 3), null);
});

// ─── patchTrackerInGoals ──────────────────────────────────────────────────────

test('patchTracker merges a partial tracker by id without clobbering unrelated fields, trackers, or goals', () => {
  interface FakeTracker { id: string; title: string; currentValue: number; periodState: unknown; }
  interface FakeGoal { id: string; trackers: FakeTracker[]; }

  const goals: FakeGoal[] = [
    {
      id: 'g1',
      trackers: [
        { id: 't1', title: 'Run', currentValue: 0, periodState: null },
        { id: 't2', title: 'Read', currentValue: 5, periodState: 'keep-me' },
      ],
    },
    { id: 'g2', trackers: [{ id: 't3', title: 'Other', currentValue: 9, periodState: null }] },
  ];

  const next = patchTrackerInGoals<FakeTracker, FakeGoal>(goals, 'g1', 't1', { periodState: 'patched' });

  // Target field changed.
  assert.equal(next[0].trackers[0].periodState, 'patched');
  // Unrelated field on the same tracker preserved.
  assert.equal(next[0].trackers[0].title, 'Run');
  assert.equal(next[0].trackers[0].currentValue, 0);
  // Sibling tracker fully preserved (no clobber).
  assert.equal(next[0].trackers[1].periodState, 'keep-me');
  assert.equal(next[0].trackers[1].currentValue, 5);
  // Other goal untouched by reference.
  assert.equal(next[1], goals[1]);
  // New array (immutable update).
  assert.notEqual(next, goals);
  assert.notEqual(next[0], goals[0]);
});

// ─── Mutation registry: in-flight + ordering guards ───────────────────────────

test('in-flight guard: a second identical action while one is pending is skipped (one logical completion)', () => {
  const reg = createMutationRegistry();
  const first = beginMutation(reg, 't1', 'complete');
  const second = beginMutation(reg, 't1', 'complete');
  assert.equal(first, 1);
  assert.equal(second, null); // rapid double-tap → skipped

  // After the first resolves, a later deliberate complete is allowed again.
  endMutation(reg, 't1', first!);
  const third = beginMutation(reg, 't1', 'complete');
  assert.equal(third, 2);
});

test('a different action supersedes a pending one and its response wins regardless of arrival order', () => {
  const reg = createMutationRegistry();
  // complete issued (seq 1), then uncomplete issued (seq 2) before complete resolves.
  const completeSeq = beginMutation(reg, 't1', 'complete');
  const uncompleteSeq = beginMutation(reg, 't1', 'uncomplete');
  assert.equal(completeSeq, 1);
  assert.equal(uncompleteSeq, 2);

  // complete resolves LAST (out of order): it is no longer the latest → ignored.
  assert.equal(isLatestMutation(reg, 't1', completeSeq!), false);
  // uncomplete is the latest → its response applies.
  assert.equal(isLatestMutation(reg, 't1', uncompleteSeq!), true);

  // Resolving the stale complete must not clear the pending owned by uncomplete.
  endMutation(reg, 't1', completeSeq!);
  assert.equal(reg.pending.get('t1'), 'uncomplete');
  endMutation(reg, 't1', uncompleteSeq!);
  assert.equal(reg.pending.has('t1'), false);
});

test('resetRegistry forgets all per-tracker state on goal change', () => {
  const reg = createMutationRegistry();
  beginMutation(reg, 't1', 'complete');
  beginMutation(reg, 't2', 'counter-log');
  resetRegistry(reg);
  assert.equal(reg.seq.size, 0);
  assert.equal(reg.pending.size, 0);
  // Sequences restart from 1 after reset.
  assert.equal(beginMutation(reg, 't1', 'complete'), 1);
});

// ─── End-to-end handler simulation (optimism + reconcile/rollback + ordering) ──
//
// Mirrors what useGoalDetail does with these pure pieces, without React: a store
// holding one tracker's periodState, driven through the registry + transforms.

interface SimStore { state: TrackerPeriodState | null; }

async function runMutation(
  store: SimStore,
  reg: ReturnType<typeof createMutationRegistry>,
  trackerId: string,
  action: 'complete' | 'uncomplete',
  request: () => Promise<{ ok: boolean; periodState: TrackerPeriodState | null }>,
): Promise<void> {
  const seq = beginMutation(reg, trackerId, action);
  if (seq === null) return;
  const previous = store.state;
  store.state = action === 'complete'
    ? applyOptimisticComplete(previous, 1)
    : applyOptimisticUncomplete(previous);
  try {
    const res = await request();
    if (!res.ok) throw new Error('failed');
    if (isLatestMutation(reg, trackerId, seq)) store.state = res.periodState;
  } catch {
    if (isLatestMutation(reg, trackerId, seq)) store.state = previous; // rollback if latest
  } finally {
    endMutation(reg, trackerId, seq);
  }
}

test('failed optimistic complete restores the prior state (rollback-if-latest)', async () => {
  const store: SimStore = { state: periodState() };
  const reg = createMutationRegistry();
  const prior = store.state;
  await runMutation(store, reg, 't1', 'complete', async () => ({ ok: false, periodState: null }));
  assert.equal(store.state, prior); // fully restored
  assert.equal(store.state?.isCompleted, false);
});

test('complete-then-uncomplete cannot apply responses out of order', async () => {
  const store: SimStore = { state: periodState() };
  const reg = createMutationRegistry();

  const completedServer = applyOptimisticComplete(periodState(), 1);
  const uncompletedServer = applyOptimisticUncomplete(periodState());

  // complete's server response is deliberately delayed so it resolves AFTER
  // uncomplete — the classic out-of-order hazard.
  const complete = runMutation(store, reg, 't1', 'complete', () =>
    new Promise((resolve) => setTimeout(() => resolve({ ok: true, periodState: completedServer }), 20)),
  );
  const uncomplete = runMutation(store, reg, 't1', 'uncomplete', () =>
    Promise.resolve({ ok: true, periodState: uncompletedServer }),
  );

  await Promise.all([complete, uncomplete]);

  // Final state reflects the LAST-issued mutation (uncomplete), not whichever
  // response arrived last.
  assert.equal(store.state?.isCompleted, false);
  assert.equal(store.state, uncompletedServer);
});
