import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ArtifactError } from '../../src/boris/artifacts.js';
import {
  buildPreview,
  checkGraph,
  impactOf,
  indexSource,
  validateProfile,
} from '../../src/boris/operations.js';
import { createJobWorkspace, type JobWorkspace } from '../../src/boris/workspace.js';

/**
 * The operation-level outcome/report matrix (docs/boris-integration.md),
 * exercised against the controlled stub instead of the real compiler. The
 * stub runs behind the adapter's fixed argv via OBSEQUIOUS_STUB_SCRIPT; the
 * real compiler proves the same matrix in compiler-gate.test.ts.
 */

const STUB = join(
  fileURLToPath(new URL('.', import.meta.url)),
  'stubs',
  'scripted-stub.mjs',
);

/** A minimal valid documentation-intelligence report (empty one-page site). */
const VALID_CHECK_REPORT = JSON.stringify({
  format: 'boris-documentation-intelligence',
  schemaVersion: '0.2.0',
  compiler: 'boris/0.9.0',
  input: 'content',
  summary: {
    pages: 1,
    roots: 1,
    satellites: 0,
    sourceEndpoints: 0,
    edgeCounts: {
      incoming: {
        pages: { parent: 0, include: 0, reference: 0 },
        sources: { parent: 0, include: 0, reference: 0 },
      },
      outgoing: {
        pages: { parent: 0, include: 0, reference: 0 },
        sources: { parent: 0, include: 0, reference: 0 },
      },
    },
    unreferencedPages: 0,
    hotspots: 0,
  },
  nodes: [{ type: 'page', id: 'index', sourcePath: 'index.md', parent: null }],
  edges: [],
  sourceLocations: [
    { type: 'page', value: 'index', sourcePath: 'index.md', line: 1, column: 1 },
  ],
  pages: [{ id: 'index', parent: null }],
  sources: [],
  findings: [],
  impact: null,
  diagnostics: [],
});

const FAILURE_IR_REPORT = JSON.stringify({
  schemaVersion: '0.2.0',
  compiler: 'boris/0.9.0',
  ok: false,
  pageCount: 0,
  errorCount: 1,
  diagnostics: [
    {
      severity: 'error',
      code: 'EPARENTMISSING',
      message: 'parent "does-not-exist" does not exist',
      remediation: 'Create the parent document or fix the parent id',
      sourcePath: 'broken.md',
      line: 3,
      column: 1,
      id: 'broken',
    },
  ],
});

const FAILURE_HTML_REPORT = JSON.stringify({
  schemaVersion: 'html-build-report-0.2.0',
  compilerId: 'boris/0.9.0',
  vcsRevision: 'c50d8622',
  ok: false,
  errorCount: 1,
  diagnostics: [
    {
      severity: 'error',
      code: 'EPARENTMISSING',
      message: 'parent "does-not-exist" does not exist',
      remediation: 'Create the parent document or fix the parent id',
      sourcePath: 'broken.md',
      line: 3,
      column: 1,
      id: 'broken',
    },
  ],
});

let workspace: JobWorkspace;

beforeAll(async () => {
  workspace = await createJobWorkspace();
});

afterAll(async () => {
  await workspace?.cleanup();
});

/** Runs one operation with the stub executing the given behaviors. */
async function runWithStub<T>(
  behaviors: unknown[],
  operation: () => Promise<T>,
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'obsequious-op-'));
  const scriptPath = join(dir, 'script.json');
  await writeFile(scriptPath, JSON.stringify(behaviors), 'utf8');
  const previous = process.env.OBSEQUIOUS_STUB_SCRIPT;
  process.env.OBSEQUIOUS_STUB_SCRIPT = scriptPath;
  try {
    return await operation();
  } finally {
    if (previous === undefined) {
      delete process.env.OBSEQUIOUS_STUB_SCRIPT;
    } else {
      process.env.OBSEQUIOUS_STUB_SCRIPT = previous;
    }
    await rm(dir, { recursive: true, force: true });
  }
}

