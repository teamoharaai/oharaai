import { useCallback, useEffect, useRef, useState } from 'react';
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

export function useGoalTasks(goalId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Committed task snapshot for optimistic rollback, and a per-occurrence
  // in-flight/ordering registry so a rapid double-tap is one logical mutation and
  // out-of-order responses can never apply.
  const tasksRef = useRef<Task[]>([]);
  const registryRef = useRef(createMutationRegistry());
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { resetRegistry(registryRef.current); }, [goalId]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setTasks(await getGoalTasks(goalId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tasks could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [goalId]);

  useEffect(() => { void reload(); }, [reload]);

  // Refresh at the next local-day boundary and on app resume/visibility/focus, so
  // today/upcoming/missed sections never go stale without manual navigation.
  useTaskBoundaryRefresh(tasks, reload);

  // Background reconciliation of task-level state (e.g. task.status once all its
  // occurrences resolve) after an optimistic occurrence mutation. Silent (no
  // loading flash) and guarded so it never clobbers a still-pending optimistic
  // patch on any occurrence.
  const silentReload = useCallback(async () => {
    try {
      const fresh = await getGoalTasks(goalId);
      if (registryRef.current.pending.size === 0) setTasks(fresh);
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
      setError(cause instanceof Error ? cause.message : 'Task change could not be saved.');
      return false;
    }
  }, [reload]);

  // Optimistic per-occurrence mutation: instant local patch, ordering/in-flight
  // guard, reconcile the authoritative occurrence from the response, rollback on
  // failure (only if still the latest for that occurrence).
  const runOccurrence = useCallback(async (
    occurrenceId: string,
    action: OccurrenceAction,
    optimistic: (task: Task) => Task,
    operation: () => Promise<TaskOccurrence>,
  ): Promise<boolean> => {
    const taskId = findOccurrenceTaskId(tasksRef.current, occurrenceId);
    if (taskId === null) {
      // Occurrence not in the local list — fall back to a plain reload path.
      return run(operation, true);
    }
    const registry = registryRef.current;
    const seq = beginMutation(registry, occurrenceId, action);
    if (seq === null) return false; // identical action already in flight (double-tap)

    const snapshot = tasksRef.current;
    setTasks(patchTaskInList(snapshot, taskId, optimistic));

    try {
      const occurrence = await operation();
      if (isLatestMutation(registry, occurrenceId, seq)) {
        setTasks((current) => replaceOccurrenceInTasks(current, occurrence));
      }
      void refreshMomentumAfterMeaningfulMutation();
      return true;
    } catch (cause) {
      if (isLatestMutation(registry, occurrenceId, seq)) {
        setTasks(snapshot);
        setError(cause instanceof Error ? cause.message : 'Task change could not be saved.');
      }
      return false;
    } finally {
      endMutation(registry, occurrenceId, seq);
      if (registry.pending.size === 0) void silentReload();
    }
  }, [run, silentReload]);

  return {
    tasks,
    isLoading,
    error,
    clearError: () => setError(null),
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
