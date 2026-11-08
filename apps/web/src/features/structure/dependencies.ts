import type {
  Dependency,
  DependencyEndpoint,
  PageIndex,
} from '@obsequious/contracts';
import type { OutlineResult } from './outline';

/**
 * Pure dependency-views for the inspector. Edges keep the compiler's
 * direction: `incoming` edges point at the page, `outgoing` edges start at
 * it. Source-only endpoints stay source files and are never turned into
 * pages.
 */

export type DependencySide = 'incoming' | 'outgoing';

export type DependencyRow = {
  edge: Dependency;
  side: DependencySide;
};

export function dependenciesFor(
  index: PageIndex,
  entityId: string,
): { incoming: DependencyRow[]; outgoing: DependencyRow[] } {
  const incoming: DependencyRow[] = [];
  const outgoing: DependencyRow[] = [];
  for (const edge of index.dependencies) {
    if (edge.to.type === 'page' && edge.to.entityId === entityId) {
      incoming.push({ edge, side: 'incoming' });
    }
    if (edge.from.type === 'page' && edge.from.entityId === entityId) {
      outgoing.push({ edge, side: 'outgoing' });
    }
  }
  return { incoming, outgoing };
}

export type EndpointDescription = {
  /** `page` endpoints resolve to a page; `source` endpoints stay files. */
  type: 'page' | 'source';
  title: string;
  sublabel: string;
  entityId: string | null;
};

export function describeEndpoint(
  endpoint: DependencyEndpoint,
  pages: OutlineResult['byEntityId'],
): EndpointDescription {
  if (endpoint.type === 'source') {
    return {
      type: 'source',
      title: endpoint.sourcePath,
      sublabel: 'Source file — not a page',
      entityId: null,
    };
  }
  const page = pages.get(endpoint.entityId);
  if (!page) {
    return {
      type: 'page',
      title: endpoint.entityId,
      sublabel: 'Page not present in this index',
      entityId: endpoint.entityId,
    };
  }
  return {
    type: 'page',
    title: page.title,
    sublabel: page.sourcePath,
    entityId: page.entityId,
  };
}
