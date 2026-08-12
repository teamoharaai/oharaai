import type { EntryRecord, EntryType } from './types';

export type DashboardEntryPreview = {
  id: string;
  entryType: EntryType;
  title: string;
  excerpt: string;
  linkedGoalTitle: string | null;
  updatedAt: Date;
};

function fallbackTitle(entryType: EntryType): string {
  return entryType === 'reflection' ? 'Reflect on today' : 'Untitled note';
}

export function selectLatestDashboardEntry(
  entries: readonly EntryRecord[],
  entryType: EntryType,
): DashboardEntryPreview | null {
  const entry = entries
    .filter((candidate) => candidate.entryType === entryType && !candidate.archived)
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0];

  if (!entry) return null;

  return {
    id: entry.id,
    entryType,
    title: entry.title.trim() || fallbackTitle(entryType),
    excerpt: (entryType === 'reflection' ? entry.takeaway : null)?.trim()
      || entry.plainText.trim(),
    linkedGoalTitle: entry.goals[0]?.title ?? null,
    updatedAt: entry.updatedAt,
  };
}
