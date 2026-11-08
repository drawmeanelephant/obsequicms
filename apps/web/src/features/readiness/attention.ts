import type { ReadinessItem } from '@obsequious/contracts';
import type { Displayed } from './staleness';
import {
  deploymentStaleness,
  generatedStaleness,
  observationStaleness,
} from './staleness';

/**
 * Decides whether a readiness item needs attention. A missing or stale
 * check is never a pass: unchecked-but-expected items, failures, manual
 * reviews owed, provider errors, and evidence that no longer matches the
 * displayed revision or release all count.
 */
export function needsAttention(
  item: ReadinessItem,
  displayed: Displayed,
): boolean {
  if (item.configuration === 'not_configured') {
    return true;
  }
  if (item.observation.status === 'error') {
    return true;
  }
  if (item.observation.status === 'complete') {
    if (
      item.observation.verdict === 'failed' ||
      item.observation.verdict === 'needs_review'
    ) {
      return true;
    }
  }
  if (
    item.observation.status === 'not_checked' &&
    (item.generated !== null || item.deployment !== null || item.configuration === 'configured')
  ) {
    return true;
  }
  return (
    observationStaleness(item.observation, displayed).isStale ||
    generatedStaleness(item, displayed).isStale ||
    deploymentStaleness(item, displayed).isStale
  );
}

export const READINESS_CATEGORY_ORDER = [
  'discovery',
  'identity',
  'measurement',
  'trust',
] as const;

export type ReadinessCategory =
  (typeof READINESS_CATEGORY_ORDER)[number];

export const READINESS_CATEGORY_LABELS: Record<ReadinessCategory, string> = {
  discovery: 'Discovery and indexing',
  identity: 'Identity and sharing',
  measurement: 'Measurement',
  trust: 'Trust and accessibility',
};
