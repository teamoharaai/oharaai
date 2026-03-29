import type { DailyTask } from '../types';

export function useDailyTasks(): { tasks: DailyTask[]; isLoading: boolean } {
  return { tasks: [], isLoading: false };
}
