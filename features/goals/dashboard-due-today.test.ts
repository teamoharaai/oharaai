import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

// Text-level assertions for the Task 9 dashboard daily-state migration that a
// pure unit test cannot reach (React component + Expo API route). Mirrors
// tracker-detail-state.test.ts: read the source and assert the contract-critical
// shape is present. The pure daily-window/completion logic is covered directly in
// lib/goals/due-today.test.ts.

const read = (path: string) =>
  readFileSync(decodeURIComponent(new URL(path, import.meta.url).pathname), 'utf8');
const resolve = (path: string) =>
  decodeURIComponent(new URL(path, import.meta.url).pathname);

test('dashboard due-today posts to the shared /api/trackers/log route, not the legacy route', () => {
  const dashboard = read('../../app/(app)/dashboard.tsx');

  assert.doesNotMatch(dashboard, /\/api\/goals\/complete-tracker/);
  assert.match(dashboard, /authedFetch\('\/api\/trackers\/log'/);
});

test('dashboard picks the action by tracker type (counter-log vs complete)', () => {
  const dashboard = read('../../app/(app)/dashboard.tsx');

  assert.match(
    dashboard,
    /item\.type === 'counter' \? 'counter-log' : 'complete'/,
  );
});

test('dashboard reconciles completion from the canonical periodState, not a client clock', () => {
  const dashboard = read('../../app/(app)/dashboard.tsx');

  // Consumes the server boolean and reconciles from the mutation response.
  assert.match(dashboard, /isCompletedThisPeriod/);
  assert.match(dashboard, /payload\.periodState\?\.isCompleted \?\? false/);
  // The old browser-timezone date comparison is gone.
  assert.doesNotMatch(dashboard, /isCompletedToday/);
  assert.doesNotMatch(dashboard, /lastCompletedAt/);
});

test('dashboard refreshes the zone at the daily boundary and on foreground/focus', () => {
  const dashboard = read('../../app/(app)/dashboard.tsx');

  assert.match(dashboard, /useTrackerBoundaryRefresh\(boundaryTrackers/);
  assert.match(dashboard, /periodEndExclusive/);
});

test('due-today API is timezone-aware and returns log-derived booleans, not stale scalars', () => {
  const route = read('../../app/api/trackers/due-today+api.ts');

  // Reads the user timezone and derives the window via the shared cadence utils.
  assert.match(route, /\.from\('profiles'\)/);
  assert.match(route, /normalizeTimezone/);
  assert.match(route, /getPeriodBounds\('daily'/);
  assert.match(route, /deriveDueTodayState/);
  // Returns booleans/period end, not the legacy current_value/lastCompletedAt.
  assert.match(route, /isCompletedThisPeriod/);
  assert.match(route, /periodEndExclusive/);
  assert.doesNotMatch(route, /current_value/);
  assert.doesNotMatch(route, /lastCompletedAt/);
  // Only today's logs, paginated — never the full history.
  assert.match(route, /fetchAllPages/);
  assert.match(route, /\.gte\('logged_at', startIso\)/);
  assert.match(route, /\.lt\('logged_at', endIso\)/);
});

test('the legacy complete-tracker route and completeTracker wrapper are deleted', () => {
  // The route file is gone.
  assert.equal(existsSync(resolve('../../app/api/goals/complete-tracker+api.ts')), false);

  // The thin wrapper is gone, but the shared mutation core/adapter remain.
  const goalsDb = read('../../lib/db/goals.ts');
  assert.doesNotMatch(goalsDb, /export async function completeTracker/);
  assert.match(goalsDb, /export async function logTrackerMutation/);
  assert.match(goalsDb, /export function createTrackerMutationDb/);
});
