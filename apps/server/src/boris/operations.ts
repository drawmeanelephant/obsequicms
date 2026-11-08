import { join } from 'node:path';

import {
  assertEntityIdSafe,
  EXPECTED_COMPILER_ID,
  parseBuildInfo,
  parseVersionOutput,
  acceptsCompilerId,
  type BorisBuildInfo,
} from './identity.js';
import {
  runBoris,
  type RunLimits,
  type RunResult,
} from './run.js';
import {
  prepareFreshOutputPath,
  prepareFreshReportFile,
  type JobWorkspace,
} from './workspace.js';
import {
  ArtifactError,
  readDocumentationIntelligenceReport,
  readHtmlBuildReport,
  readIrBuildReport,
  readIrCompletion,
  readIrGraph,
  readIrManifest,
  type BorisCompletionIndex,
  type BorisDocumentationIntelligenceReport,
  type BorisHtmlBuildReport,
  type BorisIrBuildReport,
  type BorisIrGraph,
  type BorisIrManifest,
} from './artifacts.js';

/**
 * The fixed allowlisted invocations (docs/boris-integration.md#fixed-process-operations).
 * The executable and argv are server-owned: every operation builds one exact
 * argv array after the executable and runs it inside a server-owned job
 * workspace. Nothing here accepts arbitrary flags from callers, and no
 * compiler execution is exposed over HTTP in this packet.
 *
 * | Operation | Argv after the executable |
 * | Identity | `--version`, then a separate `--build-info` invocation |
 * | Validate supported HTML profile | `validate --profile boris.json --report .obsequious/validate.json` |
 * | Index Markdown source | `build --input content --out .obsequious/ir` |
 * | Build preview artifacts | `build --profile boris.json --report .obsequious/html.json` |
 * | Graph health | `check --input content --format json --report .obsequious/check.json` |
 * | Impact | `impact <entity-id> --input content --format json --report .obsequious/impact.json` |
 */

/** Fixed workspace-relative paths, exactly as the allowlist declares. */
export const REPORT_PATHS = {
  validate: '.obsequious/validate.json',
  irDir: '.obsequious/ir',
  html: '.obsequious/html.json',
  check: '.obsequious/check.json',
  impact: '.obsequious/impact.json',
} as const;

export const PROFILE_PATH = 'boris.json';
export const CONTENT_INPUT = 'content';

export type OperationResult<T> = {
  /** The bounded process result (outcome, exit code, streams, truncation). */
  process: RunResult;
  /**
   * Parsed producer artifacts. Present only after a successful process run
   * whose artifacts were all present and valid; any non-success outcome
   * leaves this null and never reads files left by earlier runs.
   */
  artifacts: T | null;
};

export type IdentityResult = {
  process: RunResult;
  buildInfo: BorisBuildInfo;
  version: string;
};

/**
 * Compiler identity: `--version`, then a separate `--build-info` invocation.
 * The version line and the build-info document must agree and must carry the
 * pinned base compiler id (or a variant of it) — an unknown version fails the
 * gate here rather than later at artifact time.
 */
export async function readIdentity(
  executable: string,
  limits?: Partial<RunLimits>,
): Promise<IdentityResult> {
  const versionRun = await runBoris(executable, ['--version'], {
    cwd: process.cwd(),
    limits,
  });
  if (versionRun.outcome !== 'success') {
    throw new Error(
      `boris --version did not succeed (${versionRun.outcome}); stderr: ${versionRun.stderr.trim()}`,
    );
  }
  const version = parseVersionOutput(versionRun.stdout);
  if (!acceptsCompilerId(version)) {
    throw new Error(
      `compiler id ${version} is not the pinned ${EXPECTED_COMPILER_ID} base id or a variant of it`,
    );
  }

  const buildInfoRun = await runBoris(executable, ['--build-info'], {
    cwd: process.cwd(),
    limits,
  });
  if (buildInfoRun.outcome !== 'success') {
    throw new Error(
      `boris --build-info did not succeed (${buildInfoRun.outcome}); stderr: ${buildInfoRun.stderr.trim()}`,
    );
  }
  const buildInfo = parseBuildInfo(buildInfoRun.stdout);
  if (buildInfo.version !== version) {
    throw new Error(
      `--build-info version ${buildInfo.version} disagrees with --version ${version}`,
    );
  }
  return {
    process: buildInfoRun,
    buildInfo,
    version,
  };
}

/**
 * Index Markdown source: `build --input content --out .obsequious/ir`.
 * The IR output directory is emptied before the run so an earlier run's
 * artifacts can never be read as the new run's evidence. On any
 * non-success outcome the operation returns the process result without
 * reading artifacts — a failed run never yields a current valid graph from
 * old files.
 */
