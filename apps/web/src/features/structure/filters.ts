import type { PageSummary } from '@obsequious/contracts';

/**
 * Pure filter logic for both Structure views. Filters combine: a page must
 * match the search text, the status filter, and the tag filter.
 */

export const STATUS_FILTERS = [
  'all',
  'draft',
  'published',
  'archived',
  'unset',
] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export type StructureFilters = {
  search: string;
  status: StatusFilter;
  /** Single selected tag, or null for all tags. */
  tag: string | null;
};

export const EMPTY_FILTERS: StructureFilters = {
  search: '',
  status: 'all',
  tag: null,
};

export function matchesFilters(
  page: PageSummary,
  filters: StructureFilters,
): boolean {
  const search = filters.search.trim().toLowerCase();
  if (search !== '') {
    const haystack =
      `${page.title}\n${page.sourcePath}\n${page.entityId}`.toLowerCase();
    if (!haystack.includes(search)) {
      return false;
    }
  }
  if (filters.status !== 'all') {
    const expected = filters.status === 'unset' ? null : filters.status;
    if (page.status !== expected) {
      return false;
    }
  }
  if (filters.tag !== null && !page.tags.includes(filters.tag)) {
    return false;
  }
  return true;
}

/** Sorted unique tags across the given pages. */
export function collectTags(pages: PageSummary[]): string[] {
  const tags = new Set<string>();
  for (const page of pages) {
    for (const tag of page.tags) {
      tags.add(tag);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

export function hasActiveFilters(filters: StructureFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.status !== 'all' ||
    filters.tag !== null
  );
}
