import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { closeSync, existsSync, fstatSync, openSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvedCompilerBuild } from '../../src/boris/provenance.js';

import {
  acceptsCompilerId,
  EXPECTED_COMPILER_ID,
  type BorisBuildInfo,
} from '../../src/boris/identity.js';
import {
  buildPreview,
  checkGraph,
  impactOf,
  indexSource,
  readIdentity,
  REPORT_PATHS,
  validateProfile,
} from '../../src/boris/operations.js';
import {
  createJobWorkspace,
  type JobWorkspace,
} from '../../src/boris/workspace.js';

/**
 * The explicit real-compiler gate (docs/work-packets.md#p06-real-compiler-adapter-proof).
 *
 * This file never runs under plain `npm test`; `npm run test:boris` runs it
 * with a required BORIS_BIN. A missing or incompatible binary FAILS this
 * gate — it is never silently skipped, and no stub substitutes for a real
 * run. Provenance is enforced, not just recorded: the binary's SHA-256 must
 * match the committed provenance record.
 */

const FIXTURE_SITE = join(
  fileURLToPath(new URL('.', import.meta.url)),
  'fixtures',
  'site',
);
const EDITIONS_PROFILE = join(
  fileURLToPath(new URL('.', import.meta.url)),
  'fixtures',
  'boris-editions.json',
);

type ProvenanceRecord = {
  format: string;
  schema_version: number;
  compilerId: string;
  sourceRevision: string;
  binary: { sha256: string; buildInfo: BorisBuildInfo };
};

let executable = '';
let provenance: ProvenanceRecord;
let workspace: JobWorkspace;

/** Hashes every file under a directory tree, paths included. */
function hashTree(root: string): string {
  const collected: string[] = [];
  const walkTree = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      const rel = prefix === '' ? entry : `${prefix}/${entry}`;
      const fd = openSync(full, 'r');
      try {
        if (fstatSync(fd).isDirectory()) {
          walkTree(full, rel);
        } else {
          collected.push(
            `${rel}:${createHash('sha256').update(readFileSync(fd)).digest('hex')}`,
          );
        }
      } finally {
        closeSync(fd);
      }
    }
  };
  walkTree(root, '');
  return createHash('sha256').update(collected.join('\n')).digest('hex');
}

beforeAll(async () => {
  const fromEnv = process.env.BORIS_BIN;
  if (!fromEnv) {
    throw new Error(
      'BORIS_BIN is not set. The explicit compiler gate requires ' +
        'BORIS_BIN=/absolute/path/to/pinned/boris — a missing or wrong ' +
        'binary fails this gate rather than silently skipping it.',
    );
  }
  executable = fromEnv;
  if (!existsSync(executable)) {
    throw new Error(`BORIS_BIN does not exist: ${executable}`);
  }
  provenance = approvedCompilerBuild();
  if (
    provenance.format !== 'obsequious-boris-provenance' ||
    provenance.schema_version !== 1
  ) {
    throw new Error('committed provenance record is not the expected format');
  }

  // Provenance enforcement: the binary under test must be the pinned one.
  const bytes = await readFile(executable);
  const digest = createHash('sha256').update(bytes).digest('hex');
  expect(digest).toBe(provenance.binary.sha256);

  // Identity: --version and --build-info must agree with the record.
  const identity = await readIdentity(executable);
  expect(identity.version).toBe(EXPECTED_COMPILER_ID);
  expect(identity.buildInfo.version).toBe(provenance.compilerId);
  // The revision token is opaque provenance text; the full source revision
  // lives in the record. It must be present and non-dirty-looking.
  expect(identity.buildInfo.vcsRevision).not.toBe('');

  workspace = await createJobWorkspace();
  await cp(FIXTURE_SITE, workspace.root, { recursive: true });
});

describe('real compiler gate: identity and provenance', () => {
  it('records the pinned provenance the gate enforces', () => {
    expect(provenance.sourceRevision).toBe(
      'c50d8622bd407bcb5f559a4d7ed5da440a2259ec',
    );
    expect(acceptsCompilerId(provenance.compilerId)).toBe(true);
  });
});

