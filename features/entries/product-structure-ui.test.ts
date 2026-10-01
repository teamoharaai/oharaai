import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const navigation = source('components/layout/AppNavigation.tsx');
const create = source('components/layout/GlobalCreateControl.tsx');
const notes = source('features/entries/components/EntriesScreen.tsx');
const reflections = source('features/entries/components/ReflectionsScreen.tsx');
const legacyEntries = source('app/(app)/entries.tsx');
const legacyEcho = source('app/(app)/echo.tsx');
const projects = source('app/(app)/projects/[id].tsx');
const goals = source('features/goals/components/GoalsWorkspace.tsx');
const intelligence = source('components/ui/IntelligenceHeader.tsx');
const momentum = source('app/(app)/momentum.tsx');
const entriesDb = source('lib/db/entries.ts');

test('global navigation exposes the product model without an Echo library tab', () => {
  for (const label of ['Home', 'Goals', 'Projects', 'Notes', 'Reflections', 'Momentum', 'Roots']) {
    assert.match(navigation, new RegExp(`label: '${label}'`));
  }
  assert.doesNotMatch(navigation, /label: 'Echo'/);
  assert.match(navigation, /DESKTOP_NAVIGATION_MIN_WIDTH = 1220/);
  assert.match(create, /New note/);
  assert.match(create, /New reflection/);
  assert.doesNotMatch(create, /New Echo/);
});

test('Notes remains the existing document workspace on canonical routes', () => {
  assert.match(notes, /feature === 'notes'/);
  assert.match(notes, /New Note/);
  assert.match(notes, /\/(?:\(app\)\/)?notes\/\[id\]/);
  assert.match(legacyEntries, /reflection \? '\/\(app\)\/reflections' : '\/\(app\)\/notes'/);
  assert.match(legacyEcho, /'\/\(app\)\/notes'/);
});

test('Reflections uses a submitted chronological journal model', () => {
  assert.match(reflections, /How are things going\?/);
  assert.match(reflections, /Save Reflection/);
  assert.match(reflections, /right\.createdAt\.getTime\(\) - left\.createdAt\.getTime\(\)/);
  assert.match(reflections, /completedAt: editingEntry\?\.completedAt\?\.toISOString\(\) \?\? now\.toISOString\(\)/);
  assert.match(reflections, /Edit Reflection/);
  assert.match(reflections, /Delete Reflection/);
  assert.match(reflections, /Private to me/);
  assert.match(reflections, /Shared with Project/);
  assert.match(reflections, /Shared with Guide/);
  assert.match(entriesDb, /projectShareScope: row\.project_share_scope \?\? 'private'/);
});

test('Project flows preserve context across Goals, Notes, and Reflections', () => {
  assert.match(projects, /baseGoalWorkspaceHref\(goalId, status, \{ projectId, taskId \}\)/);
  assert.match(projects, /'\/\(app\)\/notes' : '\/\(app\)\/reflections'/);
  assert.match(projects, /projectId: project\.id/);
  assert.match(goals, /Projects<\/Typography>/);
  assert.match(goals, /Project: \{associatedProject\.title\}/);
  assert.match(goals, /Goals<\/Typography>/);
});

test('Echo is the contextual deterministic insight persona', () => {
  assert.match(intelligence, />\s*Echo\s*</);
  assert.match(intelligence, /name="echo"/);
  assert.match(intelligence, /— \{label\}/);
  assert.match(momentum, /'Monthly Insight' : 'Weekly Insight'/);
  assert.doesNotMatch(navigation, /href: '\/\(app\)\/echo'/);
});
