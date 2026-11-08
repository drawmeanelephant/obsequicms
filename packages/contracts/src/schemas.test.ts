import { describe, expect, it } from 'vitest';
import {
  ApiError,
  DependencyEndpointSchema,
  ErrorResponseSchema,
  JobSchema,
  ObservationSchema,
  ObservationSubjectSchema,
  PageIndexSchema,
  PageSummarySchema,
  SaveSourceRequestSchema,
  SourceBufferSchema,
  SourcePathSchema,
  StartJobRequestSchema,
  TimestampSchema,
} from './index';

const REV_A = '018f0a2b-1111-7000-8000-000000000001';
const REV_B = '018f0a2b-2222-7000-8000-000000000002';
const HASH =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

function parseOrThrow(schema: { parse: (v: unknown) => unknown }, value: unknown): unknown {
  return schema.parse(value);
}

describe('PageSummary role and parent coherence', () => {
  const base = {
    entityId: 'ent-a',
    title: 'A',
    sourcePath: 'content/a.md',
    status: null,
    tags: [],
    publishedUrl: null,
  };

  it('accepts a trunk record with a null parent', () => {
    expect(
      PageSummarySchema.parse({ ...base, parentId: null, role: 'trunk' }),
    ).toMatchObject({ role: 'trunk', parentId: null });
  });

  it('accepts a satellite record with a parent', () => {
    expect(
      PageSummarySchema.parse({ ...base, parentId: 'ent-b', role: 'satellite' }),
    ).toMatchObject({ role: 'satellite' });
  });

  it('rejects a trunk record with a parent ID', () => {
    expect(() =>
      PageSummarySchema.parse({ ...base, parentId: 'ent-b', role: 'trunk' }),
    ).toThrow(/Trunk records require a null parent/);
  });

  it('rejects a satellite record without a parent ID', () => {
    expect(() =>
      PageSummarySchema.parse({ ...base, parentId: null, role: 'satellite' }),
    ).toThrow(/Satellite records require a parent ID/);
  });
});

describe('PageIndex state variants', () => {
  const base = {
    sourceRevision: REV_A,
    pages: [],
    dependencies: [],
    problems: [],
  };

  it('accepts current data when graphRevision equals sourceRevision', () => {
    expect(() =>
      PageIndexSchema.parse({ ...base, state: 'current', graphRevision: REV_A }),
    ).not.toThrow();
  });

  it('rejects current data whose graphRevision differs from sourceRevision', () => {
    expect(() =>
      PageIndexSchema.parse({ ...base, state: 'current', graphRevision: REV_B }),
    ).toThrow(/graphRevision to equal sourceRevision/);
  });

  it('rejects stale data without a graph revision', () => {
    expect(() =>
      PageIndexSchema.parse({ ...base, state: 'stale', graphRevision: null }),
    ).toThrow(/non-null earlier graph revision/);
  });

  it('rejects stale data whose graphRevision equals sourceRevision', () => {
    expect(() =>
      PageIndexSchema.parse({ ...base, state: 'stale', graphRevision: REV_A }),
    ).toThrow(/differ from sourceRevision/);
  });

  it('rejects unavailable data that still presents a graph revision, pages, or dependencies', () => {
    expect(() =>
      PageIndexSchema.parse({
        ...base,
        state: 'unavailable',
        graphRevision: REV_A,
      }),
    ).toThrow(/must not present a graph revision/);
    expect(() =>
      PageIndexSchema.parse({
        ...base,
        state: 'unavailable',
        graphRevision: null,
        pages: [
          {
            entityId: 'ent-a',
            title: 'A',
            sourcePath: 'content/a.md',
            parentId: null,
            role: 'trunk',
            status: null,
            tags: [],
            publishedUrl: null,
          },
        ],
      }),
    ).toThrow(/must not present pages/);
  });

  it('rejects unsupported data that presents a graph revision', () => {
    expect(() =>
      PageIndexSchema.parse({
        ...base,
        state: 'unsupported',
        graphRevision: REV_B,
      }),
    ).toThrow(/must not present a graph revision/);
  });
});

