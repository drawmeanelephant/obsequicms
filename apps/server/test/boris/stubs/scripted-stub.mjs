#!/usr/bin/env node
/**
 * Controlled executable stub for bounded-process tests. The real compiler
 * gate never uses this file; it exists so timeout, output overrun,
 * termination, argv-passthrough, and cleanup behaviors can be exercised
 * deterministically without a Boris binary.
 *
 * Usage: scripted-stub.mjs <script.json>
 * The script is a JSON array of behaviors run in order:
 *   {"writeArgv": "path"}            record the received argv as JSON
 *   {"writeFile": {"path","content"}} write a file (cleanup tests)
 *   {"printBytes": N, "stream": S}   print N bytes to stdout or stderr
 *   {"sleepMs": N}                   block the process for N ms
 *   {"ignoreSigterm": true}          swallow the next SIGTERM (SIGKILL test)
 *   {"exit": N}                      exit with code N
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error('usage: scripted-stub.mjs <script.json>');
  process.exit(2);
}

let behaviors;
try {
  behaviors = JSON.parse(readFileSync(scriptPath, 'utf8'));
} catch (error) {
  console.error(`stub script unreadable: ${error.message}`);
  process.exit(2);
}

let sigtermSwallowed = false;
process.on('SIGTERM', () => {
  if (sigtermSwallowed) {
    process.exit(143);
  }
  sigtermSwallowed = true;
});

function behave(behavior) {
  if (behavior.writeArgv !== undefined) {
    mkdirSync(dirname(behavior.writeArgv), { recursive: true });
    writeFileSync(
      behavior.writeArgv,
      JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }),
      'utf8',
    );
    return;
  }
  if (behavior.writeFile !== undefined) {
    mkdirSync(dirname(behavior.writeFile.path), { recursive: true });
    writeFileSync(behavior.writeFile.path, behavior.writeFile.content, 'utf8');
    return;
  }
  if (behavior.printBytes !== undefined) {
    const stream =
      behavior.stream === 'stderr' ? process.stderr : process.stdout;
    const chunk = Buffer.alloc(4096, 0x78); // 'x'
    let remaining = behavior.printBytes;
    while (remaining > 0) {
      const size = Math.min(remaining, chunk.length);
      stream.write(chunk.subarray(0, size));
      remaining -= size;
    }
    return;
  }
  if (behavior.ignoreSigterm === true) {
    sigtermSwallowed = false;
    return;
  }
  if (behavior.sleepMs !== undefined) {
    const until = Date.now() + behavior.sleepMs;
    while (Date.now() < until) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
    return;
  }
  if (behavior.exit !== undefined) {
    process.exit(behavior.exit);
  }
  console.error(`unknown behavior: ${JSON.stringify(behavior)}`);
  process.exit(2);
}

for (const behavior of behaviors) {
  behave(behavior);
}
process.exit(0);
