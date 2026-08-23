import type { SupabaseClient } from '@supabase/supabase-js';
import {
  GOAL_DIFFICULTY_VERSION,
  GOAL_MOMENTUM_VERSION,
  MOMENTUM_CATEGORY_CONFIG_VERSION,
  OHARA_MOMENTUM_VERSION,
  normalizeMomentumCategory,
} from '../config.ts';
import {
  calculateGoalDifficultyProfile,
  calculateGoalMomentum,
  calculateOharaMomentum,
} from '../engine.ts';
import {
  actionCompletionEvents,
  normalizeActionRecords,
  SCOREABLE_GOAL_STATUSES,
  type RawActionCompletion,
} from '../normalization.ts';
import {
  addLocalDays,
  getMomentumWeek,
  getPreviousMomentumWeek,
  localDateForInstant,
  normalizeTimezone,
} from '../time.ts';
import type {
  GoalDifficultySourceInput,
  GoalMomentumCalculationInput,
  GoalMomentumDiagnostic,
  GoalMomentumMode,
  GoalMomentumSummary,
  MomentumEvent,
  MomentumHistoryPoint,
  MomentumHomeSummary,
  MomentumReason,
  MomentumReasonCode,
  MomentumWeekBoundary,
  OharaGoalEvidence,
  OharaMomentumCalculationInput,
  OharaMomentumDiagnostic,
} from '../types.ts';

type GoalRow = {
  category: string;
  created_at: string;
  deadline: string | null;
  id: string;
  progress: number | string;
  smart_data: Record<string, unknown> | null;
  status: string;
  target_frequency: Record<string, unknown> | null;
  updated_at: string;
  user_id: string;
};

type ActionRow = RawActionCompletion & { actionText: string };
type MilestoneRow = {
  completedAt: string | null;
  createdAt: string;
  dueDate: string | null;
  goalId: string;
  id: string;
};
type TrackerRow = {
  currentValue: number;
  frequency: string | null;
  goalId: string;
  id: string;
  targetValue: number | null;
  type: string;
};
type TrackerLogRow = { id: string; loggedAt: string; trackerId: string; value: number };
type GoalProgressEventRow = { goalId: string; id: string; occurredAt: string };
type ReflectionRow = {
  completedAt: string | null;
  goalId: string;
  id: string;
  occurredAt: string;
  plainText: string;
  reflectionType: string | null;
};
type GoalSnapshotRow = {
  algorithm_version: string;
  calculation_hash: string;
  created_at?: string;
  current_value: number | string;
  goal_id: string;
  id: string;
  previous_value: number | string | null;
  raw_aggregates: Record<string, unknown>;
  revision: number;
  week_end: string;
  week_start: string;
};
type OharaSnapshotRow = {
  algorithm_version: string;
  calculation_hash?: string;
  created_at?: string;
  id?: string;
  next_value: number | string;
  previous_value: number | string;
  revision: number;
  week_end: string;
  week_start: string;
};

const REASON_MESSAGES: Record<MomentumReasonCode, string> = {
  COMMITMENTS_MISSED: 'Some planned commitments are still waiting for follow-through.',
  COMPONENT_UNAVAILABLE: 'The available evidence was reweighted without inventing missing data.',
  CONSISTENCY_ON_TRACK: 'You followed through on most of what you planned.',
  GROWTH_CADENCE_STEADY: 'Meaningful movement is appearing across your active goals.',
  MILESTONE_COMPLETED: 'A meaningful milestone moved forward this week.',
  NO_ELIGIBLE_ACTIVITY: 'Momentum is paused until there is enough new activity to evaluate.',
  PACE_ON_TRACK: 'Your progress matched the pace of this goal.',
  PLAN_ADAPTED: 'You adjusted your plan instead of abandoning the goal.',
  PORTFOLIO_PROGRESS_STRONG: 'Several active goals moved forward this week.',
  REFLECTION_ENGAGED: 'Reflection added context to this goal.',
  REFLECTION_TO_ACTION: 'A reflection led to a concrete next action.',
  RETURN_AFTER_DISRUPTION: 'You returned to this goal after a disruption.',
};

