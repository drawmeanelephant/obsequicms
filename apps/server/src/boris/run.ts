import { spawn } from 'node:child_process';

/**
 * Bounded process execution for the Boris adapter
 * (docs/boris-integration.md#fixed-process-operations).
 *
 * Every invocation runs a fixed argv array — never a shell string — inside a
 * server-owned workspace, with a process deadline and separate stdout/stderr
 * caps. Exit outcomes follow the upstream CLI contract: success for 0,
 * content for 1, usage for 2, I/O for 3, and terminated for a signal,
 * timeout, output overrun, or unexpected exit code.
 */

export type RunLimits = {
  /** Wall-clock deadline for the whole process. */
  deadlineMs: number;
  /** Maximum collected stdout bytes; exceeding it terminates the process. */
  stdoutLimitBytes: number;
  /** Maximum collected stderr bytes; exceeding it terminates the process. */
  stderrLimitBytes: number;
  /** Grace period between SIGTERM and SIGKILL. */
  killGraceMs: number;
};

/** Application defaults to test, not performance claims. */
export const DEFAULT_RUN_LIMITS: RunLimits = {
  deadlineMs: 120_000,
  stdoutLimitBytes: 16 * 1024 * 1024,
  stderrLimitBytes: 16 * 1024 * 1024,
  killGraceMs: 5_000,
};

export type ProcessOutcome =
  | 'success'
  | 'content'
  | 'usage'
  | 'io'
  | 'terminated';

export type RunResult = {
  outcome: ProcessOutcome;
  /** null when the process died by signal or was killed by the runner. */
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  stdoutBytes: number;
  stderrBytes: number;
  truncatedStdout: boolean;
  truncatedStderr: boolean;
  timedOut: boolean;
  overranOutput: boolean;
};

type Collector = {
  chunks: Buffer[];
  bytes: number;
  truncated: boolean;
  limit: number;
};

function createCollector(limit: number): Collector {
  return { chunks: [], bytes: 0, truncated: false, limit };
}

/**
 * Collects up to `limit` bytes; returns false when the cap is crossed, which
 * is the caller's signal to terminate the process.
 */
function collect(
  collector: Collector,
  chunk: Buffer,
): boolean {
  if (collector.truncated) {
    return false;
  }
  if (collector.bytes + chunk.length > collector.limit) {
    const remaining = collector.limit - collector.bytes;
    if (remaining > 0) {
      collector.chunks.push(chunk.subarray(0, remaining));
      collector.bytes = collector.limit;
    }
    collector.truncated = true;
    return false;
  }
  collector.chunks.push(chunk);
  collector.bytes += chunk.length;
  return true;
}

function drain(collector: Collector): string {
  return Buffer.concat(collector.chunks).toString('utf8');
}

/**
 * Runs `executable` with the fixed `argv` array inside `cwd`. No shell is
 * involved; the executable path and argv are server-owned. Exceeding the
 * deadline or either output cap terminates the process (SIGTERM, then
 * SIGKILL after the grace period) and reports a terminated outcome.
 */
export function runBoris(
  executable: string,
  argv: readonly string[],
  options: { cwd: string; limits?: Partial<RunLimits> },
): Promise<RunResult> {
  const limits = { ...DEFAULT_RUN_LIMITS, ...options.limits };
  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    let overranOutput = false;
    let sigtermPending = false;

    const stdoutCollector = createCollector(limits.stdoutLimitBytes);
    const stderrCollector = createCollector(limits.stderrLimitBytes);

    const child = spawn(executable, [...argv], {
      cwd: options.cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const finish = (result: Omit<RunResult, 'stdout' | 'stderr' | 'stdoutBytes' | 'stderrBytes'>) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(deadline);
      resolve({
        ...result,
        stdout: drain(stdoutCollector),
        stderr: drain(stderrCollector),
        stdoutBytes: stdoutCollector.bytes,
        stderrBytes: stderrCollector.bytes,
        truncatedStdout: stdoutCollector.truncated,
        truncatedStderr: stderrCollector.truncated,
        timedOut,
        overranOutput,
      });
    };

    const deadline = setTimeout(() => {
      timedOut = true;
      terminate();
    }, limits.deadlineMs);

    const terminate = () => {
      if (sigtermPending) {
        return;
      }
      sigtermPending = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!settled) {
          child.kill('SIGKILL');
        }
      }, limits.killGraceMs);
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      const ok = collect(stdoutCollector, chunk);
      if (!ok && !overranOutput) {
        overranOutput = true;
        terminate();
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const ok = collect(stderrCollector, chunk);
      if (!ok && !overranOutput) {
        overranOutput = true;
        terminate();
      }
    });

    child.on('error', (error) => {
      clearTimeout(deadline);
      // Spawn failures (ENOENT, permissions) are adapter-usage problems:
      // report them as an I/O outcome with the error on stderr so callers
      // see the cause instead of a fabricated compiler diagnostic.
      stderrCollector.chunks.push(
        Buffer.from(`process spawn failed: ${error.message}\n`, 'utf8'),
      );
      stderrCollector.bytes = stderrCollector.chunks.reduce(
        (total, chunk) => total + chunk.length,
        0,
      );
      finish({
        outcome: 'io',
        exitCode: null,
        signal: null,
        truncatedStdout: false,
        truncatedStderr: false,
        timedOut: false,
        overranOutput: false,
      });
    });

    child.on('close', (code, signal) => {
      if (timedOut || overranOutput || signal !== null) {
        finish({
          outcome: 'terminated',
          exitCode: code,
          signal,
          truncatedStdout: stdoutCollector.truncated,
          truncatedStderr: stderrCollector.truncated,
          timedOut,
          overranOutput,
        });
        return;
      }
      const outcome: ProcessOutcome =
        code === 0
          ? 'success'
          : code === 1
            ? 'content'
            : code === 2
              ? 'usage'
              : code === 3
                ? 'io'
                : // An unexpected exit code is not a known content/usage/io
                  // result: it is terminated, never a success.
                'terminated';
      finish({
        outcome,
        exitCode: code,
        signal: null,
        truncatedStdout: stdoutCollector.truncated,
        truncatedStderr: stderrCollector.truncated,
        timedOut,
        overranOutput,
      });
    });
  });
}

/**
 * Whether the process ended by timeout, overrun, signal, or an unexpected
 * exit code. A terminated outcome never carries trustworthy artifacts.
 */
export function isTerminated(result: RunResult): boolean {
  return result.outcome === 'terminated';
}
