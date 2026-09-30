import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'

const ROOT = join(process.cwd(), 'dist')
const PORT = Number(process.env.PORT || 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
}

// Binary formats ship as-is (already compressed); compress only text-ish types.
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.svg', '.json', '.ico', '.txt'])

// Hashed build assets + fonts never change across visits -> cache hard.
const IMMUTABLE = /^\/(?:assets|fonts)\//

// Frames this site never is meant to appear in; honor restrict-origin-when-cross-origin.
const referrerPolicy = 'strict-origin-when-cross-origin'

// Delivered as real HTTP response headers (a <meta> CSP would ignore frame-ancestors).
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': referrerPolicy,
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

function cacheHeader(pathname) {
  return IMMUTABLE.test(pathname) ? 'public, max-age=31536000, immutable' : 'no-cache'
}

const server = createServer(async (req, res) => {
  try {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value)
    const url = new URL(req.url, `http://${req.headers.host}`)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/') pathname = '/index.html'

    const filePath = join(ROOT, pathname)
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    const body = await readFile(filePath)
    const type = MIME[extname(filePath)] || 'application/octet-stream'
    res.setHeader('Content-Type', type)
    res.setHeader('Cache-Control', cacheHeader(pathname))

    const accept = req.headers['accept-encoding'] || ''
    let out = body
    if (COMPRESSIBLE.has(extname(filePath))) {
      if (accept.includes('br')) {
        out = brotliCompressSync(body)
        res.setHeader('Content-Encoding', 'br')
      } else if (accept.includes('gzip')) {
        out = gzipSync(body)
        res.setHeader('Content-Encoding', 'gzip')
      }
    }
    if (out !== body) res.setHeader('Vary', 'Accept-Encoding')
    res.setHeader('Content-Length', out.length)
    res.writeHead(200)
    res.end(out)
  } catch (err) {
    res.writeHead(err.code === 'ENOENT' ? 404 : 500)
    res.end(err.code === 'ENOENT' ? 'Not Found' : 'Error')
  }
})

server.listen(PORT, () => {
  console.log('\n=========================================================')
  console.log(`  LIGHTHOUSE AUDIT TARGET  →  http://localhost:${PORT}`)
  console.log('=========================================================')
  console.log(`Serving     →  ${ROOT}`)
  console.log('Compression →  brotli / gzip on-the-fly')
  console.log('Caching     →  /assets & /fonts immutable, HTML no-cache')
})