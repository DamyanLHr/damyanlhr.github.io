// GitHub Pages serves files, not routes. Two things follow:
//
// 1. 404.html is a copy of index.html, so any unknown path still boots the app
//    (the SPA fallback).
// 2. Every page in public/og/meta.json gets its own dist/<path>/index.html, a
//    copy of index.html with that page's title, description and share image.
//    Link previews read these tags without running any script, and the page
//    loads directly instead of through the 404 fallback.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const SITE = 'https://damyanlhr.github.io'
const html = readFileSync('dist/index.html', 'utf8')
copyFileSync('dist/index.html', 'dist/404.html')
console.log('postbuild: dist/404.html written (SPA fallback)')

const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const metaFile = 'dist/og/meta.json'
if (existsSync(metaFile)) {
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'))
  for (const [path, m] of Object.entries(meta)) {
    const url = `${SITE}${path === '/' ? '/' : path}`
    const tags = [
      `<meta property="og:type" content="website" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:title" content="${escape(m.title)}" />`,
      `<meta property="og:description" content="${escape(m.description)}" />`,
      `<meta property="og:image" content="${SITE}${m.image}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
    ].join('\n    ')
    const page = html
      .replace(/<title>[^<]*<\/title>/, `<title>${escape(m.title)}</title>`)
      .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escape(m.description)}$2`)
      .replace('</head>', `    ${tags}\n  </head>`)
    const file = path === '/' ? 'dist/index.html' : join('dist', path, 'index.html')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, page)
  }
  console.log(`postbuild: share tags for ${Object.keys(meta).length} pages`)

  // the same list of pages, for search engines
  const urls = Object.keys(meta)
    .map((path) => `  <url><loc>${SITE}${path}</loc></url>`)
    .join('\n')
  writeFileSync(
    'dist/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  )
  console.log('postbuild: dist/sitemap.xml written')
}
