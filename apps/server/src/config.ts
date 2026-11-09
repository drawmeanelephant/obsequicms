import { isAbsolute } from 'node:path';

export function projectConfig(env: NodeJS.ProcessEnv = process.env) {
  const projectRoot = env.OBSEQUIOUS_PROJECT_ROOT;
  if (!projectRoot) return null;
  const executable = env.BORIS_BIN;
  if (!isAbsolute(projectRoot) || !executable || !isAbsolute(executable)) {
    throw new Error('Connected mode requires absolute OBSEQUIOUS_PROJECT_ROOT and BORIS_BIN values.');
  }
  return { projectRoot, executable };
}
