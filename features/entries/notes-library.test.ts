import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPTY_NOTES_LIBRARY_FILTERS,
  selectNotesLibraryItems,
  selectNotesLibrarySources,
} from './notes-library.ts';
import type { NotesLibraryItem, NotesLibrarySource } from './types.ts';

const note = (overrides: Partial<NotesLibraryItem>): NotesLibraryItem => ({
  id: 'note', ownerId: 'viewer', title: 'Research note', plainText: 'Useful details',
  createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
  project: null, goals: [], author: { id: 'viewer', displayName: 'You', avatarUrl: null },
  shareScope: 'private', viewerRole: 'owner',
  capabilities: { canView: true, canEdit: true, canDelete: true, canChangeShare: true },
  folderId: null, ...overrides,
});

test('My Library, Shared with Me, and Linked to are authorization-preserving projections', () => {
  const notes = [
    note({ id: 'mine' }),
    note({ id: 'shared', ownerId: 'other', author: { id: 'other', displayName: 'Arthur', avatarUrl: null }, shareScope: 'project', capabilities: { canView: true, canEdit: false, canDelete: false, canChangeShare: false } }),
    note({ id: 'linked', project: { id: 'project', title: 'Winter Arc', status: 'active' } }),
    note({ id: 'goal-linked', goals: [{ id: 'goal', title: 'Mobility', projectId: null }] }),
  ];
  const select = (view: 'my-library' | 'shared-with-me' | 'linked-to') => selectNotesLibraryItems({
    notes, folders: [], viewerId: 'viewer', view, query: '', sort: 'updated-desc', filters: EMPTY_NOTES_LIBRARY_FILTERS,
  }).map((item) => item.id);
  assert.deepEqual(select('my-library'), ['mine', 'linked', 'goal-linked']);
  assert.deepEqual(select('shared-with-me'), ['shared']);
  assert.deepEqual(select('linked-to'), ['linked', 'goal-linked']);
});

test('personal folders filter shared Notes without changing canonical relationships', () => {
  const notes = [note({ id: 'filed', ownerId: 'other', folderId: 'research' }), note({ id: 'unfiled' })];
  const filed = selectNotesLibraryItems({
    notes, folders: [{ id: 'research', name: 'Research', sortOrder: 0, createdAt: '', updatedAt: '' }],
    viewerId: 'viewer', view: 'shared-with-me', query: '', sort: 'updated-desc',
    filters: { ...EMPTY_NOTES_LIBRARY_FILTERS, folderId: 'research' },
  });
  const unfiled = selectNotesLibraryItems({
    notes, folders: [], viewerId: 'viewer', view: 'my-library', query: '', sort: 'updated-desc',
    filters: { ...EMPTY_NOTES_LIBRARY_FILTERS, folderId: 'unfiled' },
  });
  assert.deepEqual(filed.map((item) => item.id), ['filed']);
  assert.deepEqual(unfiled.map((item) => item.id), ['unfiled']);
});

test('Sources remain a separate federated projection with provenance search', () => {
  const source: NotesLibrarySource = {
    id: 'source', ownerId: 'viewer', title: 'Training research', itemType: 'document',
    url: null, fileType: 'pdf', provider: 'PDF', visibility: 'private',
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
    project: { id: 'project', title: 'Winter Arc', status: 'active' },
    goal: { id: 'goal', title: 'Mobility', projectId: 'project' },
    author: { id: 'viewer', displayName: 'You', avatarUrl: null },
  };
  assert.deepEqual(selectNotesLibrarySources({ sources: [source], query: 'mobility', sort: 'updated-desc', filters: EMPTY_NOTES_LIBRARY_FILTERS }).map((item) => item.id), ['source']);
  assert.equal(selectNotesLibrarySources({ sources: [source], query: '', sort: 'updated-desc', filters: { ...EMPTY_NOTES_LIBRARY_FILTERS, projectId: 'other' } }).length, 0);
});
