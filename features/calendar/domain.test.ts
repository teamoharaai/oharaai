import assert from 'node:assert/strict';
import test from 'node:test';
import { filterCalendarItems, groupCalendarItems, monthBounds, rangeForView } from './domain.ts';
import type { CalendarItem } from './types.ts';

function item(overrides: Partial<CalendarItem>): CalendarItem {
  return {
    id: 'task:one', sourceType: 'task_occurrence', sourceId: 'one', title: 'Walk',
    contextTitle: 'Health', startAt: '2026-10-07', endAt: null, allDay: true,
    timezone: 'America/New_York', provider: 'ohara', calendarId: null, goalId: 'goal-1',
    projectId: null, projectTitle: null, taskId: 'task-1', occurrenceId: 'occ-1',
    isOharaItem: true, isExternal: false, status: 'pending', visibility: 'private',
    ...overrides,
  };
}

test('calendar view ranges are bounded and Monday aligned', () => {
  assert.deepEqual(rangeForView('2026-10-07', 'week', 'America/New_York'), {
    startDate: '2026-10-05', endDate: '2026-10-11', timezone: 'America/New_York',
  });
  assert.deepEqual(monthBounds('2026-02-12'), { startDate: '2026-02-01', endDate: '2026-02-28' });
});

test('filters keep OHARA, external personal, and Project contexts distinct', () => {
  const external = item({ id: 'external:1', sourceType: 'external_event', provider: 'apple', isOharaItem: false, isExternal: true });
  const project = item({ id: 'task:project', projectId: 'project-1' });
  assert.deepEqual(filterCalendarItems([external, project], 'personal').map((row) => row.id), ['external:1']);
  assert.deepEqual(filterCalendarItems([external, project], 'projects').map((row) => row.id), ['task:project']);
});

test('all-day dates remain date-level and timed events sort afterward', () => {
  const rows = groupCalendarItems([
    item({ id: 'timed', allDay: false, startAt: '2026-10-07T13:00:00.000Z' }),
    item({ id: 'all-day' }),
  ]);
  assert.equal(rows[0]?.date, '2026-10-07');
  assert.deepEqual(rows[0]?.items.map((row) => row.id), ['all-day', 'timed']);
});
