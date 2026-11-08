import type {
  Observation,
  ReadinessItem,
  ReleaseId,
  SourceRevision,
} from '@obsequious/contracts';

/**
 * Staleness is derived by comparing what an observation or artifact names
 * as its subject with what the workspace currently displays
 * (docs/api.md#readiness). Time-based expiration follows a later
 * checker-specific policy and is deliberately not invented here.
 */

export type Displayed = {
  sourceRevision: SourceRevision;
  releaseId: ReleaseId | null;
};

export type Staleness = {
  isStale: boolean;
  reason: string | null;
};

const fresh: Staleness = { isStale: false, reason: null };

function stale(reason: string): Staleness {
  return { isStale: true, reason };
}

function revisionLabel(revision: SourceRevision | null): string {
  return revision === null ? 'unknown revision' : `revision ${revision}`;
}

/** A complete observation is stale when its subject is not what is displayed. */
export function observationStaleness(
  observation: Observation,
  displayed: Displayed,
): Staleness {
  if (observation.status !== 'complete') {
    return fresh;
  }
  const { subject } = observation;
  if (
    subject.sourceRevision !== null &&
    subject.sourceRevision !== displayed.sourceRevision
  ) {
    return stale(
      `Observed for ${revisionLabel(subject.sourceRevision)}, but the displayed source is ${revisionLabel(displayed.sourceRevision)}.`,
    );
  }
  if (
    subject.releaseId !== null &&
    subject.releaseId !== displayed.releaseId
  ) {
    return stale(
      `Observed for release ${subject.releaseId}, but the displayed release is ${displayed.releaseId ?? 'none'}.`,
    );
  }
  return fresh;
}

/** Generated artifacts name the source revision that produced them. */
export function generatedStaleness(
  item: ReadinessItem,
  displayed: Displayed,
): Staleness {
  if (item.generated === null) {
    return fresh;
  }
  if (item.generated.sourceRevision !== displayed.sourceRevision) {
    return stale(
      `Generated for ${revisionLabel(item.generated.sourceRevision)}, but the displayed source is ${revisionLabel(displayed.sourceRevision)}.`,
    );
  }
  return fresh;
}

/** A deployment record is stale when it names a different release. */
export function deploymentStaleness(
  item: ReadinessItem,
  displayed: Displayed,
): Staleness {
  if (item.deployment === null) {
    return fresh;
  }
  if (item.deployment.releaseId !== displayed.releaseId) {
    return stale(
      `Deployed as release ${item.deployment.releaseId}, but the displayed release is ${displayed.releaseId ?? 'none'}.`,
    );
  }
  return fresh;
}
