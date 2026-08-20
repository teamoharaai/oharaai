import type {
  GoalReferenceRecord,
  IntelligenceReferenceAction,
  IntelligenceReferenceRecord,
  RichTextDocument,
  RichTextMark,
  RichTextNode,
} from './types.ts';

export const NOTE_DOCUMENT_SCHEMA_VERSION = 2 as const;

export const GOAL_REFERENCE_MARK = 'goalReference';
export const INTELLIGENCE_REFERENCE_MARK = 'intelligenceReference';
export const EMBEDDED_GOAL_NODE = 'goalCard';
export const NOTE_IMAGE_NODE = 'noteImage';

export function createReferenceId(prefix: 'goal-ref' | 'ohara-ref' | 'image'): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isV2Document(document: RichTextDocument): boolean {
  return document.schemaVersion === NOTE_DOCUMENT_SCHEMA_VERSION && Array.isArray(document.content);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character] ?? character));
}

/**
 * Returns content accepted by Tiptap. Existing HTML is kept intact until the
 * first editor transaction converts it to V2 JSON; plain legacy blocks are
 * converted without mutating the stored note.
 */
export function editorContentForDocument(document: RichTextDocument): RichTextDocument | string {
  if (isV2Document(document)) return document;
  const legacyBlocks = document.blocks ?? [];
  if (legacyBlocks.length === 1 && legacyBlocks[0]?.html) return legacyBlocks[0].html;
  if (!legacyBlocks.length) return '<p></p>';
  return legacyBlocks.map((block) => {
    const text = escapeHtml(block.text).replace(/\n/g, '<br>');
    const tag = block.type === 'heading' ? 'h1' : block.type === 'subheading' ? 'h2' : 'p';
    return `<${tag}>${text}</${tag}>`;
  }).join('');
}

export function toV2Document(json: { type?: string; content?: RichTextNode[] }): RichTextDocument {
  return {
    type: 'doc',
    schemaVersion: NOTE_DOCUMENT_SCHEMA_VERSION,
    content: json.content ?? [{ type: 'paragraph' }],
  };
}

function markAttrs(mark: RichTextMark | undefined): Record<string, unknown> {
  return mark?.attrs ?? {};
}

function stringAttr(attrs: Record<string, unknown>, key: string): string {
  return typeof attrs[key] === 'string' ? attrs[key] as string : '';
}

function boolAttr(attrs: Record<string, unknown>, key: string): boolean {
  return attrs[key] === true;
}

function nodeText(node: RichTextNode): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(nodeText).join(node.type === 'hardBreak' ? '\n' : '');
}

export function extractGoalReferences(document: RichTextDocument): GoalReferenceRecord[] {
  if (!isV2Document(document)) return [];
  const references = new Map<string, GoalReferenceRecord>();

  const visit = (node: RichTextNode, blockId: string | null, checkboxCompleted: boolean) => {
    const nextBlockId = typeof node.attrs?.id === 'string' ? node.attrs.id : blockId;
    const nextCheckboxCompleted = node.type === 'taskItem'
      ? node.attrs?.checked === true
      : checkboxCompleted;

    if (node.type === EMBEDDED_GOAL_NODE) {
      const id = stringAttr(node.attrs ?? {}, 'referenceId');
      const goalId = stringAttr(node.attrs ?? {}, 'goalId');
      if (id && goalId) {
        references.set(id, {
          id,
          goalId,
          blockId: nextBlockId,
          sourceType: 'embedded_goal_card',
          excerpt: '',
          createdAt: stringAttr(node.attrs ?? {}, 'createdAt'),
          progressEvidence: false,
          checkboxCompleted: false,
        });
      }
    }

    for (const mark of node.marks ?? []) {
      if (mark.type !== GOAL_REFERENCE_MARK) continue;
      const attrs = markAttrs(mark);
      const id = stringAttr(attrs, 'referenceId');
      const goalId = stringAttr(attrs, 'goalId');
      if (!id || !goalId) continue;
      const previous = references.get(id);
      references.set(id, {
        id,
        goalId,
        blockId: stringAttr(attrs, 'blockId') || nextBlockId,
        sourceType: (stringAttr(attrs, 'sourceType') || 'text') as GoalReferenceRecord['sourceType'],
        excerpt: `${previous?.excerpt ?? ''}${node.text ?? ''}`,
        createdAt: stringAttr(attrs, 'createdAt'),
        progressEvidence: boolAttr(attrs, 'progressEvidence'),
        checkboxCompleted: nextCheckboxCompleted,
      });
    }
    node.content?.forEach((child) => visit(child, nextBlockId, nextCheckboxCompleted));
  };

  document.content?.forEach((node) => visit(node, null, false));
  return [...references.values()];
}

