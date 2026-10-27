import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { visualEvidencePath } from '../helpers/visual-evidence';
import { installPreview, goal } from './fixtures';

const screenshots = visualEvidencePath('docs/ui-checkpoints/goals-v2');
mkdirSync(screenshots, { recursive: true });

async function setup(page: Page, theme: 'light' | 'dark' = 'light') {
  await installPreview(page, theme);
  const current = structuredClone(goal);
  const rows = [current, ...['stagnant', 'complete', 'expired', 'archived', 'draft', 'discovered'].map((status) => ({ ...structuredClone(goal), id: `goal-${status}`, title: `${status} outcome`, status, ...(status === 'expired' ? { deadline: '2026-10-01T00:00:00.000Z' } : {}) }))];
  let failGoals = false;
  let failEntries = false;
  const mutations: Array<{ path: string; body: any }> = [];
  const occurrence = { id: 'occurrence-v2', taskId: 'task-v2', scheduleId: null, occurrenceKey: 'once', scheduledLocalDate: '2026-10-08', scheduledLocalTime: '09:00', scheduleTimezone: 'America/New_York', scheduledAt: '2026-10-08T13:00:00Z', status: 'pending', actualQuantity: null, note: null, completedAt: null, skippedAt: null, source: 'user', createdAt: goal.created_at, updatedAt: goal.updated_at };
  const task = { id: 'task-v2', goalId: goal.id, milestoneId: null, title: 'Plan the next training session', description: null, completionMode: 'binary', targetQuantity: null, quantityUnit: null, status: 'active', dueDate: '2026-10-08', source: 'user', legacyCurrentValue: null, legacyFrequency: null, sortOrder: 0, createdAt: goal.created_at, updatedAt: goal.updated_at, completedAt: null, archivedAt: null, schedules: [], occurrences: [occurrence] };
  await page.route('**/rest/v1/goals?**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (failGoals) return json({ message: 'Synthetic Goal failure' }, 503);
    if (url.searchParams.has('previous_goal_id')) return json([]);
    const id = url.searchParams.get('id')?.replace('eq.', '');
    if (request.method() === 'PATCH') {
      const patch = request.postDataJSON(); mutations.push({ path: url.pathname, body: patch });
      const row = rows.find((item) => item.id === id)!; Object.assign(row, patch);
      return json(row);
    }
    if (id) return json(url.searchParams.has('limit') ? rows.filter((row) => row.id === id) : rows.find((row) => row.id === id) ?? null);
    return json(rows);
  });
  await page.route('**/api/tasks?**', (route) => route.fulfill({ json: { data: [task] } }));
  await page.route('**/rest/v1/milestones?**', async (route) => {
    const body = route.request().postDataJSON();
    mutations.push({ path: '/rest/v1/milestones', body });
    Object.assign(current.milestones[0], body);
    await route.fulfill({ json: current.milestones[0] });
  });
  await page.route('**/api/task-occurrences/occurrence-v2', async (route) => {
    const body = route.request().postDataJSON(); mutations.push({ path: '/api/task-occurrences/occurrence-v2', body });
    Object.assign(occurrence, body); await route.fulfill({ json: { data: occurrence } });
  });
  await page.route('**/api/entries/library*', (route) => route.fulfill({ status: failEntries ? 503 : 200, json: failEntries ? { error: 'Synthetic Entry failure' } : { entries: ['note', 'reflection'].map((entryType) => ({ id: `${entryType}-1`, entryType, title: entryType === 'note' ? 'Training notes' : 'What consistency taught me', createdAt: goal.created_at, updatedAt: goal.updated_at, completedAt: null, goals: [{ id: goal.id, title: goal.title }], project: null })) } }));
  await page.route('**/rest/v1/entry_goal_links?**', (route) => route.fulfill({ json: ['note', 'reflection'].map((kind) => ({ entry_id: `${kind}-1`, goal_id: goal.id })) }));
  await page.route('**/rest/v1/entries?**', (route) => route.fulfill({ status: failEntries ? 503 : 200, json: failEntries ? { message: 'Synthetic Entry failure' } : ['note', 'reflection'].map((entry_type) => ({ id: `${entry_type}-1`, entry_type, user_id: goal.user_id, title: entry_type === 'note' ? 'Training notes' : 'What consistency taught me', created_at: goal.created_at, updated_at: goal.updated_at, archived: false, project_id: null })) }));
  await page.route('**/api/vaults/goal-1', (route) => route.fulfill({ json: { vault: { id: 'vault-1' }, items: [{ id: 'source-1', vaultId: 'vault-1', itemType: 'link', title: 'Training reference', contentKind: 'generic', createdBy: goal.user_id, createdAt: goal.created_at, updatedAt: goal.updated_at, visibility: 'private', metadata: { url: 'https://example.test/training' } }] } }));
  return { mutations, failGoals: (value: boolean) => { failGoals = value; }, failEntries: (value: boolean) => { failEntries = value; } };
}

