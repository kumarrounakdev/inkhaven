import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone admin app — run it independently: npm install && npm run dev
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    // allow the sandbox preview proxy host (dev only — irrelevant for builds)
    allowedHosts: ['.e2b.app'],
  },
  build: {
    target: 'es2019',
    sourcemap: false,
  },
});
