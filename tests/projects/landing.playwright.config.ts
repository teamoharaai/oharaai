import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['landing.spec.ts'],
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://localhost:4281', browserName: 'chromium', headless: true },
  webServer: {
    command: 'CI=1 EXPO_PUBLIC_SUPABASE_URL=https://projects-preview.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=preview-only npm run web -- --port 4281 --clear',
    port: 4281,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