export function extractIntelligenceReferences(
  document: RichTextDocument,
): IntelligenceReferenceRecord[] {
  if (!isV2Document(document)) return [];
  const references = new Map<string, IntelligenceReferenceRecord>();

  const visit = (node: RichTextNode, blockId: string | null, containingText: string) => {
    const nextBlockId = typeof node.attrs?.id === 'string' ? node.attrs.id : blockId;
    const nextContainingText = ['paragraph', 'heading', 'taskItem', 'listItem'].includes(node.type)
      ? nodeText(node)
      : containingText;
    for (const mark of node.marks ?? []) {
      if (mark.type !== INTELLIGENCE_REFERENCE_MARK) continue;
      const attrs = markAttrs(mark);
      const id = stringAttr(attrs, 'referenceId');
      if (!id) continue;
      const previous = references.get(id);
      const goalIds = Array.isArray(attrs.goalIds)
        ? attrs.goalIds.filter((value): value is string => typeof value === 'string')
        : [];
      references.set(id, {
        id,
        blockId: stringAttr(attrs, 'blockId') || nextBlockId,
        excerpt: `${previous?.excerpt ?? ''}${node.text ?? ''}`,
        containingText: nextContainingText,
        createdAt: stringAttr(attrs, 'createdAt'),
        action: (stringAttr(attrs, 'action') || 'ask') as IntelligenceReferenceAction,
        question: stringAttr(attrs, 'question') || null,
        status: 'premium_locked',
        goalIds,
      });
    }
    node.content?.forEach((child) => visit(child, nextBlockId, nextContainingText));
  };

  document.content?.forEach((node) => visit(node, null, ''));
  return [...references.values()];
}

export function collectNoteImagePaths(document: RichTextDocument): string[] {
  if (!isV2Document(document)) return [];
  const paths = new Set<string>();
  const visit = (node: RichTextNode) => {
    if (node.type === NOTE_IMAGE_NODE && typeof node.attrs?.storagePath === 'string') {
      paths.add(node.attrs.storagePath);
    }
    node.content?.forEach(visit);
  };
  document.content?.forEach(visit);
  return [...paths];
}

export function removeInlineReference(
  document: RichTextDocument,
  referenceId: string,
): RichTextDocument {
  if (!isV2Document(document)) return document;
  const visit = (node: RichTextNode): RichTextNode => ({
    ...node,
    ...(node.marks ? {
      marks: node.marks.filter((mark) => !(
        (mark.type === GOAL_REFERENCE_MARK || mark.type === INTELLIGENCE_REFERENCE_MARK)
        && mark.attrs?.referenceId === referenceId
      )),
    } : {}),
    ...(node.content ? { content: node.content.map(visit) } : {}),
  });
  return { ...document, content: document.content?.map(visit) ?? [] };
}

export function updateGoalReference(
  document: RichTextDocument,
  referenceId: string,
  updates: Pick<Partial<GoalReferenceRecord>, 'goalId' | 'progressEvidence'>,
): RichTextDocument {
  if (!isV2Document(document)) return document;
  const visit = (node: RichTextNode): RichTextNode => ({
    ...node,
    ...(node.marks ? {
      marks: node.marks.map((mark) => (
        mark.type === GOAL_REFERENCE_MARK && mark.attrs?.referenceId === referenceId
          ? { ...mark, attrs: { ...mark.attrs, ...updates } }
          : mark
      )),
    } : {}),
    ...(node.content ? { content: node.content.map(visit) } : {}),
  });
  return { ...document, content: document.content?.map(visit) ?? [] };
}
