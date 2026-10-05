import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshots = resolve(process.cwd(), 'docs/ui-checkpoints/notes-library-prelaunch');
mkdirSync(screenshots, { recursive: true });

const viewerId = '11111111-1111-4111-8111-111111111111';
const collaboratorId = '22222222-2222-4222-8222-222222222222';
const now = '2026-10-03T14:00:00.000Z';
const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ aud: 'authenticated', exp: 1893456000, role: 'authenticated', sub: viewerId })).toString('base64url')}.preview`;
const user = { id: viewerId, email: 'notes@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: now };
const project = { id: 'project-1', title: 'OHARA Launch', status: 'active' };
const goal = { id: 'goal-1', title: 'Complete beta readiness', projectId: project.id };

const notes = [
  { id: 'note-1', ownerId: viewerId, title: 'Launch positioning', plainText: 'Audience, promise, and launch sequence.', createdAt: '2026-09-20T14:00:00Z', updatedAt: now, project, goals: [goal], author: { id: viewerId, displayName: 'You', avatarUrl: null }, shareScope: 'project', viewerRole: 'owner', capabilities: { canView: true, canEdit: true, canDelete: true, canChangeShare: true }, folderId: 'folder-1' },
  { id: 'note-2', ownerId: viewerId, title: 'Product principles', plainText: 'A calm product should make context easy to recover.', createdAt: '2026-09-18T14:00:00Z', updatedAt: '2026-10-01T14:00:00Z', project: null, goals: [], author: { id: viewerId, displayName: 'You', avatarUrl: null }, shareScope: 'private', viewerRole: 'owner', capabilities: { canView: true, canEdit: true, canDelete: true, canChangeShare: true }, folderId: 'folder-2' },
  { id: 'note-3', ownerId: viewerId, title: 'Interview questions', plainText: 'What feels hardest to find today?', createdAt: '2026-09-12T14:00:00Z', updatedAt: '2026-09-28T14:00:00Z', project: null, goals: [], author: { id: viewerId, displayName: 'You', avatarUrl: null }, shareScope: 'private', viewerRole: 'owner', capabilities: { canView: true, canEdit: true, canDelete: true, canChangeShare: true }, folderId: null },
  { id: 'shared-note', ownerId: collaboratorId, title: 'Beta synthesis', plainText: 'The strongest signal is faster recovery of context.', createdAt: '2026-09-29T14:00:00Z', updatedAt: '2026-10-02T14:00:00Z', project, goals: [goal], author: { id: collaboratorId, displayName: 'Maya Chen', avatarUrl: null }, shareScope: 'project', viewerRole: 'member', capabilities: { canView: true, canEdit: false, canDelete: false, canChangeShare: false }, folderId: 'folder-1' },
];

const sources = [
  { id: 'source-1', ownerId: viewerId, title: 'Product research summary.pdf', itemType: 'document', url: 'https://example.test/research.pdf', fileType: 'pdf', provider: 'PDF', visibility: 'private', createdAt: now, updatedAt: now, project, goal, author: { id: viewerId, displayName: 'You', avatarUrl: null } },
  { id: 'source-2', ownerId: collaboratorId, title: 'Design systems field guide', itemType: 'link', url: 'https://example.test/design', fileType: null, provider: 'example.test', visibility: 'vault_members', createdAt: now, updatedAt: now, project, goal: null, author: { id: collaboratorId, displayName: 'Maya Chen', avatarUrl: null } },
];

async function installPreview(page: Page, theme: 'light' | 'dark') {
  const session = { access_token: token, refresh_token: 'preview-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user };
  await page.addInitScript(({ value, appearance }) => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) return JSON.stringify(value);
      return originalGetItem.call(this, key);
    };
    localStorage.setItem('sb-notes-preview-auth-token', JSON.stringify(value));
    localStorage.setItem('ohara-ui-state', JSON.stringify({ state: { themeMode: appearance }, version: 5 }));
    for (const patch of ['notes-prelaunch-library', 'projects-v1-1-execution', 'projects-v1-0', 'goals-v2-3-1', 'vault-v2-3', 'notes-v1-1', 'momentum-v1-1']) {
      localStorage.setItem(`ohara:release:${patch}:seen`, 'seen');
    }
  }, { value: session, appearance: theme });
  await page.route(/https?:\/\/[^/]+\/(?:auth|rest)\/v1\/.*/, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/auth/v1/user')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) });
    return route.fulfill({ contentType: 'application/json', body: '[]' });
  });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/notes/library') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 'notes-library.v1', viewerId, folders: [
      { id: 'folder-1', name: 'Research', sortOrder: 0, createdAt: now, updatedAt: now },
      { id: 'folder-2', name: 'Product thinking', sortOrder: 1, createdAt: now, updatedAt: now },
    ], notes, sources }) });
    if (path === '/api/entries/library/shared-note') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      version: 'entry-detail.v1', requestId: 'preview',
      entry: { id: 'shared-note', userId: collaboratorId, entryType: 'note', title: 'Beta synthesis', content: { type: 'doc', schemaVersion: 2, content: [{ type: 'paragraph', attrs: { id: 'paragraph-1' }, content: [{ type: 'text', text: 'The strongest signal is faster recovery of context without losing the thread.' }] }] }, plainText: 'The strongest signal is faster recovery of context without losing the thread.', brtCategory: null, reflectionType: null, conversationTurns: [], takeaway: null, pinned: false, archived: false, contentVersion: 1, schemaVersion: 2, completedAt: null, createdAt: now, updatedAt: now, goals: [{ ...goal, category: 'Work & Money', status: 'active' }], project, projectShareScope: 'project', categoryIds: [], milestones: [] },
      author: { id: collaboratorId, displayName: 'Maya Chen', avatarUrl: null }, context: { project, goals: [goal], shareScope: 'project', viewerRole: 'member' }, capabilities: { canView: true, canEdit: false, canDelete: false, canChangeShare: false },
    }) });
    if (path === '/api/profile') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ profile: { id: viewerId, displayName: 'Arthur' } }) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [], entries: [], items: [] }) });
  });
}

async function openLibrary(page: Page, width = 1440) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/notes', { waitUntil: 'domcontentloaded', timeout: 240_000 });
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Linked to', exact: true })).toBeVisible();
  await expect(page.getByText('New Note', { exact: true })).toBeVisible();
  await page.waitForTimeout(400);
}

test('Notes library visual states', async ({ page }) => {
  await installPreview(page, 'light');
  await openLibrary(page);
  await page.screenshot({ path: `${screenshots}/my-library-light.png`, fullPage: true });

  await page.getByRole('tab', { name: 'Shared with Me', exact: true }).click();
  await expect(page.getByText('Beta synthesis', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/shared-with-me-light.png`, fullPage: true });

  await page.getByRole('tab', { name: 'Linked to', exact: true }).click();
  await expect(page.getByText('Launch positioning', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/linked-to-light.png`, fullPage: true });

  await page.getByRole('tab', { name: /Sources/ }).click();
  await expect(page.getByText('Product research summary.pdf', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/sources-light.png`, fullPage: true });

  await page.getByRole('tab', { name: 'My Library', exact: true }).click();
  await page.getByRole('button', { name: 'Show Research', exact: true }).click();
  await expect(page.getByText('Product principles', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: `${screenshots}/folder-selected-light.png`, fullPage: true });

  await page.getByRole('button', { name: 'Show Unfiled', exact: true }).click();
  await expect(page.getByText('Interview questions', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/unfiled-light.png`, fullPage: true });

  await page.getByText(/^Filters/).click();
  await expect(page.getByText('DATE UPDATED', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/filters-open-light.png`, fullPage: true });
  await page.getByText('Close', { exact: true }).last().click();
  await expect(page.getByText('DATE UPDATED', { exact: true })).toBeHidden();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Show All Notes', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search Notes' }).fill('principles');
  await expect(page.getByText('Product principles', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/search-results-light.png`, fullPage: true });

  await page.getByRole('tab', { name: 'Shared with Me', exact: true }).click();
  await page.getByRole('link', { name: 'Open Note Beta synthesis' }).click();
  await expect(page.getByText('View only', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/shared-note-read-only-light.png`, fullPage: true });
});

test('Notes library dark and narrow layouts', async ({ page }) => {
  await installPreview(page, 'dark');
  await openLibrary(page);
  await page.screenshot({ path: `${screenshots}/my-library-dark.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: `${screenshots}/my-library-narrow-dark.png`, fullPage: true });
});
