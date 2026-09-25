import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const screenshots = process.env.PROJECT_UI_ACCEPTANCE_DIR ?? '/private/tmp/ohara-projects-v11-ui-acceptance';
const steeringScreenshots = process.env.PROJECT_STEERING_ACCEPTANCE_DIR ?? '/private/tmp/ohara-projects-v11-workspace-steering';
mkdirSync(screenshots, { recursive: true });
mkdirSync(steeringScreenshots, { recursive: true });

const now = '2026-09-23T12:00:00Z';
const ids = {
  owner: '11111111-1111-4111-8111-111111111111',
  admin: '22222222-2222-4222-8222-222222222222',
  member: '33333333-3333-4333-8333-333333333333',
  guide: '44444444-4444-4444-8444-444444444444',
  friend: '55555555-5555-4555-8555-555555555555',
};

type Scenario = {
  mode: 'personal' | 'team' | 'guide';
  viewer: 'owner' | 'admin' | 'member' | 'guide';
  full?: boolean;
  reflectionText?: string | null;
  theme?: 'light' | 'dark';
};

const people = {
  owner: { userId: ids.owner, role: 'owner', relationshipLabel: null, displayName: 'Arthur Silva', username: 'arthur', avatarUrl: null, joinedAt: now },
  admin: { userId: ids.admin, role: 'admin', relationshipLabel: null, displayName: 'Justin', username: 'justin', avatarUrl: null, joinedAt: now },
  member: { userId: ids.member, role: 'member', relationshipLabel: null, displayName: 'Maya', username: 'maya', avatarUrl: null, joinedAt: now },
  guide: { userId: ids.guide, role: 'guide', relationshipLabel: 'Fitness Coach', displayName: 'Justin', username: 'justin', avatarUrl: null, joinedAt: now },
} as const;

function shot(page: Page, name: string) {
  return page.screenshot({ path: `${screenshots}/${name}.png`, fullPage: true });
}

function steeringShot(target: Page | Locator, name: string, fullPage = false) {
  return target.screenshot({ path: `${steeringScreenshots}/${name}.png`, ...(fullPage ? { fullPage: true } : {}) });
}

