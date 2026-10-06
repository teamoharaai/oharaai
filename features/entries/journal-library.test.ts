import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPTY_JOURNAL_FILTERS,
  filterJournalEntries,
  journalBrowseCounts,
} from './journal-library.ts';
import type { JournalLibraryItem } from './types.ts';

const project = { id: 'project-1', title: 'Winter Arc', status: 'active' };
const goal = { id: 'goal-1', title: 'Ego Lifting', category: 'Health & Fitness' as const, status: 'active', projectId: project.id };
const item = (overrides: Partial<JournalLibraryItem>): JournalLibraryItem => ({
  id: 'entry', ownerId: 'viewer', title: 'Journal Entry', plainText: 'A calm training day.',
  reflectionType: 'open', completedAt: '2026-10-01T12:00:00Z', createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-01T12:00:00Z', contentVersion: 1, project: null, goals: [], shareScope: 'private',
  capabilities: { canView: true, canEdit: true, canDelete: true, canChangeShare: true }, echoOwned: false,
  ...overrides,
});

test('Project browsing includes direct and Goal-owned entries without duplicates', () => {
  const entries = [
    item({ id: 'direct', project }),
    item({ id: 'goal-owned', goals: [goal] }),
    item({ id: 'both', project, goals: [goal] }),
    item({ id: 'unlinked' }),
  ];
  const selected = filterJournalEntries({
    context: { kind: 'project', id: project.id }, entries,
    filters: EMPTY_JOURNAL_FILTERS, query: '', sort: 'newest',
  });
  assert.deepEqual(selected.map((entry) => entry.id).sort(), ['both', 'direct', 'goal-owned']);
  const counts = journalBrowseCounts(entries, { filters: EMPTY_JOURNAL_FILTERS, query: '' });
  assert.equal(counts.projects.get(project.id), 3);
  assert.equal(counts.goals.get(goal.id), 2);
  assert.equal(counts.unlinked, 1);
});

test('search, sharing, date, and sort stay inside the selected Journal context', () => {
  const entries = [
    item({ id: 'new-guide', plainText: 'Mobility improved.', project, goals: [goal], shareScope: 'guide', createdAt: '2026-10-04T12:00:00Z' }),
    item({ id: 'old-guide', plainText: 'Mobility baseline.', project, goals: [goal], shareScope: 'guide', createdAt: '2026-07-01T12:00:00Z' }),
    item({ id: 'private', plainText: 'Mobility private.', project, goals: [goal], shareScope: 'private', createdAt: '2026-10-03T12:00:00Z' }),
    item({ id: 'elsewhere', plainText: 'Mobility elsewhere.', createdAt: '2026-10-05T12:00:00Z' }),
  ];
  const selected = filterJournalEntries({
    context: { kind: 'goal', id: goal.id }, entries,
    filters: { dateRange: '30d', share: 'guide' }, query: 'mobility', sort: 'oldest',
    now: new Date('2026-10-05T12:00:00Z'),
  });
  assert.deepEqual(selected.map((entry) => entry.id), ['new-guide']);
});

test('Unlinked means no canonical Project and no Goal relationship', () => {
  const entries = [item({ id: 'none' }), item({ id: 'project', project }), item({ id: 'goal', goals: [goal] })];
  const selected = filterJournalEntries({ context: { kind: 'unlinked' }, entries, filters: EMPTY_JOURNAL_FILTERS, query: '', sort: 'newest' });
  assert.deepEqual(selected.map((entry) => entry.id), ['none']);
});
