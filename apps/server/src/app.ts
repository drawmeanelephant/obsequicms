import Fastify, { type FastifyInstance } from 'fastify';
import {
  ApiError, ErrorResponseSchema, PageIndexSchema, SiteSummarySchema,
  SourceBufferSchema, SourcePathSchema, SourceRevisionSchema,
  isApiError, type ApiErrorCode,
} from '@obsequious/contracts';
import { isLoopbackHost, loopbackServer } from './loopback.js';
import type { ReadOnlyProject } from './project/reader.js';

/**
 * Private, read-only M1 transport. Without an operator-selected project it
 * exposes health only. No session, save, job, or publication route exists.
 */
export function buildApp(options: { project?: ReadOnlyProject } = {}): FastifyInstance {
  const app = Fastify({
    logger: false,
    serverFactory: handler => loopbackServer(handler),
  });
  const status: Record<ApiErrorCode, number> = {
    unauthenticated: 401, forbidden: 403, invalid_request: 400,
    not_found: 404, conflict: 409, unsupported: 422, unavailable: 503,
  };
  app.setErrorHandler((error, request, reply) => {
    const failure = isApiError(error)
      ? error
      : new ApiError('unavailable', 'The request could not be completed. No fallback data was used.');
    reply.code(status[failure.code]).send(ErrorResponseSchema.parse({
      error: { code: failure.code, message: failure.message },
      requestId: request.id,
    }));
  });
  app.setNotFoundHandler(() => {
    throw new ApiError('not_found', 'That application endpoint is not implemented.');
  });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
    try {
      if (!isLoopbackHost(new URL(`http://${request.headers.host}`).hostname)) {
        throw new Error('host');
      }
      const origin = request.headers.origin;
      if (origin && !isLoopbackHost(new URL(origin).hostname)) throw new Error('origin');
    } catch {
      throw new ApiError('forbidden', 'Only private loopback requests are accepted.');
    }
  });

  app.get('/api/v1/health', async () => {
    // Minimal response: no paths, versions, or secrets.
    return { status: 'ok' } as const;
  });

  const project = options.project;
  if (project) {
    const noQuery = (query: unknown) => {
      if (typeof query !== 'object' || query === null || Object.keys(query).length) {
        throw new ApiError('invalid_request', 'This endpoint accepts no query fields.');
      }
    };
    app.get('/api/v1/site', async request => {
      noQuery(request.query);
      return SiteSummarySchema.parse(await project.getSite());
    });
    app.get('/api/v1/pages', async request => {
      noQuery(request.query);
      return PageIndexSchema.parse(await project.getPages());
    });
    app.get('/api/v1/source', async request => {
      const query = request.query as Record<string, unknown>;
      const keys = Object.keys(query).sort().join(',');
      const path = SourcePathSchema.safeParse(query.path);
      const revision = SourceRevisionSchema.safeParse(query.sourceRevision);
      if (keys !== 'path,sourceRevision' || !path.success || !revision.success) {
        throw new ApiError('invalid_request', 'Source reads require only a valid path and sourceRevision.');
      }
      return SourceBufferSchema.parse(await project.getSource({
        path: path.data, sourceRevision: revision.data,
      }));
    });
    app.addHook('onClose', async () => project.close());
  }

  return app;
}
