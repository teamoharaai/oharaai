import {
  GOAL_CREATION_CATEGORIES,
  type GoalCreationCategory,
} from '@/lib/goals/schema';
import type {
  EntryDraft,
  EntryRelationships,
  EntryType,
  ReflectionTurn,
  ReflectionType,
  RichTextBlock,
  RichTextDocument,
} from './types';

const ENTRY_TYPES: EntryType[] = ['note', 'reflection'];
const REFLECTION_TYPES: ReflectionType[] = ['week', 'goal', 'milestone', 'open'];
const BLOCK_TYPES: RichTextBlock['type'][] = [
  'paragraph',
  'heading',
  'subheading',
  'bullet',
  'numbered',
  'checklist',
  'quote',
];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, maxLength: number, allowEmpty = true): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text`);
  const cleaned = value.replace(/\0/g, '');
  if (!allowEmpty && !cleaned.trim()) throw new Error(`${label} is required`);
  if (cleaned.length > maxLength) throw new Error(`${label} exceeds ${maxLength} characters`);
  return cleaned;
}

function uuidArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`);
  const ids = value.map((item) => {
    if (typeof item !== 'string' || !UUID_PATTERN.test(item)) {
      throw new Error(`${label} contains an invalid identifier`);
    }
    return item;
  });
  return [...new Set(ids)];
}

function parseDocument(value: unknown): RichTextDocument {
  const document = record(value, 'content');
  if (document.type !== 'doc' || !Array.isArray(document.blocks)) {
    throw new Error('content must be a structured document');
  }
  if (document.blocks.length > 1000) throw new Error('content has too many blocks');
  const blocks: RichTextBlock[] = document.blocks.map((value, index) => {
    const block = record(value, `content.blocks[${index}]`);
    if (
      typeof block.id !== 'string'
      || !BLOCK_TYPES.includes(block.type as RichTextBlock['type'])
    ) {
      throw new Error(`content.blocks[${index}] is invalid`);
    }
    return {
      id: text(block.id, `content.blocks[${index}].id`, 200, false),
      type: block.type as RichTextBlock['type'],
      text: text(block.text, `content.blocks[${index}].text`, 100000),
      ...(typeof block.html === 'string'
        ? { html: text(block.html, `content.blocks[${index}].html`, 250000) }
        : {}),
      ...(block.type === 'checklist' ? { checked: block.checked === true } : {}),
    };
  });
  return { type: 'doc', blocks };
}

function parseTurns(value: unknown): ReflectionTurn[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('conversationTurns must be a list');
  if (value.length > 100) throw new Error('conversationTurns has too many messages');
  return value.map((turnValue, index) => {
    const turn = record(turnValue, `conversationTurns[${index}]`);
    if (turn.role !== 'ohara' && turn.role !== 'user') {
      throw new Error(`conversationTurns[${index}].role is invalid`);
    }
    return {
      id: text(turn.id, `conversationTurns[${index}].id`, 200, false),
      role: turn.role,
      content: text(turn.content, `conversationTurns[${index}].content`, 20000, false),
      createdAt: text(turn.createdAt, `conversationTurns[${index}].createdAt`, 100, false),
    };
  });
}

function parseRelationships(value: unknown): EntryRelationships {
  const relationships = record(value, 'relationships');
  if (!Array.isArray(relationships.categoryIds)) {
    throw new Error('relationships.categoryIds must be a list');
  }
  const categoryIds = relationships.categoryIds.map((category) => {
    if (!GOAL_CREATION_CATEGORIES.includes(category as GoalCreationCategory)) {
      throw new Error('relationships.categoryIds contains an invalid category');
    }
    return category as GoalCreationCategory;
  });
  return {
    goalIds: uuidArray(relationships.goalIds, 'relationships.goalIds'),
    categoryIds: [...new Set(categoryIds)],
    milestoneIds: uuidArray(relationships.milestoneIds, 'relationships.milestoneIds'),
  };
}

export function parseEntryDraft(value: unknown): EntryDraft {
  const body = record(value, 'entry');
  if (!ENTRY_TYPES.includes(body.entryType as EntryType)) {
    throw new Error('entryType must be note or reflection');
  }
  const entryType = body.entryType as EntryType;
  const reflectionType = body.reflectionType == null
    ? null
    : REFLECTION_TYPES.includes(body.reflectionType as ReflectionType)
      ? body.reflectionType as ReflectionType
      : (() => { throw new Error('reflectionType is invalid'); })();
  const completedAt = body.completedAt == null
    ? null
    : text(body.completedAt, 'completedAt', 100, false);
  if (completedAt && Number.isNaN(new Date(completedAt).getTime())) {
    throw new Error('completedAt is invalid');
  }

  return {
    entryType,
    title: text(body.title, 'title', 200),
    content: parseDocument(body.content),
    plainText: text(body.plainText, 'plainText', 100000),
    reflectionType: entryType === 'reflection' ? reflectionType ?? 'open' : null,
    conversationTurns: entryType === 'reflection' ? parseTurns(body.conversationTurns) : [],
    takeaway: body.takeaway == null ? null : text(body.takeaway, 'takeaway', 20000),
    pinned: body.pinned === true,
    archived: body.archived === true,
    completedAt,
    relationships: parseRelationships(body.relationships),
  };
}

export function parseEntryType(value: string | null): EntryType | undefined {
  if (value == null || value === '') return undefined;
  if (!ENTRY_TYPES.includes(value as EntryType)) throw new Error('Invalid entry type');
  return value as EntryType;
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
