import { z } from 'zod';
import {
  EntityIdSchema,
  SourcePathSchema,
  SourceRevisionSchema,
} from './ids';

/**
 * Page index contracts (docs/api.md#page-index). These are application view
 * records derived from Boris summaries, not raw producer artifacts.
 */

export const PAGE_ROLES = ['trunk', 'satellite'] as const;
export const PAGE_STATUSES = ['draft', 'published', 'archived'] as const;
export const PAGE_INDEX_STATES = [
  'current',
  'stale',
  'unavailable',
  'unsupported',
] as const;
export const DEPENDENCY_KINDS = ['parent', 'include', 'reference'] as const;
export const PROBLEM_SEVERITIES = ['error', 'warning', 'info'] as const;
export const PROBLEM_ORIGINS = ['compiler', 'process'] as const;

/** Authored display status. An unset status stays null. */
export type PageStatus = (typeof PAGE_STATUSES)[number];

export const PageSummarySchema = z
  .object({
    entityId: EntityIdSchema,
    title: z.string().min(1),
    sourcePath: SourcePathSchema,
    parentId: EntityIdSchema.nullable(),
    role: z.enum(PAGE_ROLES),
    status: z.enum(PAGE_STATUSES).nullable(),
    tags: z.array(z.string().min(1)),
    publishedUrl: z.string().min(1).nullable(),
  })
  .superRefine((page, ctx) => {
    if (page.role === 'trunk' && page.parentId !== null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Trunk records require a null parent.',
        path: ['parentId'],
      });
    }
    if (page.role === 'satellite' && page.parentId === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Satellite records require a parent ID.',
        path: ['parentId'],
      });
    }
  });
export type PageSummary = z.output<typeof PageSummarySchema>;

/** Either a page endpoint or a source-file endpoint. */
export const DependencyEndpointSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('page'), entityId: EntityIdSchema }),
  z.object({ type: z.literal('source'), sourcePath: SourcePathSchema }),
]);
export type DependencyEndpoint = z.output<typeof DependencyEndpointSchema>;

export const DependencySchema = z.object({
  kind: z.enum(DEPENDENCY_KINDS),
  from: DependencyEndpointSchema,
  to: DependencyEndpointSchema,
});
export type Dependency = z.output<typeof DependencySchema>;

/**
 * Structured diagnostic. Unknown locations and unknown codes are null.
 * Locations are project-relative; HTML is never embedded in messages.
 */
export const ProblemSchema = z.object({
  severity: z.enum(PROBLEM_SEVERITIES),
  code: z.string().min(1).nullable(),
  message: z.string().min(1),
  sourcePath: SourcePathSchema.nullable(),
  line: z.number().int().positive().nullable(),
  column: z.number().int().positive().nullable(),
  origin: z.enum(PROBLEM_ORIGINS),
});
export type Problem = z.output<typeof ProblemSchema>;

/**
 * Graph view of the current source revision.
 *
 * - `current`: `graphRevision` equals `sourceRevision`.
 * - `stale`: `graphRevision` names an earlier valid revision.
 * - `unavailable`: no valid graph exists and `graphRevision` is null.
 * - `unsupported`: the producer format is unsupported; no graph is
 *   presented as valid.
 *
 * For `unavailable` and `unsupported`, `pages` and `dependencies` are
 * empty. These are explicit response variants, not flags on arrays.
 */
export const PageIndexSchema = z
  .object({
    sourceRevision: SourceRevisionSchema,
    graphRevision: SourceRevisionSchema.nullable(),
    state: z.enum(PAGE_INDEX_STATES),
    pages: z.array(PageSummarySchema),
    dependencies: z.array(DependencySchema),
    problems: z.array(ProblemSchema),
  })
  .superRefine((index, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: 'custom', message, path });
    switch (index.state) {
      case 'current':
        if (index.graphRevision !== index.sourceRevision) {
          issue(
            'Current graph data requires graphRevision to equal sourceRevision.',
            ['graphRevision'],
          );
        }
        break;
      case 'stale':
        if (index.graphRevision === null) {
          issue('Stale data requires a non-null earlier graph revision.', [
            'graphRevision',
          ]);
        } else if (index.graphRevision === index.sourceRevision) {
          issue('Stale data requires graphRevision to differ from sourceRevision.', [
            'graphRevision',
          ]);
        }
        break;
      case 'unavailable':
      case 'unsupported':
        if (index.graphRevision !== null) {
          issue(
            `A ${index.state} index must not present a graph revision.`,
            ['graphRevision'],
          );
        }
        if (index.pages.length > 0) {
          issue(`A ${index.state} index must not present pages.`, ['pages']);
        }
        if (index.dependencies.length > 0) {
          issue(
            `A ${index.state} index must not present dependencies.`,
            ['dependencies'],
          );
        }
        break;
    }
  });
export type PageIndex = z.output<typeof PageIndexSchema>;
