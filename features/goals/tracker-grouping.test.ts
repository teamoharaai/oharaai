import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  isTrackerCompleted,
  partitionTrackersByCompletion,
} from './tracker-grouping.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
//
// Task 7 keys purely off `periodState?.isCompleted` (the derivation itself is
// Task 3/4's job, already tested in lib/goals/tracker-period.test.ts). So these
// fixtures set the derived completion flag directly and annotate which product
// case each one represents.

type FakeTracker = {
  id: string;
  type: 'counter' | 'habit' | 'checklist';
  sortOrder: number;
  periodState: { isCompleted: boolean } | null;
};

function tracker(overrides: Partial<FakeTracker> = {}): FakeTracker {
  return {
    id: 't',
    type: 'habit',
    sortOrder: 0,
    periodState: { isCompleted: false },
    ...overrides,
  };
}

// ─── isTrackerCompleted ───────────────────────────────────────────────────────

test('isTrackerCompleted: null period state (null cadence / unhydrated) is not complete', () => {
  assert.equal(isTrackerCompleted(tracker({ periodState: null })), false);
});

test('isTrackerCompleted reflects the derived completion flag', () => {
  assert.equal(isTrackerCompleted(tracker({ periodState: { isCompleted: true } })), true);
  assert.equal(isTrackerCompleted(tracker({ periodState: { isCompleted: false } })), false);
});

// ─── partitionTrackersByCompletion ────────────────────────────────────────────

test('checklist/habit with a current-period log land in Completed', () => {
  // A current-period log makes checklist/habit derive isCompleted: true.
  const checklist = tracker({ id: 'c', type: 'checklist', periodState: { isCompleted: true } });
  const habit = tracker({ id: 'h', type: 'habit', periodState: { isCompleted: true } });
  const { ongoing, completed } = partitionTrackersByCompletion([checklist, habit]);
  assert.deepEqual(ongoing.map((t) => t.id), []);
  assert.deepEqual(completed.map((t) => t.id), ['c', 'h']);
});

test('counter below target stays Ongoing; at/above target moves to Completed', () => {
  const below = tracker({ id: 'below', type: 'counter', sortOrder: 0, periodState: { isCompleted: false } });
  const atOrAbove = tracker({ id: 'reached', type: 'counter', sortOrder: 1, periodState: { isCompleted: true } });
  const { ongoing, completed } = partitionTrackersByCompletion([below, atOrAbove]);
  assert.deepEqual(ongoing.map((t) => t.id), ['below']);
  assert.deepEqual(completed.map((t) => t.id), ['reached']);
});

test('null-cadence trackers stay in Ongoing', () => {
  const nullCadence = tracker({ id: 'n', periodState: null });
  const { ongoing, completed } = partitionTrackersByCompletion([nullCadence]);
  assert.deepEqual(ongoing.map((t) => t.id), ['n']);
  assert.deepEqual(completed.map((t) => t.id), []);
});

test('an empty section yields an empty array (so the panel renders no header)', () => {
  // Nothing completed → completed is empty → no Completed header.
  const onlyOngoing = partitionTrackersByCompletion([
    tracker({ id: 'a', periodState: { isCompleted: false } }),
    tracker({ id: 'b', periodState: null }),
  ]);
  assert.deepEqual(onlyOngoing.completed, []);
  assert.deepEqual(onlyOngoing.ongoing.map((t) => t.id), ['a', 'b']);

  // Everything completed → ongoing is empty → no Ongoing header.
  const onlyCompleted = partitionTrackersByCompletion([
    tracker({ id: 'x', periodState: { isCompleted: true } }),
  ]);
  assert.deepEqual(onlyCompleted.ongoing, []);
  assert.deepEqual(onlyCompleted.completed.map((t) => t.id), ['x']);
});

test('sortOrder is preserved within each section, independent of input order', () => {
  const input: FakeTracker[] = [
    tracker({ id: 'done-2', sortOrder: 5, periodState: { isCompleted: true } }),
    tracker({ id: 'go-2', sortOrder: 4, periodState: { isCompleted: false } }),
    tracker({ id: 'done-1', sortOrder: 1, periodState: { isCompleted: true } }),
    tracker({ id: 'go-1', sortOrder: 2, periodState: null }),
  ];
  const { ongoing, completed } = partitionTrackersByCompletion(input);
  // Ascending sortOrder inside each group.
  assert.deepEqual(ongoing.map((t) => t.id), ['go-1', 'go-2']);
  assert.deepEqual(completed.map((t) => t.id), ['done-1', 'done-2']);
});

test('partition does not mutate the input array', () => {
  const input = [
    tracker({ id: 'b', sortOrder: 2 }),
    tracker({ id: 'a', sortOrder: 1 }),
  ];
  partitionTrackersByCompletion(input);
  assert.deepEqual(input.map((t) => t.id), ['b', 'a']);
});

// ─── Text-level: TrackersPanel wires the partition per the Task 7 contract ─────
//
// The panel is a React component (not node-reachable), so assert its
// contract-critical shape against the source, mirroring tracker-detail-state.ts.

const read = (path: string) =>
  readFileSync(decodeURIComponent(new URL(path, import.meta.url).pathname), 'utf8');

test('TrackersPanel groups via the pure helper inside a useMemo keyed on trackers', () => {
  const panel = read('./components/TrackersPanel.tsx');
  assert.match(panel, /partitionTrackersByCompletion/);
  // Memoized derivation keyed on the trackers array (no per-keystroke re-sort).
  assert.match(panel, /useMemo\(\s*\(\)\s*=>\s*partitionTrackersByCompletion\(trackers\),\s*\[trackers\],?\s*\)/);
  // The old flat sortedTrackers list is gone.
  assert.doesNotMatch(panel, /sortedTrackers/);
});

test('TrackersPanel renders Ongoing/Completed headers only when the section is non-empty, with accessible labels', () => {
  const panel = read('./components/TrackersPanel.tsx');
  // Both section labels exist.
  assert.match(panel, /'Ongoing'/);
  assert.match(panel, /'Completed'/);
  // Headers are accessible.
  assert.match(panel, /accessibilityRole="header"/);
  // Section is skipped when empty (guards the header render).
  assert.match(panel, /sectionTrackers\.length === 0/);
});
