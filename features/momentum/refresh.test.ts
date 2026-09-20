import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(
  decodeURIComponent(new URL(path, import.meta.url).pathname),
  'utf8',
);

test('canonical Goal and Task completion writes request a best-effort Momentum refresh', () => {
  const goalDetail = read('../goals/hooks/useGoalDetail.ts');
  const goalTasks = read('../tasks/hooks/useGoalTasks.ts');

  // Goal-detail completions (milestone, tracker, and goal status) refresh Momentum.
  assert.match(goalDetail, /onCompleteTracker[\s\S]*refreshMomentumAfterMeaningfulMutation\(\)/);
  assert.match(goalDetail, /onCompleteMilestone[\s\S]*refreshMomentumAfterMeaningfulMutation\(\)/);
  assert.match(goalDetail, /updates\.status !== undefined[\s\S]*refreshMomentumAfterMeaningfulMutation\(\)/);
  // Home completes Tasks through useGoalTasks (the dashboard is now Circles, with
  // no completion handler of its own); an occurrence completion refreshes Momentum.
  assert.match(goalTasks, /runOccurrence[\s\S]*refreshMomentumAfterMeaningfulMutation\(\)/);
});

test('only qualified linked Reflections or newly completed progress anchors refresh Momentum', () => {
  const entriesStore = read('../entries/store.ts');

  assert.match(
    entriesStore,
    /reflectionEvidenceChanged\(previous, draft\)/,
  );
  assert.match(entriesStore, /addedCompletedProgressEvidence\(previous, draft\)/);
  assert.match(entriesStore, /reference\.progressEvidence && reference\.checkboxCompleted/);
  assert.match(entriesStore, /previousQualified !== nextQualified/);
});

test('forced refresh invalidates the authenticated provisional summary cache', () => {
  const hook = read('./hooks/useMomentumHomeSummary.ts');

  assert.match(hook, /useAuthStore\.getState\(\)\.session\?\.user\.id/);
  assert.match(hook, /refreshMomentumAfterMeaningfulMutation/);
  assert.match(hook, /loadMomentum\(userId, true\)/);
});