for (const theme of ['light', 'dark'] as const) test(`Goals ${theme}: library, detail, sections and screenshots at 100%`, async ({ page }) => {
  await setup(page, theme);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  let entryReads = 0; page.on('request', (request) => { if (request.url().includes('/rest/v1/entries?')) entryReads++; });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/goals');
  await expect(page.getByTestId('goals-library-v2')).toBeVisible();
  await expect(page.getByRole('link', { name: `Open Goal ${goal.title}` })).toBeVisible();
  await expect(page.getByRole('link', { name: `Open Goal ${goal.title}` })).toHaveCSS('padding', '16px');
  await expect(page.getByTestId('goal-detail-v2')).toHaveCount(0);
  expect(entryReads).toBe(0);
  expect(await page.evaluate(() => visualViewport?.scale)).toBe(1);
  await page.screenshot({ path: `${screenshots}/library-${theme}.png`, animations: 'disabled' });
  await page.getByRole('link', { name: `Open Goal ${goal.title}` }).click();
  await expect(page.getByRole('heading', { name: goal.title, exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Goal Progress' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open Vault', exact: true })).toHaveCount(0);
  await expect(page.getByText('68 / 100')).toBeVisible();
  expect(entryReads).toBe(0);
  await page.screenshot({ path: `${screenshots}/overview-${theme}.png`, animations: 'disabled' });
  for (const section of ['Tasks', 'Milestones', 'Vault']) {
    await page.getByRole('button', { name: `${section} section`, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`view=${section.toLowerCase()}`));
    await expect(page.getByTestId('goal-detail-v2').filter({ visible: true })).toBeFocused();
    if (section === 'Tasks') await expect(page.getByRole('button', { name: `Complete ${taskTitle}`, exact: true })).toBeVisible();
    if (section === 'Milestones') await expect(page.getByText('Complete first training block', { exact: true }).filter({ visible: true })).toBeVisible();
    if (section === 'Vault') {
      await expect(page.getByText('Training notes', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reflections', exact: true })).toBeVisible();
      await expect(page.getByText('Training reference', { exact: true })).toBeVisible();
    }
    if (theme === 'light') await page.screenshot({ path: `${screenshots}/${section.toLowerCase()}.png`, animations: 'disabled' });
  }
  expect(entryReads).toBe(1);
  await page.goBack(); await expect(page).toHaveURL(/view=milestones/);
  await expect(page.getByText('Complete first training block', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.goForward(); await expect(page.getByText('Training notes', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
const taskTitle = 'Plan the next training session';

test('Goals responsive detail, canonical Task write and deep links', async ({ page }) => {
  const preview = await setup(page);
  await page.goto('/goals?selected=goal-1&taskId=task-v2&projectId=project-1');
  await expect(page.getByRole('button', { name: 'Tasks section' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: `Complete ${taskTitle}`, exact: true }).click();
  await expect.poll(() => preview.mutations.length).toBeGreaterThan(0);
  expect(preview.mutations[0].path).toBe('/api/task-occurrences/occurrence-v2');
  expect(preview.mutations[0].body.idempotencyKey).toBeTruthy();
  await page.getByRole('button', { name: 'Overview section' }).click();
  for (const width of [320, 390, 768, 1024, 1100, 1280]) {
    await page.setViewportSize({ width, height: 1100 });
    await expect(async () => expect(await page.locator('.ws-content').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)).toPass();
    if (width < 600) expect((await page.getByRole('heading', { name: goal.title, exact: true }).boundingBox())!.width).toBeGreaterThan(200);
    if (width === 390) await page.screenshot({ path: `${screenshots}/overview-mobile.png`, animations: 'disabled' });
  }
});

test('malformed optional activity resolves to an error without blocking the Goal', async ({ page }) => {
  await setup(page);
  await page.route('**/api/goals/activity?**', (route) => route.fulfill({ contentType: 'application/json', body: '{invalid' }));
  await page.goto('/goals?goal=goal-1');
  await expect(page.getByRole('heading', { name: goal.title, exact: true })).toBeVisible();
  await expect(page.getByText('Timeline could not be loaded right now.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tasks section' }).click();
  await expect(page.getByRole('button', { name: 'Complete Plan the next training session', exact: true })).toBeVisible();
});

test('Goals lifecycle filters, creation entry point, failures and retries', async ({ page }) => {
  const preview = await setup(page);
  preview.failGoals(true);
  await page.goto('/goals');
  await expect(page.getByText('Goals couldn’t load', { exact: true })).toBeVisible();
  await expect(page.getByText('No Goals created yet', { exact: true })).toHaveCount(0);
  preview.failGoals(false); await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('link', { name: `Open Goal ${goal.title}` })).toBeVisible();
  await page.getByRole('button', { name: 'Historical', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open Goal archived outcome' })).toBeVisible();
  await expect(page.getByRole('link', { name: `Open Goal ${goal.title}` })).toHaveCount(0);
  await page.getByRole('link', { name: 'Open Goal archived outcome' }).click();
  await page.getByRole('button', { name: 'Tasks section' }).click();
  await expect(page.getByText('This Goal is historical. Its Tasks remain available as read-only context.').filter({ visible: true })).toBeVisible();
  await page.goto('/goals?goal=goal-expired');
  await expect(page.getByRole('heading', { name: 'expired outcome' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Extend Goal', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begin new phase', exact: true })).toBeVisible();
  await page.goto('/goals?goal=goal-1&view=vault'); preview.failEntries(true);
  await page.reload();
  await expect(page.getByText('Linked Notes and Reflections could not load.', { exact: true })).toBeVisible();
  preview.failEntries(false); await page.getByRole('button', { name: 'Retry linked content' }).click();
  await expect(page.getByText('Training notes', { exact: true })).toBeVisible();
  await page.goto('/goals');
  await page.getByRole('textbox', { name: 'Search Goals' }).fill('nothing matches');
  await expect(page.getByText('No matching Goals', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Goal', exact: true }).click();
  await expect(page).toHaveURL(/goals\/create/);
});

test('Goals preserve Milestone completion, Resume and unavailable direct links', async ({ page }) => {
  const preview = await setup(page);
  await page.goto('/goals?goal=goal-1&view=milestones');
  await page.getByRole('button', { name: 'Mark Complete first training block reached', exact: true }).click();
  await expect.poll(() => preview.mutations.some((item) => item.path === '/rest/v1/milestones' && item.body.completed_at)).toBeTruthy();
  await expect(page.getByText('1 of 1 reached', { exact: true })).toBeVisible();
  await page.goto('/goals?goal=goal-stagnant');
  await page.getByRole('button', { name: 'Manage Goal ▾', exact: true }).click();
  await page.getByRole('tab', { name: 'Status & Access', exact: true }).click();
  await page.getByRole('button', { name: 'Resume Goal', exact: true }).click();
  await expect.poll(() => preview.mutations.some((item) => item.path === '/rest/v1/goals' && item.body.status === 'active')).toBe(true);
  await page.goto('/goals?goal=not-accessible');
  await expect(page.getByText('This Goal is unavailable, or you no longer have access. Your other Goals are still available.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('goal-detail-v2')).toHaveCount(0);
});

test('Goals fresh dark loading, genuine empty library and Project navigation', async ({ page }) => {
  await setup(page, 'dark');
  let release = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/rest/v1/goals?**', async (route) => {
    await pending;
    await route.fulfill({ json: [] });
  });
  await page.goto('/goals');
  await expect(page.getByText('Loading your Goals…', { exact: true })).toBeVisible();
  await expect(page.getByText('No Goals created yet', { exact: true })).toHaveCount(0);
  await expect(page.locator('.workspace-v2')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByText('Loading your Goals…', { exact: true })).toHaveCSS('color', 'rgb(177, 186, 179)');
  release();
  await expect(page.getByText('No Goals created yet', { exact: true })).toBeVisible();
  await page.unroute('**/rest/v1/goals?**');
  await setup(page, 'dark');
  await page.goto('/goals?goal=goal-1');
  await page.getByRole('link', { name: 'Open Project Winter Arc', exact: true }).click();
  await expect(page).toHaveURL(/projects\/project-1$/);
});
