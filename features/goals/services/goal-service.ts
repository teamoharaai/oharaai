import supabase from '@/lib/db/client';
import { fetchLatestReflectionTimestamps } from '@/lib/db/echo-entry-links';
import { getSuccessorGoalId, getSuccessorGoalIds } from '@/lib/db/goals';
import { buildTrackerInsert } from '@/lib/db/tracker-inserts';
import { resolveBrt } from '@/lib/utils/resolveBrt';
import { startPerformanceTimer } from '@/lib/diagnostics/performance';
import type { EchoBrt } from '@/types/brt';
import type {
  Goal,
  GoalMilestone,
  GoalMilestoneInput,
  GoalMilestoneUpdates,
  GoalStatus,
  GoalTargetFrequency,
  GoalWithDetails,
  PriorPhaseSummaryItem,
  Tracker,
  TrackerFrequency,
  TrackerInput,
  TrackerType,
  TrackerUpdates,
} from '../types';
import type { GoalTheme } from '@/constants/themes';
import {
  GOAL_CATEGORIES,
  GOAL_DB_STATUSES,
  GOAL_TRACKER_FREQUENCIES,
  GOAL_TRACKER_TYPES,
  GOAL_SMART_KEYS,
  type GoalCategory,
  type GoalSmartData,
  GOAL_VISIBILITIES,
  type GoalVisibility,
} from '@/lib/goals/schema';

type DbTracker = {
  id: string;
  goal_id: string;
  title: string;
  type: string;
  target_value: number | string | null;
  target_unit: string | null;
  frequency: string | null;
  current_value: number | string;
  is_ai_suggested: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type DbMilestone = {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  is_ai_suggested: boolean;
  created_at: string;
  updated_at: string;
};

export type DbGoal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  smart_data: Record<string, unknown> | null;
  color_theme: string;
  deadline: string | null;
  target_frequency: Record<string, unknown> | null;
  visibility: string;
  progress: number | string;
  status: string;
  ai_generated: boolean;
  project_id: string | null;
  previous_goal_id: string | null;
  prior_phase_summary: unknown;
  reflection: string | null;
  reflected_at: string | null;
  created_at: string;
  updated_at: string;
  milestones: DbMilestone[];
  trackers: DbTracker[];
};

const VALID_THEMES: GoalTheme[] = ['ocean', 'sunset', 'forest', 'lavender', 'ember', 'mint', 'slate', 'coral'];

function toTheme(raw: string): GoalTheme {
  return VALID_THEMES.includes(raw as GoalTheme) ? (raw as GoalTheme) : 'ocean';
}

