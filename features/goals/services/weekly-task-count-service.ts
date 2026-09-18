export interface WeeklyTaskCount {
  done: number;
  target: number;
}

/**
 * This week's Task-occurrence count per goal (owner-tz, Monday-start; CD-003),
 * keyed by goal id. Powers the Today's Focus weekly count. Populated by the Home
 * aggregator (`/api/home/summary` via `useHomeSummary`); goals with no
 * materialized occurrences this week are absent from the map (Today's Focus
 * omits the count rather than showing a wrong number).
 *
 * This module is now the shared type home for weekly Task counts; the former
 * standalone client fetch + `/api/goals/weekly-task-counts` route were folded
 * into the Home aggregator in Stage 2.
 */
export type WeeklyTaskCountsByGoal = Readonly<Record<string, WeeklyTaskCount>>;
