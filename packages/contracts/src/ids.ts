import { z } from 'zod';

/**
 * Common value contracts (docs/api.md#common-values).
 *
 * Server-created identifiers are distinct opaque strings. Zod branding keeps
 * them distinct at the type level while accepting plain strings as input,
 * so boundary data can be validated and then stays opaque in the UI.
 */

/** Opaque server identifier for an immutable source revision. */
export const SourceRevisionSchema = z
  .string()
  .min(1)
  .brand<'SourceRevision'>();
export type SourceRevision = z.output<typeof SourceRevisionSchema>;

/** Opaque server identifier for a durable job. */
export const JobIdSchema = z.string().min(1).brand<'JobId'>();
export type JobId = z.output<typeof JobIdSchema>;

/** Opaque server identifier for an immutable release. */
export const ReleaseIdSchema = z.string().min(1).brand<'ReleaseId'>();
export type ReleaseId = z.output<typeof ReleaseIdSchema>;

/** Opaque server identifier for a stored evidence record. */
export const EvidenceIdSchema = z.string().min(1).brand<'EvidenceId'>();
export type EvidenceId = z.output<typeof EvidenceIdSchema>;

/**
 * Opaque compiler text identifying an entity. Never a filesystem path or
 * URL, and never inferred from titles or folders.
 */
export const EntityIdSchema = z.string().min(1).brand<'EntityId'>();
export type EntityId = z.output<typeof EntityIdSchema>;

/**
 * Validated project-relative author-owned path. Initial editing accepts
 * known regular Markdown files below `content/`.
 */
export const SourcePathSchema = z
  .string()
  .min(1)
  .superRefine((value, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: 'custom', message, path: [] });
    if (!value.startsWith('content/')) {
      issue('Source paths must be project-relative paths below content/.');
      return;
    }
    if (!value.endsWith('.md')) {
      issue('Source paths must name regular Markdown files.');
    }
    if (value.includes('..')) {
      issue('Source paths must not contain ".." segments.');
    }
    if (value.includes('\\')) {
      issue('Source paths must not contain backslashes.');
    }
    if (value.includes('//')) {
      issue('Source paths must not contain empty path segments.');
    }
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(value)) {
      issue('Source paths must not contain control characters.');
    }
  })
  .brand<'SourcePath'>();
export type SourcePath = z.output<typeof SourcePathSchema>;

/** Lowercase SHA-256 of the exact source bytes. */
export const FileHashSchema = z
  .string()
  .regex(
    /^[0-9a-f]{64}$/,
    'File hashes must be lowercase SHA-256 hex digests.',
  )
  .brand<'FileHash'>();
export type FileHash = z.output<typeof FileHashSchema>;

/** UTC ISO 8601 timestamp string. Unknown facts are null, never defaults. */
export const TimestampSchema = z.iso.datetime();
export type Timestamp = z.output<typeof TimestampSchema>;

/** Initial per-file source limit, measured in UTF-8 bytes. */
export const SOURCE_BYTE_LIMIT = 8 * 1024 * 1024;

export function utf8ByteLength(content: string): number {
  return new TextEncoder().encode(content).length;
}
