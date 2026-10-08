import type { CalendarItem } from './types';

export type CalendarLinkEntityType = 'task_occurrence' | 'milestone' | 'goal_deadline';
export type CalendarLinkState = 'creating' | 'active' | 'missing' | 'failed' | 'unlinked';

export type CalendarExternalLink = {
  id: string;
  entityType: CalendarLinkEntityType;
  entityId: string;
  provider: 'apple';
  externalCalendarId: string | null;
  externalEventId: string | null;
  reservationKey: string | null;
  syncState: CalendarLinkState;
  updatedAt: string;
  lastSyncedAt: string | null;
};

export function calendarLinkIdentity(item: CalendarItem): { entityType: CalendarLinkEntityType; entityId: string } | null {
  if (item.sourceType === 'task_occurrence' && item.occurrenceId) {
    return { entityType: 'task_occurrence', entityId: item.occurrenceId };
  }
  if (item.sourceType === 'milestone') return { entityType: 'milestone', entityId: item.sourceId };
  if (item.sourceType === 'goal_deadline') return { entityType: 'goal_deadline', entityId: item.sourceId };
  return null;
}

export function mapCalendarExternalLink(row: Record<string, unknown>): CalendarExternalLink {
  return {
    id: String(row.id),
    entityType: row.entity_type as CalendarLinkEntityType,
    entityId: String(row.entity_id),
    provider: 'apple',
    externalCalendarId: typeof row.external_calendar_id === 'string' ? row.external_calendar_id : null,
    externalEventId: typeof row.external_event_id === 'string' ? row.external_event_id : null,
    reservationKey: typeof row.reservation_key === 'string' ? row.reservation_key : null,
    syncState: row.sync_state as CalendarLinkState,
    updatedAt: String(row.updated_at),
    lastSyncedAt: typeof row.last_synced_at === 'string' ? row.last_synced_at : null,
  };
}
