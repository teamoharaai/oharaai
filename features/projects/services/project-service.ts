import supabase from '@/lib/db/client';
import { authedFetch } from '@/lib/api/client';
import type { IncomingProjectInvitation, Project, ProjectActivity, ProjectCollaboration, ProjectComment, ProjectGoalMomentum, ProjectMode, ProjectRole, ProjectSummary, ProjectVaultItem, ProjectWithGoals, ProjectWorkspace } from '@/features/projects/types';
import type { GoalWithDetails } from '@/features/goals/types';
import type { EntryRecord } from '@/features/entries/types';
import { enrichGoalsWithSignals, GOAL_SELECT, mapGoal, type DbGoal } from '@/features/goals/services/goal-service';
import { fetchEntries } from '@/features/entries/services/entry-service';
import { buildProjectVaultActivity, deriveProjectVisualCategory, mergeProjectActivity } from '../model';
import { selectProjectTaskPreviews } from '../model';
import { mapTask } from '@/lib/db/tasks';

const PROJECT_SELECT =
  'id, user_id, title, description, status, mode, start_date, end_date, period_key, created_at, updated_at';

export async function fetchProjects(_userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Project[];
}

export async function fetchProjectSummaries(userId: string): Promise<ProjectSummary[]> {
  const projects = await fetchProjects(userId);
  if (!projects.length) return [];
  const projectIds = projects.map((project) => project.id);
  const [{ data: goalRows, error: goalsError }, { data: memberRows, error: membersError }] = await Promise.all([
    supabase.from('goals')
    .select('id, title, category, status, project_id, updated_at')
    .in('project_id', projectIds),
    supabase.from('project_members').select('project_id').in('project_id', projectIds),
  ]);
  if (goalsError) throw goalsError;
  if (membersError) throw membersError;
  const goals = (goalRows ?? []) as Array<{ id: string; title: string; category: GoalWithDetails['category']; status: GoalWithDetails['status']; project_id: string; updated_at: string }>;
  const goalIds = goals.map((goal) => goal.id);
  const { data: vaultRows, error: vaultError } = await supabase.from('vaults')
    .select('id, goal_id, project_id')
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
      memberCount: (memberRows ?? []).filter((member: any) => member.project_id === project.id).length,
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
  const { data: id, error } = await supabase.rpc('create_project_v11', {
    p_title: payload.title.trim(),
    p_description: payload.description?.trim() || null,
    p_mode: 'personal', p_goal_ids: [],
    p_allow_reassignment: false,
  });
  if (error || !id) throw new Error(error?.message ?? 'Failed to create project');
  const { data, error: readError } = await supabase.from('projects').select(PROJECT_SELECT).eq('id', id).single();
  if (readError || !data) throw new Error(readError?.message ?? 'Failed to read project');
  return data as Project;
}

export async function createProjectWithGoals(payload: { title: string; description?: string; goalIds: string[]; allowReassignment: boolean }): Promise<Project> {
  const { data: id, error } = await supabase.rpc('create_project_v11', {
    p_title: payload.title.trim(), p_description: payload.description?.trim() || null,
    p_mode: 'personal', p_goal_ids: payload.goalIds, p_allow_reassignment: payload.allowReassignment,
  });
  if (error || !id) throw new Error(error?.message ?? 'Failed to create project');
  const { data, error: readError } = await supabase.from('projects').select(PROJECT_SELECT).eq('id', id).single();
  if (readError || !data) throw new Error(readError?.message ?? 'Failed to read project');
  return data as Project;
}

