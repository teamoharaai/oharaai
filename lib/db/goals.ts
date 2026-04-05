import supabase from './client';
import type { GoalTheme } from '@/constants/themes';
import type { GoalFinalizeResponse } from '@/lib/ai/schemas/goal-creation';
import type { ActivityItem } from '@/types/activity';
import type { EchoEmotion, EchoBrt } from '@/features/echo/types';

export interface CreateGoalWithMeasurablesResult {
  goalId: string | null;
  error: string | null;
  warning: string | null;
}

const CATEGORY_THEME: Record<string, GoalTheme> = {
  body: 'ember',
  mind: 'lavender',
  money: 'slate',
  create: 'sunset',
  connect: 'coral',
  contribute: 'forest',
};

function toNumber(raw: number | string | null | undefined, fallback = 0): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeDeadlineForPersistence(deadline: string | null): string | null {
  if (!deadline) return null;

  const trimmed = deadline.trim();
  if (!trimmed) return null;

  const directDate = new Date(trimmed);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString();
  }

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const normalized = new Date(`${trimmed}T00:00:00.000Z`);
    if (!Number.isNaN(normalized.getTime())) {
      return normalized.toISOString();
    }
  }

  return null;
}

function mapAiGoalDataToDbInserts(
  aiData: GoalFinalizeResponse,
  userId: string,
  projectId?: string | null,
) {
  const colorTheme: GoalTheme = CATEGORY_THEME[aiData.goal.category] ?? 'ocean';
  const normalizedDeadline = normalizeDeadlineForPersistence(aiData.goal.deadline);

  return {
    goalInsert: {
      user_id: userId,
      title: aiData.goal.title,
      description: aiData.goal.description,
      category: aiData.goal.category,
      mode: 'commitment' as const,
      status: 'active' as const,
      smart_data: aiData.goal.smart,
      color_theme: colorTheme,
      deadline: normalizedDeadline,
      visibility: 'private' as const,
      ai_generated: true,
      project_id: projectId ?? null,
    },
    measurableInserts: aiData.measurables.map((m, index) => ({
      title: m.title,
      type: m.type,
      target_value: m.targetValue ?? null,
      target_unit: m.targetUnit ?? null,
      frequency: m.frequency,
      current_value: 0,
      is_ai_suggested: true,
      sort_order: index,
    })),
    normalizationWarnings: aiData.goal.deadline && !normalizedDeadline
      ? [`Invalid deadline "${aiData.goal.deadline}" was normalized to null before persistence`]
      : [],
  };
}

/**
 * Inserts a goal + its measurables from an AI finalization result.
 * Returns the new goalId on success, null on failure.
 */
