// Shared, authenticated tracker-log mutation core (Task 5).
//
// One entry point — `mutateTrackerLog` — backs every tracker write the goal
// surface performs: checklist/habit completion, counter `+1` logging, and
// habit/checklist uncomplete. `tracker_logs` is the sole evidence; this module
// NEVER writes `trackers.current_value`. The server resolves tracker
// type/frequency/target/timezone and the authoritative period bounds; nothing
// is trusted from the request body except the identifiers and (for counter
// logging) a validated positive value.
//
// Database access is injected through the narrow `TrackerMutationDb` port so the
// orchestration (ownership, successor/read-only rejection, idempotency,
// uncomplete-deletes-all, null-cadence rejection, DTO derivation) is
// deterministic and unit-testable without a live database. The real
// Supabase-backed adapter lives in `lib/db/goals.ts` (which may use `@/`
// aliases); this module stays on relative imports so it is reachable from
// `node --experimental-strip-types --test` (D-004).

import {
  getPeriodBounds,
  getRecentPeriodBounds,
  isWithinPeriod,
  type PeriodBounds,
  type TrackerCadence,
} from '../goals/tracker-cadence.ts';
import {
  deriveTrackerPeriodState,
  RECENT_PERIOD_COUNT,
  type TrackerMeasure,
  type TrackerPeriodBucket,
  type TrackerPeriodLog,
  type TrackerPeriodState,
} from '../goals/tracker-period.ts';
import { normalizeTimezone } from '../time/zoned-calendar.ts';

/** The three write intents the shared route multiplexes over. */
export type TrackerLogAction = 'complete' | 'counter-log' | 'uncomplete';

export const TRACKER_LOG_ACTIONS: readonly TrackerLogAction[] = [
  'complete',
  'counter-log',
  'uncomplete',
];

export type TrackerMutationErrorCode =
  | 'GOAL_HAS_SUCCESSOR'
  | 'GOAL_NOT_FOUND'
  | 'TRACKER_NOT_FOUND'
  | 'CADENCE_NOT_SET'
  | 'INVALID_ACTION'
  | 'INVALID_VALUE';

/** Typed failure so the route can map each cause to a precise HTTP status. */
export class TrackerMutationError extends Error {
  readonly code: TrackerMutationErrorCode;

  constructor(code: TrackerMutationErrorCode, message: string) {
    super(message);
    this.name = 'TrackerMutationError';
    this.code = code;
  }
}

/** HTTP status for each mutation error cause. */
export function trackerMutationErrorStatus(code: TrackerMutationErrorCode): number {
  switch (code) {
    case 'GOAL_HAS_SUCCESSOR':
      return 409;
    case 'GOAL_NOT_FOUND':
    case 'TRACKER_NOT_FOUND':
      return 404;
    case 'CADENCE_NOT_SET':
      return 422;
    case 'INVALID_ACTION':
    case 'INVALID_VALUE':
      return 400;
    default:
      return 500;
  }
}

/** Server-resolved tracker metadata — never sourced from the request body. */
export interface TrackerMutationMeta {
  type: TrackerMeasure;
  targetValue: number | null;
  frequency: TrackerCadence | null;
}

/**
 * Narrow database port. The adapter maps these to authenticated Supabase queries
 * (RLS scopes every table tracker -> goal -> user), so this core needs no
 * ownership plumbing beyond calling them.
 */
export interface TrackerMutationDb {
  /** True when a continuation goal already extends `goalId` (read-only phase). */
  hasSuccessor(goalId: string): Promise<boolean>;
  /** True when `goalId` belongs to `userId`. */
  isGoalOwnedByUser(goalId: string, userId: string): Promise<boolean>;
  /** The tracker's server-resolved metadata, or null if it is not in the goal. */
  getTracker(trackerId: string, goalId: string): Promise<TrackerMutationMeta | null>;
  /** The user's stored IANA timezone (normalized by the core, not the port). */
  getProfileTimezone(userId: string): Promise<string>;
  /** Every log for `trackerId` at/after `lowerBoundIso`, paginated + ordered. */
  fetchPeriodLogs(trackerId: string, lowerBoundIso: string): Promise<TrackerPeriodLog[]>;
  /** Inserts one `tracker_logs` row. Never touches `trackers.current_value`. */
  insertLog(trackerId: string, value: number, loggedAtIso: string): Promise<void>;
  /** Deletes every log for `trackerId` in the half-open `[startIso, endIso)`. */
  deleteLogsInRange(trackerId: string, startIso: string, endExclusiveIso: string): Promise<void>;
}

export interface TrackerLogMutationInput {
  action: TrackerLogAction;
  trackerId: string;
  goalId: string;
  userId: string;
  /** Counter-log only: a finite positive increment. Defaults to 1. */
  value?: number;
}

// ─── Wire DTO (ISO strings; client converts to Date at its mapping boundary) ──

export interface TrackerPeriodBucketDto {
  startInclusive: string;
  endExclusive: string;
  value: number;
  hasLog: boolean;
}

export interface TrackerPeriodStateDto {
  asOf: string;
  timezone: string;
  startInclusive: string;
  endExclusive: string;
  currentValue: number;
  isCompleted: boolean;
  recentPeriods: TrackerPeriodBucketDto[];
}

export interface TrackerLogMutationResult {
  success: true;
  /** Authoritative post-mutation period state, or null for null-cadence. */
  periodState: TrackerPeriodStateDto | null;
}

