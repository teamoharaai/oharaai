import assert from 'node:assert/strict';
import test from 'node:test';

import { getGoalWorkspaceSelection, goalWorkspaceHref } from './navigation.ts';

test('encodes the selected goal in the canonical workspace URL', () => {
  assert.equal(goalWorkspaceHref('goal/with spaces'), '/(app)/goals?goal=goal%2Fwith%20spaces');
});

test('prefers the canonical goal parameter while accepting legacy selected links', () => {
  assert.equal(getGoalWorkspaceSelection({ goal: 'canonical', selected: 'legacy' }), 'canonical');
  assert.equal(getGoalWorkspaceSelection({ selected: ['legacy'] }), 'legacy');
  assert.equal(getGoalWorkspaceSelection({}), null);
});