export async function createGoalWithMeasurables(
  userId: string,
  aiData: GoalFinalizeResponse,
  options?: { requestId?: string; projectId?: string | null },
): Promise<CreateGoalWithMeasurablesResult> {
  const requestId = options?.requestId ?? null;

  if (!aiData.goal.title?.trim()) {
    const error = 'AI goal payload is missing a title';
    console.error('[goal-finalize] persistence failed', {
      requestId,
      stage: 'persistence',
      userId,
      error,
    });
    return { goalId: null, error, warning: null };
  }

  if (!aiData.goal.category?.trim()) {
    const error = 'AI goal payload is missing a category';
    console.error('[goal-finalize] persistence failed', {
      requestId,
      stage: 'persistence',
      userId,
      error,
    });
    return { goalId: null, error, warning: null };
  }

  const { goalInsert, measurableInserts, normalizationWarnings } = mapAiGoalDataToDbInserts(
    aiData,
    userId,
    options?.projectId,
  );
  let warning: string | null = normalizationWarnings[0] ?? null;

  console.info('[goal-finalize] persistence started', {
    requestId,
    stage: 'persistence',
    userId,
    title: aiData.goal.title,
    category: aiData.goal.category,
    measurableCount: aiData.measurables.length,
    projectId: options?.projectId ?? null,
  });

  if (normalizationWarnings.length > 0) {
    console.warn('[goal-finalize] persistence normalization adjusted payload', {
      requestId,
      stage: 'persistence',
      userId,
      warnings: normalizationWarnings,
    });
  }

  const { data: goalRow, error: goalError } = await supabase
    .from('goals')
    .insert(goalInsert)
    .select('id')
    .single();

  if (goalError || !goalRow) {
    const error = goalError?.message ?? 'Goal insert returned no row';
    console.error('[goal-finalize] persistence failed', {
      requestId,
      stage: 'persistence',
      userId,
      error,
      code: goalError?.code,
      details: goalError?.details,
      hint: goalError?.hint,
    });
    return { goalId: null, error, warning: null };
  }

  const goalId = goalRow.id as string;

  if (measurableInserts.length > 0) {
    const { error: measurableError } = await supabase.from('measurables').insert(
      measurableInserts.map((row) => ({
        goal_id: goalId,
        ...row,
      })),
    );

    if (measurableError) {
      warning = [warning, measurableError.message].filter(Boolean).join(' | ');
      console.error('[goal-finalize] persistence failed', {
        requestId,
        stage: 'persistence',
        goalId,
        error: measurableError.message,
        code: measurableError.code,
        details: measurableError.details,
        hint: measurableError.hint,
      });
    } else {
      console.info('[goal-finalize] persistence measurables saved', {
        requestId,
        stage: 'persistence',
        goalId,
        measurableCount: aiData.measurables.length,
      });
    }
  }

  console.info('[goal-finalize] persistence succeeded', {
    requestId,
    stage: 'persistence',
    goalId,
    warning,
  });
  return { goalId, error: null, warning };
}

// ─── DB row types for activity query ─────────────────────────────────────────

type DbEchoEntryRow = {
  id: string;
  content: string;
  emotion: EchoEmotion | null;
  brt: EchoBrt | null;
  created_at: string;
};

type DbMeasurableRow = {
  id: string;
  title: string;
  target_value: number | null;
};

type DbMeasurableLogRow = {
  id: string;
  value: number;
  logged_at: string;
  measurable_id: string;
};

type DbGoalCreatedAtRow = {
  created_at: string;
};

type DbGoalProgressRow = {
  progress: number | string;
};

type DbGoalOwnershipRow = {
  id: string;
};

/**
 * Returns a unified activity timeline for a goal, sorted descending by timestamp.
 * Always includes at least one item: the goal_created event.
 */
