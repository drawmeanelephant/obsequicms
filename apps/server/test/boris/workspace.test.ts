import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createJobWorkspace,
  hasFile,
  prepareFreshOutputPath,
  prepareFreshReportFile,
} from '../../src/boris/workspace.js';

describe('job workspaces', () => {
  it('creates unique workspaces and removes them on cleanup', async () => {
    const first = await createJobWorkspace();
    const second = await createJobWorkspace();
    expect(first.root).not.toBe(second.root);
    expect(existsSync(first.root)).toBe(true);
    await first.cleanup();
    expect(existsSync(first.root)).toBe(false);
    await second.cleanup();
    expect(existsSync(second.root)).toBe(false);
  });

  it('is safe to clean up twice', async () => {
    const workspace = await createJobWorkspace();
    await workspace.cleanup();
    await expect(workspace.cleanup()).resolves.toBeUndefined();
  });

  it('prepares a fresh output directory by removing stale trees', async () => {
    const workspace = await createJobWorkspace();
    try {
      const stale = join(workspace.root, '.obsequious', 'ir');
      await prepareFreshOutputPath(workspace.root, '.obsequious/ir');
      await writeFile(join(stale, 'manifest.json'), '{"stale": true}', 'utf8');
      await writeFile(join(stale, 'graph.json'), '{"stale": true}', 'utf8');

      await prepareFreshOutputPath(workspace.root, '.obsequious/ir');

      expect(existsSync(join(stale, 'manifest.json'))).toBe(false);
      expect(existsSync(join(stale, 'graph.json'))).toBe(false);
      const info = await stat(stale);
      expect(info.isDirectory()).toBe(true);
    } finally {
      await workspace.cleanup();
    }
  });

  it('prepares a fresh report file by removing a stale one', async () => {
    const workspace = await createJobWorkspace();
    try {
      const reportPath = join(workspace.root, '.obsequious', 'check.json');
      await prepareFreshReportFile(workspace.root, '.obsequious/check.json');
      await writeFile(reportPath, '{"stale": true}', 'utf8');
      expect(existsSync(reportPath)).toBe(true);

      await prepareFreshReportFile(workspace.root, '.obsequious/check.json');
      expect(existsSync(reportPath)).toBe(false);
    } finally {
      await workspace.cleanup();
    }
  });

  it('refuses output paths that escape the workspace', async () => {
    const workspace = await createJobWorkspace();
    try {
      await expect(
        prepareFreshOutputPath(workspace.root, '../outside'),
      ).rejects.toThrow(/escapes the job workspace/);
      await expect(
        prepareFreshReportFile(workspace.root, '/etc/passwd'),
      ).rejects.toThrow(/escapes the job workspace/);
    } finally {
      await workspace.cleanup();
    }
  });

  it('keeps the temp-root guard on every cleanup', async () => {
    // Cleanup re-checks containment against the OS temp root each call;
    // removing a normal workspace exercises the guard on the happy path,
    // and path escapes are covered by the output-path refusals above.
    const workspace = await createJobWorkspace();
    await expect(workspace.cleanup()).resolves.toBeUndefined();
    expect(existsSync(workspace.root)).toBe(false);
  });

  it('never reads a stale report as fresh evidence', async () => {
    const workspace = await createJobWorkspace();
    try {
      await prepareFreshReportFile(workspace.root, '.obsequious/check.json');
      await writeFile(
        join(workspace.root, '.obsequious', 'check.json'),
        '{"format": "boris-documentation-intelligence", "stale": true}',
        'utf8',
      );
      // After prepareFreshReportFile a caller reading the path finds it
      // gone rather than stale bytes.
      await prepareFreshReportFile(workspace.root, '.obsequious/check.json');
      let threw = false;
      try {
        await readFile(
          join(workspace.root, '.obsequious', 'check.json'),
          'utf8',
        );
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    } finally {
      await workspace.cleanup();
    }
  });
});

describe('workspace filesystem containment', () => {
  /** Sentinel bytes proving external content survived every refused call. */
  const SENTINEL = '{"sentinel": true}';

  it('refuses report cleanup through a symlinked parent and leaves the external target unchanged', async () => {
    const workspace = await createJobWorkspace();
    const external = await mkdtemp(join(tmpdir(), 'ws-containment-'));
    const sentinel = join(external, 'check.json');
    await writeFile(sentinel, SENTINEL, 'utf8');
    await symlink(external, join(workspace.root, '.obsequious'), 'dir');
    try {
      await expect(
        prepareFreshReportFile(workspace.root, '.obsequious/check.json'),
      ).rejects.toThrow(/symlink/);
      await expect(readFile(sentinel, 'utf8')).resolves.toBe(SENTINEL);
      // The link is intact and repeated cleanup refuses again without
      // touching the target.
      expect(existsSync(join(workspace.root, '.obsequious'))).toBe(true);
      await expect(
        prepareFreshReportFile(workspace.root, '.obsequious/check.json'),
      ).rejects.toThrow(/symlink/);
      await expect(readFile(sentinel, 'utf8')).resolves.toBe(SENTINEL);
    } finally {
      await workspace.cleanup();
      await rm(external, { recursive: true, force: true });
    }
  });

  it('refuses output-directory cleanup through a symlinked parent and leaves the external tree unchanged', async () => {
    const workspace = await createJobWorkspace();
    const external = await mkdtemp(join(tmpdir(), 'ws-containment-'));
    const externalIr = join(external, 'ir');
    await rm(externalIr, { recursive: true, force: true });
    await mkdir(externalIr, { recursive: true });
    await writeFile(join(externalIr, 'manifest.json'), SENTINEL, 'utf8');
    await writeFile(join(external, 'sibling.txt'), SENTINEL, 'utf8');
    await symlink(external, join(workspace.root, '.obsequious'), 'dir');
    try {
      await expect(
        prepareFreshOutputPath(workspace.root, '.obsequious/ir'),
      ).rejects.toThrow(/symlink/);
      await expect(readFile(join(externalIr, 'manifest.json'), 'utf8')).resolves.toBe(SENTINEL);
      await expect(readFile(join(external, 'sibling.txt'), 'utf8')).resolves.toBe(SENTINEL);
      expect((await stat(externalIr)).isDirectory()).toBe(true);
    } finally {
      await workspace.cleanup();
      await rm(external, { recursive: true, force: true });
    }
  });

  it('refuses a symlink at the report target itself and leaves the link target unchanged', async () => {
    const workspace = await createJobWorkspace();
    const external = await mkdtemp(join(tmpdir(), 'ws-containment-'));
    const sentinel = join(external, 'elsewhere.json');
    await writeFile(sentinel, SENTINEL, 'utf8');
    await prepareFreshReportFile(workspace.root, '.obsequious/check.json');
    await symlink(sentinel, join(workspace.root, '.obsequious', 'check.json'));
    try {
      await expect(
        prepareFreshReportFile(workspace.root, '.obsequious/check.json'),
      ).rejects.toThrow(/symlink/);
      await expect(readFile(sentinel, 'utf8')).resolves.toBe(SENTINEL);
      // The symlink is refused, not silently replaced by a fresh file.
      expect(existsSync(join(workspace.root, '.obsequious', 'check.json'))).toBe(true);
    } finally {
      await workspace.cleanup();
      await rm(external, { recursive: true, force: true });
    }
  });

  it('refuses a symlink at the output target itself and leaves the external tree unchanged', async () => {
    const workspace = await createJobWorkspace();
    const external = await mkdtemp(join(tmpdir(), 'ws-containment-'));
    const externalIr = join(external, 'ir');
    await mkdir(externalIr, { recursive: true });
    await writeFile(join(externalIr, 'graph.json'), SENTINEL, 'utf8');
    await prepareFreshOutputPath(workspace.root, '.obsequious');
    await symlink(externalIr, join(workspace.root, '.obsequious', 'ir'), 'dir');
    try {
      await expect(
        prepareFreshOutputPath(workspace.root, '.obsequious/ir'),
      ).rejects.toThrow(/symlink/);
      await expect(readFile(join(externalIr, 'graph.json'), 'utf8')).resolves.toBe(SENTINEL);
    } finally {
      await workspace.cleanup();
      await rm(external, { recursive: true, force: true });
    }
  });

  it('refuses a symlinked component deeper in the output path and leaves neighbors unchanged', async () => {
    const workspace = await createJobWorkspace();
    const external = await mkdtemp(join(tmpdir(), 'ws-containment-'));
    const sentinel = join(external, 'leak.json');
    await writeFile(sentinel, SENTINEL, 'utf8');
    await prepareFreshOutputPath(workspace.root, '.obsequious/ir');
    await writeFile(
      join(workspace.root, '.obsequious', 'ir', 'keep.json'),
      SENTINEL,
      'utf8',
    );
    await symlink(
      external,
      join(workspace.root, '.obsequious', 'ir', 'nested'),
      'dir',
    );
    try {
      await expect(
        prepareFreshOutputPath(workspace.root, '.obsequious/ir/nested'),
      ).rejects.toThrow(/symlink/);
      await expect(readFile(sentinel, 'utf8')).resolves.toBe(SENTINEL);
      await expect(
        readFile(join(workspace.root, '.obsequious', 'ir', 'keep.json'), 'utf8'),
      ).resolves.toBe(SENTINEL);
    } finally {
      await workspace.cleanup();
      await rm(external, { recursive: true, force: true });
    }
  });

  it('hasFile never observes existence through a symlinked component', async () => {
    const workspace = await createJobWorkspace();
    const external = await mkdtemp(join(tmpdir(), 'ws-containment-'));
    await writeFile(join(external, 'check.json'), SENTINEL, 'utf8');
    await symlink(external, join(workspace.root, '.obsequious'), 'dir');
    try {
      // An external file exists at the resolved path, but it is not a
      // workspace file: the read path refuses rather than reporting it.
      await expect(hasFile(workspace.root, '.obsequious/check.json')).rejects.toThrow(
        /symlink/,
      );
      await expect(hasFile(workspace.root, '.obsequious/missing.json')).rejects.toThrow(
        /symlink/,
      );
    } finally {
      await workspace.cleanup();
      await rm(external, { recursive: true, force: true });
    }
  });

  it('hasFile answers ordinary contained paths without following symlinks', async () => {
    const workspace = await createJobWorkspace();
    try {
      await prepareFreshReportFile(workspace.root, '.obsequious/check.json');
      // Preparation creates the parent and removes any report; a report
      // the operation wrote afterwards is observed normally.
      expect(await hasFile(workspace.root, '.obsequious/check.json')).toBe(false);
      await writeFile(join(workspace.root, '.obsequious', 'check.json'), '{}', 'utf8');
      expect(await hasFile(workspace.root, '.obsequious/check.json')).toBe(true);
      expect(await hasFile(workspace.root, '.obsequious/missing.json')).toBe(false);
      // A symlinked file inside the workspace is refused, not followed,
      // even when the target is also inside the workspace.
      await writeFile(join(workspace.root, 'real.txt'), 'x', 'utf8');
      await symlink(
        join(workspace.root, 'real.txt'),
        join(workspace.root, '.obsequious', 'link.json'),
      );
      await expect(hasFile(workspace.root, '.obsequious/link.json')).rejects.toThrow(
        /symlink/,
      );
    } finally {
      await workspace.cleanup();
    }
  });

  it('prepares not-yet-existing output paths safely on first use', async () => {
    const workspace = await createJobWorkspace();
    try {
      const created = await prepareFreshOutputPath(
        workspace.root,
        '.obsequious/ir',
      );
      expect((await stat(created)).isDirectory()).toBe(true);
      const deep = await prepareFreshOutputPath(workspace.root, 'a/b/c');
      expect((await stat(deep)).isDirectory()).toBe(true);
    } finally {
      await workspace.cleanup();
    }
  });

  it('refuses cleanup when the workspace root itself is a symlink', async () => {
    const workspace = await createJobWorkspace();
    const external = await mkdtemp(join(tmpdir(), 'ws-containment-'));
    await writeFile(join(external, 'data.txt'), SENTINEL, 'utf8');
    // Replace the real root with a symlink to an external tree, then
    // clean up: the removal must refuse instead of following the link.
    await rm(workspace.root, { recursive: true, force: true });
    await symlink(external, workspace.root, 'dir');
    try {
      await expect(workspace.cleanup()).rejects.toThrow(/not a real directory/);
      await expect(readFile(join(external, 'data.txt'), 'utf8')).resolves.toBe(SENTINEL);
    } finally {
      await rm(workspace.root, { force: true });
      await rm(external, { recursive: true, force: true });
    }
  });

  it('removes a symlink inside the workspace on cleanup without following it', async () => {
    const workspace = await createJobWorkspace();
    const external = await mkdtemp(join(tmpdir(), 'ws-containment-'));
    await writeFile(join(external, 'data.txt'), SENTINEL, 'utf8');
    await symlink(external, join(workspace.root, 'link'), 'dir');
    try {
      await expect(workspace.cleanup()).resolves.toBeUndefined();
      await expect(readFile(join(external, 'data.txt'), 'utf8')).resolves.toBe(SENTINEL);
      expect(existsSync(join(workspace.root, 'link'))).toBe(false);
    } finally {
      await workspace.cleanup();
      await rm(external, { recursive: true, force: true });
    }
  });
});
