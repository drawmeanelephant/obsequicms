import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  acceptsCompilerId,
  assertEntityIdSafe,
  EXPECTED_COMPILER_ID,
  parseBuildInfo,
  parseVersionOutput,
} from '../../src/boris/identity.js';
import {
  ArtifactError,
  parseCompletion,
  parseDocumentationIntelligenceReport,
  parseHtmlBuildReport,
  parseIrBuildReport,
  parseIrGraph,
  parseIrManifest,
} from '../../src/boris/artifacts.js';

const CAPTURED_DIR = join(
  fileURLToPath(new URL('.', import.meta.url)),
  'fixtures',
  'captured',
);

async function readCaptured(name: string): Promise<unknown> {
  return JSON.parse(await readFile(join(CAPTURED_DIR, name), 'utf8'));
}

describe('compiler id acceptance', () => {
  it('accepts the base id and variant-suffixed ids', () => {
    expect(acceptsCompilerId('boris/0.9.0')).toBe(true);
    expect(acceptsCompilerId('boris/0.9.0+cooklang')).toBe(true);
    expect(acceptsCompilerId('boris/0.9.0+semantic-relations')).toBe(true);
  });

  it('rejects other versions and near-miss strings without substring matching', () => {
    expect(acceptsCompilerId('boris/0.8.2')).toBe(false);
    expect(acceptsCompilerId('boris/0.9.01')).toBe(false);
    expect(acceptsCompilerId('boris/0.9.0-x')).toBe(false);
    expect(acceptsCompilerId('boris/0.9.0 plus')).toBe(false);
    expect(acceptsCompilerId('xboris/0.9.0')).toBe(false);
    expect(acceptsCompilerId('boris/0.9.0+semantic-relations+extra')).toBe(
      true,
    );
    expect(EXPECTED_COMPILER_ID).toBe('boris/0.9.0');
  });
});

describe('identity document parsing', () => {
  it('parses a one-line version output', () => {
    expect(parseVersionOutput('boris/0.9.0\n')).toBe('boris/0.9.0');
    expect(parseVersionOutput('boris/0.9.0')).toBe('boris/0.9.0');
  });

  it('rejects multi-line or empty version output', () => {
    expect(() => parseVersionOutput('boris/0.9.0\nextra\n')).toThrow(
      /exactly one line/,
    );
    expect(() => parseVersionOutput('')).toThrow(/exactly one line/);
  });

  it('parses the boris-build-info provenance document', () => {
    const info = parseBuildInfo(
      '{"format": "boris-build-info", "schemaVersion": "1", "version": "boris/0.9.0", "vcsRevision": "c50d8622"}\n',
    );
    expect(info.format).toBe('boris-build-info');
    expect(info.version).toBe('boris/0.9.0');
    // The revision token is opaque provenance text, never compared to a
    // full commit id.
    expect(info.vcsRevision).toBe('c50d8622');
  });

  it('rejects a wrong discriminator, schema version, or shape', () => {
    expect(() =>
      parseBuildInfo('{"format": "other", "schemaVersion": "1"}'),
    ).toThrow(/discriminator/);
    expect(() =>
      parseBuildInfo('{"format": "boris-build-info", "schemaVersion": "2"}'),
    ).toThrow(/schemaVersion/);
    expect(() =>
      parseBuildInfo(
        '{"format": "boris-build-info", "schemaVersion": "1", "version": 9, "vcsRevision": ""}',
      ),
    ).toThrow(/version is not a string/);
    expect(() => parseBuildInfo('not json')).toThrow(/non-JSON/);
  });
});

