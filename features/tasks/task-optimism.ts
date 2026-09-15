// Pure client-side helpers for optimistic task-occurrence mutations.
//
// Ported from the archived tracker-metrics optimism layer
// (`features/goals/tracker-optimism.ts`) onto the canonical `tasks` taxonomy.
// The old layer patched a derived `periodState`; here the authoritative unit is
// a `TaskOccurrence` row, so the transforms patch an occurrence's status /
// quantity in place. The mutation hook (`useGoalTasks`) is a React hook and is
// not reachable from `node --experimental-strip-types --test`, so the logic that
// CAN be pure — the optimistic transforms, the immutable list patchers, and the
// per-occurrence in-flight / ordering registry — lives here and is unit-tested
// directly.
//
// D-004 (inherited): reachable from node tests, so every value import is
// relative and every type import is `import type` (erased at runtime). No `@/`.

import type { Task, TaskOccurrence } from './types.ts';

/** The write intents an occurrence tap can issue. */
export type OccurrenceAction = 'complete' | 'uncomplete' | 'skip' | 'quantity';

// ─── Immutable list / occurrence patchers ─────────────────────────────────────

/**
 * Functional merge of one task (by id) in a task list via an updater. Unlike a
 * whole-object replace this preserves every unrelated task, so a concurrent
 * optimistic edit to one task never clobbers another handler's write.
 */
export function patchTaskInList(
  tasks: readonly Task[],
  taskId: string,
  update: (task: Task) => Task,
): Task[] {
  return tasks.map((task) => (task.id === taskId ? update(task) : task));
}

/** Returns a NEW task with one occurrence (by id) shallow-merged with `patch`. */
export function patchOccurrence(
  task: Task,
  occurrenceId: string,
  patch: Partial<TaskOccurrence>,
): Task {
  return {
    ...task,
    occurrences: task.occurrences.map((occurrence) =>
      occurrence.id === occurrenceId ? { ...occurrence, ...patch } : occurrence,
    ),
  };
}

/** The id of the task owning `occurrenceId`, or `null` if none holds it. */
export function findOccurrenceTaskId(
  tasks: readonly Task[],
  occurrenceId: string,
): string | null {
  for (const task of tasks) {
    if (task.occurrences.some((occurrence) => occurrence.id === occurrenceId)) return task.id;
  }
  return null;
}

/**
 * Reconciles the authoritative occurrence returned by the server into the list
 * (by occurrence id), replacing the optimistic copy. Unrelated occurrences,
 * tasks, and task-level fields are untouched.
 */
export function replaceOccurrenceInTasks(
  tasks: readonly Task[],
  occurrence: TaskOccurrence,
): Task[] {
  return tasks.map((task) =>
    task.id === occurrence.taskId
      ? patchOccurrence(task, occurrence.id, occurrence)
      : task,
  );
}

// ─── Optimistic occurrence transforms ─────────────────────────────────────────
//
// Each returns a NEW task (never mutating the input, which is the rollback
// snapshot). They mirror the server's derivation so a successful mutation causes
// no visible jump when the authoritative occurrence lands.

/** Complete or re-open a binary occurrence. */
export function optimisticSetCompleted(
  task: Task,
  occurrenceId: string,
  completed: boolean,
  nowIso: string,
): Task {
  return patchOccurrence(task, occurrenceId, {
    status: completed ? 'completed' : 'pending',
    completedAt: completed ? nowIso : null,
    skippedAt: null,
  });
}

/** Skip an occurrence. */
export function optimisticSkip(task: Task, occurrenceId: string, nowIso: string): Task {
  return patchOccurrence(task, occurrenceId, {
    status: 'skipped',
    skippedAt: nowIso,
    completedAt: null,
  });
}

/**
 * Apply a quantity delta to an occurrence and recompute its completion, mirroring
 * the server: quantity never drops below 0, and the occurrence is complete only
 * at/above a positive `targetQuantity` (no target → never auto-completes on
 * value, so status stays pending unless already completed).
 */
export function optimisticQuantityDelta(
  task: Task,
  occurrenceId: string,
  delta: number,
  targetQuantity: number | null,
  nowIso: string,
): Task {
  const occurrence = task.occurrences.find((item) => item.id === occurrenceId);
  if (!occurrence) return task;
  const nextQuantity = Math.max(0, (occurrence.actualQuantity ?? 0) + delta);
  const completed =
    typeof targetQuantity === 'number' && targetQuantity > 0 && nextQuantity >= targetQuantity;
  return patchOccurrence(task, occurrenceId, {
    actualQuantity: nextQuantity,
    status: completed ? 'completed' : 'pending',
    completedAt: completed ? nowIso : null,
  });
}

// ─── Per-occurrence in-flight + ordering registry ─────────────────────────────
//
// One registry instance lives in a ref inside the hook. It gives two guarantees:
//   1. In-flight guard: a second mutation with the SAME action while one is
//      pending is skipped (rapid double-tap complete = one logical completion).
//   2. Ordering guard: every issued mutation gets a monotonically increasing
//      per-occurrence sequence. A response only applies (reconcile OR rollback)
//      if it is still the latest for that occurrence, so complete-then-uncomplete
//      can never apply responses out of order regardless of arrival order.

export interface MutationRegistry {
  /** Latest issued sequence number per occurrence id. */
  seq: Map<string, number>;
  /** The currently pending action per occurrence id (for the in-flight guard). */
  pending: Map<string, OccurrenceAction>;
}

export function createMutationRegistry(): MutationRegistry {
  return { seq: new Map(), pending: new Map() };
}

/**
 * Reserves a sequence for a new mutation, or returns `null` when an identical
 * action is already in flight for that occurrence (the double-tap guard). A
 * DIFFERENT action supersedes the pending one (its higher sequence wins).
 */
export function beginMutation(
  registry: MutationRegistry,
  occurrenceId: string,
  action: OccurrenceAction,
): number | null {
  if (registry.pending.get(occurrenceId) === action) return null;
  const seq = (registry.seq.get(occurrenceId) ?? 0) + 1;
  registry.seq.set(occurrenceId, seq);
  registry.pending.set(occurrenceId, action);
  return seq;
}

/** True when `seq` is still the latest issued mutation for that occurrence. */
export function isLatestMutation(
  registry: MutationRegistry,
  occurrenceId: string,
  seq: number,
): boolean {
  return registry.seq.get(occurrenceId) === seq;
}

/** Clears the pending action ONLY if this sequence is still the latest. */
export function endMutation(
  registry: MutationRegistry,
  occurrenceId: string,
  seq: number,
): void {
  if (registry.seq.get(occurrenceId) === seq) registry.pending.delete(occurrenceId);
}

/** Forgets everything — used when the selected goal changes. */
export function resetRegistry(registry: MutationRegistry): void {
  registry.seq.clear();
  registry.pending.clear();
}
