import { authedFetch } from '@/lib/api/client';

export interface WeeklyTaskCount {
  done: number;
  target: number;
}
export type WeeklyTaskCountsByGoal = Readonly<Record<string, WeeklyTaskCount>>;

// This week's Task-occurrence count per goal (owner-tz, Monday-start) for the
// signed-in user's own goals. Powers the Today's Focus weekly count (CD-003).
// Goals with no materialized occurrences this week are absent from the map.
export async function fetchWeeklyTaskCountsByGoal(): Promise<WeeklyTaskCountsByGoal> {
  const res = await authedFetch('/api/goals/weekly-task-counts');
  if (!res.ok) {
    throw new Error(`weekly-task-counts: server responded with status ${res.status}`);
  }
  const body = (await res.json()) as { counts?: WeeklyTaskCountsByGoal };
  return body.counts ?? {};
}
