import {
  GOAL_CREATION_CATEGORIES,
  type GoalCreationCategory,
} from '../../lib/goals/schema.ts';
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
const V2_NODE_TYPES = new Set([
  'doc', 'paragraph', 'heading', 'text', 'hardBreak', 'bulletList', 'orderedList',
  'listItem', 'taskList', 'taskItem', 'blockquote', 'horizontalRule', 'goalCard', 'noteImage',
]);
const V2_MARK_TYPES = new Set([
  'bold', 'italic', 'underline', 'strike', 'link', 'code', 'goalReference',
  'intelligenceReference',
]);
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

function optionalText(value: unknown, label: string, maxLength: number): string | null {
  if (value == null || value === '') return null;
  return text(value, label, maxLength, false);
}

function isoTimestamp(value: unknown, label: string): string | null {
  const result = optionalText(value, label, 100);
  if (result && Number.isNaN(new Date(result).getTime())) throw new Error(`${label} is invalid`);
  return result;
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
  if (document.type !== 'doc') {
    throw new Error('content must be a structured document');
  }
  if (document.schemaVersion === 2) {
    if (!Array.isArray(document.content)) throw new Error('content.content must be a list');
    let nodeCount = 0;
    const parseNode = (value: unknown, path: string): import('./types').RichTextNode => {
      if (++nodeCount > 5000) throw new Error('content has too many nodes');
      const node = record(value, path);
      if (typeof node.type !== 'string' || !V2_NODE_TYPES.has(node.type)) {
        throw new Error(`${path}.type is invalid`);
      }
      const parsed: import('./types').RichTextNode = { type: node.type };
      if (node.text !== undefined) parsed.text = text(node.text, `${path}.text`, 100000);
      if (node.attrs !== undefined) {
        const attrs = record(node.attrs, `${path}.attrs`);
        const id = optionalText(attrs.id, `${path}.attrs.id`, 200);
        const textAlign = attrs.textAlign == null
          ? null
          : attrs.textAlign === 'left' || attrs.textAlign === 'center' || attrs.textAlign === 'right'
            ? attrs.textAlign
            : (() => { throw new Error(`${path}.attrs.textAlign is invalid`); })();
        if (node.type === 'paragraph') parsed.attrs = { id, ...(textAlign ? { textAlign } : {}) };
        if (node.type === 'heading') {
          if (attrs.level !== 1 && attrs.level !== 2 && attrs.level !== 3) {
            throw new Error(`${path}.attrs.level is invalid`);
          }
          parsed.attrs = { id, level: attrs.level, ...(textAlign ? { textAlign } : {}) };
        }
        if (node.type === 'taskItem') parsed.attrs = { id, checked: attrs.checked === true };
        if (node.type === 'listItem') parsed.attrs = { id };
        if (node.type === 'goalCard') {
          const goalId = text(attrs.goalId, `${path}.attrs.goalId`, 100, false);
          if (!UUID_PATTERN.test(goalId)) throw new Error(`${path}.attrs.goalId is invalid`);
          parsed.attrs = {
            id,
            goalId,
            referenceId: text(attrs.referenceId, `${path}.attrs.referenceId`, 200, false),
            createdAt: isoTimestamp(attrs.createdAt, `${path}.attrs.createdAt`),
          };
        }
        if (node.type === 'noteImage') {
          const storagePath = text(attrs.storagePath, `${path}.attrs.storagePath`, 500, false);
          if (storagePath.includes('..') || !/^[0-9a-f-]+\/[0-9a-f-]+\/[a-z0-9-]+\.[a-z0-9]+$/i.test(storagePath)) {
            throw new Error(`${path}.attrs.storagePath is invalid`);
          }
          parsed.attrs = {
            id,
            storagePath,
            alt: optionalText(attrs.alt, `${path}.attrs.alt`, 500) ?? 'Note image',
            align: attrs.align === 'left' || attrs.align === 'right' ? attrs.align : 'center',
          };
        }
      }
      if (node.marks !== undefined) {
        if (!Array.isArray(node.marks) || node.marks.length > 20) {
          throw new Error(`${path}.marks is invalid`);
        }
        parsed.marks = node.marks.map((markValue, markIndex) => {
          const mark = record(markValue, `${path}.marks[${markIndex}]`);
          if (typeof mark.type !== 'string' || !V2_MARK_TYPES.has(mark.type)) {
            throw new Error(`${path}.marks[${markIndex}].type is invalid`);
          }
          if (mark.attrs === undefined) return { type: mark.type };
          const markPath = `${path}.marks[${markIndex}].attrs`;
          const attrs = record(mark.attrs, markPath);
          if (mark.type === 'link') {
            const href = text(attrs.href, `${markPath}.href`, 2048, false);
            if (!/^(https?:|mailto:)/i.test(href)) throw new Error(`${markPath}.href is invalid`);
            return { type: mark.type, attrs: { href } };
          }
          if (mark.type === 'goalReference') {
            const goalId = text(attrs.goalId, `${markPath}.goalId`, 100, false);
            if (!UUID_PATTERN.test(goalId)) throw new Error(`${markPath}.goalId is invalid`);
            if (!['text', 'paragraph', 'checkbox'].includes(String(attrs.sourceType))) {
              throw new Error(`${markPath}.sourceType is invalid`);
            }
            return { type: mark.type, attrs: {
              referenceId: text(attrs.referenceId, `${markPath}.referenceId`, 200, false),
              goalId,
              blockId: optionalText(attrs.blockId, `${markPath}.blockId`, 200),
              sourceType: attrs.sourceType,
              createdAt: isoTimestamp(attrs.createdAt, `${markPath}.createdAt`),
              progressEvidence: attrs.progressEvidence === true,
            } };
          }
          if (mark.type === 'intelligenceReference') {
            if (!['ask', 'reflect', 'understand', 'connect_goal', 'pattern', 'custom'].includes(String(attrs.action))) {
              throw new Error(`${markPath}.action is invalid`);
            }
            const goalIds = Array.isArray(attrs.goalIds) ? attrs.goalIds.map((goalId, goalIndex) => {
              if (typeof goalId !== 'string' || !UUID_PATTERN.test(goalId)) {
                throw new Error(`${markPath}.goalIds[${goalIndex}] is invalid`);
              }
              return goalId;
            }) : [];
            return { type: mark.type, attrs: {
              referenceId: text(attrs.referenceId, `${markPath}.referenceId`, 200, false),
              blockId: optionalText(attrs.blockId, `${markPath}.blockId`, 200),
              createdAt: isoTimestamp(attrs.createdAt, `${markPath}.createdAt`),
              action: attrs.action,
              question: optionalText(attrs.question, `${markPath}.question`, 2000),
              goalIds: [...new Set(goalIds)],
            } };
          }
          return { type: mark.type };
        });
      }
      if (node.content !== undefined) {
        if (!Array.isArray(node.content)) throw new Error(`${path}.content must be a list`);
        parsed.content = node.content.map((child, index) => parseNode(child, `${path}.content[${index}]`));
      }
      return parsed;
    };
    return {
      type: 'doc',
      schemaVersion: 2,
      content: document.content.map((node, index) => parseNode(node, `content.content[${index}]`)),
    };
  }
  if (!Array.isArray(document.blocks)) {
    throw new Error('content.blocks must be a list');
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
  return { type: 'doc', schemaVersion: 1, blocks };
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
    ...(body.expectedContentVersion === undefined
      ? {}
      : typeof body.expectedContentVersion === 'number'
        && Number.isInteger(body.expectedContentVersion)
        && body.expectedContentVersion > 0
        ? { expectedContentVersion: body.expectedContentVersion }
        : (() => { throw new Error('expectedContentVersion is invalid'); })()),
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