describe('Dependency endpoints', () => {
  it('accepts page and source endpoints', () => {
    expect(
      DependencyEndpointSchema.parse({ type: 'page', entityId: 'ent-a' }),
    ).toMatchObject({ type: 'page' });
    expect(
      DependencyEndpointSchema.parse({
        type: 'source',
        sourcePath: 'content/includes/note.md',
      }),
    ).toMatchObject({ type: 'source' });
  });

  it('rejects malformed discriminators', () => {
    expect(() =>
      DependencyEndpointSchema.parse({ type: 'folder', path: 'content/x' }),
    ).toThrow();
    expect(() => DependencyEndpointSchema.parse({ type: 'page' })).toThrow();
  });
});

describe('Request schemas reject unknown fields', () => {
  it('rejects unknown fields on SaveSourceRequest', () => {
    expect(() =>
      SaveSourceRequestSchema.parse({
        path: 'content/a.md',
        expectedSourceRevision: REV_A,
        expectedFileHash: HASH,
        content: 'body',
        force: true,
      }),
    ).toThrow();
  });

  it('rejects unknown fields and unknown kinds on StartJobRequest', () => {
    expect(() =>
      StartJobRequestSchema.parse({
        kind: 'validate',
        sourceRevision: REV_A,
        extra: 1,
      }),
    ).toThrow();
    expect(() =>
      StartJobRequestSchema.parse({
        kind: 'publish',
        sourceRevision: REV_A,
      }),
    ).toThrow();
  });
});

describe('Observation contract', () => {
  const completeBase = {
    status: 'complete',
    verdict: 'passed',
    evidenceId: '018f0a2b-3333-7000-8000-000000000003',
    method: 'compiler',
    observedAt: '2026-11-01T09:00:00Z',
    subject: { sourceRevision: REV_A, releaseId: null, url: null },
  };

  it('accepts a complete passed observation with evidence', () => {
    expect(() => ObservationSchema.parse(completeBase)).not.toThrow();
  });

  it('rejects a passed observation without evidence', () => {
    const { evidenceId: _omit, ...withoutEvidence } = completeBase;
    expect(() => ObservationSchema.parse(withoutEvidence)).toThrow();
  });

  it('rejects a subject with no identifier at all', () => {
    expect(() =>
      ObservationSubjectSchema.parse({
        sourceRevision: null,
        releaseId: null,
        url: null,
      }),
    ).toThrow(/requires at least one/);
  });

  it('rejects unknown observation statuses', () => {
    expect(() =>
      ObservationSchema.parse({ status: 'assumed', verdict: 'passed' }),
    ).toThrow();
  });
});

