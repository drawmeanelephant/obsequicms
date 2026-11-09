import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ApiError, ErrorResponseSchema, SOURCE_BYTE_LIMIT, SourcePathSchema,
  SourceRevisionSchema, type PageIndex,
} from '@obsequious/contracts';
import { buildApp } from '../src/app.js';
import { projectConfig } from '../src/config.js';
import {
  createProjectSnapshot, readSnapshotSource, type ProjectSnapshot,
} from '../src/project/snapshot.js';
import {
  diagnosticProblem, projectPageIndex, unavailableIndex,
} from '../src/project/projection.js';
import {
  readDocumentationIntelligenceReport, readIrBuildReport,
  readIrCompletion, readIrGraph, readIrManifest,
} from '../src/boris/artifacts.js';
import type { ReadOnlyProject } from '../src/project/reader.js';

const roots: string[] = [];
const snapshots: ProjectSnapshot[] = [];
const apps: ReturnType<typeof buildApp>[] = [];
const path = SourcePathSchema.parse('content/index.md');
const revision = SourceRevisionSchema.parse('unit-source-revision');
const empty: PageIndex = {
  sourceRevision: revision, graphRevision: revision, state: 'current',
  pages: [], dependencies: [], problems: [],
};

async function project(content = '# Owner project\r\n\r\nExact UTF-8: café.\r\n') {
  const root = await mkdtemp(join(tmpdir(), 'obsequious-m1-test-'));
  roots.push(root);
  await mkdir(join(root, 'content'));
  await writeFile(join(root, path), content);
  return root;
}
async function snapshot(root: string) {
  const result = await createProjectSnapshot(root);
  snapshots.push(result);
  return result;
}
function application(source?: ProjectSnapshot, index = empty) {
  const reader: ReadOnlyProject = {
    getSite: async () => ({ name: 'Unit boundary project', sourceRevision: index.sourceRevision, activeReleaseId: null }),
    getPages: async () => index,
    getSource: async request => {
      if (!source || request.sourceRevision !== source.sourceRevision) {
        throw new ApiError('not_found', 'Unknown source snapshot.');
      }
      return readSnapshotSource(source, request.path);
    },
    close: async () => undefined,
  };
  const app = buildApp({ project: reader });
  apps.push(app);
  return app;
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()));
  await Promise.all(snapshots.splice(0).map(value => value.workspace.cleanup()));
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('operator configuration and private transport', () => {
  it('never selects a project by default or from compiler configuration alone', () => {
    expect(projectConfig({})).toBeNull();
    expect(projectConfig({ BORIS_BIN: '/some/compiler' })).toBeNull();
    expect(() => projectConfig({ OBSEQUIOUS_PROJECT_ROOT: 'relative' })).toThrow();
    expect(() => projectConfig({ OBSEQUIOUS_PROJECT_ROOT: '/some/project' })).toThrow();
    expect(projectConfig({
      OBSEQUIOUS_PROJECT_ROOT: '/some/project', BORIS_BIN: '/some/compiler',
    })).toEqual({ projectRoot: '/some/project', executable: '/some/compiler' });
  });
  it('refuses a non-loopback bind before exposing a socket', async () => {
    const app = application();
    await expect(app.listen({ host: '0.0.0.0', port: 0 })).rejects.toThrow(/loopback/);
    expect(app.server.address()).toBeNull();
  });
  it('refuses foreign Host and Origin headers without allowing cross-origin access', async () => {
    const app = application();
    for (const headers of [{ host: 'outside.example' }, { origin: 'https://outside.example' }]) {
      const response = await app.inject({ url: '/api/v1/pages', headers });
      expect(response.statusCode).toBe(403);
      expect(ErrorResponseSchema.parse(response.json()).error.code).toBe('forbidden');
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    }
  });
  it('serves only health when no project is configured', async () => {
    const app = buildApp();
    apps.push(app);
    expect((await app.inject('/api/v1/health')).json()).toEqual({ status: 'ok' });
    expect((await app.inject('/api/v1/pages')).statusCode).toBe(404);
  });
  it('returns validated read responses and keeps all mutation/provider routes absent', async () => {
    const app = application();
    expect((await app.inject('/api/v1/pages')).json()).toEqual(empty);
    expect((await app.inject('/api/v1/site')).json()).toMatchObject({ activeReleaseId: null });
    for (const [method, url] of [
      ['PUT', '/api/v1/source'], ['POST', '/api/v1/jobs'],
      ['GET', '/api/v1/readiness'], ['GET', '/api/v1/session'],
    ] as const) {
      const response = await app.inject({ method, url });
      expect(response.statusCode).toBe(404);
      expect(ErrorResponseSchema.parse(response.json()).error.code).toBe('not_found');
    }
  });
  it('rejects path/process/project controls and unknown query fields', async () => {
    const app = application();
    for (const url of [
      '/api/v1/pages?project=/tmp/other', '/api/v1/site?executable=boris',
      '/api/v1/source?path=/etc/passwd&sourceRevision=r',
      '/api/v1/source?path=content/../private.md&sourceRevision=r',
      '/api/v1/source?path=content%5Cindex.md&sourceRevision=r',
      '/api/v1/source?path=content/index.md&sourceRevision=r&flags=--serve',
      '/api/v1/source?path=content/index.md&path=content/other.md&sourceRevision=r',
    ]) {
      const response = await app.inject(url);
      expect(response.statusCode, url).toBe(400);
      expect(ErrorResponseSchema.parse(response.json()).error.code).toBe('invalid_request');
    }
  });
  it('never replaces a failed project request with demo or empty data', async () => {
    const app = buildApp({ project: {
      getSite: async () => { throw new Error('private path must not leak'); },
      getPages: async () => { throw new Error('private path must not leak'); },
      getSource: async () => { throw new Error('private path must not leak'); },
      close: async () => undefined,
    } });
    apps.push(app);
    const response = await app.inject('/api/v1/pages');
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('private path must not leak');
    expect(response.json()).not.toHaveProperty('pages');
    expect(ErrorResponseSchema.parse(response.json()).error.code).toBe('unavailable');
  });
});