describe('operation outcome/report matrix (controlled stub)', () => {
  it('parses a fresh analysis report on success with its full body', async () => {
    const result = await runWithStub(
      [
        {
          writeFile: { path: '.obsequious/check.json', content: VALID_CHECK_REPORT },
        },
        { exit: 0 },
      ],
      () => checkGraph(STUB, workspace),
    );
    expect(result.process.outcome).toBe('success');
    expect(result.failureReport).toBeNull();
    if (!result.artifacts) throw new Error('artifacts missing on success');
    expect(result.artifacts.report.findings).toEqual([]);
    expect(result.artifacts.report.impact).toBeNull();
    expect(result.artifacts.report.summary.pages).toBe(1);
  });

  it('keeps a missing report after a successful run a typed contract violation', async () => {
    // The process succeeded but wrote no report: that is never an empty
    // success and never a content outcome — it is a missing artifact.
    const caught: unknown = await runWithStub([{ exit: 0 }], () =>
      checkGraph(STUB, workspace),
    ).then(
      () => null,
      (reason: unknown) => reason,
    );
    expect(caught).toBeInstanceOf(ArtifactError);
    expect((caught as ArtifactError).kind).toBe('missing');
  });

  it('returns a content outcome without attempting the analysis report read', async () => {
    // A content failure publishes no analysis report; the operation must
    // return the outcome, not throw ArtifactError("missing").
    const result = await runWithStub([{ exit: 1 }], () =>
      checkGraph(STUB, workspace),
    );
    expect(result.process.outcome).toBe('content');
    expect(result.process.exitCode).toBe(1);
    expect(result.artifacts).toBeNull();
    expect(result.failureReport).toBeNull();
  });

  it('never presents a report beside a content outcome, even if a file exists', async () => {
    const result = await runWithStub(
      [
        {
          writeFile: { path: '.obsequious/check.json', content: VALID_CHECK_REPORT },
        },
        { exit: 1 },
      ],
      () => checkGraph(STUB, workspace),
    );
    expect(result.process.outcome).toBe('content');
    expect(result.artifacts).toBeNull();
    expect(result.failureReport).toBeNull();
  });

  it('applies the content-outcome rule to impactOf as well', async () => {
    const result = await runWithStub([{ exit: 1 }], () =>
      impactOf(STUB, workspace, 'index'),
    );
    expect(result.process.outcome).toBe('content');
    expect(result.artifacts).toBeNull();
    expect(result.failureReport).toBeNull();
  });

  it('returns usage and io outcomes without reading anything', async () => {
    const usage = await runWithStub([{ exit: 2 }], () =>
      checkGraph(STUB, workspace),
    );
    expect(usage.process.outcome).toBe('usage');
    expect(usage.artifacts).toBeNull();
    expect(usage.failureReport).toBeNull();

    const io = await runWithStub([{ exit: 3 }], () =>
      impactOf(STUB, workspace, 'index'),
    );
    expect(io.process.outcome).toBe('io');
    expect(io.artifacts).toBeNull();
    expect(io.failureReport).toBeNull();
  });

  it('exposes the fresh IR failure report with located diagnostics on a content outcome', async () => {
    const result = await runWithStub(
      [
        {
          writeFile: {
            path: '.obsequious/ir/build-report.json',
            content: FAILURE_IR_REPORT,
          },
        },
        { exit: 1 },
      ],
      () => indexSource(STUB, workspace),
    );
    expect(result.process.outcome).toBe('content');
    expect(result.artifacts).toBeNull();
    if (!result.failureReport) throw new Error('failure report missing');
    expect(result.failureReport.ok).toBe(false);
    expect(result.failureReport.diagnostics[0]?.code).toBe('EPARENTMISSING');
    expect(result.failureReport.diagnostics[0]?.sourcePath).toBe('broken.md');
    expect(result.failureReport.diagnostics[0]?.line).toBe(3);
  });

  it('rejects an IR failure report that claims ok on a content outcome', async () => {
    await expect(
      runWithStub(
        [
          {
            writeFile: {
              path: '.obsequious/ir/build-report.json',
              content: FAILURE_IR_REPORT.replace('"ok":false', '"ok":true'),
            },
          },
          { exit: 1 },
        ],
        () => indexSource(STUB, workspace),
      ),
    ).rejects.toThrow(/claims ok on a content outcome/);
  });

  it('leaves the IR failure report null when the content run published none', async () => {
    const result = await runWithStub([{ exit: 1 }], () =>
      indexSource(STUB, workspace),
    );
    expect(result.process.outcome).toBe('content');
    expect(result.artifacts).toBeNull();
    expect(result.failureReport).toBeNull();
  });

  it('keeps missing IR artifacts after a successful run a typed violation', async () => {
    const caught: unknown = await runWithStub([{ exit: 0 }], () =>
      indexSource(STUB, workspace),
    ).then(
      () => null,
      (reason: unknown) => reason,
    );
    expect(caught).toBeInstanceOf(ArtifactError);
    expect((caught as ArtifactError).kind).toBe('missing');
  });

  it('exposes the fresh HTML failure report on a content outcome', async () => {
    const preview = await runWithStub(
      [
        {
          writeFile: { path: '.obsequious/html.json', content: FAILURE_HTML_REPORT },
        },
        { exit: 1 },
      ],
      () => buildPreview(STUB, workspace),
    );
    expect(preview.process.outcome).toBe('content');
    expect(preview.artifacts).toBeNull();
    expect(preview.failureReport?.ok).toBe(false);
    expect(preview.failureReport?.diagnostics[0]?.code).toBe('EPARENTMISSING');

    const validate = await runWithStub(
      [
        {
          writeFile: {
            path: '.obsequious/validate.json',
            content: FAILURE_HTML_REPORT,
          },
        },
        { exit: 1 },
      ],
      () => validateProfile(STUB, workspace),
    );
    expect(validate.process.outcome).toBe('content');
    expect(validate.artifacts).toBeNull();
    expect(validate.failureReport?.ok).toBe(false);
  });

  it('returns a usage outcome for the editions-profile refusal without a report', async () => {
    const result = await runWithStub([{ exit: 2 }], () =>
      validateProfile(STUB, workspace),
    );
    expect(result.process.outcome).toBe('usage');
    expect(result.artifacts).toBeNull();
    expect(result.failureReport).toBeNull();
  });
});

