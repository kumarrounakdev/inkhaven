import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Warning printed once the dev server starts: dev is NOT the Lighthouse target.
const devAuditWarning = {
  name: 'dev-audit-warning',
  configureServer(server) {
    server.httpServer?.once('listening', () => {
      console.log('\n===========================================================')
      console.log('  THIS IS THE DEV SERVER — OPTIMIZED FOR EDITING, NOT PERF.')
      console.log('  Unminified modules; Lighthouse scores on dev are meaningless.')
      console.log('  To audit production:  npm run audit  →  http://localhost:4173')
      console.log('===========================================================\n')
    })
  },
}

// Vite cannot send a CSP honorably in dev but `vite preview` serves real builds;
// the full CSP lives in scripts/serve.mjs and vite preview's headers here.
const CspHeader =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devAuditWarning],
  server: {
    allowedHosts: true,
  },
  preview: {
    headers: {
      'Content-Security-Policy': CspHeader,
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
          if (id.includes('gsap') || id.includes('lenis')) return 'vendor-anim'
          return undefined
        },
      },
    },
  },
})