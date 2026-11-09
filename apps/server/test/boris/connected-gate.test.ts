import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PageIndexSchema, SiteSummarySchema, SourceBufferSchema, SourcePathSchema, SOURCE_BYTE_LIMIT,
} from '@obsequious/contracts';
import { buildApp } from '../../src/app.js';
import { verifyApprovedCompiler } from '../../src/boris/provenance.js';
import { ProjectReader } from '../../src/project/reader.js';
import * as snapshots from '../../src/project/snapshot.js';
import * as operations from '../../src/boris/operations.js';

let executable: string;
const roots: string[] = [];
const apps: ReturnType<typeof buildApp>[] = [];
const readers: ProjectReader[] = [];
const fixture = fileURLToPath(new URL('./fixtures/site', import.meta.url));

beforeAll(async () => {
  if (!process.env.BORIS_BIN) throw new Error('BORIS_BIN is required for the connected real-compiler gate.');
  executable = process.env.BORIS_BIN;
  await verifyApprovedCompiler(executable);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(apps.splice(0).map(app => app.close()));
  await Promise.all(readers.splice(0).map(reader => reader.close()));
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'obsequious-m1-real-'));
  roots.push(root);
  await cp(fixture, root, { recursive: true });
  const reader = new ProjectReader({ projectRoot: root, executable });
  readers.push(reader);
  return { root, reader };
}
async function treeHash(root: string): Promise<string> {
  const records: string[] = [];
  const visit = async (directory: string, prefix: string) => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) await visit(path, `${relative}/`);
      else records.push(`${relative}:${createHash('sha256').update(await readFile(path)).digest('hex')}`);
    }
  };
  await visit(root, '');
  return createHash('sha256').update(records.join('\n')).digest('hex');
}

