import {
  addLocalDays,
  localDateToUtcStart,
  normalizeTimezone,
  toYmd,
  zonedDateParts,
} from '../../lib/time/zoned-calendar.ts';
import type { MomentumWeekBoundary } from './types.ts';

// Timezone-aware calendar primitives now live in the neutral
// lib/time/zoned-calendar module. Re-export the ones existing Momentum callers
// import from here so their import paths remain unchanged.
export {
  addLocalDays,
  localDateForInstant,
  localDateToUtcStart,
  normalizeTimezone,
  zonedDateParts,
} from '../../lib/time/zoned-calendar.ts';

export function getMomentumWeek(date: Date, timezone: string): MomentumWeekBoundary {
  const zone = normalizeTimezone(timezone);
  const local = zonedDateParts(date, zone);
  const localYmd = toYmd(local);
  const weekday = new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const weekStart = addLocalDays(localYmd, -daysSinceMonday);
  const nextWeekStart = addLocalDays(weekStart, 7);
  return {
    startInclusive: localDateToUtcStart(weekStart, zone),
    endExclusive: localDateToUtcStart(nextWeekStart, zone),
    weekStart,
    weekEnd: addLocalDays(weekStart, 6),
    timezone: zone,
  };
}

export function getPreviousMomentumWeek(date: Date, timezone: string): MomentumWeekBoundary {
  const current = getMomentumWeek(date, timezone);
  return getMomentumWeek(new Date(new Date(current.startInclusive).getTime() - 1), current.timezone);
}
