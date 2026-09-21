import assert from 'node:assert/strict';
import test from 'node:test';
import type { GoalNote } from './types.ts';
import {
  assignNotesToFolder,
  clearFolderFromNotes,
  countNotesForSelection,
  filterNotesBySelection,
  noteMatchesSelection,
  reorderFolderIds,
  searchNotes,
} from './sticky-notes-folders.ts';

function note(overrides: Partial<GoalNote> & { id: string }): GoalNote {
  return {
    goalId: 'goal-1',
    userId: 'user-1',
    title: '',
    body: null,
    photoUrl: null,
    folderId: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  };
}

const notes: GoalNote[] = [
  note({ id: 'n1', title: 'Reading plan', body: 'chapter one', folderId: null }),
  note({ id: 'n2', title: 'Research', body: 'sources for the essay', folderId: 'f1' }),
  note({ id: 'n3', title: 'Ideas', body: null, folderId: 'f1' }),
  note({ id: 'n4', title: 'Receipt', body: 'GROCERIES', folderId: 'f2' }),
];

test('noteMatchesSelection resolves all / general / folder', () => {
  assert.equal(noteMatchesSelection(notes[0], 'all'), true);
  assert.equal(noteMatchesSelection(notes[0], 'general'), true); // folderId null
  assert.equal(noteMatchesSelection(notes[1], 'general'), false);
  assert.equal(noteMatchesSelection(notes[1], 'f1'), true);
  assert.equal(noteMatchesSelection(notes[1], 'f2'), false);
});

test('filterNotesBySelection returns the folder view', () => {
  assert.equal(filterNotesBySelection(notes, 'all').length, 4);
  assert.deepEqual(filterNotesBySelection(notes, 'general').map((n) => n.id), ['n1']);
  assert.deepEqual(filterNotesBySelection(notes, 'f1').map((n) => n.id), ['n2', 'n3']);
  assert.deepEqual(filterNotesBySelection(notes, 'f2').map((n) => n.id), ['n4']);
});

test('countNotesForSelection matches the filtered length', () => {
  assert.equal(countNotesForSelection(notes, 'all'), 4);
  assert.equal(countNotesForSelection(notes, 'general'), 1);
  assert.equal(countNotesForSelection(notes, 'f1'), 2);
});

test('searchNotes matches title and body, case-insensitively', () => {
  assert.deepEqual(searchNotes(notes, 'research').map((n) => n.id), ['n2']); // title
  assert.deepEqual(searchNotes(notes, 'sources').map((n) => n.id), ['n2']); // body
  assert.deepEqual(searchNotes(notes, 'groceries').map((n) => n.id), ['n4']); // case-insensitive body
  assert.equal(searchNotes(notes, 'nothing-here').length, 0);
});

test('searchNotes returns a copy of all notes for an empty query', () => {
  const result = searchNotes(notes, '   ');
  assert.equal(result.length, notes.length);
  assert.notEqual(result, notes); // new array, not the same reference
});

test('reorderFolderIds nudges left/right and no-ops at the edges', () => {
  const ids = ['a', 'b', 'c'];
  assert.deepEqual(reorderFolderIds(ids, 'b', 'left'), ['b', 'a', 'c']);
  assert.deepEqual(reorderFolderIds(ids, 'b', 'right'), ['a', 'c', 'b']);
  assert.deepEqual(reorderFolderIds(ids, 'a', 'left'), ['a', 'b', 'c']); // already first
  assert.deepEqual(reorderFolderIds(ids, 'c', 'right'), ['a', 'b', 'c']); // already last
  assert.deepEqual(reorderFolderIds(ids, 'z', 'left'), ['a', 'b', 'c']); // unknown id
  assert.notEqual(reorderFolderIds(ids, 'b', 'left'), ids); // does not mutate input
});

test('clearFolderFromNotes falls a deleted folder’s notes back to General', () => {
  const result = clearFolderFromNotes(notes, 'f1');
  assert.equal(result.find((n) => n.id === 'n2')!.folderId, null);
  assert.equal(result.find((n) => n.id === 'n3')!.folderId, null);
  assert.equal(result.find((n) => n.id === 'n4')!.folderId, 'f2'); // other folder untouched
  assert.equal(notes.find((n) => n.id === 'n2')!.folderId, 'f1'); // input not mutated
});

test('assignNotesToFolder moves the given ids (null = General)', () => {
  const moved = assignNotesToFolder(notes, ['n1', 'n4'], 'f1');
  assert.equal(moved.find((n) => n.id === 'n1')!.folderId, 'f1');
  assert.equal(moved.find((n) => n.id === 'n4')!.folderId, 'f1');
  assert.equal(moved.find((n) => n.id === 'n2')!.folderId, 'f1'); // unchanged (already f1)
  const toGeneral = assignNotesToFolder(notes, ['n2'], null);
  assert.equal(toGeneral.find((n) => n.id === 'n2')!.folderId, null);
});
