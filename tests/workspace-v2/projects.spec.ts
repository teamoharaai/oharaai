import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { visualEvidencePath } from '../helpers/visual-evidence';
import { installPreview, goal } from './fixtures';
import { installScenario } from './project-fixtures';

test.use({ actionTimeout: 15_000 });

const screenshots = visualEvidencePath('docs/ui-checkpoints/projects-v2');
mkdirSync(screenshots, { recursive: true });
const capture = async (page: Page, name: string) => {
  expect(await page.evaluate(() => visualViewport?.scale)).toBe(1);
  await page.screenshot({ path: `${screenshots}/${name}.png`, animations: 'disabled' });
};

async function library(page: Page, theme: 'light' | 'dark' = 'light') {
  await installPreview(page, theme);
  const base = { user_id: goal.user_id, description: null, status: 'active', mode: 'personal', start_date: null, end_date: null, period_key: null, created_at: goal.created_at, updated_at: goal.updated_at };
  const projects = [
    { ...base, id: 'project-1', title: 'Winter Arc', description: 'Build strength and consistency.' },
    { ...base, id: 'project-team', title: 'OHARA Launch', description: 'A thoughtful space for our next chapter.', mode: 'team', user_id: 'another-owner' },
    { ...base, id: 'project-guide', title: 'A steady running practice', description: 'Find a sustainable rhythm with your coach.', mode: 'guide' },
    { ...base, id: 'project-empty', title: 'Ideas for the future', description: 'Collect ideas before choosing an outcome.' },
  ];
  const goals = [goal, { ...goal, id: 'team-goal', project_id: 'project-team', title: 'Make our first release', category: 'Work & Money' }, { ...goal, id: 'guide-goal', project_id: 'project-guide', title: 'Run a comfortable 5K' }];
  let fail = false;
  let invitationFailure = false;
  let invitations: unknown[] = [];
  const writes: unknown[] = [];
  await page.route('**/rest/v1/projects?**', (route) => route.fulfill({ status: fail ? 503 : 200, json: fail ? { message: 'Synthetic Project failure' } : projects }));
  await page.route('**/rest/v1/goals?**', (route) => route.fulfill({ json: goals }));
  await page.route('**/rest/v1/project_members?**', (route) => route.fulfill({ json: projects.flatMap((project) => Array.from({ length: project.mode === 'personal' ? 1 : 2 }, () => ({ project_id: project.id }))) }));
  await page.route('**/rpc/get_my_project_invitations_v11', (route) => route.fulfill({ status: invitationFailure ? 503 : 200, json: invitationFailure ? { message: 'Synthetic invitation failure' } : invitations }));
  await page.route('**/rpc/respond_project_invitation_v11', (route) => { writes.push(route.request().postDataJSON()); invitations = []; return route.fulfill({ json: true }); });
  return { projects, writes, fail: (value: boolean) => { fail = value; }, invitationFailure: (value: boolean) => { invitationFailure = value; }, invite: () => { invitations = [{ id: 'invitation-1', project_id: 'project-team', project_title: 'A new collaboration', inviter_name: 'Maya', role: 'member', createdAt: goal.created_at, expiresAt: '2027-01-01' }]; } };
}

