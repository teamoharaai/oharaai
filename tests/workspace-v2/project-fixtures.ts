import type { Page } from '@playwright/test';

// Synthetic role fixtures adapted from the established Project collaboration tests.
const now = '2026-09-23T12:00:00Z';
const previewAccessToken = (userId: string) => `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ aud: 'authenticated', exp: 1893456000, role: 'authenticated', sub: userId })).toString('base64url')}.preview`;
const ids = {
  owner: '11111111-1111-4111-8111-111111111111',
  admin: '22222222-2222-4222-8222-222222222222',
  member: '33333333-3333-4333-8333-333333333333',
  guide: '44444444-4444-4444-8444-444444444444',
  friend: '55555555-5555-4555-8555-555555555555',
  personalGoal: '66666666-6666-4666-8666-666666666666',
  teamGoal: '77777777-7777-4777-8777-777777777777',
  guideGoal: '88888888-8888-4888-8888-888888888888',
};

type Scenario = {
  mode: 'personal' | 'team' | 'guide';
  viewer: 'owner' | 'admin' | 'member' | 'guide';
  full?: boolean;
  completionMode?: 'binary' | 'quantity';
  failVault?: boolean;
  secondaryDelayMs?: number;
  reflectionText?: string | null;
  theme?: 'light' | 'dark';
};

const people = {
  owner: { userId: ids.owner, role: 'owner', relationshipLabel: null, displayName: 'Arthur Silva', username: 'arthur', avatarUrl: null, joinedAt: now },
  admin: { userId: ids.admin, role: 'admin', relationshipLabel: null, displayName: 'Justin', username: 'justin', avatarUrl: null, joinedAt: now },
  member: { userId: ids.member, role: 'member', relationshipLabel: null, displayName: 'Maya', username: 'maya', avatarUrl: null, joinedAt: now },
  guide: { userId: ids.guide, role: 'guide', relationshipLabel: 'Fitness Coach', displayName: 'Justin', username: 'justin', avatarUrl: null, joinedAt: now },
} as const;

