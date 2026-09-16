// Pure helpers for task-list cadence-boundary refresh.
//
// Ported from the archived tracker-metrics boundary layer
// (`features/goals/tracker-boundary.ts`). A tracker's derived state went stale at
// its `periodState.endExclusive`; a task list goes stale at the next LOCAL
// MIDNIGHT, because `buildTaskSections` buckets each actionable occurrence into
// today / upcoming relative to `dateInTimeZone(tz, now)` — so at midnight in a
// task's timezone the "today" set shifts and pending occurrences roll to missed.
// These pure functions compute WHEN to refresh; the effect wiring (timer + RN
// foreground + web visibility/focus) lives in useTaskBoundaryRefresh.
//
// D-004 (inherited): value imports are relative, type imports are `import type`,
// so this stays node-testable. No `@/`.

import type { Task } from './types.ts';
import {
  addLocalDays,
  localDateToUtcStart,
  normalizeTimezone,
  toYmd,
  zonedDateParts,
} from '../../lib/time/zoned-calendar.ts';

/** The epoch (ms) of the next local midnight in `timezone` strictly after `now`. */
export function nextLocalMidnightEpoch(timezone: string, now: Date): number {
  const tz = normalizeTimezone(timezone);
  const todayYmd = toYmd(zonedDateParts(now, tz));
  const tomorrowYmd = addLocalDays(todayYmd, 1);
  return new Date(localDateToUtcStart(tomorrowYmd, tz)).getTime();
}

function activeScheduleTimezone(task: Task): string | null {
  return task.schedules.find((schedule) => schedule.isActive)?.timezone ?? null;
}

/**
 * The earliest next-local-midnight epoch across every timezone that has an
 * actionable, DATED occurrence (pending/missed with a `scheduledLocalDate`), or
 * `null` when the list has no such occurrence (only anytime tasks, or nothing
 * actionable — neither shifts at midnight). Timezone precedence matches
 * `buildTaskSections`: occurrence tz → active schedule tz → UTC.
 */
export function earliestTaskBoundaryEpoch(tasks: readonly Task[], now: Date): number | null {
  const timezones = new Set<string>();
  for (const task of tasks) {
    for (const occurrence of task.occurrences) {
      const actionable = occurrence.status === 'pending' || occurrence.status === 'missed';
      if (!actionable || !occurrence.scheduledLocalDate) continue;
      timezones.add(occurrence.scheduleTimezone ?? activeScheduleTimezone(task) ?? 'UTC');
    }
  }
  if (timezones.size === 0) return null;
  let earliest: number | null = null;
  for (const timezone of timezones) {
    const epoch = nextLocalMidnightEpoch(timezone, now);
    if (!Number.isFinite(epoch)) continue;
    if (earliest === null || epoch < earliest) earliest = epoch;
  }
  return earliest;
}

/**
 * Milliseconds until the next boundary refresh should fire, or `null` when there
 * is no dated occurrence to watch. Fires just AFTER the boundary (`padMs`) so the
 * refreshed read lands in the new local day. If the boundary is already past
 * (suspended timer, clock skew), returns `minDelayMs` so a refresh happens soon
 * rather than never — the timer is never trusted alone (resume/focus also fire).
 */
export function computeTaskBoundaryDelayMs(
  tasks: readonly Task[],
  now: Date,
  options: { padMs?: number; minDelayMs?: number } = {},
): number | null {
  const padMs = options.padMs ?? 1000;
  const minDelayMs = options.minDelayMs ?? 1000;
  const earliest = earliestTaskBoundaryEpoch(tasks, now);
  if (earliest === null) return null;
  const delay = earliest - now.getTime() + padMs;
  return Math.max(minDelayMs, delay);
}