function reasonsForCodes(codes: readonly MomentumReasonCode[]): MomentumReason[] {
  return codes.map((code) => ({ code, message: REASON_MESSAGES[code] }));
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

export async function calculationHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function inBoundary(instant: string | null, boundary: MomentumWeekBoundary): boolean {
  if (!instant) return false;
  const time = Date.parse(instant);
  return Number.isFinite(time)
    && time >= Date.parse(boundary.startInclusive)
    && time < Date.parse(boundary.endExclusive);
}

function dateInBoundary(date: string | null, boundary: MomentumWeekBoundary): boolean {
  return Boolean(date && date >= boundary.weekStart && date <= boundary.weekEnd);
}

function mapActionRows(rows: unknown[]): ActionRow[] {
  return rows.map((row) => {
    const value = row as Record<string, unknown>;
    const relation = Array.isArray(value.goal) ? value.goal[0] : value.goal;
    const goal = relation && typeof relation === 'object' ? relation as Record<string, unknown> : null;
    return {
      actionText: typeof value.action_text === 'string' ? value.action_text : '',
      completedAt: typeof value.completed_at === 'string' ? value.completed_at : null,
      createdAt: typeof value.created_at === 'string' ? value.created_at : null,
      dueDate: typeof value.due_date === 'string' ? value.due_date : null,
      goalId: String(value.goal_id ?? ''),
      goalStatus: typeof goal?.status === 'string' ? goal.status : null,
      id: String(value.id ?? ''),
      status: typeof value.status === 'string' ? value.status : null,
      userId: String(value.user_id ?? ''),
    };
  });
}

function mergeById<T extends { id: string }>(...groups: ReadonlyArray<readonly T[]>): T[] {
  const rows = new Map<string, T>();
  for (const row of groups.flat()) if (!rows.has(row.id)) rows.set(row.id, row);
  return [...rows.values()].sort((left, right) => left.id.localeCompare(right.id));
}

async function fetchActionRows(
  db: SupabaseClient,
  userId: string,
  boundary?: MomentumWeekBoundary,
): Promise<ActionRow[]> {
  const select = 'id, goal_id, user_id, action_text, status, completed_at, created_at, due_date, goal:goals!action_logs_goal_id_fkey(status,user_id)';
  if (!boundary) {
    const { data, error } = await db.from('action_logs').select(select)
      .eq('user_id', userId).eq('status', 'complete').not('completed_at', 'is', null);
    if (error) throw new Error(`Momentum action history read failed: ${error.message}`);
    return mapActionRows(data ?? []);
  }
  const [completed, due, created] = await Promise.all([
    db.from('action_logs').select(select).eq('user_id', userId)
      .gte('completed_at', boundary.startInclusive).lt('completed_at', boundary.endExclusive),
    db.from('action_logs').select(select).eq('user_id', userId)
      .gte('due_date', boundary.weekStart).lte('due_date', boundary.weekEnd),
    db.from('action_logs').select(select).eq('user_id', userId)
      .gte('created_at', boundary.startInclusive).lt('created_at', boundary.endExclusive),
  ]);
  const error = completed.error ?? due.error ?? created.error;
  if (error) throw new Error(`Momentum action read failed: ${error.message}`);
  return mergeById(
    mapActionRows(completed.data ?? []),
    mapActionRows(due.data ?? []),
    mapActionRows(created.data ?? []),
  );
}

async function fetchGoalSourceData(
  db: SupabaseClient,
  userId: string,
  boundary: MomentumWeekBoundary,
): Promise<{
  actions: ActionRow[];
  goals: GoalRow[];
  goalProgressEvents: GoalProgressEventRow[];
  milestones: MilestoneRow[];
  reflections: ReflectionRow[];
  trackerLogs: TrackerLogRow[];
  trackers: TrackerRow[];
}> {
  const { data: goalData, error: goalError } = await db.from('goals')
    .select('id, user_id, category, status, smart_data, target_frequency, deadline, progress, created_at, updated_at')
    .eq('user_id', userId).eq('status', 'active').order('id');
  if (goalError) throw new Error(`Momentum goal read failed: ${goalError.message}`);
  const goals = (goalData ?? []) as GoalRow[];
  const goalIds = goals.map((goal) => goal.id);
  const actionsPromise = fetchActionRows(db, userId, boundary);
  if (!goalIds.length) {
    return {
      actions: await actionsPromise,
      goalProgressEvents: [],
      goals,
      milestones: [],
      reflections: [],
      trackerLogs: [],
      trackers: [],
    };
  }
  const [actions, milestoneResult, trackerResult, reflectionResult, progressEventResult] = await Promise.all([
    actionsPromise,
    db.from('milestones').select('id, goal_id, due_date, completed_at, created_at')
      .eq('user_id', userId).in('goal_id', goalIds),
    db.from('trackers').select('id, goal_id, type, target_value, current_value, frequency')
      .in('goal_id', goalIds),
    db.from('entry_goal_links')
      .select('goal_id, entries!inner(id, user_id, entry_type, reflection_type, plain_text, completed_at, created_at, updated_at, archived)')
      .in('goal_id', goalIds).eq('entries.user_id', userId)
      .eq('entries.entry_type', 'reflection').eq('entries.archived', false),
    db.from('entry_goal_progress_events').select('id, goal_id, occurred_at')
      .eq('owner_id', userId).in('goal_id', goalIds)
      .gte('occurred_at', boundary.startInclusive).lt('occurred_at', boundary.endExclusive),
  ]);
  const sourceError = milestoneResult.error ?? trackerResult.error ?? reflectionResult.error ?? progressEventResult.error;
  if (sourceError) throw new Error(`Momentum goal evidence read failed: ${sourceError.message}`);
  const trackers = (trackerResult.data ?? []).map((row) => {
    const value = row as Record<string, unknown>;
    return {
      currentValue: numberOrNull(value.current_value) ?? 0,
      frequency: typeof value.frequency === 'string' ? value.frequency : null,
      goalId: String(value.goal_id),
      id: String(value.id),
      targetValue: numberOrNull(value.target_value),
      type: String(value.type ?? ''),
    } satisfies TrackerRow;
  });
  const trackerIds = trackers.map((tracker) => tracker.id);
  const trackerLogResult = trackerIds.length
    ? await db.from('tracker_logs').select('id, tracker_id, value, logged_at')
      .in('tracker_id', trackerIds)
      .gte('logged_at', boundary.startInclusive).lt('logged_at', boundary.endExclusive)
    : { data: [], error: null };
  if (trackerLogResult.error) throw new Error(`Momentum tracker evidence read failed: ${trackerLogResult.error.message}`);
  const milestones = (milestoneResult.data ?? []).map((row) => {
    const value = row as Record<string, unknown>;
    return {
      completedAt: typeof value.completed_at === 'string' ? value.completed_at : null,
      createdAt: String(value.created_at),
      dueDate: typeof value.due_date === 'string' ? value.due_date : null,
      goalId: String(value.goal_id),
      id: String(value.id),
    } satisfies MilestoneRow;
  });
  const trackerLogs = (trackerLogResult.data ?? []).map((row) => {
    const value = row as Record<string, unknown>;
    return {
      id: String(value.id), loggedAt: String(value.logged_at), trackerId: String(value.tracker_id),
      value: numberOrNull(value.value) ?? 0,
    } satisfies TrackerLogRow;
  });
  const goalProgressEvents = (progressEventResult.data ?? []).map((row) => {
    const value = row as Record<string, unknown>;
    return {
      goalId: String(value.goal_id),
      id: String(value.id),
      occurredAt: String(value.occurred_at),
    } satisfies GoalProgressEventRow;
  });
  const reflections = (reflectionResult.data ?? []).flatMap((row) => {
    const link = row as Record<string, unknown>;
    const nested = Array.isArray(link.entries) ? link.entries[0] : link.entries;
    if (!nested || typeof nested !== 'object') return [];
    const entry = nested as Record<string, unknown>;
    return [{
      completedAt: typeof entry.completed_at === 'string' ? entry.completed_at : null,
      goalId: String(link.goal_id),
      id: String(entry.id),
      occurredAt: String(entry.completed_at ?? entry.created_at),
      plainText: typeof entry.plain_text === 'string' ? entry.plain_text : '',
      reflectionType: typeof entry.reflection_type === 'string' ? entry.reflection_type : null,
    } satisfies ReflectionRow];
  });
  return { actions, goalProgressEvents, goals, milestones, reflections, trackerLogs, trackers };
}

function targetFrequencyPerWeek(value: Record<string, unknown> | null): number | null {
  const times = numberOrNull(value?.times);
  if (times === null || times <= 0) return null;
  if (value?.period === 'day') return times * 7;
  if (value?.period === 'month') return times / 4.345;
  return value?.period === 'week' ? times : null;
}

function modeForGoal(goal: GoalRow, trackers: readonly TrackerRow[], milestones: readonly MilestoneRow[]): GoalMomentumMode {
  if (trackers.some((tracker) => tracker.type === 'counter' && tracker.targetValue !== null)) return 'numeric_target';
  if (targetFrequencyPerWeek(goal.target_frequency) !== null || trackers.some((tracker) => tracker.type === 'habit')) {
    return goal.deadline ? 'frequency_routine' : 'maintenance';
  }
  if (milestones.length) return 'milestone_project';
  return 'qualitative';
}

function smartNumber(smartData: Record<string, unknown> | null, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = numberOrNull(smartData?.[key]);
    if (value !== null && value >= 0) return value;
  }
  return null;
}

