// itch.io cards: what each game's itch.io page says about itself, saved in the
// repo so the site never asks itch.io at view time. itch.io answers its widget
// pages uncached and limits each visitor's address after a handful of quick
// requests, so a live widget showed "429 Too Many Requests" to anyone who
// opened a few project pages; a saved card cannot.
//
// For every `{ kind: 'itch', id }` in src/content/projects.ts this reads
// https://itch.io/embed/<id> (the same page the widget shows) and writes:
//   src/content/itch.json   title, page, tagline, author, price, browser-playable
//   public/itch/<id>.png    the cover
//
// Run by hand after adding or changing a game (`npm run itch`, then commit), or
// let .github/workflows/itch-refresh.yml do it: weekly, and on its "Run
// workflow" button. A game that cannot be read keeps what was saved for it
// last time, and the script exits non-zero so the failure is seen.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DATA = join(ROOT, 'src', 'content', 'itch.json')
const COVERS = join(ROOT, 'public', 'itch')
const PROJECTS = join(ROOT, 'src', 'content', 'projects.ts')

const ids = [...readFileSync(PROJECTS, 'utf8').matchAll(/kind:\s*'itch',\s*id:\s*(\d+)/g)].map(
  (m) => Number(m[1]),
)
const saved = existsSync(DATA) ? JSON.parse(readFileSync(DATA, 'utf8')) : {}
mkdirSync(COVERS, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** A GET that waits out itch.io's rate limit instead of failing on it. */
async function get(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, {
      headers: { 'user-agent': 'damyanlhr.github.io itch card refresh' },
    })
    if (res.status !== 429 && res.status < 500) return res
    const wait = Number(res.headers.get('retry-after')) * 1000 || 5000 * 2 ** attempt
    console.log(`itch: ${res.status} for ${url}, retrying in ${Math.round(wait / 1000)}s`)
    await sleep(wait)
  }
  throw new Error(`gave up on ${url}`)
}

const decode = (s) =>
  s
    .replace(/&#0*39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()

/** Pulls the card out of an itch.io widget page. */
function parse(html, id) {
  const pick = (re, what) => {
    const m = html.match(re)
    if (!m) throw new Error(`no ${what} on the widget page for ${id}`)
    return decode(m[1])
  }
  const game = JSON.parse(pick(/data-game="([^"]+)"/, 'game data'))
  const title = pick(/class="game_title"><a[^>]*>([^<]+)</, 'title')
  const url = pick(/class="game_title"><a[^>]*href="([^"]+)"/, 'page')
  const author = pick(/class="author_row">[\s\S]*?<a[^>]*>([^<]+)</, 'author')
  // the tagline is optional on itch.io
  const tagline = decode(html.match(/class="game_summary">[\s\S]*?<h3[^>]*>([^<]*)</)?.[1] ?? '')
  // the larger of the two cover sizes, for sharp covers on dense screens
  const cover =
    html.match(/class="thumb_wrapper"><img[^>]*srcset="([^" ]+) 2x"/)?.[1] ??
    html.match(/class="thumb_wrapper"><img[^>]*src="([^"]+)"/)?.[1] ??
    null
  return {
    card: {
      title,
      url,
      tagline,
      author,
      price: Number(game.actual_price ?? 0),
      browser: game.type_name === 'html',
      cover: cover ? `/itch/${id}.png` : null,
    },
    coverUrl: cover,
  }
}

let failed = 0
const out = {}
for (const id of ids) {
  try {
    const res = await get(`https://itch.io/embed/${id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { card, coverUrl } = parse(await res.text(), id)
    if (coverUrl) {
      const img = await get(coverUrl)
      if (!img.ok) throw new Error(`cover HTTP ${img.status}`)
      writeFileSync(join(COVERS, `${id}.png`), Buffer.from(await img.arrayBuffer()))
    }
    out[id] = card
    console.log(`itch: ${id} ${card.title}`)
  } catch (e) {
    failed++
    console.error(`itch: ${id} failed (${e.message}); keeping what was saved`)
    if (saved[id]) out[id] = saved[id]
  }
  await sleep(1200)
}

const sorted = Object.fromEntries(
  Object.keys(out)
    .sort()
    .map((k) => [k, out[k]]),
)
writeFileSync(DATA, JSON.stringify(sorted, null, 2) + '\n')
if (failed) process.exit(1)
