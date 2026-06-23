import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from './client';
import type { GoalTheme } from '@/constants/themes';
import type { GoalFinalizeResponse } from '@/lib/ai/schemas/goal-creation';
import { buildGoalEmbeddingText } from '@/lib/ai/embedding-text';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { EMBEDDING_MODEL } from '@/lib/ai/constants';
import type { ActivityItem } from '@/types/activity';
import type { VaultItemType } from '@/types/vault';
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
  const embeddingText = buildGoalEmbeddingText(
    aiData.goal.title,
    aiData.goal.description,
    aiData.measurables,
  );

  return {
    goalInsert: {
      user_id: userId,
      title: aiData.goal.title,
      description: aiData.goal.description,
      category: aiData.goal.category,
      // Interim default until Phase 2 mode selection ships (app/goals/create.tsx pills are inert).
      // 'commitment' fits a fully finalized AI goal; schema CHECK only allows 'exploration' | 'commitment'.
      mode: 'commitment' as const,
      status: 'active' as const,
      smart_data: aiData.goal.smart,
      color_theme: colorTheme,
      deadline: normalizedDeadline,
      visibility: 'private' as const,
      ai_generated: true,
      project_id: projectId ?? null,
      embedding_text: embeddingText,
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
    embeddingText,
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
  db: SupabaseClient = supabase,
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

  const { goalInsert, measurableInserts, normalizationWarnings, embeddingText } = mapAiGoalDataToDbInserts(
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

  const { data: goalRow, error: goalError } = await db
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
    const { error: measurableError } = await db.from('measurables').insert(
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

  // Generate and store embedding for this goal (sync, isolated)
  // Goal is already saved — embedding failure must not affect the result.
  try {
    const vector = await generateEmbedding(embeddingText, 'document');
    if (vector) {
      await db
        .from('goals')
        .update({
          embedding: vector as any, // pgvector accepts number[]
          embedding_model: EMBEDDING_MODEL,
        })
        .eq('id', goalId);
    }
  } catch (err) {
    console.error(JSON.stringify({
      event: 'embedding_write_failed',
      table: 'goals',
      record_id: goalId,
      error: err instanceof Error ? err.message : 'unknown',
      timestamp: new Date().toISOString(),
    }));
  }

  // Auto-create vault for this goal (non-blocking)
  const { error: vaultError } = await db
    .from('vaults')
    .insert({
      user_id: userId,
      goal_id: goalId,
      space_id: null,
      vault_type: 'personal',
    });

  if (vaultError) {
    console.error('[vault] Failed to auto-create vault for goal', goalId, {
      requestId,
      stage: 'persistence',
      error: vaultError.message,
      code: vaultError.code,
    });
    // Non-blocking: goal creation still succeeds
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
  ai_response: string | null;
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

// Additional row types for new activity sources

type DbVaultRowForActivity = {
  id: string;
};

type DbVaultItemRowForActivity = {
  id: string;
  item_type: string;
  title: string | null;
  content: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type DbEchoLinkRow = {
  id: string;
  echo_entry_id: string;
  created_at: string;
};

type DbEchoEntryForLinkRow = {
  id: string;
  content: string;
  brt: EchoBrt | null;
};

// NOTE: This function performs activity assembly and formatting logic
// that belongs in a service layer. Retained here for Phase 1 stability.
// Refactor target in Phase 2.

/**
 * Returns a unified activity timeline for a goal, sorted descending by timestamp.
 * Always includes at least one item: the goal_created event.
 */
export async function getActivityByGoalId(
  goalId: string,
  userId: string,
  db: SupabaseClient = supabase,
): Promise<ActivityItem[]> {
  // 1. Echo entries for this goal (legacy echo_entries.goal_id path — preserved for backward compat)
  const { data: echoData } = await db
    .from('echo_entries')
    .select('id, content, ai_response, emotion, brt, created_at')
    .eq('goal_id', goalId)
    .eq('user_id', userId);

  // Track IDs surfaced via legacy path to avoid duplicate echo_linked rows for the same entry
  const legacyEchoEntryIds = new Set<string>();
  const echoItems: ActivityItem[] = (echoData as unknown as DbEchoEntryRow[] ?? []).map(
    (row) => {
      legacyEchoEntryIds.add(row.id);
      return {
        kind: 'echo_entry' as const,
        id: `echo-${row.id}`,
        entryId: row.id,
        preview: row.content.slice(0, 100),
        aiResponse: row.ai_response,
        emotion: row.emotion,
        brt: row.brt,
        timestamp: row.created_at,
      };
    },
  );

  // 2. Measurable completion logs (logs where value >= measurable target_value)
  const { data: measurablesData } = await db
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

    const { data: logData } = await db
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
  const { data: goalData } = await db
    .from('goals')
    .select('created_at')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  const goalCreatedItem: ActivityItem = {
    kind: 'goal_created',
    id: `goal-created-${goalId}`,
    timestamp: (goalData as unknown as DbGoalCreatedAtRow | null)?.created_at
      ?? new Date().toISOString(),
  };

  // 4. Vault items — note/link additions (user-initiated types only)
  //    insight and action_update types are excluded: insights get their own kind below;
  //    action_updates are system-generated events, not user-initiated additions.
  const vaultAddedItems: ActivityItem[] = [];
  const insightConfirmedItems: ActivityItem[] = [];

  const { data: vaultRowData } = await db
    .from('vaults')
    .select('id')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (vaultRowData) {
    const vaultId = (vaultRowData as unknown as DbVaultRowForActivity).id;

    const { data: vaultItemData } = await db
      .from('vault_items')
      .select('id, item_type, title, content, metadata, created_at, updated_at')
      .eq('vault_id', vaultId)
      .in('item_type', ['note', 'link', 'insight']);

    for (const row of (vaultItemData as unknown as DbVaultItemRowForActivity[] ?? [])) {
      if (row.item_type === 'note' || row.item_type === 'link') {
        const itemType = row.item_type as VaultItemType;
        const title =
          row.title ??
          (row.content ? row.content.slice(0, 60) : null) ??
          (row.item_type === 'link' ? 'Saved link' : 'Note');
        vaultAddedItems.push({
          kind: 'vault_item_added',
          id: `vault-item-${row.id}`,
          itemType,
          title,
          timestamp: row.created_at,
        });
      } else if (row.item_type === 'insight') {
        // Only emit insight_confirmed when confirmed: true is persisted in metadata.
        // Uses updated_at as timestamp — this is the closest real timestamp to when
        // confirmation occurred, since no dedicated confirmed_at column exists.
        const meta = row.metadata as { confirmed?: boolean } | null;
        if (meta?.confirmed === true) {
          insightConfirmedItems.push({
            kind: 'insight_confirmed',
            id: `insight-confirmed-${row.id}`,
            content: row.content ?? row.title ?? 'Insight',
            timestamp: row.updated_at,
          });
        }
      }
    }
  }

  // 5. Echo-goal links — reflections linked via echo_goal_links (many-to-many bridge).
  //    Entries already surfaced via the legacy echo_entries.goal_id path are excluded
  //    to prevent duplicate activity rows for the same underlying reflection.
  //    Timestamp is echo_goal_links.created_at (when linked), not echo_entries.created_at.
  const echoLinkedItems: ActivityItem[] = [];

  const { data: linkData } = await db
    .from('echo_goal_links')
    .select('id, echo_entry_id, created_at')
    .eq('goal_id', goalId);

  const newLinks = (linkData as unknown as DbEchoLinkRow[] ?? []).filter(
    (link) => !legacyEchoEntryIds.has(link.echo_entry_id),
  );

  if (newLinks.length > 0) {
    const linkedEntryIds = newLinks.map((link) => link.echo_entry_id);
    const linkByEntryId = new Map(newLinks.map((link) => [link.echo_entry_id, link]));

    const { data: linkedEchoData } = await db
      .from('echo_entries')
      .select('id, content, brt')
      .in('id', linkedEntryIds);

    for (const entry of (linkedEchoData as unknown as DbEchoEntryForLinkRow[] ?? [])) {
      const link = linkByEntryId.get(entry.id);
      if (!link) continue;
      echoLinkedItems.push({
        kind: 'echo_linked',
        id: `echo-linked-${link.id}`,
        echoEntryId: entry.id,
        preview: entry.content.slice(0, 100),
        brt: entry.brt ?? null,
        timestamp: link.created_at,
      });
    }
  }

  return [
    ...echoItems,
    ...milestoneItems,
    goalCreatedItem,
    ...vaultAddedItems,
    ...insightConfirmedItems,
    ...echoLinkedItems,
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
  db: SupabaseClient = supabase,
): Promise<void> {
  const { data: goalRow, error: goalError } = await db
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (goalError || !(goalRow as DbGoalOwnershipRow | null)?.id) {
    throw new Error('Goal not found');
  }

  const { data: measurableRow, error: measurableError } = await db
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

  const { error: insertLogError } = await db.from('measurable_logs').insert({
    measurable_id: measurableId,
    value: completionValue,
    logged_at: new Date().toISOString(),
  });

  if (insertLogError) {
    throw new Error(insertLogError.message);
  }

  const { data: measurablesData, error: measurablesError } = await db
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
    const { data: logData, error: logError } = await db
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

  const { error: updateGoalError } = await db
    .from('goals')
    .update({ progress })
    .eq('id', goalId)
    .eq('user_id', userId);

  if (updateGoalError) {
    throw new Error(updateGoalError.message);
  }
}

export async function getProjectTitle(projectId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('title')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !data) return null;
  return (data as { title: string }).title;
}

export async function getGoalProgressById(
  goalId: string,
  userId: string,
  db: SupabaseClient = supabase,
): Promise<number> {
  const { data, error } = await db
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
