// Pure client-side helpers for Task 6 optimistic tracker mutations.
//
// The goal-detail mutation handlers (useGoalDetail) are a React hook and are not
// reachable from `node --experimental-strip-types --test`. So the logic that CAN
// be pure — the optimistic period-state transforms, the completion-value rule
// mirrored from the server, the store patch reducer, and the per-tracker
// in-flight / ordering registry — lives here and is unit-tested directly. The
// hook is a thin shell wiring these to Zustand + `authedFetch`.
//
// D-004: reachable from node tests, so every value import is relative and every
// type import is `import type` (erased at runtime). Do not add `@/` imports.

import type { Tracker, TrackerPeriodState } from './types.ts';

/** The three write intents; mirrors `TrackerLogAction` in lib/db/tracker-mutations. */
export type MutationAction = 'complete' | 'counter-log' | 'uncomplete';

// ─── Completion value (mirror of the server's `completionValue`) ──────────────

/**
 * The value an optimistic habit/checklist completion adds to the current bucket.
 * Mirrors the server: checklist → 1, habit → a positive target else 1. Keeping
 * this identical to the server keeps the optimistic bucket value consistent with
 * the reconciled one, so a successful mutation causes no visible jump.
 */
export function completionValueForTracker(
  type: Tracker['type'],
  targetValue: number | null,
): number {
  if (type === 'checklist') return 1;
  // habit (counters never complete via this path)
  return typeof targetValue === 'number' && targetValue > 0 ? targetValue : 1;
}

// ─── Optimistic period-state transforms ───────────────────────────────────────
//
// Each returns a NEW state (or the same reference when there is nothing to do,
// e.g. a null/unhydrated period). Only the current period (last bucket) changes;
// history buckets are never touched optimistically.

function cloneWithCurrent(
  state: TrackerPeriodState,
): { next: TrackerPeriodState; current: TrackerPeriodState['recentPeriods'][number] } {
  const recentPeriods = state.recentPeriods.map((bucket) => ({ ...bucket }));
  const current = recentPeriods[recentPeriods.length - 1];
  return { next: { ...state, recentPeriods }, current };
}

/** Optimistic habit/checklist complete: current period gains a log and is done. */
export function applyOptimisticComplete(
  state: TrackerPeriodState | null,
  completionValue: number,
): TrackerPeriodState | null {
  if (!state) return state;
  const { next, current } = cloneWithCurrent(state);
  current.hasLog = true;
  current.value += completionValue;
  next.currentValue = current.value;
  next.isCompleted = true;
  return next;
}

/** Optimistic habit/checklist uncomplete: current period is cleared to empty. */
export function applyOptimisticUncomplete(
  state: TrackerPeriodState | null,
): TrackerPeriodState | null {
  if (!state) return state;
  const { next, current } = cloneWithCurrent(state);
  current.hasLog = false;
  current.value = 0;
  next.currentValue = 0;
  next.isCompleted = false;
  return next;
}

/** Optimistic counter +value: bump the current bucket and recompute completion. */
export function applyOptimisticCounter(
  state: TrackerPeriodState | null,
  value: number,
  targetValue: number | null,
): TrackerPeriodState | null {
  if (!state) return state;
  const { next, current } = cloneWithCurrent(state);
  current.value += value;
  current.hasLog = true;
  next.currentValue = current.value;
  next.isCompleted =
    typeof targetValue === 'number' && targetValue > 0 && current.value >= targetValue;
  return next;
}

// ─── Store patch reducer ──────────────────────────────────────────────────────

/**
 * Functional merge of a partial tracker (by id) into a goals array. Unlike a
 * whole-object replace, this preserves every unrelated field on the target
 * tracker and every unrelated tracker/goal — so a concurrent optimistic edit to
 * one field never clobbers another handler's write to a different field.
 */
export function patchTrackerInGoals<
  T extends { id: string },
  G extends { id: string; trackers: T[] },
>(goals: G[], goalId: string, trackerId: string, patch: Partial<T>): G[] {
  return goals.map((goal) => {
    if (goal.id !== goalId) return goal;
    return {
      ...goal,
      trackers: goal.trackers.map((tracker) =>
        tracker.id === trackerId ? { ...tracker, ...patch } : tracker,
      ),
    };
  });
}

// ─── Per-tracker in-flight + ordering registry ────────────────────────────────
//
// One registry instance lives in a ref inside the hook. It gives two guarantees:
//   1. In-flight guard: a second mutation with the SAME action while one is
//      pending is skipped (rapid double-tap complete = one logical completion;
//      the card also disables its button while awaiting).
//   2. Ordering guard: every issued mutation gets a monotonically increasing
//      per-tracker sequence. A response only applies (reconcile OR rollback) if
//      it is still the latest for that tracker, so complete-then-uncomplete can
//      never apply responses out of order regardless of network arrival order.

export interface MutationRegistry {
  /** Latest issued sequence number per tracker id. */
  seq: Map<string, number>;
  /** The currently pending action per tracker id (for the in-flight guard). */
  pending: Map<string, MutationAction>;
}

export function createMutationRegistry(): MutationRegistry {
  return { seq: new Map(), pending: new Map() };
}

/**
 * Reserves a sequence for a new mutation, or returns `null` when an identical
 * action is already in flight for that tracker (the in-flight/double-tap guard).
 * A DIFFERENT action supersedes the pending one (its higher sequence wins).
 */
export function beginMutation(
  registry: MutationRegistry,
  trackerId: string,
  action: MutationAction,
): number | null {
  if (registry.pending.get(trackerId) === action) return null;
  const seq = (registry.seq.get(trackerId) ?? 0) + 1;
  registry.seq.set(trackerId, seq);
  registry.pending.set(trackerId, action);
  return seq;
}

/** True when `seq` is still the latest issued mutation for that tracker. */
export function isLatestMutation(
  registry: MutationRegistry,
  trackerId: string,
  seq: number,
): boolean {
  return registry.seq.get(trackerId) === seq;
}

/** Clears the pending action ONLY if this sequence is still the latest. */
export function endMutation(
  registry: MutationRegistry,
  trackerId: string,
  seq: number,
): void {
  if (registry.seq.get(trackerId) === seq) registry.pending.delete(trackerId);
}

/** Forgets all state for one tracker. */
export function resetTracker(registry: MutationRegistry, trackerId: string): void {
  registry.seq.delete(trackerId);
  registry.pending.delete(trackerId);
}

/** Forgets everything — used when the selected goal changes. */
export function resetRegistry(registry: MutationRegistry): void {
  registry.seq.clear();
  registry.pending.clear();
}
