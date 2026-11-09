import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Browser tests use *.e2e.ts and are discovered by Playwright instead
    // (docs/api.md#prototype-composition). Vitest excludes them everywhere.
    exclude: [...configDefaults.exclude, '**/*.e2e.ts'],
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'apps/server/test/**/*.test.ts',
            'packages/contracts/**/*.test.ts',
          ],
          // The real-compiler gate runs only through `npm run test:boris`
          // (vitest.boris.config.ts) with a required BORIS_BIN. It must not
          // silently skip — or run — in the standard suite.
          exclude: [
            ...configDefaults.exclude,
            '**/*.e2e.ts',
            'apps/server/test/boris/*-gate.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'web',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['apps/web/test/setup.ts'],
          include: [
            'apps/web/src/**/*.test.ts',
            'apps/web/src/**/*.test.tsx',
          ],
        },
      },
    ],
  },
});
