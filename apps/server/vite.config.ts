import { defineConfig } from 'vite';

// Bundle the existing workspace's TypeScript contracts rather than changing
// its schemas or requiring Node to load its extensionless source imports.
export default defineConfig({
  ssr: { noExternal: ['@obsequious/contracts'] },
  build: {
    ssr: 'src/index.ts',
    outDir: 'dist',
    rollupOptions: { output: { entryFileNames: 'index.js' } },
  },
});
