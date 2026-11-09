import { defineConfig } from 'vitest/config';

/**
 * The explicit real-compiler gate (docs/work-packets.md#p06-real-compiler-adapter-proof).
 *
 * Run via `npm run test:boris` with
 * `BORIS_BIN=/absolute/path/to/pinned/boris`. A missing or incompatible
 * binary fails the gate; it is never silently skipped. This config includes
 * only the gate file, keeping real compiler runs separate from the
 * executable-stub process tests in the standard suite.
 */
export default defineConfig({
  test: {
    name: 'boris-gate',
    environment: 'node',
    include: ['apps/server/test/boris/*-gate.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
