import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { visualEvidencePath } from '../helpers/visual-evidence';
import { installPreview } from './fixtures';

const screenshots = visualEvidencePath('docs/ui-checkpoints/workspace-v2');
mkdirSync(screenshots, { recursive: true });

test('desktop sidebar, appearance, create/account controls and route state', async ({ page }) => {
  await installPreview(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dashboard');
  const sidebar = page.getByRole('complementary', { name: 'Main sidebar' });
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Goals', exact: true }).locator('img')).toHaveCount(1);
  await expect(sidebar.getByRole('link', { name: 'Momentum', exact: true }).locator('svg')).toHaveCount(1);
  await expect(sidebar.getByRole('link', { name: 'Roots', exact: true }).locator('svg')).toHaveCount(1);
  await expect(sidebar.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText("Today's Focus", { exact: true })).toBeVisible();
  await expect(page.getByText('Pull Day', { exact: true }).first()).toBeVisible();
  const momentumCard = await page.getByLabel('Momentum Snapshot card', { exact: true }).boundingBox();
  const nextStepCard = await page.getByLabel('Next Step card', { exact: true }).boundingBox();
  const calendarCard = await page.getByLabel("Calendar and Today's Focus card", { exact: true }).boundingBox();
  expect(Math.abs(momentumCard!.y - calendarCard!.y)).toBeLessThan(1);
  expect(Math.abs(nextStepCard!.y + nextStepCard!.height - calendarCard!.y - calendarCard!.height)).toBeLessThan(1);
  await page.screenshot({ path: `${screenshots}/home-expanded-light.png` });
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(sidebar).toHaveCSS('width', '76px');
  await sidebar.getByRole('link', { name: 'Goals', exact: true }).focus();
  await expect(sidebar.locator('.ws-rail-tooltip').filter({ hasText: /^Goals$/ })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/home-collapsed-light.png` });
  await page.reload();
  await expect(sidebar).toHaveCSS('width', '76px');
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(sidebar).toHaveCSS('width', '232px');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('.workspace-v2')).toHaveAttribute('data-theme', 'dark');
  await expect(sidebar.getByRole('link', { name: 'Home', exact: true })).toHaveCSS('background-color', 'rgb(45, 61, 50)');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toHaveCSS('background-color', 'rgb(29, 34, 31)');
  await expect(page.getByRole('button', { name: 'Open Pull Day in Calendar' })).toHaveCSS('background-color', 'rgb(32, 38, 34)');
  await page.screenshot({ path: `${screenshots}/home-expanded-dark.png` });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('AI Reflections', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByText('AI Reflections', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'New note' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: 'New note' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Open account and Circles' }).click();
  await expect(page.getByRole('button', { name: 'Close account panel' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close account panel' })).toBeInViewport();
  await expect(page.getByText('Maya Chen', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/account-panel-dark.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Close account panel' }).click();
  for (const [name, url] of [['Projects', '/projects'], ['Calendar', '/calendar'], ['Notes', '/notes'], ['Reflections', '/journal'], ['Sources', '/notes?view=sources'], ['Momentum', '/momentum'], ['Goals', '/goals']]) {
    await sidebar.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${url.replace('?', '\\?')}$`));
    await expect(sidebar.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(sidebar.locator('[aria-current="page"]')).toHaveCount(1);
  }
  await expect(page.getByRole('heading', { name: 'Goals', exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/goals-dark.png` });
  expect(errors).toEqual([]);
});

test('tablet/mobile drawer traps focus, restores focus, closes on route changes and stays within viewport', async ({ page }) => {
  await installPreview(page);
  for (const width of [320, 390, 768, 1024, 1100, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dashboard');
    await expect(page.getByText("Today's Focus", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.ws-content').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    if (width >= 1100) continue;
    const opener = page.getByRole('button', { name: 'Open navigation' });
    await opener.click();
    const drawer = page.getByRole('dialog', { name: 'Workspace navigation' });
    await expect(drawer).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
    for (let index = 0; index < 18; index++) await page.keyboard.press('Tab');
    expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    if (width === 390) await page.screenshot({ path: `${screenshots}/mobile-navigation.png` });
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await expect(opener).toBeFocused();
    await opener.click();
    await drawer.getByRole('link', { name: 'Projects', exact: true }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(drawer).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
    if (width === 390) await page.screenshot({ path: `${screenshots}/mobile-projects.png` });
  }
});

test('public pages remain outside workspace styling', async ({ page }) => {
  for (const path of ['/', '/signup', '/login']) {
    await page.goto(path);
    await expect(page.locator('.workspace-v2')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('fresh dark load and reduced motion keep Home control surfaces dark', async ({ page }) => {
  await installPreview(page, 'dark');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'Open Pull Day in Calendar' })).toHaveCSS('background-color', 'rgb(32, 38, 34)');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toHaveCSS('background-color', 'rgb(29, 34, 31)');
  await expect(page.getByLabel('Momentum Snapshot card', { exact: true })).toHaveCSS('background-color', 'rgb(34, 39, 36)');
  await expect(page.locator('.ws-sidebar')).toHaveCSS('transition-duration', '0s');
  await page.screenshot({ path: `${screenshots}/home-fresh-dark.png` });
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/mobile-home-dark.png` });
});