describe('isolated source snapshots through the HTTP source boundary', () => {
  it('does not copy private environment files or generated root directories', async () => {
    const root = await project();
    await writeFile(join(root, '.env'), 'Private environment metadata, not source.');
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'dist/index.html'), 'Old generated output.');
    const owned = await snapshot(root);
    await expect(readFile(join(owned.workspace.root, '.env'))).rejects.toHaveProperty('code', 'ENOENT');
    await expect(readFile(join(owned.workspace.root, 'dist/index.html'))).rejects.toHaveProperty('code', 'ENOENT');
    expect(await readFile(join(root, '.env'), 'utf8')).toBe('Private environment metadata, not source.');
  });
  it('returns exact CRLF, UTF-8, hash and snapshot identity without touching live bytes', async () => {
    const root = await project();
    const before = await readFile(join(root, path));
    const owned = await snapshot(root);
    const response = await application(owned).inject(
      `/api/v1/source?${new URLSearchParams({ path, sourceRevision: owned.sourceRevision })}`,
    );
    expect(response.statusCode).toBe(200);
    expect(Buffer.from(response.json().content)).toEqual(before);
    expect(response.json().fileHash).toBe(createHash('sha256').update(before).digest('hex'));
    expect(response.json().sourceRevision).toBe(owned.sourceRevision);
    expect(await readFile(join(root, path))).toEqual(before);
  });
  it('keeps a snapshot unchanged when the live project changes after copying', async () => {
    const root = await project('# Before\n');
    const owned = await snapshot(root);
    await writeFile(join(root, path), '# After\n');
    expect((await readSnapshotSource(owned, path)).content).toBe('# Before\n');
  });
  it('refuses unknown paths and expired/unknown revisions', async () => {
    const owned = await snapshot(await project());
    const app = application(owned);
    for (const query of [
      { path: 'content/unknown.md', sourceRevision: owned.sourceRevision },
      { path, sourceRevision: 'unknown-revision' },
    ]) {
      const response = await app.inject(`/api/v1/source?${new URLSearchParams(query)}`);
      expect(response.statusCode).toBe(404);
      expect(ErrorResponseSchema.parse(response.json()).error.code).toBe('not_found');
    }
  });
  it('rejects a live source symlink and symlinked content directory', async () => {
    const root = await project();
    const external = await project('outside sentinel');
    await symlink(join(external, path), join(root, 'content/link.md'));
    await expect(createProjectSnapshot(root)).rejects.toThrow(/symlink/);
    await rm(join(root, 'content'), { recursive: true });
    await symlink(join(external, 'content'), join(root, 'content'));
    await expect(createProjectSnapshot(root)).rejects.toThrow(/symlink/);
    expect(await readFile(join(external, path), 'utf8')).toBe('outside sentinel');
  });
  it('refuses a source symlink planted in a snapshot before an HTTP read', async () => {
    const owned = await snapshot(await project());
    const outside = await project('outside secret sentinel');
    await rm(join(owned.workspace.root, path));
    await symlink(join(outside, path), join(owned.workspace.root, path));
    const response = await application(owned).inject(
      `/api/v1/source?${new URLSearchParams({ path, sourceRevision: owned.sourceRevision })}`,
    );
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('outside secret sentinel');
    expect(await readFile(join(outside, path), 'utf8')).toBe('outside secret sentinel');
  });
  it('serves the full 8 MiB source limit and refuses the first byte beyond it', async () => {
    const root = await project('x'.repeat(SOURCE_BYTE_LIMIT));
    const owned = await snapshot(root);
    const response = await application(owned).inject(
      `/api/v1/source?${new URLSearchParams({ path, sourceRevision: owned.sourceRevision })}`,
    );
    expect(response.statusCode).toBe(200);
    expect(Buffer.byteLength(response.json().content)).toBe(SOURCE_BYTE_LIMIT);
    await writeFile(join(root, path), 'x'.repeat(SOURCE_BYTE_LIMIT + 1));
    await expect(createProjectSnapshot(root)).rejects.toThrow(/8 MiB/);
  });
  it('preserves a UTF-8 BOM and refuses invalid UTF-8 instead of replacing bytes', async () => {
    const root = await project('\ufeff# Original\n');
    const owned = await snapshot(root);
    expect((await readSnapshotSource(owned, path)).content).toBe('\ufeff# Original\n');
    await writeFile(join(owned.workspace.root, path), Buffer.from([0xff, 0xfe]));
    await expect(readSnapshotSource(owned, path)).rejects.toMatchObject({ code: 'unsupported' });
  });
});

