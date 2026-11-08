import { readFile } from 'node:fs/promises';

import { acceptsCompilerId } from './identity.js';

/**
 * Producer artifact adapters (docs/boris-integration.md#initial-artifact-support,
 * upstream ir-schema.md). The adapter accepts base IR `schemaVersion: "0.2.0"`,
 * completion `format: "boris-completion-index"` / `schema_version: 1`, HTML
 * reports `html-build-report-0.2.0`, and documentation-intelligence reports.
 *
 * Conditional IR `0.3.0` and `0.4.0`, and any other unknown version, are
 * detected as unsupported — never reinterpreted as base IR and never returned
 * as an empty successful graph. A missing artifact file is a typed failure,
 * not an empty success. Producer discriminators and compiler ids are verified
 * on every read; compiler identifiers stay opaque (base id or `+variant`).
 */

export type ArtifactFailureKind =
  | 'missing'
  | 'invalid'
  | 'unsupported_version';

export class ArtifactError extends Error {
  readonly kind: ArtifactFailureKind;
  readonly path: string;
  /** The observed schemaVersion/format when the failure is a version one. */
  readonly observedVersion: string | null;

  constructor(
    kind: ArtifactFailureKind,
    path: string,
    message: string,
    observedVersion: string | null = null,
  ) {
    super(message);
    this.name = 'ArtifactError';
    this.kind = kind;
    this.path = path;
    this.observedVersion = observedVersion;
  }
}

async function readArtifact(path: string): Promise<unknown> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new ArtifactError(
      'missing',
      path,
      `required producer artifact is missing: ${path}`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new ArtifactError('invalid', path, 'artifact is not valid JSON');
  }
}

function asObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ArtifactError('invalid', path, 'artifact is not a JSON object');
  }
  return value as Record<string, unknown>;
}

function requireString(
  record: Record<string, unknown>,
  field: string,
  path: string,
): string {
  const value = record[field];
  if (typeof value !== 'string') {
    throw new ArtifactError(
      'invalid',
      path,
      `artifact field "${field}" is not a string`,
    );
  }
  return value;
}

function requireNumber(
  record: Record<string, unknown>,
  field: string,
  path: string,
): number {
  const value = record[field];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ArtifactError(
      'invalid',
      path,
      `artifact field "${field}" is not an integer`,
    );
  }
  return value;
}

function requireBoolean(
  record: Record<string, unknown>,
  field: string,
  path: string,
): boolean {
  const value = record[field];
  if (typeof value !== 'boolean') {
    throw new ArtifactError(
      'invalid',
      path,
      `artifact field "${field}" is not a boolean`,
    );
  }
  return value;
}

/**
 * The base IR version this adapter accepts. Conditional facet versions and
 * unknown versions are reported as unsupported.
 */
export const SUPPORTED_IR_SCHEMA_VERSION = '0.2.0';

const KNOWN_CONDITIONAL_IR_VERSIONS = new Set(['0.3.0', '0.4.0']);

function requireIrSchemaVersion(
  record: Record<string, unknown>,
  path: string,
): string {
  const version = requireString(record, 'schemaVersion', path);
  if (version === SUPPORTED_IR_SCHEMA_VERSION) {
    return version;
  }
  const detail = KNOWN_CONDITIONAL_IR_VERSIONS.has(version)
    ? `conditional IR version ${version} is detected but not supported by this adapter`
    : `unknown IR schemaVersion ${version} is not supported`;
  throw new ArtifactError('unsupported_version', path, detail, version);
}

function requireCompilerField(
  record: Record<string, unknown>,
  field: string,
  path: string,
): string {
  const compiler = requireString(record, field, path);
  if (!acceptsCompilerId(compiler)) {
    throw new ArtifactError(
      'unsupported_version',
      path,
      `artifact compiler id ${compiler} is not the pinned base id or a variant of it`,
      compiler,
    );
  }
  return compiler;
}

/** Producer page summary from `manifest.json`. */
export type BorisPageSummary = {
  index: number;
  id: string;
  sourcePath: string;
  role: 'trunk' | 'satellite';
  parent: string | null;
  title: string | null;
  status: 'draft' | 'published' | 'archived' | null;
};

export type BorisIrManifest = {
  schemaVersion: '0.2.0';
  compiler: string;
  contentRoot: string;
  pageCount: number;
  pages: BorisPageSummary[];
};