function externalDependency(smartData: Record<string, unknown> | null): GoalDifficultySourceInput['externalDependency'] {
  const value = smartData?.externalDependency ?? smartData?.external_dependency;
  return value === 'high' || value === 'moderate' || value === 'none' ? value : null;
}

function qualifiedReflection(reflection: ReflectionRow): boolean {
  const characters = reflection.plainText.replace(/\s/g, '').length;
  return characters >= 80 || Boolean(reflection.completedAt && reflection.reflectionType);
}

function normalizedGoalEvents(
  goal: GoalRow,
  boundary: MomentumWeekBoundary,
  actions: readonly ActionRow[],
  milestones: readonly MilestoneRow[],
  trackers: readonly TrackerRow[],
  logs: readonly TrackerLogRow[],
  reflections: readonly ReflectionRow[],
  progressEvents: readonly GoalProgressEventRow[],
): MomentumEvent[] {
  const category = normalizeMomentumCategory(goal.category);
  const normalizedActions = normalizeActionRecords(actions, boundary, goal.user_id);
  const actionEvents = actionCompletionEvents(normalizedActions).map((event) => ({ ...event, category, goalId: goal.id }));
  const milestoneEvents = milestones.flatMap((milestone) => {
    const events: MomentumEvent[] = [];
    if (inBoundary(milestone.createdAt, boundary)) events.push({
      category, deduplicationKey: `milestone.started:${milestone.id}`, eligibility: 'included',
      eventType: 'milestone.started', exclusionReason: null, goalId: goal.id,
      occurredAt: milestone.createdAt, sourceEntityId: milestone.id, userId: goal.user_id,
    });
    if (milestone.completedAt && inBoundary(milestone.completedAt, boundary)) events.push({
      category, deduplicationKey: `milestone.completed:${milestone.id}`, eligibility: 'included',
      eventType: 'milestone.completed', exclusionReason: null, goalId: goal.id,
      occurredAt: milestone.completedAt, sourceEntityId: milestone.id, userId: goal.user_id,
    });
    return events;
  });
  const logEvents = logs.map((log) => ({
    category, deduplicationKey: `metric.recorded:${log.id}`, eligibility: 'included' as const,
    eventType: trackers.find((tracker) => tracker.id === log.trackerId)?.type === 'habit'
      ? 'routine.occurrence_completed' as const : 'metric.recorded' as const,
    exclusionReason: null, goalId: goal.id, occurredAt: log.loggedAt,
    sourceEntityId: log.id, userId: goal.user_id,
  }));
  const reflectionEvents = reflections.map((reflection) => {
    const included = inBoundary(reflection.occurredAt, boundary) && qualifiedReflection(reflection);
    return {
      category, deduplicationKey: `reflection.created:${reflection.id}`,
      eligibility: included ? 'included' as const : 'excluded' as const,
      eventType: reflection.reflectionType === 'week'
        ? 'weekly_review.completed' as const : 'reflection.created' as const,
      exclusionReason: included ? null : 'REFLECTION_NOT_QUALIFIED_OR_OUTSIDE_WEEK',
      goalId: goal.id, occurredAt: reflection.occurredAt,
      sourceEntityId: reflection.id, userId: goal.user_id,
    };
  });
  const progressEvidenceEvents = progressEvents.map((event) => ({
    category,
    deduplicationKey: `goal.progress_updated:${event.id}`,
    eligibility: 'included' as const,
    eventType: 'goal.progress_updated' as const,
    exclusionReason: null,
    goalId: goal.id,
    occurredAt: event.occurredAt,
    sourceEntityId: event.id,
    userId: goal.user_id,
  }));
  const nextStepEvents = normalizedActions.filter((action) => (
    action.createdAt && inBoundary(action.createdAt, boundary) && action.plannedEligibility === 'included'
  )).map((action) => ({
    category, deduplicationKey: `goal.next_step_scheduled:${action.id}`,
    eligibility: 'included' as const, eventType: 'goal.next_step_scheduled' as const,
    exclusionReason: null, goalId: goal.id, occurredAt: action.createdAt!,
    sourceEntityId: action.id, userId: goal.user_id,
  }));
  return [...actionEvents, ...milestoneEvents, ...logEvents, ...reflectionEvents, ...progressEvidenceEvents, ...nextStepEvents]
    .sort((left, right) => left.deduplicationKey.localeCompare(right.deduplicationKey));
}

