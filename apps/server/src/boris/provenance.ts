import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isAbsolute } from 'node:path';
import approved from './approved-builds.json' with { type: 'json' };
import { parseBuildInfo, type BorisBuildInfo } from './identity.js';
import { readIdentity } from './operations.js';

type RecordedBuild = {
  format: string;
  schema_version: number;
  compilerId: string;
  sourceRevision: string;
  binary: { sha256: string; platform: string; buildInfo: unknown };
};

export function approvedCompilerBuild(platform = process.platform, arch = process.arch) {
  const builds: Record<string, RecordedBuild> = approved.builds;
  const build = builds[`${platform}-${arch}`];
  if (!build) throw new Error('No approved Boris compiler kit exists for this platform.');
  if (build.format !== 'obsequious-boris-provenance' || build.schema_version !== 1) {
    throw new Error('The approved compiler provenance format is invalid.');
  }
  return {
    ...build,
    binary: { ...build.binary, buildInfo: parseBuildInfo(JSON.stringify(build.binary.buildInfo)) },
  };
}

/** No environment-provided digest, arbitrary executable, or version-only bypass. */
export async function verifyApprovedCompiler(executable: string): Promise<{
  sourceRevision: string;
  binary: { sha256: string; platform: string; buildInfo: BorisBuildInfo };
}> {
  if (!isAbsolute(executable)) throw new Error('BORIS_BIN must be an absolute path.');
  const provenance = approvedCompilerBuild();
  const file = await open(executable, constants.O_RDONLY | constants.O_NOFOLLOW);
  let digest: string;
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 256 * 1024 * 1024) {
      throw new Error('The configured compiler must be a bounded regular executable.');
    }
    digest = createHash('sha256').update(await file.readFile()).digest('hex');
  } finally {
    await file.close();
  }
  if (digest !== provenance.binary.sha256) {
    throw new Error('The compiler binary does not match the approved platform digest.');
  }
  const identity = await readIdentity(executable);
  if (
    identity.version !== provenance.compilerId ||
    identity.buildInfo.vcsRevision !== provenance.binary.buildInfo.vcsRevision
  ) {
    throw new Error('The compiler identity does not match its approved source build.');
  }
  return provenance;
}
