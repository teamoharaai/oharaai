import type { Goal, GoalWithMeasurables } from '../types';
import { MOCK_GOALS } from './mock-data';

export async function fetchGoals(_userId: string): Promise<GoalWithMeasurables[]> {
  // TODO: replace with Supabase query
  return MOCK_GOALS;
}

export async function fetchGoalById(goalId: string): Promise<GoalWithMeasurables | null> {
  // TODO: replace with Supabase query
  return MOCK_GOALS.find((g) => g.id === goalId) ?? null;
}

export async function createGoal(_goal: Partial<Goal>): Promise<Goal | null> {
  // TODO: implement Supabase insert
  return null;
}

export async function updateGoal(_goalId: string, _updates: Partial<Goal>): Promise<Goal | null> {
  // TODO: implement Supabase update
  return null;
}