async function buildGoalDiagnostic(
  goal: GoalRow,
  source: Awaited<ReturnType<typeof fetchGoalSourceData>>,
  boundary: MomentumWeekBoundary,
  previousValue: number | null,
  asOf: Date,
  calculationScope: 'provisional' | 'closed',
  baselineSnapshotId: string | null,
): Promise<GoalMomentumDiagnostic> {
  const actions = source.actions.filter((row) => row.goalId === goal.id);
  const milestones = source.milestones.filter((row) => row.goalId === goal.id);
  const trackers = source.trackers.filter((row) => row.goalId === goal.id);
  const trackerIds = new Set(trackers.map((tracker) => tracker.id));
  const logs = source.trackerLogs.filter((row) => trackerIds.has(row.trackerId));
  const reflections = source.reflections.filter((row) => row.goalId === goal.id);
  const progressEvents = source.goalProgressEvents.filter((row) => row.goalId === goal.id);
  const asOfLocalDate = calculationScope === 'closed'
    ? boundary.weekEnd
    : localDateForInstant(asOf.toISOString(), boundary.timezone);
  const normalizedActions = normalizeActionRecords(
    actions,
    boundary,
    goal.user_id,
    asOfLocalDate,
    calculationScope === 'closed',
  );
  const dueActions = normalizedActions.filter((action) => action.plannedEligibility === 'included');
  const completedDueActions = dueActions.filter((action) => action.completionEligibility === 'included');
  const completedActions = normalizedActions.filter((action) => action.completionEligibility === 'included');
  const onSchedule = completedDueActions.filter((action) => (
    action.dueDate && action.completedAt
      && localDateForInstant(action.completedAt, boundary.timezone) <= action.dueDate
  ));
  const frequency = targetFrequencyPerWeek(goal.target_frequency)
    ?? (trackers.some((tracker) => tracker.frequency === 'daily') ? 7
      : trackers.some((tracker) => tracker.frequency === 'weekly') ? 1
        : trackers.some((tracker) => tracker.frequency === 'monthly') ? 1 / 4.345 : null);
  const cadenceExpected = dueActions.length ? 0 : Math.ceil(frequency ?? 0);
  const routineCompletions = cadenceExpected ? Math.min(logs.length, cadenceExpected) : 0;
  const dueMilestones = milestones.filter((milestone) => dateInBoundary(milestone.dueDate, boundary) && (
    calculationScope === 'closed' ? milestone.dueDate! <= asOfLocalDate : milestone.dueDate! < asOfLocalDate
  ));
  const completedMilestones = milestones.filter((milestone) => inBoundary(milestone.completedAt, boundary));
  const numericTrackers = trackers.filter((tracker) => tracker.type === 'counter' && tracker.targetValue !== null);
  const actualProgressDelta = numericTrackers.length
    ? logs.filter((log) => numericTrackers.some((tracker) => tracker.id === log.trackerId))
      .reduce((sum, log) => sum + Math.max(0, log.value), 0)
    : null;
  const durationWeeks = goal.deadline
    ? Math.max(1, (Date.parse(goal.deadline) - Date.parse(goal.created_at)) / (7 * 86_400_000))
    : null;
  const expectedProgressDelta = numericTrackers.length
    ? numericTrackers.reduce((sum, tracker) => sum + Math.max(0, (tracker.targetValue ?? 0) / Math.max(durationWeeks ?? 1, 1)), 0)
    : null;
  const qualified = reflections.filter((reflection) => inBoundary(reflection.occurredAt, boundary) && qualifiedReflection(reflection));
  const firstReflectionAt = qualified.reduce<number | null>((earliest, reflection) => {
    const timestamp = Date.parse(reflection.occurredAt);
    return earliest === null || timestamp < earliest ? timestamp : earliest;
  }, null);
  const reflectionToAction = firstReflectionAt !== null && actions.some((action) => (
    action.createdAt && inBoundary(action.createdAt, boundary) && Date.parse(action.createdAt) > firstReflectionAt
  ));
  const dueCommitmentUnits = dueActions.length + cadenceExpected;
  const completedCommitmentUnits = completedDueActions.length + routineCompletions;
  const qualifyingDisruption = dueCommitmentUnits - completedCommitmentUnits >= 2;
  const meaningfulDays = new Set([
    ...completedActions.flatMap((action) => action.completedAt ? [localDateForInstant(action.completedAt, boundary.timezone)] : []),
    ...logs.map((log) => localDateForInstant(log.loggedAt, boundary.timezone)),
    ...completedMilestones.flatMap((milestone) => milestone.completedAt ? [localDateForInstant(milestone.completedAt, boundary.timezone)] : []),
    ...progressEvents.map((event) => localDateForInstant(event.occurredAt, boundary.timezone)),
  ]).size;
  const goalMode = modeForGoal(goal, trackers, milestones);
  const planRevisionKey = await calculationHash({
    category: goal.category,
    deadline: goal.deadline,
    milestones: milestones.map(({ id, createdAt, dueDate }) => ({ id, createdAt, dueDate })),
    smartData: goal.smart_data,
    targetFrequency: goal.target_frequency,
    trackers: trackers.map(({ currentValue: _currentValue, ...tracker }) => tracker),
  });
  const difficultyProfile = calculateGoalDifficultyProfile({
    category: normalizeMomentumCategory(goal.category),
    complexityMilestoneCount: milestones.length || null,
    durationWeeks,
    effortMinutes: smartNumber(goal.smart_data, 'effortMinutes', 'estimatedMinutes', 'effort_minutes'),
    externalDependency: externalDependency(goal.smart_data),
    frequencyPerWeek: frequency,
    goalId: goal.id,
    goalMode,
    magnitudeScore: smartNumber(goal.smart_data, 'magnitudeScore', 'magnitude_score'),
    planRevisionKey,
  });
  const completedProgressEvidence = completedActions.length + logs.length + completedMilestones.length + progressEvents.length;
  const expectedProgressEvidence = dueCommitmentUnits + dueMilestones.length;
  const normalizedInput: GoalMomentumCalculationInput = {
    consistency: {
      completedCommitmentUnits,
      completedOnScheduleUnits: onSchedule.length + routineCompletions,
      dueCommitmentUnits,
      meaningfulActivePeriods: meaningfulDays,
      plannedActivePeriods: Math.min(7, Math.max(dueCommitmentUnits, meaningfulDays)),
    },
    difficultyProfile,
    goalId: goal.id,
    goalMode,
    hasDueCommitments: dueCommitmentUnits > 0 || dueMilestones.length > 0 || (
      dateInBoundary(goal.deadline?.slice(0, 10) ?? null, boundary)
      && (calculationScope === 'closed'
        ? goal.deadline!.slice(0, 10) <= asOfLocalDate
        : goal.deadline!.slice(0, 10) < asOfLocalDate)
    ),
    hasEligibleEvidence: completedProgressEvidence > 0 || qualified.length > 0,
    initiative: {
      milestoneStartedCount: milestones.filter((milestone) => inBoundary(milestone.createdAt, boundary)).length,
      nextStepScheduledCount: normalizedActions.filter((action) => action.createdAt && inBoundary(action.createdAt, boundary) && action.plannedEligibility === 'included').length,
      obstacleIdentifiedCount: 0,
      planAdaptedCount: 0,
      qualifyingDisruption,
      recoveryActionCount: 0,
      returnAfterDisruptionCount: qualifyingDisruption && completedProgressEvidence > 0 ? 1 : 0,
      scopeAdjustedCount: 0,
      weeklyIntentionCount: 0,
    },
    previousValue,
    progress: {
      actualProgressDelta,
      completedMilestoneUnits: completedMilestones.length,
      completedProgressEvidenceUnits: completedProgressEvidence,
      dueMilestoneUnits: Math.max(dueMilestones.length, completedMilestones.length),
      expectedProgressDelta,
      expectedProgressEvidenceUnits: Math.max(expectedProgressEvidence, completedProgressEvidence),
    },
    reflection: {
      qualifiedReflectionCount: qualified.length,
      reflectionToAction,
      weeklyReviewCompleted: qualified.some((reflection) => reflection.reflectionType === 'week'),
    },
  };
  const result = calculateGoalMomentum(normalizedInput);
  const events = normalizedGoalEvents(goal, boundary, actions, milestones, trackers, logs, reflections, progressEvents);
  const hashInput = { boundary, difficultyProfile, events, normalizedInput, result };
  return {
    asOf: asOf.toISOString(),
    baselineScore: previousValue,
    baselineSnapshotId,
    boundary,
    calculationScope,
    calculationHash: await calculationHash(hashInput),
    difficultyProfile,
    excludedEvents: events.filter((event) => event.eligibility === 'excluded'),
    includedEvents: events.filter((event) => event.eligibility === 'included'),
    normalizedInput,
    result,
  };
}

