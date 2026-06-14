import { defineConfig } from 'vite';

// GitHub Pages serves from /<repo>/ ; use a relative base so build works there and locally.
export default defineConfig({
  base: './',
  server: { host: true, port: 5180, open: false },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
});
