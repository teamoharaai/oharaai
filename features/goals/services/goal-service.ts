import supabase from '@/lib/db/client';
import type { Goal, GoalWithMeasurables, Measurable, MeasurableType, MeasurableFrequency, GoalStatus } from '../types';
import type { GoalTheme } from '@/constants/themes';

type DbMeasurable = {
  id: string;
  goal_id: string;
  title: string;
  type: string;
  target_value: number | null;
  target_unit: string | null;
  frequency: string | null;
  current_value: number;
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
  color_theme: string;
  deadline: string | null;
  is_public: boolean;
  progress: number;
  status: string;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
  measurables: DbMeasurable[];
};

const VALID_THEMES: GoalTheme[] = ['ocean', 'sunset', 'forest', 'lavender', 'ember', 'mint', 'slate', 'coral'];

function toTheme(raw: string): GoalTheme {
  return VALID_THEMES.includes(raw as GoalTheme) ? (raw as GoalTheme) : 'ocean';
}

function mapMeasurable(row: DbMeasurable): Measurable {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    type: row.type as MeasurableType,
    targetValue: row.target_value ?? undefined,
    targetUnit: row.target_unit ?? undefined,
    frequency: row.frequency ? (row.frequency as MeasurableFrequency) : undefined,
    currentValue: row.current_value,
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
    description: row.description ?? undefined,
    category: row.category,
    colorTheme: toTheme(row.color_theme),
    deadline: row.deadline ? new Date(row.deadline) : undefined,
    isPublic: row.is_public,
    progress: row.progress,
    status: row.status as GoalStatus,
    aiGenerated: row.ai_generated,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    measurables: (row.measurables ?? []).map(mapMeasurable),
  };
}

const GOAL_SELECT = `
  id, user_id, title, description, category, color_theme, deadline,
  is_public, progress, status, ai_generated, created_at, updated_at,
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

export async function updateGoal(_goalId: string, _updates: Partial<Goal>): Promise<Goal | null> {
  // TODO: implement Supabase update
  return null;
}