async function publishGoalDiagnostic(
  db: SupabaseClient,
  userId: string,
  diagnostic: GoalMomentumDiagnostic,
): Promise<GoalSnapshotRow> {
  const { difficultyProfile, normalizedInput, result } = diagnostic;
  const { data, error } = await db.rpc('publish_goal_momentum_v1_snapshot', {
    p_algorithm_version: GOAL_MOMENTUM_VERSION,
    p_calculation_hash: diagnostic.calculationHash,
    p_category: difficultyProfile.category,
    p_category_config_version: MOMENTUM_CATEGORY_CONFIG_VERSION,
    p_current_value: result.currentValue,
    p_difficulty_band: difficultyProfile.band,
    p_difficulty_dimensions: difficultyProfile.dimensions,
    p_difficulty_effective_weights: difficultyProfile.effectiveWeights,
    p_difficulty_score: difficultyProfile.compositeScore,
    p_difficulty_source_inputs: difficultyProfile.sourceInputs,
    p_difficulty_version: GOAL_DIFFICULTY_VERSION,
    p_effective_weights: result.effectiveWeights,
    p_goal_id: result.goalId,
    p_goal_mode: difficultyProfile.goalMode,
    p_input_events: [...diagnostic.includedEvents, ...diagnostic.excludedEvents],
    p_pillar_components: result.pillarComponents,
    p_pillar_scores: result.pillars,
    p_plan_revision_key: difficultyProfile.planRevisionKey,
    p_previous_value: result.previousValue,
    p_raw_aggregates: {
      consistency: normalizedInput.consistency,
      hasDueCommitments: normalizedInput.hasDueCommitments,
      hasEligibleEvidence: normalizedInput.hasEligibleEvidence,
      initiative: normalizedInput.initiative,
      meaningfulMovement: normalizedInput.progress.completedProgressEvidenceUnits > 0,
      progress: normalizedInput.progress,
      reflection: normalizedInput.reflection,
    },
    p_raw_score: result.rawScore,
    p_reason_codes: result.reasonCodes,
    p_score_status: result.status,
    p_timezone: diagnostic.boundary.timezone,
    p_user_id: userId,
    p_week_end: diagnostic.boundary.weekEnd,
    p_week_start: diagnostic.boundary.weekStart,
  });
  if (error) throw new Error(`Goal Momentum snapshot publish failed: ${error.message}`);
  return data as GoalSnapshotRow;
}

function latestHistory<T extends {
  algorithm_version: string;
  previous_value: number | string | null;
  revision: number;
  week_end: string;
  week_start: string;
}>(rows: readonly T[], value: (row: T) => number): MomentumHistoryPoint[] {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const key = row.week_start;
    const prior = latest.get(key);
    if (!prior || row.revision > prior.revision) latest.set(key, row);
  }
  return [...latest.values()].sort((left, right) => left.week_start.localeCompare(right.week_start)).map((row) => ({
    algorithmVersion: row.algorithm_version,
    periodState: 'closed',
    periodEnd: row.week_end,
    periodStart: row.week_start,
    previousValue: Number(row.previous_value ?? 0),
    revision: row.revision,
    value: value(row),
  }));
}

