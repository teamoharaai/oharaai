import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'workspace.spec.ts',
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: { browserName: 'chromium', headless: true },
  webServer: {
    command: 'CI=1 EXPO_PUBLIC_SUPABASE_URL=https://goals-preview.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=preview-only npm run web -- --port 4181',
    port: 4181,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
