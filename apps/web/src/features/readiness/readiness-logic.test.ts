import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  ReadinessIndexSchema,
  ReadinessItemSchema,
  type ReadinessItem,
  type ReadinessKey,
  type ReleaseId,
  type SourceRevision,
} from '@obsequious/contracts';
import { populatedScenario } from '../../demo/scenarios/populated';
import { staleScenario } from '../../demo/scenarios/stale';
import { needsAttention } from './attention';
import {
  deploymentStaleness,
  generatedStaleness,
  observationStaleness,
} from './staleness';

type ReadinessIndexInput = z.input<typeof ReadinessIndexSchema>;

const populatedIndex = ReadinessIndexSchema.parse(
  populatedScenario.readiness as ReadinessIndexInput,
);

const byKey = new Map(populatedIndex.items.map((item) => [item.key, item]));

const displayed = {
  sourceRevision: populatedIndex.sourceRevision,
  releaseId: populatedIndex.releaseId,
};

function itemWith(
  key: ReadinessKey,
  overrides: Partial<z.input<typeof ReadinessItemSchema>>,
): ReadinessItem {
  const base = byKey.get(key);
  if (!base) throw new Error(`missing fixture item ${key}`);
  return {
    ...base,
    ...overrides,
  } as unknown as ReadinessItem;
}

describe('observation staleness', () => {
  it('marks a passed observation for an older release as stale', () => {
    const canonical = byKey.get('canonical');
    if (!canonical) throw new Error('missing canonical fixture');
    const staleness = observationStaleness(canonical.observation, displayed);
    expect(staleness.isStale).toBe(true);
    expect(staleness.reason).toContain('Observed for release');
  });

  it('marks a source-revision mismatch as stale', () => {
    const index = ReadinessIndexSchema.parse(
      staleScenario.readiness as ReadinessIndexInput,
    );
    const robots = index.items.find((item) => item.key === 'robots');
    if (!robots) throw new Error('missing robots fixture');
    const staleness = observationStaleness(robots.observation, {
      sourceRevision: index.sourceRevision,
      releaseId: index.releaseId,
    });
    expect(staleness.isStale).toBe(true);
    expect(staleness.reason).toContain('displayed source');
  });

  it('keeps a current observation fresh', () => {
    const about = byKey.get('about');
    if (!about) throw new Error('missing about fixture');
    expect(observationStaleness(about.observation, displayed)).toEqual({
      isStale: false,
      reason: null,
    });
  });

  it('cannot derive staleness for non-complete observations', () => {
    const robots = byKey.get('robots');
    if (!robots) throw new Error('missing robots fixture');
    expect(observationStaleness(robots.observation, displayed)).toEqual({
      isStale: false,
      reason: null,
    });
  });
});

describe('generated and deployment staleness', () => {
  it('marks generated artifacts from another revision as stale', () => {
    const sitemap = byKey.get('sitemap');
    if (!sitemap) throw new Error('missing sitemap fixture');
    expect(
      generatedStaleness(sitemap, displayed).isStale,
    ).toBe(false);
    expect(
      generatedStaleness(sitemap, {
        sourceRevision: '019a0000-0000-7cc0-a1b2-c3d4e5f6ffff' as SourceRevision,
        releaseId: displayed.releaseId,
      }).isStale,
    ).toBe(true);
  });

  it('marks a deployment naming a different release as stale, including when none is displayed', () => {
    const sitemap = byKey.get('sitemap');
    if (!sitemap) throw new Error('missing sitemap fixture');
    const deployed = itemWith('sitemap', {
      deployment: {
        releaseId: '019a2f10-3e50-7cc0-a1b2-c3d4e5f60900' as ReleaseId,
        evidenceId: '019a3c50-0003-7cc0-a1b2-c3d4e5f60003' as never,
      },
    });
    expect(deploymentStaleness(deployed, displayed).isStale).toBe(true);
    expect(
      deploymentStaleness(deployed, {
        sourceRevision: displayed.sourceRevision,
        releaseId: null,
      }).isStale,
    ).toBe(true);
  });
});

describe('needsAttention', () => {
  it('counts not-configured items', () => {
    const privacy = byKey.get('privacy');
    if (!privacy) throw new Error('missing privacy fixture');
    expect(needsAttention(privacy, displayed)).toBe(true);
  });

  it('counts error observations and owed manual reviews', () => {
    const analytics = byKey.get('analytics');
    const imageAlt = byKey.get('image_alt');
    if (!analytics || !imageAlt) throw new Error('missing fixtures');
    expect(needsAttention(analytics, displayed)).toBe(true);
    expect(needsAttention(imageAlt, displayed)).toBe(true);
  });

  it('counts deployed-but-never-checked and configured-but-unchecked items', () => {
    const security = byKey.get('security_contact');
    const robots = byKey.get('robots');
    if (!security || !robots) throw new Error('missing fixtures');
    expect(needsAttention(security, displayed)).toBe(true);
    expect(needsAttention(robots, displayed)).toBe(true);
  });

  it('counts stale passing evidence as attention', () => {
    const canonical = byKey.get('canonical');
    if (!canonical) throw new Error('missing canonical fixture');
    expect(needsAttention(canonical, displayed)).toBe(true);
  });

  it('does not count current passes, not-applicable records, or unknown-free items', () => {
    const about = byKey.get('about');
    const llms = byKey.get('llms');
    if (!about || !llms) throw new Error('missing fixtures');
    expect(needsAttention(about, displayed)).toBe(false);
    expect(needsAttention(llms, displayed)).toBe(false);
  });
});
