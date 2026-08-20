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

test('keeps a centered 960px document sheet with responsive writing margins', () => {
  assert.match(css, /\.ohara-rich-editor \{[\s\S]*max-width: 960px/);
  assert.match(css, /padding: clamp\(56px, 5vw, 72px\) clamp\(80px, 9vw, 110px\) 120px/);
  assert.match(css, /border: 1px solid var\(--ohara-editor-page-border\)/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*clamp\(18px, 6vw, 28px\)/);
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
