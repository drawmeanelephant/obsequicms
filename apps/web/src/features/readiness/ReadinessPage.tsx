import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import {
  isApiError,
  type ObsequiousClient,
  type ReadinessItem,
} from '@obsequious/contracts';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Section } from '@astryxdesign/core/Section';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Text } from '@astryxdesign/core/Text';
import { ItemDetail } from './ItemDetail';
import {
  READINESS_CATEGORY_LABELS,
  READINESS_CATEGORY_ORDER,
  needsAttention,
  type ReadinessCategory,
} from './attention';
import {
  deploymentStaleness,
  generatedStaleness,
  observationStaleness,
} from './staleness';
import { useReadiness } from './useReadiness';

export type ReadinessPageProps = {
  /**
   * The injected application client (docs/api.md#prototype-composition).
   * Failures reject with the shared `ApiError`; the page never substitutes
   * demo data for a failed request.
   */
  client: ObsequiousClient;
};

type AttentionFilter = 'all' | 'attention';

function observationBadge(item: ReadinessItem) {
  const { observation } = item;
  if (observation.status === 'not_checked') {
    return <Badge variant="neutral" label="Not checked" />;
  }
  if (observation.status === 'running') {
    return <Badge variant="info" label="Check running" />;
  }
  if (observation.status === 'error') {
    return <Badge variant="error" label="Check error" />;
  }
  const variant =
    observation.verdict === 'passed'
      ? 'success'
      : observation.verdict === 'failed'
        ? 'error'
        : 'neutral';
  return <Badge variant={variant} label={`Verdict: ${observation.verdict}`} />;
}

/**
 * The Site Readiness workspace. Items are grouped by category, filterable
 * by attention, and inspected in a detail panel that keeps configuration,
 * generation, deployment, and observation separate. There is no
 * all-purpose score: these are applicable facts with evidence.
 */
export function ReadinessPage({ client }: ReadinessPageProps) {
  const { state, reload } = useReadiness(client);
  const [attentionFilter, setAttentionFilter] =
    useState<AttentionFilter>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const displayed = useMemo(() => {
    if (state.phase !== 'ready') {
      return null;
    }
    return {
      sourceRevision: state.index.sourceRevision,
      releaseId: state.index.releaseId,
    };
  }, [state]);

  const firstAttentionKey = useMemo(() => {
    if (!displayed) {
      return null;
    }
    const attentionItem = state.phase === 'ready'
      ? state.index.items.find((item) => needsAttention(item, displayed))
      : undefined;
    return attentionItem?.key ?? null;
  }, [state, displayed]);

  // Default the selection to the first item needing attention so the
  // workspace opens on actionable work.
  useEffect(() => {
    if (state.phase === 'ready' && selectedKey === null && firstAttentionKey) {
      setSelectedKey(firstAttentionKey);
    }
  }, [state, selectedKey, firstAttentionKey]);

  let body;
  if (state.phase === 'loading') {
    body = <Spinner size="lg" label="Loading readiness items" />;
  } else if (state.phase === 'error') {
    body = (
      <Banner
        status="error"
        title="Readiness data could not be loaded"
        description={
          isApiError(state.error)
            ? `The data source returned ${state.error.code}: ${state.error.message}`
            : 'The request failed without a typed error. No fallback data is shown.'
        }
        endContent={
          <Button variant="secondary" label="Try again" onClick={reload} />
        }
      />
    );
  } else {
    const { index } = state;
    const assertDisplayed = displayed;
    if (!assertDisplayed) {
      body = null;
    } else {
      const visible = (item: ReadinessItem) =>
        attentionFilter === 'all' || needsAttention(item, assertDisplayed);
      const grouped = READINESS_CATEGORY_ORDER.map((category) => ({
        category,
        items: index.items.filter(
          (item) => item.category === (category as ReadinessCategory) && visible(item),
        ),
      }));

      const selectedItem =
        index.items.find((item) => item.key === selectedKey) ?? null;

      body = (
        <>
          <HStack wrap="wrap" gap={3}>
            <SegmentedControl
              label="Readiness filter"
              value={attentionFilter}
              onChange={(value) =>
                setAttentionFilter(value as AttentionFilter)
              }
            >
              <SegmentedControlItem value="all" label="All items" />
              <SegmentedControlItem
                value="attention"
                label="Needs attention"
              />
            </SegmentedControl>
            <Text type="supporting" color="secondary">
              {index.items.filter((item) => needsAttention(item, assertDisplayed)).length}{' '}
              of {index.items.length} items need attention.
            </Text>
          </HStack>

          <div className="readiness-layout">
            <div className="readiness-main">
              {grouped.map(({ category, items }) =>
                items.length === 0 && attentionFilter === 'attention' ? null : (
                  <Section
                    key={category}
                    variant="section"
                    aria-labelledby={`readiness-group-${category}`}
                  >
                    <Heading level={2} id={`readiness-group-${category}`}>
                      {READINESS_CATEGORY_LABELS[category]} ({items.length})
                    </Heading>
                    {items.length === 0 ? (
                      <Text type="supporting">
                        No items in this category.
                      </Text>
                    ) : (
                      <ul className="readiness-item-list">
                        {items.map((item) => (
                          <li key={item.key}>
                            <button
                              type="button"
                              className="readiness-item"
                              data-selected={
                                item.key === selectedKey || undefined
                              }
                              aria-pressed={item.key === selectedKey}
                              onClick={() => setSelectedKey(item.key)}
                            >
                              <span className="readiness-item-label">
                                {item.label}
                              </span>
                              <span className="readiness-item-badges">
                                {item.configuration === 'not_configured' ? (
                                  <Badge variant="neutral" label="Not set up" />
                                ) : (
                                  <Badge variant="info" label="Configured" />
                                )}
                                {generatedStaleness(item, assertDisplayed).isStale ? (
                                  <Badge variant="warning" label="Generated: stale" />
                                ) : item.generated ? (
                                  <Badge variant="info" label="Generated" />
                                ) : null}
                                {deploymentStaleness(item, assertDisplayed).isStale ? (
                                  <Badge variant="warning" label="Deployed: stale" />
                                ) : item.deployment ? (
                                  <Badge variant="info" label="Deployed" />
                                ) : null}
                                {observationStaleness(
                                  item.observation,
                                  assertDisplayed,
                                ).isStale ? (
                                  <Badge variant="warning" label="Observation: stale" />
                                ) : (
                                  observationBadge(item)
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>
                ),
              )}
            </div>
            {selectedItem ? (
              <ItemDetail item={selectedItem} displayed={assertDisplayed} />
            ) : null}
          </div>
        </>
      );
    }
  }

  return (
    <div className="workspace-page">
      <Heading level={1}>Site readiness</Heading>
      <Text type="supporting" color="secondary" as="p">
        Applicable facts with evidence — configuration, generation,
        deployment, and observation stay separate. There is no readiness
        score, and an old passing observation is shown as stale rather than
        as a pass. Setup and check actions explain that the backend is not
        connected; nothing is executed by this prototype.
      </Text>
      {body}
    </div>
  );
}

export default ReadinessPage;
