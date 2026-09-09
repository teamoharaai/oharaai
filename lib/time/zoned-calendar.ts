// Neutral, timezone-aware calendar primitives shared across features.
//
// Extracted from features/momentum/time.ts so both Momentum and the goal
// tracker-cadence layer derive local calendar boundaries from the same
// DST-correct conversion instead of duplicating it. All functions are pure and
// deterministic from their arguments; none read the server-process timezone.

export type ZonedDateParts = { day: number; month: number; year: number };

// Intl.DateTimeFormat construction is comparatively expensive and is invoked
// once per tracker per period during multi-tracker hydration. Cache formatters
// by normalized timezone so repeated derivations reuse them.
const DATE_PART_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const TIME_PART_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function datePartFormatter(zone: string): Intl.DateTimeFormat {
  let cached = DATE_PART_FORMATTERS.get(zone);
  if (!cached) {
    cached = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone: zone,
      year: 'numeric',
    });
    DATE_PART_FORMATTERS.set(zone, cached);
  }
  return cached;
}

function timePartFormatter(zone: string): Intl.DateTimeFormat {
  let cached = TIME_PART_FORMATTERS.get(zone);
  if (!cached) {
    cached = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      timeZone: zone,
    });
    TIME_PART_FORMATTERS.set(zone, cached);
  }
  return cached;
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

export function zonedDateParts(date: Date, timezone: string): ZonedDateParts {
  const values = Object.fromEntries(
    datePartFormatter(normalizeTimezone(timezone))
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return { day: values.day, month: values.month, year: values.year };
}

export function toYmd(parts: ZonedDateParts): string {
  return `${parts.year.toString().padStart(4, '0')}-${parts.month.toString().padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;
}

export function addLocalDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return toYmd({ day: date.getUTCDate(), month: date.getUTCMonth() + 1, year: date.getUTCFullYear() });
}

// Monday-start (ISO-style) week: returns the YYYY-MM-DD of the Monday on or
// before `ymd`. Pure calendar math; no timezone conversion is involved.
export function startOfIsoWeekYmd(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return addLocalDays(ymd, -daysSinceMonday);
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
    timePartFormatter(zone)
      .formatToParts(new Date(candidate))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  const localMinutes = (timeParts.hour % 24) * 60 + timeParts.minute;
  candidate -= localMinutes * 60_000;
  return new Date(candidate).toISOString();
}

export function localDateForInstant(instant: string, timezone: string): string {
  return toYmd(zonedDateParts(new Date(instant), normalizeTimezone(timezone)));
}