export async function indexSource(
  executable: string,
  workspace: JobWorkspace,
  limits?: Partial<RunLimits>,
): Promise<OperationResult<{
  manifest: BorisIrManifest;
  graph: BorisIrGraph;
  completion: BorisCompletionIndex;
  buildReport: BorisIrBuildReport;
}>> {
  await prepareFreshOutputPath(workspace.root, REPORT_PATHS.irDir);
  const process_ = await runBoris(
    executable,
    ['build', '--input', CONTENT_INPUT, '--out', REPORT_PATHS.irDir],
    { cwd: workspace.root, limits },
  );
  if (process_.outcome !== 'success') {
    return { process: process_, artifacts: null };
  }
  const irDir = join(workspace.root, REPORT_PATHS.irDir);
  // Read all four artifacts; on a successful run any missing one is a
  // contract violation, never a partial success.
  const [manifest, graph, completion, buildReport] = await Promise.all([
    readIrManifest(irDir),
    readIrGraph(irDir),
    readIrCompletion(irDir),
    readIrBuildReport(irDir),
  ]);
  if (!buildReport.ok) {
    throw new ArtifactError(
      'invalid',
      join(irDir, 'build-report.json'),
      'build report is not ok on a successful process run',
    );
  }
  return { process: process_, artifacts: { manifest, graph, completion, buildReport } };
}

/**
 * Build preview artifacts: `build --profile boris.json --report
 * .obsequious/html.json`. The report file is removed before the run; the
 * HTML output tree is compiler-owned and is not rewritten by the adapter.
 */
export async function buildPreview(
  executable: string,
  workspace: JobWorkspace,
  limits?: Partial<RunLimits>,
): Promise<OperationResult<{ report: BorisHtmlBuildReport }>> {
  await prepareFreshReportFile(workspace.root, REPORT_PATHS.html);
  const process_ = await runBoris(
    executable,
    ['build', '--profile', PROFILE_PATH, '--report', REPORT_PATHS.html],
    { cwd: workspace.root, limits },
  );
  if (process_.outcome !== 'success') {
    return { process: process_, artifacts: null };
  }
  const report = await readHtmlBuildReport(
    join(workspace.root, REPORT_PATHS.html),
  );
  return { process: process_, artifacts: { report } };
}

/**
 * Validate the supported HTML profile: `validate --profile boris.json
 * --report .obsequious/validate.json`. Zero-write apart from the report.
 * An unsupported profile declaration (editions, per-target rss or llms,
 * multi-target sitemap or publication metadata) arrives as a usage outcome
 * whose stderr names the declaration — surfaced, never dropped.
 */
export async function validateProfile(
  executable: string,
  workspace: JobWorkspace,
  limits?: Partial<RunLimits>,
): Promise<OperationResult<{ report: BorisHtmlBuildReport }>> {
  await prepareFreshReportFile(workspace.root, REPORT_PATHS.validate);
  const process_ = await runBoris(
    executable,
    ['validate', '--profile', PROFILE_PATH, '--report', REPORT_PATHS.validate],
    { cwd: workspace.root, limits },
  );
  // The validator signals declaration refusal with exit 2 (usage) and no
  // report; a successful validation writes the report.
  if (process_.outcome !== 'success') {
    return { process: process_, artifacts: null };
  }
  const report = await readHtmlBuildReport(
    join(workspace.root, REPORT_PATHS.validate),
  );
  return { process: process_, artifacts: { report } };
}

/**
 * Graph health: `check --input content --format json --report
 * .obsequious/check.json`. Check findings are structured results, not
 * process failures: exit 0 with findings and exit 1 with an opted-in
 * policy finding are both valid report carriers.
 */
export async function checkGraph(
  executable: string,
  workspace: JobWorkspace,
  limits?: Partial<RunLimits>,
): Promise<
  OperationResult<{ report: BorisDocumentationIntelligenceReport }>
> {
  await prepareFreshReportFile(workspace.root, REPORT_PATHS.check);
  const process_ = await runBoris(
    executable,
    [
      'check',
      '--input',
      CONTENT_INPUT,
      '--format',
      'json',
      '--report',
      REPORT_PATHS.check,
    ],
    { cwd: workspace.root, limits },
  );
  if (process_.outcome !== 'success' && process_.outcome !== 'content') {
    return { process: process_, artifacts: null };
  }
  const report = await readDocumentationIntelligenceReport(
    join(workspace.root, REPORT_PATHS.check),
  );
  return { process: process_, artifacts: { report } };
}

/**
 * Impact: `impact <entity-id> --input content --format json --report
 * .obsequious/impact.json`. The entity id passes the argv-safety boundary
 * and is otherwise treated as opaque compiler text.
 */
export async function impactOf(
  executable: string,
  workspace: JobWorkspace,
  entityId: string,
  limits?: Partial<RunLimits>,
): Promise<
  OperationResult<{ report: BorisDocumentationIntelligenceReport }>
> {
  assertEntityIdSafe(entityId);
  await prepareFreshReportFile(workspace.root, REPORT_PATHS.impact);
  const process_ = await runBoris(
    executable,
    [
      'impact',
      entityId,
      '--input',
      CONTENT_INPUT,
      '--format',
      'json',
      '--report',
      REPORT_PATHS.impact,
    ],
    { cwd: workspace.root, limits },
  );
  if (process_.outcome !== 'success' && process_.outcome !== 'content') {
    return { process: process_, artifacts: null };
  }
  const report = await readDocumentationIntelligenceReport(
    join(workspace.root, REPORT_PATHS.impact),
  );
  return { process: process_, artifacts: { report } };
}
