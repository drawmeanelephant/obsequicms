import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

/**
 * Server-owned job workspaces (docs/boris-integration.md). Every compiler
 * operation runs inside its own unique temporary workspace; the server
 * creates `.obsequious/` for fresh reports before invocation, and a stale
 * report or artifact file at an operation's output path is removed first so
 * an old file can never be mistaken for a new run's evidence.
 */

const WORKSPACE_PREFIX = 'obsequious-job-';

export type JobWorkspace = {
  /** Absolute path of the unique workspace root. */
  root: string;
  /** Removes the whole workspace tree. Safe to call more than once. */
  cleanup: () => Promise<void>;
};

/**
 * Creates a unique temporary workspace. The cleanup removes exactly this
 * directory and refuses anything outside the OS temp root, so a miscomputed
 * path can never widen the removal.
 */
export async function createJobWorkspace(): Promise<JobWorkspace> {
  const root = await mkdtemp(join(tmpdir(), WORKSPACE_PREFIX));
  let removed = false;
  return {
    root,
    cleanup: async () => {
      if (removed) {
        return;
      }
      removed = true;
      assertInsideTempRoot(root);
      await rm(root, { recursive: true, force: true });
    },
  };
}

function assertInsideTempRoot(path: string): void {
  const resolved = resolve(path);
  const tempRoot = resolve(tmpdir());
  if (resolved !== tempRoot && !resolved.startsWith(tempRoot + sep)) {
    throw new Error(
      `workspace cleanup refused: ${resolved} is outside the temp root`,
    );
  }
}

/**
 * Removes a file (or directory tree) at `relativePath` inside the workspace
 * and recreates its parent directories, so the operation starts from a
 * clean output path. The path must stay inside the workspace.
 */
export async function prepareFreshOutputPath(
  workspaceRoot: string,
  relativePath: string,
): Promise<string> {
  const target = resolve(workspaceRoot, relativePath);
  assertInsideWorkspace(workspaceRoot, target);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  return target;
}

/** Removes one file at `relativePath` inside the workspace if present. */
export async function prepareFreshReportFile(
  workspaceRoot: string,
  relativePath: string,
): Promise<void> {
  const target = resolve(workspaceRoot, relativePath);
  assertInsideWorkspace(workspaceRoot, target);
  await rm(target, { recursive: true, force: true });
  await mkdir(target.substring(0, target.lastIndexOf(sep)), {
    recursive: true,
  });
}

function assertInsideWorkspace(workspaceRoot: string, path: string): void {
  const root = resolve(workspaceRoot);
  if (path !== root && !path.startsWith(root + sep)) {
    throw new Error(
      `output path escapes the job workspace: ${path} is not inside ${root}`,
    );
  }
}

/** Whether a file exists at `relativePath` inside the workspace. */
export function hasFile(workspaceRoot: string, relativePath: string): boolean {
  return existsSync(resolve(workspaceRoot, relativePath));
}