function toNumber(raw: number | string | null | undefined, fallback = 0): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toDate(raw: string | null): Date | null {
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

function toCategory(raw: string): GoalCategory {
  return GOAL_CATEGORIES.includes(raw as GoalCategory) ? (raw as GoalCategory) : 'mind';
}

function toStatus(raw: string): GoalStatus {
  return GOAL_DB_STATUSES.includes(raw as GoalStatus) ? (raw as GoalStatus) : 'active';
}

function toVisibility(raw: string): GoalVisibility {
  return GOAL_VISIBILITIES.includes(raw as GoalVisibility) ? (raw as GoalVisibility) : 'private';
}

function toTargetFrequency(raw: Record<string, unknown> | null): GoalTargetFrequency | null {
  if (!raw) return null;

  const times = typeof raw.times === 'number' || typeof raw.times === 'string'
    ? toNumber(raw.times, 0)
    : 0;
  const period = raw.period;
  if (
    times < 1
    || (period !== 'day' && period !== 'week' && period !== 'month')
  ) {
    return null;
  }

  return { times, period };
}

function toTrackerType(raw: string): TrackerType {
  return GOAL_TRACKER_TYPES.includes(raw as TrackerType) ? (raw as TrackerType) : 'checklist';
}

function toTrackerFrequency(raw: string | null): TrackerFrequency | null {
  if (!raw) return null;
  return GOAL_TRACKER_FREQUENCIES.includes(raw as TrackerFrequency)
    ? (raw as TrackerFrequency)
    : null;
}

function toSmartData(raw: Record<string, unknown> | null): GoalSmartData | null {
  if (!raw) return null;
  const values: GoalSmartData = {
    specific: typeof raw.specific === 'string' ? raw.specific : '',
    measurable: typeof raw.measurable === 'string' ? raw.measurable : '',
    achievable: typeof raw.achievable === 'string' ? raw.achievable : '',
    relevant: typeof raw.relevant === 'string' ? raw.relevant : '',
    timeBound: typeof raw.timeBound === 'string' ? raw.timeBound : '',
  };

  return GOAL_SMART_KEYS.some((key) => values[key].trim().length > 0) ? values : null;
}

function toPriorPhaseSummary(raw: unknown): PriorPhaseSummaryItem[] | null {
  if (!Array.isArray(raw)) return null;

  const items = raw.flatMap((item): PriorPhaseSummaryItem[] => {
    if (!item || typeof item !== 'object') return [];

    const candidate = item as Record<string, unknown>;
    if (typeof candidate.title !== 'string') return [];

    if (typeof candidate.achieved === 'number' && Number.isFinite(candidate.achieved)) {
      const target = candidate.target;
      if (target !== null && (typeof target !== 'number' || !Number.isFinite(target))) {
        return [];
      }
      return [{ title: candidate.title, achieved: candidate.achieved, target }];
    }

    if (typeof candidate.completions === 'number' && Number.isFinite(candidate.completions)) {
      return [{ title: candidate.title, completions: candidate.completions }];
    }

    return [];
  });

  return items;
}

function mapTracker(row: DbTracker): Tracker {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    type: toTrackerType(row.type),
    targetValue: row.target_value === null ? null : toNumber(row.target_value, 0),
    targetUnit: row.target_unit,
    frequency: toTrackerFrequency(row.frequency),
    currentValue: toNumber(row.current_value, 0),
    isAiSuggested: row.is_ai_suggested,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapMilestone(row: DbMilestone): GoalMilestone {
  return {
    id: row.id,
    goalId: row.goal_id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    dueDate: toDate(row.due_date),
    completedAt: toDate(row.completed_at),
    sortOrder: row.sort_order,
    isAiSuggested: row.is_ai_suggested,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapGoal(row: DbGoal): GoalWithDetails {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: toCategory(row.category),
    colorTheme: toTheme(row.color_theme),
    deadline: toDate(row.deadline),
    targetFrequency: toTargetFrequency(row.target_frequency),
    visibility: toVisibility(row.visibility),
    progress: toNumber(row.progress, 0),
    status: toStatus(row.status),
    aiGenerated: row.ai_generated,
    smartData: toSmartData(row.smart_data),
    projectId: row.project_id,
    previous_goal_id: row.previous_goal_id,
    prior_phase_summary: toPriorPhaseSummary(row.prior_phase_summary),
    reflection: row.reflection,
    reflected_at: toDate(row.reflected_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    has_successor: false,
    successor: null,
    milestones: (row.milestones ?? []).map(mapMilestone).sort((a, b) => a.sortOrder - b.sortOrder),
    trackers: (row.trackers ?? []).map(mapTracker).sort((a, b) => a.sortOrder - b.sortOrder),
    vaultItemCount: 0,
    echoLinkCount: 0,
    latestBrtTags: null,
  };
}

/**
 * Fetches per-goal activity signals in bulk (no N+1).
 * Returns maps: goalId → vaultItemCount, echoLinkCount, latestBrtTags.
 */
async function fetchGoalSignals(
  goalIds: string[],
  userId: string,
): Promise<{
  vaultItemCountMap: Map<string, number>;
  echoLinkCountMap: Map<string, number>;
  latestBrtTagsMap: Map<string, string[]>;
  requestCount: number;
}> {
  const vaultItemCountMap = new Map<string, number>();
  const echoLinkCountMap = new Map<string, number>();
  const latestBrtTagsMap = new Map<string, string[]>();
  let requestCount = 0;

  try {
    // 1. Vaults → vault IDs keyed by goal_id
    requestCount += 1;
    const { data: vaultRows } = await supabase
      .from('vaults')
      .select('id, goal_id')
      .in('goal_id', goalIds)
      .eq('user_id', userId);

    const vaultIdToGoalId = new Map<string, string>(); // vaultId → goalId
    const vaultIds: string[] = [];
    for (const v of (vaultRows as Array<{ id: string; goal_id: string }> ?? [])) {
      vaultIdToGoalId.set(v.id, v.goal_id);
      vaultIds.push(v.id);
    }

    // 2. Vault items count per vault
    if (vaultIds.length > 0) {
      requestCount += 1;
      const { data: itemRows } = await supabase
        .from('vault_items')
        .select('vault_id')
        .in('vault_id', vaultIds);

      for (const item of (itemRows as Array<{ vault_id: string }> ?? [])) {
        const goalId = vaultIdToGoalId.get(item.vault_id);
        if (goalId) {
          vaultItemCountMap.set(goalId, (vaultItemCountMap.get(goalId) ?? 0) + 1);
        }
      }
    }

    // 3. Echo-goal links — count + collect entry IDs
    requestCount += 1;
    const { data: linkRows } = await supabase
      .from('echo_entry_links')
      .select('goal_id, echo_entry_id')
      .in('goal_id', goalIds)
      .eq('container_type', 'goal');

    const goalEntryMap = new Map<string, string[]>(); // goalId → [entryId, ...]
    const allEntryIds: string[] = [];

    for (const link of (linkRows as Array<{ goal_id: string; echo_entry_id: string }> ?? [])) {
      echoLinkCountMap.set(link.goal_id, (echoLinkCountMap.get(link.goal_id) ?? 0) + 1);
      const existing = goalEntryMap.get(link.goal_id) ?? [];
      existing.push(link.echo_entry_id);
      goalEntryMap.set(link.goal_id, existing);
      allEntryIds.push(link.echo_entry_id);
    }

    // 4. Echo entries — fetch brt + created_at for BRT dot derivation
    if (allEntryIds.length > 0) {
      requestCount += 1;
      const { data: entryRows } = await supabase
        .from('echo_entries')
        .select('id, brt, brt_ai, brt_user, created_at')
        .in('id', allEntryIds)
        .not('brt', 'is', null);

      const entryById = new Map<string, { brt: EchoBrt | null; created_at: string }>();
      for (const e of (entryRows as Array<{ id: string; brt: EchoBrt | null; brt_ai: EchoBrt | null; brt_user: EchoBrt | null; created_at: string }> ?? [])) {
        const brtValue = e.brt_user ?? e.brt_ai ?? e.brt;
        entryById.set(e.id, { brt: brtValue, created_at: e.created_at });
      }

      for (const [goalId, entryIds] of goalEntryMap.entries()) {
        const tagged: Array<{ tag: string; created_at: string }> = [];

        for (const entryId of entryIds) {
          const entry = entryById.get(entryId);
          if (!entry?.brt) continue;
          const tag = resolveBrt(entry.brt);
          if (tag) tagged.push({ tag, created_at: entry.created_at });
        }

        tagged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const tags = tagged.slice(0, 3).map((t) => t.tag);
        if (tags.length > 0) latestBrtTagsMap.set(goalId, tags);
      }
    }
  } catch {
    // Signal fetch failure must not block goal list — fallback to empty maps
  }

  return { vaultItemCountMap, echoLinkCountMap, latestBrtTagsMap, requestCount };
}

export const GOAL_SELECT = `
  id, user_id, title, description, category, smart_data, color_theme, deadline,
  target_frequency, visibility, progress, status, ai_generated, project_id, previous_goal_id,
  prior_phase_summary, reflection, reflected_at, created_at, updated_at,
  milestones (
    id, goal_id, user_id, title, description, due_date, completed_at,
    sort_order, is_ai_suggested, created_at, updated_at
  ),
  trackers (
    id, goal_id, title, type, target_value, target_unit, frequency,
    current_value, is_ai_suggested, sort_order, created_at, updated_at
  )
`.trim();

export async function enrichGoalsWithSignals(
  goals: GoalWithDetails[],
  userId: string,
): Promise<GoalWithDetails[]> {
  const timing = startPerformanceTimer('goals.enrichment');
  if (goals.length === 0) {
    timing.end({ success: true, resultCount: 0, requestCount: 0 });
    return goals;
  }

  const goalIds = goals.map((g) => g.id);
  try {
    const [
      { vaultItemCountMap, echoLinkCountMap, latestBrtTagsMap, requestCount },
      successorGoalIds,
    ] = await Promise.all([
      fetchGoalSignals(goalIds, userId),
      getSuccessorGoalIds(goalIds).catch(() => new Set<string>()),
    ]);

    const enrichedGoals = goals.map((goal) => ({
      ...goal,
      has_successor: successorGoalIds.has(goal.id),
      vaultItemCount: vaultItemCountMap.get(goal.id) ?? 0,
      echoLinkCount: echoLinkCountMap.get(goal.id) ?? 0,
      latestBrtTags: latestBrtTagsMap.get(goal.id) ?? null,
    }));
    timing.end({ success: true, resultCount: enrichedGoals.length, requestCount: requestCount + 1 });
    return enrichedGoals;
  } catch (error) {
    timing.end({ success: false, resultCount: goals.length });
    throw error;
  }
}

export async function fetchGoals(
  userId: string,
  options?: { status?: GoalStatus },
): Promise<GoalWithDetails[]> {
  let query = supabase
    .from('goals')
    .select(GOAL_SELECT)
    .eq('user_id', userId);

  if (options?.status) {
    query = query.eq('status', options.status);
  } else {
    query = query.neq('status', 'archived');
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error || !data) return [];
  const goals = (data as unknown as DbGoal[]).map(mapGoal);
  return enrichGoalsWithSignals(goals, userId);
}

export async function fetchActiveGoalsFeed(
  userId: string,
): Promise<Array<GoalWithDetails & { lastReflectionAt: string | null }>> {
  const goals = await fetchGoals(userId, { status: 'active' });
  const latestReflectionTimestamps = await fetchLatestReflectionTimestamps(
    goals.map((goal) => goal.id),
  );

  return goals
    .map((goal) => ({
      ...goal,
      lastReflectionAt: latestReflectionTimestamps[goal.id] ?? null,
    }))
    .sort((a, b) => {
      if (a.lastReflectionAt === null) return b.lastReflectionAt === null ? 0 : 1;
      if (b.lastReflectionAt === null) return -1;
      return Date.parse(b.lastReflectionAt) - Date.parse(a.lastReflectionAt);
    });
}

export async function fetchGoalById(goalId: string): Promise<GoalWithDetails | null> {
  const { data, error } = await supabase
    .from('goals')
    .select(GOAL_SELECT)
    .eq('id', goalId)
    .single();

  if (error || !data) return null;

  const goal = mapGoal(data as unknown as DbGoal);
  try {
    const successorGoalId = await getSuccessorGoalId(goal.id);
    if (!successorGoalId) return goal;

    const { data: successorData } = await supabase
      .from('goals')
      .select('id, reflection, reflected_at')
      .eq('id', successorGoalId)
      .maybeSingle();
    const successor = successorData as {
      id: string;
      reflection: string | null;
      reflected_at: string | null;
    } | null;

    return {
      ...goal,
      has_successor: true,
      successor: {
        id: successorGoalId,
        reflection: successor?.reflection ?? null,
        reflectedAt: toDate(successor?.reflected_at ?? null),
      },
    };
  } catch {
    return goal;
  }
}

export async function updateGoal(goalId: string, updates: Partial<Goal>): Promise<GoalWithDetails | null> {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.progress !== undefined) patch.progress = updates.progress;
  if (updates.deadline !== undefined) patch.deadline = updates.deadline?.toISOString() ?? null;
  if (updates.visibility !== undefined) patch.visibility = updates.visibility;
  if (updates.colorTheme !== undefined) patch.color_theme = updates.colorTheme;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.projectId !== undefined) patch.project_id = updates.projectId;

  if (Object.keys(patch).length === 0) return null;

  const { data, error } = await supabase
    .from('goals')
    .update(patch)
    .eq('id', goalId)
    .select(GOAL_SELECT)
    .single();

  if (error || !data) return null;
  return mapGoal(data as unknown as DbGoal);
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

async function canWriteGoal(goalId: string): Promise<boolean> {
  try {
    return (await getSuccessorGoalId(goalId)) === null;
  } catch {
    return false;
  }
}

export async function createTracker(goalId: string, input: TrackerInput): Promise<Tracker | null> {
  if (!await canWriteGoal(goalId)) return null;

  const { data, error } = await supabase
    .from('trackers')
    .insert(buildTrackerInsert(goalId, input))
    .select()
    .single();

  if (error || !data) return null;
  return mapTracker(data as unknown as DbTracker);
}

export async function updateTracker(
  goalId: string,
  trackerId: string,
  updates: TrackerUpdates,
): Promise<Tracker | null> {
  if (!await canWriteGoal(goalId)) return null;

  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title.trim();
  if ('targetValue' in updates) patch.target_value = updates.targetValue ?? null;
  if ('targetUnit' in updates) patch.target_unit = updates.targetUnit?.trim() || null;
  if ('frequency' in updates) patch.frequency = updates.frequency ?? null;
  if (updates.currentValue !== undefined) patch.current_value = updates.currentValue;
  if (updates.sortOrder !== undefined) patch.sort_order = updates.sortOrder;

  if (Object.keys(patch).length === 0) return null;

  const { data, error } = await supabase
    .from('trackers')
    .update(patch)
    .eq('id', trackerId)
    .select()
    .single();

  if (error || !data) return null;
  return mapTracker(data as unknown as DbTracker);
}

export async function deleteTracker(goalId: string, trackerId: string): Promise<boolean> {
  if (!await canWriteGoal(goalId)) return false;

  const { error } = await supabase
    .from('trackers')
    .delete()
    .eq('id', trackerId);
  return !error;
}

export async function createMilestone(
  goalId: string,
  userId: string,
  input: GoalMilestoneInput,
): Promise<GoalMilestone | null> {
  if (!await canWriteGoal(goalId)) return null;

  const { data, error } = await supabase
    .from('milestones')
    .insert({
      goal_id: goalId,
      user_id: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      due_date: input.dueDate?.toISOString() ?? null,
      sort_order: input.sortOrder ?? 0,
      is_ai_suggested: input.isAiSuggested ?? false,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapMilestone(data as unknown as DbMilestone);
}

export async function updateMilestone(
  goalId: string,
  milestoneId: string,
  updates: Omit<GoalMilestoneUpdates, 'completedAt'>,
): Promise<GoalMilestone | null> {
  if (!await canWriteGoal(goalId)) return null;

  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title.trim();
  if ('description' in updates) patch.description = updates.description?.trim() || null;
  if ('dueDate' in updates) patch.due_date = updates.dueDate?.toISOString() ?? null;
  if (updates.sortOrder !== undefined) patch.sort_order = updates.sortOrder;

  if (Object.keys(patch).length === 0) return null;

  const { data, error } = await supabase
    .from('milestones')
    .update(patch)
    .eq('id', milestoneId)
    .select()
    .single();

  if (error || !data) return null;
  return mapMilestone(data as unknown as DbMilestone);
}

export async function completeMilestone(
  goalId: string,
  milestoneId: string,
): Promise<GoalMilestone | null> {
  if (!await canWriteGoal(goalId)) return null;

  const { data, error } = await supabase
    .from('milestones')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', milestoneId)
    .is('completed_at', null)
    .select()
    .maybeSingle();

  if (error || !data) return null;
  return mapMilestone(data as unknown as DbMilestone);
}

export async function deleteMilestone(goalId: string, milestoneId: string): Promise<boolean> {
  if (!await canWriteGoal(goalId)) return false;

  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', milestoneId);
  return !error;
}
