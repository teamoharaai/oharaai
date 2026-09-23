import supabase from '@/lib/db/client';
import { authedFetch } from '@/lib/api/client';
import type { Project, ProjectActivity, ProjectSummary, ProjectVaultItem, ProjectWithGoals, ProjectWorkspace } from '@/features/projects/types';
import type { GoalWithDetails } from '@/features/goals/types';
import { enrichGoalsWithSignals, GOAL_SELECT, mapGoal, type DbGoal } from '@/features/goals/services/goal-service';
import { fetchEntries } from '@/features/entries/services/entry-service';
import { buildProjectVaultActivity, deriveProjectVisualCategory, mergeProjectActivity } from '../model';

const PROJECT_SELECT =
  'id, user_id, title, description, status, start_date, end_date, period_key, created_at, updated_at';

export async function fetchProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Project[];
}

export async function fetchProjectSummaries(userId: string): Promise<ProjectSummary[]> {
  const projects = await fetchProjects(userId);
  if (!projects.length) return [];
  const projectIds = projects.map((project) => project.id);
  const { data: goalRows, error: goalsError } = await supabase.from('goals')
    .select('id, title, category, status, project_id, updated_at')
    .eq('user_id', userId).in('project_id', projectIds);
  if (goalsError) throw goalsError;
  const goals = (goalRows ?? []) as Array<{ id: string; title: string; category: GoalWithDetails['category']; status: GoalWithDetails['status']; project_id: string; updated_at: string }>;
  const goalIds = goals.map((goal) => goal.id);
  const { data: vaultRows, error: vaultError } = await supabase.from('vaults')
    .select('id, goal_id, project_id').eq('user_id', userId)
    .or(`project_id.in.(${projectIds.join(',')})${goalIds.length ? `,goal_id.in.(${goalIds.join(',')})` : ''}`);
  if (vaultError) throw vaultError;
  const vaults = (vaultRows ?? []) as Array<{ id: string; goal_id: string | null; project_id: string | null }>;
  const vaultIds = vaults.map((vault) => vault.id);
  const { data: itemRows, error: itemError } = vaultIds.length
    ? await supabase.from('vault_items').select('id, vault_id, updated_at').in('vault_id', vaultIds)
    : { data: [], error: null };
  if (itemError) throw itemError;
  const items = (itemRows ?? []) as Array<{ id: string; vault_id: string; updated_at: string }>;
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const projectByVault = new Map<string, string>();
  for (const vault of vaults) {
    const projectId = vault.project_id ?? (vault.goal_id ? goalById.get(vault.goal_id)?.project_id : null);
    if (projectId) projectByVault.set(vault.id, projectId);
  }
  return projects.map((project) => {
    const projectGoals = goals.filter((goal) => goal.project_id === project.id);
    const projectItems = items.filter((item) => projectByVault.get(item.vault_id) === project.id);
    const latest = [project.updated_at, ...projectGoals.map((goal) => goal.updated_at), ...projectItems.map((item) => item.updated_at)]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    return {
      ...project,
      activeGoalCount: projectGoals.filter((goal) => goal.status === 'active').length,
      goalNames: projectGoals.filter((goal) => goal.status === 'active').slice(0, 3).map((goal) => goal.title),
      lastActivityAt: latest,
      vaultItemCount: projectItems.length,
      visualCategory: deriveProjectVisualCategory(projectGoals as never),
    };
  });
}

export async function fetchProjectWithGoals(projectId: string): Promise<ProjectWithGoals | null> {
  const { error: reconciliationError } = await supabase.rpc('reconcile_goal_expiration_v1');
  if (reconciliationError) throw reconciliationError;

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', projectId)
    .single();

  if (projectError || !projectData) return null;

  const project = projectData as Project;
  const goals = await fetchGoalsByProject(projectId);

  return { ...project, goals };
}

export async function fetchGoalsByProject(projectId: string): Promise<GoalWithDetails[]> {
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
  start_date?: string | null;
  end_date?: string | null;
  period_key?: string | null;
}): Promise<Project> {
  const { data: id, error } = await supabase.rpc('create_project_v1', {
    p_title: payload.title.trim(),
    p_description: payload.description?.trim() || null,
    p_goal_ids: [],
    p_allow_reassignment: false,
  });
  if (error || !id) throw new Error(error?.message ?? 'Failed to create project');
  const { data, error: readError } = await supabase.from('projects').select(PROJECT_SELECT).eq('id', id).single();
  if (readError || !data) throw new Error(readError?.message ?? 'Failed to read project');
  return data as Project;
}

