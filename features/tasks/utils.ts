import type { Task, TaskOccurrence, TaskSections } from './types';

export const TASK_WEEKDAYS = [
  { value: 1, short: 'Mon' },
  { value: 2, short: 'Tue' },
  { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' },
  { value: 5, short: 'Fri' },
  { value: 6, short: 'Sat' },
  { value: 7, short: 'Sun' },
] as const;

export function dateInTimeZone(timezone: string, instant = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

export function activeTaskSchedule(task: Task) {
  return task.schedules.find((schedule) => schedule.isActive) ?? null;
}

/**
 * Daily cadence = an active schedule that recurs every day. Daily Tasks live in
 * Today only and never enter Upcoming (design 003 / TD-021) — their future is
 * already defined, so a `next <tomorrow>` row is meaningless spam.
 */
export function isDailyCadence(task: Task): boolean {
  return activeTaskSchedule(task)?.recurrenceKind === 'daily';
}

export function scheduleLabel(task: Task): string {
  const schedule = activeTaskSchedule(task);
  if (!schedule) return task.dueDate ? `Due ${task.dueDate}` : 'No deadline';
  if (schedule.recurrenceKind === 'daily') {
    return schedule.intervalCount === 1 ? 'Daily' : `Every ${schedule.intervalCount} days`;
  }
  const days = TASK_WEEKDAYS.filter((day) => schedule.weekdays.includes(day.value))
    .map((day) => day.short)
    .join(' · ');
  return schedule.intervalCount === 1 ? days : `Every ${schedule.intervalCount} weeks · ${days}`;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function shortDate(localDate: string | null): string {
  if (!localDate) return '';
  const [year, month, day] = localDate.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day || month < 1 || month > 12) return localDate;
  return `${SHORT_MONTHS[month - 1]} ${day}`;
}

function occurrenceSortValue(occurrence: TaskOccurrence): string {
  return `${occurrence.scheduledLocalDate ?? '9999-12-31'}T${occurrence.scheduledLocalTime ?? '23:59:59'}`;
}

export function buildTaskSections(tasks: readonly Task[], now = new Date()): TaskSections {
  const sections: TaskSections = { today: [], upcoming: [], anytime: [], completed: [] };
  for (const task of tasks) {
    const dailyCadence = isDailyCadence(task);
    const actionable = task.occurrences.filter((occurrence) =>
      occurrence.status === 'pending' || occurrence.status === 'missed',
    );
    for (const occurrence of actionable) {
      const timezone = occurrence.scheduleTimezone
        ?? activeTaskSchedule(task)?.timezone
        ?? 'UTC';
      const today = dateInTimeZone(timezone, now);
      if (!occurrence.scheduledLocalDate) {
        sections.anytime.push({ task, occurrence });
      } else if (
        occurrence.scheduledLocalDate === today
        || (occurrence.scheduleId === null && occurrence.scheduledLocalDate < today)
      ) {
        sections.today.push({ task, occurrence });
      } else if (occurrence.scheduledLocalDate > today && !dailyCadence) {
        // Daily Tasks never enter Upcoming (TD-021): their next occurrence is
        // always tomorrow, which is noise. Upcoming is fed only by On-set-days
        // next occurrences (and rolled Completions, once Phase 3 lands).
        sections.upcoming.push({ task, occurrence });
      }
    }
    for (const occurrence of task.occurrences.filter((item) => item.status === 'completed')) {
      sections.completed.push({ task, occurrence });
    }
  }
  sections.today.sort((a, b) => occurrenceSortValue(a.occurrence).localeCompare(occurrenceSortValue(b.occurrence)));
  sections.upcoming.sort((a, b) => occurrenceSortValue(a.occurrence).localeCompare(occurrenceSortValue(b.occurrence)));
  sections.anytime.sort((a, b) => a.task.sortOrder - b.task.sortOrder || a.task.createdAt.localeCompare(b.task.createdAt));
  sections.completed.sort((a, b) => (b.occurrence.completedAt ?? '').localeCompare(a.occurrence.completedAt ?? ''));
  // Collapse Upcoming to one row per task: its earliest future actionable
  // occurrence. Upcoming is already ordered by occurrenceSortValue above, so the
  // first entry seen per task.id is the earliest, and cross-task ordering by next
  // date is preserved (TD-002).
  const seenUpcoming = new Set<string>();
  sections.upcoming = sections.upcoming.filter(({ task }) => {
    if (seenUpcoming.has(task.id)) return false;
    seenUpcoming.add(task.id);
    return true;
  });
  return sections;
}

export function newTaskIdempotencyKey(prefix = 'task'): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${random}`;
}
