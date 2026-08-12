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

export function isUnlinkedEntry(entry: EntryRecord): boolean {
  return entry.goals.length === 0 && entry.categoryIds.length === 0;
}

export function uniqueEntries(entries: EntryRecord[]): EntryRecord[] {
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()];
}

export function prioritizeEntryTypeAnchors(entries: EntryRecord[]): EntryRecord[] {
  const unique = uniqueEntries(entries);
  const newestNote = sortEntriesByRecency(
    unique.filter((entry) => entry.entryType === 'note'),
  )[0];
  const newestReflection = sortEntriesByRecency(
    unique.filter((entry) => entry.entryType === 'reflection'),
  )[0];
  const priorityIds = new Set(
    [newestNote?.id, newestReflection?.id].filter((id): id is string => Boolean(id)),
  );

  return [
    ...(newestNote ? [newestNote] : []),
    ...(newestReflection ? [newestReflection] : []),
    ...unique.filter((entry) => !priorityIds.has(entry.id)),
  ];
}

export type EntryShelfExpansionState = Readonly<Record<string, boolean>>;

export function isEntryShelfExpanded(
  state: EntryShelfExpansionState,
  shelfId: string,
  entryCount: number,
): boolean {
  return entryCount > 0 && (state[shelfId] ?? true);
}

export function toggleEntryShelfExpansion(
  state: EntryShelfExpansionState,
  shelfId: string,
): EntryShelfExpansionState {
  return {
    ...state,
    [shelfId]: !(state[shelfId] ?? true),
  };
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
  return uniqueEntries(entries.filter((entry) => categoryIdsForEntry(entry).includes(categoryId)));
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
