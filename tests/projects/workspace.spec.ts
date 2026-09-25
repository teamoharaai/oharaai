import { expect, test } from '@playwright/test';

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'projects@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const now = '2026-09-23T12:00:00Z';
const project = { id: 'project-1', user_id: user.id, title: 'Run a 5K Journey', description: 'Build a steady running rhythm.', status: 'active', mode: 'team', start_date: null, end_date: null, period_key: null, created_at: now, updated_at: now };
const goal = { id: 'goal-1', user_id: user.id, title: 'Run a 5K', description: 'Build endurance.', category: 'Health & Fitness', status: 'active', color_theme: 'ocean', smart_data: {}, target_frequency: null, visibility: 'private', progress: 30, deadline: '2026-12-01T12:00:00Z', completed_at: null, archived_at: null, expired_at: null, ai_generated: false, project_id: project.id, project_lead_id: user.id, previous_goal_id: null, prior_phase_summary: null, reflection: null, reflected_at: null, created_at: now, updated_at: now, milestones: [], trackers: [] };
const vault = { id: 'project-vault', ownerId: user.id, goalId: null, projectId: project.id, spaceId: null, vaultType: 'personal', createdAt: now, updatedAt: now };
const items = [{ id: 'sticky-1', vaultId: 'goal-vault', itemType: 'note', contentKind: 'sticky_note', title: 'Aerobic base', content: 'Keep most runs conversational.', metadata: {}, folderId: null, visibility: 'private', createdBy: user.id, sortOrder: 0, createdAt: now, updatedAt: now, directProjectItem: false, origins: [{ goalId: goal.id, goalTitle: goal.title }] }, { id: 'source-1', vaultId: 'project-vault', itemType: 'link', contentKind: 'generic', title: 'Training guide', content: null, metadata: { url: 'https://example.test/guide' }, folderId: null, visibility: 'private', createdBy: user.id, sortOrder: 0, createdAt: now, updatedAt: now, directProjectItem: true, origins: [] }, { id: 'generic-note-1', vaultId: 'goal-vault', itemType: 'note', contentKind: 'generic', title: 'Creatine Brand', content: 'Internal note', metadata: {}, folderId: null, visibility: 'private', createdBy: user.id, sortOrder: 0, createdAt: now, updatedAt: now, directProjectItem: false, origins: [{ goalId: goal.id, goalTitle: goal.title }] }];