export function parseIrManifest(raw: unknown, path: string): BorisIrManifest {
  const record = asObject(raw, path);
  requireIrSchemaVersion(record, path);
  const compiler = requireCompilerField(record, 'compiler', path);
  const contentRoot = requireString(record, 'contentRoot', path);
  const pageCount = requireNumber(record, 'pageCount', path);
  if (!Array.isArray(record.pages)) {
    throw new ArtifactError('invalid', path, 'manifest pages is not an array');
  }
  const pages = record.pages.map((entry, position) =>
    parsePageSummary(entry, path, position),
  );
  if (pages.length !== pageCount) {
    throw new ArtifactError(
      'invalid',
      path,
      `manifest pageCount ${pageCount} does not match ${pages.length} page entries`,
    );
  }
  return { schemaVersion: '0.2.0', compiler, contentRoot, pageCount, pages };
}

function parsePageSummary(
  value: unknown,
  path: string,
  position: number,
): BorisPageSummary {
  const record = asObject(value, path);
  const index = requireNumber(record, 'index', path);
  if (index !== position) {
    throw new ArtifactError(
      'invalid',
      path,
      `page index ${index} is out of the id-sorted position ${position}`,
    );
  }
  const role = requireString(record, 'role', path);
  if (role !== 'trunk' && role !== 'satellite') {
    throw new ArtifactError(
      'invalid',
      path,
      `page role "${role}" is not trunk or satellite`,
    );
  }
  const parent = record.parent;
  if (parent !== null && typeof parent !== 'string') {
    throw new ArtifactError(
      'invalid',
      path,
      'page parent is neither a string nor null',
    );
  }
  const status = record.status;
  if (
    status !== null &&
    status !== 'draft' &&
    status !== 'published' &&
    status !== 'archived'
  ) {
    throw new ArtifactError(
      'invalid',
      path,
      `page status "${String(status)}" is not draft, published, archived, or null`,
    );
  }
  const title = record.title;
  if (title !== null && typeof title !== 'string') {
    throw new ArtifactError(
      'invalid',
      path,
      'page title is neither a string nor null',
    );
  }
  return {
    index,
    id: requireString(record, 'id', path),
    sourcePath: requireString(record, 'sourcePath', path),
    role,
    parent,
    title,
    status,
  };
}

/** Typed dependency endpoint from `graph.json`. */
export type BorisEndpoint =
  | { type: 'page'; value: string }
  | { type: 'source'; value: string };

export type BorisEdge = {
  from: BorisEndpoint;
  to: BorisEndpoint;
  kind: 'parent' | 'include' | 'reference';
};

export type BorisGraphNode = {
  index: number;
  id: string;
  sourcePath: string;
  role: 'trunk' | 'satellite';
  parent: string | null;
  title: string | null;
  status: 'draft' | 'published' | 'archived' | null;
  tags: string[];
};

export type BorisIrGraph = {
  schemaVersion: '0.2.0';
  frozen: boolean;
  nodes: BorisGraphNode[];
  edges: BorisEdge[];
};

export function parseIrGraph(raw: unknown, path: string): BorisIrGraph {
  const record = asObject(raw, path);
  requireIrSchemaVersion(record, path);
  const frozen = requireBoolean(record, 'frozen', path);
  if (!frozen) {
    throw new ArtifactError(
      'invalid',
      path,
      'graph.json is not frozen; an unfrozen graph is never presented as valid',
    );
  }
  if (!Array.isArray(record.nodes) || !Array.isArray(record.edges)) {
    throw new ArtifactError(
      'invalid',
      path,
      'graph nodes or edges is not an array',
    );
  }
  const nodes = record.nodes.map((entry, position) =>
    parseGraphNode(entry, path, position),
  );
  const edges = record.edges.map((entry) => parseEdge(entry, path));
  return { schemaVersion: '0.2.0', frozen, nodes, edges };
}

function parseGraphNode(
  value: unknown,
  path: string,
  position: number,
): BorisGraphNode {
  const record = asObject(value, path);
  const index = requireNumber(record, 'index', path);
  if (index !== position) {
    throw new ArtifactError(
      'invalid',
      path,
      `node index ${index} is out of the id-sorted position ${position}`,
    );
  }
  const role = requireString(record, 'role', path);
  if (role !== 'trunk' && role !== 'satellite') {
    throw new ArtifactError(
      'invalid',
      path,
      `node role "${role}" is not trunk or satellite`,
    );
  }
  const parent = record.parent;
  if (parent !== null && typeof parent !== 'string') {
    throw new ArtifactError(
      'invalid',
      path,
      'node parent is neither a string nor null',
    );
  }
  if (!Array.isArray(record.tags)) {
    throw new ArtifactError('invalid', path, 'node tags is not an array');
  }
  const status = record.status;
  if (
    status !== null &&
    status !== 'draft' &&
    status !== 'published' &&
    status !== 'archived'
  ) {
    throw new ArtifactError(
      'invalid',
      path,
      `node status "${String(status)}" is not draft, published, archived, or null`,
    );
  }
  const title = record.title;
  if (title !== null && typeof title !== 'string') {
    throw new ArtifactError(
      'invalid',
      path,
      'node title is neither a string nor null',
    );
  }
  return {
    index,
    id: requireString(record, 'id', path),
    sourcePath: requireString(record, 'sourcePath', path),
    role,
    parent,
    title,
    status,
    tags: record.tags.map((tag) => {
      if (typeof tag !== 'string') {
        throw new ArtifactError('invalid', path, 'node tag is not a string');
      }
      return tag;
    }),
  };
}

