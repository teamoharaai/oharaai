import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { visualEvidencePath } from '../helpers/visual-evidence';

const screenshots = visualEvidencePath('docs/ui-checkpoints/landing-v2');
mkdirSync(screenshots, { recursive: true });

test('auth screens match the landing page and preserve validation and confirmation states', async ({ page }) => {
  const form = page.locator('.auth-v2:visible');
  const checkAlignment = async () => {
    const fields = await form.locator('input').all();
    const button = await form.getByRole('button', { name: /^(Log in|Create account)$/ }).boundingBox();
    expect(button).not.toBeNull();
    let previousBottom = 0;
    for (const field of fields) {
      const box = await field.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.abs(box!.x - button!.x)).toBeLessThan(1);
      expect(Math.abs(box!.width - button!.width)).toBeLessThan(1);
      expect(box!.y).toBeGreaterThan(previousBottom);
      previousBottom = box!.y + box!.height;
    }
    expect(button!.y).toBeGreaterThan(previousBottom);
  };
  // All auth writes are intercepted; no real accounts or emails are created.
  await page.route('**/auth/v1/**', (route) => {
    if (route.request().url().includes('/signup')) return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ id: 'preview-user', aud: 'authenticated', email: 'preview@example.test', identities: [] }),
    });
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }) });
  });
  await page.route('**/rest/v1/rpc/search_profiles_by_username', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));
  for (const route of ['signup', 'login']) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'OharaAI home' })).toBeVisible();
    await checkAlignment();
    await page.screenshot({ path: `${screenshots}/auth-${route}-desktop.png`, fullPage: true });
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.locator('.auth-v2').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await checkAlignment();
    }
    await page.screenshot({ path: `${screenshots}/auth-${route}-mobile.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByText('Please enter your email and password.', { exact: true })).toBeVisible();
  await form.getByLabel('Email', { exact: true }).fill('preview@example.test');
  await form.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByText('Incorrect email or password.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
  await page.getByRole('link', { name: 'Sign up', exact: true }).click();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Please fill in all fields.', { exact: true })).toBeVisible();
  await form.getByLabel('Display name', { exact: true }).fill('Preview');
  await form.getByLabel('Username', { exact: true }).fill('preview_user');
  await form.getByLabel('Email', { exact: true }).fill('preview@example.test');
  await form.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Password must be at least 10 characters.', { exact: true })).toBeVisible();
  await form.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Check your email to confirm your account, then log in.', { exact: true })).toBeVisible();
});

test('desktop presents approved content and navigates to real sections and signup', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A More Intentional Way to Grow');
  await expect(page).toHaveTitle('OharaAI — A More Intentional Way to Grow');
  await expect(page.locator('.lp-hero img')).toHaveCount(0);
  await expect(page.getByRole('navigation').getByRole('link')).toHaveText(['Product', 'About Us', 'Coming Soon']);
  for (const [name, id] of [['Product', 'product'], ['About Us', 'about'], ['Coming Soon', 'coming-soon']]) {
    await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeFocused();
    await expect.poll(() => page.locator(`#${id}`).evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBeLessThan(60);
  }
  await expect(page.getByText(/These experiences, along with our planned Circles community, are not yet available/)).toBeVisible();
  await expect(page.getByText('CONCEPT · UNDER EXPLORATION', { exact: true })).toBeVisible();
  await expect(page.getByText('The OHARA Team', { exact: true })).toHaveCount(1);
  await expect(page.locator('.landing-v2')).not.toContainText(/Fortify Your Personal Growth|Turn reflection into real progress|Trusted by|4\.9/);
  for (const link of await page.getByRole('link', { name: 'Get Started' }).all()) await expect(link).toHaveAttribute('href', '/signup');
  await page.getByRole('link', { name: 'OharaAI home' }).first().click();
  await expect.poll(() => page.locator('.landing-v2').evaluate((el) => el.scrollTop)).toBe(0);
  // The app has its own scroll container; temporarily expand it for a whole-page checkpoint.
  await page.addStyleTag({ content: '.landing-v2{height:auto;overflow:visible}body,#root{height:auto!important;overflow:visible!important}' });
  await page.screenshot({ path: `${screenshots}/desktop.png`, fullPage: true });
  expect(errors).toEqual([]);
  await page.getByRole('link', { name: 'Get Started' }).first().click();
  await expect(page).toHaveURL(/\/signup$/);
});

test('mobile menu, direct anchors, reduced motion and narrow layouts remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await expect(page.getByRole('navigation')).toBeHidden();
  await menu.click();
  await expect(page.getByRole('button', { name: 'Close' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('navigation').getByRole('link', { name: 'About Us' }).focus();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole('navigation').getByRole('link', { name: 'About Us' }).click();
  await expect(page.getByRole('navigation')).toBeHidden();
  await expect(page.locator('#about')).toBeFocused();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.locator('.landing-v2').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#coming-soon');
  await expect(page.getByRole('heading', { name: 'Coming Soon', exact: true })).toBeInViewport();
  await page.getByRole('link', { name: 'OharaAI home' }).first().click();
  await page.addStyleTag({ content: '.landing-v2{height:auto;overflow:visible}body,#root{height:auto!important;overflow:visible!important}' });
  await page.screenshot({ path: `${screenshots}/mobile.png`, fullPage: true });
});