describe('real compiler gate: index operation', () => {
  it('publishes base IR 0.2.0 artifacts for the valid nested fixture', async () => {
    const result = await indexSource(executable, workspace);
    expect(result.process.outcome).toBe('success');
    expect(result.process.exitCode).toBe(0);
    if (!result.artifacts) throw new Error('artifacts missing on success');

    const { manifest, graph, completion, buildReport } = result.artifacts;
    expect(manifest.schemaVersion).toBe('0.2.0');
    expect(manifest.compiler).toBe('boris/0.9.0');
    expect(manifest.pages.map((page) => page.id)).toEqual([
      'about',
      'guides/ferns',
      'guides/ferns-care',
      'index',
    ]);
    // Valid nested pages: a three-level chain under one trunk.
    const byId = new Map(manifest.pages.map((page) => [page.id, page]));
    expect(byId.get('index')?.role).toBe('trunk');
    expect(byId.get('guides/ferns')?.parent).toBe('index');
    expect(byId.get('guides/ferns-care')?.parent).toBe('guides/ferns');

    expect(graph.frozen).toBe(true);
    expect(completion.format).toBe('boris-completion-index');
    expect(completion.schemaVersion).toBe(1);
    expect(buildReport.ok).toBe(true);
  });

  it('establishes producer edge direction from actual artifacts', async () => {
    const result = await indexSource(executable, workspace);
    if (!result.artifacts) throw new Error('artifacts missing on success');
    const { graph } = result.artifacts;

    // Parent edges run from the satellite to its parent page.
    expect(graph.edges).toContainEqual({
      from: { type: 'page', value: 'guides/ferns-care' },
      to: { type: 'page', value: 'guides/ferns' },
      kind: 'parent',
    });
    // The source-only include names a source endpoint and is never a page.
    expect(graph.edges).toContainEqual({
      from: { type: 'page', value: 'guides/ferns' },
      to: { type: 'source', value: 'includes/watering-note.md' },
      kind: 'include',
    });
    expect(
      graph.nodes.some((node) => node.id === 'includes/watering-note.md'),
    ).toBe(false);
    // Reference edges run from the referencing page to the referenced page.
    expect(graph.edges).toContainEqual({
      from: { type: 'page', value: 'index' },
      to: { type: 'page', value: 'guides/ferns' },
      kind: 'reference',
    });
  });

  it('keeps source bytes unchanged across compiler runs', async () => {
    const before = hashTree(join(workspace.root, 'content'));
    await indexSource(executable, workspace);
    await buildPreview(executable, workspace);
    const after = hashTree(join(workspace.root, 'content'));
    expect(after).toBe(before);
  });
});

