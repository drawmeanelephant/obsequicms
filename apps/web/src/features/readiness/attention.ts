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
 *
 * One exception: an explicit, applicable opt-out. A complete
 * `not_applicable` decision whose subject still matches what is displayed
 * is the owner's current evidence-backed decline of the item, so an
 * unconfigured optional item with one does not demand setup. A stale
 * opt-out (its subject names an older revision or release) reopens the
 * question, as does any missing decision.
 */
export function needsAttention(
  item: ReadinessItem,
  displayed: Displayed,
): boolean {
  if (item.configuration === 'not_configured') {
    if (
      item.observation.status === 'complete' &&
      item.observation.verdict === 'not_applicable' &&
      !observationStaleness(item.observation, displayed).isStale
    ) {
      return false;
    }
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
