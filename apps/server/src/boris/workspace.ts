import { lstat, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';

/**
 * Server-owned job workspaces (docs/boris-integration.md). Every compiler
 * operation runs inside its own unique temporary workspace; the server
 * creates `.obsequious/` for fresh reports before invocation, and a stale
 * report or artifact file at an operation's output path is removed first so
 * an old file can never be mistaken for a new run's evidence.
 *
 * Containment is a filesystem property, not a string property. Besides the
 * lexical workspace check, every component below the workspace root —
 * including the final one — must be a real directory entry and never a
 * symlink before a destructive operation runs or a workspace-owned path is
 * resolved for reading. A symlinked component would make the path name
 * objects outside the workspace (an external cleanup target or artifact)
 * even though the resolved string stays inside it. Refusals leave the
 * symlink, its target, and everything else untouched.
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
      await assertRealDirectory(root, 'workspace cleanup refused');
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
 * clean output path. The path must stay inside the workspace on the
 * filesystem, not only lexically.
 */
export async function prepareFreshOutputPath(
  workspaceRoot: string,
  relativePath: string,
): Promise<string> {
  const target = await resolveContainedPath(workspaceRoot, relativePath);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  return target;
}

/** Removes one file at `relativePath` inside the workspace if present. */
export async function prepareFreshReportFile(
  workspaceRoot: string,
  relativePath: string,
): Promise<void> {
  const target = await resolveContainedPath(workspaceRoot, relativePath);
  await rm(target, { recursive: true, force: true });
  await mkdir(dirname(target), { recursive: true });
}

/**
 * Whether a file exists at `relativePath` inside the workspace. The path is
 * resolved with the same filesystem containment rule as the destructive
 * helpers, so existence is never observed through a symlinked component.
 */
export async function hasFile(
  workspaceRoot: string,
  relativePath: string,
): Promise<boolean> {
  const target = await resolveContainedPath(workspaceRoot, relativePath);
  return existsSync(target);
}

/**
 * Resolves `relativePath` against the workspace root and returns the
 * absolute path when the workspace root and every path component below it
 * are real filesystem objects inside the workspace. The workspace root must
 * be a real directory (never a symlink — resolve it first if callers hold a
 * link), each existing component below it must be a real directory entry,
 * and no component — including the final one — may be a symlink. Components
 * that do not exist yet are allowed so first-run output paths work; the
 * destructive helpers create them afterwards.
 */
export async function resolveContainedPath(
  workspaceRoot: string,
  relativePath: string,
): Promise<string> {
  const root = resolve(workspaceRoot);
  const target = resolve(root, relativePath);
  assertInsideWorkspace(root, target);
  await assertRealDirectory(root, 'workspace path refused');
  const belowRoot = relative(root, target);
  let current = root;
  for (const part of belowRoot.split(sep)) {
    current = join(current, part);
    let info;
    try {
      info = await lstat(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Nothing below this component exists yet, so nothing further can
        // be a symlink; the caller creates the remaining path itself.
        return target;
      }
      throw error;
    }
    if (info.isSymbolicLink()) {
      throw new Error(
        `workspace path refused: ${current} is a symlink, not a contained workspace path`,
      );
    }
  }
  return target;
}

/**
 * The root itself must be a real directory. Ancestors of the root (for
 * example the OS temp directory) may legitimately be symlinks; they are not
 * part of the workspace the server created.
 */
async function assertRealDirectory(path: string, context: string): Promise<void> {
  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`${context}: ${path} does not exist`);
    }
    throw error;
  }
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new Error(
      `${context}: ${path} is not a real directory (observed ${info.isSymbolicLink() ? 'a symlink' : 'a non-directory'})`,
    );
  }
}

function assertInsideWorkspace(workspaceRoot: string, path: string): void {
  const root = resolve(workspaceRoot);
  if (path !== root && !path.startsWith(root + sep)) {
    throw new Error(
      `output path escapes the job workspace: ${path} is not inside ${root}`,
    );
  }
}
