import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectNoteImagePaths,
  editorContentForDocument,
  extractGoalReferences,
  extractIntelligenceReferences,
  isV2Document,
  toV2Document,
  removeInlineReference,
  updateGoalReference,
} from './editor-document.ts';
import { documentToPlainText } from './utils.ts';
import { parseEntryDraft } from './validation.ts';
import type { RichTextDocument } from './types.ts';

const GOAL_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_GOAL_ID = '44444444-4444-4444-8444-444444444444';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const NOTE_ID = '33333333-3333-4333-8333-333333333333';

const document: RichTextDocument = {
  type: 'doc',
  schemaVersion: 2,
  content: [
    {
      type: 'heading',
      attrs: { id: 'heading-1', level: 1, textAlign: 'center' },
      content: [{ type: 'text', text: 'Plan', marks: [{ type: 'bold' }] }],
    },
    {
      type: 'paragraph',
      attrs: { id: 'paragraph-1', textAlign: 'right' },
      content: [{
        type: 'text',
        text: 'Read the brief',
        marks: [
          { type: 'italic' },
          { type: 'underline' },
          { type: 'strike' },
          { type: 'link', attrs: { href: 'https://example.com' } },
          {
            type: 'intelligenceReference',
            attrs: {
              referenceId: 'ohara-ref-1',
              blockId: 'paragraph-1',
              action: 'pattern',
              createdAt: '2026-08-19T12:00:00.000Z',
              question: null,
              goalIds: [GOAL_ID],
            },
          },
        ],
      }],
    },
    {
      type: 'taskList',
      content: [{
        type: 'taskItem',
        attrs: { id: 'task-1', checked: true },
        content: [{
          type: 'paragraph',
          attrs: { id: 'task-copy-1' },
          content: [{
            type: 'text',
            text: 'Finish prototype',
            marks: [{
              type: 'goalReference',
              attrs: {
                referenceId: 'goal-ref-1',
                goalId: GOAL_ID,
                blockId: 'task-1',
                sourceType: 'checkbox',
                createdAt: '2026-08-19T12:00:00.000Z',
                progressEvidence: true,
              },
            }],
          }],
        }],
      }],
    },
    {
      type: 'noteImage',
      attrs: { id: 'image-1', storagePath: `${USER_ID}/${NOTE_ID}/image-1.webp`, alt: 'Prototype', align: 'center' },
    },
    {
      type: 'goalCard',
      attrs: {
        id: 'card-1',
        referenceId: 'goal-card-1',
        goalId: GOAL_ID,
        createdAt: '2026-08-19T12:00:00.000Z',
      },
    },
  ],
};

test('V2 documents preserve semantic formatting, alignment, links, lists, images, and cards', () => {
  const parsed = parseEntryDraft({
    entryType: 'note',
    title: 'Editor test',
    content: document,
    plainText: documentToPlainText(document),
    relationships: { goalIds: [], categoryIds: [], milestoneIds: [] },
  });
  assert.equal(isV2Document(parsed.content), true);
  assert.deepEqual(parsed.content, document);
  assert.match(documentToPlainText(parsed.content), /Plan/);
  assert.match(documentToPlainText(parsed.content), /Finish prototype/);
  assert.deepEqual(collectNoteImagePaths(parsed.content), [`${USER_ID}/${NOTE_ID}/image-1.webp`]);
});

test('extracts a stable Goal reference from a completed checklist item', () => {
  assert.deepEqual(extractGoalReferences(document), [
    {
      id: 'goal-ref-1',
      goalId: GOAL_ID,
      blockId: 'task-1',
      sourceType: 'checkbox',
      excerpt: 'Finish prototype',
      createdAt: '2026-08-19T12:00:00.000Z',
      progressEvidence: true,
      checkboxCompleted: true,
    },
    {
      id: 'goal-card-1',
      goalId: GOAL_ID,
      blockId: 'card-1',
      sourceType: 'embedded_goal_card',
      excerpt: '',
      createdAt: '2026-08-19T12:00:00.000Z',
      progressEvidence: false,
      checkboxCompleted: false,
    },
  ]);
});

