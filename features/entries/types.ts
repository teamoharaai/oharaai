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

export interface RichTextDocument {
  type: 'doc';
  blocks: RichTextBlock[];
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
