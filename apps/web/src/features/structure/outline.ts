import type { PageSummary } from '@obsequious/contracts';

/**
 * Pure outline construction. Parentage comes from validated
 * `parentId` records only — never from source folders, titles, or path
 * prefixes (docs/work-packets.md#p03-pages-and-structure-workspace).
 */

export type OutlineNode = {
  page: PageSummary;
  children: OutlineNode[];
};

export type OutlineResult = {
  /** Trees rooted at trunk pages, in index order. */
  roots: OutlineNode[];
  /**
   * Pages that cannot be placed under a root: satellites whose parentId
   * is missing from the index, and pages trapped in a parentage cycle.
   * Surfaced instead of silently dropped.
   */
  detached: PageSummary[];
  byEntityId: Map<string, PageSummary>;
};

export function buildOutline(pages: PageSummary[]): OutlineResult {
  const byEntityId = new Map(pages.map((page) => [page.entityId, page]));
  const childrenOf = new Map<string, PageSummary[]>();
  const rootPages: PageSummary[] = [];
  const detached: PageSummary[] = [];

  for (const page of pages) {
    if (page.parentId === null) {
      rootPages.push(page);
    } else if (!byEntityId.has(page.parentId)) {
      detached.push(page);
    } else {
      const siblings = childrenOf.get(page.parentId) ?? [];
      siblings.push(page);
      childrenOf.set(page.parentId, siblings);
    }
  }

  const built = new Map<string, OutlineNode>();
  const inProgress = new Set<string>();
  const buildNode = (page: PageSummary): OutlineNode | null => {
    const cached = built.get(page.entityId);
    if (cached) {
      return cached;
    }
    if (inProgress.has(page.entityId)) {
      // buildNode is already in progress up the stack: a parentage cycle.
      return null;
    }
    inProgress.add(page.entityId);
    const children = (childrenOf.get(page.entityId) ?? [])
      .map(buildNode)
      .filter((child): child is OutlineNode => child !== null);
    const node: OutlineNode = { page, children };
    built.set(page.entityId, node);
    inProgress.delete(page.entityId);
    return node;
  };

  const roots: OutlineNode[] = [];
  for (const root of rootPages) {
    const node = buildNode(root);
    if (node) {
      roots.push(node);
    }
  }
  for (const page of pages) {
    // Anything never reached from a root (or already detached) is
    // trapped in a cycle and cannot be placed in the tree.
    const node = built.get(page.entityId);
    if (!node && !detached.includes(page)) {
      detached.push(page);
    }
  }

  return { roots, detached, byEntityId };
}

/**
 * Filters an outline: a node survives when it matches or when any
 * descendant matches; ancestors of matches stay visible so parentage
 * context is preserved.
 */
export function filterOutline(
  nodes: OutlineNode[],
  matches: (page: PageSummary) => boolean,
): OutlineNode[] {
  const keep = (node: OutlineNode): OutlineNode | null => {
    const children = node.children
      .map(keep)
      .filter((child): child is OutlineNode => child !== null);
    if (matches(node.page) || children.length > 0) {
      return { page: node.page, children };
    }
    return null;
  };
  return nodes
    .map(keep)
    .filter((node): node is OutlineNode => node !== null);
}
