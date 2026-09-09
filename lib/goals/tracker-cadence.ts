// Pure, timezone-aware tracker cadence utilities.
//
// A tracker's period bounds are derived deterministically from (frequency,
// reference instant, IANA timezone). All boundaries are half-open:
//   startInclusive <= loggedAt < endExclusive
// and every conversion routes through lib/time/zoned-calendar so DST, month
// length, and year rollover are handled by the one shared algorithm.

import {
  addLocalDays,
  localDateToUtcStart,
  normalizeTimezone,
  startOfIsoWeekYmd,
  toYmd,
  zonedDateParts,
} from '../time/zoned-calendar.ts';

export type TrackerCadence = 'daily' | 'weekly' | 'monthly';

export type PeriodBounds = {
  startInclusive: Date;
  endExclusive: Date;
};

/**
 * The half-open bounds of the cadence period containing `reference`, evaluated
 * in `timezone` (falling back to UTC for invalid zones).
 */
export function getPeriodBounds(
  frequency: TrackerCadence,
  reference: Date,
  timezone: string,
): PeriodBounds {
  const zone = normalizeTimezone(timezone);
  const localYmd = toYmd(zonedDateParts(reference, zone));

  switch (frequency) {
    case 'daily':
      return boundsFromLocalDays(localYmd, addLocalDays(localYmd, 1), zone);

    case 'weekly': {
      const weekStart = startOfIsoWeekYmd(localYmd);
      return boundsFromLocalDays(weekStart, addLocalDays(weekStart, 7), zone);
    }

    case 'monthly': {
      const [year, month] = localYmd.split('-').map(Number);
      const firstOfMonth = toYmd({ year, month, day: 1 });
      const nextYear = month === 12 ? year + 1 : year;
      const nextMonth = month === 12 ? 1 : month + 1;
      const firstOfNextMonth = toYmd({ year: nextYear, month: nextMonth, day: 1 });
      return boundsFromLocalDays(firstOfMonth, firstOfNextMonth, zone);
    }

    default:
      throw new Error(`Unsupported tracker cadence: ${String(frequency)}`);
  }
}

/**
 * `count` consecutive period bounds ending with the period containing
 * `reference`, ordered oldest -> newest. Stepping one millisecond before each
 * period's start lands firmly in the previous period regardless of DST shifts
 * or month length, so contiguity holds across every boundary type.
 */
export function getRecentPeriodBounds(
  frequency: TrackerCadence,
  reference: Date,
  timezone: string,
  count: number,
): PeriodBounds[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Period history count must be a positive integer, received: ${String(count)}`);
  }

  const zone = normalizeTimezone(timezone);
  const periods: PeriodBounds[] = [];
  let cursor = reference;

  for (let index = 0; index < count; index += 1) {
    const bounds = getPeriodBounds(frequency, cursor, zone);
    periods.push(bounds);
    cursor = new Date(bounds.startInclusive.getTime() - 1);
  }

  return periods.reverse();
}

export function isWithinPeriod(loggedAt: Date, bounds: PeriodBounds): boolean {
  const time = loggedAt.getTime();
  return time >= bounds.startInclusive.getTime() && time < bounds.endExclusive.getTime();
}

function boundsFromLocalDays(startYmd: string, endYmd: string, zone: string): PeriodBounds {
  return {
    startInclusive: new Date(localDateToUtcStart(startYmd, zone)),
    endExclusive: new Date(localDateToUtcStart(endYmd, zone)),
  };
}