function parseEndpoint(value: unknown, path: string): BorisEndpoint {
  const record = asObject(value, path);
  const type = requireString(record, 'type', path);
  if (type !== 'page' && type !== 'source') {
    throw new ArtifactError(
      'invalid',
      path,
      `endpoint type "${type}" is not page or source`,
    );
  }
  return { type, value: requireString(record, 'value', path) };
}

function parseEdge(value: unknown, path: string): BorisEdge {
  const record = asObject(value, path);
  const kind = requireString(record, 'kind', path);
  if (kind !== 'parent' && kind !== 'include' && kind !== 'reference') {
    throw new ArtifactError(
      'invalid',
      path,
      `edge kind "${kind}" is not parent, include, or reference`,
    );
  }
  return {
    from: parseEndpoint(record.from, path),
    to: parseEndpoint(record.to, path),
    kind,
  };
}

export type BorisCompletionIndex = {
  format: 'boris-completion-index';
  schemaVersion: number;
  compilerId: string;
};

export function parseCompletion(
  raw: unknown,
  path: string,
): BorisCompletionIndex {
  const record = asObject(raw, path);
  const format = requireString(record, 'format', path);
  if (format !== 'boris-completion-index') {
    throw new ArtifactError(
      'unsupported_version',
      path,
      `completion format "${format}" is not boris-completion-index`,
      format,
    );
  }
  const schemaVersion = requireNumber(record, 'schema_version', path);
  if (schemaVersion !== 1) {
    throw new ArtifactError(
      'unsupported_version',
      path,
      `completion schema_version ${schemaVersion} is not supported`,
      String(schemaVersion),
    );
  }
  const compilerId = requireString(record, 'compiler_id', path);
  if (!acceptsCompilerId(compilerId)) {
    throw new ArtifactError(
      'unsupported_version',
      path,
      `completion compiler id ${compilerId} is not the pinned base id or a variant of it`,
      compilerId,
    );
  }
  return {
    format: 'boris-completion-index',
    schemaVersion,
    compilerId,
  };
}

export type BorisDiagnostic = {
  severity: string;
  code: string;
  message: string;
  remediation: string;
  sourcePath: string | null;
  line: number | null;
  column: number | null;
  id: string | null;
};

export type BorisIrBuildReport = {
  schemaVersion: '0.2.0';
  compiler: string;
  ok: boolean;
  pageCount: number;
  errorCount: number;
  diagnostics: BorisDiagnostic[];
};

export function parseIrBuildReport(
  raw: unknown,
  path: string,
): BorisIrBuildReport {
  const record = asObject(raw, path);
  requireIrSchemaVersion(record, path);
  const compiler = requireCompilerField(record, 'compiler', path);
  const ok = requireBoolean(record, 'ok', path);
  const pageCount = requireNumber(record, 'pageCount', path);
  const errorCount = requireNumber(record, 'errorCount', path);
  return {
    schemaVersion: '0.2.0',
    compiler,
    ok,
    pageCount,
    errorCount,
    diagnostics: parseDiagnostics(record.diagnostics, path),
  };
}

function parseDiagnostics(value: unknown, path: string): BorisDiagnostic[] {
  if (!Array.isArray(value)) {
    throw new ArtifactError(
      'invalid',
      path,
      'artifact diagnostics is not an array',
    );
  }
  return value.map((entry) => {
    const record = asObject(entry, path);
    return {
      severity: requireString(record, 'severity', path),
      code: requireString(record, 'code', path),
      message: requireString(record, 'message', path),
      remediation: requireString(record, 'remediation', path),
      sourcePath: nullableString(record.sourcePath, path, 'sourcePath'),
      line: nullableInteger(record.line, path, 'line'),
      column: nullableInteger(record.column, path, 'column'),
      id: nullableString(record.id, path, 'id'),
    };
  });
}

