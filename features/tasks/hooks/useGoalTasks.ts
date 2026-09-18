import { useCallback, useEffect, useRef, useState } from 'react';
import { UnauthorizedError } from '@/lib/api/client';
import { refreshMomentumAfterMeaningfulMutation } from '@/features/momentum/hooks/useMomentumHomeSummary';
import type { Task, TaskCreateInput, TaskOccurrence, TaskUpdateInput } from '../types';
import {
  archiveTask,
  createTask,
  getGoalTasks,
  logCompletedTask,
  mutateTaskOccurrence,
  replaceTaskSchedule,
  updateTask,
} from '../services/task-service';
import {
  beginMutation,
  createMutationRegistry,
  endMutation,
  findOccurrenceTaskId,
  isLatestMutation,
  type OccurrenceAction,
  optimisticQuantityDelta,
  optimisticSetCompleted,
  optimisticSkip,
  patchTaskInList,
  replaceOccurrenceInTasks,
  resetRegistry,
} from '../task-optimism';
import { useTaskBoundaryRefresh } from './useTaskBoundaryRefresh';

// The goal-task fetch occasionally fails on a transient blip (a cold API route,
// a momentary network hiccup) that clears on the next attempt — historically the
// "Tasks could not be loaded" flash that vanished on manual refresh. Retry a
// couple of times with a short backoff before surfacing the error so the panel
// self-heals instead of the user. An UnauthorizedError is not transient
// (authedFetch has already kicked off the sign-out/redirect), so it short-circuits.
async function fetchGoalTasksResilient(goalId: string): Promise<Task[]> {
  const attempts = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await getGoalTasks(goalId);
    } catch (cause) {
      if (cause instanceof UnauthorizedError) throw cause;
      lastError = cause;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Per-goal stale-while-revalidate cache
//
// Tasks used to live in local component state, so every goal switch cleared
// nothing, showed a spinner, and — because a fetch closed over its goalId with
// no ordering guard — a slow response from a goal viewed two switches ago could
// overwrite the goal on screen. This mirrors the goal store / momentum SWR
// pattern (`useMomentumHomeSummary`): a module-level cache keyed by goalId so a
// return-visit paints cached Tasks instantly (matching Milestones, which read
// from the goal store) and revalidates silently, plus a per-goal generation
// guard so an out-of-order or stale fetch can never write into another goal.
// ---------------------------------------------------------------------------

type TaskCacheEntry = { tasks: Task[]; isLoading: boolean; error: string | null; loaded: boolean };

const EMPTY_ENTRY: TaskCacheEntry = { tasks: [], isLoading: true, error: null, loaded: false };

const cache = new Map<string, TaskCacheEntry>();
const listeners = new Map<string, Set<(entry: TaskCacheEntry) => void>>();
const pending = new Map<string, Promise<void>>();
const generation = new Map<string, number>();

function readEntry(goalId: string): TaskCacheEntry {
  return cache.get(goalId) ?? EMPTY_ENTRY;
}

function publishEntry(goalId: string, entry: TaskCacheEntry): void {
  cache.set(goalId, entry);
  const subscribers = listeners.get(goalId);
  if (subscribers) for (const notify of subscribers) notify(entry);
}

function patchEntry(goalId: string, partial: Partial<TaskCacheEntry>): void {
  publishEntry(goalId, { ...readEntry(goalId), ...partial });
}

// Reads the committed task list for a goal — the optimistic-mutation rollback
// snapshot and the base for functional list patches.
function readCachedTasks(goalId: string): Task[] {
  return readEntry(goalId).tasks;
}

function writeCachedTasks(
  goalId: string,
  updater: Task[] | ((current: Task[]) => Task[]),
): void {
  const current = readEntry(goalId);
  const tasks = typeof updater === 'function' ? updater(current.tasks) : updater;
  publishEntry(goalId, { ...current, tasks });
}

// Authoritative (re)load. `isLoading` only flips to true when there is nothing
// cached to paint, so a revalidation of an already-populated goal never flashes
// a spinner. In-flight loads dedupe unless forced; the per-goal generation guard
// drops any response superseded by a newer load of the same goal.
function loadTasks(goalId: string, force = false): Promise<void> {
  const existing = pending.get(goalId);
  if (existing && !force) return existing;

  const gen = (generation.get(goalId) ?? 0) + 1;
  generation.set(goalId, gen);

  // Spinner only until this goal has completed its first load. A revalidation of
  // an already-loaded goal (even one that legitimately has zero tasks) stays
  // silent, so a return-visit never flashes a loader.
  if (!readEntry(goalId).loaded) patchEntry(goalId, { isLoading: true });

  const request = (async () => {
    try {
      const tasks = await fetchGoalTasksResilient(goalId);
      if (generation.get(goalId) !== gen) return; // superseded by a newer load
      publishEntry(goalId, { tasks, isLoading: false, error: null, loaded: true });
    } catch (cause) {
      if (generation.get(goalId) !== gen) return;
      // An UnauthorizedError is already driving a sign-out/redirect; just clear
      // the spinner without surfacing a transient error string.
      patchEntry(goalId, cause instanceof UnauthorizedError
        ? { isLoading: false, loaded: true }
        : { isLoading: false, error: cause instanceof Error ? cause.message : 'Tasks could not be loaded.', loaded: true });
    }
  })();

  pending.set(goalId, request);
  void request.finally(() => {
    if (pending.get(goalId) === request) pending.delete(goalId);
  });
  return request;
}

export function useGoalTasks(goalId: string) {
  const [state, setState] = useState<TaskCacheEntry>(() => cache.get(goalId) ?? EMPTY_ENTRY);

  // Per-occurrence in-flight/ordering registry so a rapid double-tap is one
  // logical mutation and out-of-order responses can never apply.
  const registryRef = useRef(createMutationRegistry());
  useEffect(() => { resetRegistry(registryRef.current); }, [goalId]);

  // Subscribe to this goal's cache slice. On goalId change this re-runs and
  // immediately seeds state from the cache — a previously-visited goal paints its
  // Tasks with no spinner — then revalidates in the background.
  useEffect(() => {
    let subscribers = listeners.get(goalId);
    if (!subscribers) {
      subscribers = new Set();
      listeners.set(goalId, subscribers);
    }
    subscribers.add(setState);
    setState(cache.get(goalId) ?? EMPTY_ENTRY);
    void loadTasks(goalId);
    return () => {
      subscribers!.delete(setState);
      if (subscribers!.size === 0) listeners.delete(goalId);
    };
  }, [goalId]);

  const reload = useCallback(() => loadTasks(goalId, true), [goalId]);

  // Refresh at the next local-day boundary and on app resume/visibility/focus, so
  // today/upcoming/missed sections never go stale without manual navigation.
  useTaskBoundaryRefresh(state.tasks, reload);

  // Background reconciliation of task-level state (e.g. task.status once all its
  // occurrences resolve) after an optimistic occurrence mutation. Silent (no
  // loading flash) and guarded so it never clobbers a still-pending optimistic
  // patch on any occurrence, nor a fresher load of the same goal.
  const silentReload = useCallback(async () => {
    const gen = (generation.get(goalId) ?? 0) + 1;
    generation.set(goalId, gen);
    try {
      const fresh = await fetchGoalTasksResilient(goalId);
      if (generation.get(goalId) !== gen) return;
      if (registryRef.current.pending.size === 0) {
        publishEntry(goalId, { ...readEntry(goalId), tasks: fresh, isLoading: false, loaded: true });
      }
    } catch {
      // A background reconcile failure is non-fatal; the optimistic/occurrence
      // state stands and the next reload (navigation/boundary/focus) reconciles.
    }
  }, [goalId]);

  // Structural mutations (create/edit/archive/schedule) are not high-frequency
  // taps and change list shape, so they keep the simple run-then-reload path.
  const run = useCallback(async (operation: () => Promise<unknown>, meaningful = false) => {
    try {
      await operation();
      await reload();
      if (meaningful) void refreshMomentumAfterMeaningfulMutation();
      return true;
    } catch (cause) {
      patchEntry(goalId, { error: cause instanceof Error ? cause.message : 'Task change could not be saved.' });
      return false;
    }
  }, [goalId, reload]);

  // Optimistic per-occurrence mutation: instant local patch, ordering/in-flight
  // guard, reconcile the authoritative occurrence from the response, rollback on
  // failure (only if still the latest for that occurrence).
  const runOccurrence = useCallback(async (
    occurrenceId: string,
    action: OccurrenceAction,
    optimistic: (task: Task) => Task,
    operation: () => Promise<TaskOccurrence>,
  ): Promise<boolean> => {
    const snapshot = readCachedTasks(goalId);
    const taskId = findOccurrenceTaskId(snapshot, occurrenceId);
    if (taskId === null) {
      // Occurrence not in the local list — fall back to a plain reload path.
      return run(operation, true);
    }
    const registry = registryRef.current;
    const seq = beginMutation(registry, occurrenceId, action);
    if (seq === null) return false; // identical action already in flight (double-tap)

    writeCachedTasks(goalId, patchTaskInList(snapshot, taskId, optimistic));

    try {
      const occurrence = await operation();
      if (isLatestMutation(registry, occurrenceId, seq)) {
        writeCachedTasks(goalId, (current) => replaceOccurrenceInTasks(current, occurrence));
      }
      void refreshMomentumAfterMeaningfulMutation();
      return true;
    } catch (cause) {
      if (isLatestMutation(registry, occurrenceId, seq)) {
        writeCachedTasks(goalId, snapshot);
        patchEntry(goalId, { error: cause instanceof Error ? cause.message : 'Task change could not be saved.' });
      }
      return false;
    } finally {
      endMutation(registry, occurrenceId, seq);
      if (registry.pending.size === 0) void silentReload();
    }
  }, [goalId, run, silentReload]);

  return {
    tasks: state.tasks,
    isLoading: state.isLoading,
    error: state.error,
    clearError: () => patchEntry(goalId, { error: null }),
    reload,
    create: (input: TaskCreateInput) => run(() => createTask(input), true),
    update: (taskId: string, input: TaskUpdateInput) => run(() => updateTask(taskId, input), true),
    archive: (taskId: string) => run(() => archiveTask(taskId), true),
    replaceSchedule: (taskId: string, schedule: Parameters<typeof replaceTaskSchedule>[1], dueDate: string | null, idempotencyKey: string) => run(
      () => replaceTaskSchedule(taskId, schedule, dueDate, idempotencyKey), true,
    ),
    complete: (occurrenceId: string, completed: boolean, idempotencyKey: string) => runOccurrence(
      occurrenceId,
      completed ? 'complete' : 'uncomplete',
      (task) => optimisticSetCompleted(task, occurrenceId, completed, new Date().toISOString()),
      () => mutateTaskOccurrence(occurrenceId, { status: completed ? 'completed' : 'pending', idempotencyKey }),
    ),
    skip: (occurrenceId: string, idempotencyKey: string) => runOccurrence(
      occurrenceId,
      'skip',
      (task) => optimisticSkip(task, occurrenceId, new Date().toISOString()),
      () => mutateTaskOccurrence(occurrenceId, { status: 'skipped', idempotencyKey }),
    ),
    adjustQuantity: (occurrenceId: string, delta: number, idempotencyKey: string) => runOccurrence(
      occurrenceId,
      'quantity',
      (task) => optimisticQuantityDelta(task, occurrenceId, delta, task.targetQuantity, new Date().toISOString()),
      () => mutateTaskOccurrence(occurrenceId, { delta, idempotencyKey }),
    ),
    logCompleted: (input: Parameters<typeof logCompletedTask>[0]) => run(() => logCompletedTask(input), true),
  };
}