export async function getActivityByGoalId(
  goalId: string,
  userId: string,
): Promise<ActivityItem[]> {
  // 1. Echo entries for this goal
  const { data: echoData } = await supabase
    .from('echo_entries')
    .select('id, content, emotion, brt, created_at')
    .eq('goal_id', goalId)
    .eq('user_id', userId);

  const echoItems: ActivityItem[] = (echoData as unknown as DbEchoEntryRow[] ?? []).map(
    (row) => ({
      kind: 'echo_entry' as const,
      id: `echo-${row.id}`,
      entryId: row.id,
      preview: row.content.slice(0, 100),
      emotion: row.emotion,
      brt: row.brt,
      timestamp: row.created_at,
    }),
  );

  // 2. Measurable completion logs (logs where value >= measurable target_value)
  const { data: measurablesData } = await supabase
    .from('measurables')
    .select('id, title, target_value')
    .eq('goal_id', goalId);

  const measurablesWithTarget = (
    measurablesData as unknown as DbMeasurableRow[] ?? []
  ).filter((m): m is DbMeasurableRow & { target_value: number } => m.target_value !== null);

  let milestoneItems: ActivityItem[] = [];

  if (measurablesWithTarget.length > 0) {
    const measurableIds = measurablesWithTarget.map((m) => m.id);
    const measurableMap = new Map(
      measurablesWithTarget.map((m) => [m.id, { title: m.title, target: m.target_value }]),
    );

    const { data: logData } = await supabase
      .from('measurable_logs')
      .select('id, value, logged_at, measurable_id')
      .in('measurable_id', measurableIds);

    milestoneItems = (logData as unknown as DbMeasurableLogRow[] ?? [])
      .filter((log) => {
        const m = measurableMap.get(log.measurable_id);
        return m !== undefined && log.value >= m.target;
      })
      .map((log) => ({
        kind: 'milestone_completed' as const,
        id: `milestone-${log.id}`,
        measurableId: log.measurable_id,
        label: measurableMap.get(log.measurable_id)?.title ?? '',
        timestamp: log.logged_at,
      }));
  }

  // 3. Goal created event
  const { data: goalData } = await supabase
    .from('goals')
    .select('created_at')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  const goalCreatedItem: ActivityItem = {
    kind: 'goal_created',
    id: `goal-created-${goalId}`,
    timestamp: (goalData as unknown as DbGoalCreatedAtRow | null)?.created_at
      ?? new Date(0).toISOString(),
  };

  return [...echoItems, ...milestoneItems, goalCreatedItem].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function normalizeMeasurableTarget(targetValue: number | null): number {
  if (targetValue === null) {
    return 1;
  }

  return targetValue > 0 ? targetValue : 1;
}

export async function completeMeasurable(
  measurableId: string,
  goalId: string,
  userId: string,
): Promise<void> {
  const { data: goalRow, error: goalError } = await supabase
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (goalError || !(goalRow as DbGoalOwnershipRow | null)?.id) {
    throw new Error('Goal not found');
  }

  const { data: measurableRow, error: measurableError } = await supabase
    .from('measurables')
    .select('id, title, target_value')
    .eq('id', measurableId)
    .eq('goal_id', goalId)
    .single();

  if (measurableError || !measurableRow) {
    throw new Error('Measurable not found');
  }

  const completionValue = normalizeMeasurableTarget(
    (measurableRow as DbMeasurableRow).target_value,
  );

  const { error: insertLogError } = await supabase.from('measurable_logs').insert({
    measurable_id: measurableId,
    value: completionValue,
    logged_at: new Date().toISOString(),
  });

  if (insertLogError) {
    throw new Error(insertLogError.message);
  }

  const { data: measurablesData, error: measurablesError } = await supabase
    .from('measurables')
    .select('id, title, target_value')
    .eq('goal_id', goalId);

  if (measurablesError) {
    throw new Error(measurablesError.message);
  }

  const measurables = (measurablesData as unknown as DbMeasurableRow[] | null) ?? [];
  const measurableIds = measurables.map((measurable) => measurable.id);
  let progress = 0;

  if (measurableIds.length > 0) {
    const { data: logData, error: logError } = await supabase
      .from('measurable_logs')
      .select('id, value, logged_at, measurable_id')
      .in('measurable_id', measurableIds);

    if (logError) {
      throw new Error(logError.message);
    }

    const logs = (logData as unknown as DbMeasurableLogRow[] | null) ?? [];
    const completionCount = measurables.filter((measurable) => {
      const targetValue = normalizeMeasurableTarget(measurable.target_value);
      return logs.some(
        (log) => log.measurable_id === measurable.id && Number(log.value) >= targetValue,
      );
    }).length;

    progress = Math.round((completionCount / measurables.length) * 100);
  }

  const { error: updateGoalError } = await supabase
    .from('goals')
    .update({ progress })
    .eq('id', goalId)
    .eq('user_id', userId);

  if (updateGoalError) {
    throw new Error(updateGoalError.message);
  }
}

export async function getGoalProgressById(goalId: string, userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('goals')
    .select('progress')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Goal not found');
  }

  return toNumber((data as DbGoalProgressRow).progress, 0);
}