export async function createCollaborativeProject(payload: { title: string; description?: string; mode: ProjectMode; goalIds: string[]; allowReassignment: boolean }): Promise<Project> {
  const { data: id, error } = await supabase.rpc('create_project_v11', {
    p_title: payload.title.trim(), p_description: payload.description?.trim() || null,
    p_mode: payload.mode, p_goal_ids: payload.goalIds, p_allow_reassignment: payload.allowReassignment,
  });
  if (error || !id) throw new Error(error?.message ?? 'Failed to create Project');
  const { data, error: readError } = await supabase.from('projects').select(PROJECT_SELECT).eq('id', id).single();
  if (readError || !data) throw new Error(readError?.message ?? 'Failed to read Project');
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
    .select('id, task_id, completed_at, completed_by').in('task_id', tasks.map((task) => task.id))
    .eq('status', 'completed').not('completed_at', 'is', null)
    .order('completed_at', { ascending: false }).limit(30);
  if (occurrenceError) throw occurrenceError;
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const goalTitleById = new Map(goals.map((goal) => [goal.id, goal.title]));
  return (occurrenceRows ?? []).flatMap((row: any) => {
    const task = taskById.get(row.task_id);
    if (!task || !row.completed_at) return [];
    return [{ id: `task-${row.id}`, label: `Task completed — ${task.title}`, occurredAt: row.completed_at, origin: `From: ${goalTitleById.get(task.goal_id) ?? 'Goal'}`, actorId: row.completed_by ?? null }];
  });
}

async function fetchProjectEntries(projectId: string): Promise<EntryRecord[]> {
  const { data, error } = await supabase.from('entries')
    .select('id,user_id,entry_type,title,content,plain_text,reflection_type,conversation_turns,takeaway,pinned,archived,content_version,schema_version,completed_at,created_at,updated_at,project_id,project_share_scope')
    .eq('project_id', projectId).eq('archived', false).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id, userId: row.user_id, entryType: row.entry_type, title: row.title,
    content: row.content, plainText: row.plain_text, brtCategory: null,
    reflectionType: row.reflection_type, conversationTurns: row.conversation_turns ?? [],
    takeaway: row.takeaway, pinned: row.pinned, archived: row.archived,
    contentVersion: row.content_version, schemaVersion: row.schema_version,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    goals: [], project: { id: projectId, title: '', status: 'active' }, projectShareScope: row.project_share_scope, categoryIds: [], milestones: [],
  }));
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

async function fetchProjectTaskPreviews(goals: GoalWithDetails[]) {
  const active = goals.filter((goal) => goal.status === 'active');
  if (!active.length) return [];
  const { data, error } = await supabase.from('tasks')
    .select('*, task_schedules(*), task_occurrences(*)')
    .in('goal_id', active.map((goal) => goal.id));
  if (error) throw error;
  const titleByGoal = new Map(active.map((goal) => [goal.id, goal.title]));
  const grouped = new Map<string, ReturnType<typeof mapTask>[]>();
  for (const row of data ?? []) {
    const task = mapTask(row as never);
    grouped.set(task.goalId, [...(grouped.get(task.goalId) ?? []), task]);
  }
  return selectProjectTaskPreviews(active.map((goal) => ({ goalId: goal.id, goalTitle: titleByGoal.get(goal.id) ?? goal.title, tasks: grouped.get(goal.id) ?? [] })));
}

export async function fetchProjectCollaboration(projectId: string): Promise<ProjectCollaboration> {
  const { data, error } = await supabase.rpc('get_project_collaboration_v11', { p_project_id: projectId });
  if (error || !data) throw new Error(error?.message ?? 'Project members could not be loaded');
  return data as unknown as ProjectCollaboration;
}

