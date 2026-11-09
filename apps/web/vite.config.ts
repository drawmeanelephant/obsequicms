import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const apiPort = Number(process.env.OBSEQUIOUS_API_PORT ?? 8787);
if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
  throw new Error('OBSEQUIOUS_API_PORT must be a valid local TCP port.');
}
const proxy = {
  '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  // Development listeners are loopback-only (AGENTS.md).
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    proxy,
  },
  build: {
    rollupOptions: {
      input: {
        demo: fileURLToPath(new URL('./index.html', import.meta.url)),
        connected: fileURLToPath(new URL('./connected.html', import.meta.url)),
      },
    },
  },
});