function bucketToDto(bucket: TrackerPeriodBucket): TrackerPeriodBucketDto {
  return {
    startInclusive: bucket.startInclusive.toISOString(),
    endExclusive: bucket.endExclusive.toISOString(),
    value: bucket.value,
    hasLog: bucket.hasLog,
  };
}

/** Serializes a derived period state to its ISO-string wire form. */
export function periodStateToDto(state: TrackerPeriodState | null): TrackerPeriodStateDto | null {
  if (!state) return null;
  return {
    asOf: state.asOf.toISOString(),
    timezone: state.timezone,
    startInclusive: state.startInclusive.toISOString(),
    endExclusive: state.endExclusive.toISOString(),
    currentValue: state.currentValue,
    isCompleted: state.isCompleted,
    recentPeriods: state.recentPeriods.map(bucketToDto),
  };
}

/** The checklist/habit completion value: a positive target, else 1. */
function completionValue(meta: TrackerMutationMeta): number {
  if (meta.type === 'checklist') return 1;
  // habit
  return meta.targetValue !== null && meta.targetValue > 0 ? meta.targetValue : 1;
}

function assertActionForType(action: TrackerLogAction, type: TrackerMeasure): void {
  if (action === 'counter-log' && type !== 'counter') {
    throw new TrackerMutationError(
      'INVALID_ACTION',
      'Counter logging is only valid for counter trackers.',
    );
  }
  if (action === 'complete' && type === 'counter') {
    throw new TrackerMutationError(
      'INVALID_ACTION',
      'Counters progress through logging their value, not one-tap complete.',
    );
  }
  if (action === 'uncomplete' && type === 'counter') {
    throw new TrackerMutationError(
      'INVALID_ACTION',
      'Counter trackers cannot be uncompleted.',
    );
  }
}

function resolveCounterValue(raw: number | undefined): number {
  const value = raw ?? 1;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TrackerMutationError(
      'INVALID_VALUE',
      'Counter log value must be a finite positive number.',
    );
  }
  return value;
}

/**
 * Applies one tracker-log mutation and returns the authoritative post-mutation
 * period state.
 *
 * Ordering of checks (every action): successor/read-only -> goal ownership ->
 * tracker-in-goal -> action/type compatibility -> null-cadence rejection. Then
 * one bounded, paginated read (seven-period window) supplies the pre-state; the
 * mutation is applied and the DTO derived from the resulting log set with the
 * SAME captured `asOf`, so the response is internally consistent without a
 * second round-trip.
 *
 * - complete (checklist/habit): idempotent — if a current-period log already
 *   exists, no row is inserted and current state is returned.
 * - counter-log: inserts one finite-positive-value row (default 1).
 * - uncomplete (checklist/habit): deletes ALL current-period logs so retries or
 *   older clients cannot leave the derived completion stuck true.
 */
export async function mutateTrackerLog(
  input: TrackerLogMutationInput,
  db: TrackerMutationDb,
  asOf: Date = new Date(),
): Promise<TrackerLogMutationResult> {
  const { action, trackerId, goalId, userId } = input;

  if (await db.hasSuccessor(goalId)) {
    throw new TrackerMutationError(
      'GOAL_HAS_SUCCESSOR',
      'Goal has a successor and is read-only',
    );
  }

  if (!(await db.isGoalOwnedByUser(goalId, userId))) {
    throw new TrackerMutationError('GOAL_NOT_FOUND', 'Goal not found');
  }

  const meta = await db.getTracker(trackerId, goalId);
  if (!meta) {
    throw new TrackerMutationError('TRACKER_NOT_FOUND', 'Tracker not found');
  }

  assertActionForType(action, meta.type);

  if (meta.frequency === null) {
    throw new TrackerMutationError(
      'CADENCE_NOT_SET',
      'Set a daily, weekly, or monthly cadence before logging progress.',
    );
  }

  const timezone = normalizeTimezone(await db.getProfileTimezone(userId));
  const currentBounds: PeriodBounds = getPeriodBounds(meta.frequency, asOf, timezone);
  const recentBounds = getRecentPeriodBounds(meta.frequency, asOf, timezone, RECENT_PERIOD_COUNT);
  const recentLowerBoundIso = recentBounds[0].startInclusive.toISOString();

  // Single bounded read: the seven-period window covers the current period, so
  // it serves both the idempotency check and the derived DTO.
  const priorLogs = await db.fetchPeriodLogs(trackerId, recentLowerBoundIso);

  let finalLogs: TrackerPeriodLog[];

  if (action === 'uncomplete') {
    await db.deleteLogsInRange(
      trackerId,
      currentBounds.startInclusive.toISOString(),
      currentBounds.endExclusive.toISOString(),
    );
    finalLogs = priorLogs.filter((log) => !isWithinPeriod(log.loggedAt, currentBounds));
  } else if (action === 'counter-log') {
    const value = resolveCounterValue(input.value);
    await db.insertLog(trackerId, value, asOf.toISOString());
    finalLogs = [...priorLogs, { value, loggedAt: asOf }];
  } else {
    // complete (checklist/habit) — idempotent within the current period.
    const alreadyLogged = priorLogs.some((log) => isWithinPeriod(log.loggedAt, currentBounds));
    if (alreadyLogged) {
      finalLogs = priorLogs;
    } else {
      const value = completionValue(meta);
      await db.insertLog(trackerId, value, asOf.toISOString());
      finalLogs = [...priorLogs, { value, loggedAt: asOf }];
    }
  }

  const state = deriveTrackerPeriodState(meta, finalLogs, timezone, asOf);
  return { success: true, periodState: periodStateToDto(state) };
}