function nullableString(
  value: unknown,
  path: string,
  field: string,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new ArtifactError(
      'invalid',
      path,
      `diagnostic field "${field}" is neither a string nor null`,
    );
  }
  return value;
}

function nullableInteger(
  value: unknown,
  path: string,
  field: string,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ArtifactError(
      'invalid',
      path,
      `diagnostic field "${field}" is neither an integer nor null`,
    );
  }
  return value;
}

/**
 * The HTML-path report version this adapter accepts (build/validate
 * `--report`). Versions outside it are unsupported.
 */
export const SUPPORTED_HTML_REPORT_VERSION = 'html-build-report-0.2.0';

export type BorisHtmlBuildReport = {
  schemaVersion: 'html-build-report-0.2.0';
  compilerId: string;
  /** Opaque provenance token; never compared to a full commit id. */
  vcsRevision: string | null;
  ok: boolean;
  errorCount: number;
  diagnostics: BorisDiagnostic[];
};

export function parseHtmlBuildReport(
  raw: unknown,
  path: string,
): BorisHtmlBuildReport {
  const record = asObject(raw, path);
  const version = requireString(record, 'schemaVersion', path);
  if (version !== SUPPORTED_HTML_REPORT_VERSION) {
    throw new ArtifactError(
      'unsupported_version',
      path,
      `HTML report schemaVersion ${version} is not supported`,
      version,
    );
  }
  const compilerId = requireString(record, 'compilerId', path);
  if (!acceptsCompilerId(compilerId)) {
    throw new ArtifactError(
      'unsupported_version',
      path,
      `HTML report compiler id ${compilerId} is not the pinned base id or a variant of it`,
      compilerId,
    );
  }
  return {
    schemaVersion: 'html-build-report-0.2.0',
    compilerId,
    vcsRevision:
      record.vcsRevision === undefined
        ? null
        : requireString(record, 'vcsRevision', path),
    ok: requireBoolean(record, 'ok', path),
    errorCount: requireNumber(record, 'errorCount', path),
    diagnostics: parseDiagnostics(record.diagnostics, path),
  };
}

export type BorisDocumentationIntelligenceReport = {
  format: 'boris-documentation-intelligence';
  schemaVersion: string;
  compiler: string;
  /** The operation kind the report records (e.g. check, impact). */
  kind: string | null;
};

export function parseDocumentationIntelligenceReport(
  raw: unknown,
  path: string,
): BorisDocumentationIntelligenceReport {
  const record = asObject(raw, path);
  const format = requireString(record, 'format', path);
  if (format !== 'boris-documentation-intelligence') {
    throw new ArtifactError(
      'unsupported_version',
      path,
      `report format "${format}" is not boris-documentation-intelligence`,
      format,
    );
  }
  const version = requireString(record, 'schemaVersion', path);
  if (version !== '0.2.0') {
    throw new ArtifactError(
      'unsupported_version',
      path,
      `documentation-intelligence schemaVersion ${version} is not supported`,
      version,
    );
  }
  const compiler = requireCompilerField(record, 'compiler', path);
  return {
    format: 'boris-documentation-intelligence',
    schemaVersion: version,
    compiler,
    kind: typeof record.kind === 'string' ? record.kind : null,
  };
}

// ---------------------------------------------------------------------------
// File-backed readers
// ---------------------------------------------------------------------------

export async function readIrManifest(
  outDir: string,
): Promise<BorisIrManifest> {
  const path = `${outDir}/manifest.json`;
  return parseIrManifest(await readArtifact(path), path);
}

export async function readIrGraph(outDir: string): Promise<BorisIrGraph> {
  const path = `${outDir}/graph.json`;
  return parseIrGraph(await readArtifact(path), path);
}

export async function readIrCompletion(
  outDir: string,
): Promise<BorisCompletionIndex> {
  const path = `${outDir}/completion.json`;
  return parseCompletion(await readArtifact(path), path);
}

export async function readIrBuildReport(
  outDir: string,
): Promise<BorisIrBuildReport> {
  const path = `${outDir}/build-report.json`;
  return parseIrBuildReport(await readArtifact(path), path);
}

export async function readHtmlBuildReport(
  reportPath: string,
): Promise<BorisHtmlBuildReport> {
  return parseHtmlBuildReport(await readArtifact(reportPath), reportPath);
}

export async function readDocumentationIntelligenceReport(
  reportPath: string,
): Promise<BorisDocumentationIntelligenceReport> {
  return parseDocumentationIntelligenceReport(
    await readArtifact(reportPath),
    reportPath,
  );
}