describe('real compiler gate: analysis and profile operations', () => {
  it('reports graph health with the compiler’s actual findings, not just a header', async () => {
    const result = await checkGraph(executable, workspace);
    expect(result.process.outcome).toBe('success');
    expect(result.failureReport).toBeNull();
    if (!result.artifacts) throw new Error('artifacts missing on success');
    const { report } = result.artifacts;
    expect(report.format).toBe('boris-documentation-intelligence');
    expect(report.compiler).toBe('boris/0.9.0');
    expect(report.input).toBe('content');
    expect(report.summary.pages).toBe(4);
    // The real finding for this fixture, with its source location.
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
    // A check report carries no impact result.
    expect(report.impact).toBeNull();
    expect(report.diagnostics).toEqual([]);
  });

  it('emits the actual affected pages for an impact query', async () => {
    const result = await impactOf(executable, workspace, 'guides/ferns');
    expect(result.process.outcome).toBe('success');
    if (!result.artifacts) throw new Error('artifacts missing on success');
    const { report } = result.artifacts;
    expect(report.compiler).toBe('boris/0.9.0');
    // The producer's sorted transitive dependents of guides/ferns,
    // preserved verbatim by the adapter.
    expect(report.impact).toEqual([
      { type: 'page', value: 'about' },
      { type: 'page', value: 'guides/ferns-care' },
      { type: 'page', value: 'index' },
    ]);
    // The impact query names the queried id without reinterpretation.
    expect(result.process.stdout).toBe('');
  });

  it('preserves a legitimate empty impact result and corpus-level graph findings', async () => {
    // A one-page corpus has no dependents at all: the impact result is a
    // real empty array — never null, never a missing artifact.
    const single = await createJobWorkspace();
    try {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(join(single.root, 'content'), { recursive: true });
      await writeFile(
        join(single.root, 'content', 'index.md'),
        '---\ntitle: Home\n---\n\n# Home\n',
        'utf8',
      );
      const result = await impactOf(executable, single, 'index');
      expect(result.process.outcome).toBe('success');
      if (!result.artifacts) throw new Error('artifacts missing on success');
      expect(result.artifacts.report.impact).toEqual([]);
      // Corpus-level advisories name the whole graph with null locations;
      // the `graph` endpoint type appears only in findings.
      const codes = result.artifacts.report.findings.map((finding) => finding.code);
      expect(codes).toContain('zero_includes');
      expect(codes).toContain('zero_relations');
      const corpusFinding = result.artifacts.report.findings.find(
        (finding) => finding.code === 'zero_includes',
      );
      expect(corpusFinding?.type).toBe('graph');
      expect(corpusFinding?.value).toBe('corpus');
      expect(corpusFinding?.sourcePath).toBeNull();
    } finally {
      await single.cleanup();
    }
  });

  it('reports an unknown impact target as a usage outcome with no report', async () => {
    const result = await impactOf(executable, workspace, 'does-not-exist');
    expect(result.process.outcome).toBe('usage');
    expect(result.process.exitCode).toBe(2);
    expect(result.artifacts).toBeNull();
    expect(result.failureReport).toBeNull();
    expect(result.process.stderr).toMatch(/not found/);
  });

  it('validates the supported single-target HTML profile', async () => {
    const result = await validateProfile(executable, workspace);
    expect(result.process.outcome).toBe('success');
    if (!result.artifacts) throw new Error('artifacts missing on success');
    expect(result.artifacts.report.schemaVersion).toBe(
      'html-build-report-0.2.0',
    );
    expect(result.artifacts.report.ok).toBe(true);
    // The HTML report carries an opaque vcsRevision provenance token.
    expect(result.artifacts.report.vcsRevision).not.toBe('');
  });

  it('builds preview HTML where a draft page renders at its route but stays out of search', async () => {
    const result = await buildPreview(executable, workspace);
    expect(result.process.outcome).toBe('success');
    if (!result.artifacts) throw new Error('artifacts missing on success');
    expect(result.artifacts.report.ok).toBe(true);

    // Default HTML output is not privacy: the draft page is emitted.
    const draftHtml = join(
      workspace.root,
      'dist',
      'guides',
      'ferns-care.html',
    );
    expect(existsSync(draftHtml)).toBe(true);
    const draftBytes = await readFile(draftHtml, 'utf8');
    expect(draftBytes).toContain('Caring for ferns');

    // The same draft is absent from the emitted search index.
    const searchIndex = await readFile(
      join(workspace.root, 'dist', '_boris', 'search', 'search-index.json'),
      'utf8',
    );
    expect(searchIndex).not.toContain('guides/ferns-care');
  });
});

