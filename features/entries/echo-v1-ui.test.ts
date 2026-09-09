import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const library = source('features/entries/components/EntriesLibrary.tsx');
const workspace = source('features/entries/components/EntriesScreen.tsx');
const creation = source('features/entries/components/EchoCreationModal.tsx');
const quick = source('features/entries/components/QuickReflectionEditor.tsx');
const noteEditor = source('features/entries/components/NoteEditor.tsx');
const richTextEditor = source('features/entries/components/RichTextEditor.web.tsx');
const legacyRoute = source('app/(app)/entries/reflection.tsx');
const navigation = source('components/layout/AppNavigation.tsx');
const button = source('components/ui/Button.tsx');
const theme = source('constants/colors.ts');
const css = source('global.css');

test('Echo library is organized by Most Recent and Projects without date buckets or categories', () => {
  assert.match(library, /Most Recent/);
  assert.match(library, /PROJECTS/);
  assert.match(library, /useState<EchoLibraryFilter>\('note'\)/);
  assert.match(library, /entriesForProject/);
  assert.doesNotMatch(library, /GOAL_CATEGORY_CATALOG/);
  assert.doesNotMatch(library, />Today</);
  assert.doesNotMatch(library, />Yesterday</);
});

test('Echo exposes one New flow and a persistent collapsible library', () => {
  assert.match(workspace, /toggleEntriesLibraryCollapsed/);
  assert.match(library, /Collapse Echo library/);
  assert.match(workspace, /Expand Echo library/);
  assert.match(workspace, /<EchoCreationModal/);
});

test('Echo polish uses a compact header, in-library collapse, and explicit Project exit', () => {
  assert.doesNotMatch(workspace, /<FeaturePageHeader/);
  assert.match(workspace, /<BrandIcon name="echo"/);
  assert.match(workspace, /accessibilityRole="header"[\s\S]*Echo/);
  assert.match(workspace, /\+ New/);
  assert.match(library, /Return to Most Recent Echo content/);
  assert.match(library, /onCollapse/);
  assert.doesNotMatch(workspace, /width: 42/);
  assert.match(workspace, /position: 'absolute'[\s\S]*top: '50%'/);
});

test('Echo surfaces remain visually distinct without changing workspace behavior', () => {
  assert.match(workspace, /testID="echo-library-surface"/);
  assert.match(workspace, /testID="echo-workspace-surface"/);
  assert.match(workspace, /marginRight: librarySpacing/);
  assert.match(workspace, /borderRadius: compact \? RADIUS\.lg : RADIUS\.xl/);
  assert.doesNotMatch(workspace, />New<\/Button>/);
  assert.match(noteEditor, /const panelElevation = asSheet \? \{\} : elevationStyle\('sm'/);
  assert.match(noteEditor, /borderRadius: asSheet \? 0 : RADIUS\.lg/);
  assert.match(noteEditor, /margin: asSheet \? 0 : SPACE\.lg/);
  assert.doesNotMatch(noteEditor, /backdropFilter|WebkitBackdropFilter/);
});

test('Intelligence starts below the full-width toolbar and constrained editors use the safe sheet layout', () => {
  assert.match(noteEditor, /MIN_INLINE_INTELLIGENCE_WORKSPACE = 1020/);
  assert.match(noteEditor, /onLayout=\{measureWorkspace\}/);
  assert.match(noteEditor, /testID="note-editor-column"/);
  assert.match(noteEditor, /flexBasis: 0,[\s\S]*flexGrow: 1,[\s\S]*overflow: 'hidden'/);
  assert.match(noteEditor, /flexShrink: 0/);
  assert.match(noteEditor, /sidePanel=\{intelligenceOpen && !intelligenceInSheet[\s\S]*intelligencePanel\(false\)/);
  assert.match(noteEditor, /intelligenceInSheet \? \([\s\S]*intelligencePanel\(true\)/);
  assert.match(richTextEditor, /className="ohara-editor-toolbar"[\s\S]*className="ohara-editor-body"[\s\S]*\{sidePanel\}/);
  assert.match(css, /\.ohara-editor-body \{[\s\S]*display: flex;[\s\S]*overflow: hidden/);
  assert.match(css, /@container ohara-editor \(max-width: 960px\)[\s\S]*overflow-x: auto/);
});

test('Echo library errors are calm, actionable, and do not expose raw transport messages', () => {
  assert.match(library, /We couldn’t load all of your Echo content\./);
  assert.match(library, /Retry loading Echo content/);
  assert.match(library, /retryLibraryLoad/);
  assert.doesNotMatch(library, /\{error \?\? projectsError\}/);
});

test('Echo and the application shell share the vibrant semantic OHARA green family', () => {
  assert.match(theme, /OHARA_ACCENT_PRIMARY = '#63C174'/);
  assert.match(theme, /OHARA_ACCENT_PRIMARY_HOVER = '#4EAA60'/);
  assert.match(theme, /selectedRow: 'rgba\(99,193,116,0\.15\)'/);
  assert.match(theme, /selectedRow: 'rgba\(99,193,116,0\.2\)'/);
  assert.doesNotMatch(theme, /#2A7F50|#58C77B|#4A7C5F|#8FAE8A/);
  assert.match(navigation, /<BrandIcon color=\{colors\.accent\.primary\} name="ohara"/);
  assert.match(button, /colors\.accent\.primaryHover/);
  assert.match(css, /--ohara-global-accent: #63C174/);
  assert.doesNotMatch(noteEditor, /colorWithAlpha/);
});

test('Quick Reflection is freeform while Guided Reflection is intentionally unavailable', () => {
  assert.match(creation, /Quick Reflection/);
  assert.match(creation, /Guided Reflection/);
  assert.match(creation, /Coming soon/);
  assert.match(creation, /disabled/);
  assert.match(creation, /name="ohara"/);
  assert.match(quick, /placeholder="Write freely…"/);
  assert.doesNotMatch(quick, /FocusedChatMessageList|ChatMessage|send\(/);
});

test('the old guided Reflection route can no longer expose the legacy chatbot', () => {
  assert.match(legacyRoute, /create: 'reflection'/);
  assert.doesNotMatch(legacyRoute, /GuidedReflection/);
});

test('Echo UI chrome suppresses accidental caret selection while editors remain selectable', () => {
  assert.match(workspace, /className="ohara-echo-workspace"/);
  assert.match(css, /\.ohara-echo-workspace \{[\s\S]*user-select: none/);
  assert.match(css, /\.ohara-echo-workspace \[contenteditable="true"\][\s\S]*user-select: text/);
});
