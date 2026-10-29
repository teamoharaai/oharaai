import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { visualEvidencePath } from '../helpers/visual-evidence';
import { installScenario } from './project-fixtures';

const folder = visualEvidencePath('docs/ui-checkpoints/vault-v2');
mkdirSync(folder, { recursive: true });
async function capture(page: Page, name: string) {
  expect(await page.evaluate(() => visualViewport?.scale)).toBe(1);
  await page.screenshot({ path: `${folder}/${name}.png`, animations: 'disabled' });
}
async function setup(page: Page, theme: 'light' | 'dark' = 'light') {
  const data = await installScenario(page, { mode: 'team', viewer: 'owner', theme });
  await page.route('**/api/notes/library', (route) => route.fulfill({ json: { version: 'notes-library.v1', viewerId: data.viewerId, folders: [], notes: [], sources: [] } }));
  await page.route('**/api/journal/library', (route) => route.fulfill({ json: { version: 'journal-library.v1', viewerId: data.viewerId, entries: [], projects: [], goals: [] } }));
  const goals = [data.goal, { ...data.goal, id: 'second-goal', title: 'Build a thoughtful launch' }];
  let failLinks = false;
  const entries = [
    { id: 'direct-note', entry_type: 'note', title: 'Project planning', project_id: data.project.id },
    { id: 'goal-note', entry_type: 'note', title: 'Research and ideas for a thoughtful launch', project_id: null },
    { id: 'multi-reflection', entry_type: 'reflection', title: 'What we learned this week', project_id: data.project.id },
  ].map((entry) => ({ ...entry, user_id: data.viewerId, plain_text: 'Isolated development fixture.', archived: false, project_share_scope: entry.project_id ? 'project' : 'private', created_at: data.goal.created_at, updated_at: data.goal.updated_at }));
  await page.route('**/rest/v1/goals?**', (route) => {
    const url = new URL(route.request().url()); const id = url.searchParams.get('id')?.replace('eq.', '');
    const selected = id ? goals.filter((g) => g.id === id) : goals;
    return route.fulfill({ json: id && !url.searchParams.has('limit') ? selected[0] : selected });
  });
  await page.route('**/rest/v1/entry_goal_links?**', (route) => route.fulfill({ status: failLinks ? 503 : 200, json: failLinks ? { message: 'Synthetic unavailable links' } : [
    { entry_id: 'goal-note', goal_id: data.goal.id },
    { entry_id: 'multi-reflection', goal_id: data.goal.id },
    { entry_id: 'multi-reflection', goal_id: 'second-goal' },
  ] }));
  await page.route('**/rest/v1/entries?**', (route) => {
    const url = new URL(route.request().url()); const project = url.searchParams.get('project_id'); const ids = url.searchParams.get('id');
    return route.fulfill({ json: entries.filter((entry) => project ? `eq.${entry.project_id}` === project : ids?.includes(entry.id)) });
  });
  const source = { itemType: 'link', contentKind: 'generic', createdBy: data.viewerId, createdAt: data.goal.created_at, updatedAt: data.goal.updated_at, visibility: 'vault_members', metadata: { provider: 'link', url: 'https://example.test/reference' } };
  const sourceItems = [
    { ...source, id: 'project-source', vaultId: 'project-vault', title: 'Project reference', directProjectItem: true, origins: [] },
    { ...source, id: 'goal-source', vaultId: 'goal-vault', title: 'Goal research source', directProjectItem: false, origins: [{ goalId: data.goal.id, goalTitle: data.goal.title }] },
  ];
  await page.route('**/api/projects/*/vault', (route) => route.fulfill({ json: { vault: { id: 'project-vault' }, items: sourceItems } }));
  await page.route('**/api/vaults/*', (route) => route.fulfill({ json: { vault: { id: 'goal-vault' }, items: [{ ...source, id: 'goal-source', vaultId: 'goal-vault', title: 'Goal research source' }] } }));
  return { ...data, sourceItems, failLinks: (value: boolean) => { failLinks = value; } };
}

