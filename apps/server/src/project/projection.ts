import {
  EntityIdSchema,
  PageIndexSchema,
  ProblemSchema,
  SourcePathSchema,
  type DependencyEndpoint,
  type PageIndex,
  type Problem,
  type SourceRevision,
} from '@obsequious/contracts';
import {
  ArtifactError,
  type BorisDiagnostic,
  type BorisDocumentationIntelligenceReport,
  type BorisEndpoint,
} from '../boris/artifacts.js';
import type { indexSource } from '../boris/operations.js';

function projectPath(path: string) {
  // Boris paths are content-root-relative, including paths whose first
  // authored directory is itself named "content". Never guess a prefix.
  return SourcePathSchema.safeParse(`content/${path}`);
}

export function diagnosticProblem(diagnostic: BorisDiagnostic): Problem {
  const path = diagnostic.sourcePath === null ? null : projectPath(diagnostic.sourcePath);
  return ProblemSchema.parse({
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.remediation
      ? `${diagnostic.message}\nNext step: ${diagnostic.remediation}`
      : diagnostic.message,
    sourcePath: path?.success ? path.data : null,
    line: diagnostic.line,
    column: diagnostic.column,
    origin: 'compiler',
  });
}

export function unavailableIndex(
  revision: SourceRevision,
  problems: Problem[],
  state: 'unavailable' | 'unsupported' = 'unavailable',
): PageIndex {
  return PageIndexSchema.parse({
    sourceRevision: revision, graphRevision: null, state,
    pages: [], dependencies: [], problems,
  });
}

export function processProblem(code: string, message: string): Problem {
  return ProblemSchema.parse({
    severity: 'error', code, message, sourcePath: null,
    line: null, column: null, origin: 'process',
  });
}

/** A shape projection only. Parentage and edges come directly from Boris. */
export function projectPageIndex(
  revision: SourceRevision,
  artifacts: NonNullable<Awaited<ReturnType<typeof indexSource>>['artifacts']>,
  analysis: BorisDocumentationIntelligenceReport,
): PageIndex {
  const { manifest, graph, buildReport } = artifacts;
  if (
    graph.nodes.length !== manifest.pages.length ||
    graph.nodes.some((node, i) => {
      const page = manifest.pages[i];
      return !page || ['id', 'sourcePath', 'role', 'parent', 'title', 'status'].some(
        key => node[key as keyof typeof node] !== page[key as keyof typeof page],
      );
    })
  ) {
    throw new ArtifactError('invalid', 'graph.json', 'Producer page summaries disagree.');
  }
  const sourcePath = (path: string) => {
    const result = projectPath(path);
    if (!result.success) {
      throw new ArtifactError('unsupported_version', 'graph.json', 'Unsupported source path format.');
    }
    return result.data;
  };
  const endpoint = (value: BorisEndpoint): DependencyEndpoint =>
    value.type === 'page'
      ? { type: 'page', entityId: EntityIdSchema.parse(value.value) }
      : { type: 'source', sourcePath: sourcePath(value.value) };
  return PageIndexSchema.parse({
    sourceRevision: revision,
    graphRevision: revision,
    state: 'current',
    pages: graph.nodes.map(node => ({
      entityId: node.id,
      // An omitted authored title falls back to the compiler's opaque ID,
      // never a title parsed or humanized by a second renderer.
      title: node.title || node.id,
      sourcePath: sourcePath(node.sourcePath),
      parentId: node.parent,
      role: node.role,
      status: node.status,
      tags: node.tags,
      publishedUrl: null,
    })),
    dependencies: graph.edges.map(edge => ({
      kind: edge.kind, from: endpoint(edge.from), to: endpoint(edge.to),
    })),
    problems: [
      ...buildReport.diagnostics.map(diagnosticProblem),
      ...analysis.findings.map(finding => ({
        severity: 'info',
        code: finding.code,
        message: `Boris graph check: ${finding.code} (count: ${finding.count}).`,
        sourcePath: finding.sourcePath === null ? null : sourcePath(finding.sourcePath),
        line: finding.line,
        column: finding.column,
        origin: 'compiler',
      })),
    ],
  });
}