export async function fetchProjectWorkspace(projectId: string): Promise<ProjectWorkspace | null> {
  const base = await fetchProjectWithGoals(projectId);
  if (!base) return null;
  const [entriesResult, sharedEntriesResult, vaultResult, eventResult, taskResult, entryLinkResult, taskPreviewResult, collaborationResult, collaborationActivityResult, commentsResult, momentumResult] = await Promise.allSettled([
    fetchEntries(), fetchProjectEntries(projectId),
    authedFetch(`/api/projects/${projectId}/vault`).then(async (response) => {
      if (!response.ok) throw new Error('Project Vault could not be loaded');
      return response.json() as Promise<{ vault: NonNullable<ProjectWorkspace['vault']>; items: ProjectVaultItem[] }>;
    }),
    supabase.from('project_goal_events').select('id, project_id, prior_project_id, goal_id, event_type, occurred_at')
      .or(`project_id.eq.${projectId},prior_project_id.eq.${projectId}`).order('occurred_at', { ascending: false }).limit(30),
    fetchProjectTaskActivity(base.goals),
    fetchProjectEntryLinkActivity(base.goals),
    fetchProjectTaskPreviews(base.goals),
    fetchProjectCollaboration(projectId),
    supabase.from('project_activity_events').select('id,actor_id,event_type,target_type,target_id,label,metadata,occurred_at').eq('project_id',projectId).order('occurred_at',{ascending:false}).limit(30),
    supabase.from('project_comments').select('id,author_id,target_type,target_id,body,created_at').eq('project_id',projectId).is('deleted_at',null).order('created_at',{ascending:false}).limit(50),
    supabase.rpc('get_project_goal_momentum_v11',{p_project_id:projectId}),
  ]);
  const partialErrors: string[] = [];
  const entries = entriesResult.status === 'fulfilled' ? entriesResult.value : (partialErrors.push('Echo content'), []);
  const projectEntries = sharedEntriesResult.status === 'fulfilled' ? sharedEntriesResult.value : (partialErrors.push('shared Echo content'), []);
  const vaultPayload = vaultResult.status === 'fulfilled' ? vaultResult.value : (partialErrors.push('Vault content'), { vault: null, items: [] as ProjectVaultItem[] });
  const eventRows = eventResult.status === 'fulfilled' && !eventResult.value.error
    ? eventResult.value.data ?? []
    : (partialErrors.push('association activity'), []);
  const taskActivity = taskResult.status === 'fulfilled' ? taskResult.value : (partialErrors.push('Task activity'), []);
  const entryLinks = entryLinkResult.status === 'fulfilled' ? entryLinkResult.value : (partialErrors.push('Entry activity'), []);
  const taskPreviews = taskPreviewResult.status === 'fulfilled'
    ? taskPreviewResult.value
    : (partialErrors.push('Project Tasks'), []);
  const collaboration: ProjectCollaboration = collaborationResult.status === 'fulfilled' ? collaborationResult.value : (partialErrors.push('members'), { role: 'member', capabilities: ['view_project'], members: [], invitations: [] });
  const memberName = new Map(collaboration.members.map((member) => [member.userId, member.displayName]));
  for (const item of taskActivity) if (item.actorId) item.actorName = memberName.get(item.actorId);
  const collaborationRows = collaborationActivityResult.status === 'fulfilled' && !collaborationActivityResult.value.error ? collaborationActivityResult.value.data ?? [] : (partialErrors.push('collaboration activity'), []);
  const collaborationActivity: ProjectActivity[] = collaborationRows.map((row: any) => ({ id:`collaboration-${row.id}`,label:row.label,occurredAt:row.occurred_at,origin:row.metadata?.title,actorId:row.actor_id,actorName:row.actor_id ? memberName.get(row.actor_id) : undefined }));
  const comments: ProjectComment[] = commentsResult.status === 'fulfilled' && !commentsResult.value.error ? (commentsResult.value.data ?? []).map((row:any)=>({id:row.id,authorId:row.author_id,targetType:row.target_type,targetId:row.target_id,body:row.body,createdAt:row.created_at})) : (partialErrors.push('comments'), []);
  const goalMomentum: ProjectGoalMomentum[] = momentumResult.status === 'fulfilled' && !momentumResult.value.error ? (momentumResult.value.data ?? []).map((row:any)=>({goalId:row.goal_id,displayedValue:row.current_value === null ? null : Math.round(Number(row.current_value)),weeklyChange:row.weekly_change === null ? null : Number(row.weekly_change),status:row.status})) : (partialErrors.push('Momentum'), []);
  const goalIds = new Set(base.goals.map((goal) => goal.id));
  const linkedEntries = Array.from(new Map([...entries.filter((entry) => entry.project?.id === projectId || entry.goals.some((goal) => goalIds.has(goal.id))), ...projectEntries].map((entry) => [entry.id, entry])).values());
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
    taskPreviews,
    collaboration,
    comments,
    goalMomentum,
    activity: mergeProjectActivity([collaborationActivity, eventActivity, taskActivity, entryActivity, milestoneActivity, goalActivity, phaseActivity, buildProjectVaultActivity(vaultPayload.items)]),
  };
}

