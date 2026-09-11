import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Text-level assertions for the goal-detail state wiring that a pure unit test
// cannot reach (React hook + components). Mirrors the repo's refresh.test.ts
// style: read the source and assert the contract-critical shape is present.

const read = (path: string) =>
  readFileSync(decodeURIComponent(new URL(path, import.meta.url).pathname), 'utf8');

test('the local completion set is fully removed — completion is DB-derived', () => {
  const hook = read('./hooks/useGoalDetail.ts');
  const panel = read('./components/TrackersPanel.tsx');
  const workspace = read('./components/GoalsWorkspace.tsx');
  const card = read('./components/TrackerCard.tsx');

  assert.doesNotMatch(hook, /completedTrackerIds/);
  assert.doesNotMatch(panel, /completedIds/);
  assert.doesNotMatch(workspace, /completedIds/);
  // The card's checked-state now derives from the log-derived period state via
  // the pure display helper (Task 8 moved the inline expression into it).
  assert.match(card, /isTrackerPeriodComplete\(tracker\.periodState\)/);
});

test('all three tracker mutations go through the shared /api/trackers/log route', () => {
  const hook = read('./hooks/useGoalDetail.ts');

  // Migrated off the legacy complete-tracker route.
  assert.doesNotMatch(hook, /\/api\/goals\/complete-tracker/);
  assert.match(hook, /action: 'complete'/);
  assert.match(hook, /action: 'uncomplete'/);
  assert.match(hook, /action: 'counter-log'/);
  // Reconciles from the returned period state via the shared mapping boundary.
  assert.match(hook, /periodStateFromDto/);
});

test('every mutation is optimism + in-flight + ordering guarded', () => {
  const hook = read('./hooks/useGoalDetail.ts');

  for (const optimism of ['applyOptimisticComplete', 'applyOptimisticUncomplete', 'applyOptimisticCounter']) {
    assert.match(hook, new RegExp(optimism));
  }
  assert.match(hook, /beginMutation\(mutationRegistry\.current/);
  assert.match(hook, /isLatestMutation\(mutationRegistry\.current/);
  assert.match(hook, /endMutation\(mutationRegistry\.current/);
  // Rollback writes go through the functional patch, not a whole-object replace.
  assert.match(hook, /patchTracker\(goalId, trackerId, \{ periodState: previousPeriodState \}\)/);
});

test('a frequency or target edit invalidates and rederives the period state', () => {
  const hook = read('./hooks/useGoalDetail.ts');

  assert.match(hook, /invalidatesPeriod/);
  assert.match(hook, /'frequency' in updates && updates\.frequency !== current\.frequency/);
  assert.match(hook, /'targetValue' in updates && updates\.targetValue !== current\.targetValue/);
  // On invalidation it drops the stale state and re-hydrates rather than keeping it.
  assert.match(hook, /if \(invalidatesPeriod\)[\s\S]*periodState: null[\s\S]*refreshDetail\(\)/);
});

test('boundary refresh watches the timer AND foreground/visibility/focus', () => {
  const boundary = read('./hooks/useTrackerBoundaryRefresh.ts');

  assert.match(boundary, /setTimeout\(refresh/);
  assert.match(boundary, /AppState\.addEventListener\('change'/);
  assert.match(boundary, /status === 'active'/);
  assert.match(boundary, /visibilitychange/);
  assert.match(boundary, /window\.addEventListener\('focus'/);
});
