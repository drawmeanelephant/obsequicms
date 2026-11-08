/**
 * Compiler identity (docs/boris-integration.md; pinned baseline
 * c50d8622bd407bcb5f559a4d7ed5da440a2259ec declaring boris/0.9.0).
 *
 * Compiler identifiers are opaque `name/version` text (upstream cli.md,
 * "Version query"): they are compared exactly, never parsed into semver or
 * substring-matched on the version portion. Artifacts may record the base id
 * or a variant-suffixed id (`boris/0.9.0+cooklang` for a Cooklang corpus);
 * both are accepted against the expected base id. Any other string is
 * rejected.
 */

/** The pinned baseline's base compiler id. */
export const EXPECTED_COMPILER_ID = 'boris/0.9.0';

export type BorisBuildInfo = {
  format: 'boris-build-info';
  schemaVersion: string;
  version: string;
  vcsRevision: string;
};

/**
 * Whether `observed` is the expected base compiler id or a variant-suffixed
 * id of it. Opaque and exact: the base id must match character for
 * character, and the suffix must follow a single `+`.
 */
export function acceptsCompilerId(
  observed: string,
  expectedBase: string = EXPECTED_COMPILER_ID,
): boolean {
  return observed === expectedBase || observed.startsWith(`${expectedBase}+`);
}

/**
 * Parses `boris --version` output: exactly one line carrying the base
 * compiler id. Extra lines or an empty output are contract violations, not
 * ids.
 */
export function parseVersionOutput(stdout: string): string {
  const lines = stdout.split('\n').filter((line) => line.trim() !== '');
  if (lines.length !== 1) {
    throw new Error(
      `--version must print exactly one line, got ${lines.length}`,
    );
  }
  const id = lines[0];
  if (id === undefined) {
    throw new Error('--version printed no compiler id');
  }
  return id;
}

/**
 * Parses `boris --build-info` output: exactly one JSON line with the
 * `boris-build-info` provenance document. The discriminator and schema
 * version are verified before anything else is trusted; the vcsRevision is
 * opaque provenance text and is never compared against a full commit id.
 */
export function parseBuildInfo(stdout: string): BorisBuildInfo {
  const lines = stdout.split('\n').filter((line) => line.trim() !== '');
  if (lines.length !== 1) {
    throw new Error(
      `--build-info must print exactly one JSON line, got ${lines.length}`,
    );
  }
  const line = lines[0];
  if (line === undefined) {
    throw new Error('--build-info printed no document');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    throw new Error('--build-info printed a non-JSON line');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('--build-info document is not an object');
  }
  const record = parsed as Record<string, unknown>;
  if (record.format !== 'boris-build-info') {
    throw new Error(
      `--build-info format discriminator mismatch: ${String(record.format)}`,
    );
  }
  if (record.schemaVersion !== '1') {
    throw new Error(
      `--build-info schemaVersion mismatch: ${String(record.schemaVersion)}`,
    );
  }
  if (typeof record.version !== 'string') {
    throw new Error('--build-info version is not a string');
  }
  if (typeof record.vcsRevision !== 'string') {
    throw new Error('--build-info vcsRevision is not a string');
  }
  return {
    format: 'boris-build-info',
    schemaVersion: record.schemaVersion,
    version: record.version,
    vcsRevision: record.vcsRevision,
  };
}

/**
 * Validates an entity id for use in a fixed argv array. Compiler entity ids
 * are opaque text, so the boundary checks only argv safety — never identity
 * grammar: no leading dash (flag injection), no NUL or control characters,
 * no whitespace-only value, bounded length.
 */
export function assertEntityIdSafe(entityId: string): void {
  if (entityId.length === 0 || entityId.trim() === '') {
    throw new Error('entity id must be non-empty');
  }
  if (entityId.length > 255) {
    throw new Error('entity id exceeds the 255-byte boundary bound');
  }
  if (entityId.startsWith('-')) {
    throw new Error('entity id must not begin with "-" (argv flag injection)');
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(entityId)) {
    throw new Error('entity id must not contain control characters');
  }
}
