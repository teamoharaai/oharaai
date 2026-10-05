import type {
  NoteFolder,
  NotesLibraryItem,
  NotesLibrarySort,
  NotesLibrarySource,
  NotesLibraryView,
} from './types';

export type NotesLibraryFilters = {
  projectId: string | null;
  goalId: string | null;
  authorId: string | null;
  folderId: string | 'unfiled' | null;
  shareScope: NotesLibraryItem['shareScope'] | null;
  sourceType: NotesLibrarySource['itemType'] | null;
  provider: string | null;
  dateRange: '7-days' | '30-days' | null;
};

export const EMPTY_NOTES_LIBRARY_FILTERS: NotesLibraryFilters = {
  projectId: null,
  goalId: null,
  authorId: null,
  folderId: null,
  shareScope: null,
  sourceType: null,
  provider: null,
  dateRange: null,
};

function matchesDateRange(updatedAt: string, dateRange: NotesLibraryFilters['dateRange']): boolean {
  if (!dateRange) return true;
  const age = Date.now() - new Date(updatedAt).getTime();
  const days = dateRange === '7-days' ? 7 : 30;
  return age >= 0 && age <= days * 86_400_000;
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function noteMatchesSearch(note: NotesLibraryItem, query: string, folders: readonly NoteFolder[]): boolean {
  if (!query) return true;
  const folder = note.folderId ? folders.find((candidate) => candidate.id === note.folderId) : null;
  return normalized([
    note.title,
    note.plainText,
    note.author.displayName,
    note.project?.title ?? '',
    ...note.goals.map((goal) => goal.title),
    folder?.name ?? '',
  ].join(' ')).includes(query);
}

function sourceMatchesSearch(source: NotesLibrarySource, query: string): boolean {
  if (!query) return true;
  return normalized([
    source.title,
    source.url ?? '',
    source.fileType ?? '',
    source.provider,
    source.author.displayName,
    source.project?.title ?? '',
    source.goal?.title ?? '',
  ].join(' ')).includes(query);
}

function sortBy<T extends { title: string; createdAt: string; updatedAt: string }>(
  items: readonly T[],
  sort: NotesLibrarySort,
): T[] {
  return [...items].sort((a, b) => {
    if (sort === 'title-asc') return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    const key = sort === 'created-desc' ? 'createdAt' : 'updatedAt';
    return new Date(b[key]).getTime() - new Date(a[key]).getTime();
  });
}

export function selectNotesLibraryItems(args: {
  notes: readonly NotesLibraryItem[];
  folders: readonly NoteFolder[];
  viewerId: string;
  view: Exclude<NotesLibraryView, 'sources'>;
  query: string;
  sort: NotesLibrarySort;
  filters: NotesLibraryFilters;
}): NotesLibraryItem[] {
  const query = normalized(args.query);
  return sortBy(args.notes.filter((note) => {
    if (args.view === 'my-library' && note.ownerId !== args.viewerId) return false;
    if (args.view === 'shared-with-me' && note.ownerId === args.viewerId) return false;
    if (args.view === 'linked-to' && !note.project && note.goals.length === 0) return false;
    if (args.filters.projectId && note.project?.id !== args.filters.projectId
      && !note.goals.some((goal) => goal.projectId === args.filters.projectId)) return false;
    if (args.filters.goalId && !note.goals.some((goal) => goal.id === args.filters.goalId)) return false;
    if (args.filters.authorId && note.ownerId !== args.filters.authorId) return false;
    if (args.filters.folderId === 'unfiled' && note.folderId !== null) return false;
    if (args.filters.folderId && args.filters.folderId !== 'unfiled' && note.folderId !== args.filters.folderId) return false;
    if (args.filters.shareScope && note.shareScope !== args.filters.shareScope) return false;
    if (!matchesDateRange(note.updatedAt, args.filters.dateRange)) return false;
    return noteMatchesSearch(note, query, args.folders);
  }), args.sort);
}

export function selectNotesLibrarySources(args: {
  sources: readonly NotesLibrarySource[];
  query: string;
  sort: NotesLibrarySort;
  filters: NotesLibraryFilters;
}): NotesLibrarySource[] {
  const query = normalized(args.query);
  return sortBy(args.sources.filter((source) => {
    if (args.filters.projectId && source.project?.id !== args.filters.projectId) return false;
    if (args.filters.goalId && source.goal?.id !== args.filters.goalId) return false;
    if (args.filters.authorId && source.ownerId !== args.filters.authorId) return false;
    if (args.filters.sourceType && source.itemType !== args.filters.sourceType) return false;
    if (args.filters.provider && source.provider !== args.filters.provider) return false;
    if (!matchesDateRange(source.updatedAt, args.filters.dateRange)) return false;
    return sourceMatchesSearch(source, query);
  }), args.sort);
}

export function countActiveFilters(filters: NotesLibraryFilters): number {
  return Object.values(filters).filter(Boolean).length;
}
