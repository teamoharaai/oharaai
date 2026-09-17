// Goal-activity L1 — pure, source-agnostic, timezone-agnostic derivation.
//
// One derivation, many renders: buildActivityWindow buckets a normalized list of
// engagement events (each already resolved to a LOCAL calendar date by the
// reader) into a contiguous day window. The 7-day MTWTFSS emblem row and the
// GitHub-style heatmap are both pure renders of this output; the future
// weekly-recap pipeline consumes the same shape (TD-006, TD-007).
//
// D-004: this module is reached by a node test, so it uses relative paths and
// `import type` only. Do not add `@/` imports. All timezone resolution happens in
// the reader (lib/db/goal-activity.ts) — this function never calls Date.now() or
// Intl, so it is deterministic from its arguments.

import { addLocalDays } from '../time/zoned-calendar.ts';

export type GoalActivityKind =
  | 'task_completed'       // Phase B
  | 'entry_created'        // Phase C (note or reflection linked to the goal)
  | 'milestone_completed'; // Phase C

/** Stable emblem/`kinds` ordering — the declaration order of GoalActivityKind. */
export const GOAL_ACTIVITY_KIND_ORDER: readonly GoalActivityKind[] = [
  'task_completed',
  'entry_created',
  'milestone_completed',
];

/** One engagement event, already resolved to a LOCAL calendar date by the reader. */
export interface GoalActivityEvent {
  goalId: string;
  kind: GoalActivityKind;
  localDate: string; // 'YYYY-MM-DD' in the user's profile timezone
}

/** One day in the window. Oldest→newest; the last bucket is today. */
export interface ActivityDayBucket {
  date: string;               // 'YYYY-MM-DD' (local)
  isoWeekday: number;         // 1..7 (Mon..Sun) — drives the MTWTFSS row
  kinds: GoalActivityKind[];  // DISTINCT kinds active that day → emblem set
  count: number;              // total events that day → heatmap intensity
  byKind: Record<GoalActivityKind, number>; // per-kind tallies → hover summary
  isToday: boolean;
}

/** A per-kind tally with every kind present at 0. */
function emptyByKind(): Record<GoalActivityKind, number> {
  const tally = {} as Record<GoalActivityKind, number>;
  for (const kind of GOAL_ACTIVITY_KIND_ORDER) tally[kind] = 0;
  return tally;
}

export interface ActivityWindowOptions {
  asOfLocalDate: string; // today in the user's tz ('YYYY-MM-DD')
  days: number;          // 7 for the row; e.g. 63/70/84 for the heatmap
}

/** ISO weekday (1=Mon..7=Sun) of a 'YYYY-MM-DD' string. Pure calendar math. */
function isoWeekdayForYmd(ymd: string): number {
  const [year, month, day] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=Sun..6=Sat
  return dow === 0 ? 7 : dow;
}

/**
 * Buckets engagement events into a contiguous day window.
 *
 * Guarantees:
 * - Emits exactly `days` buckets, contiguous, oldest→newest with today last.
 * - `kinds` is the DISTINCT set of kinds seen that day, in GOAL_ACTIVITY_KIND_ORDER.
 * - Days with no events → `kinds: []`, `count: 0` (never invents history).
 * - Events outside [asOf-(days-1), asOf] are excluded.
 */
export function buildActivityWindow(
  events: readonly GoalActivityEvent[],
  options: ActivityWindowOptions,
): ActivityDayBucket[] {
  const { asOfLocalDate, days } = options;
  if (days < 1) return [];

  const windowStart = addLocalDays(asOfLocalDate, -(days - 1));
  const dates: string[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    dates.push(addLocalDays(windowStart, offset));
  }

  const eventsByDate = new Map<string, GoalActivityEvent[]>();
  for (const event of events) {
    if (event.localDate < windowStart || event.localDate > asOfLocalDate) continue;
    const bucket = eventsByDate.get(event.localDate);
    if (bucket) bucket.push(event);
    else eventsByDate.set(event.localDate, [event]);
  }

  return dates.map((date) => {
    const dayEvents = eventsByDate.get(date) ?? [];
    const byKind = emptyByKind();
    for (const event of dayEvents) byKind[event.kind] += 1;
    return {
      date,
      isoWeekday: isoWeekdayForYmd(date),
      kinds: GOAL_ACTIVITY_KIND_ORDER.filter((kind) => byKind[kind] > 0),
      count: dayEvents.length,
      byKind,
      isToday: date === asOfLocalDate,
    };
  });
}