describe('M1 real compiler and private application boundary', () => {
  it('serves real page metadata, compiler edges and exact included source over loopback HTTP', async () => {
    const { root, reader } = await setup();
    const include = join(root, 'content/includes/watering-note.md');
    const original = (await readFile(include, 'utf8')).replaceAll('\r\n', '\n').replaceAll('\n', '\r\n');
    await writeFile(include, original);
    const before = await treeHash(root);
    const app = buildApp({ project: reader });
    apps.push(app);
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing loopback address.');
    const base = `http://127.0.0.1:${address.port}`;
    const response = await fetch(`${base}/api/v1/pages`);
    expect(response.status).toBe(200);
    const index = PageIndexSchema.parse(await response.json());
    expect(index.state).toBe('current');
    expect(index.graphRevision).toBe(index.sourceRevision);
    expect(index.pages.map(page => page.entityId)).toEqual(['about', 'guides/ferns', 'guides/ferns-care', 'index']);
    expect(index.pages.find(page => page.entityId === 'guides/ferns')).toMatchObject({
      title: 'Ferns of the valley', tags: ['plants', 'guides'], parentId: 'index', publishedUrl: null,
    });
    expect(index.dependencies).toContainEqual({
      kind: 'include', from: { type: 'page', entityId: 'guides/ferns' },
      to: { type: 'source', sourcePath: 'content/includes/watering-note.md' },
    });
    expect(index.problems).toContainEqual(expect.objectContaining({
      code: 'unreferenced_page', sourcePath: 'content/index.md', origin: 'compiler',
    }));
    const query = new URLSearchParams({
      path: 'content/includes/watering-note.md', sourceRevision: index.sourceRevision,
    });
    const source = SourceBufferSchema.parse(await fetch(`${base}/api/v1/source?${query}`).then(result => result.json()));
    expect(Buffer.from(source.content)).toEqual(Buffer.from(original));
    expect(source.fileHash).toBe(createHash('sha256').update(original).digest('hex'));
    const site = SiteSummarySchema.parse(await fetch(`${base}/api/v1/site`).then(result => result.json()));
    expect(site.sourceRevision).toBe(index.sourceRevision);
    expect(site.activeReleaseId).toBeNull();
    expect(await treeHash(root)).toBe(before);
  });

  it('returns fresh located diagnostics on content failure and a current graph after external repair', async () => {
    const { root, reader } = await setup();
    const before = await treeHash(root);
    const app = buildApp({ project: reader });
    apps.push(app);
    const initial = PageIndexSchema.parse((await app.inject('/api/v1/pages')).json());
    expect(initial.state).toBe('current');
    const broken = join(root, 'content/broken.md');
    await writeFile(broken, '---\nparent: missing-parent\n---\n# Broken page\n');
    const failed = PageIndexSchema.parse((await app.inject('/api/v1/pages')).json());
    expect(failed.state).toBe('unavailable');
    expect(failed.pages).toEqual([]);
    expect(failed.dependencies).toEqual([]);
    expect(failed.graphRevision).toBeNull();
    expect(failed.sourceRevision).not.toBe(initial.sourceRevision);
    expect(failed.problems).toContainEqual(expect.objectContaining({
      code: 'EPARENTMISSING', sourcePath: 'content/broken.md',
      line: expect.any(Number), column: expect.any(Number), origin: 'compiler',
    }));
    const diagnostic = failed.problems.find(problem => problem.code === 'EPARENTMISSING');
    expect(diagnostic?.line).toBeGreaterThan(0);
    expect(diagnostic?.column).toBeGreaterThan(0);
    await rm(broken);
    const repaired = PageIndexSchema.parse((await app.inject('/api/v1/pages')).json());
    expect(repaired.state).toBe('current');
    expect(repaired.sourceRevision).not.toBe(failed.sourceRevision);
    expect(repaired.problems.some(problem => problem.code === 'EPARENTMISSING')).toBe(false);
    expect(await treeHash(root)).toBe(before);
  });

  it('keeps unsupported profiles and conditional IR explicit rather than returning an empty current site', async () => {
    const { root, reader } = await setup();
    await cp(fileURLToPath(new URL('./fixtures/boris-editions.json', import.meta.url)), join(root, 'boris.json'));
    const unsupportedProfile = await reader.getPages();
    expect(unsupportedProfile).toMatchObject({
      state: 'unsupported', graphRevision: null, pages: [], dependencies: [],
    });
    expect(unsupportedProfile.problems[0]?.code).toBe('unsupported_profile');
    await cp(join(fixture, 'boris.json'), join(root, 'boris.json'));
    const about = join(root, 'content/about.md');
    const source = await readFile(about, 'utf8');
    await writeFile(about, source.replace('---\n', '---\nrelations: [relates_to=guides/ferns]\n'));
    const unsupportedIR = await reader.getPages();
    expect(unsupportedIR).toMatchObject({ state: 'unsupported', graphRevision: null, pages: [] });
    expect(unsupportedIR.problems[0]?.code).toBe('unsupported_producer');
  });

  it('indexes an isolated copy even when the live project changes before compiler execution', async () => {
    const { root, reader } = await setup();
    const path = SourcePathSchema.parse('content/index.md');
    const original = await readFile(join(root, path), 'utf8');
    const copy = snapshots.createProjectSnapshot;
    vi.spyOn(snapshots, 'createProjectSnapshot').mockImplementationOnce(async selected => {
      const owned = await copy(selected);
      await writeFile(join(root, path), `${original}\nChanged externally after capture.\n`);
      return owned;
    });
    const first = await reader.getPages();
    expect(first.state).toBe('current');
    expect((await reader.getSource({ path, sourceRevision: first.sourceRevision })).content).toBe(original);
    const afterExternalChange = await treeHash(root);
    const second = await reader.getPages();
    expect((await reader.getSource({ path, sourceRevision: second.sourceRevision })).content)
      .toBe(`${original}\nChanged externally after capture.\n`);
    expect(await treeHash(root)).toBe(afterExternalChange);
  });

  it('refuses a fault-injected run-planted source symlink at the actual HTTP boundary', async () => {
    const { root, reader } = await setup();
    const outside = await mkdtemp(join(tmpdir(), 'obsequious-m1-sentinel-'));
    roots.push(outside);
    const sentinel = join(outside, 'private.md');
    await writeFile(sentinel, 'external sentinel must never be returned');
    const realCheck = operations.checkGraph;
    vi.spyOn(operations, 'checkGraph').mockImplementationOnce(async (...args) => {
      const result = await realCheck(...args);
      // Controlled filesystem fault after a real run, not a substitute compiler.
      await rm(join(args[1].root, 'content/index.md'));
      await symlink(sentinel, join(args[1].root, 'content/index.md'));
      return result;
    });
    const app = buildApp({ project: reader });
    apps.push(app);
    const index = PageIndexSchema.parse((await app.inject('/api/v1/pages')).json());
    expect(index.state, JSON.stringify(index.problems)).toBe('current');
    const response = await app.inject(`/api/v1/source?${new URLSearchParams({
      path: 'content/index.md', sourceRevision: index.sourceRevision,
    })}`);
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('external sentinel');
    expect(await readFile(sentinel, 'utf8')).toBe('external sentinel must never be returned');
    expect(await readFile(join(root, 'content/index.md'))).toEqual(await readFile(join(fixture, 'content/index.md')));
  });

  it('retains bounded immutable source history and explicitly expires old revisions', async () => {
    const { reader } = await setup();
    const first = await reader.getPages();
    const second = await reader.getPages();
    const path = SourcePathSchema.parse('content/index.md');
    expect((await reader.getSource({ path, sourceRevision: first.sourceRevision })).content).toContain('Field Notes');
    for (let i = 0; i < 3; i++) await reader.getPages();
    await expect(reader.getSource({ path, sourceRevision: first.sourceRevision }))
      .rejects.toMatchObject({ code: 'not_found' });
    expect((await reader.getSource({ path, sourceRevision: second.sourceRevision })).content).toContain('Field Notes');
  });

  it('preserves the 8 MiB raw-source limit independently of Boris’s documented 1 MiB parser limit', async () => {
    const { root, reader } = await setup();
    const sourcePath = SourcePathSchema.parse('content/index.md');
    const header = '---\ntitle: Field Notes\n---\n# Field Notes\n\n';
    const app = buildApp({ project: reader });
    apps.push(app);
    // Independent authority: pinned Boris docs/contracts/frontmatter.md:288
    // and src/parser.zig:328-329, not the application SourceBuffer limit.
    const compilerLimit = 1024 * 1024;
    for (const size of [compilerLimit - 1, compilerLimit, compilerLimit + 1, SOURCE_BYTE_LIMIT]) {
      const content = header + 'x'.repeat(size - Buffer.byteLength(header));
      await writeFile(join(root, sourcePath), content);
      const before = await treeHash(root);
      const index = PageIndexSchema.parse((await app.inject('/api/v1/pages')).json());
      expect(index.state).toBe(size <= compilerLimit ? 'current' : 'unavailable');
      if (size > compilerLimit) {
        expect(index.pages).toEqual([]);
        expect(index.graphRevision).toBeNull();
        expect(index.problems).toContainEqual(expect.objectContaining({
          code: 'EFRONTMATTER', sourcePath,
          message: expect.stringContaining('source exceeds maximum accepted size'),
          line: 1, column: 1,
        }));
      }
      const response = await app.inject(`/api/v1/source?${new URLSearchParams({
        path: sourcePath, sourceRevision: index.sourceRevision,
      })}`);
      expect(response.statusCode).toBe(200);
      const source = SourceBufferSchema.parse(response.json());
      expect(Buffer.byteLength(source.content)).toBe(size);
      expect(source.content).toBe(content);
      expect(source.sourceRevision).toBe(index.sourceRevision);
      expect(await treeHash(root)).toBe(before);
    }
    await writeFile(join(root, sourcePath), 'x'.repeat(SOURCE_BYTE_LIMIT + 1));
    const refused = await app.inject('/api/v1/pages');
    expect(refused.statusCode).toBe(422);
    expect(refused.json().error.code).toBe('unsupported');
    expect(refused.json()).not.toHaveProperty('pages');
  });

  it('reverifies the configured compiler after an earlier successful run', async () => {
    const { root } = await setup();
    const binaries = await mkdtemp(join(tmpdir(), 'obsequious-m1-executable-'));
    roots.push(binaries);
    const selectedExecutable = join(binaries, 'boris');
    await cp(executable, selectedExecutable);
    const reader = new ProjectReader({ projectRoot: root, executable: selectedExecutable });
    readers.push(reader);
    expect((await reader.getPages()).state).toBe('current');
    await writeFile(selectedExecutable, 'Replaced, unapproved bytes.');
    await expect(reader.getPages()).rejects.toMatchObject({ code: 'unavailable' });
    await cp(executable, selectedExecutable);
    expect((await reader.getPages()).state).toBe('current');
  });

  it('serializes overlapping reads while keeping each immutable source identity usable', async () => {
    const { root, reader } = await setup();
    const before = await treeHash(root);
    const [first, second, site] = await Promise.all([
      reader.getPages(), reader.getPages(), reader.getSite(),
    ]);
    expect(first.graphRevision).toBe(first.sourceRevision);
    expect(second.graphRevision).toBe(second.sourceRevision);
    expect(first.sourceRevision).not.toBe(second.sourceRevision);
    expect(site.sourceRevision).toBe(second.sourceRevision);
    const path = SourcePathSchema.parse('content/index.md');
    const [older, newer] = await Promise.all([
      reader.getSource({ path, sourceRevision: first.sourceRevision }),
      reader.getSource({ path, sourceRevision: second.sourceRevision }),
    ]);
    expect(older.content).toBe(newer.content);
    expect(older.sourceRevision).not.toBe(newer.sourceRevision);
    expect(await treeHash(root)).toBe(before);
  });

  it('cleans an in-flight snapshot on shutdown and refuses work queued after close', async () => {
    const { reader } = await setup();
    const copy = snapshots.createProjectSnapshot;
    let notifyCopied!: () => void;
    let releaseCopy!: () => void;
    let workspaceRoot = '';
    const copied = new Promise<void>(resolve => { notifyCopied = resolve; });
    const release = new Promise<void>(resolve => { releaseCopy = resolve; });
    vi.spyOn(snapshots, 'createProjectSnapshot').mockImplementationOnce(async selected => {
      const owned = await copy(selected);
      workspaceRoot = owned.workspace.root;
      notifyCopied();
      await release;
      return owned;
    });
    const pending = reader.getPages();
    await copied;
    const closing = reader.close();
    const refused = expect(reader.getPages()).rejects.toMatchObject({ code: 'unavailable' });
    releaseCopy();
    expect((await pending).state).toBe('current');
    await closing;
    await refused;
    await expect(readdir(workspaceRoot)).rejects.toHaveProperty('code', 'ENOENT');
  });

  it('keeps an authored content subfolder distinct from the configured content root', async () => {
    const { root, reader } = await setup();
    const nested = join(root, 'content/content/nested.md');
    await mkdir(join(root, 'content/content'));
    const source = '---\ntitle: Nested source folder\nparent: index\n---\n# Nested\n';
    await writeFile(nested, source);
    const index = await reader.getPages();
    expect(index.state).toBe('current');
    expect(index.pages).toContainEqual(expect.objectContaining({
      entityId: 'content/nested', parentId: 'index', sourcePath: 'content/content/nested.md',
    }));
    expect((await reader.getSource({
      path: SourcePathSchema.parse('content/content/nested.md'), sourceRevision: index.sourceRevision,
    })).content).toBe(source);
    await writeFile(nested, source.replace('parent: index', 'parent: missing-parent'));
    const failed = await reader.getPages();
    expect(failed.state).toBe('unavailable');
    expect(failed.problems).toContainEqual(expect.objectContaining({
      code: 'EPARENTMISSING', sourcePath: 'content/content/nested.md',
    }));
  });
});
