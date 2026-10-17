// Theme menu previews: one screenshot of each theme's landing page, shrunk to a
// small webp in src/shared/previews/. Run by hand after a theme's look changes:
//
//   npm run build && npm run previews
//
// It serves dist/ itself, so nothing else needs to be running. GPU themes are
// rendered through SwiftShader, which is slow but faithful; julia is captured
// on its CPU path because the GL path is what headless renders worst. Look at
// every file before committing: a white or empty capture is a failed capture.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { preview } from 'vite'
import { chromium } from 'playwright'
import sharp from 'sharp'

const OUT = join(process.cwd(), 'src', 'shared', 'previews')
const THEMES = [
  { id: 'julia', query: '&cpufractal', settle: 2500 },
  { id: 'landfall', query: '', settle: 8000 },
  { id: 'atlas', query: '', settle: 3000 },
  { id: 'singularity', query: '', settle: 8000 },
  { id: 'debug', query: '', settle: 1000 },
]
const only = process.argv.slice(2)

mkdirSync(OUT, { recursive: true })
const server = await preview({ preview: { port: 4179, strictPort: true } })
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
try {
  for (const t of THEMES.filter((t) => only.length === 0 || only.includes(t.id))) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`http://localhost:4179/?theme=${t.id}${t.query}`)
    await page.waitForTimeout(t.settle)
    const png = await page.screenshot()
    await sharp(png)
      .resize(720)
      .webp({ quality: 76 })
      .toFile(join(OUT, `${t.id}.webp`))
    console.log(`previews: ${t.id}.webp`)
    await page.close()
  }
} finally {
  await browser.close()
  server.httpServer.close()
}
