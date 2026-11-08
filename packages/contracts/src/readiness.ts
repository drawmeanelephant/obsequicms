import { z } from 'zod';
import {
  EvidenceIdSchema,
  JobIdSchema,
  ReleaseIdSchema,
  SourceRevisionSchema,
  TimestampSchema,
} from './ids';

/**
 * Readiness contracts (docs/api.md#readiness). The prototype has no checker
 * registry or pretend crawler; observations are synthetic examples under a
 * persistent demo label.
 */

export const READINESS_KEYS = [
  'robots',
  'sitemap',
  'canonical',
  'social_preview',
  'llms',
  'humans',
  'security_contact',
  'about',
  'contact',
  'privacy',
  'google_search_console',
  'bing_webmaster',
  'analytics',
  'image_alt',
] as const;

export const READINESS_CATEGORIES = [
  'discovery',
  'identity',
  'measurement',
  'trust',
] as const;

export const READINESS_CONFIGURATIONS = [
  'not_configured',
  'configured',
] as const;

export const ACTION_KINDS = [
  'manual_setup',
  'open_page',
  'run_check',
  'none',
] as const;

export const OBSERVATION_STATUSES = [
  'not_checked',
  'running',
  'complete',
  'error',
] as const;

export const OBSERVATION_VERDICTS = [
  'passed',
  'failed',
  'needs_review',
  'not_applicable',
] as const;

export const OBSERVATION_METHODS = [
  'compiler',
  'live_http',
  'provider',
  'human',
] as const;

export type ReadinessKey = (typeof READINESS_KEYS)[number];
export type ReadinessCategory = (typeof READINESS_CATEGORIES)[number];

/** What an observation looked at: at least one of the three identifiers. */
export const ObservationSubjectSchema = z
  .object({
    sourceRevision: SourceRevisionSchema.nullable(),
    releaseId: ReleaseIdSchema.nullable(),
    url: z.string().min(1).nullable(),
  })
  .superRefine((subject, ctx) => {
    if (
      subject.sourceRevision === null &&
      subject.releaseId === null &&
      subject.url === null
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'An observation subject requires at least one of sourceRevision, releaseId, or url.',
        path: [],
      });
    }
  });
export type ObservationSubject = z.output<typeof ObservationSubjectSchema>;

/**
 * Discriminated observation union. There is no passed observation without
 * evidence: `complete` requires an `evidenceId` structurally. Staleness is
 * derived by comparing the subject to the displayed revision or release.
 */
export const ObservationSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('not_checked'),
  }),
  z.object({
    status: z.literal('running'),
    jobId: JobIdSchema,
  }),
  z.object({
    status: z.literal('complete'),
    verdict: z.enum(OBSERVATION_VERDICTS),
    evidenceId: EvidenceIdSchema,
    method: z.enum(OBSERVATION_METHODS),
    observedAt: TimestampSchema,
    subject: ObservationSubjectSchema,
  }),
  z.object({
    status: z.literal('error'),
    code: z.string().min(1),
    message: z.string().min(1),
  }),
]);
export type Observation = z.output<typeof ObservationSchema>;

export const ReadinessItemSchema = z.object({
  key: z.enum(READINESS_KEYS),
  label: z.string().min(1),
  category: z.enum(READINESS_CATEGORIES),
  configuration: z.enum(READINESS_CONFIGURATIONS),
  generated: z
    .object({
      sourceRevision: SourceRevisionSchema,
      evidenceId: EvidenceIdSchema,
    })
    .nullable(),
  deployment: z
    .object({ releaseId: ReleaseIdSchema, evidenceId: EvidenceIdSchema })
    .nullable(),
  observation: ObservationSchema,
  action: z.object({
    kind: z.enum(ACTION_KINDS),
    label: z.string().min(1),
    /** A validated identifier or null; never an executable URL or HTML. */
    target: z.string().min(1).nullable(),
  }),
});
export type ReadinessItem = z.output<typeof ReadinessItemSchema>;

export const SiteSummarySchema = z.object({
  name: z.string().min(1),
  sourceRevision: SourceRevisionSchema,
  activeReleaseId: ReleaseIdSchema.nullable(),
});
export type SiteSummary = z.output<typeof SiteSummarySchema>;

export const ReadinessIndexSchema = z.object({
  sourceRevision: SourceRevisionSchema,
  releaseId: ReleaseIdSchema.nullable(),
  items: z.array(ReadinessItemSchema),
});
export type ReadinessIndex = z.output<typeof ReadinessIndexSchema>;
