// Pure Task 7 partition of goal-detail trackers into Ongoing vs Completed.
//
// Completion is DB-derived: a tracker is Completed when its log-derived
// `periodState.isCompleted` is true. A null period state (cadence not configured
// OR not yet hydrated) is NOT authoritative-incomplete-vs-complete in the
// negative sense we act on here — those trackers stay Ongoing and keep their
// "cadence not set" affordance / first-paint loading flow (PLAN Task 7).
//
// Keeping this pure and out of the component mirrors the Task 6 split
// (tracker-optimism.ts / tracker-boundary.ts are pure + node-tested; the
// component is a thin shell). TrackersPanel calls this from a useMemo.
//
// D-004: this module is reached by a node test, so it uses relative paths and
// `import type` only (erased at runtime). Do not add `@/` imports.

/** Minimal shape the partition needs: a sort key plus the completion flag. */
type GroupableTracker = {
  sortOrder: number;
  periodState: { isCompleted: boolean } | null;
};

export interface TrackerGroups<T> {
  ongoing: T[];
  completed: T[];
}

/**
 * True when the tracker's current period is log-derived complete. A null period
 * state (null cadence or not-yet-hydrated) is treated as not-complete, so the
 * tracker stays Ongoing. Mirrors `TrackerCard`'s own derivation from Task 6.
 */
export function isTrackerCompleted(tracker: {
  periodState: { isCompleted: boolean } | null;
}): boolean {
  return tracker.periodState?.isCompleted ?? false;
}

/**
 * Partition trackers into Ongoing and Completed by `periodState?.isCompleted`,
 * preserving ascending `sortOrder` within each section. Null-cadence and
 * not-yet-hydrated trackers stay in Ongoing.
 */
export function partitionTrackersByCompletion<T extends GroupableTracker>(
  trackers: readonly T[],
): TrackerGroups<T> {
  const sorted = [...trackers].sort((left, right) => left.sortOrder - right.sortOrder);
  const ongoing: T[] = [];
  const completed: T[] = [];
  for (const tracker of sorted) {
    if (isTrackerCompleted(tracker)) completed.push(tracker);
    else ongoing.push(tracker);
  }
  return { ongoing, completed };
}
