import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'apps/web/e2e',
  testMatch: '**/*.connected.e2e.ts',
  workers: 1,
  timeout: 30_000,
  outputDir: '.cache/m1/browser-tests',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview --workspace @obsequious/web -- --host 127.0.0.1 --port 4174 --strictPort',
    env: { OBSEQUIOUS_API_PORT: '8789' },
    url: 'http://127.0.0.1:4174/connected.html',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
