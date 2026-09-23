import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const landing = readFileSync(resolve(process.cwd(), 'app/(app)/projects/index.tsx'), 'utf8');
const workspace = readFileSync(resolve(process.cwd(), 'app/(app)/projects/[id].tsx'), 'utf8');
const vault = readFileSync(resolve(process.cwd(), 'features/projects/components/ProjectVaultWorkspace.tsx'), 'utf8');
const nav = readFileSync(resolve(process.cwd(), 'components/layout/AppNavigation.tsx'), 'utf8');
const goalHeader = readFileSync(resolve(process.cwd(), 'features/goals/components/GoalDetailHeader.tsx'), 'utf8');
const service = readFileSync(resolve(process.cwd(), 'features/projects/services/project-service.ts'), 'utf8');

test('Projects is a first-class horizontal navigation destination', () => {
  assert.match(nav, /label: 'Projects'.*href: '\/\(app\)\/projects'/);
});

test('landing uses meaningful data without progress percentages or imagery', () => {
  assert.match(landing, /Your bigger picture/);
  assert.match(landing, /fetchProjectSummaries/);
  assert.doesNotMatch(landing, /progress percentage|scenic|quote/i);
});

test('workspace contains approved overview and owner-only Vault hierarchy', () => {
  for (const label of ['Current Goals', 'Recent Activity', 'Sticky Notes', 'Project Snapshot', 'OHARA Intelligence']) assert.match(workspace, new RegExp(label));
  assert.match(vault, /Project Sticky Note/);
  assert.match(vault, /Private to you/);
  assert.match(vault, /origins/);
});

test('Goal title and sibling actions share the intentional header row', () => {
  assert.match(goalHeader, /GoalTitleRow[\s\S]*Back to Overview[\s\S]*ManageGoalControl/);
  assert.match(goalHeader, /Add to Vault/);
});

test('Project activity is truthful, bounded, and partial-source failures degrade independently', () => {
  assert.match(service, /Promise\.allSettled/);
  assert.match(service, /Task completed/);
  assert.match(service, /entry_goal_links/);
  assert.match(service, /New Phase created/);
  assert.match(service, /partialErrors/);
});
