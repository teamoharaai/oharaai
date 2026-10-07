import type { CalendarItem, CalendarRange } from '../types';

export type CalendarAccessState = 'unavailable' | 'undetermined' | 'denied' | 'granted';

export interface ProviderCalendar {
  id: string;
  title: string;
  allowsModifications: boolean;
}
export interface CalendarProvider {
  id: 'apple' | 'google';
  getAccessState(): Promise<CalendarAccessState>;
  requestAccess(): Promise<CalendarAccessState>;
  listCalendars(): Promise<ProviderCalendar[]>;
  listEvents(range: CalendarRange): Promise<CalendarItem[]>;
  createEvent(input: { title: string; startAt: string; endAt: string | null; allDay: boolean; notes?: string }): Promise<string>;
  updateEvent(eventId: string, input: { title?: string; startAt?: string; endAt?: string | null }): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
}
