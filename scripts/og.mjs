// Share images: what a link to each page shows when it is posted somewhere.
// Each page is rendered in julia at 1200×630 (the size the share cards use),
// with its effect developed and its title in view, and saved as a JPEG in
// public/og/. Their titles and descriptions are read off the rendered page
// into public/og/meta.json, which scripts/postbuild.mjs turns into per-page
// HTML with the right tags. Run by hand after a project is added or changed:
//
//   npm run build && npm run og
//
// Look at every image before committing. The content tests fail if a project
// has no entry in meta.json.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { preview } from 'vite'
import { chromium } from 'playwright'
import sharp from 'sharp'

const OUT = join(process.cwd(), 'public', 'og')
const BASE = 'http://localhost:4181'
mkdirSync(OUT, { recursive: true })

const server = await preview({ preview: { port: 4181, strictPort: true } })
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const meta = {}

// Pages without a lead paragraph get a line of their own. Long leads are cut
// at the last whole sentence that fits, never mid-word.
const FIXED = {
  '/cv': 'Education, experience and the languages Damyan Hristov builds games and graphics in.',
  '/projects':
    'Games, engines and graphics projects by Damyan Hristov, each with its own live fractal.',
}
function describe(path, lead) {
  if (FIXED[path]) return FIXED[path]
  const text = lead.replace(/\s+/g, ' ').trim()
  if (text.length <= 200) return text
  const cut = text.slice(0, 200)
  const end = cut.lastIndexOf('. ')
  return end > 80 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…'
}
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${BASE}/projects?theme=julia`)
  await page.waitForTimeout(1500)
  const slugs = await page.$$eval('a.j-card[data-slug]', (els) => els.map((e) => e.dataset.slug))
  const routes = [
    { path: '/', file: 'home' },
    { path: '/cv', file: 'cv' },
    { path: '/projects', file: 'projects' },
    { path: '/projects/gallery', file: 'gallery' },
    ...slugs.map((s) => ({ path: `/projects/${s}`, file: s })),
  ]
  for (const r of routes) {
    await page.goto(`${BASE}${r.path}?theme=julia`)
    await page.waitForTimeout(3200)
    const info = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent?.trim() ?? ''
      const lead =
        document.querySelector('.j-lead, .j-sub, .j-gallery-lede')?.textContent?.trim() ?? ''
      return { h1, lead }
    })
    const png = await page.screenshot()
    await sharp(png)
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(join(OUT, `${r.file}.jpg`))
    meta[r.path] = {
      title:
        r.path === '/'
          ? 'Damyan Hristov · Portfolio Blog'
          : `${info.h1.replace(/\s+/g, ' ')} · Damyan Hristov`,
      description: describe(r.path, info.lead),
      image: `/og/${r.file}.jpg`,
    }
    console.log(`og: ${r.file}.jpg`)
  }
  writeFileSync(join(OUT, 'meta.json'), JSON.stringify(meta, null, 2) + '\n')
} finally {
  await browser.close()
  server.httpServer.close()
}
