import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['foundation.spec.ts'],
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: { baseURL: 'http://localhost:4284', browserName: 'chromium', headless: true },
  webServer: {
    command: 'CI=1 EXPO_PUBLIC_SUPABASE_URL=https://calendar-preview.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=preview-only npm run web -- --port 4284 --clear',
    port: 4284,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
