// Calendar-aligned reshaping of the L1 goal-activity window (design/001 Part B).
//
// The merged ACTIVITY panel is a third render of the SAME buildActivityWindow
// output (see goal-activity.ts) — no extra fetch. Where the raw window is a
// rolling "last N days ending today" strip, these helpers re-anchor it to the
// user's real calendar so the panel can show the CURRENT week (Mon→Sun) and the
// CURRENT month (a true wall-calendar grid) instead of a rolling strip.
//
// One derivation, many renders: this module never reads the DB, never calls
// Date.now()/Intl, and stays deterministic from its arguments. `asOfLocalDate`
// (today in the user's timezone) is supplied by the caller — for the panel it is
// simply the last bucket's date, since the window always ends on today.
//
// D-004: reached by a node test → relative paths + `import type` only.

import type { ActivityDayBucket } from './goal-activity.ts';
import { addLocalDays, startOfIsoWeekYmd } from '../time/zoned-calendar.ts';

/** One calendar day, whether or not it carried activity or even lies in the past. */
export interface CalendarDaySlot {
  date: string; // 'YYYY-MM-DD' (local)
  isoWeekday: number; // 1..7 (Mon..Sun)
  dayOfMonth: number; // 1..31
  count: number; // events that day (0 when none or still in the future)
  isToday: boolean;
  isFuture: boolean; // date > asOf → no data can exist yet (later this week/month)
}

/** The current calendar week, Monday(index 0)→Sunday(index 6) — always 7 slots. */
export interface CurrentWeek {
  slots: CalendarDaySlot[];
  /** Busiest day's count within the week; 0 when empty. Drives intensity scaling. */
  maxCount: number;
}

/** The current calendar month as a Monday-aligned wall-calendar grid. */
export interface CurrentMonth {
  year: number;
  month: number; // 1..12
  /** Oldest→newest week rows, Mon→Sun. `null` = a cell outside the target month. */
  weeks: Array<Array<CalendarDaySlot | null>>;
  /** Busiest in-month day's count; 0 when empty. Drives intensity scaling. */
  maxCount: number;
}

/** ISO weekday (1=Mon..7=Sun) of a 'YYYY-MM-DD' string. Pure calendar math. */
function isoWeekdayForYmd(ymd: string): number {
  const [year, month, day] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=Sun..6=Sat
  return dow === 0 ? 7 : dow;
}

/** date → count lookup over the window's buckets. */
function countsByDate(buckets: readonly ActivityDayBucket[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const bucket of buckets) map.set(bucket.date, bucket.count);
  return map;
}

function makeSlot(date: string, asOf: string, counts: Map<string, number>): CalendarDaySlot {
  const dayOfMonth = Number(date.split('-')[2]);
  const isFuture = date > asOf;
  return {
    date,
    isoWeekday: isoWeekdayForYmd(date),
    dayOfMonth,
    count: isFuture ? 0 : counts.get(date) ?? 0,
    isToday: date === asOf,
    isFuture,
  };
}

function maxOf(slots: ReadonlyArray<CalendarDaySlot | null>): number {
  let max = 0;
  for (const slot of slots) {
    if (slot && slot.count > max) max = slot.count;
  }
  return max;
}

/**
 * Re-anchors the window to the current calendar week (the week containing `asOf`).
 * Emits exactly seven Monday→Sunday slots; days later this week are `isFuture`
 * with `count: 0` so the row keeps a stable layout without inventing history.
 */
export function buildCurrentWeek(
  buckets: readonly ActivityDayBucket[],
  asOfLocalDate: string,
): CurrentWeek {
  const counts = countsByDate(buckets);
  const monday = startOfIsoWeekYmd(asOfLocalDate);
  const slots: CalendarDaySlot[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    slots.push(makeSlot(addLocalDays(monday, offset), asOfLocalDate, counts));
  }
  return { slots, maxCount: maxOf(slots) };
}

/**
 * Re-anchors the window to the current calendar month (the month containing
 * `asOf`), laid out as a Monday-aligned wall calendar. Leading/trailing cells
 * that fall outside the month are `null`; days later this month are `isFuture`.
 */
export function buildCurrentMonth(
  buckets: readonly ActivityDayBucket[],
  asOfLocalDate: string,
): CurrentMonth {
  const counts = countsByDate(buckets);
  const [year, month] = asOfLocalDate.split('-').map(Number);
  const firstOfMonth = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
  const gridStart = startOfIsoWeekYmd(firstOfMonth);

  const weeks: Array<Array<CalendarDaySlot | null>> = [];
  let cursor = gridStart;
  // A Monday-aligned month grid never needs more than six rows.
  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week: Array<CalendarDaySlot | null> = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const [cursorYear, cursorMonth] = cursor.split('-').map(Number);
      const inMonth = cursorYear === year && cursorMonth === month;
      week.push(inMonth ? makeSlot(cursor, asOfLocalDate, counts) : null);
      cursor = addLocalDays(cursor, 1);
    }
    weeks.push(week);
    // Stop once the cursor has advanced past the target month.
    const [nextYear, nextMonth] = cursor.split('-').map(Number);
    if (nextYear > year || (nextYear === year && nextMonth > month)) break;
  }

  return { year, month, weeks, maxCount: maxOf(weeks.flat()) };
}
