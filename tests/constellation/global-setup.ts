import { chromium, expect, type FullConfig } from '@playwright/test';

// A listening Metro port is not a compiled, hydrated app. Keep cold compilation
// in setup rather than spending the first visual test's unchanged 30s budget.
export default async function prepareRootsPreview(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL || new URL(baseURL).hostname !== '127.0.0.1') {
    throw new Error('Roots acceptance setup requires its loopback fixture server.');
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1180, height: 760 } });
    const pageErrors: string[] = [];
    const loadErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') loadErrors.push(message.text());
    });
    page.on('requestfailed', request => loadErrors.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => {
      if (response.status() >= 400) loadErrors.push(`${response.status()}: ${response.url()}`);
    });
    const started = Date.now();
    await page.goto(`${baseURL}/?appearance=light&state=canvas`, { timeout: 120_000 });
    try {
      await expect(page.getByLabel('Constellation graph canvas')).toBeVisible();
    } catch (error) {
      console.error('Roots fixture setup failed', {
        url: page.url(),
        pageErrors,
        loadErrors,
        html: (await page.content()).slice(0, 3000),
        body: (await page.locator('body').innerText()).slice(0, 2000),
      });
      throw error;
    }
    await page.evaluate(async () => { await document.fonts.ready; });
    expect(pageErrors, 'Roots preview must hydrate without uncaught errors.').toEqual([]);
    console.log(`Roots preview compiled and hydrated in ${Date.now() - started}ms.`);
  } finally {
    await browser.close();
  }
}
