import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshots = resolve(process.cwd(), 'docs/ui-checkpoints/projects-notes-polish');
mkdirSync(screenshots, { recursive: true });

const viewerId = '11111111-1111-4111-8111-111111111111';
const now = '2026-10-06T14:00:00.000Z';
const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ aud: 'authenticated', exp: 1893456000, role: 'authenticated', sub: viewerId })).toString('base64url')}.preview`;
const user = { id: viewerId, email: 'projects@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: now };

const projects = [
  { id: 'project-health', user_id: viewerId, title: 'Health Improvement', description: 'Build durable strength and running consistency.', status: 'active', mode: 'personal', start_date: null, end_date: null, period_key: null, created_at: now, updated_at: now },
  { id: 'project-work', user_id: viewerId, title: 'OHARA Launch', description: 'Coordinate the product launch.', status: 'active', mode: 'team', start_date: null, end_date: null, period_key: null, created_at: now, updated_at: '2026-10-05T14:00:00.000Z' },
  { id: 'project-learning', user_id: viewerId, title: 'Reading Practice', description: 'Read and retain more intentionally.', status: 'active', mode: 'personal', start_date: null, end_date: null, period_key: null, created_at: now, updated_at: '2026-10-04T14:00:00.000Z' },
  { id: 'project-life', user_id: viewerId, title: 'Family Archive', description: 'Preserve stories and photographs.', status: 'complete', mode: 'personal', start_date: null, end_date: null, period_key: null, created_at: now, updated_at: '2026-10-03T14:00:00.000Z' },
];

const goals = [
  { id: 'goal-health', title: 'Run a Faster 10K', category: 'Health & Fitness', status: 'active', project_id: 'project-health', updated_at: now },
  { id: 'goal-work', title: 'Ship the Public Beta', category: 'Work & Money', status: 'active', project_id: 'project-work', updated_at: '2026-10-05T14:00:00.000Z' },
  { id: 'goal-learning', title: 'Read 12 Books', category: 'Learning & Creativity', status: 'active', project_id: 'project-learning', updated_at: '2026-10-04T14:00:00.000Z' },
  { id: 'goal-life', title: 'Digitize Family Photos', category: 'Life & Relationships', status: 'complete', project_id: 'project-life', updated_at: '2026-10-03T14:00:00.000Z' },
];

async function installPreview(page: Page) {
  const session = { access_token: token, refresh_token: 'preview-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user };
  await page.addInitScript((value) => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) return JSON.stringify(value);
      return originalGetItem.call(this, key);
    };
    localStorage.setItem('sb-project-list-preview-auth-token', JSON.stringify(value));
    localStorage.setItem('ohara-ui-state', JSON.stringify({ state: { themeMode: 'light' }, version: 5 }));
    for (const patch of ['journal-prelaunch-redesign', 'notes-prelaunch-library', 'projects-v1-1-execution']) localStorage.setItem(`ohara:release:${patch}:seen`, 'seen');
  }, session);
  await page.route(/https?:\/\/[^/]+\/(?:auth|rest)\/v1\/.*/, async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.includes('/auth/v1/user')) return json(user);
    if (url.pathname.endsWith('/rpc/get_my_project_invitations_v11')) return json([]);
    if (url.pathname.endsWith('/projects')) return json(projects);
    if (url.pathname.endsWith('/goals')) return json(goals);
    if (url.pathname.endsWith('/project_members')) return json(projects.flatMap((project) => [{ project_id: project.id }, ...(project.mode === 'team' ? [{ project_id: project.id }] : [])]));
    if (url.pathname.endsWith('/vaults')) return json(projects.map((project, index) => ({ id: `vault-${index}`, goal_id: null, project_id: project.id })));
    if (url.pathname.endsWith('/vault_items')) return json([
      { id: 'item-1', vault_id: 'vault-0', updated_at: now },
      { id: 'item-2', vault_id: 'vault-0', updated_at: now },
      { id: 'item-3', vault_id: 'vault-1', updated_at: '2026-10-05T14:00:00.000Z' },
    ]);
    return json([]);
  });
  await page.route('**/api/**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [], entries: [], items: [] }) }));
}

test('Projects toggles between color-coded Grid and compact List views', async ({ page }) => {
  await installPreview(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grid view, selected', exact: true })).toBeVisible();
  await expect(page.getByLabel(/Project grid$/)).toBeVisible();
  await page.screenshot({ path: `${screenshots}/projects-grid-light.png`, fullPage: true });

  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(page.getByRole('button', { name: 'List view, selected', exact: true })).toBeVisible();
  await expect(page.getByLabel('Project list', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Open Project Health Improvement', { exact: true })).toBeVisible();
  await expect(page.getByText('1 ACTIVE GOAL', { exact: true })).toHaveCount(3);
  await expect(page.getByText('0 ACTIVE GOALS', { exact: true })).toBeVisible();
  await expect(page.getByText('Build durable strength and running consistency.', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: `${screenshots}/projects-list-light.png`, fullPage: true });
});

test('Project list remains scan-friendly on mobile', async ({ page }) => {
  await installPreview(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(page.getByLabel('Project list', { exact: true })).toBeVisible();
  await expect(page.getByText('1 ACTIVE GOAL', { exact: true }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: `${screenshots}/projects-list-mobile.png`, fullPage: true });
});