export async function createProjectWithGoals(payload: { title: string; description?: string; goalIds: string[]; allowReassignment: boolean }): Promise<Project> {
  const { data: id, error } = await supabase.rpc('create_project_v1', {
    p_title: payload.title.trim(), p_description: payload.description?.trim() || null,
    p_goal_ids: payload.goalIds, p_allow_reassignment: payload.allowReassignment,
  });
  if (error || !id) throw new Error(error?.message ?? 'Failed to create project');
  const { data, error: readError } = await supabase.from('projects').select(PROJECT_SELECT).eq('id', id).single();
  if (readError || !data) throw new Error(readError?.message ?? 'Failed to read project');
  return data as Project;
}

export async function assignGoalsToProject(projectId: string, goalIds: string[], allowReassignment = false): Promise<void> {
  const { error } = await supabase.rpc('assign_goals_to_project_v1', {
    p_project_id: projectId, p_goal_ids: goalIds, p_allow_reassignment: allowReassignment,
  });
  if (error) throw new Error(error.message);
}

export async function detachGoalFromProject(projectId: string, goalId: string): Promise<void> {
  const { error } = await supabase.rpc('detach_goal_from_project_v1', { p_project_id: projectId, p_goal_id: goalId });
  if (error) throw new Error(error.message);
}

export async function fetchOwnedGoalsForProjects(userId: string): Promise<GoalWithDetails[]> {
  const { data, error } = await supabase.from('goals').select(GOAL_SELECT).eq('user_id', userId)
    .neq('status', 'archived').order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as DbGoal[]).map(mapGoal);
}

async function fetchProjectTaskActivity(goals: GoalWithDetails[]): Promise<ProjectActivity[]> {
  const goalIds = goals.map((goal) => goal.id);
  if (!goalIds.length) return [];
  const { data: taskRows, error: taskError } = await supabase.from('tasks')
    .select('id, title, goal_id').in('goal_id', goalIds);
  if (taskError) throw taskError;
  const tasks = (taskRows ?? []) as Array<{ id: string; title: string; goal_id: string }>;
  if (!tasks.length) return [];
  const { data: occurrenceRows, error: occurrenceError } = await supabase.from('task_occurrences')
    .select('id, task_id, completed_at').in('task_id', tasks.map((task) => task.id))
    .eq('status', 'completed').not('completed_at', 'is', null)
    .order('completed_at', { ascending: false }).limit(30);
  if (occurrenceError) throw occurrenceError;
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const goalTitleById = new Map(goals.map((goal) => [goal.id, goal.title]));
  return (occurrenceRows ?? []).flatMap((row: any) => {
    const task = taskById.get(row.task_id);
    if (!task || !row.completed_at) return [];
    return [{ id: `task-${row.id}`, label: `Task completed — ${task.title}`, occurredAt: row.completed_at, origin: `From: ${goalTitleById.get(task.goal_id) ?? 'Goal'}` }];
  });
}

async function fetchProjectEntryLinkActivity(goals: GoalWithDetails[]): Promise<Array<{ entryId: string; goalId: string; occurredAt: string }>> {
  const goalIds = goals.map((goal) => goal.id);
  if (!goalIds.length) return [];
  const { data, error } = await supabase.from('entry_goal_links')
    .select('entry_id, goal_id, created_at').in('goal_id', goalIds)
    .order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ entryId: row.entry_id, goalId: row.goal_id, occurredAt: row.created_at }));
}

