import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import type { PageIndex, PageSummary } from '@obsequious/contracts';
import { PageIndexSchema, PageSummarySchema } from '@obsequious/contracts';
import { buildOutline, filterOutline } from './outline';
import {
  collectTags,
  EMPTY_FILTERS,
  matchesFilters,
  type StructureFilters,
} from './filters';
import { dependenciesFor, describeEndpoint } from './dependencies';
import { populatedScenario } from '../../demo/scenarios/populated';

function pageIndexFrom(scenario: {
  pages: unknown;
}): PageIndex {
  return PageIndexSchema.parse(scenario.pages);
}

type PageSummaryInput = z.input<typeof PageSummarySchema>;

function page(overrides: Partial<PageSummaryInput>): PageSummary {
  return PageSummarySchema.parse({
    entityId: 'ent-x',
    title: 'X',
    sourcePath: 'content/x.md',
    parentId: null,
    role: 'trunk',
    status: null,
    tags: [],
    publishedUrl: null,
    ...overrides,
  });
}

describe('buildOutline', () => {
  const index = pageIndexFrom(populatedScenario);
  const outline = buildOutline(index.pages);

  it('builds exactly two root trees from explicit parentage', () => {
    expect(outline.roots.map((node) => node.page.entityId)).toEqual([
      'ent-home',
      'ent-guides',
    ]);
  });

  it('nests the full deep chain without consulting folders', () => {
    const guides = outline.roots.find((node) => node.page.entityId === 'ent-guides');
    const ferns = guides?.children.find(
      (child) => child.page.entityId === 'ent-ferns',
    );
    const fernCare = ferns?.children.find(
      (child) => child.page.entityId === 'ent-fern-care',
    );
    const fernSeasons = fernCare?.children.find(
      (child) => child.page.entityId === 'ent-fern-seasons',
    );
    expect(fernSeasons?.page.sourcePath).toBe(
      'content/plant-care/ferns-seasons.md',
    );
  });

  it('never acquires parentage from a folder name that resembles a section', () => {
    const home = outline.roots.find((node) => node.page.entityId === 'ent-home');
    const childIds =
      home?.children.map((child) => child.page.entityId) ?? [];
    // terms and privacy share the content/legal/ folder but are siblings
    // under Welcome, not nested inside one another.
    expect(childIds).toContain('ent-terms');
    expect(childIds).toContain('ent-privacy');
    const terms = home?.children.find(
      (child) => child.page.entityId === 'ent-terms',
    );
    expect(
      terms?.children.some((child) => child.page.entityId === 'ent-privacy'),
    ).toBe(false);
  });

  it('surfaces satellites with missing parents instead of dropping them', () => {
    const orphaned = buildOutline([
      page({ entityId: 'ent-root', title: 'Root' }),
      page({
        entityId: 'ent-lost',
        title: 'Lost',
        parentId: 'ent-missing',
        role: 'satellite',
      }),
    ]);
    expect(orphaned.roots).toHaveLength(1);
    expect(orphaned.detached.map((p) => p.entityId)).toEqual(['ent-lost']);
  });

  it('surfaces parentage cycles instead of hanging or dropping them', () => {
    const cycled = buildOutline([
      page({ entityId: 'ent-a', title: 'A', parentId: 'ent-b', role: 'satellite' }),
      page({ entityId: 'ent-b', title: 'B', parentId: 'ent-a', role: 'satellite' }),
    ]);
    expect(cycled.roots).toHaveLength(0);
    expect(cycled.detached.map((p) => p.entityId).sort()).toEqual([
      'ent-a',
      'ent-b',
    ]);
  });
});

describe('filters', () => {
  const index = pageIndexFrom(populatedScenario);

  it('matches search against title, source path, and identity', () => {
    const byTitle = index.pages.filter((page) =>
      matchesFilters(page, { ...EMPTY_FILTERS, search: 'ferns' }),
    );
    expect(byTitle.length).toBeGreaterThanOrEqual(2);

    const byPath = index.pages.filter((page) =>
      matchesFilters(page, { ...EMPTY_FILTERS, search: 'plant-care' }),
    );
    expect(byPath.map((page) => page.entityId)).toEqual([
      'ent-fern-care',
      'ent-fern-seasons',
    ]);

    const byIdentity = index.pages.filter((page) =>
      matchesFilters(page, { ...EMPTY_FILTERS, search: 'ent-mosses' }),
    );
    expect(byIdentity.map((page) => page.entityId)).toEqual(['ent-mosses']);
  });

  it('treats unset status as its own filter value', () => {
    const unset = index.pages.filter((page) =>
      matchesFilters(page, { ...EMPTY_FILTERS, status: 'unset' }),
    );
    expect(unset.map((page) => page.entityId).sort()).toEqual([
      'ent-fern-seasons',
      'ent-terms',
    ]);
  });

  it('combines search, status, and tag filters', () => {
    const combined: StructureFilters = {
      search: 'fern',
      status: 'draft',
      tag: 'care',
    };
    expect(
      index.pages
        .filter((page) => matchesFilters(page, combined))
        .map((page) => page.entityId),
    ).toEqual(['ent-fern-care']);
  });

  it('collects the sorted unique tag list', () => {
    expect(collectTags(index.pages)).toEqual([
      'care',
      'company',
      'front',
      'legal',
      'plants',
      'section',
      'shade',
    ]);
  });
});

describe('filterOutline', () => {
  const index = pageIndexFrom(populatedScenario);
  const outline = buildOutline(index.pages);

  it('keeps ancestors of matching descendants', () => {
    const filtered = filterOutline(
      outline.roots,
      (page) => page.entityId === 'ent-fern-seasons',
    );
    const chain: string[] = [];
    const walk = (nodes: typeof filtered) => {
      for (const node of nodes) {
        chain.push(node.page.entityId);
        walk(node.children);
      }
    };
    walk(filtered);
    expect(chain).toEqual([
      'ent-guides',
      'ent-ferns',
      'ent-fern-care',
      'ent-fern-seasons',
    ]);
  });
});

describe('dependenciesFor', () => {
  const index = pageIndexFrom(populatedScenario);
  const outline = buildOutline(index.pages);

  it('splits edges by compiler direction around the selected page', () => {
    const ferns = dependenciesFor(index, 'ent-ferns');
    expect(
      ferns.outgoing.map((row) => row.edge.kind).sort(),
    ).toEqual(['include', 'parent', 'reference']);
    expect(ferns.incoming.map((row) => row.edge.kind)).toEqual(['parent']);
  });

  it('describes source-only include endpoints as files, never pages', () => {
    const ferns = dependenciesFor(index, 'ent-ferns');
    const include = ferns.outgoing.find(
      (row) => row.edge.kind === 'include',
    );
    if (!include) throw new Error('include edge missing');
    const description = describeEndpoint(include.edge.to, outline.byEntityId);
    expect(description.type).toBe('source');
    expect(description.title).toBe('content/includes/watering-note.md');
    expect(description.entityId).toBeNull();
  });

  it('resolves page endpoints to titles through the index', () => {
    const about = dependenciesFor(index, 'ent-about');
    const incoming = about.incoming.find(
      (row) => row.edge.kind === 'reference',
    );
    if (!incoming) throw new Error('reference edge missing');
    const description = describeEndpoint(incoming.edge.from, outline.byEntityId);
    expect(description.type).toBe('page');
    expect(description.title).toBe('Ferns of the valley');
  });
});
