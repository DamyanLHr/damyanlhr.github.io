import { describe, expect, it } from 'vitest'
import { content } from '../src/content'
import meta from '../public/og/meta.json'

// scripts/og.mjs writes one share entry per page. A project added without
// running it would be shared with the home page's picture and words.
describe('share images', () => {
  it('has a share entry for every project', () => {
    const pages = meta as Record<string, unknown>
    for (const p of content.projects) expect(pages[`/projects/${p.slug}`], p.slug).toBeDefined()
  })
})
