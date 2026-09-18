import type {
  EntryRecord,
  EntryRetrievalDocument,
  EntryType,
  RichTextDocument,
} from './types.ts';

export type EchoLibraryFilter = 'all' | EntryType;

export function isEchoLibraryFilter(value: unknown): value is EchoLibraryFilter {
  return value === 'all' || value === 'note' || value === 'reflection';
}

export function resolveEchoLibraryFilter(
  value: string | string[] | undefined,
  projectId?: string,
  selectedEntryType?: EntryType,
): EchoLibraryFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (isEchoLibraryFilter(candidate)) {
    return candidate;
  }
  if (selectedEntryType) return selectedEntryType;
  return projectId ? 'all' : 'note';
}

/** UUID v4 request key for retry-safe Entry creation on web and native clients. */
export function createEntryRequestId(): string {
  const nativeUuid = globalThis.crypto?.randomUUID?.();
  if (nativeUuid) return nativeUuid;

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

export function createEmptyDocument(): RichTextDocument {
  return {
    type: 'doc',
    schemaVersion: 2,
    content: [{
      type: 'paragraph',
      attrs: { id: `block-${Date.now()}` },
    }],
  };
}

export function documentToPlainText(document: RichTextDocument): string {
  if (document.schemaVersion === 2 && document.content) {
    const lines: string[] = [];
    const visit = (node: import('./types.ts').RichTextNode) => {
      if (node.type === 'text' && node.text) lines.push(node.text);
      if (node.type === 'hardBreak') lines.push('\n');
      node.content?.forEach(visit);
      if (['paragraph', 'heading', 'listItem', 'taskItem', 'goalCard'].includes(node.type)) {
        lines.push('\n');
      }
    };
    document.content.forEach(visit);
    return lines.join('').replace(/\n{3,}/g, '\n\n').trim();
  }
  return document.blocks
    ?.map((block) => block.text.trim())
    .filter(Boolean)
    .join('\n') ?? '';
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

export function entriesForProject(
  entries: EntryRecord[],
  projectId: string,
): EntryRecord[] {
  return sortEntriesByRecency(uniqueEntries(
    entries.filter((entry) => entry.project?.id === projectId),
  ));
}

export function isQuickReflection(entry: EntryRecord): boolean {
  return entry.entryType === 'reflection'
    && entry.reflectionType === 'open'
    // Migration 036 preserved old manual Echo entries with one synthetic user
    // turn. Only an actual OHARA turn proves that a Reflection was guided.
    && !entry.conversationTurns.some((turn) => turn.role === 'ohara');
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
