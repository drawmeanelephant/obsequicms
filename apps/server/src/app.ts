import Fastify, { type FastifyInstance } from 'fastify';

/**
 * Builds the application server. The prototype implements only the health
 * endpoint; sessions, source, jobs, and readiness arrive in later milestones
 * (docs/api.md). Listeners are loopback-only by design.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  app.get('/api/v1/health', async () => {
    // Minimal response: no paths, versions, or secrets.
    return { status: 'ok' } as const;
  });

  return app;
}
