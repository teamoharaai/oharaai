import assert from 'node:assert/strict';
import test from 'node:test';
import { isActiveRoute } from './navigation-state.ts';

test('navigation active state is derived only from the current route family', () => {
  const goals = ['/goals'];
  const projects = ['/projects'];
  assert.equal(isActiveRoute('/goals', goals), true);
  assert.equal(isActiveRoute('/goals/goal-id', goals), true);
  assert.equal(isActiveRoute('/projects/project-id', goals), false);
  assert.equal(isActiveRoute('/projects/project-id', projects), true);
  assert.equal(isActiveRoute('/calendar', goals), false);
});
