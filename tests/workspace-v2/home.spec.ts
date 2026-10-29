import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { visualEvidencePath } from '../helpers/visual-evidence';
import { installPreview } from './fixtures';

const screenshots = visualEvidencePath('docs/ui-checkpoints/home-v2');
mkdirSync(screenshots, { recursive: true });

async function alignedCards(page: Page) {
  const momentum = await page.getByLabel('Momentum Snapshot card', { exact: true }).boundingBox();
  const next = await page.getByLabel('Next Step card', { exact: true }).boundingBox();
  const calendar = await page.getByLabel("Calendar and Today's Focus card", { exact: true }).boundingBox();
  expect(Math.abs(momentum!.y - calendar!.y)).toBeLessThan(1);
  expect(Math.abs(next!.y + next!.height - calendar!.y - calendar!.height)).toBeLessThan(1);
}

for (const theme of ['light', 'dark'] as const) {
  test(`Home ${theme}: real-data hierarchy, disclosure, mobile priority and 100% zoom checkpoints`, async ({ page }) => {
    await installPreview(page, theme, 'populated');
    const requests: string[] = [];
    page.on('request', (request) => { if (request.url().includes('/api/')) requests.push(request.method() + ' ' + new URL(request.url()).pathname); });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Arthur\./ })).toBeVisible();
    await expect(page.getByText('Thursday, October 8', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Pull Day in Calendar' })).toBeVisible();
    await expect(page.getByText('Recent weekly snapshots', { exact: true })).toBeVisible();
    await expect(page.getByText(/Hidden (archived|expired|complete) milestone/)).toHaveCount(0);
    await expect(page.getByText(/consecutive week|streak/i)).toHaveCount(0);
    await alignedCards(page);
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
    await expect(page.getByLabel('Momentum Snapshot card', { exact: true })).toHaveCSS('background-color', theme === 'dark' ? 'rgb(34, 39, 36)' : 'rgb(255, 255, 255)');
    await page.screenshot({ path: `${screenshots}/desktop-${theme}.png`, animations: 'disabled' });
    const details = page.getByRole('button', { name: 'Goal Momentum details' });
    await details.focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByLabel('Momentum Snapshot card', { exact: true }).getByText('Ego Lifting & Mobility', { exact: true })).toBeVisible();
    await alignedCards(page);
    await details.click();
    for (const width of [320, 390, 768, 1024, 1100, 1280]) {
      await page.setViewportSize({ width, height: width === 390 ? 1600 : 1000 });
      await expect(async () => {
      expect(await page.locator('.ws-content').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      const calendar = await page.getByLabel("Calendar and Today's Focus card", { exact: true }).boundingBox();
      const next = await page.getByLabel('Next Step card', { exact: true }).boundingBox();
      const momentum = await page.getByLabel('Momentum Snapshot card', { exact: true }).boundingBox();
      const available = width >= 1100 ? width - 232 : width;
      if (available < 980) {
        expect(calendar).not.toBeNull();
        expect(next).not.toBeNull();
        expect(momentum).not.toBeNull();
        expect(calendar!.y).toBeLessThan(next!.y);
        expect(next!.y).toBeLessThan(momentum!.y);
      } else await alignedCards(page);
      }).toPass();
      if (width === 390) await page.screenshot({ path: `${screenshots}/mobile-${theme}.png`, animations: 'disabled' });
    }
    expect(requests.filter((value) => /reconcile|recalculate|\/circles\/feed|\/entries$/.test(value))).toEqual([]);
    expect(requests.filter((value) => value.startsWith('POST'))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('Home day selection, bounded list and existing task/milestone/Momentum/Echo destinations', async ({ page }) => {
  await installPreview(page, 'light', 'many');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'Open Pull Day in Calendar' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View all 7 items →' })).toBeVisible();
  await page.getByRole('button', { name: 'Tuesday, October 6, 1 item' }).click();
  await expect(page.getByRole('button', { name: 'Open Mobility reset in Calendar' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Open Mobility reset in Calendar' })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole('button', { name: 'Back to today' }).click();
  await page.getByRole('button', { name: 'Open Pull Day in Calendar' }).click();
  await expect(page).toHaveURL(/\/calendar\?date=2026-10-08$/);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /Complete first training block,/ }).click();
  await expect(page).toHaveURL(/\/goals\?goal=goal-1$/);
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'View Momentum →' }).click();
  await expect(page).toHaveURL(/\/momentum$/);
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'New note', exact: true }).click();
  await expect(page).toHaveURL(/\/notes\?create=note$/);
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Write a reflection', exact: true }).click();
  await expect(page).toHaveURL(/\/journal\?create=new$/);
});

test('Home distinguishes empty data and missing history from zero scores', async ({ page }) => {
  await installPreview(page, 'dark', 'empty');
  await page.goto('/dashboard');
  await expect(page.getByText('Nothing scheduled for today.', { exact: true })).toBeVisible();
  await expect(page.getByText('Momentum is building from your activity.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Momentum Snapshot card', { exact: true }).getByText('/ 100', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Momentum trend', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Create a Goal →' }).click();
  await expect(page).toHaveURL(/\/goals\/create$/);
});

test('Home failures stay isolated, avoid false empty states and offer read-only retries', async ({ page }) => {
  await installPreview(page, 'dark', 'error');
  let calendarReads = 0;
  let momentumReads = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/calendar/items')) calendarReads++;
    if (new URL(request.url()).pathname === '/api/momentum') momentumReads++;
  });
  await page.goto('/dashboard');
  await expect(page.getByText('Goals are temporarily unavailable. Open Goals to try again.')).toBeVisible();
  await expect(page.getByText('Momentum is temporarily unavailable.')).toBeVisible();
  await expect(page.getByText('OHARA calendar items are temporarily unavailable.')).toBeVisible();
  await expect(page.getByText('Nothing scheduled for today.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry Calendar' }).click();
  await expect.poll(() => calendarReads).toBe(2);
  await page.getByRole('button', { name: 'Retry Momentum' }).click();
  await expect.poll(() => momentumReads).toBe(2);
  await expect(page.getByRole('link', { name: 'Write a reflection' })).toBeVisible();
});

test('Home loading is honest and independent, then resolves without blocking the shell', async ({ page }) => {
  const release = await installPreview(page, 'dark', 'loading');
  await page.goto('/dashboard');
  await expect(page.getByText('Loading this week…')).toBeVisible();
  await expect(page.getByText('Loading Momentum…')).toBeVisible();
  await expect(page.getByText('Loading your next steps…')).toBeVisible();
  await expect(page.getByText('Nothing scheduled for today.')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'New note', exact: true })).toBeVisible();
  release();
  await expect(page.getByRole('button', { name: 'Open Pull Day in Calendar' })).toBeVisible();
});