describe('Job state constraints', () => {
  const result = (outcome: string, exitCode: number | null) => ({
    outcome,
    exitCode,
    problems: [],
    artifacts: [],
  });

  const base = {
    id: '018f0a2b-4444-7000-8000-000000000004',
    kind: 'index',
    sourceRevision: REV_A,
  };

  it('rejects a queued job that already has a start time', () => {
    expect(() =>
      JobSchema.parse({
        ...base,
        state: 'queued',
        startedAt: '2026-11-01T09:00:00Z',
        finishedAt: null,
        result: null,
      }),
    ).toThrow(/no start time/);
  });

  it('rejects a running job that already has a result', () => {
    expect(() =>
      JobSchema.parse({
        ...base,
        state: 'running',
        startedAt: '2026-11-01T09:00:00Z',
        finishedAt: null,
        result: result('success', 0),
      }),
    ).toThrow(/no finish time or result/);
  });

  it('rejects a succeeded job with a nonzero exit code', () => {
    expect(() =>
      JobSchema.parse({
        ...base,
        state: 'succeeded',
        startedAt: '2026-11-01T09:00:00Z',
        finishedAt: '2026-11-01T09:01:00Z',
        result: result('success', 2),
      }),
    ).toThrow(/success outcome and exit code 0/);
  });

  it('rejects a failed job with a success outcome', () => {
    expect(() =>
      JobSchema.parse({
        ...base,
        state: 'failed',
        startedAt: '2026-11-01T09:00:00Z',
        finishedAt: '2026-11-01T09:01:00Z',
        result: result('success', 0),
      }),
    ).toThrow(/non-success outcome/);
  });

  it('rejects a cancelled job without a terminated outcome', () => {
    expect(() =>
      JobSchema.parse({
        ...base,
        state: 'cancelled',
        startedAt: null,
        finishedAt: '2026-11-01T09:01:00Z',
        result: result('content', 1),
      }),
    ).toThrow(/terminated outcome/);
  });

  it('accepts each well-formed state', () => {
    expect(
      JobSchema.parse({
        ...base,
        state: 'queued',
        startedAt: null,
        finishedAt: null,
        result: null,
      }),
    ).toMatchObject({ state: 'queued' });
    expect(
      JobSchema.parse({
        ...base,
        state: 'succeeded',
        startedAt: '2026-11-01T09:00:00Z',
        finishedAt: '2026-11-01T09:01:00Z',
        result: result('success', 0),
      }),
    ).toMatchObject({ state: 'succeeded' });
  });
});

describe('Source contracts', () => {
  const bufferBase = {
    path: 'content/a.md',
    sourceRevision: REV_A,
    fileHash: HASH,
  };

  it('accepts a well-formed source buffer', () => {
    expect(() =>
      SourceBufferSchema.parse({ ...bufferBase, content: '# A\n' }),
    ).not.toThrow();
  });

  it('rejects content above the 8 MiB UTF-8 byte limit', () => {
    const big = 'x'.repeat(8 * 1024 * 1024 + 1);
    expect(() =>
      SourceBufferSchema.parse({ ...bufferBase, content: big }),
    ).toThrow(/8 MiB/);
  });
});

describe('Common values', () => {
  it('rejects paths outside content/ and traversal attempts', () => {
    expect(() => SourcePathSchema.parse('../etc/passwd.md')).toThrow();
    expect(() => SourcePathSchema.parse('/etc/passwd.md')).toThrow();
    expect(() => SourcePathSchema.parse('content/../secrets.md')).toThrow();
    expect(() => SourcePathSchema.parse('content/a.txt')).toThrow();
    expect(() => SourcePathSchema.parse('content//a.md')).toThrow();
    expect(SourcePathSchema.parse('content/deep/a.md')).toBe(
      'content/deep/a.md',
    );
  });

  it('rejects uppercase file hashes', () => {
    const hashSchema = SaveSourceRequestSchema.shape.expectedFileHash;
    expect(() =>
      parseOrThrow(
        hashSchema,
        'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD',
      ),
    ).toThrow();
  });

  it('requires UTC ISO 8601 timestamps', () => {
    expect(() => TimestampSchema.parse('2026-11-01T09:00:00Z')).not.toThrow();
    expect(() => TimestampSchema.parse('2026-11-01 09:00:00')).toThrow();
    expect(() => TimestampSchema.parse('yesterday')).toThrow();
  });

  it('builds ApiError with a null request ID for client-side failures', () => {
    const error = new ApiError('unavailable', 'network down');
    expect(error.code).toBe('unavailable');
    expect(error.requestId).toBeNull();
    expect(error.message).toBe('network down');
    expect(error.name).toBe('ApiError');
  });

  it('validates the error response shape', () => {
    expect(
      ErrorResponseSchema.parse({
        error: { code: 'not_found', message: 'missing' },
        requestId: 'req-1',
      }),
    ).toMatchObject({ requestId: 'req-1' });
    expect(() =>
      ErrorResponseSchema.parse({
        error: { code: 'nonsense', message: 'missing' },
        requestId: null,
      }),
    ).toThrow();
  });
});
