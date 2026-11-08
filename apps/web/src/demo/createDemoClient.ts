import {
  ApiError,
  PageIndexSchema,
  ReadinessIndexSchema,
  SiteSummarySchema,
  SourceBufferSchema,
  SourcePathSchema,
  type Job,
  type JobId,
  type ObsequiousClient,
  type PageIndex,
  type ReadinessIndex,
  type SaveSourceRequest,
  type SiteSummary,
  type SourceBuffer,
  type SourcePath,
  type SourceRevision,
  type StartJobRequest,
} from '@obsequious/contracts';
import { SCENARIO_RECORDS } from './scenarios';
import type { DemoScenario } from './types';

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const property of Object.values(value as Record<string, unknown>)) {
      deepFreeze(property);
    }
    Object.freeze(value);
  }
  return value;
}

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Creates the demo `ObsequiousClient` for a named scenario
 * (docs/api.md#http-and-client-interface).
 *
 * Scenario records are validated through the shared contracts at creation
 * time, so malformed demo data fails loudly instead of rendering. The
 * client performs no network requests, file mutations, or compiler
 * executions; its mode is always `demo`. Read methods return frozen
 * records. Write methods and job lookups reject with a typed
 * `unsupported` error.
 */
export function createDemoClient(scenario: DemoScenario): ObsequiousClient {
  if (scenario === 'request-error') {
    // Async so callers observe a rejected promise, never a synchronous throw.
    const failure = async (): Promise<never> => {
      throw new ApiError(
        'unavailable',
        'Network request failed before a response arrived (demo scenario).',
      );
    };
    return {
      mode: 'demo',
      getSite: failure,
      getPages: failure,
      getReadiness: failure,
      getSource: failure,
      saveSource: failure,
      startJob: failure,
      getJob: failure,
    };
  }

  const record = SCENARIO_RECORDS[scenario];
  const site: SiteSummary = deepFreeze(SiteSummarySchema.parse(record.site));
  const pages: PageIndex = deepFreeze(PageIndexSchema.parse(record.pages));
  const readiness: ReadinessIndex = deepFreeze(
    ReadinessIndexSchema.parse(record.readiness),
  );

  const hashes = new Map<string, Promise<string>>();
  const fileHashFor = (sourcePath: SourcePath, content: string) => {
    const existing = hashes.get(sourcePath);
    if (existing) {
      return existing;
    }
    const digest = crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(content))
      .then(bytesToHex);
    hashes.set(sourcePath, digest);
    return digest;
  };

  const notStored = (code: 'invalid_request' | 'not_found', message: string) =>
    new ApiError(code, `${message} (demo scenario)`);

  return {
    mode: 'demo',

    async getSite(): Promise<SiteSummary> {
      return site;
    },

    async getPages(): Promise<PageIndex> {
      return pages;
    },

    async getReadiness(): Promise<ReadinessIndex> {
      return readiness;
    },

    async getSource(request: {
      path: SourcePath;
      sourceRevision: SourceRevision;
    }): Promise<SourceBuffer> {
      let sourcePath: SourcePath;
      try {
        sourcePath = SourcePathSchema.parse(request.path);
      } catch {
        throw notStored(
          'invalid_request',
          'The requested source path is not a valid content/ Markdown path',
        );
      }
      if (request.sourceRevision !== site.sourceRevision) {
        throw notStored(
          'not_found',
          `No stored source for revision ${request.sourceRevision}`,
        );
      }
      const content = record.sources[sourcePath];
      if (content === undefined) {
        throw notStored('not_found', `No source stored at ${sourcePath}`);
      }
      const fileHash = await fileHashFor(sourcePath, content);
      return deepFreeze(
        SourceBufferSchema.parse({
          path: sourcePath,
          sourceRevision: site.sourceRevision,
          fileHash,
          content,
        }),
      );
    },

    async saveSource(
      _request: SaveSourceRequest,
      _idempotencyKey: string,
    ): Promise<SourceBuffer> {
      throw new ApiError(
        'unsupported',
        'Saving source is not implemented in the demo prototype',
      );
    },

    async startJob(
      _request: StartJobRequest,
      _idempotencyKey: string,
    ): Promise<{ jobId: JobId }> {
      throw new ApiError(
        'unsupported',
        'Starting jobs is not implemented in the demo prototype',
      );
    },

    async getJob(_jobId: JobId): Promise<Job> {
      throw new ApiError(
        'unsupported',
        'Job lookup is not implemented in the demo prototype',
      );
    },
  };
}