describe('real compiler gate: failure handling', () => {
  it('reports a content failure after an earlier success and never serves the old graph as current', async () => {
    // Earlier success: the graph artifacts exist.
    const success = await indexSource(executable, workspace);
    expect(success.process.outcome).toBe('success');
    expect(existsSync(join(workspace.root, REPORT_PATHS.irDir, 'graph.json'))).toBe(
      true,
    );

    // Introduce a schema-valid-shaped but invalid parent reference.
    await writeFile(
      join(workspace.root, 'content', 'broken.md'),
      '---\ntitle: Broken\nparent: does-not-exist\n---\n\n# Broken\n',
      'utf8',
    );

    const failure = await indexSource(executable, workspace);
    expect(failure.process.outcome).toBe('content');
    expect(failure.process.exitCode).toBe(1);
    // A failed run yields no artifacts: the operation never reads files
    // left by earlier runs, and the compiler removed graph-dependent ones.
    expect(failure.artifacts).toBeNull();
    expect(existsSync(join(workspace.root, REPORT_PATHS.irDir, 'graph.json'))).toBe(
      false,
    );
    expect(existsSync(join(workspace.root, REPORT_PATHS.irDir, 'manifest.json'))).toBe(
      false,
    );

    // The fresh failure report is parsed and exposed with its located
    // diagnostics — without ever presenting a failed graph as valid.
    if (!failure.failureReport) throw new Error('failure report missing');
    expect(failure.failureReport.ok).toBe(false);
    expect(failure.failureReport.errorCount).toBe(1);
    expect(failure.failureReport.diagnostics[0]?.code).toBe('EPARENTMISSING');
    expect(failure.failureReport.diagnostics[0]?.sourcePath).toBe('broken.md');
    expect(failure.failureReport.diagnostics[0]?.line).toBe(3);

    // Restore the valid tree and confirm the next run succeeds again.
    await rm(join(workspace.root, 'content', 'broken.md'), { force: true });
    const recovered = await indexSource(executable, workspace);
    expect(recovered.process.outcome).toBe('success');
    expect(recovered.artifacts?.buildReport.ok).toBe(true);
    expect(recovered.failureReport).toBeNull();
  });

  it('classifies content failures in the analysis operations without missing-artifact exceptions, and recovers after repair', async () => {
    // A page whose parent does not exist: an ordinary content failure.
    await writeFile(
      join(workspace.root, 'content', 'broken.md'),
      '---\ntitle: Broken\nparent: does-not-exist\n---\n\n# Broken\n',
      'utf8',
    );
    try {
      // Graph-dependent analysis publishes no report on a content
      // failure; the operations return the outcome instead of throwing
      // ArtifactError("missing") from a doomed report read.
      const health = await checkGraph(executable, workspace);
      expect(health.process.outcome).toBe('content');
      expect(health.process.exitCode).toBe(1);
      expect(health.artifacts).toBeNull();
      expect(health.failureReport).toBeNull();
      expect(
        existsSync(join(workspace.root, REPORT_PATHS.check)),
      ).toBe(false);

      const impact = await impactOf(executable, workspace, 'index');
      expect(impact.process.outcome).toBe('content');
      expect(impact.artifacts).toBeNull();
      expect(impact.failureReport).toBeNull();

      // The HTML path publishes failure reports on a content outcome;
      // the adapter parses them as failureReport, never as artifacts.
      const preview = await buildPreview(executable, workspace);
      expect(preview.process.outcome).toBe('content');
      expect(preview.artifacts).toBeNull();
      if (!preview.failureReport) throw new Error('failure report missing');
      expect(preview.failureReport.ok).toBe(false);
      expect(preview.failureReport.diagnostics[0]?.code).toBe('EPARENTMISSING');
      expect(preview.failureReport.diagnostics[0]?.sourcePath).toBe('broken.md');

      const validate = await validateProfile(executable, workspace);
      expect(validate.process.outcome).toBe('content');
      expect(validate.artifacts).toBeNull();
      expect(validate.failureReport?.ok).toBe(false);
    } finally {
      // Repair the source: the same operations succeed again and the
      // failure reports disappear.
      await rm(join(workspace.root, 'content', 'broken.md'), { force: true });
    }
    const repairedHealth = await checkGraph(executable, workspace);
    expect(repairedHealth.process.outcome).toBe('success');
    expect(repairedHealth.artifacts?.report.findings.length).toBeGreaterThan(0);
    const repairedImpact = await impactOf(executable, workspace, 'guides/ferns');
    expect(repairedImpact.process.outcome).toBe('success');
    expect(repairedImpact.artifacts?.report.impact).toHaveLength(3);
  });

  it('surfaces an unsupported profile declaration as a usage outcome that names it', async () => {
    // Swap the editions profile in as the fixed profile path.
    await cp(EDITIONS_PROFILE, join(workspace.root, 'boris.json'), {
      force: true,
    });
    try {
      const result = await validateProfile(executable, workspace);
      expect(result.process.outcome).toBe('usage');
      expect(result.process.exitCode).toBe(2);
      expect(result.artifacts).toBeNull();
      // The declaration remains visible: the stderr names editions.ir.
      expect(result.process.stderr).toMatch(/editions\.ir/);
    } finally {
      // Restore the supported profile for any later operation.
      await cp(
        join(FIXTURE_SITE, 'boris.json'),
        join(workspace.root, 'boris.json'),
        { force: true },
      );
    }
  });

  it('never mistakes a stale report for fresh evidence', async () => {
    // Seed a stale report full of nonsense at the validate report path.
    await writeFile(
      join(workspace.root, REPORT_PATHS.validate),
      '{"schemaVersion": "html-build-report-0.1.0", "ok": true}',
      'utf8',
    );
    const result = await validateProfile(executable, workspace);
    expect(result.process.outcome).toBe('success');
    if (!result.artifacts) throw new Error('artifacts missing on success');
    // The stale bytes were removed before the run; the adapter read a
    // freshly written 0.2.0 report.
    expect(result.artifacts.report.schemaVersion).toBe(
      'html-build-report-0.2.0',
    );
  });
});

afterAll(async () => {
  await workspace?.cleanup();
});