test('extracts OHARA selection context without fabricating an AI response', () => {
  assert.deepEqual(extractIntelligenceReferences(document), [{
    id: 'ohara-ref-1',
    blockId: 'paragraph-1',
    excerpt: 'Read the brief',
    containingText: 'Read the brief',
    createdAt: '2026-08-19T12:00:00.000Z',
    action: 'pattern',
    question: null,
    status: 'premium_locked',
    goalIds: [GOAL_ID],
  }]);
});

test('changes a Goal Reference without changing its text, checkbox, or stable identity', () => {
  const updated = updateGoalReference(document, 'goal-ref-1', {
    goalId: OTHER_GOAL_ID,
    progressEvidence: false,
  });
  const reference = extractGoalReferences(updated).find((item) => item.id === 'goal-ref-1');
  assert.equal(reference?.goalId, OTHER_GOAL_ID);
  assert.equal(reference?.progressEvidence, false);
  assert.equal(reference?.checkboxCompleted, true);
  assert.match(documentToPlainText(updated), /Finish prototype/);
});

test('removes Goal and Intelligence anchors while preserving source content and checklist state', () => {
  const withoutGoal = removeInlineReference(document, 'goal-ref-1');
  assert.equal(extractGoalReferences(withoutGoal).some((item) => item.id === 'goal-ref-1'), false);
  assert.equal(extractGoalReferences(withoutGoal).some((item) => item.id === 'goal-card-1'), true);
  assert.match(documentToPlainText(withoutGoal), /Finish prototype/);
  const taskItem = withoutGoal.content?.[2]?.content?.[0];
  assert.equal(taskItem?.attrs?.checked, true);

  const withoutIntelligence = removeInlineReference(document, 'ohara-ref-1');
  assert.deepEqual(extractIntelligenceReferences(withoutIntelligence), []);
  assert.match(documentToPlainText(withoutIntelligence), /Read the brief/);
  assert.equal(
    withoutIntelligence.content?.[1]?.content?.[0]?.marks?.some((mark) => mark.type === 'link'),
    true,
  );
});

test('keeps legacy HTML readable and upgrades editor JSON to schema V2', () => {
  const legacy: RichTextDocument = {
    type: 'doc',
    blocks: [{ id: 'legacy', type: 'paragraph', text: 'Legacy', html: '<p><strong>Legacy</strong></p>' }],
  };
  assert.equal(editorContentForDocument(legacy), '<p><strong>Legacy</strong></p>');
  const upgraded = toV2Document({ type: 'doc', content: [{ type: 'paragraph' }] });
  assert.equal(upgraded.schemaVersion, 2);
  assert.deepEqual(upgraded.content, [{ type: 'paragraph' }]);
});

test('rejects unsupported V2 nodes and marks at the API boundary', () => {
  const draft = {
    entryType: 'note',
    title: 'Unsafe',
    plainText: 'unsafe',
    relationships: { goalIds: [], categoryIds: [], milestoneIds: [] },
  };
  assert.throws(() => parseEntryDraft({
    ...draft,
    content: { type: 'doc', schemaVersion: 2, content: [{ type: 'script' }] },
  }), /type is invalid/);
  assert.throws(() => parseEntryDraft({
    ...draft,
    content: {
      type: 'doc',
      schemaVersion: 2,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'style' }] }] }],
    },
  }), /type is invalid/);
  assert.throws(() => parseEntryDraft({
    ...draft,
    content: {
      type: 'doc',
      schemaVersion: 2,
      content: [{
        type: 'paragraph',
        attrs: { id: 'p-1', textAlign: 'left' },
        content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }],
      }],
    },
  }), /href is invalid/);
});
