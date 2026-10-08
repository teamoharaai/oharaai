import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { selectCirclesSharedProjects } from './context.ts';

test('Circles includes only active collaborative Projects from the authorized result', () => {
  const projects = [
    { id: 'shared', memberCount: 3, mode: 'team', status: 'active' },
    { id: 'guide', memberCount: 2, mode: 'guide', status: 'complete' },
    { id: 'personal', memberCount: 1, mode: 'personal', status: 'active' },
    { id: 'archived', memberCount: 4, mode: 'team', status: 'archived' },
    { id: 'solo-team', memberCount: 1, mode: 'team', status: 'active' },
  ] as const;

  assert.deepEqual(selectCirclesSharedProjects(projects).map((project) => project.id), ['shared', 'guide']);
});

test('Circles context uses canonical Friends and RLS-authorized Project services', () => {
  const screen = readFileSync(resolve(process.cwd(), 'features/circles/components/CirclesScreen.tsx'), 'utf8');
  assert.match(screen, /friends=\{circles\.friends\}/);
  assert.match(screen, /fetchProjectSummaries\(circles\.myId\)/);
  assert.match(screen, /selectCirclesSharedProjects\(projects\)/);
  assert.doesNotMatch(screen, /useFeed|fetchFeed.*Home/);
});