export function latestMomentumHistory(rows: readonly OharaSnapshotRow[]): MomentumHistoryPoint[] {
  return latestHistory(rows, (row) => Number(row.next_value));
}

async function fetchGoalHistory(db: SupabaseClient, userId: string, goalId: string): Promise<MomentumHistoryPoint[]> {
  const { data, error } = await db.from('goal_momentum_weekly_snapshots')
    .select('week_start, week_end, previous_value, current_value, revision, algorithm_version')
    .eq('user_id', userId).eq('goal_id', goalId)
    .order('week_start').order('revision', { ascending: false });
  if (error) throw new Error(`Goal Momentum history read failed: ${error.message}`);
  return latestHistory((data ?? []) as GoalSnapshotRow[], (row) => Number(row.current_value));
}

async function fetchOharaHistory(db: SupabaseClient, userId: string): Promise<MomentumHistoryPoint[]> {
  const { data, error } = await db.from('momentum_weekly_snapshots')
    .select('week_start, week_end, previous_value, next_value, revision, algorithm_version')
    .eq('user_id', userId).like('algorithm_version', 'ohara-momentum-v%')
    .order('week_start').order('revision', { ascending: false });
  if (error) throw new Error(`OHARA Momentum history read failed: ${error.message}`);
  return latestMomentumHistory((data ?? []) as OharaSnapshotRow[]);
}

async function fetchPreviousOharaSnapshot(
  db: SupabaseClient,
  userId: string,
  beforeWeek: string,
): Promise<OharaSnapshotRow | null> {
  const { data, error } = await db.from('momentum_weekly_snapshots')
    .select('id, week_start, week_end, previous_value, next_value, revision, algorithm_version, created_at')
    .eq('user_id', userId).like('algorithm_version', 'ohara-momentum-v%')
    .lt('week_start', beforeWeek).order('week_start', { ascending: false })
    .order('created_at', { ascending: false }).order('revision', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`OHARA Momentum prior snapshot read failed: ${error.message}`);
  return data as OharaSnapshotRow | null;
}

