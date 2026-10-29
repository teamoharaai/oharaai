import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const screen = source('features/entries/components/ReflectionsScreen.tsx');
const service = source('features/entries/services/entry-service.ts');
const db = source('lib/db/journal-library.ts');
const api = source('app/api/journal/library+api.ts');
const navigation = source('components/layout/AppNavigation.tsx');
const oldRoute = source('app/(app)/reflections.tsx');
const oldDetailRoute = source('app/(app)/reflections/[id].tsx');
const project = source('app/(app)/projects/[id].tsx');
const vault = source('features/goals/components/GoalVault.tsx');

test('Reflections is the product name while journal routes and reflection storage remain compatible', () => {
  assert.match(navigation, /label: 'Reflections'.*href: '\/\(app\)\/journal'/);
  assert.match(screen, />Reflections<\/Typography>/);
  assert.match(screen, />New Entry<\/Button>/);
  assert.match(screen, /entryType: 'reflection'/);
  assert.doesNotMatch(screen, />Journal<\/Typography>|>Reflect<\/Button>/);
});

test('Journal first render uses a lightweight owner-scoped authorized projection', () => {
  assert.match(api, /getJournalLibrary/);
  assert.match(db, /\.eq\('user_id', viewerId\)/);
  assert.match(db, /\.eq\('entry_type', 'reflection'\)/);
  assert.match(db, /\.eq\('archived', false\)/);
  const select = db.match(/\.select\('([^']+)'\)/)?.[1] ?? '';
  assert.doesNotMatch(select, /content|conversation_turns|takeaway/);
  assert.doesNotMatch(screen, /momentum|reconcile|friends|circles|project-chat/i);
  assert.match(screen, /if \(!composerOpen\) return;[\s\S]*loadContext\(\)[\s\S]*loadProjects\(\)/);
});

test('Browse Reflections, search, temporal sorting, filters, and mobile disclosure are present', () => {
  for (const copy of ['Browse Reflections', 'All Entries', 'Unlinked', 'PROJECTS', 'GOALS', 'Search reflections...', 'Newest', 'Oldest', 'Filters']) assert.match(screen, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(screen, /desktopBrowse = width >= 1040/);
  assert.match(screen, /visible=\{browseOpen\}/);
  assert.match(screen, /Shared with Guide/);
  assert.match(screen, /Last 30 days/);
  assert.match(screen, /goal\.status === 'active'/);
  assert.doesNotMatch(screen, /Edit in Echo/);
  assert.match(screen, /updateLegacyJournalEntry/);
  assert.match(screen, /deleteLegacyJournalEntry/);
  assert.match(service, /\/api\/entries\/\$\{entryId\}/);
});

test('Journal routes are canonical and Reflections deep links remain redirects', () => {
  assert.match(oldRoute, /Redirect[\s\S]*\/\(app\)\/journal/);
  assert.match(oldDetailRoute, /Redirect[\s\S]*\/\(app\)\/journal\/\[id\]/);
  assert.match(project, /View Reflections/);
  assert.match(project, /'Reflections'/);
  assert.match(vault, /label: 'Reflections'/);
  assert.match(vault, /title="Reflections"/);
  assert.doesNotMatch(vault, /title="Journal"/);
});