for (const theme of ['light', 'dark'] as const) test(`Projects library ${theme}: grid/list, filtering and screenshots`, async ({ page }) => {
  await library(page, theme);
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto('/projects');
  await expect(page.getByRole('button', { name: 'Open Project Ideas for the future' })).toBeVisible();
  await expect(page.getByLabel('Project list', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  await capture(page, `library-grid-${theme}`);
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(page.getByLabel('Project list', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Project list', { exact: true })).toContainText('0 active Goals');
  if (theme === 'light') await capture(page, 'library-list-light');
  await page.getByLabel('Search Projects').fill('absent');
  await expect(page.getByText('No matching Projects', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('button', { name: 'Project filters', exact: true }).click();
  await page.getByRole('button', { name: 'Shared with me', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Project OHARA Launch', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Project Winter Arc', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'All contexts', exact: true }).click();
  await page.getByRole('button', { name: 'Health & Fitness', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Project OHARA Launch', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Archived', exact: true }).click();
  await expect(page.getByText('No matching Projects', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Project Invitations · 0', exact: true }).click();
  await expect(page.getByText('No pending invitations.', { exact: true })).toBeVisible();
});

test('Project library failures do not become empty states; invitations fail independently and can be accepted', async ({ page }) => {
  const data = await library(page);
  data.fail(true); await page.goto('/projects');
  await expect(page.getByText('Projects could not load.', { exact: true })).toBeVisible();
  await expect(page.getByText('No Projects yet', { exact: true })).toHaveCount(0);
  data.fail(false); data.invitationFailure(true); await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Project Winter Arc' })).toBeVisible();
  await expect(page.getByText('Invitations could not load. Your Projects are still available.')).toBeVisible();
  data.invitationFailure(false); data.invite(); await page.getByRole('button', { name: 'Retry invitations', exact: true }).click();
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect.poll(() => data.writes.length).toBe(1);
  await expect(page.getByRole('button', { name: 'Accept', exact: true })).toHaveCount(0);
});

async function detail(page: Page, theme: 'light' | 'dark' = 'light', viewer: 'owner' | 'admin' | 'member' | 'guide' = 'owner', mode: 'personal' | 'team' | 'guide' = 'team') {
  await page.clock.setFixedTime(new Date('2026-10-08T14:00:00Z'));
  const data = await installScenario(page, { mode, viewer, theme });
  const rows = [data.goal, ...['complete', 'expired', 'archived', 'stagnant'].map((status) => ({ ...data.goal, id: `goal-${status}`, title: `${status} outcome`, status }))];
  await page.route('**/rest/v1/goals?**', (route) => { const url = new URL(route.request().url()); return route.fulfill({ json: url.searchParams.has('id') ? rows.find((row) => `eq.${row.id}` === url.searchParams.get('id')) : rows }); });
  await page.route('**/rpc/get_project_goal_momentum_v11', (route) => route.fulfill({ json: [{ goal_id: data.goal.id, current_value: 72, weekly_change: null, status: 'active' }] }));
  await page.route('**/api/projects/*/vault', (route) => route.fulfill({ json: { vault: { id: 'project-vault' }, items: [{ id: 'source-1', vaultId: 'project-vault', itemType: 'link', title: 'Project reference', contentKind: 'generic', createdBy: data.viewerId, createdAt: goal.created_at, updatedAt: goal.updated_at, visibility: 'project', metadata: { url: 'https://example.test/reference' }, directProjectItem: true, origins: [] }] } }));
  return data;
}

for (const theme of ['light', 'dark'] as const) test(`Project ${theme}: sections, history, Vault and canonical Task completion`, async ({ page }) => {
  const data = await detail(page, theme);
  let chats = 0; page.on('request', (request) => { if (request.url().includes('/project_chat_messages')) chats++; });
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto(`/projects/${data.project.id}`);
  await expect(page.getByRole('heading', { name: data.project.title, exact: true })).toBeVisible();
  await expect(page.getByText('72 / 100', { exact: true })).toBeVisible();
  await expect(page.getByText('→ no change', { exact: true })).toHaveCount(0);
  expect(chats).toBe(0);
  await expect(page.getByLabel('Project Tasks card', { exact: true }).getByRole('button', { name: 'Create a Task or Milestone in a Goal', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Task or Milestone', exact: true })).toHaveCount(0);
  await capture(page, `overview-${theme}`);
  await page.getByRole('button', { name: 'Goals section', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/view=goals/);
  await expect(page.getByRole('button', { name: 'Open Goal Beta Launch', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Historical', exact: true }).click();
  for (const status of ['complete', 'expired', 'archived']) await expect(page.getByRole('button', { name: `Open Goal ${status} outcome`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Goal Beta Launch', exact: true })).toHaveCount(0);
  if (theme === 'light') await capture(page, 'goals');
  await page.getByRole('button', { name: 'Vault section', exact: true }).click();
  await expect(page.getByText('Weekly Reflection', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Project reference', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reflections', exact: true })).toBeVisible();
  if (theme === 'light') await capture(page, 'vault');
  await page.goBack(); await expect(page.getByTestId('project-goals-v2').filter({ visible: true })).toBeVisible();
  await page.goForward(); await expect(page.getByRole('button', { name: 'Open Project reference', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Overview section', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Complete Finalize onboarding', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Finalize onboarding incomplete', exact: true })).toBeVisible();
  expect(data.taskMutationCount()).toBe(1);
  await page.getByRole('button', { name: 'Project conversation', exact: true }).click();
  await expect(page.getByLabel('Project Chat message', { exact: true })).toBeVisible();
  await expect.poll(() => chats).toBeGreaterThan(0);
  await page.getByLabel('Project Chat message', { exact: true }).fill('An unsent thought');
  await page.getByRole('button', { name: 'Project conversation', exact: true }).click();
  await page.getByRole('button', { name: 'Project conversation', exact: true }).click();
  await expect(page.getByLabel('Project Chat message', { exact: true })).toHaveValue('An unsent thought');
  await expect(page.getByRole('button', { name: 'Back to Projects', exact: true })).toHaveCount(0);
  await page.getByRole('banner').getByRole('link', { name: 'Back to Projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Mobile Project library and personal Overview do not overflow', async ({ page }) => {
  await library(page);
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/projects');
  await expect(page.getByRole('button', { name: 'Open Project Winter Arc' })).toBeVisible();
  await capture(page, 'mobile-library');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.unrouteAll({ behavior: 'wait' });
  const data = await detail(page, 'light', 'owner', 'personal');
  await page.goto(`/projects/${data.project.id}`);
  await expect(page.getByRole('heading', { name: data.project.title, exact: true })).toBeVisible();
  await capture(page, 'mobile-overview');
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(page.getByRole('button', { name: 'Members', exact: true })).toHaveCount(0);
});

for (const viewer of ['owner', 'admin', 'member', 'guide'] as const) test(`Project ${viewer}: management and comments preserve role controls`, async ({ page }) => {
  const data = await detail(page, 'light', viewer, viewer === 'guide' ? 'guide' : 'team');
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto(`/projects/${data.project.id}`);
  await page.getByRole('button', { name: 'Members', exact: true }).click();
  if (viewer === 'owner') { await expect(page.getByText('Ownership transfer is deferred', { exact: false })).toBeVisible(); await capture(page, 'team-collaboration'); }
  else await expect(page.getByRole('button', { name: 'Leave Project', exact: true })).toBeVisible();
  if (viewer === 'member' || viewer === 'guide') await expect(page.getByRole('button', { name: 'Invite to Project', exact: true })).toHaveCount(0);
  await page.getByLabel('Close', { exact: true }).click();
  const title = viewer === 'guide' ? 'Long Run' : 'Finalize onboarding';
  await page.getByRole('button', { name: `Show comments for ${title}`, exact: true }).click();
  await expect(page.getByText('Keep this one at conversational pace.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Edit comment by/ })).toHaveCount(viewer === 'admin' ? 2 : 1);
  await page.getByRole('button', { name: 'Goals section', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add Existing Goal', exact: true })).toHaveCount(viewer === 'owner' ? 1 : 0);
  await expect(page.getByRole('button', { name: 'New Goal', exact: true })).toHaveCount(viewer === 'owner' ? 1 : 0);
});

test('Project without Goals remains useful; Vault Entry failure and retry do not imply empty content', async ({ page }) => {
  const data = await detail(page, 'dark', 'owner', 'personal');
  await page.route('**/rest/v1/goals?**', (route) => route.fulfill({ json: [] }));
  let failEntries = true;
  await page.route('**/rest/v1/entries?**', (route) => route.fulfill({ status: failEntries ? 503 : 200, json: failEntries ? { message: 'Synthetic Entries failure' } : [] }));
  await page.goto(`/projects/${data.project.id}?view=vault`);
  await expect(page.getByRole('heading', { name: data.project.title, exact: true })).toBeVisible();
  await expect(page.getByText('Some linked Notes and Reflections could not be loaded. Available content is shown below.', { exact: true })).toBeVisible();
  await expect(page.getByText('Linked Notes will appear here.', { exact: true })).toHaveCount(0);
  failEntries = false; await page.getByRole('button', { name: 'Retry', exact: true }).first().click();
  await expect(page.getByText('Linked Notes will appear here.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Goals section', exact: true }).click();
  await expect(page.getByText('Goals are optional here', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Overview section', exact: true }).click();
  await expect(page.getByRole('button', { name: '+ New Note', exact: true })).toBeVisible();
});

test('Project creation permits no Goals and uses the established create RPC', async ({ page }) => {
  const data = await detail(page, 'light', 'owner', 'personal');
  const writes: any[] = [];
  await page.route('**/rpc/create_project_v11', (route) => {
    const body = route.request().postDataJSON(); writes.push(body); data.project.title = body.p_title;
    return route.fulfill({ json: data.project.id });
  });
  await page.goto('/projects');
  await page.getByRole('button', { name: /New Project/ }).first().click();
  await page.getByLabel('Project name', { exact: true }).fill('A space for future ideas');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A space for future ideas', exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ p_title: 'A space for future ideas', p_mode: 'personal', p_goal_ids: [], p_allow_reassignment: false });
});

test('Owner Goal reassignment requires confirmation and detach retains the canonical Goal', async ({ page }) => {
  const data = await detail(page);
  const candidate = { ...data.goal, id: 'candidate-goal', title: 'A meaningful outcome', project_id: 'another-project' as string | null };
  const writes: Array<{ path: string; body: any }> = [];
  await page.route('**/rest/v1/goals?**', (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({ json: url.searchParams.has('user_id') ? [candidate] : [data.goal, ...(candidate.project_id === data.project.id ? [candidate] : [])] });
  });
  for (const operation of ['assign_goals_to_project_v1', 'detach_goal_from_project_v1']) await page.route(`**/rpc/${operation}`, (route) => {
    writes.push({ path: operation, body: route.request().postDataJSON() });
    candidate.project_id = operation === 'assign_goals_to_project_v1' ? data.project.id : null;
    return route.fulfill({ json: true });
  });
  await page.goto(`/projects/${data.project.id}?view=goals`);
  await page.getByRole('button', { name: 'Add Existing Goal', exact: true }).click();
  await page.getByRole('checkbox', { name: /A meaningful outcome/ }).click();
  await page.getByRole('button', { name: 'Add selected Goals', exact: true }).click();
  await expect(page.getByText('Selected Goals already belong to another Project.', { exact: false })).toBeVisible();
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Confirm reassignment', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Goal A meaningful outcome', exact: true })).toBeVisible();
  expect(writes[0].body).toMatchObject({ p_project_id: data.project.id, p_goal_ids: [candidate.id], p_allow_reassignment: true });
  await page.getByRole('button', { name: 'Manage Goals', exact: true }).click();
  await page.getByRole('button', { name: 'Remove A meaningful outcome from Project', exact: true }).click();
  await expect(page.getByText('Remove Goal?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove Goal', exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1].path).toBe('detach_goal_from_project_v1');
  expect(candidate.id).toBe('candidate-goal');
  expect(candidate.project_id).toBeNull();
});

test('Project conversation send/edit/delete and member leave use existing authorized RPCs', async ({ page }) => {
  const data = await detail(page, 'light', 'member');
  let messages: any[] = [];
  const writes: string[] = [];
  await page.route('**/rest/v1/project_chat_messages?**', (route) => route.fulfill({ json: messages }));
  for (const operation of ['create_project_chat_message_v11', 'edit_project_chat_message_v11', 'delete_project_chat_message_v11', 'leave_project_v11']) await page.route(`**/rpc/${operation}`, (route) => {
    writes.push(operation); const body = route.request().postDataJSON();
    if (operation.startsWith('create_')) messages = [{ id: 'chat-1', author_id: data.viewerId, project_id: data.project.id, body: body.p_body, created_at: goal.created_at, edited_at: null }];
    if (operation.startsWith('edit_')) messages[0].body = body.p_body;
    if (operation.startsWith('delete_')) messages = [];
    return route.fulfill({ json: true });
  });
  await page.goto(`/projects/${data.project.id}`);
  await page.getByRole('button', { name: 'Project conversation', exact: true }).click();
  await page.getByLabel('Project Chat message', { exact: true }).fill('A useful update');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('A useful update', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit chat message', exact: true }).click();
  await page.getByLabel('Edit Project Chat message', { exact: true }).fill('A clearer update');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('A clearer update', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete chat message', exact: true }).click();
  await page.getByRole('button', { name: 'Delete message', exact: true }).click();
  await expect(page.getByText('A clearer update', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Members', exact: true }).click();
  await page.getByRole('button', { name: 'Leave Project', exact: true }).click();
  await page.getByRole('button', { name: 'Leave Project', exact: true }).last().click();
  await expect(page).toHaveURL(/\/projects$/);
  expect(writes).toEqual(['create_project_chat_message_v11', 'edit_project_chat_message_v11', 'delete_project_chat_message_v11', 'leave_project_v11']);
});

test('Project dark loading is themed; denied detail never fetches Entry content and can retry', async ({ page }) => {
  const data = await detail(page, 'dark');
  let release = () => {};
  const ready = new Promise<void>((resolve) => { release = resolve; });
  let denied = true;
  let entries = 0;
  page.on('request', (request) => { if (new URL(request.url()).pathname === '/rest/v1/entries') entries++; });
  await page.route('**/rest/v1/projects?**', async (route) => {
    await ready;
    return route.fulfill({ status: denied ? 403 : 200, json: denied ? { message: 'Synthetic access denied' } : data.project });
  });
  await page.goto(`/projects/${data.project.id}`);
  await expect(page.getByText('Loading Project…', { exact: true })).toBeVisible();
  await expect(page.getByText('Loading Project…', { exact: true }).locator('..')).toHaveCSS('background-color', 'rgb(25, 29, 27)');
  release();
  await expect(page.getByText('Project could not load.', { exact: true })).toBeVisible();
  expect(entries).toBe(0);
  denied = false;
  await page.getByRole('button', { name: 'Retry Project', exact: true }).click();
  await expect(page.getByRole('heading', { name: data.project.title, exact: true })).toBeVisible();
});

test('Project Source failure remains explicit until a successful retry', async ({ page }) => {
  const data = await detail(page);
  let failing = true;
  await page.route('**/api/projects/*/vault', (route) => route.fulfill({ status: failing ? 503 : 200, json: failing ? { error: 'Synthetic Source outage' } : { vault: { id: 'project-vault' }, items: [] } }));
  await page.goto(`/projects/${data.project.id}?view=vault&vaultFilter=sources`);
  await expect(page.getByText("Sources couldn't load.", { exact: true })).toBeVisible();
  failing = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).first().click();
  await expect(page.getByText("Sources couldn't load.", { exact: true })).toHaveCount(0);
});
