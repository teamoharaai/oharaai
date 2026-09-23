import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from './client';
import { CATEGORY_COLOR_THEME } from '@/constants/themes';
import { buildGoalEmbeddingText } from '@/lib/ai/embedding-text';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { EMBEDDING_MODEL } from '@/lib/ai/constants';
import type {
  GoalCategory,
  GoalDbStatus,
  GoalTrackerFrequency,
  GoalTrackerType,
  GoalVisibility,
} from '@/lib/goals/schema';
import type { ActivityItem } from '@/types/activity';
import type { VaultItemType } from '@/types/vault';
import type { EchoBrt } from '@/features/echo/types';

export interface CreateGoalWithMilestonesAndTrackersResult {
  goalId: string | null;
  error: string | null;
  warning: string | null;
}

export type GoalExtensionErrorCode =
  | 'GOAL_NOT_FOUND'
  | 'GOAL_NOT_EXPIRED'
  | 'GOAL_ALREADY_EXTENDED'
  | 'GOAL_HAS_SUCCESSOR';

export class GoalExtensionError extends Error {
  constructor(
    public readonly code: GoalExtensionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GoalExtensionError';
  }
}

export async function getSuccessorGoalIds(
  goalIds: string[],
  db: SupabaseClient = supabase,
): Promise<Set<string>> {
  const uniqueGoalIds = [...new Set(goalIds)];
  if (uniqueGoalIds.length === 0) return new Set();

  const { data, error } = await db
    .from('goals')
    .select('id, previous_goal_id')
    .in('previous_goal_id', uniqueGoalIds);

  if (error) {
    throw new Error(error.message);
  }

  const requestedGoalIds = new Set(uniqueGoalIds);
  return new Set(
    ((data as Array<{ previous_goal_id: string | null }> | null) ?? [])
      .map((goal) => goal.previous_goal_id)
      .filter((goalId): goalId is string => goalId !== null && requestedGoalIds.has(goalId)),
  );
}

