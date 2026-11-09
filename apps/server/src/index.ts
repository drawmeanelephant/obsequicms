import { buildApp } from './app.js';
import { projectConfig } from './config.js';
import { ProjectReader } from './project/reader.js';

// Development listeners are loopback-only (AGENTS.md). The host is not
// configurable through the environment in the prototype.
const host = '127.0.0.1';
const port = Number(process.env.PORT ?? 8787);

const config = projectConfig();
const app = buildApp({ project: config ? new ProjectReader(config) : undefined });

async function shutdown() {
  await app.close();
}
process.once('SIGTERM', () => { void shutdown(); });
process.once('SIGINT', () => { void shutdown(); });

app
  .listen({ host, port })
  .then((address) => {
    process.stdout.write(`Obsequious server listening on ${address}\n`);
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `Obsequious server failed to start: ${String(error)}\n`,
    );
    process.exit(1);
  });
