import { defineConfig } from '@playwright/test';

const port = 4173;

export default defineConfig({
  // Browser tests are any *.e2e.ts below apps/web, including co-located
  // feature test folders (docs/api.md#prototype-composition).
  testDir: 'apps/web',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    // Serves the production build of the real application entry point on
    // the loopback interface only.
    command:
      'npm run build --workspace @obsequious/web && npm run preview --workspace @obsequious/web -- --host 127.0.0.1 --port 4173 --strictPort',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