describe('operations respect workspace containment', () => {
  it('refuses to run when the report parent is a symlink, leaving the external file untouched', async () => {
    const contained = await createJobWorkspace();
    const external = await mkdtemp(join(tmpdir(), 'op-containment-'));
    const sentinel = join(external, 'check.json');
    await writeFile(sentinel, '{"sentinel": true}', 'utf8');
    await symlink(external, join(contained.root, '.obsequious'), 'dir');
    try {
      // prepareFreshReportFile refuses before any process spawns and
      // before anything is deleted; the sentinel stays byte-identical.
      await expect(checkGraph(STUB, contained)).rejects.toThrow(/symlink/);
      await expect(readFile(sentinel, 'utf8')).resolves.toBe('{"sentinel": true}');
      expect(existsSync(sentinel)).toBe(true);
    } finally {
      await contained.cleanup();
      await rm(external, { recursive: true, force: true });
    }
  });

  it('refuses to read artifacts through a symlinked report file', async () => {
    // The stub "succeeds" and plants a symlinked report file pointing
    // outside the workspace during the run — after preparation removed any
    // stale report and before the adapter's post-run read. The read must
    // surface the containment refusal instead of consuming the external
    // file as this run's evidence.
    const contained = await createJobWorkspace();
    const external = await mkdtemp(join(tmpdir(), 'op-read-'));
    const outside = join(external, 'outside.json');
    await writeFile(outside, '{"external": true}', 'utf8');
    try {
      await expect(
        runWithStub(
          [
            {
              symlink: {
                target: outside,
                path: '.obsequious/check.json',
              },
            },
            { exit: 0 },
          ],
          () => checkGraph(STUB, contained),
        ),
      ).rejects.toThrow(/symlink/);
      // The external file is untouched and was never parsed.
      await expect(readFile(outside, 'utf8')).resolves.toBe('{"external": true}');
    } finally {
      await contained.cleanup();
      await rm(external, { recursive: true, force: true });
    }
  });
});