export async function setProjectMode(projectId: string, mode: ProjectMode): Promise<void> {
  const { error } = await supabase.rpc('set_project_mode_v11',{p_project_id:projectId,p_mode:mode}); if(error) throw new Error(error.message);
}
export async function updateProjectDetails(projectId:string,title:string,description:string):Promise<void>{ const {error}=await supabase.rpc('update_project_details_v11',{p_project_id:projectId,p_title:title,p_description:description}); if(error) throw new Error(error.message); }
export async function fetchIncomingProjectInvitations(): Promise<IncomingProjectInvitation[]> { const { data, error } = await supabase.rpc('get_my_project_invitations_v11'); if (error) throw new Error(error.message); return ((data ?? []) as any[]).map((row) => ({ id:row.id,projectId:row.project_id,projectTitle:row.project_title,inviterName:row.inviter_name,role:row.role,relationshipLabel:row.relationship_label,expiresAt:row.expires_at,createdAt:row.created_at })); }
export async function inviteProjectMember(projectId:string,userId:string,role:Exclude<ProjectRole,'owner'>,relationshipLabel?:string):Promise<void>{ const {error}=await supabase.rpc('create_project_invitation_v11',{p_project_id:projectId,p_invited_user_id:userId,p_invited_email:null,p_role:role,p_relationship_label:relationshipLabel??null}); if(error) throw new Error(error.message); }
export async function respondProjectInvitation(invitationId:string,response:'accepted'|'declined'):Promise<string>{ const {data,error}=await supabase.rpc('respond_project_invitation_v11',{p_invitation_id:invitationId,p_response:response}); if(error||!data) throw new Error(error?.message??'Invitation could not be updated'); return data as string; }
export async function revokeProjectInvitation(invitationId:string):Promise<void>{ const {error}=await supabase.rpc('revoke_project_invitation_v11',{p_invitation_id:invitationId}); if(error) throw new Error(error.message); }
export async function setProjectMemberRole(projectId:string,userId:string,role:Exclude<ProjectRole,'owner'>,label?:string):Promise<void>{ const {error}=await supabase.rpc('set_project_member_role_v11',{p_project_id:projectId,p_user_id:userId,p_role:role,p_label:label??null}); if(error) throw new Error(error.message); }
export async function removeProjectMember(projectId:string,userId:string):Promise<void>{ const {error}=await supabase.rpc('remove_project_member_v11',{p_project_id:projectId,p_user_id:userId}); if(error) throw new Error(error.message); }
export async function assignGoalLead(goalId:string,userId:string|null):Promise<void>{ const {error}=await supabase.rpc('assign_project_goal_lead_v11',{p_goal_id:goalId,p_user_id:userId}); if(error) throw new Error(error.message); }
export async function assignProjectTask(taskId:string,userId:string|null):Promise<void>{ const {error}=await supabase.rpc('assign_project_task_v11',{p_task_id:taskId,p_user_id:userId}); if(error) throw new Error(error.message); }
export async function assignProjectMilestone(milestoneId:string,userId:string|null):Promise<void>{ const {error}=await supabase.rpc('assign_project_milestone_v11',{p_milestone_id:milestoneId,p_user_id:userId}); if(error) throw new Error(error.message); }
export async function createProjectTask(goalId:string,title:string,dueDate:string|null,assignedTo:string|null):Promise<void>{ const {error}=await supabase.rpc('create_project_task_v11',{p_goal_id:goalId,p_title:title,p_due_date:dueDate,p_assigned_to:assignedTo,p_idempotency_key:`project-${Date.now()}-${Math.random().toString(36).slice(2)}`}); if(error) throw new Error(error.message); }
export async function createProjectMilestone(goalId:string,title:string,dueDate:string|null,responsibleUserId:string|null):Promise<void>{ const {error}=await supabase.rpc('create_project_milestone_v11',{p_goal_id:goalId,p_title:title,p_due_date:dueDate,p_responsible_user_id:responsibleUserId}); if(error) throw new Error(error.message); }
export async function createProjectComment(projectId:string,targetType:string,targetId:string,body:string):Promise<void>{ const {error}=await supabase.rpc('create_project_comment_v11',{p_project:projectId,p_type:targetType,p_id:targetId,p_body:body}); if(error) throw new Error(error.message); }
export async function setEntryProjectShare(entryId:string,scope:'private'|'project'|'guide'):Promise<void>{ const {error}=await supabase.rpc('set_entry_project_share_v11',{p_entry_id:entryId,p_scope:scope}); if(error) throw new Error(error.message); }

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