/** Returns the continuation goal id for one completed phase, if it exists. */
export async function getSuccessorGoalId(
  goalId: string,
  db: SupabaseClient = supabase,
): Promise<string | null> {
  const { data, error } = await db
    .from('goals')
    .select('id')
    .eq('previous_goal_id', goalId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Where a goal-creation request came from. Drives the AI-provenance flags on the
 * goal and its children: 'manual' keeps them false (hand-authored), 'ai_chatbot'
 * marks the goal and every child as AI-suggested. Defaults to 'manual' so the
 * existing manual path is unchanged.
 */
export type GoalCreationOrigin = 'manual' | 'ai_chatbot';

export interface ManualGoalCreationInput {
  title: string;
  description: string | null;
  deadline: string;
  category: GoalCategory;
  visibility: GoalVisibility;
  target_frequency: {
    times: number;
    period: 'day' | 'week' | 'month';
  } | null;
  project_id: string | null;
  /** Drafts are fully persisted goals that are not yet part of the active journey. */
  status?: Extract<GoalDbStatus, 'active' | 'draft'>;
  smart_data?: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  } | null;
  milestones: Array<{
    title: string;
    description?: string | null;
    dueDate?: string | null;
  }>;
  trackers: Array<{
    title: string;
    type: GoalTrackerType;
    targetValue?: number | null;
    targetUnit?: string | null;
    frequency?: GoalTrackerFrequency | null;
  }>;
  vault_context?: never;
}

export interface GoalVaultContext {
  spaceId: string | null;
  vaultType: 'personal' | 'shared' | 'institutional';
}

export interface CreateGoalWithMilestonesAndTrackersOptions {
  requestId?: string;
  vaultContext?: GoalVaultContext;
  /** Provenance of this creation. Defaults to 'manual'. */
  origin?: GoalCreationOrigin;
}

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

/**
 * Inserts a manually-authored goal, milestones, and canonical Tasks.
 * Returns the new goalId on success, null on failure.
 */
export async function createGoalWithMilestonesAndTrackers(
  userId: string,
  input: ManualGoalCreationInput,
  options?: CreateGoalWithMilestonesAndTrackersOptions,
  db: SupabaseClient = supabase,
): Promise<CreateGoalWithMilestonesAndTrackersResult> {
  const requestId = options?.requestId ?? null;
  const origin: GoalCreationOrigin = options?.origin ?? 'manual';
  const isAiGenerated = origin === 'ai_chatbot';

  if (!input.title?.trim()) {
    const error = 'Goal payload is missing a title';
    console.error('[goal-create] persistence failed', {
      requestId,
      stage: 'persistence',
      userId,
      error,
    });
    return { goalId: null, error, warning: null };
  }

  if (!input.category?.trim()) {
    const error = 'Goal payload is missing a category';
    console.error('[goal-create] persistence failed', {
      requestId,
      stage: 'persistence',
      userId,
      error,
    });
    return { goalId: null, error, warning: null };
  }

  const normalizedDeadline = normalizeDeadlineForPersistence(input.deadline);
  const normalizationWarnings = normalizedDeadline
    ? []
    : [`Invalid deadline "${input.deadline}" was normalized to null before persistence`];
  const embeddingText = buildGoalEmbeddingText(
    input.title,
    input.description,
    input.milestones,
    input.trackers,
  );
  const goalInsert = {
    user_id: userId,
    title: input.title.trim(),
    description: input.description,
    category: input.category,
    status: input.status ?? 'active',
    color_theme: CATEGORY_COLOR_THEME[input.category] ?? 'ocean',
    deadline: normalizedDeadline,
    target_frequency: input.target_frequency,
    visibility: input.visibility,
    // goals.smart_data is `jsonb not null default '{}'`. Default to an empty
    // object (not the string '{}', which Postgres would store as a JSON string)
    // so the manual path stays identical to the prior DB default.
    smart_data: input.smart_data ?? {},
    ai_generated: isAiGenerated,
    project_id: input.project_id,
    embedding_text: embeddingText,
  };
  let warning: string | null = normalizationWarnings[0] ?? null;

  console.info('[goal-create] persistence started', {
    requestId,
    stage: 'persistence',
    userId,
    title: input.title,
    category: input.category,
    milestoneCount: input.milestones.length,
    trackerCount: input.trackers.length,
    projectId: input.project_id,
  });

  if (normalizationWarnings.length > 0) {
    console.warn('[goal-create] persistence normalization adjusted payload', {
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
    console.error('[goal-create] persistence failed', {
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
  const milestoneInserts = input.milestones.map((milestone, index) => ({
    goal_id: goalId,
    user_id: userId,
    title: milestone.title.trim(),
    description: milestone.description?.trim() || null,
    due_date: milestone.dueDate ?? null,
    sort_order: index,
    is_ai_suggested: isAiGenerated,
  }));

  if (milestoneInserts.length > 0) {
    const { error: milestoneError } = await db.from('milestones').insert(milestoneInserts);

    if (milestoneError) {
      warning = [warning, milestoneError.message].filter(Boolean).join(' | ');
      console.error('[goal-create] persistence failed', {
        requestId,
        stage: 'persistence',
        goalId,
        error: milestoneError.message,
        code: milestoneError.code,
        details: milestoneError.details,
        hint: milestoneError.hint,
      });
    } else {
      console.info('[goal-create] persistence milestones saved', {
        requestId,
        stage: 'persistence',
        goalId,
        milestoneCount: input.milestones.length,
      });
    }
  }

  if (input.trackers.length > 0) {
    const taskResults = await Promise.all(input.trackers.map(async (tracker, index) => {
      const quantityTask = tracker.type === 'counter'
        || (tracker.type === 'habit' && (tracker.targetValue ?? 1) > 1);
      return db.rpc('create_task_v1', {
      p_goal_id: goalId,
      p_title: tracker.title,
      p_completion_mode: quantityTask ? 'quantity' : 'binary',
      p_description: null,
      p_target_quantity: quantityTask ? tracker.targetValue : null,
      p_quantity_unit: quantityTask ? tracker.targetUnit : null,
      p_due_date: null,
      p_milestone_id: null,
      p_sort_order: index,
      p_idempotency_key: requestId ? `${requestId}:task:${index}` : `goal:${goalId}:task:${index}`,
      // Legacy wizard templates specify a weekly count but no actual weekdays.
      // Preserve them as honest Anytime Tasks instead of inventing a schedule.
      p_schedule_kind: null,
      p_schedule_interval: 1,
      p_schedule_weekdays: [],
      p_schedule_start: null,
      p_schedule_end: null,
      p_schedule_local_time: null,
      p_schedule_timezone: null,
      });
    }));
    const taskError = taskResults.find((result) => result.error)?.error;

    if (taskError) {
      warning = [warning, taskError.message].filter(Boolean).join(' | ');
      console.error('[goal-create] persistence failed', {
        requestId,
        stage: 'persistence',
        goalId,
        error: taskError.message,
        code: taskError.code,
        details: taskError.details,
        hint: taskError.hint,
      });
    } else {
      console.info('[goal-create] persistence Tasks saved', {
        requestId,
        stage: 'persistence',
        goalId,
        taskCount: input.trackers.length,
      });
    }
  }

  // Fire-and-forget embedding (non-blocking)
  // Goal is already saved — embedding failure must not affect the result.
  void generateEmbedding(embeddingText, 'document')
    .then(async (vector) => {
      if (vector) {
        await db
          .from('goals')
          .update({
            embedding: vector as any, // pgvector accepts number[]
            embedding_model: EMBEDDING_MODEL,
          })
          .eq('id', goalId);
      }
    })
    .catch((err) => {
      console.error(JSON.stringify({
        event: 'embedding_write_failed',
        table: 'goals',
        record_id: goalId,
        error: err instanceof Error ? err.message : 'unknown',
        timestamp: new Date().toISOString(),
      }));
    });

  // Every goal gets a vault — it is the goal's knowledge stronghold, so the
  // "one vault per goal" contract must hold from creation, not only when a
  // caller happens to pass a vaultContext. A caller may still specify the
  // space/type; otherwise we default to a personal vault. Non-blocking: a
  // vault failure never fails goal creation (the read path self-heals via
  // getOrCreateVaultForUser), and unique(goal_id) makes a duplicate insert a
  // no-op we can safely ignore.
  const vaultContext = options?.vaultContext;
  const { error: vaultError } = await db
    .from('vaults')
    .insert({
      user_id: userId,
      goal_id: goalId,
      space_id: vaultContext?.spaceId ?? null,
      vault_type: vaultContext?.vaultType ?? 'personal',
    });

  if (vaultError && vaultError.code !== '23505') {
    console.error('[vault] Failed to auto-create vault for goal', goalId, {
      requestId,
      stage: 'persistence',
      error: vaultError.message,
      code: vaultError.code,
    });
    // Non-blocking: goal creation still succeeds
  }

  console.info('[goal-create] persistence succeeded', {
    requestId,
    stage: 'persistence',
    goalId,
    warning,
  });
  return { goalId, error: null, warning };
}

type DbGoalForCloneRow = {
  id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  project_id: string | null;
  space_id: string | null;
  target_frequency: Record<string, unknown> | null;
  visibility: string;
  created_at: string;
  deadline: string | null;
  status: string;
};

type DbTrackerForCloneRow = {
  id: string;
  title: string;
  type: GoalTrackerType;
  target_value: number | null;
  target_unit: string | null;
  frequency: string | null;
  current_value: number;
  sort_order: number;
};

type DbPendingMilestoneForCloneRow = {
  title: string;
  description: string | null;
  due_date: string | null;
  sort_order: number;
};

function isPreviousGoalUniqueViolation(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}): boolean {
  if (error.code !== '23505') return false;

  return [error.message, error.details].some(
    (value) => typeof value === 'string' && (
      value.includes('idx_goals_previous_goal_id')
      || value.includes('already been extended')
    ),
  );
}

/**
 * Atomically creates a successor phase and archives its predecessor.
 * Completed milestones stay with the completed phase; only pending one-time
 * events are carried into the continuation goal.
 */
export async function cloneGoalWithMilestonesAndTrackers(
  previousGoalId: string,
  userId: string,
  deadline: string,
  db: SupabaseClient = supabase,
  title?: string,
  reflection?: string,
): Promise<CreateGoalWithMilestonesAndTrackersResult> {
  // This is intentionally the first preflight check so a second extension
  // attempt is rejected before any insert is attempted.
  const successorGoalIds = await getSuccessorGoalIds([previousGoalId], db);
  if (successorGoalIds.has(previousGoalId)) {
    throw new GoalExtensionError(
      'GOAL_ALREADY_EXTENDED',
      'Goal has already been extended',
    );
  }

  const { data: previousGoalData, error: previousGoalError } = await db
    .from('goals')
    .select(
      'id, title, description, category, project_id, space_id, target_frequency, visibility, created_at, deadline, status',
    )
    .eq('id', previousGoalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (previousGoalError) {
    throw new Error(previousGoalError.message);
  }
  if (!previousGoalData) {
    throw new GoalExtensionError('GOAL_NOT_FOUND', 'Goal not found');
  }

  const previousGoal = previousGoalData as unknown as DbGoalForCloneRow;
  if (previousGoal.status !== 'active' && previousGoal.status !== 'expired') {
    throw new GoalExtensionError(
      'GOAL_NOT_EXPIRED',
      'Only active or expired Goals can begin a new phase',
    );
  }

  const { data: trackerData, error: trackerReadError } = await db
    .from('trackers')
    .select(
      'id, title, type, target_value, target_unit, frequency, current_value, sort_order',
    )
    .eq('goal_id', previousGoalId)
    .order('sort_order', { ascending: true });

  if (trackerReadError) {
    throw new Error(trackerReadError.message);
  }

  const trackers = (
    trackerData as unknown as DbTrackerForCloneRow[] | null
  ) ?? [];

  const { data: milestoneData, error: milestoneReadError } = await db
    .from('milestones')
    .select('title, description, due_date, sort_order')
    .eq('goal_id', previousGoalId)
    .is('completed_at', null)
    .order('sort_order', { ascending: true });

  if (milestoneReadError) {
    throw new Error(milestoneReadError.message);
  }

  const pendingMilestones = (
    milestoneData as unknown as DbPendingMilestoneForCloneRow[] | null
  ) ?? [];

  const resolvedTitle = title && title.trim() !== '' ? title.trim() : previousGoal.title;
  const embeddingText = buildGoalEmbeddingText(
    resolvedTitle,
    previousGoal.description,
    pendingMilestones,
    trackers,
  );
  const { data: newGoalId, error: goalInsertError } = await db.rpc('start_goal_new_phase_v1', {
    p_previous_goal_id: previousGoal.id,
    p_deadline: deadline,
    p_title: resolvedTitle,
    p_reflection: reflection ?? null,
    p_embedding_text: embeddingText,
  });

  if (goalInsertError) {
    if (isPreviousGoalUniqueViolation(goalInsertError)) {
      throw new GoalExtensionError(
        'GOAL_ALREADY_EXTENDED',
        'This goal has already been extended.',
      );
    }

    throw new Error(goalInsertError.message);
  }
  if (typeof newGoalId !== 'string') {
    throw new Error('Goal insert returned no row');
  }

  const goalId = newGoalId;

  // Fire-and-forget embedding (non-blocking), matching first-time goal creation.
  void generateEmbedding(embeddingText, 'document')
    .then(async (vector) => {
      if (vector) {
        await db
          .from('goals')
          .update({
            embedding: vector as any,
            embedding_model: EMBEDDING_MODEL,
          })
          .eq('id', goalId);
      }
    })
    .catch((err) => {
      console.error(JSON.stringify({
        event: 'embedding_write_failed',
        table: 'goals',
        record_id: goalId,
        error: err instanceof Error ? err.message : 'unknown',
        timestamp: new Date().toISOString(),
      }));
    });

  return { goalId, error: null, warning: null };
}

// ─── DB row types for activity query ─────────────────────────────────────────

type DbTrackerRow = {
  id: string;
  title: string;
  target_value: number | null;
};

type DbTrackerLogRow = {
  id: string;
  value: number;
  note: string | null;
  logged_at: string;
  tracker_id: string;
};

type DbCompletedMilestoneRow = {
  id: string;
  title: string;
  completed_at: string;
};

type DbGoalCreatedAtRow = {
  created_at: string;
};

// Additional row types for new activity sources

type DbVaultRowForActivity = {
  id: string;
};

type DbVaultItemRowForActivity = {
  id: string;
  item_type: string;
  content_kind: string;
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
  brt_ai: EchoBrt | null;
  brt_user: EchoBrt | null;
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
  // 1. Tracker logs are progress observations, never milestone completions.
  const { data: trackersData } = await db
    .from('trackers')
    .select('id, title, target_value')
    .eq('goal_id', goalId);

  const trackers = (trackersData as unknown as DbTrackerRow[] | null) ?? [];
  const trackerItems: ActivityItem[] = [];

  if (trackers.length > 0) {
    const trackerIds = trackers.map((tracker) => tracker.id);
    const trackerMap = new Map(trackers.map((tracker) => [tracker.id, tracker]));

    const { data: trackerLogData } = await db
      .from('tracker_logs')
      .select('id, value, note, logged_at, tracker_id')
      .in('tracker_id', trackerIds);

    trackerItems.push(
      ...((trackerLogData as unknown as DbTrackerLogRow[] | null) ?? []).map((log) => ({
        kind: 'tracker_logged' as const,
        id: `tracker-log-${log.id}`,
        trackerId: log.tracker_id,
        label: trackerMap.get(log.tracker_id)?.title ?? '',
        value: log.value,
        note: log.note,
        timestamp: log.logged_at,
      })),
    );
  }

  // 2. A milestone is a one-time event. completed_at is its sole completion
  // source of truth and the only source for milestone_completed activity.
  const { data: milestoneData } = await db
    .from('milestones')
    .select('id, title, completed_at')
    .eq('goal_id', goalId)
    .not('completed_at', 'is', null);

  const milestoneItems: ActivityItem[] = (
    (milestoneData as unknown as DbCompletedMilestoneRow[] | null) ?? []
  ).map((milestone) => ({
    kind: 'milestone_completed',
    id: `milestone-${milestone.id}`,
    milestoneId: milestone.id,
    label: milestone.title,
    timestamp: milestone.completed_at,
  }));

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
      .select('id, item_type, content_kind, title, content, metadata, created_at, updated_at')
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
          contentKind: row.content_kind === 'sticky_note' ? 'sticky_note' : 'generic',
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

  // 5. Echo-goal links — reflections linked via echo_entry_links (many-to-many bridge),
  //    now the sole source for goal-linked reflections: createEntry() no longer writes
  //    echo_entries.goal_id on new inserts (see echo-service.ts), so this table is
  //    canonical rather than a supplement to a legacy join.
  //    Timestamp is echo_entry_links.created_at (when linked), not echo_entries.created_at.
  const echoLinkedItems: ActivityItem[] = [];

  const { data: linkData } = await db
    .from('echo_entry_links')
    .select('id, echo_entry_id, created_at')
    .eq('goal_id', goalId)
    .eq('container_type', 'goal');

  const links = (linkData as unknown as DbEchoLinkRow[] ?? []);

  if (links.length > 0) {
    const linkedEntryIds = links.map((link) => link.echo_entry_id);
    const linkByEntryId = new Map(links.map((link) => [link.echo_entry_id, link]));

    const { data: linkedEchoData } = await db
      .from('echo_entries')
      .select('id, content, brt, brt_ai, brt_user')
      .in('id', linkedEntryIds);

    for (const entry of (linkedEchoData as unknown as DbEchoEntryForLinkRow[] ?? [])) {
      const link = linkByEntryId.get(entry.id);
      if (!link) continue;
      echoLinkedItems.push({
        kind: 'echo_linked',
        id: `echo-linked-${link.id}`,
        echoEntryId: entry.id,
        preview: entry.content.slice(0, 100),
        brt: entry.brt_user ?? entry.brt_ai ?? entry.brt ?? null,
        timestamp: link.created_at,
      });
    }
  }

  return [
    ...milestoneItems,
    ...trackerItems,
    goalCreatedItem,
    ...vaultAddedItems,
    ...insightConfirmedItems,
    ...echoLinkedItems,
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function completeTracker(
  trackerId: string,
  goalId: string,
  userId: string,
  db: SupabaseClient = supabase,
): Promise<void> {
  void trackerId;
  void goalId;
  void userId;
  void db;
  throw new Error('Legacy Tracker writes are disabled. Use canonical Tasks.');
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

export async function isGoalOwnedByUser(
  goalId: string,
  userId: string,
  db: SupabaseClient = supabase,
): Promise<boolean> {
  const { data, error } = await db
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}
