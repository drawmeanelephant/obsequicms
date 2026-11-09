import { constants } from 'node:fs';
import { lstat, mkdir, open, readdir, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { isAbsolute, join } from 'node:path';
import {
  ApiError,
  SOURCE_BYTE_LIMIT,
  SourceBufferSchema,
  SourcePathSchema,
  SourceRevisionSchema,
  type SourceBuffer,
  type SourcePath,
  type SourceRevision,
} from '@obsequious/contracts';
import {
  createJobWorkspace,
  resolveContainedPath,
  type JobWorkspace,
} from '../boris/workspace.js';

const GENERATED_ROOTS = new Set([
  '.git', '.obsequious', '.boris', '.cache', '.zig-cache',
  '.tooling', 'dist', 'node_modules', 'zig-out', 'rag', 'source-rag',
]);
const SNAPSHOT_BYTE_LIMIT = 64 * 1024 * 1024;
const SNAPSHOT_FILE_LIMIT = 4096;

export type ProjectSnapshot = {
  workspace: JobWorkspace;
  sourceRevision: SourceRevision;
  sources: Set<SourcePath>;
  hasProfile: boolean;
};

/** Read bounded regular files without following a final or parent symlink. */
export async function readContainedFile(root: string, path: string): Promise<Buffer> {
  const absolute = await resolveContainedPath(root, path);
  const entry = await lstat(absolute);
  if (!entry.isFile() || entry.size > SOURCE_BYTE_LIMIT) {
    throw new ApiError('unsupported', 'Project inputs must be regular files of at most 8 MiB.');
  }
  const file = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await file.stat();
    if (!before.isFile() || before.size > SOURCE_BYTE_LIMIT) {
      throw new ApiError('unsupported', 'Project inputs must be regular files of at most 8 MiB.');
    }
    const buffer = Buffer.alloc(Math.min(before.size + 1, SOURCE_BYTE_LIMIT + 1));
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    await resolveContainedPath(root, path);
    const current = await lstat(absolute);
    const after = await file.stat();
    if (
      !current.isFile() || current.ino !== before.ino || current.dev !== before.dev ||
      before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
      length !== before.size
    ) {
      throw new ApiError('conflict', 'A project input changed while being read. Retry the request.');
    }
    return buffer.subarray(0, length);
  } finally {
    await file.close();
  }
}

/**
 * Copy operator-selected inputs before any compiler process starts. Generated
 * roots are not inputs; no mutation ever targets the selected project.
 */
export async function createProjectSnapshot(projectRoot: string): Promise<ProjectSnapshot> {
  if (!isAbsolute(projectRoot)) {
    throw new ApiError('invalid_request', 'The configured project root must be absolute.');
  }
  const contentRoot = await resolveContainedPath(projectRoot, 'content');
  if (!(await lstat(contentRoot)).isDirectory()) {
    throw new ApiError('unsupported', 'The selected project needs a regular content directory.');
  }
  const workspace = await createJobWorkspace();
  const sources = new Set<SourcePath>();
  let bytes = 0;
  let files = 0;
  let hasProfile = false;
  try {
    const copyDirectory = async (relative: string, depth: number): Promise<void> => {
      if (depth > 64) throw new ApiError('unsupported', 'The project input tree is too deep.');
      const directory = relative
        ? await resolveContainedPath(projectRoot, relative)
        : projectRoot;
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (!relative && (
          GENERATED_ROOTS.has(entry.name) || entry.name === '.env' || entry.name.startsWith('.env.')
        )) continue;
        const path = relative ? `${relative}/${entry.name}` : entry.name;
        const source = await resolveContainedPath(projectRoot, path);
        const info = await lstat(source);
        if (info.isDirectory()) {
          await mkdir(join(workspace.root, path));
          await copyDirectory(path, depth + 1);
        } else if (info.isFile()) {
          const data = await readContainedFile(projectRoot, path);
          bytes += data.length;
          files += 1;
          if (bytes > SNAPSHOT_BYTE_LIMIT || files > SNAPSHOT_FILE_LIMIT) {
            throw new ApiError('unsupported', 'The project exceeds the 64 MiB / 4096-file snapshot limit.');
          }
          await writeFile(join(workspace.root, path), data, { flag: 'wx' });
          if (path === 'boris.json') hasProfile = true;
          const parsed = SourcePathSchema.safeParse(path);
          if (parsed.success) sources.add(parsed.data);
        } else {
          throw new ApiError('unsupported', 'Symlinks and special files are not project inputs.');
        }
      }
    };
    await copyDirectory('', 0);
    return {
      workspace,
      sourceRevision: SourceRevisionSchema.parse(randomUUID()),
      sources,
      hasProfile,
    };
  } catch (error) {
    await workspace.cleanup();
    throw error;
  }
}

export async function readSnapshotSource(
  snapshot: ProjectSnapshot,
  path: SourcePath,
): Promise<SourceBuffer> {
  if (!snapshot.sources.has(path)) {
    throw new ApiError('not_found', 'That source file is not part of this snapshot.');
  }
  const bytes = await readContainedFile(snapshot.workspace.root, path);
  let content: string;
  try {
    content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new ApiError('unsupported', 'The source file is not valid UTF-8.');
  }
  return SourceBufferSchema.parse({
    path,
    sourceRevision: snapshot.sourceRevision,
    fileHash: createHash('sha256').update(bytes).digest('hex'),
    content,
  });
}
