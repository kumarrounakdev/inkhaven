// Headless smoke test for <Preloader/> using jsdom + a Vite IIFE build of the
// real component source. Verifies: mounts, percent text updates, exits,
// body overflow restored, no throw. Not part of the app's build; a dev aid.
//   Run: node scripts/smoke-preloader.mjs
import { build } from 'vite'
import { JSDOM } from 'jsdom'

const dom = new JSDOM(
  '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
  { url: 'http://localhost:4173/', pretendToBeVisual: true },
)
const { window } = dom

const setGlobal = (name, value) => {
  try {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  } catch {
    /* Node built-ins that are getter-only (e.g. navigator) stay as-is */
  }
}

setGlobal('window', window)
setGlobal('document', window.document)
setGlobal('navigator', window.navigator)
setGlobal('MutationObserver', window.MutationObserver)
setGlobal('getComputedStyle', (el) => window.getComputedStyle(el))
setGlobal('requestAnimationFrame', (cb) => window.requestAnimationFrame(cb))
setGlobal('cancelAnimationFrame', (id) => window.cancelAnimationFrame(id))
const matchMediaStub = (q) => ({
  matches: false,
  media: q,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  onchange: null,
  dispatchEvent() {
    return true
  },
})
// gsap core calls window.matchMedia at import time; jsdom lacks it.
window.matchMedia = matchMediaStub
setGlobal('matchMedia', matchMediaStub)

// Simulate the target being already fully cached/loaded (fast path).
Object.defineProperty(window.document, 'readyState', { value: 'complete', configurable: true })
Object.defineProperty(window.document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } })

const out = await build({
  logLevel: 'silent',
  configFile: false,
  root: process.cwd(),
  build: {
    outDir: 'node_modules/.smoke',
    emptyOutDir: true,
    lib: { entry: 'scripts/preloader-smoke-entry.jsx', formats: ['iife'], name: 'Smoke', fileName: 'smoke' },
    minify: false,
    sourcemap: false,
  },
})

const code = out[0].output[0].code
const errors = []
const uncaught = (e) => errors.push(String(e && e.message ? e.message : e))
process.on('uncaughtException', uncaught)
process.on('unhandledRejection', uncaught)
window.addEventListener('error', (e) => errors.push(String(e && e.message)))

try {
  ;(0, eval)(code)
} catch (e) {
  errors.push('eval/render threw: ' + e.message)
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// t=50ms — overlay should be mounted and visible
await wait(120)
const mountedAtStart = dom.window.document.querySelector('.preloader') !== null
const pct = dom.window.document.querySelector('.preloader__pct')

// fast path (readyState complete): minShow 1.2s + finalize + hold + curtain ≈ 2.4s total
const probe = []
for (const t of [400, 1200, 1800, 3000]) {
  await wait(t - (probe.length ? probe[probe.length - 1].t : 0))
  const el = dom.window.document.querySelector('.preloader')
  probe.push({
    t,
    mounted: el !== null,
    pct: dom.window.document.querySelector('.preloader__pct')?.textContent?.trim() ?? null,
    opacity: el ? window.getComputedStyle(el).opacity : null,
  })
}

await wait(2000)
const goneAtEnd = dom.window.document.querySelector('.preloader') === null
const overflow = dom.window.document.body.style.overflow

console.log(probe.map((p) => `t=${p.t} mounted=${p.mounted} pct=${p.pct} opacity=${p.opacity}`).join('\n'))

console.log('overlay mounted ............', mountedAtStart ? 'OK' : 'FAIL (not found at t=120ms)')
console.log('percent element present ....', pct ? 'OK' : 'FAIL')
console.log('overlay unmounted after exit', goneAtEnd ? 'OK' : 'FAIL (still in DOM at t=3s)')
console.log('body overflow restored .....', overflow === '' || overflow === 'visible' ? `OK ("${overflow}")` : `FAIL ("${overflow}")`)
console.log('console/global errors .......', errors.length === 0 ? 'none' : errors.join(' | '))

dom.window.close()
const fsOk = errors.length === 0 && mountedAtStart && goneAtEnd
process.exit(fsOk ? 0 : 1)