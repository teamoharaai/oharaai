import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshots = resolve(process.cwd(), 'docs/ui-checkpoints/journal-prelaunch');
mkdirSync(screenshots, { recursive: true });

const viewerId = '11111111-1111-4111-8111-111111111111';
const now = '2026-10-05T14:00:00.000Z';
const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ aud: 'authenticated', exp: 1893456000, role: 'authenticated', sub: viewerId })).toString('base64url')}.preview`;
const user = { id: viewerId, email: 'journal@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: now };
const winter = { id: 'project-winter', title: 'Winter Arc', status: 'active' };
const health = { id: 'project-health', title: 'Health Improvement', status: 'active' };
const mobility = { id: 'goal-mobility', title: 'Ego Lifting & Mobility', category: 'Health & Fitness', status: 'active', projectId: winter.id };
const running = { id: 'goal-running', title: 'Run my first 10K', category: 'Health & Fitness', status: 'active', projectId: health.id };
const archived = { id: 'goal-archived', title: 'Archived Training Cycle', category: 'Health & Fitness', status: 'archived', projectId: health.id };
const capabilities = { canView: true, canEdit: true, canDelete: true, canChangeShare: true };

const entries = [
  { id: 'journal-1', ownerId: viewerId, title: 'Journal Entry · 5 Oct', plainText: 'The colder mornings are making the routine feel deliberate. Mobility before lifting is finally becoming automatic.', reflectionType: 'open', completedAt: now, createdAt: now, updatedAt: now, contentVersion: 2, project: winter, goals: [mobility], shareScope: 'project', capabilities, echoOwned: false },
  { id: 'journal-2', ownerId: viewerId, title: 'Journal Entry · 3 Oct', plainText: 'Consistency feels quieter than motivation. The small recovery choices are starting to compound.', reflectionType: 'open', completedAt: '2026-10-03T17:30:00Z', createdAt: '2026-10-03T17:30:00Z', updatedAt: '2026-10-03T17:30:00Z', contentVersion: 1, project: health, goals: [running], shareScope: 'guide', capabilities, echoOwned: false },
  { id: 'journal-3', ownerId: viewerId, title: 'Journal Entry · 30 Sep', plainText: 'Today was less about output and more about noticing what restores my attention.', reflectionType: 'open', completedAt: '2026-09-30T21:10:00Z', createdAt: '2026-09-30T21:10:00Z', updatedAt: '2026-09-30T21:10:00Z', contentVersion: 1, project: null, goals: [], shareScope: 'private', capabilities, echoOwned: false },
  { id: 'journal-4', ownerId: viewerId, title: 'Journal Entry · 27 Sep', plainText: 'A short walk changed the tone of the whole afternoon. Leave more space between commitments.', reflectionType: 'open', completedAt: '2026-09-27T15:20:00Z', createdAt: '2026-09-27T15:20:00Z', updatedAt: '2026-09-28T10:00:00Z', contentVersion: 3, project: winter, goals: [], shareScope: 'private', capabilities, echoOwned: false },
  { id: 'journal-5', ownerId: viewerId, title: 'Journal Entry · 18 Sep', plainText: 'Strength is returning because I am listening earlier instead of waiting for pain.', reflectionType: 'open', completedAt: '2026-09-18T12:00:00Z', createdAt: '2026-09-18T12:00:00Z', updatedAt: '2026-09-18T12:00:00Z', contentVersion: 1, project: winter, goals: [mobility], shareScope: 'private', capabilities, echoOwned: false },
  { id: 'journal-legacy', ownerId: viewerId, title: 'Journal Entry · 22 Jul', plainText: 'A historical Journal entry remains editable without exposing its retired capture source.', reflectionType: 'open', completedAt: '2026-07-22T14:30:00Z', createdAt: '2026-07-22T14:30:00Z', updatedAt: '2026-07-22T14:30:00Z', contentVersion: 1, project: health, goals: [archived], shareScope: 'private', capabilities: { canView: true, canEdit: false, canDelete: false, canChangeShare: false }, echoOwned: true },
];

const projectRows = [
  { id: winter.id, user_id: viewerId, title: winter.title, description: 'A focused season of strength and mobility.', status: 'active', mode: 'personal', start_date: null, end_date: null, period_key: null, created_at: now, updated_at: now },
  { id: health.id, user_id: viewerId, title: health.title, description: 'Build durable running consistency.', status: 'active', mode: 'guide', start_date: null, end_date: null, period_key: null, created_at: now, updated_at: now },
];

async function installPreview(page: Page, theme: 'light' | 'dark') {
  const session = { access_token: token, refresh_token: 'preview-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user };
  await page.addInitScript(({ value, appearance }) => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) return JSON.stringify(value);
      return originalGetItem.call(this, key);
    };
    localStorage.setItem('sb-journal-preview-auth-token', JSON.stringify(value));
    localStorage.setItem('ohara-ui-state', JSON.stringify({ state: { themeMode: appearance }, version: 5 }));
    for (const patch of ['journal-prelaunch-redesign', 'notes-prelaunch-library', 'projects-v1-1-execution', 'projects-v1-0', 'goals-v2-3-1', 'vault-v2-3', 'notes-v1-1', 'momentum-v1-1']) {
      localStorage.setItem(`ohara:release:${patch}:seen`, 'seen');
    }
  }, { value: session, appearance: theme });
  await page.route(/https?:\/\/[^/]+\/(?:auth|rest)\/v1\/.*/, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/auth/v1/user')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) });
    if (url.pathname.endsWith('/projects')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(projectRows) });
    return route.fulfill({ contentType: 'application/json', body: '[]' });
  });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/journal/library') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 'journal-library.v1', viewerId, entries, browseAvailable: true }) });
    if (path === '/api/entries/context') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ goals: [
      { ...mobility, milestones: [] },
      { ...running, milestones: [] },
    ] }) });
    if (path === '/api/profile') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ profile: { id: viewerId, displayName: 'Arthur' } }) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [], entries: [], items: [] }) });
  });
}

async function openJournal(page: Page, path = '/journal', width = 1440) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 240_000 });
  await expect(page.getByRole('heading', { name: 'Journal', exact: true })).toBeVisible();
  if (width >= 1040) await expect(page.getByRole('button', { name: 'Show All Entries', exact: true })).toBeVisible();
  else await expect(page.getByRole('button', { name: 'Browse Journal', exact: true })).toBeVisible();
  await page.waitForTimeout(350);
}

test('Journal desktop light visual states', async ({ page }) => {
  await installPreview(page, 'light');
  await openJournal(page);
  await expect(page.getByRole('button', { name: 'Show Archived Training Cycle', exact: true })).toHaveCount(0);
  const legacyEntry = page.getByLabel('Journal entry: Journal Entry · 22 Jul', { exact: true });
  await legacyEntry.getByRole('button', { name: 'Journal entry actions', exact: true }).click();
  await expect(legacyEntry.getByRole('button', { name: 'Edit Entry', exact: true })).toBeVisible();
  await expect(legacyEntry.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();
  await expect(page.getByText('Edit in Echo', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: `${screenshots}/desktop-light-all.png`, fullPage: true });

  await legacyEntry.getByRole('button', { name: 'Edit Entry', exact: true }).click();
  const legacyComposer = page.getByLabel('Edit Journal Entry composer', { exact: true });
  await expect(legacyComposer).toBeVisible();
  await expect(legacyComposer.getByRole('button', { name: 'Health Improvement', exact: true })).toHaveCount(0);
  await legacyComposer.getByRole('textbox', { name: 'Journal Entry', exact: true }).fill('Updated historical Journal entry.');
  const updateRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/entries/journal-legacy' && request.method() === 'PATCH');
  await legacyComposer.getByRole('button', { name: 'Save Changes', exact: true }).click();
  expect((await updateRequest).postDataJSON()).toMatchObject({ content: 'Updated historical Journal entry.' });
  await expect(legacyComposer).toBeHidden();

  await legacyEntry.getByRole('button', { name: 'Journal entry actions', exact: true }).click();
  await legacyEntry.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Delete this Journal entry?', { exact: true })).toBeVisible();
  const deleteRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/entries/journal-legacy' && request.method() === 'DELETE');
  await page.getByRole('button', { name: 'Delete Entry', exact: true }).click();
  await deleteRequest;

  await page.getByRole('button', { name: 'Show Winter Arc', exact: true }).click();
  await expect(page.getByText('3 journal entries', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/project-filter-light.png`, fullPage: true });

  await page.getByRole('button', { name: 'Show Ego Lifting & Mobility', exact: true }).click();
  await expect(page.getByText('2 journal entries', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/goal-filter-light.png`, fullPage: true });

  await page.getByRole('button', { name: 'Show Unlinked', exact: true }).click();
  await expect(page.getByText('1 journal entry', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/unlinked-light.png`, fullPage: true });

  await page.getByRole('button', { name: 'Show All Entries', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search journal', exact: true }).fill('consistency');
  await expect(page.getByText('Consistency feels quieter than motivation.', { exact: false })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/search-light.png`, fullPage: true });
  await page.getByRole('textbox', { name: 'Search journal', exact: true }).fill('');

  await page.getByRole('button', { name: 'Filter Journal entries', exact: true }).click();
  await expect(page.getByText('Filter Journal', { exact: true })).toBeVisible();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${screenshots}/filters-open-light.png` });
  await page.getByRole('button', { name: 'Shared with Guide', exact: true }).click();
  await page.getByRole('button', { name: 'Show entries', exact: true }).click();
  await expect(page.getByText('Filter Journal', { exact: true })).toBeHidden();
  await expect(page.getByText('Shared with Guide', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/shared-with-guide-light.png`, fullPage: true });

  await page.getByRole('button', { name: /New Entry$/ }).click();
  await expect(page.getByLabel('New Journal Entry composer')).toBeVisible();
  await expect(page.getByLabel('New Journal Entry composer').getByRole('button', { name: 'Winter Arc', exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/new-entry-composer-light.png`, fullPage: true });
});

test('Journal dark and route-context visual states', async ({ page }) => {
  await installPreview(page, 'dark');
  await openJournal(page);
  await page.screenshot({ path: `${screenshots}/desktop-dark-all.png`, fullPage: true });

  await openJournal(page, '/journal?projectId=project-winter');
  await expect(page.getByText('3 journal entries', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/project-to-journal-context.png`, fullPage: true });

  await openJournal(page, '/journal?goalId=goal-running');
  await expect(page.getByText('1 journal entry', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/goal-to-journal-context.png`, fullPage: true });
});

test('Journal narrow layout and Browse Journal sheet', async ({ page }) => {
  await installPreview(page, 'light');
  await openJournal(page, '/journal', 390);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: `${screenshots}/mobile-journal.png`, fullPage: true });
  await page.getByRole('button', { name: 'Browse Journal', exact: true }).click();
  await expect(page.getByText('Browse Journal', { exact: true }).last()).toBeVisible();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${screenshots}/mobile-browse-journal.png` });
});
