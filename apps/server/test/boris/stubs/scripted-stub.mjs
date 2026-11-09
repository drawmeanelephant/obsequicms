#!/usr/bin/env node
/**
 * Controlled executable stub for bounded-process tests. The real compiler
 * gate never uses this file; it exists so timeout, output overrun,
 * termination, argv-passthrough, and cleanup behaviors can be exercised
 * deterministically without a Boris binary.
 *
 * Usage: scripted-stub.mjs <script.json>
 * Or, for callers whose argv is fixed by the adapter under test (the script
 * path cannot ride argv): OBSEQUIOUS_STUB_SCRIPT=<script.json> scripted-stub.mjs <any argv...>
 * The script is a JSON array of behaviors run in order:
 *   {"writeArgv": "path"}            record the received argv as JSON
 *   {"writeFile": {"path","content"}} write a file (cleanup tests)
 *   {"symlink": {"target","path"}}    create a symlink (containment tests)
 *   {"printBytes": N, "stream": S}   print N bytes to stdout or stderr,
 *                                    completing every write before returning
 *   {"sleepMs": N}                   block the process for N ms
 *   {"ignoreSigterm": true}          swallow the next SIGTERM (SIGKILL test)
 *   {"exit": N}                      stop with exit code N, flushing first
 *
 * The process exits only after its queued stream writes complete: the
 * `exit` behavior sets the exit code and stops the script instead of
 * calling process.exit(), whose immediate termination would drop output
 * that is still queued (the exact defect this stub once had).
 */

import { readFileSync, symlinkSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const scriptPath = process.env.OBSEQUIOUS_STUB_SCRIPT ?? process.argv[2];
if (!scriptPath) {
  console.error('usage: scripted-stub.mjs <script.json>');
  process.exitCode = 2;
} else {
  let behaviors;
  try {
    behaviors = JSON.parse(readFileSync(scriptPath, 'utf8'));
  } catch (error) {
    console.error(`stub script unreadable: ${error.message}`);
    process.exitCode = 2;
  }

  if (behaviors) {
    await runBehaviors(behaviors);
  }
}

/**
 * Writes every byte to the stream and returns only when the kernel has
 * accepted all of them: each write is awaited through its completion
 * callback, which resolves after the stream has drained and handed the
 * chunk to the operating system. Queuing without backpressure and exiting
 * immediately would silently drop whatever the pipe had not accepted.
 */
function writeFully(stream, total) {
  const chunk = Buffer.alloc(4096, 0x78); // 'x'
  return new Promise((resolve, reject) => {
    let remaining = total;
    const writeNext = () => {
      if (remaining === 0) {
        resolve();
        return;
      }
      const size = Math.min(remaining, chunk.length);
      const view = chunk.subarray(0, size);
      remaining -= size;
      stream.write(view, (error) => {
        if (error) {
          reject(error);
          return;
        }
        writeNext();
      });
    };
    writeNext();
  });
}

async function runBehaviors(behaviors) {
  let sigtermSwallowed = false;
  process.on('SIGTERM', () => {
    if (sigtermSwallowed) {
      process.exit(143);
    }
    sigtermSwallowed = true;
  });

  for (const behavior of behaviors) {
    if (behavior.writeArgv !== undefined) {
      mkdirSync(dirname(behavior.writeArgv), { recursive: true });
      writeFileSync(
        behavior.writeArgv,
        JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }),
        'utf8',
      );
      continue;
    }
    if (behavior.writeFile !== undefined) {
      mkdirSync(dirname(behavior.writeFile.path), { recursive: true });
      writeFileSync(behavior.writeFile.path, behavior.writeFile.content, 'utf8');
      continue;
    }
    if (behavior.symlink !== undefined) {
      mkdirSync(dirname(behavior.symlink.path), { recursive: true });
      symlinkSync(behavior.symlink.target, behavior.symlink.path);
      continue;
    }
    if (behavior.printBytes !== undefined) {
      const stream =
        behavior.stream === 'stderr' ? process.stderr : process.stdout;
      await writeFully(stream, behavior.printBytes);
      continue;
    }
    if (behavior.ignoreSigterm === true) {
      sigtermSwallowed = false;
      continue;
    }
    if (behavior.sleepMs !== undefined) {
      const until = Date.now() + behavior.sleepMs;
      while (Date.now() < until) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
      }
      continue;
    }
    if (behavior.exit !== undefined) {
      // Stop here and let the process exit naturally with this code once
      // the stream writes have drained — never process.exit(), which would
      // truncate output queued ahead of it.
      process.exitCode = behavior.exit;
      return;
    }
    console.error(`unknown behavior: ${JSON.stringify(behavior)}`);
    process.exitCode = 2;
    return;
  }
}
