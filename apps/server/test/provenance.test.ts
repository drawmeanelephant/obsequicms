import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { approvedCompilerBuild, verifyApprovedCompiler } from '../src/boris/provenance.js';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});
it('keeps separate exact Darwin and Linux pins at the same source revision', () => {
  const darwin = approvedCompilerBuild('darwin', 'arm64');
  const linux = approvedCompilerBuild('linux', 'x64');
  expect(linux.sourceRevision).toBe('c50d8622bd407bcb5f559a4d7ed5da440a2259ec');
  expect(linux.sourceRevision).toBe(darwin.sourceRevision);
  expect(linux.binary.sha256).toBe('b5d72e0751b73e56622b58d3380578aec41a01c463bf50ff6fc0787c5690420a');
  expect(linux.binary.sha256).not.toBe(darwin.binary.sha256);
  expect(() => approvedCompilerBuild('win32', 'x64')).toThrow(/No approved/);
});
it('refuses unapproved bytes before invoking any executable identity operation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'obsequious-pin-test-'));
  roots.push(root);
  const executable = join(root, 'not-approved');
  await writeFile(executable, 'These bytes are not a compiler.');
  await expect(verifyApprovedCompiler(executable)).rejects.toThrow(/digest/);
});
it('refuses executable symlinks rather than trusting their target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'obsequious-pin-test-'));
  roots.push(root);
  const target = join(root, 'target');
  await writeFile(target, 'Not an approved compiler.');
  const executable = join(root, 'link');
  await symlink(target, executable);
  await expect(verifyApprovedCompiler(executable)).rejects.toThrow();
});
