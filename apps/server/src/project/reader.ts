import { basename, isAbsolute } from 'node:path';
import {
  ApiError,
  isApiError,
  SiteSummarySchema,
  type PageIndex,
  type SiteSummary,
  type SourceBuffer,
  type SourcePath,
  type SourceRevision,
} from '@obsequious/contracts';
import { ArtifactError } from '../boris/artifacts.js';
import { checkGraph, indexSource, validateProfile } from '../boris/operations.js';
import { verifyApprovedCompiler } from '../boris/provenance.js';
import {
  createProjectSnapshot, readSnapshotSource, type ProjectSnapshot,
} from './snapshot.js';
import {
  diagnosticProblem, processProblem, projectPageIndex, unavailableIndex,
} from './projection.js';

export type ReadOnlyProject = {
  getSite(): Promise<SiteSummary>;
  getPages(): Promise<PageIndex>;
  getSource(request: { path: SourcePath; sourceRevision: SourceRevision }): Promise<SourceBuffer>;
  close(): Promise<void>;
};

/** One private operator-selected project, with serial compiler/read operations. */
export class ProjectReader implements ReadOnlyProject {
  private readonly snapshots = new Map<SourceRevision, ProjectSnapshot>();
  private current: PageIndex | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private closed = false;

  constructor(private readonly config: { projectRoot: string; executable: string }) {
    if (!isAbsolute(config.projectRoot) || !isAbsolute(config.executable)) {
      throw new Error('Project root and compiler executable must be operator-configured absolute paths.');
    }
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(() => {
      if (this.closed) throw new ApiError('unavailable', 'The project reader is closed.');
      return operation();
    });
    this.queue = result.catch(() => undefined);
    return result;
  }

  getPages(): Promise<PageIndex> {
    return this.serial(() => this.indexSnapshot());
  }

  getSite(): Promise<SiteSummary> {
    return this.serial(async () => {
      const index = this.current ?? await this.indexSnapshot();
      return SiteSummarySchema.parse({
        name: basename(this.config.projectRoot),
        sourceRevision: index.sourceRevision,
        activeReleaseId: null,
      });
    });
  }

  getSource(request: { path: SourcePath; sourceRevision: SourceRevision }): Promise<SourceBuffer> {
    return this.serial(async () => {
      const snapshot = this.snapshots.get(request.sourceRevision);
      if (!snapshot) throw new ApiError('not_found', 'That source snapshot is unknown or expired.');
      return readSnapshotSource(snapshot, request.path);
    });
  }

  private async indexSnapshot(): Promise<PageIndex> {
    this.current = null;
    // Reverify on every capture: an operator can replace the configured file
    // between requests. A prior successful run never authorizes new bytes.
    try {
      await verifyApprovedCompiler(this.config.executable);
    } catch {
      throw new ApiError('unavailable', 'The configured Boris compiler could not be verified. Check BORIS_BIN and the approved platform kit.');
    }
    let snapshot: ProjectSnapshot;
    try {
      snapshot = await createProjectSnapshot(this.config.projectRoot);
    } catch (error) {
      if (isApiError(error)) throw error;
      throw new ApiError('unavailable', 'The selected project could not be snapshotted. Check its content directory, permissions, and symlinks.');
    }
    let index: PageIndex;
    try {
      if (snapshot.hasProfile) {
        const profile = await validateProfile(this.config.executable, snapshot.workspace);
        if (profile.process.outcome === 'usage') {
          index = unavailableIndex(snapshot.sourceRevision, [
            processProblem(
              'unsupported_profile',
              `Boris refused the project profile: ${profile.process.stderr.slice(0, 4096).replaceAll(snapshot.workspace.root, '[snapshot]')}`,
            ),
          ], 'unsupported');
          return await this.retain(snapshot, index);
        }
        if (profile.process.outcome === 'content') {
          index = unavailableIndex(snapshot.sourceRevision,
            profile.failureReport?.diagnostics.map(diagnosticProblem) ?? [
              processProblem('content_failure', 'Boris rejected the content without a diagnostic report.'),
            ]);
          return await this.retain(snapshot, index);
        }
        if (profile.process.outcome !== 'success') {
          throw new ApiError('unavailable', 'The compiler profile operation did not complete successfully.');
        }
      }
      const result = await indexSource(this.config.executable, snapshot.workspace);
      if (result.process.outcome === 'content') {
        index = unavailableIndex(snapshot.sourceRevision,
          result.failureReport?.diagnostics.map(diagnosticProblem) ?? [
            processProblem('content_failure', 'Boris rejected the content without a diagnostic report.'),
          ]);
      } else if (result.process.outcome === 'success' && result.artifacts) {
        const check = await checkGraph(this.config.executable, snapshot.workspace);
        if (check.process.outcome !== 'success' || !check.artifacts) {
          throw new ApiError('unavailable', 'The compiler graph check did not produce a fresh report.');
        }
        index = projectPageIndex(snapshot.sourceRevision, result.artifacts, check.artifacts.report);
        if (index.pages.some(page => !snapshot.sources.has(page.sourcePath))) {
          throw new ApiError('unsupported', 'The producer named a source outside the supported snapshot.');
        }
      } else {
        throw new ApiError('unavailable', 'The compiler indexing operation did not complete successfully.');
      }
    } catch (error) {
      if (error instanceof ArtifactError && error.kind === 'unsupported_version') {
        index = unavailableIndex(snapshot.sourceRevision, [
          processProblem('unsupported_producer', `The Boris producer format is unsupported${error.observedVersion ? ` (${error.observedVersion})` : ''}.`),
        ], 'unsupported');
      } else {
        await snapshot.workspace.cleanup();
        throw error;
      }
    }
    return this.retain(snapshot, index);
  }

  private async retain(snapshot: ProjectSnapshot, index: PageIndex): Promise<PageIndex> {
    this.snapshots.set(snapshot.sourceRevision, snapshot);
    this.current = index;
    // Bounded in-memory history: source requests always name an exact snapshot.
    while (this.snapshots.size > 4) {
      const oldest = this.snapshots.entries().next().value;
      if (!oldest) break;
      this.snapshots.delete(oldest[0]);
      await oldest[1].workspace.cleanup();
    }
    return index;
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.queue;
    await Promise.all([...this.snapshots.values()].map(snapshot => snapshot.workspace.cleanup()));
    this.snapshots.clear();
  }
}