describe('entity id argv boundary', () => {
  it('passes opaque compiler ids through', () => {
    expect(() => assertEntityIdSafe('guides/ferns')).not.toThrow();
    expect(() => assertEntityIdSafe('index')).not.toThrow();
    expect(() => assertEntityIdSafe('a.b-c_d/e')).not.toThrow();
  });

  it('rejects flag injection and control characters', () => {
    expect(() => assertEntityIdSafe('--input')).toThrow(/flag injection/);
    expect(() => assertEntityIdSafe('-x')).toThrow(/flag injection/);
    expect(() => assertEntityIdSafe('id\u0000hidden')).toThrow(/control/);
    expect(() => assertEntityIdSafe('id\n--bogus')).toThrow(/control/);
    expect(() => assertEntityIdSafe('')).toThrow(/non-empty/);
    expect(() => assertEntityIdSafe('x'.repeat(256))).toThrow(/255-byte/);
  });
});

describe('adapter against real captured producer artifacts', () => {
  it('parses the captured manifest from the pinned binary', async () => {
    const manifest = parseIrManifest(
      await readCaptured('manifest.json'),
      'captured/manifest.json',
    );
    expect(manifest.schemaVersion).toBe('0.2.0');
    expect(manifest.compiler).toBe('boris/0.9.0');
    expect(manifest.pageCount).toBe(4);
    expect(manifest.pages.map((page) => page.id)).toEqual([
      'about',
      'guides/ferns',
      'guides/ferns-care',
      'index',
    ]);
    expect(manifest.pages[2]).toMatchObject({
      role: 'satellite',
      parent: 'guides/ferns',
      status: 'draft',
    });
  });

  it('establishes producer edge direction from the captured graph', async () => {
    const graph = parseIrGraph(
      await readCaptured('graph.json'),
      'captured/graph.json',
    );
    expect(graph.schemaVersion).toBe('0.2.0');
    expect(graph.frozen).toBe(true);

    // Parent edge: from the satellite, to its parent page.
    const parentEdges = graph.edges.filter((edge) => edge.kind === 'parent');
    expect(parentEdges).toContainEqual({
      from: { type: 'page', value: 'guides/ferns-care' },
      to: { type: 'page', value: 'guides/ferns' },
      kind: 'parent',
    });
    expect(parentEdges).toContainEqual({
      from: { type: 'page', value: 'guides/ferns' },
      to: { type: 'page', value: 'index' },
      kind: 'parent',
    });

    // Include edge: from the page, to a source endpoint — and the included
    // file is never promoted to a page node.
    expect(graph.edges).toContainEqual({
      from: { type: 'page', value: 'guides/ferns' },
      to: { type: 'source', value: 'includes/watering-note.md' },
      kind: 'include',
    });
    expect(
      graph.nodes.some((node) => node.id === 'includes/watering-note.md'),
    ).toBe(false);

    // Reference edge: from the referencing page, to the referenced page.
    expect(graph.edges).toContainEqual({
      from: { type: 'page', value: 'index' },
      to: { type: 'page', value: 'guides/ferns' },
      kind: 'reference',
    });
  });

  it('parses the captured completion index and build report', async () => {
    const completion = parseCompletion(
      await readCaptured('completion.json'),
      'captured/completion.json',
    );
    expect(completion.format).toBe('boris-completion-index');
    expect(completion.schemaVersion).toBe(1);
    expect(completion.compilerId).toBe('boris/0.9.0');

    const report = parseIrBuildReport(
      await readCaptured('build-report.json'),
      'captured/build-report.json',
    );
    expect(report.ok).toBe(true);
    expect(report.errorCount).toBe(0);
    expect(report.diagnostics).toEqual([]);
  });

  it('parses the captured HTML and documentation-intelligence reports', async () => {
    const html = parseHtmlBuildReport(
      await readCaptured('html.json'),
      'captured/html.json',
    );
    expect(html.schemaVersion).toBe('html-build-report-0.2.0');
    expect(html.compilerId).toBe('boris/0.9.0');
    expect(html.ok).toBe(true);
    expect(html.vcsRevision).toBe('c50d8622');

    // validate --report emits the same html-build-report schema as build.
    const validate = parseHtmlBuildReport(
      await readCaptured('validate.json'),
      'captured/validate.json',
    );
    expect(validate.ok).toBe(true);
    expect(validate.diagnostics).toEqual([]);

    for (const name of ['check.json', 'impact.json']) {
      const report = parseDocumentationIntelligenceReport(
        await readCaptured(name),
        `captured/${name}`,
      );
      expect(report.format).toBe('boris-documentation-intelligence');
      expect(report.compiler).toBe('boris/0.9.0');
    }
  });
});