test('Vault hierarchy, Project filters, unique Goal-linked Entries, creation and screenshots', async ({ page }) => {
  const data = await setup(page);
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto(`/projects/${data.project.id}?view=vault`);
  const vault = page.getByTestId('goal-vault-workspace').filter({ visible: true });
  await expect(vault.getByRole('button', { name: 'Open Research and ideas for a thoughtful launch' })).toBeVisible();
  await expect(vault.getByRole('button', { name: 'Open What we learned this week' })).toHaveCount(1);
  await expect(vault.getByText(/From Goal: Beta Launch/).first()).toBeVisible();
  await expect(page.getByText('Project Vault', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Vault', exact: true }).getByRole('link')).toHaveCount(3);
  await capture(page, 'project-all');
  await capture(page, 'authorized-goal-linked');
  await capture(page, 'navigation-expanded');
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.getByRole('link', { name: 'Notes', exact: true })).toBeVisible();
  await capture(page, 'navigation-collapsed');
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  for (const filter of ['Notes', 'Reflections', 'Sources']) {
    await vault.getByRole('button', { name: filter, exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(vault.getByRole('button', { name: filter, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await capture(page, `project-${filter.toLowerCase()}`);
  }
  await vault.getByRole('button', { name: 'Add to Vault', exact: true }).click();
  await expect(page.getByText('CREATE NEW', { exact: true })).toBeVisible();
  await expect(page.getByText('LINK EXISTING', { exact: true })).toBeVisible();
  await expect(page.getByText(/Sharing is a separate choice/)).toBeVisible();
  await page.getByRole('button', { name: 'Add Note', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`notes\\?.*projectId=${data.project.id}`));
});

test('Goal Vault, Roots deep link, tablet/mobile navigation and dark presentation', async ({ page }) => {
  const data = await setup(page, 'dark');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`/projects/${data.project.id}?view=vault`);
  await expect(page.getByRole('button', { name: 'Open Goal research source' })).toBeVisible();
  await expect(page.locator('.workspace-v2')).toHaveAttribute('data-theme', 'dark');
  await capture(page, 'dark-vault');
  await page.goto(`/goals/${data.goal.id}/vault`);
  await expect(page).toHaveURL(/goals\?goal=.*view=vault/);
  await expect(page.getByRole('button', { name: 'Open Research and ideas for a thoughtful launch' })).toBeVisible();
  await capture(page, 'goal-all');
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(async () => expect(await page.locator('.ws-content').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)).toPass();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog').getByRole('navigation', { name: 'Vault' })).toBeVisible();
  await capture(page, 'mobile-navigation');
  await page.getByRole('dialog').getByRole('link', { name: 'Sources', exact: true }).click();
  await expect(page).toHaveURL(/notes\?view=sources/);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('link', { name: 'Sources', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'Reflections', exact: true }).click();
  await expect(page).toHaveURL(/journal/);
});

test('failed Goal-link path retains direct content, reports incompleteness and retries', async ({ page }) => {
  const data = await setup(page); data.failLinks(true);
  await page.goto(`/projects/${data.project.id}?view=vault`);
  await expect(page.getByRole('button', { name: 'Open Project planning' })).toBeVisible();
  await expect(page.getByText('Some linked Notes and Reflections could not be loaded. Available content is shown below.', { exact: true })).toBeVisible();
  await expect(page.getByText('Linked Notes will appear here.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open Goal research source' })).toBeVisible();
  data.failLinks(false);
  await page.getByRole('button', { name: 'Retry linked content', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Research and ideas for a thoughtful launch' })).toBeVisible();
  await expect(page.getByText(/Some linked Notes/)).toHaveCount(0);
});

test('Source details expose keyboard actions and preserve confirmed rename/delete results', async ({ page }) => {
  const data = await setup(page);
  await page.route('**/api/vaults/items/project-source', async (route) => {
    const index = data.sourceItems.findIndex((item) => item.id === 'project-source');
    if (route.request().method() === 'DELETE') {
      data.sourceItems.splice(index, 1);
      return route.fulfill({ status: 204 });
    }
    data.sourceItems[index].title = route.request().postDataJSON().title;
    return route.fulfill({ json: { item: data.sourceItems[index] } });
  });
  await page.goto(`/projects/${data.project.id}?view=vault`);
  await page.getByRole('button', { name: 'Open Project reference', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Source details', exact: true });
  const rename = dialog.getByRole('button', { name: 'Rename', exact: true });
  expect((await rename.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await rename.focus(); await page.keyboard.press('Enter');
  await dialog.getByRole('textbox', { name: 'Source title' }).fill('Updated reference');
  await dialog.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(dialog.getByText('Updated reference', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Overview section' }).click();
  await page.getByRole('button', { name: 'Vault section' }).click();
  await page.getByRole('button', { name: 'Open Updated reference', exact: true }).click();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog.getByText('Delete this Source?', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Rename', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await dialog.getByRole('button', { name: 'Delete Source', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Overview section' }).click();
  await page.getByRole('button', { name: 'Vault section' }).click();
  await expect(page.getByRole('button', { name: 'Open Updated reference', exact: true })).toHaveCount(0);
});
