import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(
  decodeURIComponent(new URL(path, import.meta.url).pathname),
  'utf8',
);

test('Goal and Home completion writes request a best-effort Momentum refresh', () => {
  const goalDetail = read('../goals/hooks/useGoalDetail.ts');
  const dashboard = read('../../app/(app)/dashboard.tsx');

  assert.match(goalDetail, /onCompleteTracker[\s\S]*refreshMomentumAfterMeaningfulMutation\(\)/);
  assert.match(goalDetail, /onCompleteMilestone[\s\S]*refreshMomentumAfterMeaningfulMutation\(\)/);
  assert.match(dashboard, /handleComplete[\s\S]*refreshMomentumAfterMeaningfulMutation\(\)/);
  assert.match(dashboard, /status === 'complete'[\s\S]*refreshMomentumAfterMeaningfulMutation\(\)/);
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
