import { useCallback, useEffect, useState } from 'react';
import { refreshMomentumAfterMeaningfulMutation } from '@/features/momentum/hooks/useMomentumHomeSummary';
import type { Task, TaskCreateInput, TaskUpdateInput } from '../types';
import {
  archiveTask,
  createTask,
  getGoalTasks,
  logCompletedTask,
  mutateTaskOccurrence,
  replaceTaskSchedule,
  updateTask,
} from '../services/task-service';

export function useGoalTasks(goalId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    complete: (occurrenceId: string, completed: boolean, idempotencyKey: string) => run(
      () => mutateTaskOccurrence(occurrenceId, { status: completed ? 'completed' : 'pending', idempotencyKey }), true,
    ),
    skip: (occurrenceId: string, idempotencyKey: string) => run(
      () => mutateTaskOccurrence(occurrenceId, { status: 'skipped', idempotencyKey }), true,
    ),
    adjustQuantity: (occurrenceId: string, delta: number, idempotencyKey: string) => run(
      () => mutateTaskOccurrence(occurrenceId, { delta, idempotencyKey }), true,
    ),
    logCompleted: (input: Parameters<typeof logCompletedTask>[0]) => run(() => logCompletedTask(input), true),
  };
}