async function setCommentInput(page: Page, value: string) {
  await page.getByLabel('Edit comment').evaluate((element, nextValue) => {
    const textarea = element as HTMLTextAreaElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(textarea, nextValue);
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true, data: nextValue, inputType: 'insertText' }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function installScenario(page: Page, scenario: Scenario) {
  const viewerId = ids[scenario.viewer];
  const user = { id: viewerId, email: `${scenario.viewer}@example.test`, role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const projectId = `project-${scenario.mode}-${scenario.viewer}-${scenario.full === false ? 'open' : 'full'}`;
  const project = { id: projectId, user_id: ids.owner, title: scenario.mode === 'guide' ? '5K Training' : scenario.mode === 'team' ? 'Launch OHARA' : 'Reading Practice', description: scenario.mode === 'guide' ? 'Build a confident training rhythm together.' : 'A calm place for meaningful progress.', status: 'active', mode: scenario.mode, start_date: null, end_date: null, period_key: null, created_at: now, updated_at: now };
  const members = scenario.mode === 'personal' ? [people.owner] : scenario.mode === 'guide' ? [people.owner, people.guide] : scenario.full === false ? [people.owner, people.admin] : [people.owner, people.admin, people.member];
  const capabilitiesByRole = {
    owner: ['view_project','manage_project','manage_members','invite_members','create_goal','assign_goal_lead','create_task','assign_task','complete_task','create_milestone','assign_milestone','view_shared_vault','add_shared_content','comment','view_shared_notes','view_shared_reflections'],
    admin: ['view_project','manage_project','manage_members','invite_members','assign_goal_lead','create_task','assign_task','complete_task','create_milestone','assign_milestone','view_shared_vault','add_shared_content','comment','view_shared_notes','view_shared_reflections'],
    member: ['view_project','complete_task','view_shared_vault','add_shared_content','comment','view_shared_notes','view_shared_reflections'],
    guide: ['view_project','create_task','assign_task','complete_task','create_milestone','assign_milestone','view_shared_vault','add_shared_content','comment','view_shared_notes','view_shared_reflections'],
  } as const;
  const goalId = `goal-${scenario.mode}`;
  const goal = { id: goalId, user_id: ids.owner, title: scenario.mode === 'guide' ? 'Run a Sub-25 5K' : scenario.mode === 'team' ? 'Beta Launch' : 'Read 12 Books', description: 'Build consistent progress.', category: scenario.mode === 'guide' ? 'Health & Fitness' : 'Learning & Creativity', status: 'active', color_theme: 'ocean', smart_data: {}, target_frequency: null, visibility: 'private', progress: 30, deadline: '2026-12-01T12:00:00Z', completed_at: null, archived_at: null, expired_at: null, ai_generated: false, project_id: projectId, project_lead_id: ids.owner, previous_goal_id: null, prior_phase_summary: null, reflection: null, reflected_at: null, created_at: now, updated_at: now, milestones: [{ id: 'milestone-1', goal_id: goalId, user_id: ids.owner, title: 'First complete rehearsal', description: null, due_date: '2026-10-14', completed_at: null, sort_order: 0, is_ai_suggested: false, kind: 'achievement', parent_id: null, target_count: null, photo_url: null, responsible_user_id: ids.owner, created_at: now, updated_at: now }] };
  const task = { id: 'task-1', user_id: ids.owner, goal_id: goalId, milestone_id: null, title: scenario.mode === 'guide' ? 'Long Run' : 'Finalize onboarding', description: null, completion_mode: 'binary', target_quantity: null, quantity_unit: null, status: 'active', due_date: null, source: 'user', legacy_current_value: null, legacy_frequency: null, sort_order: 0, created_at: now, updated_at: now, completed_at: null, archived_at: null, assigned_to: scenario.mode === 'team' ? ids.member : ids.owner, task_schedules: [], task_occurrences: [{ id: 'occurrence-1', task_id: 'task-1', schedule_id: null, occurrence_key: 'one-time', scheduled_local_date: '2026-09-22', scheduled_local_time: null, schedule_timezone: 'UTC', scheduled_at: null, status: 'pending', actual_quantity: null, note: null, completed_at: null, skipped_at: null, source: 'user', created_at: now, updated_at: now }] };
  let ownComment = { id: 'comment-own', author_id: viewerId, target_type: 'goal', target_id: goalId, body: 'Keep this one at conversational pace.', created_at: now, edited_at: null as string | null, deleted_at: null as string | null };
  const otherComment = { id: 'comment-other', author_id: scenario.mode === 'guide' ? ids.owner : ids.admin, target_type: 'goal', target_id: goalId, body: 'The next checkpoint looks clear.', created_at: '2026-09-23T11:00:00Z', edited_at: null, deleted_at: null };
  const sharedReflection = { id: 'entry-shared', userId: ids.owner, entryType: 'reflection', title: 'Weekly Reflection', content: { type: 'doc', content: [] }, plainText: scenario.reflectionText === undefined ? 'Training felt more consistent this week, especially during the longer sessions.' : scenario.reflectionText ?? '', brtCategory: null, reflectionType: 'weekly', conversationTurns: [], takeaway: null, pinned: false, archived: false, contentVersion: 1, schemaVersion: 2, completedAt: null, createdAt: now, updatedAt: now, projectShareScope: scenario.mode === 'guide' ? 'guide' : 'project', goals: [{ id: goalId, title: goal.title, category: goal.category, status: goal.status, projectId }], project: { id: projectId, title: project.title }, categoryIds: [], milestones: [] };

  const session = { access_token: 'preview-token', refresh_token: 'preview-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user };
  await page.addInitScript(({ session: value, theme }) => {
    localStorage.setItem('sb-projects-preview-auth-token', JSON.stringify(value));
    localStorage.setItem('ohara-ui-state', JSON.stringify({ state: { themeMode: theme }, version: 0 }));
    for (const patch of ['goals-v2-3-1', 'vault-v2-3', 'projects-v1-0']) localStorage.setItem(`ohara:release:${patch}:seen`, 'seen');
  }, { session, theme: scenario.theme ?? 'dark' });

  await page.route('https://projects-preview.invalid/**', async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.includes('/auth/v1/user')) return json(user);
    if (url.pathname.endsWith('/rpc/reconcile_goal_expiration_v1')) return json(null);
    if (url.pathname.endsWith('/rpc/get_my_project_invitations_v11')) return json([]);
    if (url.pathname.endsWith('/rpc/get_project_collaboration_v11')) return json({ role: scenario.viewer, capabilities: capabilitiesByRole[scenario.viewer], members, invitations: [] });
    if (url.pathname.endsWith('/rpc/get_project_goal_momentum_v11')) return json([{ goal_id: goalId, current_value: scenario.mode === 'guide' ? 68 : 72, weekly_change: scenario.mode === 'guide' ? 6 : 4, status: 'active' }]);
    if (url.pathname.endsWith('/rpc/edit_project_comment_v11')) { const body = route.request().postDataJSON() as { p_body: string }; ownComment = { ...ownComment, body: body.p_body.trim(), edited_at: '2026-09-23T13:00:00Z' }; return json(true); }
    if (url.pathname.endsWith('/rpc/delete_project_comment_v11')) { ownComment = { ...ownComment, deleted_at: '2026-09-23T13:00:00Z' }; return json(true); }
    if (url.pathname.endsWith('/projects')) return json(project);
    if (url.pathname.endsWith('/project_members')) return json([{ project_id: projectId }]);
    if (url.pathname.endsWith('/goals')) return json([goal]);
    if (url.pathname.endsWith('/tasks')) return json([task]);
    if (url.pathname.endsWith('/task_occurrences')) return json([]);
    if (url.pathname.endsWith('/entries')) return json([]);
    if (url.pathname.endsWith('/project_activity_events')) return json([{ id: 'activity-1', actor_id: ids.admin, event_type: 'task.assigned', target_type: 'task', target_id: task.id, label: 'Assigned a Task to Maya', metadata: { title: task.title }, occurred_at: now }]);
    if (url.pathname.endsWith('/project_comments')) return json([ownComment, otherComment].filter((comment) => !comment.deleted_at));
    if (url.pathname.endsWith('/vaults')) return json([{ id: 'project-vault', project_id: projectId, goal_id: null }]);
    if (url.pathname.endsWith('/vault_items') || url.pathname.endsWith('/project_goal_events')) return json([]);
    return json([]);
  });

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const ok = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, data, error: null }) });
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (path === `/api/projects/${projectId}/vault`) return json({ vault: { id: 'project-vault', ownerId: ids.owner, goalId: null, projectId, spaceId: null, vaultType: 'personal', createdAt: now, updatedAt: now }, items: [] });
    if (path === '/api/tasks') return json({ data: [] });
    if (path === '/api/momentum') return json({ data: { goals: [{ goalId, displayedValue: scenario.mode === 'guide' ? 68 : 72, weeklyChange: scenario.mode === 'guide' ? 6 : 4, status: 'active' }] } });
    if (path === '/api/entries/library') return json({ entries: [sharedReflection] });
    if (path === '/api/friends') return ok({ friends: [{ id: ids.friend, username: 'jordan', display_name: 'Jordan', avatar_url: null }] });
    if (path.startsWith('/api/circles/')) return ok({ posts: [], goals: [], invites: [], friends: [] });
    return json({ data: [], entries: [], items: [] });
  });
  return { goal, project, viewerId };
}