export async function installScenario(page: Page, scenario: Scenario) {
  const viewerId = ids[scenario.viewer];
  const user = { id: viewerId, email: `${scenario.viewer}@example.test`, role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const projectId = `project-${scenario.mode}-${scenario.viewer}-${scenario.full === false ? 'open' : 'full'}`;
  const project = { id: projectId, user_id: ids.owner, title: scenario.mode === 'guide' ? '5K Training' : scenario.mode === 'team' ? 'Launch OHARA' : 'Reading Practice', description: scenario.mode === 'guide' ? 'Build a confident training rhythm together.' : 'A calm place for meaningful progress.', status: 'active', mode: scenario.mode, start_date: null, end_date: null, period_key: null, created_at: now, updated_at: now };
  const members = scenario.mode === 'personal' ? [people.owner] : scenario.mode === 'guide' ? [people.owner, people.guide] : scenario.full === false ? [people.owner, people.admin] : [people.owner, people.admin, people.member];
  const capabilitiesByRole = {
    owner: ['view_project','manage_project','manage_members','invite_members','create_goal','assign_goal_lead','create_task','assign_task','complete_task','create_milestone','assign_milestone','view_shared_vault','add_shared_content','comment','chat','view_shared_notes','view_shared_reflections'],
    admin: ['view_project','manage_project','manage_members','invite_members','assign_goal_lead','create_task','assign_task','complete_task','create_milestone','assign_milestone','view_shared_vault','add_shared_content','comment','chat','view_shared_notes','view_shared_reflections'],
    member: ['view_project','complete_task','view_shared_vault','add_shared_content','comment','chat','view_shared_notes','view_shared_reflections'],
    guide: ['view_project','create_task','assign_task','complete_task','create_milestone','assign_milestone','view_shared_vault','add_shared_content','comment','chat','view_shared_notes','view_shared_reflections'],
  } as const;
  const goalId = scenario.mode === 'personal' ? ids.personalGoal : scenario.mode === 'team' ? ids.teamGoal : ids.guideGoal;
  const goal = { id: goalId, user_id: ids.owner, title: scenario.mode === 'guide' ? 'Run a Sub-25 5K' : scenario.mode === 'team' ? 'Beta Launch' : 'Read 12 Books', description: 'Build consistent progress.', category: scenario.mode === 'guide' ? 'Health & Fitness' : 'Learning & Creativity', status: 'active', color_theme: 'ocean', smart_data: {}, target_frequency: null, visibility: 'private', progress: 30, deadline: '2026-12-01T12:00:00Z', completed_at: null, archived_at: null, expired_at: null, ai_generated: false, project_id: projectId, project_lead_id: ids.owner, previous_goal_id: null, prior_phase_summary: null, reflection: null, reflected_at: null, created_at: now, updated_at: now, milestones: [{ id: 'milestone-1', goal_id: goalId, user_id: ids.owner, title: 'First complete rehearsal', description: null, due_date: '2026-10-14', completed_at: null, sort_order: 0, is_ai_suggested: false, kind: 'achievement', parent_id: null, target_count: null, photo_url: null, responsible_user_id: ids.owner, created_at: now, updated_at: now }] };
  let task = { id: 'task-1', user_id: ids.owner, goal_id: goalId, milestone_id: null, title: scenario.mode === 'guide' ? 'Long Run' : 'Finalize onboarding', description: null, completion_mode: scenario.completionMode ?? 'binary', target_quantity: scenario.completionMode === 'quantity' ? 2 : null, quantity_unit: scenario.completionMode === 'quantity' ? 'steps' : null, status: 'active', due_date: null, source: 'user', legacy_current_value: null, legacy_frequency: null, sort_order: 0, created_at: now, updated_at: now, completed_at: null as string | null, archived_at: null, assigned_to: (scenario.mode === 'team' ? ids.member : ids.owner) as string | null, assigned_by: null, created_by: ids.owner, task_schedules: [], task_occurrences: [{ id: 'occurrence-1', task_id: 'task-1', schedule_id: null, occurrence_key: 'one-time', scheduled_local_date: '2026-09-22', scheduled_local_time: null, schedule_timezone: 'UTC', scheduled_at: null, status: 'pending', actual_quantity: scenario.completionMode === 'quantity' ? 0 : null, note: null, completed_at: null as string | null, skipped_at: null, source: 'user', created_at: now, updated_at: now, completed_by: null as string | null }] };
  let taskMutations = 0;
  const taskJson = () => ({
    id: task.id, goalId: task.goal_id, milestoneId: task.milestone_id, title: task.title,
    description: task.description, completionMode: task.completion_mode,
    targetQuantity: task.target_quantity, quantityUnit: task.quantity_unit, status: task.status,
    dueDate: task.due_date, source: task.source, legacyCurrentValue: task.legacy_current_value,
    legacyFrequency: task.legacy_frequency, sortOrder: task.sort_order, createdAt: task.created_at,
    updatedAt: task.updated_at, completedAt: task.completed_at, archivedAt: task.archived_at,
    assignedTo: task.assigned_to, assignedBy: task.assigned_by, createdBy: task.created_by,
    schedules: [], occurrences: task.task_occurrences.map((occurrence) => ({
      id: occurrence.id, taskId: occurrence.task_id, scheduleId: occurrence.schedule_id,
      occurrenceKey: occurrence.occurrence_key, scheduledLocalDate: occurrence.scheduled_local_date,
      scheduledLocalTime: occurrence.scheduled_local_time, scheduleTimezone: occurrence.schedule_timezone,
      scheduledAt: occurrence.scheduled_at, status: occurrence.status, actualQuantity: occurrence.actual_quantity,
      note: occurrence.note, completedAt: occurrence.completed_at, skippedAt: occurrence.skipped_at,
      source: occurrence.source, createdAt: occurrence.created_at, updatedAt: occurrence.updated_at,
      completedBy: occurrence.completed_by,
    })),
  });
  let ownComment = { id: 'comment-own', author_id: viewerId, target_type: 'task', target_id: task.id, body: 'Keep this one at conversational pace.', created_at: now, edited_at: null as string | null, deleted_at: null as string | null };
  const otherComment = { id: 'comment-other', author_id: scenario.mode === 'guide' ? ids.owner : ids.admin, target_type: 'task', target_id: task.id, body: 'The next checkpoint looks clear.', created_at: '2026-09-23T11:00:00Z', edited_at: null, deleted_at: null };
  const sharedReflection = { id: 'entry-shared', userId: ids.owner, entryType: 'reflection', title: 'Weekly Reflection', content: { type: 'doc', content: [] }, plainText: scenario.reflectionText === undefined ? 'Training felt more consistent this week, especially during the longer sessions.' : scenario.reflectionText ?? '', brtCategory: null, reflectionType: 'weekly', conversationTurns: [], takeaway: null, pinned: false, archived: false, contentVersion: 1, schemaVersion: 2, completedAt: null, createdAt: now, updatedAt: now, projectShareScope: scenario.mode === 'guide' ? 'guide' : 'project', goals: [{ id: goalId, title: goal.title, category: goal.category, status: goal.status, projectId }], project: { id: projectId, title: project.title }, categoryIds: [], milestones: [] };

  const session = { access_token: previewAccessToken(user.id), refresh_token: 'preview-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user };
  await page.addInitScript(({ session: value, theme }) => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) return JSON.stringify(value);
      return originalGetItem.call(this, key);
    };
    localStorage.setItem('sb-projects-preview-auth-token', JSON.stringify(value));
    localStorage.setItem('ohara-ui-state', JSON.stringify({ state: { themeMode: theme }, version: 5 }));
    for (const patch of ['journal-prelaunch-redesign', 'notes-prelaunch-library', 'goals-v2-3-1', 'vault-v2-3', 'projects-v1-0', 'projects-v1-1-execution', 'notes-v1-1', 'momentum-v1-1']) {
      localStorage.setItem(`ohara:release:${patch}:seen`, 'seen');
      sessionStorage.setItem(`ohara:release:${patch}:seen`, 'seen');
    }
  }, { session, theme: scenario.theme ?? 'dark' });

  await page.route(/https?:\/\/[^/]+\/(?:auth|rest)\/v1\/.*/, async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.includes('/auth/v1/user')) return json(user);
    if (url.pathname.endsWith('/rpc/reconcile_goal_expiration_v1')) return json(null);
    if (url.pathname.endsWith('/rpc/get_my_project_invitations_v11')) return json([]);
    if (url.pathname.endsWith('/rpc/get_project_collaboration_v11')) return json({ role: scenario.viewer, capabilities: capabilitiesByRole[scenario.viewer], members, invitations: [] });
    if (url.pathname.endsWith('/rpc/get_project_goal_momentum_v11')) return json([{ goal_id: goalId, current_value: scenario.mode === 'guide' ? 68 : 72, weekly_change: scenario.mode === 'guide' ? 6 : 4, status: 'active' }]);
    if (url.pathname.endsWith('/rpc/edit_project_comment_v11')) { const body = route.request().postDataJSON() as { p_body: string }; ownComment = { ...ownComment, body: body.p_body.trim(), edited_at: '2026-09-23T13:00:00Z' }; return json(true); }
    if (url.pathname.endsWith('/rpc/delete_project_comment_v11')) { ownComment = { ...ownComment, deleted_at: '2026-09-23T13:00:00Z' }; return json(true); }
    if (url.pathname.endsWith('/rpc/assign_project_task_v11')) { const body = route.request().postDataJSON() as { p_user_id: string | null }; await new Promise((resolve) => setTimeout(resolve, 600)); task = { ...task, assigned_to: body.p_user_id }; return json(true); }
    if (url.pathname.endsWith('/projects')) return json(url.searchParams.has('id') ? project : [project]);
    if (url.pathname.endsWith('/project_members')) return json([{ project_id: projectId }]);
    if (url.pathname.endsWith('/goals')) return json(url.searchParams.has('id') ? goal : [goal]);
    if (url.pathname.endsWith('/tasks')) return json([task]);
    if (url.pathname.endsWith('/task_occurrences')) return json([]);
    if (url.pathname.endsWith('/entries')) return json([{
      id: sharedReflection.id,
      user_id: sharedReflection.userId,
      entry_type: sharedReflection.entryType,
      title: sharedReflection.title,
      content: sharedReflection.content,
      plain_text: sharedReflection.plainText,
      reflection_type: sharedReflection.reflectionType,
      conversation_turns: sharedReflection.conversationTurns,
      takeaway: sharedReflection.takeaway,
      pinned: sharedReflection.pinned,
      archived: sharedReflection.archived,
      content_version: sharedReflection.contentVersion,
      schema_version: sharedReflection.schemaVersion,
      completed_at: sharedReflection.completedAt,
      created_at: sharedReflection.createdAt,
      updated_at: sharedReflection.updatedAt,
      project_id: projectId,
      project_share_scope: sharedReflection.projectShareScope,
    }]);
    if (url.pathname.endsWith('/project_activity_events')) return json([
      { id: 'activity-comment', actor_id: ids.admin, event_type: 'comment.created', target_type: 'task', target_id: task.id, label: 'Commented on Task', metadata: {}, occurred_at: now },
      { id: 'activity-1', actor_id: ids.admin, event_type: 'task.assigned', target_type: 'task', target_id: task.id, label: 'Assigned a Task to Maya', metadata: { title: task.title }, occurred_at: '2026-09-23T11:30:00Z' },
    ]);
    if (url.pathname.endsWith('/project_comments')) return json([ownComment, otherComment].filter((comment) => !comment.deleted_at));
    if (url.pathname.endsWith('/project_chat_messages')) return json([]);
    if (url.pathname.endsWith('/vaults')) return json([{ id: 'project-vault', project_id: projectId, goal_id: null }]);
    if (url.pathname.endsWith('/vault_items') || url.pathname.endsWith('/project_goal_events')) return json([]);
    return json([]);
  });

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const ok = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, data, error: null }) });
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (path === `/api/projects/${projectId}/vault`) {
      if (scenario.secondaryDelayMs) await new Promise((resolve) => setTimeout(resolve, scenario.secondaryDelayMs));
      return scenario.failVault
        ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic Vault outage' }) })
        : json({ vault: { id: 'project-vault', ownerId: ids.owner, goalId: null, projectId, spaceId: null, vaultType: 'personal', createdAt: now, updatedAt: now }, items: [] });
    }
    if (path === '/api/tasks') return json({ data: [taskJson()] });
    if (path === '/api/task-occurrences/occurrence-1' && route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as { status?: 'pending' | 'completed'; delta?: number };
      const occurrence = task.task_occurrences[0];
      const quantity = body.delta === undefined ? occurrence.actual_quantity : (occurrence.actual_quantity ?? 0) + body.delta;
      const status = body.status ?? (task.completion_mode === 'quantity' && task.target_quantity !== null && (quantity ?? 0) >= task.target_quantity ? 'completed' : 'pending');
      const completedAt = status === 'completed' ? '2026-09-23T13:00:00Z' : null;
      taskMutations += 1;
      task = { ...task, status: status === 'completed' ? 'complete' : 'active', completed_at: completedAt, task_occurrences: [{ ...occurrence, status, actual_quantity: quantity, completed_at: completedAt, completed_by: status === 'completed' ? viewerId : null, updated_at: '2026-09-23T13:00:00Z' }] };
      return json({ data: taskJson().occurrences[0] });
    }
    if (path === '/api/momentum') return json({ data: { goals: [{ goalId, displayedValue: scenario.mode === 'guide' ? 68 : 72, weeklyChange: scenario.mode === 'guide' ? 6 : 4, status: 'active' }] } });
    if (path === '/api/entries/library') return json({ entries: [sharedReflection] });
    if (path === '/api/friends') return ok({ friends: [{ id: ids.friend, username: 'jordan', display_name: 'Jordan', avatar_url: null }] });
    if (path.startsWith('/api/circles/')) return ok({ posts: [], goals: [], invites: [], friends: [] });
    return json({ data: [], entries: [], items: [] });
  });
  return { goal, project, viewerId, taskMutationCount: () => taskMutations };
}
