import { DEMO_SCENARIOS, type DemoScenario, type DemoScenarioRecord } from '../demo/types';

export type { DemoScenario };

function isDemoScenario(value: string): value is DemoScenario {
  return (DEMO_SCENARIOS as readonly string[]).includes(value);
}

/**
 * Reads the demo `scenario` query parameter (docs/api.md#prototype-composition).
 * Unknown values fall back to `populated`, the documented default. The
 * demo entry owns this; a connected entry never imports demo scenarios.
 */
export function parseScenario(search: string): DemoScenario {
  const value = new URLSearchParams(search).get('scenario');
  return value !== null && isDemoScenario(value) ? value : 'populated';
}

/** Records are re-exported for type reference; creation stays in demo/. */
export type { DemoScenarioRecord };