async function fetchTrailingGoalSnapshots(
  db: SupabaseClient,
  userId: string,
  beforeWeek: string,
): Promise<GoalSnapshotRow[]> {
  const { data, error } = await db.from('goal_momentum_weekly_snapshots')
    .select('id, goal_id, week_start, week_end, previous_value, current_value, revision, algorithm_version, calculation_hash, raw_aggregates, created_at')
    .eq('user_id', userId)
    .lt('week_start', beforeWeek).order('week_start', { ascending: false })
    .order('created_at', { ascending: false }).order('revision', { ascending: false }).limit(256);
  if (error) throw new Error(`Goal Momentum trailing history read failed: ${error.message}`);
  const latest = new Map<string, GoalSnapshotRow>();
  for (const row of (data ?? []) as GoalSnapshotRow[]) {
    const key = `${row.goal_id}:${row.week_start}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  return [...latest.values()];
}

async function fetchLatestGoalSnapshotsBefore(
  db: SupabaseClient,
  userId: string,
  goalIds: readonly string[],
  beforeWeek: string,
): Promise<Map<string, GoalSnapshotRow>> {
  if (!goalIds.length) return new Map();
  const { data, error } = await db.from('goal_momentum_weekly_snapshots')
    .select('id, goal_id, week_start, week_end, previous_value, current_value, revision, algorithm_version, calculation_hash, raw_aggregates, created_at')
    .eq('user_id', userId).in('goal_id', [...goalIds]).lt('week_start', beforeWeek)
    .order('week_start', { ascending: false }).order('created_at', { ascending: false })
    .order('revision', { ascending: false }).limit(Math.max(256, goalIds.length * 16));
  if (error) throw new Error(`Goal Momentum baseline read failed: ${error.message}`);
  const latest = new Map<string, GoalSnapshotRow>();
  for (const row of (data ?? []) as GoalSnapshotRow[]) {
    if (!latest.has(row.goal_id)) latest.set(row.goal_id, row);
  }
  return latest;
}

async function hasClosedOharaSnapshot(
  db: SupabaseClient,
  userId: string,
  weekStart: string,
): Promise<boolean> {
  const { data, error } = await db.from('momentum_weekly_snapshots')
    .select('id').eq('user_id', userId).eq('week_start', weekStart)
    .like('algorithm_version', 'ohara-momentum-v%').limit(1);
  if (error) throw new Error(`OHARA Momentum closed-week read failed: ${error.message}`);
  return Boolean(data?.length);
}

function trailingPortfolioInputs(rows: readonly GoalSnapshotRow[]): Pick<OharaMomentumCalculationInput, 'trailingCadence' | 'trailingMovementWeeks'> {
  const weeks = new Map<string, GoalSnapshotRow[]>();
  for (const row of rows) weeks.set(row.week_start, [...(weeks.get(row.week_start) ?? []), row]);
  const ordered = [...weeks.entries()].sort(([left], [right]) => right.localeCompare(left)).slice(0, 8);
  const fractions = ordered.map(([, snapshots]) => (
    snapshots.filter((row) => row.raw_aggregates?.meaningfulMovement === true).length / snapshots.length
  ));
  const trailingCadence = fractions.length
    ? fractions.slice(0, 4).reduce((sum, value) => sum + value, 0) / Math.min(4, fractions.length)
    : null;
  return {
    trailingCadence,
    trailingMovementWeeks: fractions.map((value, index) => ({
      moved: value > 0,
      recencyWeight: ordered.length - index,
    })),
  };
}

async function publishOharaDiagnostic(
  db: SupabaseClient,
  userId: string,
  diagnostic: OharaMomentumDiagnostic,
): Promise<OharaSnapshotRow> {
  const { result } = diagnostic;
  const { data, error } = await db.rpc('publish_ohara_momentum_v1_snapshot', {
    p_algorithm_version: OHARA_MOMENTUM_VERSION,
    p_calculation_hash: diagnostic.calculationHash,
    p_configuration_version: OHARA_MOMENTUM_VERSION,
    p_current_value: result.currentValue,
    p_effective_weights: result.effectiveWeights,
    p_input_events: [],
    p_portfolio_components: result.components,
    p_previous_value: result.previousValue,
    p_raw_aggregates: diagnostic.normalizedInput,
    p_raw_score: result.rawScore,
    p_reason_codes: result.reasonCodes,
    p_score_status: result.status,
    p_source_goal_snapshot_ids: diagnostic.sourceGoalSnapshotIds,
    p_timezone: diagnostic.boundary.timezone,
    p_user_id: userId,
    p_week_end: diagnostic.boundary.weekEnd,
    p_week_start: diagnostic.boundary.weekStart,
  });
  if (error) throw new Error(`OHARA Momentum snapshot publish failed: ${error.message}`);
  return data as OharaSnapshotRow;
}

export function calculateWeeklyStreak(
  events: readonly RawActionCompletion[],
  now: Date,
  timezone: string,
  expectedUserId: string,
): number {
  const current = getMomentumWeek(now, timezone);
  const activeWeeks = new Set(events.flatMap((event) => {
    if (!event.completedAt || event.status !== 'complete' || event.userId !== expectedUserId
      || !SCOREABLE_GOAL_STATUSES.includes(event.goalStatus as (typeof SCOREABLE_GOAL_STATUSES)[number])) return [];
    return [getMomentumWeek(new Date(event.completedAt), current.timezone).weekStart];
  }));
  let weekStart = current.weekStart;
  let streak = 0;
  while (activeWeeks.has(weekStart)) {
    streak += 1;
    weekStart = addLocalDays(weekStart, -7);
  }
  return streak;
}

function goalEvidenceFor(diagnostics: readonly GoalMomentumDiagnostic[]): OharaGoalEvidence[] {
  return diagnostics.map((diagnostic) => ({
    completedMilestoneUnits: diagnostic.normalizedInput.progress.completedMilestoneUnits,
    dueMilestoneUnits: diagnostic.normalizedInput.progress.dueMilestoneUnits,
    expectedMovement: diagnostic.normalizedInput.hasDueCommitments,
    goalId: diagnostic.result.goalId,
    meaningfulMovement: diagnostic.normalizedInput.progress.completedProgressEvidenceUnits > 0,
    normalizedProgressEvidence: diagnostic.result.pillars.progress,
    plannedCommitmentUnits: diagnostic.normalizedInput.consistency.dueCommitmentUnits || null,
  }));
}

async function buildOharaDiagnostic(
  boundary: MomentumWeekBoundary,
  goalDiagnostics: readonly GoalMomentumDiagnostic[],
  previousSnapshot: OharaSnapshotRow | null,
  trailing: readonly GoalSnapshotRow[],
  asOf: Date,
  calculationScope: 'provisional' | 'closed',
  sourceGoalSnapshotIds: readonly string[],
): Promise<OharaMomentumDiagnostic> {
  const goalEvidence = goalEvidenceFor(goalDiagnostics);
  const normalizedInput: OharaMomentumCalculationInput = {
    goals: goalEvidence,
    hasDueCommitments: goalEvidence.some((goal) => goal.expectedMovement),
    hasEligibleEvidence: goalEvidence.some((goal) => goal.meaningfulMovement),
    previousValue: numberOrNull(previousSnapshot?.next_value),
    ...trailingPortfolioInputs(trailing),
  };
  const result = calculateOharaMomentum(normalizedInput);
  return {
    asOf: asOf.toISOString(),
    baselineScore: normalizedInput.previousValue,
    baselineSnapshotId: previousSnapshot?.id ?? null,
    boundary,
    calculationScope,
    calculationHash: await calculationHash({
      algorithmVersion: OHARA_MOMENTUM_VERSION,
      boundary,
      calculationScope,
      normalizedInput,
      result,
      sourceGoalSnapshotIds,
    }),
    normalizedInput,
    result,
    sourceGoalSnapshotIds: [...sourceGoalSnapshotIds],
  };
}

async function closeCompletedWeekIfNeeded(
  readDb: SupabaseClient,
  writeDb: SupabaseClient,
  userId: string,
  boundary: MomentumWeekBoundary,
): Promise<void> {
  if (await hasClosedOharaSnapshot(readDb, userId, boundary.weekStart)) return;

  const source = await fetchGoalSourceData(readDb, userId, boundary);
  const goalIds = source.goals.map((goal) => goal.id);
  const [goalBaselines, previousOhara, trailing] = await Promise.all([
    fetchLatestGoalSnapshotsBefore(readDb, userId, goalIds, boundary.weekStart),
    fetchPreviousOharaSnapshot(readDb, userId, boundary.weekStart),
    fetchTrailingGoalSnapshots(readDb, userId, boundary.weekStart),
  ]);
  const closedAt = new Date(Date.parse(boundary.endExclusive) - 1);
  const goalDiagnostics: GoalMomentumDiagnostic[] = [];
  const goalSnapshots: GoalSnapshotRow[] = [];
  for (const goal of source.goals) {
    const baseline = goalBaselines.get(goal.id) ?? null;
    const diagnostic = await buildGoalDiagnostic(
      goal,
      source,
      boundary,
      numberOrNull(baseline?.current_value),
      closedAt,
      'closed',
      baseline?.id ?? null,
    );
    goalDiagnostics.push(diagnostic);
    goalSnapshots.push(await publishGoalDiagnostic(writeDb, userId, diagnostic));
  }
  const oharaDiagnostic = await buildOharaDiagnostic(
    boundary,
    goalDiagnostics,
    previousOhara,
    trailing,
    closedAt,
    'closed',
    goalSnapshots.map((snapshot) => snapshot.id),
  );
  await publishOharaDiagnostic(writeDb, userId, oharaDiagnostic);
}

export async function getMomentumV11Summary(
  readDb: SupabaseClient,
  writeDb: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<{
  diagnostic: OharaMomentumDiagnostic;
  goalDiagnostics: GoalMomentumDiagnostic[];
  summary: MomentumHomeSummary;
}> {
  const { data: profile, error: profileError } = await readDb.from('profiles')
    .select('timezone').eq('id', userId).single();
  if (profileError) throw new Error(`Momentum timezone read failed: ${profileError.message}`);
  const timezone = normalizeTimezone((profile as { timezone?: string } | null)?.timezone);
  const currentBoundary = getMomentumWeek(now, timezone);
  const completedBoundary = getPreviousMomentumWeek(now, timezone);
  await closeCompletedWeekIfNeeded(readDb, writeDb, userId, completedBoundary);

  const source = await fetchGoalSourceData(readDb, userId, currentBoundary);
  const goalIds = source.goals.map((goal) => goal.id);
  const [goalBaselines, trailing, previousOharaSnapshot] = await Promise.all([
    fetchLatestGoalSnapshotsBefore(readDb, userId, goalIds, currentBoundary.weekStart),
    fetchTrailingGoalSnapshots(readDb, userId, currentBoundary.weekStart),
    fetchPreviousOharaSnapshot(readDb, userId, currentBoundary.weekStart),
  ]);
  const goalDiagnostics: GoalMomentumDiagnostic[] = [];
  for (const goal of source.goals) {
    const baseline = goalBaselines.get(goal.id) ?? null;
    const diagnostic = await buildGoalDiagnostic(
      goal,
      source,
      currentBoundary,
      numberOrNull(baseline?.current_value),
      now,
      'provisional',
      baseline?.id ?? null,
    );
    goalDiagnostics.push(diagnostic);
  }
  const diagnostic = await buildOharaDiagnostic(
    currentBoundary,
    goalDiagnostics,
    previousOharaSnapshot,
    trailing,
    now,
    'provisional',
    [...goalBaselines.values()].map((snapshot) => snapshot.id),
  );
  const oharaResult = diagnostic.result;
  const [historicalActions, closedHistory, goalSummaries] = await Promise.all([
    fetchActionRows(readDb, userId),
    fetchOharaHistory(readDb, userId),
    Promise.all(goalDiagnostics.map(async (goalDiagnostic): Promise<GoalMomentumSummary> => {
      const closed = await fetchGoalHistory(readDb, userId, goalDiagnostic.result.goalId);
      return {
        algorithmVersion: GOAL_MOMENTUM_VERSION,
        asOf: now.toISOString(),
        currentValue: goalDiagnostic.result.currentValue,
        difficulty: {
          band: goalDiagnostic.difficultyProfile.band,
          compositeScore: goalDiagnostic.difficultyProfile.compositeScore,
          version: goalDiagnostic.difficultyProfile.version,
        },
        displayedValue: goalDiagnostic.result.displayedValue,
        goalId: goalDiagnostic.result.goalId,
        history: [...closed, {
          algorithmVersion: GOAL_MOMENTUM_VERSION,
          periodEnd: currentBoundary.weekEnd,
          periodStart: currentBoundary.weekStart,
          periodState: 'provisional',
          previousValue: goalDiagnostic.result.previousValue ?? 0,
          revision: 0,
          value: goalDiagnostic.result.currentValue,
        }],
        periodState: 'provisional',
        pillars: goalDiagnostic.result.pillars,
        reasons: reasonsForCodes(goalDiagnostic.result.reasonCodes),
        status: goalDiagnostic.result.status,
        weekEnd: currentBoundary.weekEnd,
        weekStart: currentBoundary.weekStart,
        weeklyChange: goalDiagnostic.result.weeklyChange,
      };
    })),
  ]);
  const currentNormalized = normalizeActionRecords(
    source.actions,
    currentBoundary,
    userId,
    localDateForInstant(now.toISOString(), timezone),
    false,
  );
  const tasksCompletedThisWeek = currentNormalized.filter((action) => action.completionEligibility === 'included').length;
  const currentValue = oharaResult.currentValue;
  const weeklyChange = oharaResult.weeklyChange;
  const history: MomentumHistoryPoint[] = [...closedHistory, {
    algorithmVersion: OHARA_MOMENTUM_VERSION,
    periodEnd: currentBoundary.weekEnd,
    periodStart: currentBoundary.weekStart,
    periodState: 'provisional',
    previousValue: oharaResult.previousValue ?? 0,
    revision: 0,
    value: currentValue,
  }];
  const trendPoints = history.map((point) => point.value);
  const trendLabels = history.map((point) => point.periodStart);
  return {
    diagnostic,
    goalDiagnostics,
    summary: {
      algorithmVersion: OHARA_MOMENTUM_VERSION,
      asOf: now.toISOString(),
      components: oharaResult.components,
      currentValue,
      displayedValue: Math.round(currentValue),
      goals: goalSummaries,
      history,
      periodState: 'provisional',
      reasons: reasonsForCodes(oharaResult.reasonCodes),
      status: oharaResult.status,
      tasksCompletedThisWeek,
      trendLabels: trendLabels.length ? trendLabels : [currentBoundary.weekStart],
      trendPoints: trendPoints.length ? trendPoints : [currentValue],
      trend: weeklyChange > 0.005 ? 'up' : weeklyChange < -0.005 ? 'down' : 'steady',
      weekEnd: currentBoundary.weekEnd,
      weekStart: currentBoundary.weekStart,
      weeklyChange,
      weeklyStreak: calculateWeeklyStreak(historicalActions, now, timezone, userId),
    },
  };
}

// Retained function name keeps the authenticated API and existing consumers stable.
export const getMomentumHomeSummary = getMomentumV11Summary;
export const getMomentumV1Summary = getMomentumV11Summary;

export function safeGoalDiagnostic(diagnostic: GoalMomentumDiagnostic): GoalMomentumDiagnostic {
  return {
    ...diagnostic,
    excludedEvents: diagnostic.excludedEvents.map((event) => ({ ...event })),
    includedEvents: diagnostic.includedEvents.map((event) => ({ ...event })),
  };
}

export function safeDiagnostic(diagnostic: OharaMomentumDiagnostic): OharaMomentumDiagnostic {
  return { ...diagnostic, sourceGoalSnapshotIds: [...diagnostic.sourceGoalSnapshotIds] };
}
