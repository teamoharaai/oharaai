import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['library.spec.ts'],
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://localhost:8091', browserName: 'chromium', headless: true },
  webServer: {
    command: 'CI=1 EXPO_PUBLIC_SUPABASE_URL=https://notes-preview.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=preview-only npm run web -- --port 8091 --clear',
    port: 8091,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
