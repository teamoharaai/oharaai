import assert from 'node:assert/strict';
import test from 'node:test';
import { createNotePdf } from './note-pdf.ts';
import type { RichTextDocument } from './types.ts';

const GOAL_ID = '11111111-1111-4111-8111-111111111111';
const IMAGE_PATH = 'owner/note/acceptance-image.jpg';
const IMAGE_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

function paragraph(text: string, attrs: Record<string, unknown> = {}) {
  return {
    type: 'paragraph',
    attrs,
    content: [{ type: 'text', text }],
  };
}

function hex(value: string): string {
  return `<${Buffer.from(value, 'latin1').toString('hex')}>`;
}

const acceptanceDocument: RichTextDocument = {
  type: 'doc',
  schemaVersion: 2,
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Heading one' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading two' }] },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Heading three' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' italic', marks: [{ type: 'italic' }] },
        { type: 'text', text: ' underlined', marks: [{ type: 'underline' }] },
        { type: 'text', text: ' struck', marks: [{ type: 'strike' }] },
        { type: 'text', text: ' linked', marks: [{ type: 'link', attrs: { href: 'https://example.com/notes' } }] },
        {
          type: 'text',
          text: ' goal source',
          marks: [{ type: 'goalReference', attrs: { referenceId: 'goal-reference', goalId: GOAL_ID } }],
        },
        {
          type: 'text',
          text: ' intelligence source',
          marks: [{ type: 'intelligenceReference', attrs: { referenceId: 'intelligence-reference' } }],
        },
      ],
    },
    paragraph('Centered paragraph', { textAlign: 'center' }),
    paragraph('Right aligned paragraph', { textAlign: 'right' }),
    {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [paragraph('Bullet item')] }],
    },
    {
      type: 'orderedList',
      content: [
        { type: 'listItem', content: [paragraph('First numbered item')] },
        { type: 'listItem', content: [paragraph('Second numbered item')] },
      ],
    },
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [paragraph('Checked item')] },
        { type: 'taskItem', attrs: { checked: false }, content: [paragraph('Unchecked item')] },
      ],
    },
    {
      type: 'noteImage',
      attrs: { storagePath: IMAGE_PATH, alt: 'Acceptance illustration', align: 'center' },
    },
    { type: 'goalCard', attrs: { goalId: GOAL_ID } },
    ...Array.from({ length: 65 }, (_, index) => paragraph(
      `Long-document paragraph ${index + 1} verifies that readable document content continues across pages.`,
    )),
  ],
};

test('renders authored Notes as selectable, structured, multipage PDFs with private images', async () => {
  const requestedImages: string[] = [];
  const pdf = await createNotePdf({
    title: 'Notes Version 1.1 Acceptance',
    document: acceptanceDocument,
    goals: [{ id: GOAL_ID, title: 'Run a sub-26 5K' }],
    loadImage: async (path) => {
      requestedImages.push(path);
      return { bytes: IMAGE_BYTES, width: 800, height: 400 };
    },
  });
  const source = Buffer.from(pdf).toString('latin1');

  assert.match(source, /^%PDF-1\.4/);
  assert.match(source, /\/BaseFont \/Helvetica-Bold/);
  assert.match(source, /\/BaseFont \/Helvetica-Oblique/);
  assert.match(source, /\/Subtype \/Image[\s\S]*\/Width 800 \/Height 400/);
  assert.match(source, /\/Im1 Do/);
  assert.match(source, /\/Subtype \/Link[\s\S]*https:\/\/example\.com\/notes/);
  assert.match(source, /\/Count [2-9]/);
  assert.match(source, /10 10 re f/);
  assert.match(source, /10 10 re S/);
  assert.ok(source.includes(hex('Notes')));
  assert.ok(source.includes(hex('Heading')));
  assert.ok(source.includes(hex('Bullet')));
  assert.ok(source.includes(hex('1.')));
  assert.ok(source.includes(hex('2.')));
  assert.ok(source.includes(hex('Goal: Run a sub-26 5K')));
  assert.ok(source.includes(hex('intelligence')));
  assert.doesNotMatch(source, /Jump to source|Remove Reference|Ask OHARA actions/);
  assert.deepEqual(requestedImages, [IMAGE_PATH]);
});

test('preserves legacy Notes and Reflections without requiring schema migrations', async () => {
  const pdf = await createNotePdf({
    title: 'Legacy Reflection',
    document: {
      type: 'doc',
      blocks: [{ id: 'legacy', type: 'paragraph', text: 'Existing reflection remains readable.' }],
    },
  });
  const source = Buffer.from(pdf).toString('latin1');
  assert.ok(source.includes(hex('Legacy')));
  assert.ok(source.includes(hex('reflection')));
});

test('fails explicitly instead of silently omitting an inaccessible private image', async () => {
  await assert.rejects(
    createNotePdf({ title: 'Private image', document: acceptanceDocument }),
    /Private note images could not be prepared/,
  );
  await assert.rejects(
    createNotePdf({
      title: 'Expired image',
      document: acceptanceDocument,
      loadImage: async () => { throw new Error('Signed URL expired'); },
    }),
    /Could not export image "Acceptance illustration": Signed URL expired/,
  );
});

test('preserves smart punctuation with WinAnsi font encoding', async () => {
  const pdf = await createNotePdf({
    title: 'Typography',
    document: { type: 'doc', schemaVersion: 2, content: [paragraph('“Quoted” — readable…')] },
  });
  const source = Buffer.from(pdf).toString('latin1');
  assert.match(source, /<9351756f74656494>/);
  assert.match(source, /<97>/);
  assert.match(source, /<7265616461626c6585>/);
});
