import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { visualEvidencePath } from '../helpers/visual-evidence';
import { installPreview } from './fixtures';
import { installScenario } from './project-fixtures';

test('Calendar serializes completion attempts, surfaces failures, and preserves browser history', async ({ page }) => {
  await installPreview(page, 'light', 'populated');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let writes = 0;
  let release = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/task-occurrences/one', async (route) => {
    writes++;
    await pending;
    await route.fulfill({ status: 503, json: { error: 'Synthetic unavailable service' } });
  });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Open Pull Day in Calendar' }).click();
  await expect(page).toHaveURL(/calendar\?date=2026-10-08/);
  await page.getByRole('button', { name: 'Open Thursday, October 8', exact: true }).click();
  const complete = page.getByRole('checkbox', { name: 'Complete Pull Day', exact: true });
  await complete.click();
  await expect(complete).toBeDisabled();
  // Exercise a second event during the pending request, not just disabled pointer styling.
  await complete.dispatchEvent('click');
  expect(writes).toBe(1);
  release();
  await expect(page.getByRole('alert')).toHaveText('Task could not be updated. Try again.');
  await expect(complete).toBeEnabled();
  await complete.click();
  await expect.poll(() => writes).toBe(2);
  await expect(complete).toBeEnabled();
  await page.goBack();
  await expect(page).toHaveURL(/dashboard$/);
  await expect(page.getByRole('button', { name: 'Open Pull Day in Calendar' })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/calendar\?date=2026-10-08/);
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: /^Pull Day,/ }).click();
  await expect(page).toHaveURL(/goals\?goal=goal-1.*taskId=task-1/);
  expect(writes).toBe(2);
  expect(errors).toEqual([]);
});

test('Project creation dialog has a name, traps keyboard focus, and returns focus on Escape', async ({ page }) => {
  await installScenario(page, { mode: 'personal', viewer: 'owner' });
  await page.goto('/projects');
  const trigger = page.getByRole('button', { name: /New Project$/ });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Create Project', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Project name' }).focus();
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('Project context remains usable with 200% text at tablet width', async ({ page }) => {
  const data = await installScenario(page, { mode: 'team', viewer: 'owner', theme: 'dark' });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`/projects/${data.project.id}?view=goals`);
  await expect(page.getByRole('heading', { name: data.project.title, exact: true })).toBeVisible();
  await page.locator('.ws-content').evaluate((root) => {
    // Text-only scaling: capture computed sizes first so inherited sizes are not doubled twice.
    const text = Array.from(root.querySelectorAll<HTMLElement>('*')).filter((el) => Array.from(el.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()));
    const sizes = text.map((el) => ({ el, font: parseFloat(getComputedStyle(el).fontSize), line: parseFloat(getComputedStyle(el).lineHeight) }));
    for (const { el, font, line } of sizes) {
      el.style.fontSize = `${font * 2}px`;
      if (Number.isFinite(line)) el.style.lineHeight = `${line * 2}px`;
    }
  });
  await expect(async () => expect(await page.locator('.ws-content').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)).toPass();
  expect((await page.getByRole('heading', { name: data.project.title, exact: true }).boundingBox())!.width).toBeGreaterThanOrEqual(320);
  await expect(page.getByRole('button', { name: 'Vault section' })).toBeVisible();
  mkdirSync(visualEvidencePath('docs/ui-checkpoints/readiness-v2'), { recursive: true });
  await page.screenshot({ path: visualEvidencePath('docs/ui-checkpoints/readiness-v2/project-tablet-200-text.png'), fullPage: true, animations: 'disabled' });
});
