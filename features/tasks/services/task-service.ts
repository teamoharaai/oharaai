import { authedFetch } from '@/lib/api/client';
import type {
  Task,
  TaskCreateInput,
  TaskMigrationComparison,
  TaskOccurrence,
  TaskScheduleInput,
  TaskUpdateInput,
} from '../types';

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json() as { data?: T; error?: string };
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error ?? 'Task request failed');
  }
  return payload.data;
}

export async function getGoalTasks(goalId: string): Promise<Task[]> {
  return readJson<Task[]>(await authedFetch(`/api/tasks?goal_id=${encodeURIComponent(goalId)}`));
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  return readJson<Task>(await authedFetch('/api/tasks', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }));
}

export async function updateTask(taskId: string, input: TaskUpdateInput): Promise<Task> {
  return readJson<Task>(await authedFetch(`/api/tasks/${taskId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }));
}

export async function archiveTask(taskId: string): Promise<void> {
  await readJson<{ id: string }>(await authedFetch(`/api/tasks/${taskId}/archive`, { method: 'POST' }));
}

export async function replaceTaskSchedule(
  taskId: string,
  schedule: TaskScheduleInput | null,
  dueDate: string | null,
  idempotencyKey: string,
): Promise<void> {
  await readJson<{ scheduleId: string | null }>(await authedFetch(`/api/tasks/${taskId}/schedule`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule, dueDate, idempotencyKey }),
  }));
}

export async function mutateTaskOccurrence(
  occurrenceId: string,
  input: { status?: 'pending' | 'completed' | 'skipped'; quantity?: number; delta?: number; idempotencyKey: string },
): Promise<TaskOccurrence> {
  return readJson<TaskOccurrence>(await authedFetch(`/api/task-occurrences/${occurrenceId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }));
}

export async function logCompletedTask(input: Omit<TaskCreateInput, 'dueDate' | 'schedule'> & {
  completedAt: string;
  actualQuantity?: number | null;
}): Promise<Task> {
  return readJson<Task>(await authedFetch('/api/tasks/log-completed', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }));
}

export async function getTaskMigrationComparison(goalId: string): Promise<TaskMigrationComparison> {
  return readJson<TaskMigrationComparison>(await authedFetch(`/api/tasks/compare?goal_id=${encodeURIComponent(goalId)}`));
}
