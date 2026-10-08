import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarLinkIdentity, mapCalendarExternalLink } from './external-links.ts';
import type { CalendarItem } from './types.ts';

const base: CalendarItem = {
  id: 'task-occurrence:occ', sourceType: 'task_occurrence', sourceId: 'occ', title: 'Pull Day',
  contextTitle: 'Winter Arc', startAt: '2026-10-07T21:00:00Z', endAt: null, allDay: false,
  timezone: 'America/New_York', provider: 'ohara', calendarId: null, goalId: 'goal', projectId: 'project',
  projectTitle: 'Winter Arc', taskId: 'task', occurrenceId: 'occ', isOharaItem: true, isExternal: false,
  status: 'pending', visibility: 'project',
};

test('provider identity uses recurring Task occurrence, Milestone, and Goal deadline IDs', () => {
  assert.deepEqual(calendarLinkIdentity(base), { entityType: 'task_occurrence', entityId: 'occ' });
  assert.deepEqual(calendarLinkIdentity({ ...base, occurrenceId: null, sourceId: 'milestone', sourceType: 'milestone' }), { entityType: 'milestone', entityId: 'milestone' });
  assert.deepEqual(calendarLinkIdentity({ ...base, occurrenceId: null, sourceId: 'goal', sourceType: 'goal_deadline' }), { entityType: 'goal_deadline', entityId: 'goal' });
  assert.equal(calendarLinkIdentity({ ...base, sourceType: 'external_event', isExternal: true, isOharaItem: false }), null);
});

test('external link DTO keeps only provider identity and state', () => {
  const mapped = mapCalendarExternalLink({
    id: 'link', entity_type: 'task_occurrence', entity_id: 'occ', provider: 'apple',
    external_calendar_id: 'calendar', external_event_id: 'event', reservation_key: 'operation',
    sync_state: 'active', updated_at: '2026-10-07T12:00:00Z', last_synced_at: '2026-10-07T12:00:00Z',
  });
  assert.deepEqual(mapped, {
    id: 'link', entityType: 'task_occurrence', entityId: 'occ', provider: 'apple',
    externalCalendarId: 'calendar', externalEventId: 'event', reservationKey: 'operation',
    syncState: 'active', updatedAt: '2026-10-07T12:00:00Z', lastSyncedAt: '2026-10-07T12:00:00Z',
  });
});
