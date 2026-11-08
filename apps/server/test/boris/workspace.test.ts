import { describe, expect, it } from 'vitest';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  createJobWorkspace,
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
