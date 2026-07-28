import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: '.',
  testMatch: /constellation\.acceptance\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  outputDir: './test-results',
  reporter: process.env.CI ? 'github' : 'list',
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.008,
      scale: 'css',
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${PORT}`,
    colorScheme: 'light',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: [
      'CI=1',
      'EXPO_PUBLIC_SUPABASE_URL=https://constellation-acceptance.invalid',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY=constellation-acceptance-key',
      `npm run preview:constellation -- --port=${PORT}`,
    ].join(' '),
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
