// Optimize-image pipeline for Inkheaven.
// Generates responsive width variants (WebP, plus AVIF for anime pieces) from the
// master files in public/images, then prunes superseded/oversized masters.
// Storage budget: every work tile and the hero get width-capped files matching
// their real rendered footprint (see fetchPriority/sizes in the components).
//
// Run:  node scripts/optimize-images.mjs
import sharp from 'sharp'
import { readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'public', 'images')

const JOB = {
  'hero-section/hero-image.webp': [{ out: 'hero-image-480.webp', w: 480 }],
  'work-section/blackwork-full-sleeve.webp': [
    { out: 'blackwork-full-sleeve-400.webp', w: 400 },
    { out: 'blackwork-full-sleeve-800.webp', w: 800 },
  ],
  'work-section/fine-line-custom-piece.webp': [
    { out: 'fine-line-custom-piece-400.webp', w: 400 },
    { out: 'fine-line-custom-piece-800.webp', w: 800 },
  ],
  'work-section/realism-portrait.webp': [{ out: 'realism-portrait-400.webp', w: 400 }],
  'work-section/blackwork-back-piece.webp': [
    { out: 'blackwork-back-piece-400.webp', w: 400 },
    { out: 'blackwork-back-piece-800.webp', w: 800 },
  ],
  'work-section/realism-fine-art.webp': [
    { out: 'realism-fine-art-400.webp', w: 400 },
    { out: 'realism-fine-art-800.webp', w: 800 },
  ],
  'work-section/fine-line-minimal-piece.webp': [
    { out: 'fine-line-minimal-piece-800.webp', w: 800 },
    { out: 'fine-line-minimal-piece-1280.webp', w: 1280 },
  ],
  'work-section/anime-character.webp': [
    { out: 'anime-character-800.webp', w: 800 },
    { out: 'anime-character-1280.webp', w: 1280 },
    { out: 'anime-character-800.avif', w: 800 },
    { out: 'anime-character-1280.avif', w: 1280 },
  ],
  'work-section/anime-manga-panel.webp': [
    { out: 'anime-manga-panel-800.webp', w: 800 },
    { out: 'anime-manga-panel-1280.webp', w: 1280 },
    { out: 'anime-manga-panel-800.avif', w: 800 },
    { out: 'anime-manga-panel-1280.avif', w: 1280 },
  ],
}

// Masters that are fully superseded by their width-capped variants.
const PRUNE = [
  'work-section/blackwork-full-sleeve.webp',
  'work-section/fine-line-custom-piece.webp',
  'work-section/blackwork-back-piece.webp',
  'work-section/realism-fine-art.webp',
  'work-section/fine-line-minimal-piece.webp',
  'work-section/anime-character.webp',
  'work-section/anime-character.avif',
  'work-section/anime-manga-panel.webp',
  'work-section/anime-manga-panel.avif',
]

async function main() {
  let written = 0
  let killed = 0

  for (const [srcRel, variants] of Object.entries(JOB)) {
    const src = join(ROOT, srcRel)
    const subdir = srcRel.includes('/') ? srcRel.slice(0, srcRel.lastIndexOf('/')) : ''
    const meta = await sharp(src).metadata()
    for (const { out, w } of variants) {
      if (meta.width && w > meta.width) continue // never upscale
      const dest = subdir ? join(ROOT, subdir, out) : join(ROOT, out)
      const isAvif = out.endsWith('.avif')
      const pipeline =
        (isAvif ? sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).avif({ quality: 52 }) :
          sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }))
      await pipeline.toFile(dest)
      const kb = ((await stat(dest)).size / 1024).toFixed(1)
      console.log(`write  ${out.padEnd(42)} ${w}w  ${kb}KB`)
      written += 1
    }
  }

  for (const rel of PRUNE) {
    await unlink(join(ROOT, rel))
    console.log(`prune  ${rel}`)
    killed += 1
  }

  // Record what the UI expects so the component/data layer can be regenerated.
  await writeFile(
    join(process.cwd(), 'scripts', '.image-manifest.json'),
    JSON.stringify(
      Object.fromEntries(
        Object.entries(JOB).map(([src, v]) => [src, v.filter((x) => !x.out.endsWith('.avif')).map((x) => x.out)]),
      ),
      null,
      2,
    ),
  )

  console.log(`\nDone: ${written} variant(s) written, ${killed} master(s) pruned.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})