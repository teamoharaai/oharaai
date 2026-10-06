import type {
  JournalContextFilter,
  JournalDateRange,
  JournalLibraryItem,
  JournalShareFilter,
  JournalSort,
} from './types';

export interface JournalFilters {
  dateRange: JournalDateRange;
  share: JournalShareFilter;
}

export const EMPTY_JOURNAL_FILTERS: JournalFilters = { dateRange: 'all', share: 'all' };

export function entryMatchesJournalContext(
  entry: JournalLibraryItem,
  context: JournalContextFilter,
): boolean {
  if (context.kind === 'all') return true;
  if (context.kind === 'unlinked') return !entry.project && entry.goals.length === 0;
  if (context.kind === 'goal') return entry.goals.some((goal) => goal.id === context.id);
  return entry.project?.id === context.id
    || entry.goals.some((goal) => goal.projectId === context.id);
}

function entryMatchesDate(entry: JournalLibraryItem, range: JournalDateRange, now: Date): boolean {
  if (range === 'all') return true;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return Date.parse(entry.createdAt) >= now.getTime() - days * 86_400_000;
}

function entryMatchesQuery(entry: JournalLibraryItem, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return [
    entry.plainText,
    entry.project?.title ?? '',
    ...entry.goals.map((goal) => goal.title),
  ].some((value) => value.toLocaleLowerCase().includes(normalized));
}

export function filterJournalEntries(args: {
  context: JournalContextFilter;
  entries: readonly JournalLibraryItem[];
  filters: JournalFilters;
  now?: Date;
  query: string;
  sort: JournalSort;
}): JournalLibraryItem[] {
  const now = args.now ?? new Date();
  return args.entries
    .filter((entry) => entryMatchesJournalContext(entry, args.context))
    .filter((entry) => args.filters.share === 'all' || entry.shareScope === args.filters.share)
    .filter((entry) => entryMatchesDate(entry, args.filters.dateRange, now))
    .filter((entry) => entryMatchesQuery(entry, args.query))
    .sort((left, right) => {
      const difference = Date.parse(right.createdAt) - Date.parse(left.createdAt);
      return args.sort === 'newest' ? difference : -difference;
    });
}

export function journalBrowseCounts(
  entries: readonly JournalLibraryItem[],
  args: Omit<Parameters<typeof filterJournalEntries>[0], 'context' | 'entries' | 'sort'>,
): {
  all: number;
  unlinked: number;
  projects: Map<string, number>;
  goals: Map<string, number>;
} {
  const eligible = filterJournalEntries({
    ...args,
    context: { kind: 'all' },
    entries,
    sort: 'newest',
  });
  const projects = new Map<string, number>();
  const goals = new Map<string, number>();
  for (const entry of eligible) {
    const projectIds = new Set([
      entry.project?.id,
      ...entry.goals.map((goal) => goal.projectId),
    ].filter((id): id is string => Boolean(id)));
    for (const id of projectIds) projects.set(id, (projects.get(id) ?? 0) + 1);
    for (const goal of entry.goals) goals.set(goal.id, (goals.get(goal.id) ?? 0) + 1);
  }
  return {
    all: eligible.length,
    unlinked: eligible.filter((entry) => !entry.project && entry.goals.length === 0).length,
    projects,
    goals,
  };
}
