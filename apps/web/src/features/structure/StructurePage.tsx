import { useEffect, useMemo, useState } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import {
  isApiError,
  type ObsequiousClient,
  type Problem,
} from '@obsequious/contracts';
import { Selector } from '@astryxdesign/core/Selector';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Section } from '@astryxdesign/core/Section';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { PageInspector } from './PageInspector';
import { OutlineView } from './OutlineView';
import { InventoryView } from './InventoryView';
import {
  collectTags,
  EMPTY_FILTERS,
  hasActiveFilters,
  matchesFilters,
  STATUS_FILTERS,
  type StatusFilter,
  type StructureFilters,
} from './filters';
import { buildOutline, filterOutline } from './outline';
import { usePageIndex } from './usePageIndex';

export type StructurePageProps = {
  /**
   * The injected application client (docs/api.md#prototype-composition).
   * Failures reject with the shared `ApiError`; the page never substitutes
   * demo data for a failed request.
   */
  client: ObsequiousClient;
  /**
   * Which Structure view to open initially. Values are fixed by the
   * prototype composition contract. The default is `outline`.
   */
  initialView?: 'outline' | 'inventory';
};

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All statuses',
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
  unset: 'Unset',
};

function ProblemsSection({ problems }: { problems: Problem[] }) {
  return (
    <Section variant="section" aria-labelledby="structure-problems-heading">
      <Heading level={2} id="structure-problems-heading">
        Compiler problems ({problems.length})
      </Heading>
      <ul className="structure-problem-list">
        {problems.map((problem, position) => (
          <li
            key={`${problem.code ?? 'problem'}-${problem.sourcePath ?? 'index'}-${position}`}
            className="structure-problem"
          >
            <Text>
              {problem.message}
              {problem.code ? ` (${problem.code})` : ''}
            </Text>
            <Text type="supporting" color="secondary">
              {problem.severity} · {problem.sourcePath ?? 'no source location'}
              {problem.line !== null ? `:${problem.line}` : ''} · origin:{' '}
              {problem.origin}
            </Text>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * The Structure workspace: outline and inventory views over one compiler
 * graph, with search, combined filters, page selection, and a
 * relationship inspector. The workspace is read-only: selecting pages and
 * changing filters never saves or modifies anything.
 */
export function StructurePage({
  client,
  initialView = 'outline',
}: StructurePageProps) {
  const { state, reload } = usePageIndex(client);
  const [view, setView] = useState<'outline' | 'inventory'>(initialView);
  const [filters, setFilters] = useState<StructureFilters>(EMPTY_FILTERS);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
    null,
  );

  const outline = useMemo(
    () =>
      state.phase === 'ready' ? buildOutline(state.index.pages) : null,
    [state],
  );

  // Auto-select the first root so the inspector demonstrates itself; the
  // selection is inspection only and saves nothing.
  useEffect(() => {
    if (outline && selectedEntityId === null) {
      const first =
        outline.roots[0]?.page ?? outline.detached[0] ?? null;
      if (first) {
        setSelectedEntityId(first.entityId);
      }
    }
  }, [outline, selectedEntityId]);

  const filtered = useMemo(() => {
    if (state.phase !== 'ready' || !outline) {
      return null;
    }
    const predicate = (page: Parameters<typeof matchesFilters>[0]) =>
      matchesFilters(page, filters);
    return {
      outlineNodes: filterOutline(outline.roots, predicate),
      inventoryPages: state.index.pages.filter(predicate),
    };
  }, [state, outline, filters]);

  const tags = useMemo(
    () => (state.phase === 'ready' ? collectTags(state.index.pages) : []),
    [state],
  );

  const selectedPage =
    state.phase === 'ready' && selectedEntityId !== null
      ? state.index.pages.find((page) => page.entityId === selectedEntityId) ??
        null
      : null;

  let body;
  if (state.phase === 'loading') {
    body = <Spinner size="lg" label="Loading the page graph" />;
  } else if (state.phase === 'error') {
    body = (
      <Banner
        status="error"
        title="The page graph could not be loaded"
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
    if (index.state === 'unavailable' || index.state === 'unsupported') {
      body = (
        <>
          <Banner
            status="error"
            title={
              index.state === 'unavailable'
                ? 'No valid graph is available'
                : 'The producer format is not supported'
            }
            description={
              index.state === 'unavailable'
                ? 'The last compiler run did not produce a valid graph. The application shows no pages rather than presenting an old graph as current.'
                : 'The producer artifact format cannot be read by this prototype, so no graph is presented as valid. This is different from a site that simply has no pages.'
            }
          />
          {index.problems.length > 0 ? (
            <ProblemsSection problems={index.problems} />
          ) : null}
        </>
      );
    } else {
      const isStale = index.state === 'stale';
      body = (
        <>
          {isStale ? (
            <Banner
              status="warning"
              title="This graph is older than the source"
              description={`Showing graph revision ${index.graphRevision} while the source has moved to ${index.sourceRevision}. The views below come from the earlier graph; re-running the compiler would refresh them.`}
            />
          ) : null}
          <HStack wrap="wrap" gap={3}>
            <SegmentedControl
              label="Structure view"
              value={view}
              onChange={(value) => setView(value as 'outline' | 'inventory')}
            >
              <SegmentedControlItem value="outline" label="Outline" />
              <SegmentedControlItem value="inventory" label="Inventory" />
            </SegmentedControl>
            <TextInput
              label="Search pages"
              isLabelHidden
              placeholder="Search title, path, or ID"
              value={filters.search}
              onChange={(value) =>
                setFilters((current) => ({ ...current, search: value }))
              }
              hasClear
              width={240}
            />
            <Selector
              label="Status filter"
              options={[
                ...STATUS_FILTERS.map((status) => ({
                  value: status,
                  label: STATUS_FILTER_LABELS[status],
                })),
              ]}
              value={filters.status}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  status: value as StatusFilter,
                }))
              }
              width={180}
            />
            <Selector
              label="Tag filter"
              options={[
                { value: '__all__', label: 'All tags' },
                ...tags.map((tag) => ({ value: tag, label: tag })),
              ]}
              value={filters.tag ?? '__all__'}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  tag: value === '__all__' ? null : value,
                }))
              }
              width={180}
            />
            {hasActiveFilters(filters) ? (
              <Button
                variant="ghost"
                size="sm"
                label="Clear filters"
                onClick={() => setFilters(EMPTY_FILTERS)}
              />
            ) : null}
          </HStack>

          {index.pages.length === 0 ? (
            <EmptyState
              title="No pages in this publication"
              description="The graph is valid and current but contains no pages. This is different from an unavailable or unsupported producer."
            />
          ) : filtered && filtered.outlineNodes.length === 0 && filtered.inventoryPages.length === 0 ? (
            <EmptyState
              title="No pages match the current search and filters"
              description="Clear the search or the status and tag filters to widen the result."
            />
          ) : (
            <div className="structure-layout">
              <div className="structure-main">
                {filtered && view === 'outline' ? (
                  <OutlineView
                    nodes={filtered.outlineNodes}
                    detached={outline?.detached ?? []}
                    selectedEntityId={selectedEntityId}
                    onSelect={setSelectedEntityId}
                  />
                ) : null}
                {filtered && view === 'inventory' ? (
                  <InventoryView
                    pages={filtered.inventoryPages}
                    selectedEntityId={selectedEntityId}
                    onSelect={setSelectedEntityId}
                  />
                ) : null}
              </div>
              {selectedPage && outline ? (
                <PageInspector
                  client={client}
                  index={index}
                  page={selectedPage}
                  pages={outline.byEntityId}
                  onSelect={setSelectedEntityId}
                />
              ) : null}
            </div>
          )}
        </>
      );
    }
  }

  return (
    <div className="workspace-page">
      <Heading level={1}>Structure</Heading>
      <Text type="supporting" color="secondary" as="p">
        Read-only inspection of the compiler graph. Selecting pages and
        changing filters never saves or modifies source; page identity,
        parentage, and URLs belong to the compiler, not to folders or
        titles.
      </Text>
      {body}
    </div>
  );
}

export default StructurePage;