for (const theme of ['light', 'dark']) test(`Projects V1 workspace ${theme}`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const session = { access_token: 'preview-token', refresh_token: 'preview-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user };
  await page.addInitScript(({ session, theme }) => {
    localStorage.setItem('sb-projects-preview-auth-token', JSON.stringify(session));
    localStorage.setItem('ohara-ui-state', JSON.stringify({ state: { themeMode: theme }, version: 0 }));
    localStorage.setItem('ohara:release:goals-v2-3-1:seen', 'seen');
    localStorage.setItem('ohara:release:vault-v2-3:seen', 'seen');
    localStorage.setItem('ohara:release:projects-v1-0:seen', 'seen');
  }, { session, theme });
  await page.route('https://projects-preview.invalid/**', async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.includes('/auth/v1/user')) return json(user);
    if (url.pathname.endsWith('/rpc/reconcile_goal_expiration_v1')) return json(null);
    if (url.pathname.endsWith('/rpc/get_my_project_invitations_v11')) return json([]);
    if (url.pathname.endsWith('/rpc/get_project_collaboration_v11')) return json({ role: 'owner', capabilities: ['view_project','manage_project','manage_members','invite_members','create_goal','assign_goal_lead','create_task','assign_task','complete_task','create_milestone','assign_milestone','view_shared_vault','add_shared_content','comment'], members: [{ userId: user.id, role: 'owner', relationshipLabel: null, displayName: 'Arthur', username: 'arthur', avatarUrl: null, joinedAt: now }], invitations: [] });
    if (url.pathname.endsWith('/rpc/get_project_goal_momentum_v11')) return json([{ goal_id: goal.id, current_value: 71, weekly_change: 6, status: 'active' }]);
    if (url.pathname.endsWith('/projects')) return json(url.searchParams.has('id') ? project : [project]);
    if (url.pathname.endsWith('/project_members')) return json([{ project_id: project.id }]);
    if (url.pathname.endsWith('/goals')) return json([goal]);
    if (url.pathname.endsWith('/tasks')) return json([{ id: 'task-1', user_id: user.id, goal_id: goal.id, milestone_id: null, title: 'Easy run', description: null, completion_mode: 'binary', target_quantity: null, quantity_unit: null, status: 'active', due_date: null, source: 'user', legacy_current_value: null, legacy_frequency: null, sort_order: 0, created_at: now, updated_at: now, completed_at: null, archived_at: null, assigned_to: user.id, task_schedules: [], task_occurrences: [{ id: 'occurrence-1', task_id: 'task-1', schedule_id: null, occurrence_key: 'one-time', scheduled_local_date: '2026-09-23', scheduled_local_time: null, schedule_timezone: 'UTC', scheduled_at: null, status: 'pending', actual_quantity: null, note: null, completed_at: null, skipped_at: null, source: 'user', created_at: now, updated_at: now }] }]);
    if (url.pathname.endsWith('/task_occurrences')) return json([]);
    if (url.pathname.endsWith('/entries')) return json([]);
    if (url.pathname.endsWith('/project_activity_events')) return json([]);
    if (url.pathname.endsWith('/project_comments')) return json([]);
    if (url.pathname.endsWith('/vaults')) return json([{ id: 'project-vault', project_id: project.id, goal_id: null }, { id: 'goal-vault', project_id: null, goal_id: goal.id }]);
    if (url.pathname.endsWith('/vault_items')) return json(items.map((item) => ({ id: item.id, vault_id: item.vaultId, updated_at: item.updatedAt })));
    if (url.pathname.endsWith('/project_goal_events')) return json([{ id: 'event-1', project_id: project.id, prior_project_id: null, goal_id: goal.id, event_type: 'added', occurred_at: now }]);
    return json([]);
  });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (path === `/api/projects/${project.id}/vault`) return json({ vault, items });
    if (path === '/api/tasks') return json({ data: [{ id: 'task-1', goalId: goal.id, title: 'Easy run', status: 'active', dueDate: null, occurrences: [{ id: 'occurrence-1', status: 'pending', scheduledLocalDate: '2026-09-23' }] }] });
    if (path === '/api/momentum') return json({ data: { goals: [{ goalId: goal.id, displayedValue: 71, weeklyChange: 6, status: 'active' }] } });
    if (path === '/api/entries/library') return json({ entries: [{ id: 'entry-1', userId: user.id, entryType: 'note', title: 'Training research', content: { type: 'doc', content: [] }, plainText: 'Research', brtCategory: null, reflectionType: null, conversationTurns: [], takeaway: null, pinned: false, archived: false, contentVersion: 1, schemaVersion: 2, completedAt: null, createdAt: now, updatedAt: now, goals: [{ id: goal.id, title: goal.title, category: goal.category, status: goal.status, projectId: project.id }], project: null, categoryIds: [], milestones: [] }] });
    if (path.startsWith('/api/circles/')) return json({ ok: true, data: { posts: [], goals: [], invites: [], friends: [] }, error: null });
    return json({ data: [], entries: [], items: [] });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:4182/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Project Run a 5K Journey' })).toBeVisible();
  await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Open Project Run a 5K Journey' }).click();
  await expect(page.getByRole('heading', { name: project.title })).toBeVisible();
  for (const text of ['Current Goals', 'Notes', 'Reflections', 'Upcoming Milestones', 'Project Tasks', 'Recent Activity', 'Project Snapshot', 'Momentum Snapshot', 'OHARA Intelligence']) await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Aerobic base', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Training research', { exact: true })).toBeVisible();
  await expect(page.getByText('Easy run', { exact: true })).toBeVisible();
  await expect(page.getByText('71 / 100', { exact: true })).toBeVisible();
  await expect(page.getByText('↗ +6 this week', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Vault', exact: true }).click();
  await expect(page).toHaveURL(/view=vault/);
  await expect(page.getByRole('button', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to Vault', exact: true })).toBeVisible();
  for (const filter of ['All', 'Sticky Notes', 'Notes', 'Reflections', 'Sources']) await expect(page.getByRole('tab', { name: filter, exact: true })).toBeVisible();
  await expect(page.getByText('Aerobic base', { exact: true })).toBeVisible();
  await expect(page.getByText('From: Run a 5K', { exact: true })).toBeVisible();
  await expect(page.getByText('Notes', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Reflections', { exact: true }).last()).toBeVisible();
  await page.getByRole('tab', { name: 'Sources', exact: true }).click();
  await expect(page.getByText('Training guide', { exact: true })).toBeVisible();
  await expect(page.getByText('Creatine Brand', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.getByRole('button', { name: 'Manage Project ▾', exact: true }).click();
  for (const tab of ['Details', 'Goals', 'Members', 'Access / Mode', 'Status']) await expect(page.getByRole('tab', { name: tab, exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('Guide workspace exposes permitted coordination without owner controls or private content', async ({ page }) => {
  const clientId = '22222222-2222-4222-8222-222222222222';
  const guideProject = { ...project, id: 'project-guide', user_id: clientId, title: '5K Guidance', mode: 'guide' };
  const guideGoal = {
    ...goal,
    id: 'goal-guide',
    user_id: clientId,
    project_id: guideProject.id,
    project_lead_id: clientId,
    milestones: [{ id: 'milestone-guide', goal_id: 'goal-guide', user_id: clientId, title: 'Practice 5K', description: null, due_date: '2026-09-29', completed_at: null, sort_order: 0, is_ai_suggested: false, kind: 'achievement', parent_id: null, target_count: null, photo_url: null, created_at: now, updated_at: now }],
  };
  const session = { access_token: 'preview-token', refresh_token: 'preview-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user };
  await page.addInitScript(({ session }) => {
    localStorage.setItem('sb-projects-preview-auth-token', JSON.stringify(session));
    localStorage.setItem('ohara-ui-state', JSON.stringify({ state: { themeMode: 'light' }, version: 0 }));
    localStorage.setItem('ohara:release:goals-v2-3-1:seen', 'seen');
    localStorage.setItem('ohara:release:vault-v2-3:seen', 'seen');
    localStorage.setItem('ohara:release:projects-v1-0:seen', 'seen');
  }, { session });
  await page.route('https://projects-preview.invalid/**', async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.includes('/auth/v1/user')) return json(user);
    if (url.pathname.endsWith('/rpc/reconcile_goal_expiration_v1')) return json(null);
    if (url.pathname.endsWith('/rpc/get_project_collaboration_v11')) return json({ role: 'guide', capabilities: ['view_project','view_shared_vault','add_shared_content','create_task','assign_task','complete_task','create_milestone','assign_milestone','comment','view_shared_notes','view_shared_reflections'], members: [{ userId: clientId, role: 'owner', relationshipLabel: null, displayName: 'Arthur', username: 'arthur', avatarUrl: null, joinedAt: now }, { userId: user.id, role: 'guide', relationshipLabel: 'Fitness Coach', displayName: 'Justin', username: 'justin', avatarUrl: null, joinedAt: now }], invitations: [] });
    if (url.pathname.endsWith('/rpc/get_project_goal_momentum_v11')) return json([{ goal_id: guideGoal.id, current_value: 71, weekly_change: null, status: 'active' }]);
    if (url.pathname.endsWith('/projects')) return json(url.searchParams.has('id') ? guideProject : [guideProject]);
    if (url.pathname.endsWith('/project_members')) return json([{ project_id: guideProject.id }]);
    if (url.pathname.endsWith('/goals')) return json([guideGoal]);
    if (url.pathname.endsWith('/tasks')) return json([{ id: 'task-guide', user_id: clientId, goal_id: guideGoal.id, milestone_id: null, title: 'Long Run', description: null, completion_mode: 'binary', target_quantity: null, quantity_unit: null, status: 'active', due_date: null, source: 'user', legacy_current_value: null, legacy_frequency: null, sort_order: 0, created_at: now, updated_at: now, completed_at: null, archived_at: null, assigned_to: clientId, task_schedules: [], task_occurrences: [{ id: 'occurrence-guide', task_id: 'task-guide', schedule_id: null, occurrence_key: 'one-time', scheduled_local_date: '2026-09-22', scheduled_local_time: null, schedule_timezone: 'UTC', scheduled_at: null, status: 'pending', actual_quantity: null, note: null, completed_at: null, skipped_at: null, source: 'user', created_at: now, updated_at: now }] }]);
    if (url.pathname.endsWith('/task_occurrences') || url.pathname.endsWith('/entries') || url.pathname.endsWith('/project_activity_events') || url.pathname.endsWith('/project_comments') || url.pathname.endsWith('/vault_items') || url.pathname.endsWith('/project_goal_events')) return json([]);
    if (url.pathname.endsWith('/vaults')) return json([{ id: 'guide-vault', project_id: guideProject.id, goal_id: null }]);
    return json([]);
  });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (path === `/api/projects/${guideProject.id}/vault`) return json({ vault: { ...vault, id: 'guide-vault', ownerId: clientId, projectId: guideProject.id }, items: [] });
    if (path === '/api/tasks') return json({ data: [] });
    if (path === '/api/momentum') return json({ data: { goals: [] } });
    if (path === '/api/entries/library') return json({ entries: [] });
    if (path.startsWith('/api/circles/')) return json({ ok: true, data: { posts: [], goals: [], invites: [], friends: [] }, error: null });
    return json({ data: [], entries: [], items: [] });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`http://localhost:4182/projects/${guideProject.id}`);
  await expect(page.getByRole('heading', { name: guideProject.title })).toBeVisible();
  await expect(page.getByText('Guide', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/1 assigned Task is overdue\./)).toBeVisible();
  await expect(page.getByText('Private Reflection', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Manage Project ▾', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Goals', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Members', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Details', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Access / Mode', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Status', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '+ Task', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Milestone', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Detach', exact: true })).toHaveCount(0);
});