export async function fetchProjectWorkspace(projectId: string): Promise<ProjectWorkspace | null> {
  const base = await fetchProjectWithGoals(projectId);
  if (!base) return null;
  const [entriesResult, vaultResult, eventResult, taskResult, entryLinkResult] = await Promise.allSettled([
    fetchEntries(),
    authedFetch(`/api/projects/${projectId}/vault`).then(async (response) => {
      if (!response.ok) throw new Error('Project Vault could not be loaded');
      return response.json() as Promise<{ vault: NonNullable<ProjectWorkspace['vault']>; items: ProjectVaultItem[] }>;
    }),
    supabase.from('project_goal_events').select('id, project_id, prior_project_id, goal_id, event_type, occurred_at')
      .or(`project_id.eq.${projectId},prior_project_id.eq.${projectId}`).order('occurred_at', { ascending: false }).limit(30),
    fetchProjectTaskActivity(base.goals),
    fetchProjectEntryLinkActivity(base.goals),
  ]);
  const partialErrors: string[] = [];
  const entries = entriesResult.status === 'fulfilled' ? entriesResult.value : (partialErrors.push('Echo content'), []);
  const vaultPayload = vaultResult.status === 'fulfilled' ? vaultResult.value : (partialErrors.push('Vault content'), { vault: null, items: [] as ProjectVaultItem[] });
  const eventRows = eventResult.status === 'fulfilled' && !eventResult.value.error
    ? eventResult.value.data ?? []
    : (partialErrors.push('association activity'), []);
  const taskActivity = taskResult.status === 'fulfilled' ? taskResult.value : (partialErrors.push('Task activity'), []);
  const entryLinks = entryLinkResult.status === 'fulfilled' ? entryLinkResult.value : (partialErrors.push('Entry activity'), []);
  const goalIds = new Set(base.goals.map((goal) => goal.id));
  const linkedEntries = entries.filter((entry) => entry.project?.id === projectId || entry.goals.some((goal) => goalIds.has(goal.id)));
  const goalTitle = new Map(base.goals.map((goal) => [goal.id, goal.title]));
  const eventActivity: ProjectActivity[] = eventRows.map((event: any) => ({
    id: `association-${event.id}`,
    label: event.event_type === 'detached' ? 'Goal removed from Project' : event.event_type === 'reassigned' ? 'Goal moved to Project' : 'Goal added to Project',
    occurredAt: event.occurred_at,
    origin: goalTitle.get(event.goal_id) ?? 'Goal',
  }));
  const milestoneActivity: ProjectActivity[] = base.goals.flatMap((goal) => goal.milestones
    .filter((milestone) => milestone.completedAt)
    .map((milestone) => ({ id: `milestone-${milestone.id}`, label: `Milestone reached — ${milestone.title}`, occurredAt: milestone.completedAt!.toISOString(), origin: `From: ${goal.title}` })));
  const goalActivity: ProjectActivity[] = base.goals.filter((goal) => goal.completedAt)
    .map((goal) => ({ id: `goal-complete-${goal.id}`, label: `Goal completed — ${goal.title}`, occurredAt: goal.completedAt!.toISOString(), origin: `From: ${goal.title}` }));
  const phaseActivity: ProjectActivity[] = base.goals.filter((goal) => goal.previous_goal_id)
    .map((goal) => ({ id: `phase-${goal.id}`, label: `New Phase created — ${goal.title}`, occurredAt: goal.createdAt.toISOString(), origin: `From: ${goal.title}` }));
  const entryById = new Map(linkedEntries.map((entry) => [entry.id, entry]));
  const entryActivity: ProjectActivity[] = [];
  const entryActivityById = new Map<string, ProjectActivity>();
  for (const link of entryLinks) {
    const entry = entryById.get(link.entryId);
    if (!entry) continue;
    const existing = entryActivityById.get(link.entryId);
    const origin = goalTitle.get(link.goalId) ?? 'Goal';
    if (existing) {
      if (!existing.origin?.includes(origin)) existing.origin = `${existing.origin}, ${origin}`;
      continue;
    }
    const item = { id: `entry-link-${link.entryId}`, label: `${entry.entryType === 'reflection' ? 'Reflection' : 'Note'} linked — ${entry.title || 'Untitled'}`, occurredAt: link.occurredAt, origin: `From: ${origin}` };
    entryActivityById.set(link.entryId, item); entryActivity.push(item);
  }
  return {
    ...base,
    entries: linkedEntries,
    partialErrors,
    vault: vaultPayload.vault,
    vaultItems: vaultPayload.items,
    activity: mergeProjectActivity([eventActivity, taskActivity, entryActivity, milestoneActivity, goalActivity, phaseActivity, buildProjectVaultActivity(vaultPayload.items)]),
  };
}

export async function updateProject(
  id: string,
  updates: Partial<
    Pick<Project, 'title' | 'description' | 'status' | 'start_date' | 'end_date' | 'period_key'>
  >
): Promise<Project> {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title.trim();
  if ('description' in updates) patch.description = updates.description?.trim() || null;
  if (updates.status !== undefined) patch.status = updates.status;
  if ('start_date' in updates) patch.start_date = updates.start_date;
  if ('end_date' in updates) patch.end_date = updates.end_date;
  if ('period_key' in updates) patch.period_key = updates.period_key?.trim() || null;

  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', id)
    .select(PROJECT_SELECT)
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