describe('documentation-intelligence report bodies', () => {
  it('preserves the full captured check report payload', async () => {
    const report = parseDocumentationIntelligenceReport(
      await readCaptured('check.json'),
      'captured/check.json',
    );
    expect(report.input).toBe('content');
    expect(report.summary).toEqual({
      pages: 4,
      roots: 1,
      satellites: 3,
      sourceEndpoints: 1,
      edgeCounts: {
        incoming: {
          pages: { parent: 3, include: 0, reference: 4 },
          sources: { parent: 0, include: 1, reference: 0 },
        },
        outgoing: {
          pages: { parent: 3, include: 1, reference: 4 },
          sources: { parent: 0, include: 0, reference: 0 },
        },
      },
      unreferencedPages: 1,
      hotspots: 0,
    });
    expect(report.nodes).toEqual([
      { type: 'page', id: 'about', sourcePath: 'about.md', parent: 'index' },
      {
        type: 'page',
        id: 'guides/ferns',
        sourcePath: 'guides/ferns.md',
        parent: 'index',
      },
      {
        type: 'page',
        id: 'guides/ferns-care',
        sourcePath: 'guides/ferns-care.md',
        parent: 'guides/ferns',
      },
      { type: 'page', id: 'index', sourcePath: 'index.md', parent: null },
    ]);
    expect(report.edges).toHaveLength(8);
    expect(report.edges).toContainEqual({
      from: { type: 'page', value: 'guides/ferns' },
      to: { type: 'source', value: 'includes/watering-note.md' },
      kind: 'include',
    });
    expect(report.sourceLocations).toEqual([
      {
        type: 'page',
        value: 'about',
        sourcePath: 'about.md',
        line: 1,
        column: 1,
      },
      {
        type: 'page',
        value: 'guides/ferns',
        sourcePath: 'guides/ferns.md',
        line: 1,
        column: 1,
      },
      {
        type: 'page',
        value: 'guides/ferns-care',
        sourcePath: 'guides/ferns-care.md',
        line: 1,
        column: 1,
      },
      {
        type: 'page',
        value: 'index',
        sourcePath: 'index.md',
        line: 1,
        column: 1,
      },
    ]);
    expect(report.pages).toEqual([
      { id: 'about', parent: 'index' },
      { id: 'guides/ferns', parent: 'index' },
      { id: 'guides/ferns-care', parent: 'guides/ferns' },
      { id: 'index', parent: null },
    ]);
    expect(report.sources).toEqual(['includes/watering-note.md']);
    // The compiler's actual finding, not just a header.
    expect(report.findings).toEqual([
      {
        code: 'unreferenced_page',
        type: 'page',
        value: 'index',
        count: 0,
        sourcePath: 'index.md',
        line: 1,
        column: 1,
      },
    ]);
    // A check report has no impact result.
    expect(report.impact).toBeNull();
    expect(report.diagnostics).toEqual([]);
  });

  it('preserves the captured impact result with the actual affected pages', async () => {
    const report = parseDocumentationIntelligenceReport(
      await readCaptured('impact.json'),
      'captured/impact.json',
    );
    expect(report.impact).toEqual([
      { type: 'page', value: 'about' },
      { type: 'page', value: 'guides/ferns-care' },
      { type: 'page', value: 'index' },
    ]);
    // Impact reports still carry the graph-health findings.
    expect(report.findings).toEqual([
      {
        code: 'unreferenced_page',
        type: 'page',
        value: 'index',
        count: 0,
        sourcePath: 'index.md',
        line: 1,
        column: 1,
      },
    ]);
  });

  it('rejects malformed analysis payloads instead of returning partial results', async () => {
    const base = await readCaptured('check.json');
    const mutate = (field: string, value: unknown): Record<string, unknown> => ({
      ...(base as Record<string, unknown>),
      [field]: value,
    });
    expect(() =>
      parseDocumentationIntelligenceReport(mutate('findings', 'no'), 'p'),
    ).toThrow(/findings is not an array/);
    expect(() =>
      parseDocumentationIntelligenceReport(
        mutate('findings', [{ type: 'page', value: 'x', count: 0 }]),
        'p',
      ),
    ).toThrow(/"code" is not a string/);
    expect(() =>
      parseDocumentationIntelligenceReport(
        mutate('findings', [
          {
            code: 'flat_graph',
            type: 'layout',
            value: 'corpus',
            count: 0,
            sourcePath: null,
            line: null,
            column: null,
          },
        ]),
        'p',
      ),
    ).toThrow(/finding type "layout" is not page, source, or graph/);
    expect(() =>
      parseDocumentationIntelligenceReport(
        mutate('findings', [
          {
            code: 'flat_graph',
            type: 'graph',
            value: 'corpus',
            count: -1,
            sourcePath: null,
            line: null,
            column: null,
          },
        ]),
        'p',
      ),
    ).toThrow(/negative/);
    expect(() =>
      parseDocumentationIntelligenceReport(mutate('impact', 'nope'), 'p'),
    ).toThrow(/impact is neither null nor an array/);
    expect(() =>
      parseDocumentationIntelligenceReport(
        mutate('impact', [{ type: 'graph', value: 'corpus' }]),
        'p',
      ),
    ).toThrow(/endpoint type "graph" is not page or source/);
    expect(() =>
      parseDocumentationIntelligenceReport(mutate('nodes', 'no'), 'p'),
    ).toThrow(/nodes is not an array/);
    expect(() =>
      parseDocumentationIntelligenceReport(mutate('edges', 'no'), 'p'),
    ).toThrow(/edges is not an array/);
    expect(() =>
      parseDocumentationIntelligenceReport(
        mutate('sourceLocations', [
          {
            type: 'page',
            value: 'index',
            sourcePath: 'index.md',
            line: 0,
            column: 1,
          },
        ]),
        'p',
      ),
    ).toThrow(/1-based position/);
    expect(() =>
      parseDocumentationIntelligenceReport(
        mutate('summary', { ...(base as { summary: object }).summary, pages: -2 }),
        'p',
      ),
    ).toThrow(/negative/);
    expect(() =>
      parseDocumentationIntelligenceReport(mutate('sources', [7]), 'p'),
    ).toThrow(/source name is not a string/);
  });

  it('rejects unknown documentation-intelligence schema versions', async () => {
    const base = (await readCaptured('check.json')) as Record<
      string,
      unknown
    >;
    try {
      parseDocumentationIntelligenceReport(
        { ...base, schemaVersion: '0.3.0' },
        'p',
      );
      expect.unreachable('0.3.0 must not parse');
    } catch (error) {
      const artifactError = error as ArtifactError;
      expect(artifactError.kind).toBe('unsupported_version');
      expect(artifactError.observedVersion).toBe('0.3.0');
    }
  });
});