describe('compiler artifact projection, not a JavaScript resolver', () => {
  it('preserves recorded compiler IDs, parentage, tags and edge directions', async () => {
    const directory = new URL('./boris/fixtures/captured/', import.meta.url).pathname;
    const [manifest, graph, completion, buildReport, check] = await Promise.all([
      readIrManifest(directory), readIrGraph(directory), readIrCompletion(directory),
      readIrBuildReport(directory), readDocumentationIntelligenceReport(join(directory, 'check.json')),
    ]);
    const index = projectPageIndex(revision, { manifest, graph, completion, buildReport }, check);
    expect(index.pages.map(page => page.entityId)).toEqual(['about', 'guides/ferns', 'guides/ferns-care', 'index']);
    expect(index.pages.find(page => page.entityId === 'guides/ferns-care')).toMatchObject({
      parentId: 'guides/ferns', status: 'draft', sourcePath: 'content/guides/ferns-care.md', publishedUrl: null,
    });
    expect(index.dependencies).toContainEqual({
      kind: 'include', from: { type: 'page', entityId: 'guides/ferns' },
      to: { type: 'source', sourcePath: 'content/includes/watering-note.md' },
    });
    expect(index.dependencies).toContainEqual({
      kind: 'parent', from: { type: 'page', entityId: 'guides/ferns-care' },
      to: { type: 'page', entityId: 'guides/ferns' },
    });
    expect(index.problems).toContainEqual(expect.objectContaining({
      code: 'unreferenced_page', sourcePath: 'content/index.md', line: 1, origin: 'compiler',
    }));
    expect(index.pages).not.toContainEqual(expect.objectContaining({ sourcePath: 'content/includes/watering-note.md' }));
  });
  it('keeps located diagnostics and remediation, never a graph on failure', () => {
    const problem = diagnosticProblem({
      severity: 'error', code: 'EPARENTMISSING', message: 'Missing parent.',
      remediation: 'Choose an existing parent.', sourcePath: 'broken.md',
      line: 2, column: 1, id: null,
    });
    expect(problem).toMatchObject({
      code: 'EPARENTMISSING', sourcePath: 'content/broken.md', line: 2, column: 1,
      message: 'Missing parent.\nNext step: Choose an existing parent.',
    });
    expect(unavailableIndex(revision, [problem])).toMatchObject({
      state: 'unavailable', graphRevision: null, pages: [], dependencies: [],
    });
    expect(unavailableIndex(revision, [], 'unsupported').state).toBe('unsupported');
  });
});
