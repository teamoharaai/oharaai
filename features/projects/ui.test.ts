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
const sharedVault = readFileSync(resolve(process.cwd(), 'features/goals/components/GoalVault.tsx'), 'utf8');
const brandIcon = readFileSync(resolve(process.cwd(), 'components/ui/BrandIcon.tsx'), 'utf8');

test('Projects is a first-class horizontal navigation destination', () => {
  assert.match(nav, /label: 'Projects'.*href: '\/\(app\)\/projects'/);
  assert.match(brandIcon, /name === 'project'[\s\S]*folder-outline/);
});

test('landing uses meaningful data without progress percentages or imagery', () => {
  assert.match(landing, /Your bigger picture/);
  assert.match(landing, /fetchProjectSummaries/);
  assert.doesNotMatch(landing, /progress percentage|scenic|quote/i);
});

test('workspace contains approved overview and owner-only Vault hierarchy', () => {
  for (const label of ['Current Goals', 'Recent Activity', 'Notes', 'Reflections', 'Project Tasks', 'Project Snapshot', 'Momentum Snapshot', 'OHARA Intelligence']) assert.match(workspace, new RegExp(label));
  assert.doesNotMatch(workspace, /title="Sticky Notes"/);
  assert.match(vault, /Project Sticky Note/);
  assert.match(vault, /Private to you/);
  assert.match(vault, /origins/);
});

test('Project Vault separates Notes and Reflections and applies strict Source semantics', () => {
  assert.match(sharedVault, /title="Notes"/);
  assert.match(sharedVault, /title="Reflections"/);
  assert.match(sharedVault, /filter\(isSourceVaultItem\)/);
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
