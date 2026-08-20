import type { GoalCreationCategory } from '@/lib/goals/schema';

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

export interface EntryRecord {
  id: string;
  userId: string;
  entryType: EntryType;
  title: string;
  content: RichTextDocument;
  plainText: string;
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
  categoryIds: GoalCreationCategory[];
  milestones: EntryMilestoneLink[];
}

export interface EntryRelationships {
  goalIds: string[];
  categoryIds: GoalCreationCategory[];
  milestoneIds: string[];
}

export interface EntryDraft {
  entryType: EntryType;
  title: string;
  content: RichTextDocument;
  plainText: string;
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
