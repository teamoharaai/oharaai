import type { MomentumWeekBoundary } from './types.ts';

type DateParts = { day: number; month: number; year: number };

function formatter(timezone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone: timezone,
      year: 'numeric',
    });
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'UTC',
      year: 'numeric',
    });
  }
}

export function normalizeTimezone(timezone: string | null | undefined): string {
  if (!timezone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date(0));
    return timezone;
  } catch {
    return 'UTC';
  }
}

export function zonedDateParts(date: Date, timezone: string): DateParts {
  const values = Object.fromEntries(
    formatter(normalizeTimezone(timezone))
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return { day: values.day, month: values.month, year: values.year };
}

function toYmd(parts: DateParts): string {
  return `${parts.year.toString().padStart(4, '0')}-${parts.month.toString().padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;
}

export function addLocalDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return toYmd({ day: date.getUTCDate(), month: date.getUTCMonth() + 1, year: date.getUTCFullYear() });
}

export function localDateToUtcStart(ymd: string, timezone: string): string {
  const zone = normalizeTimezone(timezone);
  const [year, month, day] = ymd.split('-').map(Number);
  const target = Date.UTC(year, month - 1, day);
  let candidate = target;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = zonedDateParts(new Date(candidate), zone);
    const observed = Date.UTC(parts.year, parts.month - 1, parts.day);
    const difference = target - observed;
    if (difference === 0) break;
    candidate += difference;
  }

  // Midnight offsets can differ from the noon offset around DST. Compare the
  // local hour and minute with the intended 00:00 and make one final correction.
  const timeParts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', hour12: false, minute: '2-digit', timeZone: zone,
    }).formatToParts(new Date(candidate)).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]),
  );
  const localMinutes = (timeParts.hour % 24) * 60 + timeParts.minute;
  candidate -= localMinutes * 60_000;
  return new Date(candidate).toISOString();
}

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

export function localDateForInstant(instant: string, timezone: string): string {
  return toYmd(zonedDateParts(new Date(instant), normalizeTimezone(timezone)));
}