describe('adapter rejections', () => {
  const baseManifest = {
    schemaVersion: '0.2.0',
    compiler: 'boris/0.9.0',
    contentRoot: 'content',
    pageCount: 1,
    pages: [
      {
        index: 0,
        id: 'index',
        sourcePath: 'index.md',
        role: 'trunk',
        parent: null,
        title: null,
        status: null,
      },
    ],
  };

  it('rejects conditional and unknown IR versions without reinterpreting them', () => {
    for (const version of ['0.3.0', '0.4.0', '0.9.9', '0.1.0']) {
      const document = { ...baseManifest, schemaVersion: version };
      try {
        parseIrGraph(document, 'test/graph.json');
        expect.unreachable(`${version} must not parse`);
      } catch (error) {
        expect(error).toBeInstanceOf(ArtifactError);
        const artifactError = error as ArtifactError;
        expect(artifactError.kind).toBe('unsupported_version');
        expect(artifactError.observedVersion).toBe(version);
      }
    }
    // The 0.4.0 message names the conditional facet instead of silently
    // returning an empty successful graph.
    try {
      parseIrGraph({ ...baseManifest, schemaVersion: '0.4.0' }, 'p');
    } catch (error) {
      expect((error as ArtifactError).message).toMatch(/conditional IR/);
    }
  });

  it('rejects unknown producer versions on every artifact family', () => {
    expect(() =>
      parseIrManifest({ ...baseManifest, compiler: 'boris/0.8.2' }, 'p'),
    ).toThrow(/boris\/0.8.2/);
    expect(() =>
      parseCompletion(
        { format: 'boris-completion-index', schema_version: 2, compiler_id: 'boris/0.9.0' },
        'p',
      ),
    ).toThrow(/schema_version 2/);
    expect(() =>
      parseCompletion(
        { format: 'not-completion', schema_version: 1, compiler_id: 'boris/0.9.0' },
        'p',
      ),
    ).toThrow(/format/);
    expect(() =>
      parseHtmlBuildReport(
        { schemaVersion: 'html-build-report-0.3.0', compilerId: 'boris/0.9.0', ok: true, errorCount: 0, diagnostics: [] },
        'p',
      ),
    ).toThrow(/html-build-report-0.3.0/);
    expect(() =>
      parseDocumentationIntelligenceReport(
        { format: 'something-else', schemaVersion: '0.2.0', compiler: 'boris/0.9.0' },
        'p',
      ),
    ).toThrow(/format/);
  });

  it('rejects structurally invalid artifacts', () => {
    expect(() =>
      parseIrGraph({ ...baseManifest, frozen: false }, 'p'),
    ).toThrow(/not frozen/);
    expect(() =>
      parseIrManifest({ ...baseManifest, pageCount: 2 }, 'p'),
    ).toThrow(/pageCount/);
    expect(() =>
      parseIrManifest(
        {
          ...baseManifest,
          pages: [
            { ...baseManifest.pages[0], index: 3 },
          ],
        },
        'p',
      ),
    ).toThrow(/position/);
    expect(() =>
      parseIrGraph(
        {
          schemaVersion: '0.2.0',
          frozen: true,
          nodes: [],
          edges: [
            {
              from: { type: 'page', value: 'a' },
              to: { type: 'page', value: 'b' },
              kind: 'layout',
            },
          ],
        },
        'p',
      ),
    ).toThrow(/edge kind/);
    expect(() =>
      parseIrManifest({ ...baseManifest, pages: [{ ...baseManifest.pages[0], status: 'scheduled' }] }, 'p'),
    ).toThrow(/status/);
    expect(() => parseIrManifest('not an object', 'p')).toThrow(
      /not a JSON object/,
    );
    expect(() =>
      parseIrManifest({ ...baseManifest, pages: 'no' }, 'p'),
    ).toThrow(/pages is not an array/);
  });

  it('rejects a build report that is not ok on a successful run', () => {
    const report = parseIrBuildReport(
      {
        schemaVersion: '0.2.0',
        compiler: 'boris/0.9.0',
        ok: false,
        contentRoot: 'content',
        outDir: '.obsequious/ir',
        pageCount: 0,
        errorCount: 1,
        diagnostics: [
          {
            severity: 'error',
            code: 'EPARENTMISSING',
            message: 'parent "x" does not exist',
            remediation: 'Create the parent document or fix the parent id',
            sourcePath: 'broken.md',
            line: 3,
            column: 1,
            id: 'broken',
          },
        ],
      },
      'p',
    );
    expect(report.ok).toBe(false);
    expect(report.diagnostics[0]?.code).toBe('EPARENTMISSING');
    expect(report.diagnostics[0]?.line).toBe(3);
  });
});
