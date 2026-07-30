import type {
  EntryRecord,
  EntryRetrievalDocument,
  RichTextDocument,
} from './types.ts';

export function createEmptyDocument(): RichTextDocument {
  return {
    type: 'doc',
    blocks: [{ id: `block-${Date.now()}`, type: 'paragraph', text: '' }],
  };
}

export function documentToPlainText(document: RichTextDocument): string {
  return document.blocks
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join('\n');
}

export function sortEntriesByRecency<T extends { updatedAt: Date }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
}

export function isUnlinkedNote(entry: EntryRecord): boolean {
  return entry.entryType === 'note'
    && entry.goals.length === 0
    && entry.categoryIds.length === 0;
}

export function uniqueEntries(entries: EntryRecord[]): EntryRecord[] {
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()];
}

export function categoryIdsForEntry(entry: EntryRecord): string[] {
  return [
    ...new Set([
      ...entry.categoryIds,
      ...entry.goals.map((goal) => goal.category),
    ]),
  ];
}

export function entriesForCategory(
  entries: EntryRecord[],
  categoryId: string,
): EntryRecord[] {
  return sortEntriesByRecency(
    uniqueEntries(entries.filter((entry) => categoryIdsForEntry(entry).includes(categoryId))),
  );
}

export function buildRetrievalDocument(
  entry: EntryRecord,
  categoryNames: Record<string, string>,
  constellationIds: string[] = [],
): EntryRetrievalDocument {
  const categoryIds = categoryIdsForEntry(entry);
  return {
    sourceType: entry.entryType,
    entryId: entry.id,
    userId: entry.userId,
    title: entry.title,
    plainText: entry.plainText,
    goalIds: entry.goals.map((goal) => goal.id),
    goalNames: entry.goals.map((goal) => goal.title),
    categoryIds,
    categoryNames: categoryIds.map((id) => categoryNames[id] ?? id),
    milestoneIds: entry.milestones.map((milestone) => milestone.id),
    constellationIds: [...new Set(constellationIds)],
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    contentVersion: entry.contentVersion,
  };
}
