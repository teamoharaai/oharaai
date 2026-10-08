import { Platform } from 'react-native';
import * as ExpoCalendar from 'expo-calendar';
import { addLocalDays } from '@/lib/time/zoned-calendar';
import type { CalendarItem, CalendarRange } from '../types';
import type { CalendarAccessState, CalendarEventInput, CalendarProvider, ProviderCalendar } from './types';

function dateAtLocalStart(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Keeps an EventKit all-day value on the device-local calendar day. */
export function localYmd(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function available(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return ExpoCalendar.isAvailableAsync();
}

export function accessFromPermission(permission: Awaited<ReturnType<typeof ExpoCalendar.getCalendarPermissionsAsync>>): CalendarAccessState {
  if (permission.granted) return 'granted';
  if (permission.status === 'undetermined') return 'undetermined';
  // Expo Calendar 55 requests full EventKit access. On iOS 17 it intentionally
  // reports write-only and restricted access as denied because neither permits
  // the bounded reads OHARA promises in its connected state.
  return 'denied';
}

function eventDates(input: Pick<CalendarEventInput, 'allDay' | 'endAt' | 'startAt'>) {
  const startDate = input.allDay ? dateAtLocalStart(input.startAt.slice(0, 10)) : new Date(input.startAt);
  const fallbackEnd = input.allDay
    ? dateAtLocalStart(addLocalDays(input.startAt.slice(0, 10), 1))
    : new Date(startDate.getTime() + 60 * 60 * 1000);
  const endDate = input.endAt
    ? (input.allDay ? dateAtLocalStart(input.endAt.slice(0, 10)) : new Date(input.endAt))
    : fallbackEnd;
  return { endDate, startDate };
}

export const appleEventKitProvider: CalendarProvider = {
  id: 'apple',

  async getAccessState() {
    if (!(await available())) return 'unavailable';
    return accessFromPermission(await ExpoCalendar.getCalendarPermissionsAsync());
  },

  async requestAccess() {
    if (!(await available())) return 'unavailable';
    return accessFromPermission(await ExpoCalendar.requestCalendarPermissionsAsync());
  },

  async listCalendars(): Promise<ProviderCalendar[]> {
    if (await this.getAccessState() !== 'granted') return [];
    const [calendars, defaultCalendar] = await Promise.all([
      ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT),
      ExpoCalendar.getDefaultCalendarAsync().catch(() => null),
    ]);
    return calendars.map((calendar) => ({
      id: calendar.id,
      title: calendar.title,
      allowsModifications: calendar.allowsModifications,
      color: calendar.color ?? null,
      isPrimary: calendar.id === defaultCalendar?.id,
      sourceTitle: calendar.source?.name ?? null,
    }));
  },

  async listEvents(range: CalendarRange, calendars: ProviderCalendar[]): Promise<CalendarItem[]> {
    if (await this.getAccessState() !== 'granted' || calendars.length === 0) return [];
    const titleById = new Map(calendars.map((calendar) => [calendar.id, calendar.title]));
    const events = await ExpoCalendar.getEventsAsync(
      calendars.map((calendar) => calendar.id),
      dateAtLocalStart(range.startDate),
      dateAtLocalStart(addLocalDays(range.endDate, 1)),
    );
    return events.map((event): CalendarItem => ({
      id: `apple:${event.id}`,
      sourceType: 'external_event',
      sourceId: event.id,
      title: event.title || 'Untitled event',
      contextTitle: titleById.get(event.calendarId) ?? 'Personal Calendar',
      startAt: event.allDay ? localYmd(event.startDate) : iso(event.startDate),
      endAt: event.endDate ? (event.allDay ? localYmd(event.endDate) : iso(event.endDate)) : null,
      allDay: event.allDay,
      timezone: event.timeZone || range.timezone,
      provider: 'apple',
      calendarId: event.calendarId,
      goalId: null,
      projectId: null,
      projectTitle: null,
      taskId: null,
      occurrenceId: null,
      isOharaItem: false,
      isExternal: true,
      status: 'active',
      visibility: 'private',
    }));
  },

  async getEvent(eventId) {
    if (await this.getAccessState() !== 'granted') return null;
    try {
      const event = await ExpoCalendar.getEventAsync(eventId);
      return { id: event.id, calendarId: event.calendarId };
    } catch {
      return null;
    }
  },

  async createEvent(input) {
    if (await this.getAccessState() !== 'granted') throw new Error('Calendar access is not granted.');
    const { endDate, startDate } = eventDates(input);
    return ExpoCalendar.createEventAsync(input.calendarId, {
      title: input.title,
      startDate,
      endDate,
      allDay: input.allDay,
      notes: input.notes ?? 'Added from OHARA',
    });
  },

  async updateEvent(eventId, input) {
    const dates = input.startAt
      ? eventDates({ allDay: input.allDay ?? false, endAt: input.endAt ?? null, startAt: input.startAt })
      : null;
    await ExpoCalendar.updateEventAsync(eventId, {
      ...(input.title ? { title: input.title } : {}),
      ...(dates ?? {}),
      ...(typeof input.allDay === 'boolean' ? { allDay: input.allDay } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    });
  },

  async deleteEvent(eventId) {
    await ExpoCalendar.deleteEventAsync(eventId);
  },

  async openEvent(eventId) {
    await ExpoCalendar.openEventInCalendarAsync({ id: eventId });
  },
};
