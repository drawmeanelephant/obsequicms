import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ApiError,
  isApiError,
  READINESS_KEYS,
  type FileHash,
  type JobId,
  type PageIndex,
  type SourcePath,
  type SourceRevision,
} from '@obsequious/contracts';
import { createDemoClient } from './createDemoClient';
import { DEMO_SCENARIOS } from './types';

// Boundary inputs arrive as opaque branded types from the client interface;
// scenario tests cast plain strings through these helpers.
const asPath = (value: string) => value as unknown as SourcePath;
const asRevision = (value: string) => value as unknown as SourceRevision;
const asHash = (value: string) => value as unknown as FileHash;
const asJobId = (value: string) => value as unknown as JobId;

describe('demo client construction', () => {
  it('constructs for every named scenario', () => {
    for (const scenario of DEMO_SCENARIOS) {
      expect(() => createDemoClient(scenario)).not.toThrow();
    }
  });

  it('always reports demo mode', () => {
    for (const scenario of DEMO_SCENARIOS) {
      expect(createDemoClient(scenario).mode).toBe('demo');
    }
  });
});

describe('populated scenario structure', () => {
  const client = createDemoClient('populated');

  it('serves the site with a simulated release', async () => {
    const site = await client.getSite();
    expect(site.name).toContain('demo');
    expect(site.activeReleaseId).not.toBeNull();
  });

  it('has exactly two root pages and a chain at least four levels deep', async () => {
    const index = await client.getPages();
    const roots = index.pages.filter((page) => page.role === 'trunk');
    expect(roots.map((page) => page.entityId)).toEqual([
      'ent-home',
      'ent-guides',
    ]);

    const depth = (entityId: string, seen = new Set<string>()): number => {
      expect(seen.has(entityId)).toBe(false);
      seen.add(entityId);
      const page = index.pages.find((p) => p.entityId === entityId);
      if (!page) return 0;
      return page.parentId ? 1 + depth(page.parentId, seen) : 1;
    };
    expect(depth('ent-fern-seasons')).toBeGreaterThanOrEqual(4);
  });

  it('keeps source folder placement distinct from parentage', async () => {
    const index = await client.getPages();
    const fernCare = index.pages.find((p) => p.entityId === 'ent-fern-care');
    const ferns = index.pages.find((p) => p.entityId === 'ent-ferns');
    expect(fernCare?.sourcePath).toMatch(/^content\/plant-care\//);
    expect(ferns?.sourcePath).toMatch(/^content\/guides\//);
    expect(fernCare?.parentId).toBe('ent-ferns');

    // Sibling pages in one folder stay siblings: the folder name does not
    // acquire parentage.
    const terms = index.pages.find((p) => p.entityId === 'ent-terms');
    const privacy = index.pages.find((p) => p.entityId === 'ent-privacy');
    expect(terms?.sourcePath).toMatch(/^content\/legal\//);
    expect(privacy?.sourcePath).toMatch(/^content\/legal\//);
    expect(terms?.parentId).toBe('ent-home');
    expect(privacy?.parentId).toBe('ent-home');
  });

  it('uses every authored status value and keeps unknown URLs null', async () => {
    const index = await client.getPages();
    const statuses = new Set(index.pages.map((page) => page.status));
    expect(statuses).toEqual(new Set(['draft', 'published', 'archived', null]));

    const drafts = index.pages.filter((page) => page.status === 'draft');
    expect(drafts.length).toBeGreaterThan(0);
    for (const draft of drafts) {
      expect(draft.publishedUrl).toBeNull();
    }

    const withUrls = index.pages.filter((page) => page.publishedUrl !== null);
    expect(withUrls.length).toBeGreaterThan(0);
    expect(withUrls.length).toBeLessThan(index.pages.length);
  });

  it('models a source-only include dependency that is not a page', async () => {
    const index = await client.getPages();
    const includes = index.dependencies.filter(
      (edge) => edge.kind === 'include',
    );
    expect(includes.length).toBeGreaterThan(0);
    for (const edge of includes) {
      expect(edge.from.type).toBe('page');
      expect(edge.to.type).toBe('source');
      const includePath =
        edge.to.type === 'source' ? edge.to.sourcePath : null;
      expect(includePath).toBeTruthy();
      const isPage = index.pages.some(
        (page) => page.sourcePath === includePath,
      );
      expect(isPage).toBe(false);
    }
  });

  it('keeps compiler edges pointing from dependent to dependency', async () => {
    const index: PageIndex = await client.getPages();
    for (const edge of index.dependencies) {
      const { from, to } = edge;
      if (edge.kind === 'parent' && from.type === 'page') {
        const child = index.pages.find((p) => p.entityId === from.entityId);
        expect(child?.parentId).toBe(to.type === 'page' ? to.entityId : null);
      }
    }
  });
});

describe('populated readiness coverage', () => {
  const client = createDemoClient('populated');

  it('covers every readiness key exactly once', async () => {
    const index = await client.getReadiness();
    const keys = index.items.map((item) => item.key).sort();
    expect(keys).toEqual([...READINESS_KEYS].sort());
  });

  it('includes each specified evidence example', async () => {
    const index = await client.getReadiness();
    const byKey = new Map(index.items.map((item) => [item.key, item]));

    const robots = byKey.get('robots');
    expect(robots?.configuration).toBe('configured');
    expect(robots?.generated).toBeNull();
    expect(robots?.observation.status).toBe('not_checked');

    const sitemap = byKey.get('sitemap');
    expect(sitemap?.generated).not.toBeNull();
    expect(sitemap?.deployment).toBeNull();
    expect(sitemap?.observation.status).toBe('not_checked');

    const security = byKey.get('security_contact');
    expect(security?.deployment).not.toBeNull();
    expect(security?.observation.status).toBe('not_checked');

    const canonical = byKey.get('canonical');
    expect(canonical?.observation.status).toBe('complete');
    if (canonical?.observation.status === 'complete') {
      expect(canonical.observation.verdict).toBe('passed');
      expect(canonical.observation.subject.releaseId).toBeDefined();
      expect(canonical.observation.subject.releaseId).not.toBe(
        index.releaseId,
      );
    }

    const social = byKey.get('social_preview');
    if (social?.observation.status === 'complete') {
      expect(social.observation.verdict).toBe('failed');
    }

    const imageAlt = byKey.get('image_alt');
    if (imageAlt?.observation.status === 'complete') {
      expect(imageAlt.observation.verdict).toBe('needs_review');
    }

    const llms = byKey.get('llms');
    if (llms?.observation.status === 'complete') {
      expect(llms.observation.verdict).toBe('not_applicable');
    }

    const analytics = byKey.get('analytics');
    expect(analytics?.observation.status).toBe('error');
  });
});

describe('getSource', () => {
  it('returns content whose fileHash is the SHA-256 of the exact bytes', async () => {
    const client = createDemoClient('populated');
    const site = await client.getSite();
    const index = await client.getPages();
    const page = index.pages[0];
    if (!page) throw new Error('populated fixture must contain pages');

    const buffer = await client.getSource({
      path: page.sourcePath,
      sourceRevision: site.sourceRevision,
    });
    expect(buffer.path).toBe(page.sourcePath);
    expect(buffer.sourceRevision).toBe(site.sourceRevision);
    expect(buffer.fileHash).toBe(
      createHash('sha256').update(buffer.content, 'utf8').digest('hex'),
    );
  });

  it('preserves original line endings, including CRLF', async () => {
    const client = createDemoClient('populated');
    const site = await client.getSite();
    const buffer = await client.getSource({
      path: asPath('content/includes/watering-note.md'),
      sourceRevision: site.sourceRevision,
    });
    expect(buffer.content).toContain('\r\n');
  });

  it('rejects unknown paths and foreign revisions with typed errors', async () => {
    const client = createDemoClient('populated');
    const site = await client.getSite();

    await expect(
      client.getSource({
        path: asPath('content/includes/watering-note.md'),
        sourceRevision: asRevision('019a0000-0000-7cc0-a1b2-c3d4e5f6ffff'),
      }),
    ).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.code === 'not_found',
    );

    await expect(
      client.getSource({
        path: asPath('docs/secret.md'),
        sourceRevision: site.sourceRevision,
      }),
    ).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.code === 'invalid_request',
    );
  });
});

describe('unsupported operations', () => {
  it('rejects saveSource, startJob, and getJob with a typed unsupported error', async () => {
    const client = createDemoClient('populated');

    await expect(
      client.saveSource(
        {
          path: asPath('content/index.md'),
          expectedSourceRevision: asRevision('rev'),
          expectedFileHash: asHash(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
          ),
          content: 'x',
        },
        'key-1',
      ),
    ).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.code === 'unsupported',
    );

    await expect(
      client.startJob(
        { kind: 'validate', sourceRevision: asRevision('rev') },
        'key-2',
      ),
    ).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.code === 'unsupported',
    );

    await expect(client.getJob(asJobId('job-1'))).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.code === 'unsupported',
    );
  });
});

