import type { CalendarItem, CalendarRange } from '../types';

export type CalendarAccessState = 'unavailable' | 'undetermined' | 'denied' | 'restricted' | 'write_only' | 'granted';

export interface ProviderCalendar {
  id: string;
  title: string;
  allowsModifications: boolean;
  color: string | null;
  isPrimary: boolean;
  sourceTitle: string | null;
}
export type CalendarEventInput = {
  calendarId: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  notes?: string;
};
export interface CalendarProvider {
  id: 'apple' | 'google';
  getAccessState(): Promise<CalendarAccessState>;
  requestAccess(): Promise<CalendarAccessState>;
  listCalendars(): Promise<ProviderCalendar[]>;
  listEvents(range: CalendarRange, calendars: ProviderCalendar[]): Promise<CalendarItem[]>;
  getEvent(eventId: string): Promise<{ id: string; calendarId: string } | null>;
  createEvent(input: CalendarEventInput): Promise<string>;
  updateEvent(eventId: string, input: Partial<CalendarEventInput>): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  openEvent(eventId: string): Promise<void>;
}
