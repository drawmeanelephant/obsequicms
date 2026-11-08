import type { z } from 'zod';
import type {
  PageIndexSchema,
  ReadinessIndexSchema,
  ReadinessItemSchema,
  SiteSummarySchema,
} from '@obsequious/contracts';

/**
 * Demo scenario declarations (docs/work-packets.md#p01-shared-contracts-and-demo-data).
 *
 * Every record here is synthetic. No network request, file mutation,
 * compiler execution, or real verification happens in the demo client, and
 * the client mode is always `demo`.
 */

export const DEMO_SCENARIOS = [
  'populated',
  'empty',
  'stale',
  'unavailable',
  'unsupported',
  'request-error',
] as const;

export type DemoScenario = (typeof DEMO_SCENARIOS)[number];

export type DataScenario = Exclude<DemoScenario, 'request-error'>;

/**
 * Scenario inputs in their unbranded form. `createDemoClient` validates
 * each record through the shared contracts, so malformed demo data fails
 * loudly instead of rendering.
 */
export type DemoScenarioRecord = {
  site: z.input<typeof SiteSummarySchema>;
  pages: z.input<typeof PageIndexSchema>;
  readiness: z.input<typeof ReadinessIndexSchema>;
  /** Raw source bytes keyed by source path; shown raw, never parsed. */
  sources: Readonly<Record<string, string>>;
};

/** A readiness item in its unbranded scenario-input form. */
export type ReadinessItemInput = z.input<typeof ReadinessItemSchema>;
