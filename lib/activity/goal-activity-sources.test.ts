import assert from 'node:assert/strict';
import test from 'node:test';
import {
  entryLinkRowsToEvents,
  milestoneRowsToEvents,
  taskOccurrenceRowsToEvents,
  type SourceResolveContext,
} from './goal-activity-sources.ts';

function ctx(overrides: Partial<SourceResolveContext> = {}): SourceResolveContext {
  return { goalId: 'goal-1', profileTimezone: 'UTC', sinceLocalDate: '2026-09-10', ...overrides };
}

// ── task_completed ────────────────────────────────────────────────────────────

test('task occurrences resolve completed_at to the local engagement day', () => {
  const events = taskOccurrenceRowsToEvents(
    [{ completed_at: '2026-09-14T15:00:00Z' }],
    ctx(),
  );
  assert.deepEqual(events, [{ goalId: 'goal-1', kind: 'task_completed', localDate: '2026-09-14' }]);
});

test('task occurrences without completed_at are skipped', () => {
  const events = taskOccurrenceRowsToEvents(
    [{ completed_at: null }, { completed_at: undefined }, {}],
    ctx(),
  );
  assert.deepEqual(events, []);
});

test('task occurrences before sinceLocalDate are dropped', () => {
  const events = taskOccurrenceRowsToEvents(
    [{ completed_at: '2026-09-09T12:00:00Z' }, { completed_at: '2026-09-10T12:00:00Z' }],
    ctx({ sinceLocalDate: '2026-09-10' }),
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].localDate, '2026-09-10');
});

// ── entry_created ─────────────────────────────────────────────────────────────

test('entry links flatten the object join shape and use created_at', () => {
  const events = entryLinkRowsToEvents(
    [{ echo_entries: { created_at: '2026-09-12T08:00:00Z' } }],
    ctx(),
  );
  assert.deepEqual(events, [{ goalId: 'goal-1', kind: 'entry_created', localDate: '2026-09-12' }]);
});

test('entry links flatten the single-element array join shape', () => {
  const events = entryLinkRowsToEvents(
    [{ echo_entries: [{ created_at: '2026-09-13T08:00:00Z' }] }],
    ctx(),
  );
  assert.deepEqual(events, [{ goalId: 'goal-1', kind: 'entry_created', localDate: '2026-09-13' }]);
});

test('entry links with a missing/empty embed are skipped', () => {
  const events = entryLinkRowsToEvents(
    [{ echo_entries: null }, { echo_entries: [] }, {}],
    ctx(),
  );
  assert.deepEqual(events, []);
});

// ── milestone_completed ───────────────────────────────────────────────────────

test('milestones resolve completed_at; pending (null) milestones are skipped', () => {
  const events = milestoneRowsToEvents(
    [{ completed_at: '2026-09-15T10:00:00Z' }, { completed_at: null }],
    ctx(),
  );
  assert.deepEqual(events, [{ goalId: 'goal-1', kind: 'milestone_completed', localDate: '2026-09-15' }]);
});

// ── timezone / DST correctness ────────────────────────────────────────────────

test('an instant near local midnight lands on the correct day per timezone', () => {
  // 2026-09-16T03:30:00Z: in New York (EDT, UTC-4) this is 2026-09-15 23:30 →
  // the 15th; in Tokyo (UTC+9) it is 2026-09-16 12:30 → the 16th.
  const [ny] = milestoneRowsToEvents(
    [{ completed_at: '2026-09-16T03:30:00Z' }],
    ctx({ profileTimezone: 'America/New_York', sinceLocalDate: '2026-09-01' }),
  );
  const [tokyo] = milestoneRowsToEvents(
    [{ completed_at: '2026-09-16T03:30:00Z' }],
    ctx({ profileTimezone: 'Asia/Tokyo', sinceLocalDate: '2026-09-01' }),
  );
  assert.equal(ny.localDate, '2026-09-15');
  assert.equal(tokyo.localDate, '2026-09-16');
});

test('since-filter uses the LOCAL date, not the UTC date', () => {
  // 2026-09-10T02:00:00Z is 2026-09-09 22:00 in New York → local date 2026-09-09,
  // which is before a sinceLocalDate of 2026-09-10 and must be excluded even
  // though its UTC date (the 10th) is inside the window.
  const events = taskOccurrenceRowsToEvents(
    [{ completed_at: '2026-09-10T02:00:00Z' }],
    ctx({ profileTimezone: 'America/New_York', sinceLocalDate: '2026-09-10' }),
  );
  assert.deepEqual(events, []);
});

test('an invalid timezone falls back to UTC bucketing', () => {
  const events = taskOccurrenceRowsToEvents(
    [{ completed_at: '2026-09-14T23:00:00Z' }],
    ctx({ profileTimezone: 'Not/AZone' }),
  );
  assert.equal(events[0].localDate, '2026-09-14');
});
