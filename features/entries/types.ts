import type { GoalCreationCategory } from '@/lib/goals/schema';
import type { BrtCategory } from '@/lib/utils/resolveBrt';

export type EntryType = 'note' | 'reflection';
export type ReflectionType = 'week' | 'goal' | 'milestone' | 'open';
export type EntrySaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type RichTextBlockType =
  | 'paragraph'
  | 'heading'
  | 'subheading'
  | 'bullet'
  | 'numbered'
  | 'checklist'
  | 'quote';

export interface RichTextBlock {
  id: string;
  type: RichTextBlockType;
  text: string;
  html?: string;
  checked?: boolean;
}

export interface RichTextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface RichTextNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
}

export interface RichTextDocument {
  type: 'doc';
  /** V2 uses ProseMirror/Tiptap JSON. Legacy V1 blocks remain readable. */
  schemaVersion?: 1 | 2;
  content?: RichTextNode[];
  blocks?: RichTextBlock[];
}

export type NoteReferenceSource = 'text' | 'paragraph' | 'checkbox' | 'embedded_goal_card';

export interface GoalReferenceRecord {
  id: string;
  goalId: string;
  blockId: string | null;
  sourceType: NoteReferenceSource;
  excerpt: string;
  createdAt: string;
  progressEvidence: boolean;
  checkboxCompleted: boolean;
}

export type IntelligenceReferenceAction =
  | 'ask'
  | 'reflect'
  | 'understand'
  | 'connect_goal'
  | 'pattern'
  | 'custom';

export interface IntelligenceReferenceRecord {
  id: string;
  blockId: string | null;
  excerpt: string;
  containingText: string;
  createdAt: string;
  action: IntelligenceReferenceAction;
  question: string | null;
  status: 'referenced' | 'premium_locked' | 'ready';
  goalIds: string[];
}

export interface ReflectionTurn {
  id: string;
  role: 'ohara' | 'user';
  content: string;
  createdAt: string;
}

export interface EntryGoalLink {
  id: string;
  title: string;
  category: GoalCreationCategory;
  status: string;
  projectId: string | null;
}

export interface EntryMilestoneLink {
  id: string;
  goalId: string;
  title: string;
  completedAt: string | null;
}

export interface EntryGoalOption extends EntryGoalLink {
  milestones: EntryMilestoneLink[];
}

export interface EntryProjectLink {
  id: string;
  title: string;
  status: string;
}

export interface EntryRecord {
  id: string;
  userId: string;
  entryType: EntryType;
  title: string;
  content: RichTextDocument;
  plainText: string;
  brtCategory: BrtCategory | null;
  reflectionType: ReflectionType | null;
  conversationTurns: ReflectionTurn[];
  takeaway: string | null;
  pinned: boolean;
  archived: boolean;
  contentVersion: number;
  schemaVersion: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  goals: EntryGoalLink[];
  project?: EntryProjectLink | null;
  projectShareScope?: 'private' | 'project' | 'guide';
  categoryIds: GoalCreationCategory[];
  milestones: EntryMilestoneLink[];
  /** Captured in Echo and mirrored here (Migration 086): read-only outside Echo. */
  echoOwned: boolean;
}

export interface EntryAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface EntryCapabilities {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canChangeShare: boolean;
}

export type NotesLibraryView = 'my-library' | 'shared-with-me' | 'linked-to' | 'sources';
export type NotesLibrarySort = 'updated-desc' | 'created-desc' | 'title-asc';

export interface NoteFolder {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotesLibraryAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface NotesLibraryItem {
  id: string;
  ownerId: string;
  title: string;
  plainText: string;
  createdAt: string;
  updatedAt: string;
  project: EntryProjectLink | null;
  goals: Array<Pick<EntryGoalLink, 'id' | 'title' | 'projectId'>>;
  author: NotesLibraryAuthor;
  shareScope: 'private' | 'project' | 'guide';
  viewerRole: 'owner' | 'admin' | 'member' | 'guide' | null;
  capabilities: EntryCapabilities;
  folderId: string | null;
}

export interface NotesLibrarySource {
  id: string;
  ownerId: string;
  title: string;
  itemType: 'link' | 'document';
  url: string | null;
  fileType: string | null;
  provider: string;
  visibility: 'private' | 'vault_members' | 'public';
  createdAt: string;
  updatedAt: string;
  project: EntryProjectLink | null;
  goal: Pick<EntryGoalLink, 'id' | 'title' | 'projectId'> | null;
  author: NotesLibraryAuthor;
}

export interface NotesLibraryPayload {
  version: 'notes-library.v1';
  viewerId: string;
  folders: NoteFolder[];
  notes: NotesLibraryItem[];
  sources: NotesLibrarySource[];
}

export type JournalContextFilter =
  | { kind: 'all' }
  | { kind: 'unlinked' }
  | { kind: 'project'; id: string }
  | { kind: 'goal'; id: string };
export type JournalSort = 'newest' | 'oldest';
export type JournalDateRange = 'all' | '7d' | '30d' | '90d';
export type JournalShareFilter = 'all' | 'private' | 'project' | 'guide';

export interface JournalLibraryItem {
  id: string;
  ownerId: string;
  title: string;
  plainText: string;
  reflectionType: ReflectionType | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contentVersion: number;
  project: EntryProjectLink | null;
  goals: EntryGoalLink[];
  shareScope: 'private' | 'project' | 'guide';
  capabilities: EntryCapabilities;
  echoOwned: boolean;
}

export interface JournalLibraryPayload {
  version: 'journal-library.v1';
  viewerId: string;
  entries: JournalLibraryItem[];
  browseAvailable: boolean;
}

export interface EntryDetailContext {
  project: EntryProjectLink | null;
  goals: Array<Pick<EntryGoalLink, 'id' | 'title'>>;
  shareScope: 'private' | 'project' | 'guide';
  viewerRole: 'owner' | 'admin' | 'member' | 'guide' | null;
}

/** Minimal, viewer-authorized detail contract shared by Notes and Reflections. */
export interface EntryDetailDto {
  version: 'entry-detail.v1';
  entry: EntryRecord;
  author: EntryAuthor;
  context: EntryDetailContext;
  capabilities: EntryCapabilities;
  requestId: string;
}

export interface EntryRelationships {
  goalIds: string[];
  projectId?: string | null;
  categoryIds: GoalCreationCategory[];
  milestoneIds: string[];
}

export interface EntryDraft {
  entryType: EntryType;
  title: string;
  content: RichTextDocument;
  plainText: string;
  /** Omitted on update preserves the current category; null explicitly clears it. */
  brtCategory?: BrtCategory | null;
  /** Stable owner-scoped UUID used to make a create retry idempotent. */
  clientRequestId?: string;
  reflectionType?: ReflectionType | null;
  conversationTurns?: ReflectionTurn[];
  takeaway?: string | null;
  pinned?: boolean;
  archived?: boolean;
  completedAt?: string | null;
  expectedContentVersion?: number;
  relationships: EntryRelationships;
}

export interface EntryRetrievalDocument {
  sourceType: EntryType;
  entryId: string;
  userId: string;
  title: string;
  plainText: string;
  goalIds: string[];
  goalNames: string[];
  categoryIds: string[];
  categoryNames: string[];
  milestoneIds: string[];
  constellationIds: string[];
  createdAt: string;
  updatedAt: string;
  contentVersion: number;
}
