import { describe, expect, it, vi } from 'vitest';
import {
  FileHashSchema, SourcePathSchema, SourceRevisionSchema,
} from '@obsequious/contracts';
import { createConnectedClient } from './client';

const revision = SourceRevisionSchema.parse('http-test-snapshot');
const path = SourcePathSchema.parse('content/index.md');
const index = {
  sourceRevision: revision, graphRevision: revision, state: 'current',
  pages: [], dependencies: [], problems: [],
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

describe('connected HTTP client', () => {
  it('does not replace the visible revision with an older overlapping response', async () => {
    let finishFirst!: (value: Response) => void;
    let finishSecond!: (value: Response) => void;
    const fetcher = vi.fn<typeof fetch>()
      .mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { finishSecond = resolve; }));
    const onIndex = vi.fn();
    const client = createConnectedClient({ fetch: fetcher, onIndex });
    const first = client.getPages();
    const second = client.getPages();
    const newer = { ...index, sourceRevision: 'newer', graphRevision: 'newer' };
    finishSecond(json(newer));
    await second;
    finishFirst(json(index));
    await first;
    expect(onIndex.mock.calls).toEqual([[null], [null], [newer]]);
  });
  it('uses real same-origin read endpoints without credentials or cached/demo data', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(index));
    const onIndex = vi.fn();
    const client = createConnectedClient({ fetch: fetcher, onIndex });
    expect(await client.getPages()).toEqual(index);
    expect(client.mode).toBe('connected');
    expect(fetcher).toHaveBeenCalledWith('/api/v1/pages', expect.objectContaining({
      credentials: 'omit', cache: 'no-store',
    }));
    expect(onIndex.mock.calls).toEqual([[null], [index]]);
  });
  it('preserves typed HTTP errors and request IDs without switching modes', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({
      error: { code: 'unavailable', message: 'Compiler unavailable.' }, requestId: 'request-42',
    }, 503));
    const client = createConnectedClient({ fetch: fetcher });
    await expect(client.getPages()).rejects.toMatchObject({
      code: 'unavailable', requestId: 'request-42',
    });
    expect(client.mode).toBe('connected');
  });
  it('rejects real transport failure, unreadable JSON, and malformed success bodies', async () => {
    for (const fetcher of [
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network')),
      vi.fn<typeof fetch>().mockResolvedValue(new Response('not JSON')),
      vi.fn<typeof fetch>().mockResolvedValue(json({ pages: [] })),
    ]) {
      const client = createConnectedClient({ fetch: fetcher });
      await expect(client.getPages()).rejects.toHaveProperty('code');
      expect(client.mode).toBe('connected');
    }
  });
  it('forwards validated source identity and rejects a mismatched response', async () => {
    const buffer = {
      path, sourceRevision: revision, fileHash: FileHashSchema.parse('a'.repeat(64)),
      content: '# Raw\r\n',
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(buffer));
    const client = createConnectedClient({ fetch: fetcher });
    expect((await client.getSource({ path, sourceRevision: revision })).content).toBe('# Raw\r\n');
    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/source?path=content%2Findex.md&sourceRevision=http-test-snapshot',
      expect.any(Object),
    );
    fetcher.mockResolvedValue(json({ ...buffer, sourceRevision: 'other-snapshot' }));
    await expect(client.getSource({ path, sourceRevision: revision })).rejects.toMatchObject({ code: 'conflict' });
  });
  it('never invents mutation, readiness, or job endpoints', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = createConnectedClient({ fetch: fetcher });
    await expect(client.getReadiness()).rejects.toMatchObject({ code: 'unsupported' });
    await expect(client.saveSource({
      path, expectedSourceRevision: revision,
      expectedFileHash: FileHashSchema.parse('a'.repeat(64)), content: '# No save\n',
    }, 'idempotency-key')).rejects.toMatchObject({ code: 'unsupported' });
    await expect(client.startJob({ kind: 'index', sourceRevision: revision }, 'key')).rejects.toMatchObject({ code: 'unsupported' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
