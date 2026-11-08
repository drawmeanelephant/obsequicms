import { describe, expect, it } from 'vitest';
import { realpathSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runBoris } from '../../src/boris/run.js';

const STUB = join(
  fileURLToPath(new URL('.', import.meta.url)),
  'stubs',
  'scripted-stub.mjs',
);

async function writeScript(behaviors: unknown[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'boris-stub-'));
  const path = join(dir, 'script.json');
  await writeFile(path, JSON.stringify(behaviors), 'utf8');
  return path;
}

describe('bounded process runner (executable stub)', () => {
  it('maps exit codes to outcomes per the CLI contract', async () => {
    const cases: Array<[number, string]> = [
      [0, 'success'],
      [1, 'content'],
      [2, 'usage'],
      [3, 'io'],
    ];
    for (const [code, expected] of cases) {
      const script = await writeScript([{ exit: code }]);
      const result = await runBoris(STUB, [script], { cwd: tmpdir() });
      expect(result.outcome).toBe(expected);
      expect(result.exitCode).toBe(code);
      await rm(join(script, '..'), { recursive: true, force: true });
    }
  });

  it('maps an unexpected exit code to terminated, never to success', async () => {
    const script = await writeScript([{ exit: 7 }]);
    const result = await runBoris(STUB, [script], { cwd: tmpdir() });
    expect(result.outcome).toBe('terminated');
    expect(result.exitCode).toBe(7);
    await rm(join(script, '..'), { recursive: true, force: true });
  });

  it('terminates a process that exceeds its deadline', async () => {
    const script = await writeScript([
      { sleepMs: 10_000 },
      { exit: 0 },
    ]);
    const started = Date.now();
    const result = await runBoris(STUB, [script], {
      cwd: tmpdir(),
      limits: { deadlineMs: 300, killGraceMs: 200 },
    });
    expect(result.outcome).toBe('terminated');
    expect(result.timedOut).toBe(true);
    expect(Date.now() - started).toBeLessThan(5_000);
    await rm(join(script, '..'), { recursive: true, force: true });
  });

  it('terminates a process whose stdout overruns its cap and keeps the collected prefix', async () => {
    const script = await writeScript([
      { printBytes: 256 * 1024, stream: 'stdout' },
      { exit: 0 },
    ]);
    const cap = 64 * 1024;
    const result = await runBoris(STUB, [script], {
      cwd: tmpdir(),
      limits: { stdoutLimitBytes: cap, deadlineMs: 10_000, killGraceMs: 200 },
    });
    expect(result.outcome).toBe('terminated');
    expect(result.overranOutput).toBe(true);
    expect(result.truncatedStdout).toBe(true);
    expect(result.stdoutBytes).toBe(cap);
    await rm(join(script, '..'), { recursive: true, force: true });
  });

  it('escalates to SIGKILL when a terminated process ignores SIGTERM', async () => {
    const script = await writeScript([
      { ignoreSigterm: true },
      { sleepMs: 10_000 },
      { exit: 0 },
    ]);
    const result = await runBoris(STUB, [script], {
      cwd: tmpdir(),
      limits: { deadlineMs: 300, killGraceMs: 250 },
    });
    expect(result.outcome).toBe('terminated');
    expect(result.timedOut).toBe(true);
    expect(result.signal).toBe('SIGKILL');
    await rm(join(script, '..'), { recursive: true, force: true });
  });

  it('passes the argv array through verbatim with no shell interpretation', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'boris-stub-'));
    const argvFile = join(dir, 'argv.json');
    const script = join(dir, 'script.json');
    await writeFile(
      script,
      JSON.stringify([{ writeArgv: argvFile }]),
      'utf8',
    );
    const trickyArg = 'value with spaces; rm -rf / | $HOME';
    await runBoris(STUB, [script, '--flag', trickyArg], { cwd: dir });
    const recorded = JSON.parse(await readFile(argvFile, 'utf8'));
    expect(recorded.argv).toEqual([script, '--flag', trickyArg]);
    expect(recorded.cwd).toBe(realpathSync(dir));
    await rm(dir, { recursive: true, force: true });
  });

  it('reports a spawn failure as an io outcome naming the cause', async () => {
    const result = await runBoris(
      join(tmpdir(), 'no-such-executable-xyz'),
      ['--version'],
      { cwd: tmpdir() },
    );
    expect(result.outcome).toBe('io');
    expect(result.stderr).toMatch(/spawn failed/);
  });

  it('carries a fixed allowlisted argv verbatim into the process', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'boris-stub-'));
    const argvFile = join(dir, 'argv.json');
    const script = join(dir, 'script.json');
    await writeFile(script, JSON.stringify([{ writeArgv: argvFile }]), 'utf8');
    const result = await runBoris(
      STUB,
      [
        script,
        'build',
        '--input',
        'content',
        '--out',
        '.obsequious/ir',
      ],
      { cwd: dir },
    );
    expect(result.outcome).toBe('success');
    const recorded = JSON.parse(await readFile(argvFile, 'utf8'));
    expect(recorded.argv).toEqual([
      script,
      'build',
      '--input',
      'content',
      '--out',
      '.obsequious/ir',
    ]);
    expect(recorded.cwd).toBe(realpathSync(dir));
    await rm(dir, { recursive: true, force: true });
  });
});
