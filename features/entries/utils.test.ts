import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRetrievalDocument,
  entriesForCategory,
  isUnlinkedEntry,
  sortEntriesByRecency,
} from './utils.ts';
import type { EntryRecord } from './types.ts';

function entry(overrides: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: overrides.id ?? 'entry-1',
    userId: overrides.userId ?? 'user-1',
    entryType: overrides.entryType ?? 'note',
    title: overrides.title ?? 'A note',
    content: overrides.content ?? { type: 'doc', blocks: [] },
    plainText: overrides.plainText ?? 'Plain text',
    reflectionType: overrides.reflectionType ?? null,
    conversationTurns: overrides.conversationTurns ?? [],
    takeaway: overrides.takeaway ?? null,
    pinned: overrides.pinned ?? false,
    archived: overrides.archived ?? false,
    contentVersion: overrides.contentVersion ?? 1,
    schemaVersion: overrides.schemaVersion ?? 1,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-01-02T00:00:00Z'),
    goals: overrides.goals ?? [],
    categoryIds: overrides.categoryIds ?? [],
    milestones: overrides.milestones ?? [],
  };
}

test('sorts entries by updatedAt descending', () => {
  const older = entry({ id: 'older', updatedAt: new Date('2026-01-01T00:00:00Z') });
  const newer = entry({ id: 'newer', updatedAt: new Date('2026-01-03T00:00:00Z') });
  assert.deepEqual(sortEntriesByRecency([older, newer]).map((item) => item.id), ['newer', 'older']);
});

test('classifies notes and reflections without goal or category links as unlinked', () => {
  assert.equal(isUnlinkedEntry(entry()), true);
  assert.equal(isUnlinkedEntry(entry({ entryType: 'reflection' })), true);
  assert.equal(isUnlinkedEntry(entry({ categoryIds: ['health'] })), false);
  assert.equal(isUnlinkedEntry(entry({
    goals: [{
      id: 'goal-1',
      title: 'Run',
      category: 'health',
      status: 'active',
      projectId: null,
    }],
  })), false);
});

test('shows mixed entry types in each relevant category without duplicating records', () => {
  const shared = entry({
    id: 'shared',
    goals: [
      { id: 'g1', title: 'Run', category: 'health', status: 'active', projectId: null },
      { id: 'g2', title: 'Study', category: 'education', status: 'active', projectId: null },
    ],
  });
  assert.deepEqual(entriesForCategory([shared, shared], 'health').map((item) => item.id), ['shared']);
  assert.deepEqual(entriesForCategory([shared], 'education').map((item) => item.id), ['shared']);
  const reflection = entry({ id: 'reflection', entryType: 'reflection', categoryIds: ['health'] });
  assert.deepEqual(
    entriesForCategory([shared, reflection], 'health').map((item) => item.id),
    ['shared', 'reflection'],
  );
});

test('normalizes a retrieval document with canonical relationship IDs', () => {
  const source = entry({
    id: 'entry-9',
    categoryIds: ['growth'],
    goals: [{ id: 'g1', title: 'Run', category: 'health', status: 'active', projectId: null }],
    milestones: [{ id: 'm1', goalId: 'g1', title: 'First mile', completedAt: null }],
  });
  const document = buildRetrievalDocument(
    source,
    { health: 'Health & Fitness', growth: 'Personal Growth' },
    ['constellation-1'],
  );
  assert.deepEqual(document.categoryIds, ['growth', 'health']);
  assert.deepEqual(document.goalIds, ['g1']);
  assert.deepEqual(document.milestoneIds, ['m1']);
  assert.deepEqual(document.constellationIds, ['constellation-1']);
});
