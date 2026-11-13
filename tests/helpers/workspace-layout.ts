import { expect, type Page } from '@playwright/test';

export async function expectAlignedHomeCards(page: Page) {
  // Independent Home reads can resize cards between protocol calls. Sample one
  // layout frame and wait for the same strict final alignment contract.
  await expect(async () => {
    const boxes = await page.evaluate(() => [
      'Momentum Snapshot card', 'Next Step card', "Calendar and Today's Focus card",
    ].map((label) => {
      const element = document.querySelector(`[aria-label="${label}"]`);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    }));
    const [momentum, next, calendar] = boxes;
    expect(boxes.every(Boolean)).toBe(true);
    expect(Math.abs(momentum!.top - calendar!.top)).toBeLessThan(1);
    expect(Math.abs(next!.bottom - calendar!.bottom)).toBeLessThan(1);
  }).toPass({ timeout: 20_000 });
}
