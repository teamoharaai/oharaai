import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const css = readFileSync(resolve(process.cwd(), 'global.css'), 'utf8');
const editor = readFileSync(
  resolve(process.cwd(), 'features/entries/components/RichTextEditor.web.tsx'),
  'utf8',
);
const panel = readFileSync(
  resolve(process.cwd(), 'features/entries/components/NoteEditor.tsx'),
  'utf8',
);

test('explicitly restores visible list markers after the global CSS reset', () => {
  assert.match(css, /ul:not\(\[data-type="taskList"\]\)[\s\S]*list-style-type: disc/);
  assert.match(css, /\.ohara-rich-editor ol \{[\s\S]*list-style-type: decimal/);
  assert.match(css, /li::marker[\s\S]*color: var\(--ohara-editor-marker\)/);
});

test('renders high-contrast custom unchecked and checked checklist states', () => {
  assert.match(css, /input\[type="checkbox"\][\s\S]*appearance: none/);
  assert.match(css, /border: 1\.5px solid var\(--ohara-editor-checkbox-border\)/);
  assert.match(css, /input\[type="checkbox"\]:checked[\s\S]*background: var\(--ohara-editor-accent\)/);
  assert.match(css, /input\[type="checkbox"\]:checked::before[\s\S]*transform: scale\(1\)/);
});

test('uses a wide document canvas with a readable responsive text measure', () => {
  assert.match(css, /\.ohara-editor-page \{[\s\S]*max-width: 1280px/);
  assert.match(css, /padding: clamp\(46px, 4vw, 62px\) clamp\(56px, 6vw, 88px\) 108px/);
  assert.match(css, /\.ohara-editor-document \{[\s\S]*max-width: 900px/);
  assert.match(css, /container-type: inline-size/);
  assert.match(css, /@container ohara-editor \(max-width: 820px\)/);
  assert.match(css, /font-size: 18px/);
  assert.match(css, /border: 1px solid var\(--ohara-editor-page-border\)/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*clamp\(18px, 6vw, 28px\)/);
});

test('keeps the formatting toolbar above the canvas/Intelligence split and container-responsive', () => {
  assert.match(css, /\.ohara-editor-toolbar \{[\s\S]*box-sizing: border-box/);
  assert.match(css, /\.ohara-editor-toolbar \{[\s\S]*max-width: 100%/);
  assert.match(editor, /className="ohara-editor-toolbar"[\s\S]*className="ohara-editor-body"/);
  assert.match(editor, /className="ohara-editor-body"[\s\S]*className="ohara-editor-content"[\s\S]*\{sidePanel\}/);
  assert.match(css, /@container ohara-editor \(max-width: 960px\)/);
  assert.match(css, /@container ohara-editor \(max-width: 960px\)[\s\S]*overflow-x: auto/);
  assert.match(css, /@container ohara-editor \(max-width: 960px\)[\s\S]*min-width: 36px/);
  assert.doesNotMatch(css, /@media \(max-width: 1100px\)[\s\S]*ohara-editor-toolbar/);
});

test('keeps decorative sheet margins outside the actual contenteditable editor', () => {
  assert.match(editor, /className="ohara-editor-page" onPointerDown=\{handlePagePointerDown\}/);
  assert.match(editor, /<EditorContent editor=\{editor\} className="ohara-editor-document"/);
  assert.match(editor, /event\.target !== event\.currentTarget/);
  assert.match(editor, /globalThis\.getSelection\(\)\?\.removeAllRanges\(\)/);
  assert.match(css, /\.ohara-editor-page \{[\s\S]*user-select: none/);
  assert.match(css, /\.ohara-editor-document,[\s\S]*user-select: text/);
});

test('centers exact reference IDs without replacing the editor selection', () => {
  assert.match(editor, /function findReferenceElement/);
  assert.match(editor, /element\.dataset\.goalReference === referenceId/);
  assert.match(editor, /element\.dataset\.intelligenceReference === referenceId/);
  assert.match(editor, /\(viewportBounds\.height - targetBounds\.height\) \/ 2/);
  assert.match(editor, /is-reference-jump-target/);
  assert.match(editor, /referenceFocusNonce/);
  assert.doesNotMatch(editor, /setTextSelection\(range\)\.scrollIntoView\(\)/);
});

test('only shows selected-text actions for a genuine editor text selection', () => {
  assert.match(editor, /editor\.state\.doc\.textBetween\(from, to, ' ', ' '\)\.trim\(\)/);
  assert.match(editor, /editor\.view\.dom\.contains\(anchor\)/);
  assert.match(editor, /aria-label="Selected text actions"/);
  assert.match(editor, /Create OHARA Intelligence reference/);
  assert.match(editor, /askOhara\('ask'\)/);
});

test('uses a recognizable numbered-list glyph and the shared canonical Goals mark', () => {
  assert.match(editor, /className="ohara-numbered-list-icon"/);
  assert.match(editor, />1\.<\/text>/);
  assert.match(editor, />2\.<\/text>/);
  assert.match(editor, />3\.<\/text>/);
  assert.match(editor, /<BrandIcon name="goals"/);
  assert.doesNotMatch(editor, /name="list-circle-outline"/);
});

test('exposes discoverable and removable Goal and Intelligence reference controls', () => {
  assert.match(editor, /Link selection to Goal/);
  assert.match(editor, /Ask OHARA about selection/);
  assert.match(editor, /Change Goal/);
  assert.match(editor, /Progress evidence:/);
  assert.match(editor, /Remove Goal Link/);
  assert.match(editor, /Edit question\/context/);
  assert.match(editor, /Remove Reference/);
  assert.match(panel, /Jump to source/);
  assert.match(panel, /Remove OHARA Intelligence reference/);
  assert.match(panel, /Remove Goal reference/);
});
