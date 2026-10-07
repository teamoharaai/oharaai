import { addLocalDays, startOfIsoWeekYmd } from '../../lib/time/zoned-calendar.ts';
import type { CalendarFilter, CalendarItem, CalendarRange, CalendarView } from './types';

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function todayYmd(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function monthBounds(ymd: string): { startDate: string; endDate: string } {
  const [year, month] = ymd.split('-').map(Number);
  const startDate = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(year, month, 0));
  const endDate = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`;
  return { startDate, endDate };
}

export function rangeForView(anchorDate: string, view: CalendarView, timezone = deviceTimezone()): CalendarRange {
  if (view === 'today') return { startDate: anchorDate, endDate: anchorDate, timezone };
  if (view === 'week') {
    const startDate = startOfIsoWeekYmd(anchorDate);
    return { startDate, endDate: addLocalDays(startDate, 6), timezone };
  }
  return { ...monthBounds(anchorDate), timezone };
}

export function moveCalendarAnchor(anchorDate: string, view: CalendarView, direction: -1 | 1): string {
  if (view === 'today') return addLocalDays(anchorDate, direction);
  if (view === 'week') return addLocalDays(anchorDate, direction * 7);
  const [year, month] = anchorDate.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1 + direction, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export function calendarItemLocalDate(item: CalendarItem): string {
  if (item.allDay) return item.startAt.slice(0, 10);
  const instant = new Date(item.startAt);
  if (Number.isNaN(instant.getTime())) return item.startAt.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function filterCalendarItems(items: readonly CalendarItem[], filter: CalendarFilter): CalendarItem[] {
  if (filter === 'all') return [...items];
  if (filter === 'ohara') return items.filter((item) => item.isOharaItem);
  if (filter === 'personal') return items.filter((item) => item.isExternal);
  return items.filter((item) => item.isOharaItem && item.projectId !== null);
}

export function groupCalendarItems(items: readonly CalendarItem[]): Array<{ date: string; items: CalendarItem[] }> {
  const grouped = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const date = calendarItemLocalDate(item);
    grouped.set(date, [...(grouped.get(date) ?? []), item]);
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => ({
      date,
      items: rows.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return a.startAt.localeCompare(b.startAt);
      }),
    }));
}
