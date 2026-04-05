import supabase from '@/lib/db/client';
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

type DbGoal = {
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

function mapGoal(row: DbGoal): GoalWithMeasurables {
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
  };
}

const GOAL_SELECT = `
  id, user_id, title, description, category, smart_data, color_theme, deadline,
  visibility, progress, status, ai_generated, project_id, created_at, updated_at,
  measurables (
    id, goal_id, title, type, target_value, target_unit, frequency,
    current_value, is_ai_suggested, sort_order, created_at, updated_at
  )
`.trim();

export async function fetchGoals(userId: string): Promise<GoalWithMeasurables[]> {
  const { data, error } = await supabase
    .from('goals')
    .select(GOAL_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as unknown as DbGoal[]).map(mapGoal);
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

export async function createGoal(_goal: Partial<Goal>): Promise<Goal | null> {
  // TODO: implement Supabase insert
  return null;
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
