import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Section } from '@astryxdesign/core/Section';
import { Text } from '@astryxdesign/core/Text';
import type {
  ObsequiousClient,
  PageIndex,
  PageSummary,
  Problem,
} from '@obsequious/contracts';
import {
  dependenciesFor,
  describeEndpoint,
} from './dependencies';
import type { OutlineResult } from './outline';
import { StatusBadge } from './StatusBadge';
import { SourcePreview } from './SourcePreview';

export type PageInspectorProps = {
  client: ObsequiousClient;
  index: PageIndex;
  page: PageSummary;
  pages: OutlineResult['byEntityId'];
  onSelect: (entityId: string) => void;
};

function problemLocation(problem: Problem): string {
  const where = [problem.sourcePath, problem.line, problem.column]
    .map((part) => (part === null ? null : String(part)))
    .filter((part): part is string => part !== null);
  return where.length > 0 ? where.join(':') : 'Location unknown';
}

function ProblemRow({ problem }: { problem: Problem }) {
  const variant =
    problem.severity === 'error'
      ? 'error'
      : problem.severity === 'warning'
        ? 'warning'
        : 'info';
  return (
    <li className="structure-problem">
      <Badge variant={variant} label={problem.severity} />
      <span>
        {problem.message}
        {problem.code ? ` (${problem.code})` : ''}{' '}
        <Text type="supporting" color="secondary">
          {problemLocation(problem)} · origin: {problem.origin}
        </Text>
      </span>
    </li>
  );
}

/**
 * The relationship inspector. Identity, source location, parentage, and
 * the public URL are separate facts and are displayed separately. Edges
 * keep the compiler's direction; source-only include endpoints are shown
 * as source files, never as pages. Selecting pages or dependencies does
 * not save anything.
 */
export function PageInspector({
  client,
  index,
  page,
  pages,
  onSelect,
}: PageInspectorProps) {
  const { incoming, outgoing } = dependenciesFor(index, page.entityId);
  const parent = page.parentId !== null ? pages.get(page.parentId) : undefined;
  const pageProblems = index.problems.filter(
    (problem) =>
      problem.sourcePath !== null && problem.sourcePath === page.sourcePath,
  );

  const renderRows = (rows: typeof incoming) =>
    rows.map(({ edge, side }) => {
      const endpoint =
        side === 'incoming'
          ? describeEndpoint(edge.from, pages)
          : describeEndpoint(edge.to, pages);
      return (
        <li
          key={`${side}-${edge.kind}-${endpoint.title}`}
          className="structure-dependency"
        >
          <Badge variant="neutral" label={edge.kind} />
          {endpoint.entityId ? (
            <Button
              variant="ghost"
              size="sm"
              label={endpoint.title}
              onClick={() => onSelect(endpoint.entityId as string)}
            />
          ) : (
            <Text type="code">{endpoint.title}</Text>
          )}
          <Text type="supporting" color="secondary">
            {endpoint.sublabel}
          </Text>
        </li>
      );
    });

  return (
    <aside aria-label="Page inspector" className="structure-inspector">
      <Section variant="section">
        <Heading level={2}>{page.title}</Heading>
        <StatusBadge status={page.status} />
        {page.tags.length > 0 ? (
          <Text type="supporting">Tags: {page.tags.join(', ')}</Text>
        ) : (
          <Text type="supporting">No tags</Text>
        )}

        <MetadataList label={{ position: 'top' }} columns={1}>
          <MetadataListItem label="Identity (entity ID)">
            <Text type="code">{page.entityId}</Text>
          </MetadataListItem>
          <MetadataListItem label="Source location">
            <Text type="code">{page.sourcePath}</Text>
          </MetadataListItem>
          <MetadataListItem label="Parent page">
            {parent ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  label={`Select ${parent.title}`}
                  onClick={() => onSelect(parent.entityId)}
                />
                <Text type="supporting">
                  {parent.title} · {parent.entityId}
                </Text>
              </>
            ) : (
              <Text>None — this page is a trunk root.</Text>
            )}
          </MetadataListItem>
          <MetadataListItem label="Public URL">
            {page.publishedUrl ? (
              <Text>{page.publishedUrl}</Text>
            ) : (
              <Text>Unknown — no release provides a route mapping.</Text>
            )}
          </MetadataListItem>
          <MetadataListItem label="Role">
            <Text>
              {page.role === 'trunk'
                ? 'Trunk (root page)'
                : 'Satellite (has a parent)'}
            </Text>
          </MetadataListItem>
        </MetadataList>
      </Section>

      <Section variant="section">
        <Heading level={3}>Incoming dependencies ({incoming.length})</Heading>
        {incoming.length > 0 ? (
          <ul className="structure-dependency-list">{renderRows(incoming)}</ul>
        ) : (
          <Text type="supporting">
            Nothing in this graph points at this page.
          </Text>
        )}
        <Heading level={3}>Outgoing dependencies ({outgoing.length})</Heading>
        {outgoing.length > 0 ? (
          <ul className="structure-dependency-list">{renderRows(outgoing)}</ul>
        ) : (
          <Text type="supporting">
            This page points at nothing in this graph.
          </Text>
        )}
        <Text type="supporting" color="secondary">
          Edges are shown in the compiler's direction. Source-file endpoints
          are includes, not pages.
        </Text>
      </Section>

      <Section variant="section">
        <Heading level={3}>Problems on this page ({pageProblems.length})</Heading>
        {pageProblems.length > 0 ? (
          <ul className="structure-problem-list">
            {pageProblems.map((problem, position) => (
              <ProblemRow
                key={`${problem.code ?? 'problem'}-${position}`}
                problem={problem}
              />
            ))}
          </ul>
        ) : (
          <Text type="supporting">No problems reference this page.</Text>
        )}
      </Section>

      {index.state === 'current' ? (
        <SourcePreview client={client} index={index} page={page} />
      ) : (
        <Section variant="section">
          <Heading level={3}>Source file</Heading>
          <Text type="supporting">
            The raw source preview is available only while the graph is
            current. This {index.state} graph may not match the source on
            disk, so no preview is shown.
          </Text>
        </Section>
      )}
    </aside>
  );
}

export default PageInspector;
