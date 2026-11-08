import { z } from 'zod';
import {
  EvidenceIdSchema,
  FileHashSchema,
  JobIdSchema,
  SOURCE_BYTE_LIMIT,
  SourcePathSchema,
  SourceRevisionSchema,
  TimestampSchema,
  utf8ByteLength,
} from './ids';
import { ProblemSchema } from './pages';

/**
 * Source and job contracts (docs/api.md#source-and-jobs).
 */

export const SOURCE_CONTENT_LIMIT_MESSAGE =
  'Source content must not exceed 8 MiB of UTF-8 bytes.';

/** UTF-8 source with original line endings. */
export const SourceBufferSchema = z
  .object({
    path: SourcePathSchema,
    sourceRevision: SourceRevisionSchema,
    fileHash: FileHashSchema,
    content: z.string(),
  })
  .refine(
    (buffer) => utf8ByteLength(buffer.content) <= SOURCE_BYTE_LIMIT,
    { message: SOURCE_CONTENT_LIMIT_MESSAGE, path: ['content'] },
  );
export type SourceBuffer = z.output<typeof SourceBufferSchema>;

export const SaveSourceRequestSchema = z
  .strictObject({
    path: SourcePathSchema,
    expectedSourceRevision: SourceRevisionSchema,
    expectedFileHash: FileHashSchema,
    content: z.string(),
  })
  .refine(
    (request) => utf8ByteLength(request.content) <= SOURCE_BYTE_LIMIT,
    { message: SOURCE_CONTENT_LIMIT_MESSAGE, path: ['content'] },
  );
export type SaveSourceRequest = z.output<typeof SaveSourceRequestSchema>;

export const JOB_KINDS = ['validate', 'index', 'preview'] as const;
export const JOB_STATES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'interrupted',
] as const;
export const JOB_OUTCOMES = [
  'success',
  'content',
  'usage',
  'io',
  'terminated',
] as const;

export type JobKind = (typeof JOB_KINDS)[number];
export type JobState = (typeof JOB_STATES)[number];

export const JobResultSchema = z.object({
  outcome: z.enum(JOB_OUTCOMES),
  exitCode: z.number().int().nullable(),
  problems: z.array(ProblemSchema),
  artifacts: z.array(
    z.object({
      kind: z.string().min(1),
      evidenceId: EvidenceIdSchema,
    }),
  ),
});
export type JobResult = z.output<typeof JobResultSchema>;

export const StartJobRequestSchema = z.strictObject({
  kind: z.enum(JOB_KINDS),
  sourceRevision: SourceRevisionSchema,
});
export type StartJobRequest = z.output<typeof StartJobRequestSchema>;

export const JobSchema = z
  .object({
    id: JobIdSchema,
    kind: z.enum(JOB_KINDS),
    sourceRevision: SourceRevisionSchema,
    state: z.enum(JOB_STATES),
    startedAt: TimestampSchema.nullable(),
    finishedAt: TimestampSchema.nullable(),
    result: JobResultSchema.nullable(),
  })
  .superRefine((job, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: 'custom', message, path });
    switch (job.state) {
      case 'queued':
        if (job.startedAt !== null) {
          issue('Queued jobs have no start time.', ['startedAt']);
        }
        if (job.finishedAt !== null || job.result !== null) {
          issue('Queued jobs have no finish time or result.', ['result']);
        }
        break;
      case 'running':
        if (job.startedAt === null) {
          issue('Running jobs have a start time.', ['startedAt']);
        }
        if (job.finishedAt !== null || job.result !== null) {
          issue('Running jobs have no finish time or result yet.', ['result']);
        }
        break;
      case 'succeeded':
      case 'failed':
      case 'cancelled':
      case 'interrupted':
        if (job.finishedAt === null) {
          issue('Terminal jobs have a finish time.', ['finishedAt']);
        }
        if (job.result === null) {
          issue('Terminal jobs have a result.', ['result']);
          break;
        }
        if (job.state === 'succeeded') {
          if (job.result.outcome !== 'success' || job.result.exitCode !== 0) {
            issue(
              'Succeeded jobs require a success outcome and exit code 0.',
              ['result'],
            );
          }
        } else if (job.state === 'failed') {
          if (job.result.outcome === 'success') {
            issue('Failed jobs require a non-success outcome.', ['result']);
          }
        } else if (job.result.outcome !== 'terminated') {
          issue(
            'Cancelled and interrupted jobs have a terminated outcome.',
            ['result'],
          );
        }
        break;
    }
  });
export type Job = z.output<typeof JobSchema>;
