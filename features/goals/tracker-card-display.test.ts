import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Text-level assertions for the Task 8 card wiring that a pure unit test cannot
// reach (React component + hook props). Mirrors tracker-detail-state.test.ts:
// read the source and assert the contract-critical shape is present.

const read = (path: string) =>
  readFileSync(decodeURIComponent(new URL(path, import.meta.url).pathname), 'utf8');

test('the card drives display off periodState, not the legacy scalar', () => {
  const card = read('./components/TrackerCard.tsx');

  // Counter/habit current value and progress come from the display helpers over
  // periodState — the legacy `displayValue` local state is gone entirely.
  assert.doesNotMatch(card, /displayValue/);
  assert.match(card, /currentPeriodValue\(tracker\.periodState\)/);
  assert.match(card, /counterProgressPercent\(currentValue, tracker\.targetValue\)/);
  assert.match(card, /isTrackerPeriodComplete\(tracker\.periodState\)/);
});

test('habit history renders the seven periodState buckets, not target-derived dots', () => {
  const card = read('./components/TrackerCard.tsx');

  assert.match(card, /habitBucketViews\(tracker\.periodState, tracker\.frequency\)/);
  // The old dotCount/filledDots math is retired.
  assert.doesNotMatch(card, /dotCount/);
  assert.doesNotMatch(card, /filledDots/);
  // Each dot carries an accessible bucket label.
  assert.match(card, /accessibilityLabel=\{bucket\.accessibilityLabel\}/);
});

test('checklist checked/strike derives from isCompleted only', () => {
  const card = read('./components/TrackerCard.tsx');

  // No lingering legacy `>= target` fallback for checklist rendering.
  assert.doesNotMatch(card, /displayValue >= target/);
  assert.match(card, /textDecorationLine: isCompleted \? 'line-through' : 'none'/);
});

test('the complete/uncomplete toggle is an accessible checkbox threading onLogUncomplete', () => {
  const card = read('./components/TrackerCard.tsx');

  assert.match(card, /accessibilityRole="checkbox"/);
  assert.match(card, /accessibilityState=\{\{ checked: isCompleted, disabled: toggleDisabled \}\}/);
  // The toggle picks the uncomplete handler when already completed.
  assert.match(card, /const handler = isCompleted \? onLogUncomplete : onLogComplete/);
  assert.match(card, /onLogUncomplete\?: \(trackerId: string\) => Promise<void>/);
});

test('onUncompleteTracker is threaded hook -> panel -> card', () => {
  const panel = read('./components/TrackersPanel.tsx');
  const workspace = read('./components/GoalsWorkspace.tsx');

  assert.match(panel, /onLogUncomplete\?: \(trackerId: string\) => Promise<void>/);
  assert.match(panel, /onLogUncomplete=\{onLogUncomplete\}/);
  assert.match(workspace, /onLogUncomplete=\{goalDetail\.onUncompleteTracker\}/);
});

test('the dead TrackerList component is removed from GoalsWorkspace', () => {
  const workspace = read('./components/GoalsWorkspace.tsx');
  assert.doesNotMatch(workspace, /function TrackerList/);
  // Its sole `Tracker` type import is cleaned up too.
  assert.doesNotMatch(workspace, /import type \{ GoalMilestone, GoalWithDetails, Tracker \}/);
});
