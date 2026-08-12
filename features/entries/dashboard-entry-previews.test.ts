import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntryRecord, EntryType } from './types.ts';
import { selectLatestDashboardEntry } from './dashboard-entry-previews.ts';

function entry(
  id: string,
  entryType: EntryType,
  updatedAt: string,
  overrides: Partial<EntryRecord> = {},
): EntryRecord {
  return {
    id,
    userId: 'user-1',
    entryType,
    title: `${entryType} ${id}`,
    content: { type: 'doc', blocks: [] },
    plainText: `${entryType} excerpt`,
    reflectionType: entryType === 'reflection' ? 'open' : null,
    conversationTurns: [],
    takeaway: null,
    pinned: false,
    archived: false,
    contentVersion: 1,
    schemaVersion: 1,
    completedAt: null,
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    updatedAt: new Date(updatedAt),
    goals: [],
    categoryIds: [],
    milestones: [],
    ...overrides,
  };
}

test('selects Notes and Reflections independently by updated_at', () => {
  const entries = [
    entry('old-note', 'note', '2026-08-01T12:00:00.000Z'),
    entry('reflection', 'reflection', '2026-08-03T12:00:00.000Z'),
    entry('new-note', 'note', '2026-08-02T12:00:00.000Z'),
  ];

  assert.equal(selectLatestDashboardEntry(entries, 'note')?.id, 'new-note');
  assert.equal(selectLatestDashboardEntry(entries, 'reflection')?.id, 'reflection');
});

test('uses explicit goal links and never infers a link from category or text', () => {
  const linked = entry('linked', 'note', '2026-08-02T12:00:00.000Z', {
    goals: [{ id: 'goal-1', title: 'Linked goal', category: 'education', status: 'active', projectId: null }],
    categoryIds: ['education'],
  });
  const unlinked = entry('unlinked', 'reflection', '2026-08-03T12:00:00.000Z', {
    plainText: 'Linked goal is mentioned here.',
    categoryIds: ['education'],
  });

  assert.equal(selectLatestDashboardEntry([linked], 'note')?.linkedGoalTitle, 'Linked goal');
  assert.equal(selectLatestDashboardEntry([unlinked], 'reflection')?.linkedGoalTitle, null);
});

test('excludes archived entries and uses truthful empty states', () => {
  const archived = entry('archived', 'note', '2026-08-03T12:00:00.000Z', { archived: true });
  assert.equal(selectLatestDashboardEntry([archived], 'note'), null);
});