describe('request-error scenario', () => {
  const client = createDemoClient('request-error');

  it('rejects every read with the typed unavailable error and null request ID', async () => {
    await expect(client.getSite()).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      return error.code === 'unavailable' && error.requestId === null;
    });
    await expect(client.getPages()).rejects.toThrow(/demo scenario/);
    await expect(client.getReadiness()).rejects.toThrow();
    await expect(
      client.getSource({
        path: asPath('content/index.md'),
        sourceRevision: asRevision('rev'),
      }),
    ).rejects.toThrow();
  });

  it('serves no fallback data', async () => {
    await expect(client.getPages()).rejects.toSatisfy((error: unknown) => {
      return isApiError(error) && error.code === 'unavailable';
    });
  });
});

describe('scenario distinctions', () => {
  it('empty is a valid current graph with zero pages', async () => {
    const index = await createDemoClient('empty').getPages();
    expect(index.state).toBe('current');
    expect(index.graphRevision).toBe(index.sourceRevision);
    expect(index.pages).toEqual([]);
    expect(index.dependencies).toEqual([]);
  });

  it('stale names an earlier, different graph revision', async () => {
    const index = await createDemoClient('stale').getPages();
    expect(index.state).toBe('stale');
    expect(index.graphRevision).not.toBeNull();
    expect(index.graphRevision).not.toBe(index.sourceRevision);
    expect(index.pages.length).toBeGreaterThan(0);
  });

  it('unavailable and unsupported present no graph and explain why', async () => {
    for (const scenario of ['unavailable', 'unsupported'] as const) {
      const index = await createDemoClient(scenario).getPages();
      expect(index.state).toBe(scenario);
      expect(index.graphRevision).toBeNull();
      expect(index.pages).toEqual([]);
      expect(index.dependencies).toEqual([]);
      expect(index.problems.length).toBeGreaterThan(0);
    }
  });
});
