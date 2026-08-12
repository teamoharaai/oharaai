import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRetrievalDocument,
  entriesForCategory,
  isEntryShelfExpanded,
  isUnlinkedEntry,
  prioritizeEntryTypeAnchors,
  sortEntriesByRecency,
  toggleEntryShelfExpansion,
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

test('prioritizes the newest note and newest reflection before a recent-sorted remainder', () => {
  const entries = sortEntriesByRecency([
    entry({ id: 'note-old', entryType: 'note', updatedAt: new Date('2026-01-01T00:00:00Z') }),
    entry({ id: 'reflection-old', entryType: 'reflection', updatedAt: new Date('2026-01-02T00:00:00Z') }),
    entry({ id: 'note-new', entryType: 'note', updatedAt: new Date('2026-01-04T00:00:00Z') }),
    entry({ id: 'reflection-new', entryType: 'reflection', updatedAt: new Date('2026-01-03T00:00:00Z') }),
  ]);

  assert.deepEqual(
    prioritizeEntryTypeAnchors(entries).map((item) => item.id),
    ['note-new', 'reflection-new', 'reflection-old', 'note-old'],
  );
});

test('keeps note and reflection anchors first while preserving alternate sorting for the remainder', () => {
  const alphabetized = [
    entry({ id: 'note-a', categoryIds: ['health'], entryType: 'note', title: 'Alpha', updatedAt: new Date('2026-01-01T00:00:00Z') }),
    entry({ id: 'reflection-b', categoryIds: ['health'], entryType: 'reflection', title: 'Bravo', updatedAt: new Date('2026-01-02T00:00:00Z') }),
    entry({ id: 'reflection-c', categoryIds: ['health'], entryType: 'reflection', title: 'Charlie', updatedAt: new Date('2026-01-04T00:00:00Z') }),
    entry({ id: 'note-d', categoryIds: ['health'], entryType: 'note', title: 'Delta', updatedAt: new Date('2026-01-03T00:00:00Z') }),
  ];

  assert.deepEqual(
    prioritizeEntryTypeAnchors(entriesForCategory(alphabetized, 'health')).map((item) => item.id),
    ['note-d', 'reflection-c', 'note-a', 'reflection-b'],
  );
});

test('handles notes-only, reflections-only, single-entry, and empty shelves without duplicates', () => {
  const olderNote = entry({ id: 'note-old', updatedAt: new Date('2026-01-01T00:00:00Z') });
  const newerNote = entry({ id: 'note-new', updatedAt: new Date('2026-01-03T00:00:00Z') });
  const olderReflection = entry({
    id: 'reflection-old',
    entryType: 'reflection',
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });
  const newerReflection = entry({
    id: 'reflection-new',
    entryType: 'reflection',
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  });

  assert.deepEqual(
    prioritizeEntryTypeAnchors([olderNote, newerNote, newerNote]).map((item) => item.id),
    ['note-new', 'note-old'],
  );
  assert.deepEqual(
    prioritizeEntryTypeAnchors([olderReflection, newerReflection]).map((item) => item.id),
    ['reflection-new', 'reflection-old'],
  );
  assert.deepEqual(prioritizeEntryTypeAnchors([olderNote]).map((item) => item.id), ['note-old']);
  assert.deepEqual(prioritizeEntryTypeAnchors([]), []);
});

test('applies note and reflection priority independently within each category', () => {
  const healthNote = entry({
    id: 'health-note',
    categoryIds: ['health'],
    entryType: 'note',
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  });
  const healthReflection = entry({
    id: 'health-reflection',
    categoryIds: ['health'],
    entryType: 'reflection',
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  });
  const educationNote = entry({
    id: 'education-note',
    categoryIds: ['education'],
    entryType: 'note',
    updatedAt: new Date('2026-01-04T00:00:00Z'),
  });

  assert.deepEqual(
    prioritizeEntryTypeAnchors(entriesForCategory(
      [educationNote, healthReflection, healthNote],
      'health',
    )).map((item) => item.id),
    ['health-note', 'health-reflection'],
  );
  assert.deepEqual(
    prioritizeEntryTypeAnchors(entriesForCategory(
      [educationNote, healthReflection, healthNote],
      'education',
    )).map((item) => item.id),
    ['education-note'],
  );
});

test('defaults populated shelves open and preserves a manual collapse across derived-list changes', () => {
  let state = {};
  assert.equal(isEntryShelfExpanded(state, 'health', 2), true);
  assert.equal(isEntryShelfExpanded(state, 'empty', 0), false);

  state = toggleEntryShelfExpansion(state, 'health');
  assert.equal(isEntryShelfExpanded(state, 'health', 2), false);
  assert.equal(isEntryShelfExpanded(state, 'health', 4), false);

  state = toggleEntryShelfExpansion(state, 'health');
  assert.equal(isEntryShelfExpanded(state, 'health', 4), true);
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
