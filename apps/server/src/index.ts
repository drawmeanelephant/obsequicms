import { buildApp } from './app.js';

// Development listeners are loopback-only (AGENTS.md). The host is not
// configurable through the environment in the prototype.
const host = '127.0.0.1';
const port = Number(process.env.PORT ?? 8787);

const app = buildApp();

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