async function openProject(page: Page, scenario: Scenario) {
  const data = await installScenario(page, scenario);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`http://localhost:4182/projects/${data.project.id}`);
  await expect(page.getByRole('heading', { name: data.project.title })).toBeVisible();
  return data;
}

test('Personal Project stays visually quiet', async ({ page }) => {
  await openProject(page, { mode: 'personal', viewer: 'owner', theme: 'dark' });
  await expect(page.getByText(/TEAM|GUIDE/, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Members', exact: true })).toHaveCount(0);
  await shot(page, '01-personal-project-desktop-dark');
  await steeringShot(page, '04-personal-project-desktop-dark', true);
});

test('Team owner collaboration, assignments, comments, and responsive states', async ({ page }) => {
  await openProject(page, { mode: 'team', viewer: 'owner', full: true });
  await expect(page.getByText('TEAM · 3 MEMBERS', { exact: true })).toBeVisible();
  await shot(page, '02-team-project-owner-three-members');
  await steeringShot(page, '01-team-project-desktop-dark', true);
  await expect(page.getByLabel('1 Task needs attention')).toBeVisible();
  await steeringShot(page.getByLabel('Current Goals card'), '05-current-goals-attention-badge');
  await steeringShot(page.getByLabel('Reflections card'), '06-reflection-with-real-preview');
  await steeringShot(page.getByLabel('OHARA Intelligence card'), '08-intelligence-inline-header');
  await steeringShot(page.getByLabel('OHARA Intelligence card'), '09-intelligence-dark-contrast');
  await steeringShot(page.getByLabel('Upcoming Milestones card'), '11-upcoming-milestones');
  await steeringShot(page.getByLabel('Project Tasks card'), '12-project-tasks-compact-assignees');
  await steeringShot(page.getByLabel('Project Tasks card'), '13-comment-action-separated');
  await steeringShot(page.getByLabel('Project Snapshot card'), '14-project-snapshot-consistent-counts');
  await steeringShot(page, '15-full-three-column-dashboard', true);
  await page.getByRole('button', { name: 'Members', exact: true }).click();
  await expect(page.getByText('3 / 3', { exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  await shot(page, '06-manage-members-team');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Manage Project ▾', exact: true }).click();
  await page.getByRole('tab', { name: 'Goals', exact: true }).click();
  await shot(page, '12-goal-lead-ui');
  await page.getByRole('button', { name: '+ Task', exact: true }).click();
  await expect(page.getByText('Assigned to', { exact: true })).toBeVisible();
  await shot(page, '10-task-assignment-ui');
  await page.getByRole('button', { name: 'Cancel', exact: true }).first().click();
  await page.getByRole('button', { name: '+ Milestone', exact: true }).click();
  await expect(page.getByText('Responsible', { exact: true })).toBeVisible();
  await shot(page, '11-milestone-responsibility-ui');
  await page.getByRole('button', { name: 'Cancel', exact: true }).last().click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(400);

  await expect(page.getByRole('button', { name: 'Edit comment by Arthur Silva' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit comment by Justin' })).toHaveCount(0);
  await shot(page, '13-comment-author-controls');
  await page.getByRole('button', { name: 'Edit comment by Arthur Silva' }).click();
  const editInput = page.getByLabel('Edit comment');
  await expect(editInput).toHaveValue('Keep this one at conversational pace.');
  await setCommentInput(page, '');
  await expect(editInput).toHaveValue('');
  await setCommentInput(page, 'A calmer conversational pace works best.');
  await shot(page, '14-inline-comment-edit');
  await page.getByRole('button', { name: 'Cancel', exact: true }).first().click();
  await expect(page.getByText('Keep this one at conversational pace.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit comment by Arthur Silva' }).click();
  await setCommentInput(page, 'A calmer conversational pace works best.');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('A calmer conversational pace works best.', { exact: true })).toBeVisible();
  await expect(page.getByText(/Edited ·/)).toBeVisible();
  await page.getByRole('button', { name: 'Delete comment by Arthur Silva' }).click();
  await expect(page.getByText('Delete comment?', { exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  await shot(page, '15-delete-comment-confirmation');
  await page.getByRole('button', { name: 'Cancel', exact: true }).last().click();
  await expect(page.getByText('A calmer conversational pace works best.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete comment by Arthur Silva' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('A calmer conversational pace works best.', { exact: true })).toHaveCount(0);

  await shot(page, '16-team-ohara-intelligence');
  await expect(page.getByText('Shared with Project', { exact: true })).toBeVisible();
  await shot(page, '18-shared-reflection-visibility');
  await page.setViewportSize({ width: 390, height: 900 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await shot(page, '20-narrow-collaborative-project');
  await steeringShot(page, '16-narrow-responsive-project', true);
});

test('Team workspace remains readable in light mode', async ({ page }) => {
  await openProject(page, { mode: 'team', viewer: 'owner', full: true, theme: 'light' });
  await expect(page.getByLabel('OHARA Intelligence card')).toBeVisible();
  await steeringShot(page, '02-team-project-desktop-light', true);
  await steeringShot(page.getByLabel('OHARA Intelligence card'), '10-intelligence-light-contrast');
});

test('Reflection without content omits a generic preview', async ({ page }) => {
  await openProject(page, { mode: 'team', viewer: 'owner', full: true, reflectionText: null });
  await expect(page.getByText('Training felt more consistent this week, especially during the longer sessions.', { exact: true })).toHaveCount(0);
  await steeringShot(page.getByLabel('Reflections card'), '07-reflection-without-preview');
});

test('Team invitation stays role-based and lightweight', async ({ page }) => {
  await openProject(page, { mode: 'team', viewer: 'owner', full: false });
  await page.getByRole('button', { name: 'Members', exact: true }).click();
  await expect(page.getByText('Invite to Project', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Member', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Admin', exact: true })).toBeVisible();
  await shot(page, '08-invite-team-member');
});

test('Team Member and Admin views follow capabilities', async ({ page }) => {
  await openProject(page, { mode: 'team', viewer: 'member', full: true });
  await expect(page.getByRole('button', { name: 'Members', exact: true })).toBeVisible();
  await expect(page.getByText('TEAM · 3 MEMBERS', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Manage Project ▾', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Details', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Access / Mode', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Detach', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await shot(page, '03-team-project-member-view');

  await page.reload();
});

test('Admin view exposes collaboration management but not owner-only controls', async ({ page }) => {
  await openProject(page, { mode: 'team', viewer: 'admin', full: true });
  await page.getByRole('button', { name: 'Manage Project ▾', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Details', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Members', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Access / Mode', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Status', exact: true })).toHaveCount(0);
});

test('Guide owner view communicates Client and Guide relationship', async ({ page }) => {
  await openProject(page, { mode: 'guide', viewer: 'owner' });
  await expect(page.getByText('GUIDE · 2 PEOPLE', { exact: true })).toBeVisible();
  await expect(page.getByText(/Arthur Silva · Client/)).toBeVisible();
  await shot(page, '04-guide-project-client-owner-view');
  await page.getByRole('button', { name: 'Members', exact: true }).click();
  await expect(page.getByText('Client · Owner', { exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  await shot(page, '07-manage-members-guide');
  await expect(page.getByText('Invite Guide', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fitness Coach', exact: true })).toBeVisible();
  await shot(page, '09-invite-guide');
});

test('Guide sees permitted collaboration and no private content or owner controls', async ({ page }) => {
  await openProject(page, { mode: 'guide', viewer: 'guide' });
  await expect(page.getByText('GUIDE · 2 PEOPLE', { exact: true })).toBeVisible();
  await expect(page.getByText('Weekly Reflection', { exact: true })).toBeVisible();
  await expect(page.getByText('Private Reflection', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Private Sticky Note', { exact: true })).toHaveCount(0);
  await shot(page, '05-guide-project-guide-view');
  await steeringShot(page, '03-guide-project-desktop-dark', true);
  await shot(page, '19-private-reflection-denial-guide-view');
  await page.getByRole('button', { name: 'Manage Project ▾', exact: true }).click();
  await expect(page.getByRole('button', { name: '+ Task', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Milestone', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Details', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Status', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await shot(page, '17-guide-ohara-intelligence');
});
