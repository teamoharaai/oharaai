import { authedFetch } from '@/lib/api/client';
import type { CalendarItem, CalendarRange } from '../types';

export async function fetchCalendarItems(range: CalendarRange): Promise<CalendarItem[]> {
  const query = new URLSearchParams({
    start: range.startDate,
    end: range.endDate,
    timezone: range.timezone,
  });
  const response = await authedFetch(`/api/calendar/items?${query.toString()}`);
  const payload = await response.json() as { data?: CalendarItem[]; error?: string };
  if (!response.ok || !payload.data) throw new Error(payload.error ?? 'Calendar could not be loaded');
  return payload.data;
}
