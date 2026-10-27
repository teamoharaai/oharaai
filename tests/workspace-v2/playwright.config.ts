import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '..', testMatch: /(?:workspace-v2\/(?:workspace|home|goals|projects|vault|readiness)|landing-v2\/landing|(?:notes|journal)\/library)\.spec\.ts$/, workers: 1, timeout: 90_000,
  expect: { timeout: 20_000 },
  use: { baseURL: 'http://localhost:4291', browserName: 'chromium', headless: true },
  webServer: {
    command: 'CI=1 EXPO_PUBLIC_SUPABASE_URL=https://workspace-preview.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=preview-only npm run web -- --port 4291 --offline',
    port: 4291, reuseExistingServer: !process.env.CI, timeout: 180_000,
  },
});
