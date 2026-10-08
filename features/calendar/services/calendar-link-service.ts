import { authedFetch } from '@/lib/api/client';
import type { CalendarExternalLink, CalendarLinkEntityType, CalendarLinkState } from '../external-links';

async function payload(response: Response): Promise<{ data?: CalendarExternalLink | null; error?: string }> {
  return response.json() as Promise<{ data?: CalendarExternalLink | null; error?: string }>;
}

export async function fetchCalendarExternalLink(entityType: CalendarLinkEntityType, entityId: string): Promise<CalendarExternalLink | null> {
  const query = new URLSearchParams({ entityId, entityType, provider: 'apple' });
  const response = await authedFetch(`/api/calendar/links?${query.toString()}`);
  const body = await payload(response);
  if (!response.ok) throw new Error(body.error ?? 'Calendar link could not be loaded');
  return body.data ?? null;
}

export function newCalendarExportOperationKey(): string {
  return `calendar-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function reserveCalendarExternalLink(entityType: CalendarLinkEntityType, entityId: string, calendarId: string, operationKey: string): Promise<CalendarExternalLink> {
  const response = await authedFetch('/api/calendar/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ calendarId, entityId, entityType, operationKey, provider: 'apple' }),
  });
  const body = await payload(response);
  if (!response.ok || !body.data) throw new Error(body.error ?? 'Calendar export could not be reserved');
  return body.data;
}

export async function finalizeCalendarExternalLink(linkId: string, operationKey: string, calendarId: string, eventId: string): Promise<CalendarExternalLink> {
  const response = await authedFetch(`/api/calendar/links/${linkId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ calendarId, eventId, operation: 'finalize', operationKey }),
  });
  const body = await payload(response);
  if (!response.ok || !body.data) throw new Error(body.error ?? 'Calendar export could not be finalized');
  return body.data;
}

export async function markCalendarExternalLink(linkId: string, syncState: Extract<CalendarLinkState, 'failed' | 'missing' | 'unlinked'>): Promise<CalendarExternalLink> {
  const response = await authedFetch(`/api/calendar/links/${linkId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'state', syncState }),
  });
  const body = await payload(response);
  if (!response.ok || !body.data) throw new Error(body.error ?? 'Calendar link could not be updated');
  return body.data;
}
