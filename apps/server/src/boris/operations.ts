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
  resolveContainedPath,
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

export type OperationResult<T, F = never> = {
  /** The bounded process result (outcome, exit code, streams, truncation). */
  process: RunResult;
  /**
   * Parsed producer artifacts. Present only after a successful process run
   * whose artifacts were all present and valid; any non-success outcome
   * leaves this null and never reads files left by earlier runs.
   */
  artifacts: T | null;
  /**
   * The fresh failure report a content outcome published, when the
   * operation's producer contracts one (IR build and the HTML report path
   * publish reports on content failure; graph-dependent analysis does
   * not). It carries located diagnostics for later consumers and never
   * represents a valid graph — artifacts stays null beside it. Null when
   * the outcome contracts no report or none was freshly written.
   */
  failureReport: F | null;
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
 * artifacts can never be read as the new run's evidence. On a content
 * outcome the compiler publishes a fresh failure report with located
 * diagnostics, which this operation parses and exposes as `failureReport` —
 * never as artifacts, so a failed run cannot yield a current valid graph
 * from old files.
 */
export async function indexSource(
  executable: string,
  workspace: JobWorkspace,
  limits?: Partial<RunLimits>,
): Promise<
  OperationResult<
    {
      manifest: BorisIrManifest;
      graph: BorisIrGraph;
      completion: BorisCompletionIndex;
      buildReport: BorisIrBuildReport;
    },
    BorisIrBuildReport
  >
> {
  await prepareFreshOutputPath(workspace.root, REPORT_PATHS.irDir);
  const process_ = await runBoris(
    executable,
    ['build', '--input', CONTENT_INPUT, '--out', REPORT_PATHS.irDir],
    { cwd: workspace.root, limits },
  );
  if (process_.outcome === 'content') {
    return {
      process: process_,
      artifacts: null,
      failureReport: await readFreshIrFailureReport(workspace),
    };
  }
  if (process_.outcome !== 'success') {
    return { process: process_, artifacts: null, failureReport: null };
  }
  const irDir = join(workspace.root, REPORT_PATHS.irDir);
  // Containment-verify every artifact file path before reading (R1 rule:
  // reads never follow symlinked components out of the workspace), then
  // read all four; on a successful run any missing one is a contract
  // violation, never a partial success.
  await Promise.all([
    resolveContainedPath(workspace.root, join(REPORT_PATHS.irDir, 'manifest.json')),
    resolveContainedPath(workspace.root, join(REPORT_PATHS.irDir, 'graph.json')),
    resolveContainedPath(workspace.root, join(REPORT_PATHS.irDir, 'completion.json')),
    resolveContainedPath(workspace.root, join(REPORT_PATHS.irDir, 'build-report.json')),
  ]);
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
  return {
    process: process_,
    artifacts: { manifest, graph, completion, buildReport },
    failureReport: null,
  };
}

/**
 * Reads the failure report a content-outcome IR build freshly published
 * (docs/boris-integration.md: "On content failure, IR publishes a failure
 * report without graph-dependent artifacts"). A report claiming ok on a
 * content outcome is a producer contradiction and is rejected; a report
 * the producer did not write leaves null — the process result carries the
 * outcome either way. The report path was emptied before the run, so any
 * file read here is from this run, never an earlier one.
 */
async function readFreshIrFailureReport(
  workspace: JobWorkspace,
): Promise<BorisIrBuildReport | null> {
  const reportPath = join(workspace.root, REPORT_PATHS.irDir, 'build-report.json');
  let report: BorisIrBuildReport;
  try {
    // Containment-verify the exact artifact file path, then read through
    // the dir-based reader, which derives the same path.
    await resolveContainedPath(workspace.root, reportPath);
    report = await readIrBuildReport(join(workspace.root, REPORT_PATHS.irDir));
  } catch (error) {
    if (error instanceof ArtifactError && error.kind === 'missing') {
      return null;
    }
    throw error;
  }
  if (report.ok) {
    throw new ArtifactError(
      'invalid',
      reportPath,
      'build report claims ok on a content outcome',
    );
  }
  return report;
}

/**
 * Resolves one of the fixed report/output paths inside the workspace with
 * the filesystem containment rule (workspace.ts) before any artifact read,
 * so evidence is never taken from a path that reaches outside the
 * workspace through a symlinked component.
 */
async function containedPath(
  workspace: JobWorkspace,
  relativePath: string,
): Promise<string> {
  return resolveContainedPath(workspace.root, relativePath);
}

/**
 * Reads the failure report a content-outcome HTML-path run freshly
 * published (upstream cli.md: `build`/`validate` write the report on both
 * success and failure). A report claiming ok on a content outcome is a
 * producer contradiction and is rejected; a missing report leaves null —
 * the process result carries the outcome either way.
 */
async function readFreshHtmlFailureReport(
  workspace: JobWorkspace,
  reportPath: string,
): Promise<BorisHtmlBuildReport | null> {
  let report: BorisHtmlBuildReport;
  try {
    report = await readHtmlBuildReport(reportPath);
  } catch (error) {
    if (error instanceof ArtifactError && error.kind === 'missing') {
      return null;
    }
    throw error;
  }
  if (report.ok) {
    throw new ArtifactError(
      'invalid',
      reportPath,
      'HTML report claims ok on a content outcome',
    );
  }
  return report;
}

/**
 * Build preview artifacts: `build --profile boris.json --report
 * .obsequious/html.json`. The report file is removed before the run; the
 * HTML output tree is compiler-owned and is not rewritten by the adapter.
 * A content outcome exposes the fresh failure report as `failureReport`,
 * never as artifacts.
 */
export async function buildPreview(
  executable: string,
  workspace: JobWorkspace,
  limits?: Partial<RunLimits>,
): Promise<
  OperationResult<{ report: BorisHtmlBuildReport }, BorisHtmlBuildReport>
> {
  await prepareFreshReportFile(workspace.root, REPORT_PATHS.html);
  const process_ = await runBoris(
    executable,
    ['build', '--profile', PROFILE_PATH, '--report', REPORT_PATHS.html],
    { cwd: workspace.root, limits },
  );
  if (process_.outcome === 'content') {
    return {
      process: process_,
      artifacts: null,
      failureReport: await readFreshHtmlFailureReport(
        workspace,
        await containedPath(workspace, REPORT_PATHS.html),
      ),
    };
  }
  if (process_.outcome !== 'success') {
    return { process: process_, artifacts: null, failureReport: null };
  }
  const report = await readHtmlBuildReport(
    await containedPath(workspace, REPORT_PATHS.html),
  );
  if (!report.ok) {
    throw new ArtifactError(
      'invalid',
      join(workspace.root, REPORT_PATHS.html),
      'HTML report is not ok on a successful process run',
    );
  }
  return { process: process_, artifacts: { report }, failureReport: null };
}

/**
 * Validate the supported HTML profile: `validate --profile boris.json
 * --report .obsequious/validate.json`. Zero-write apart from the report.
 * An unsupported profile declaration (editions, per-target rss or llms,
 * multi-target sitemap or publication metadata) arrives as a usage outcome
 * whose stderr names the declaration — surfaced, never dropped. A content
 * outcome exposes the fresh failure report as `failureReport`.
 */
export async function validateProfile(
  executable: string,
  workspace: JobWorkspace,
  limits?: Partial<RunLimits>,
): Promise<
  OperationResult<{ report: BorisHtmlBuildReport }, BorisHtmlBuildReport>
> {
  await prepareFreshReportFile(workspace.root, REPORT_PATHS.validate);
  const process_ = await runBoris(
    executable,
    ['validate', '--profile', PROFILE_PATH, '--report', REPORT_PATHS.validate],
    { cwd: workspace.root, limits },
  );
  // The validator signals declaration refusal with exit 2 (usage) and no
  // report; a content outcome publishes the failure report.
  if (process_.outcome === 'content') {
    return {
      process: process_,
      artifacts: null,
      failureReport: await readFreshHtmlFailureReport(
        workspace,
        await containedPath(workspace, REPORT_PATHS.validate),
      ),
    };
  }
  if (process_.outcome !== 'success') {
    return { process: process_, artifacts: null, failureReport: null };
  }
  const report = await readHtmlBuildReport(
    await containedPath(workspace, REPORT_PATHS.validate),
  );
  if (!report.ok) {
    throw new ArtifactError(
      'invalid',
      join(workspace.root, REPORT_PATHS.validate),
      'HTML report is not ok on a successful process run',
    );
  }
  return { process: process_, artifacts: { report }, failureReport: null };
}

/**
 * Graph health: `check --input content --format json --report
 * .obsequious/check.json`. Check findings are structured results, not
 * process failures: exit 0 with findings is a valid report carrier. The
 * fixed argv does not opt into a findings-failure policy, and per the
 * upstream contract a content or graph failure publishes no analysis
 * report — so a content outcome returns the process result alone and never
 * attempts the report read that would misclassify it as a missing
 * artifact.
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
  if (process_.outcome !== 'success') {
    return { process: process_, artifacts: null, failureReport: null };
  }
  const report = await readDocumentationIntelligenceReport(
    await containedPath(workspace, REPORT_PATHS.check),
  );
  return { process: process_, artifacts: { report }, failureReport: null };
}

/**
 * Impact: `impact <entity-id> --input content --format json --report
 * .obsequious/impact.json`. The entity id passes the argv-safety boundary
 * and is otherwise treated as opaque compiler text. Content outcomes
 * return the process result alone: no analysis report is published for a
 * graph failure, so the read attempt never happens.
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
  if (process_.outcome !== 'success') {
    return { process: process_, artifacts: null, failureReport: null };
  }
  const report = await readDocumentationIntelligenceReport(
    await containedPath(workspace, REPORT_PATHS.impact),
  );
  return { process: process_, artifacts: { report }, failureReport: null };
}
