import supabase from '@/lib/db/client';
import type { EchoBrt } from '@/types/brt';
import type { Goal, GoalWithMeasurables, Measurable, MeasurableType, MeasurableFrequency, GoalStatus, MeasurableInput, MeasurableUpdates } from '../types';
import type { GoalTheme } from '@/constants/themes';
import {
  GOAL_CATEGORIES,
  GOAL_DB_STATUSES,
  GOAL_MEASURABLE_FREQUENCIES,
  GOAL_MEASURABLE_TYPES,
  GOAL_SMART_KEYS,
  type GoalCategory,
  type GoalSmartData,
  GOAL_VISIBILITIES,
  type GoalVisibility,
} from '@/lib/goals/schema';

type DbMeasurable = {
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

export type DbGoal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  smart_data: Record<string, unknown> | null;
  color_theme: string;
  deadline: string | null;
  visibility: string;
  progress: number | string;
  status: string;
  ai_generated: boolean;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  measurables: DbMeasurable[];
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

function toMeasurableType(raw: string): MeasurableType {
  return GOAL_MEASURABLE_TYPES.includes(raw as MeasurableType) ? (raw as MeasurableType) : 'checklist';
}

function toMeasurableFrequency(raw: string | null): MeasurableFrequency | null {
  if (!raw) return null;
  return GOAL_MEASURABLE_FREQUENCIES.includes(raw as MeasurableFrequency)
    ? (raw as MeasurableFrequency)
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

function mapMeasurable(row: DbMeasurable): Measurable {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    type: toMeasurableType(row.type),
    targetValue: row.target_value === null ? null : toNumber(row.target_value, 0),
    targetUnit: row.target_unit,
    frequency: toMeasurableFrequency(row.frequency),
    currentValue: toNumber(row.current_value, 0),
    isAiSuggested: row.is_ai_suggested,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapGoal(row: DbGoal): GoalWithMeasurables {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: toCategory(row.category),
    colorTheme: toTheme(row.color_theme),
    deadline: toDate(row.deadline),
    visibility: toVisibility(row.visibility),
    progress: toNumber(row.progress, 0),
    status: toStatus(row.status),
    aiGenerated: row.ai_generated,
    smartData: toSmartData(row.smart_data),
    projectId: row.project_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    measurables: (row.measurables ?? []).map(mapMeasurable),
    vaultItemCount: 0,
    echoLinkCount: 0,
    latestBrtTags: null,
  };
}

// UI heuristic: compress multi-dimensional BRT into single tag
// Priority: bud → rose → thorn
// Temporary — Phase 2 may replace with richer signal model
function deriveBrtTag(brt: EchoBrt | null): 'bud' | 'rose' | 'thorn' | null {
  if (!brt) return null;
  if (brt.bud.length > 0) return 'bud';
  if (brt.rose.length > 0) return 'rose';
  if (brt.thorn.length > 0) return 'thorn';
  return null;
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
}> {
  const vaultItemCountMap = new Map<string, number>();
  const echoLinkCountMap = new Map<string, number>();
  const latestBrtTagsMap = new Map<string, string[]>();

  try {
    // 1. Vaults → vault IDs keyed by goal_id
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
    const { data: linkRows } = await supabase
      .from('echo_goal_links')
      .select('goal_id, echo_entry_id')
      .in('goal_id', goalIds);

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
      const { data: entryRows } = await supabase
        .from('echo_entries')
        .select('id, brt, created_at')
        .in('id', allEntryIds)
        .not('brt', 'is', null);

      const entryById = new Map<string, { brt: EchoBrt | null; created_at: string }>();
      for (const e of (entryRows as Array<{ id: string; brt: EchoBrt | null; created_at: string }> ?? [])) {
        entryById.set(e.id, { brt: e.brt, created_at: e.created_at });
      }

      for (const [goalId, entryIds] of goalEntryMap.entries()) {
        const tagged: Array<{ tag: string; created_at: string }> = [];

        for (const entryId of entryIds) {
          const entry = entryById.get(entryId);
          if (!entry?.brt) continue;
          const tag = deriveBrtTag(entry.brt);
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

  return { vaultItemCountMap, echoLinkCountMap, latestBrtTagsMap };
}

export const GOAL_SELECT = `
  id, user_id, title, description, category, smart_data, color_theme, deadline,
  visibility, progress, status, ai_generated, project_id, created_at, updated_at,
  measurables (
    id, goal_id, title, type, target_value, target_unit, frequency,
    current_value, is_ai_suggested, sort_order, created_at, updated_at
  )
`.trim();

export async function enrichGoalsWithSignals(
  goals: GoalWithMeasurables[],
  userId: string,
): Promise<GoalWithMeasurables[]> {
  if (goals.length === 0) return goals;

  const goalIds = goals.map((g) => g.id);
  const { vaultItemCountMap, echoLinkCountMap, latestBrtTagsMap } = await fetchGoalSignals(
    goalIds,
    userId,
  );

  return goals.map((goal) => ({
    ...goal,
    vaultItemCount: vaultItemCountMap.get(goal.id) ?? 0,
    echoLinkCount: echoLinkCountMap.get(goal.id) ?? 0,
    latestBrtTags: latestBrtTagsMap.get(goal.id) ?? null,
  }));
}

export async function fetchGoals(userId: string): Promise<GoalWithMeasurables[]> {
  const { data, error } = await supabase
    .from('goals')
    .select(GOAL_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  const goals = (data as unknown as DbGoal[]).map(mapGoal);
  return enrichGoalsWithSignals(goals, userId);
}

export async function fetchGoalById(goalId: string): Promise<GoalWithMeasurables | null> {
  const { data, error } = await supabase
    .from('goals')
    .select(GOAL_SELECT)
    .eq('id', goalId)
    .single();

  if (error || !data) return null;
  return mapGoal(data as unknown as DbGoal);
}

export async function updateGoal(goalId: string, updates: Partial<Goal>): Promise<GoalWithMeasurables | null> {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.progress !== undefined) patch.progress = updates.progress;
  if (updates.deadline !== undefined) patch.deadline = updates.deadline?.toISOString() ?? null;
  if (updates.visibility !== undefined) patch.visibility = updates.visibility;
  if (updates.colorTheme !== undefined) patch.color_theme = updates.colorTheme;
  if (updates.category !== undefined) patch.category = updates.category;

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

export async function createMeasurable(goalId: string, input: MeasurableInput): Promise<Measurable | null> {
  const { data, error } = await supabase
    .from('measurables')
    .insert({
      goal_id: goalId,
      title: input.title.trim(),
      type: input.type,
      target_value: input.targetValue ?? null,
      target_unit: input.targetUnit?.trim() || null,
      frequency: input.frequency ?? null,
      current_value: 0,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapMeasurable(data as unknown as DbMeasurable);
}

export async function updateMeasurable(measurableId: string, updates: MeasurableUpdates): Promise<Measurable | null> {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title.trim();
  if ('targetValue' in updates) patch.target_value = updates.targetValue ?? null;
  if ('targetUnit' in updates) patch.target_unit = updates.targetUnit?.trim() || null;
  if ('frequency' in updates) patch.frequency = updates.frequency ?? null;
  if (updates.currentValue !== undefined) patch.current_value = updates.currentValue;

  if (Object.keys(patch).length === 0) return null;

  const { data, error } = await supabase
    .from('measurables')
    .update(patch)
    .eq('id', measurableId)
    .select()
    .single();

  if (error || !data) return null;
  return mapMeasurable(data as unknown as DbMeasurable);
}

export async function deleteMeasurable(measurableId: string): Promise<boolean> {
  const { error } = await supabase
    .from('measurables')
    .delete()
    .eq('id', measurableId);
  return !error;
}
