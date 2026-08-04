import type { SupabaseClient } from '@supabase/supabase-js';
import { MOMENTUM_CONFIG_V1 } from '../config.ts';
import { aggregateActionInputs, calculateMomentum, calculateTaskBackedPillars } from '../engine.ts';
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
  MomentumDiagnostic,
  MomentumEvent,
  MomentumHomeSummary,
  MomentumWeekBoundary,
} from '../types.ts';

type MomentumProfileRow = {
  current_value: number | string;
};

type MomentumSnapshotRow = {
  calculation_hash: string;
  next_value: number | string;
  previous_value: number | string;
  revision: number;
  weekly_gain: number | string;
  weekly_drag: number | string;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
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

function mapActionRows(rows: unknown[]): RawActionCompletion[] {
  return rows.map((row) => {
    const value = row as Record<string, unknown>;
    const relation = Array.isArray(value.goal) ? value.goal[0] : value.goal;
    const goal = relation && typeof relation === 'object' ? relation as Record<string, unknown> : null;
    return {
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

async function fetchCompletedActions(
  db: SupabaseClient,
  userId: string,
  boundary?: MomentumWeekBoundary,
): Promise<RawActionCompletion[]> {
  let query = db
    .from('action_logs')
    .select('id, goal_id, user_id, status, completed_at, created_at, due_date, goal:goals!action_logs_goal_id_fkey(status,user_id)')
    .eq('user_id', userId)
    .eq('status', 'complete')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });
  if (boundary) {
    query = query
      .gte('completed_at', boundary.startInclusive)
      .lt('completed_at', boundary.endExclusive);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Momentum action read failed: ${error.message}`);
  return mapActionRows(data ?? []);
}

async function fetchPlannedActions(
  db: SupabaseClient,
  userId: string,
  boundary: MomentumWeekBoundary,
): Promise<RawActionCompletion[]> {
  const { data, error } = await db
    .from('action_logs')
    .select('id, goal_id, user_id, status, completed_at, created_at, due_date, goal:goals!action_logs_goal_id_fkey(status,user_id)')
    .eq('user_id', userId)
    .gte('due_date', boundary.weekStart)
    .lte('due_date', boundary.weekEnd)
    .order('due_date', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw new Error(`Momentum planned-action read failed: ${error.message}`);
  return mapActionRows(data ?? []);
}

function mergeActionRows(...groups: ReadonlyArray<readonly RawActionCompletion[]>): RawActionCompletion[] {
  const byId = new Map<string, RawActionCompletion>();
  for (const row of groups.flat()) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function calculateWeeklyStreak(
  events: readonly RawActionCompletion[],
  now: Date,
  timezone: string,
  expectedUserId: string,
): number {
  const current = getMomentumWeek(now, timezone);
  const activeWeeks = new Set(events.flatMap((event) => {
    if (!event.completedAt
      || event.status !== 'complete'
      || event.userId !== expectedUserId
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

async function buildDiagnostic(
  rows: readonly RawActionCompletion[],
  boundary: MomentumWeekBoundary,
  previousMomentum: number,
  userId: string,
): Promise<MomentumDiagnostic> {
  const inputActions = normalizeActionRecords(rows, boundary, userId);
  const inputEvents = actionCompletionEvents(inputActions);
  const includedEvents = inputEvents.filter((event) => event.eligibility === 'included');
  const excludedEvents = inputEvents.filter((event) => event.eligibility === 'excluded');
  const aggregates = aggregateActionInputs(inputActions, boundary.timezone);
  const pillars = calculateTaskBackedPillars(aggregates);
  const weeklyResult = calculateMomentum({
    config: MOMENTUM_CONFIG_V1,
    currentMomentum: previousMomentum,
    pillars,
  });
  const hashInput = {
    algorithmVersion: MOMENTUM_CONFIG_V1.version,
    boundary,
    config: MOMENTUM_CONFIG_V1,
    inputActions,
    inputEvents,
    pillars,
    previousMomentum,
    weeklyAggregates: aggregates,
    weeklyResult,
  };
  return {
    algorithmVersion: MOMENTUM_CONFIG_V1.version,
    boundary,
    calculationHash: await calculationHash(hashInput),
    excludedEvents,
    includedEvents,
    inputActions,
    inputEvents,
    pillars,
    reasonCodes: weeklyResult.reasonCodes,
    weeklyAggregates: aggregates,
    weeklyResult,
  };
}

async function publishDiagnostic(
  db: SupabaseClient,
  userId: string,
  boundary: MomentumWeekBoundary,
  diagnostic: MomentumDiagnostic,
): Promise<MomentumSnapshotRow> {
  const result = diagnostic.weeklyResult;
  const { data, error } = await db.rpc('publish_momentum_snapshot', {
    p_algorithm_version: diagnostic.algorithmVersion,
    p_calculation_hash: diagnostic.calculationHash,
    p_difficulty_multiplier: result.difficultyMultiplier,
    p_effective_weights: result.effectiveWeights,
    p_events: diagnostic.includedEvents,
    p_growth_quality_score: result.growthQualityScore,
    p_input_actions: diagnostic.inputActions,
    p_input_events: diagnostic.inputEvents,
    p_next_value: result.nextMomentum,
    p_pillar_scores: diagnostic.pillars,
    p_previous_value: result.previousMomentum,
    p_raw_aggregates: diagnostic.weeklyAggregates,
    p_reason_codes: diagnostic.reasonCodes,
    p_timezone: boundary.timezone,
    p_user_id: userId,
    p_week_end: boundary.weekEnd,
    p_week_start: boundary.weekStart,
    p_weekly_drag: result.weeklyDrag,
    p_weekly_gain: result.weeklyGain,
  });
  if (error) throw new Error(`Momentum snapshot publish failed: ${error.message}`);
  return data as MomentumSnapshotRow;
}

export async function getMomentumHomeSummary(
  readDb: SupabaseClient,
  writeDb: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<{ diagnostic: MomentumDiagnostic; summary: MomentumHomeSummary }> {
  const { data: profile, error: profileError } = await readDb
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single();
  if (profileError) throw new Error(`Momentum timezone read failed: ${profileError.message}`);
  const timezone = normalizeTimezone((profile as { timezone?: string } | null)?.timezone);
  const currentBoundary = getMomentumWeek(now, timezone);
  const completedBoundary = getPreviousMomentumWeek(now, timezone);

  const [{ data: momentumProfile, error: momentumProfileError }, { data: existingSnapshot, error: snapshotError }] = await Promise.all([
    readDb.from('momentum_profiles').select('current_value').eq('user_id', userId).maybeSingle(),
    readDb.from('momentum_weekly_snapshots')
      .select('calculation_hash, previous_value, next_value, weekly_gain, weekly_drag, revision')
      .eq('user_id', userId)
      .eq('week_start', completedBoundary.weekStart)
      .eq('algorithm_version', MOMENTUM_CONFIG_V1.version)
      .order('revision', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (momentumProfileError) throw new Error(`Momentum profile read failed: ${momentumProfileError.message}`);
  if (snapshotError) throw new Error(`Momentum snapshot read failed: ${snapshotError.message}`);

  const profileValue = Number((momentumProfile as MomentumProfileRow | null)?.current_value ?? 0);
  const previousMomentum = existingSnapshot
    ? Number((existingSnapshot as MomentumSnapshotRow).previous_value)
    : profileValue;
  const [completedRows, plannedRows] = await Promise.all([
    fetchCompletedActions(readDb, userId, completedBoundary),
    fetchPlannedActions(readDb, userId, completedBoundary),
  ]);
  const diagnostic = await buildDiagnostic(
    mergeActionRows(completedRows, plannedRows),
    completedBoundary,
    previousMomentum,
    userId,
  );
  const published = await publishDiagnostic(writeDb, userId, completedBoundary, diagnostic);

  const [currentRows, historicalRows] = await Promise.all([
    fetchCompletedActions(readDb, userId, currentBoundary),
    fetchCompletedActions(readDb, userId),
  ]);
  const currentActions = normalizeActionRecords(currentRows, currentBoundary, userId);
  const currentEvents = actionCompletionEvents(currentActions);
  const tasksCompletedThisWeek = currentEvents.filter((event) => event.eligibility === 'included').length;
  const currentValue = Number(published.next_value);
  const weeklyChange = currentValue - Number(published.previous_value);

  return {
    diagnostic,
    summary: {
      algorithmVersion: MOMENTUM_CONFIG_V1.version,
      currentValue,
      displayedValue: Math.round(currentValue),
      status: weeklyChange > 0.005 ? 'Building' : 'Steady',
      tasksCompletedThisWeek,
      trendLabels: ['Before', 'Now'],
      trendPoints: [Number(published.previous_value), currentValue],
      trend: weeklyChange > 0.005 ? 'up' : weeklyChange < -0.005 ? 'down' : 'steady',
      weekEnd: currentBoundary.weekEnd,
      weekStart: currentBoundary.weekStart,
      weeklyChange,
      weeklyStreak: calculateWeeklyStreak(historicalRows, now, timezone, userId),
    },
  };
}

export function safeDiagnostic(diagnostic: MomentumDiagnostic): MomentumDiagnostic {
  const redact = (event: MomentumEvent): MomentumEvent => ({ ...event });
  return {
    ...diagnostic,
    inputActions: diagnostic.inputActions.map((action) => ({ ...action })),
    inputEvents: diagnostic.inputEvents.map(redact),
    includedEvents: diagnostic.includedEvents.map(redact),
    excludedEvents: diagnostic.excludedEvents.map(redact),
  };
}
