import supabase from '@/lib/db/client';
import type { Project, ProjectWithGoals } from '@/features/projects/types';
import type { GoalWithMeasurables } from '@/features/goals/types';
import { enrichGoalsWithSignals, GOAL_SELECT, mapGoal, type DbGoal } from '@/features/goals/services/goal-service';

export async function fetchProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, user_id, title, description, status, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Project[];
}

export async function fetchProjectWithGoals(projectId: string): Promise<ProjectWithGoals | null> {
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, title, description, status, created_at, updated_at')
    .eq('id', projectId)
    .single();

  if (projectError || !projectData) return null;

  const project = projectData as Project;
  const goals = await fetchGoalsByProject(projectId);

  return { ...project, goals };
}

export async function fetchGoalsByProject(projectId: string): Promise<GoalWithMeasurables[]> {
  const { data, error } = await supabase
    .from('goals')
    .select(GOAL_SELECT)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const goals = ((data ?? []) as unknown as DbGoal[]).map(mapGoal);
  if (goals.length === 0) return goals;

  return enrichGoalsWithSignals(goals, goals[0].userId);
}

export async function createProject(payload: {
  user_id: string;
  title: string;
  description?: string;
}): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: payload.user_id,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
    })
    .select('id, user_id, title, description, status, created_at, updated_at')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create project');
  return data as Project;
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<Project, 'title' | 'description' | 'status'>>
): Promise<Project> {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title.trim();
  if ('description' in updates) patch.description = updates.description?.trim() || null;
  if (updates.status !== undefined) patch.status = updates.status;

  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', id)
    .select('id, user_id, title, description, status, created_at, updated_at')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update project');
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
