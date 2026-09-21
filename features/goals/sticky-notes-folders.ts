// Pure helpers for the per-goal Sticky Note folders UI (migration 065). Kept
// framework-free so they can be unit-tested without rendering the panel.
import type { GoalNote } from './types';

/** The virtual General bucket ('general') and the "all notes" view ('all') sit
 *  alongside real folder ids in the folder-bar selection. */
export type FolderSelection = 'all' | 'general' | string;

export function noteMatchesSelection(note: GoalNote, selection: FolderSelection): boolean {
  if (selection === 'all') return true;
  if (selection === 'general') return note.folderId == null;
  return note.folderId === selection;
}

export function filterNotesBySelection(
  notes: readonly GoalNote[],
  selection: FolderSelection,
): GoalNote[] {
  return notes.filter((note) => noteMatchesSelection(note, selection));
}

export function countNotesForSelection(
  notes: readonly GoalNote[],
  selection: FolderSelection,
): number {
  return filterNotesBySelection(notes, selection).length;
}

/** Case-insensitive substring match over a note's title and body. Empty query
 *  returns every note (a copy). */
export function searchNotes(notes: readonly GoalNote[], query: string): GoalNote[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...notes];
  return notes.filter(
    (note) => note.title.toLowerCase().includes(q) || (note.body ?? '').toLowerCase().includes(q),
  );
}

/** Nulls the folder assignment of every note in `folderId` (mirrors the FK
 *  ON DELETE SET NULL — notes fall back to General, never destroyed). */
export function clearFolderFromNotes<T extends { folderId: string | null }>(
  notes: readonly T[],
  folderId: string,
): T[] {
  return notes.map((note) => (note.folderId === folderId ? { ...note, folderId: null } : note));
}

/** Sets `folderId` on the notes whose id is in `noteIds` (null = General). */
export function assignNotesToFolder<T extends { id: string; folderId: string | null }>(
  notes: readonly T[],
  noteIds: readonly string[],
  folderId: string | null,
): T[] {
  const ids = new Set(noteIds);
  return notes.map((note) => (ids.has(note.id) ? { ...note, folderId } : note));
}

/** New ordering of folder ids after nudging `id` one slot left/right. Out-of-range
 *  moves (already at an edge, or unknown id) return the input order unchanged. */
export function reorderFolderIds(
  ids: readonly string[],
  id: string,
  direction: 'left' | 'right',
): string[] {
  const next = [...ids];
  const from = next.indexOf(id);
  if (from === -1) return next;
  const to = direction === 'left' ? from - 1 : from + 1;
  if (to < 0 || to >= next.length) return next;
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
