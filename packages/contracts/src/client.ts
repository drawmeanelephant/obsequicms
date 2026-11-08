import type { JobId, SourcePath, SourceRevision } from './ids';
import type { PageIndex } from './pages';
import type {
  Job,
  SaveSourceRequest,
  SourceBuffer,
  StartJobRequest,
} from './jobs';
import type { ReadinessIndex, SiteSummary } from './readiness';

/**
 * The application-side API boundary (docs/api.md#http-and-client-interface).
 *
 * All methods return promises and reject with {@link ApiError} on failure —
 * a failure never resolves as a successful document. The client exposes a
 * readonly `mode`; a connected failure never changes that mode. P01
 * supplies the demo implementation; P06 and later work supply the real
 * server and HTTP adapter.
 */
export interface ObsequiousClient {
  readonly mode: 'demo' | 'connected';
  getSite(): Promise<SiteSummary>;
  getPages(): Promise<PageIndex>;
  getReadiness(): Promise<ReadinessIndex>;
  getSource(request: {
    path: SourcePath;
    sourceRevision: SourceRevision;
  }): Promise<SourceBuffer>;
  saveSource(
    request: SaveSourceRequest,
    idempotencyKey: string,
  ): Promise<SourceBuffer>;
  startJob(
    request: StartJobRequest,
    idempotencyKey: string,
  ): Promise<{ jobId: JobId }>;
  getJob(jobId: JobId): Promise<Job>;
}

export type ClientMode = ObsequiousClient['mode'];
