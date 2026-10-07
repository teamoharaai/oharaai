import { Platform } from 'react-native';
import * as ExpoCalendar from 'expo-calendar';
import { addLocalDays } from '@/lib/time/zoned-calendar';
import type { CalendarItem, CalendarRange } from '../types';
import type { CalendarAccessState, CalendarProvider, ProviderCalendar } from './types';

function dateAtLocalStart(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function available(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  return ExpoCalendar.isAvailableAsync();
}

function accessFromPermission(permission: Awaited<ReturnType<typeof ExpoCalendar.getCalendarPermissionsAsync>>): CalendarAccessState {
  if (permission.granted) return 'granted';
  return permission.status === 'undetermined' ? 'undetermined' : 'denied';
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
    const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
    return calendars.map((calendar) => ({
      id: calendar.id,
      title: calendar.title,
      allowsModifications: calendar.allowsModifications,
    }));
  },

  async listEvents(range: CalendarRange): Promise<CalendarItem[]> {
    if (await this.getAccessState() !== 'granted') return [];
    const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
    if (!calendars.length) return [];
    const titleById = new Map(calendars.map((calendar) => [calendar.id, calendar.title]));
    const events = await ExpoCalendar.getEventsAsync(
      calendars.map((calendar) => calendar.id),
      dateAtLocalStart(range.startDate),
      dateAtLocalStart(addLocalDays(range.endDate, 1)),
    );
    return events.map((event): CalendarItem => ({
      id: `apple:${event.id}:${iso(event.startDate)}`,
      sourceType: 'external_event',
      sourceId: event.id,
      title: event.title || 'Untitled event',
      contextTitle: titleById.get(event.calendarId) ?? 'Apple Calendar',
      startAt: event.allDay ? iso(event.startDate).slice(0, 10) : iso(event.startDate),
      endAt: event.endDate ? (event.allDay ? iso(event.endDate).slice(0, 10) : iso(event.endDate)) : null,
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

  async createEvent(input) {
    if (await this.getAccessState() !== 'granted') throw new Error('Calendar access is not granted.');
    const calendar = await ExpoCalendar.getDefaultCalendarAsync();
    const startDate = input.allDay ? dateAtLocalStart(input.startAt.slice(0, 10)) : new Date(input.startAt);
    const fallbackEnd = input.allDay
      ? dateAtLocalStart(addLocalDays(input.startAt.slice(0, 10), 1))
      : new Date(startDate.getTime() + 60 * 60 * 1000);
    return ExpoCalendar.createEventAsync(calendar.id, {
      title: input.title,
      startDate,
      endDate: input.endAt ? (input.allDay ? dateAtLocalStart(input.endAt.slice(0, 10)) : new Date(input.endAt)) : fallbackEnd,
      allDay: input.allDay,
      notes: input.notes ?? 'Added from OHARA',
    });
  },

  async updateEvent(eventId, input) {
    await ExpoCalendar.updateEventAsync(eventId, {
      ...(input.title ? { title: input.title } : {}),
      ...(input.startAt ? { startDate: new Date(input.startAt) } : {}),
      ...(input.endAt ? { endDate: new Date(input.endAt) } : {}),
    });
  },

  async deleteEvent(eventId) {
    await ExpoCalendar.deleteEventAsync(eventId);
  },
};
