import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('GET /api/v1/health', () => {
  it('returns HTTP 200 with a minimal JSON body through the real Fastify pipeline', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('binds the development listener to the loopback interface only and serves the endpoint', async () => {
    const app = buildApp();
    await app.listen({ host: '127.0.0.1', port: 0 });

    try {
      const address = app.server.address();
      expect(address).not.toBeNull();
      expect(typeof address).toBe('object');
      if (typeof address !== 'object' || address === null) {
        throw new Error('unreachable: address shape asserted above');
      }
      expect(address.address).toBe('127.0.0.1');

      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/health`,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'ok' });
    } finally {
      await app.close();
    }
  });
});
