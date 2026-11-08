import type { DataScenario, DemoScenarioRecord } from '../types';
import { populatedScenario } from './populated';
import { emptyScenario } from './empty';
import { staleScenario } from './stale';
import { unavailableScenario } from './unavailable';
import { unsupportedScenario } from './unsupported';

/**
 * Scenario records for the five data scenarios. `request-error` is not a
 * data scenario: its client rejects every read with a typed error instead
 * of serving a record, so no fallback data exists to mislead anyone.
 */
export const SCENARIO_RECORDS: Record<DataScenario, DemoScenarioRecord> = {
  populated: populatedScenario,
  empty: emptyScenario,
  stale: staleScenario,
  unavailable: unavailableScenario,
  unsupported: unsupportedScenario,
};
