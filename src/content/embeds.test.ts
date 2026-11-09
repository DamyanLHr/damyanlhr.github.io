import { describe, expect, it } from 'vitest'
import { content } from './index'

// Embeds go straight into iframes, so a typo is a broken box on a project page.

describe('project embeds', () => {
  const all = content.projects.flatMap((p) => (p.embeds ?? []).map((e) => ({ p, e })))

  it('names each itch.io widget by its number', () => {
    for (const { p, e } of all)
      if (e.kind === 'itch-widget') expect(Number.isInteger(e.id) && e.id > 0, p.slug).toBe(true)
  })

  it('takes playable games from itch.io’s embed page, with their size', () => {
    for (const { p, e } of all) {
      if (e.kind !== 'itch-game') continue
      expect(e.url, p.slug).toMatch(/^https:\/\/itch\.io\/embed-upload\/\d+/)
      expect(e.width, p.slug).toBeGreaterThan(0)
      expect(e.height, p.slug).toBeGreaterThan(0)
    }
  })

  it('loads any other embed over https, named and shaped', () => {
    for (const { p, e } of all) {
      if (e.kind !== 'iframe') continue
      expect(e.url, p.slug).toMatch(/^https:\/\//)
      expect(e.title.length, p.slug).toBeGreaterThan(0)
      expect(e.aspect, p.slug).toBeGreaterThan(0)
    }
  })

  it('gives every game on itch.io its widget', () => {
    for (const p of content.projects) {
      const onItch = p.links.some((l) => /^https:\/\/[^/]+\.itch\.io\//.test(l.url))
      const widget = p.embeds?.some((e) => e.kind === 'itch-widget')
      expect(!onItch || widget, p.slug).toBe(true)
    }
  })
})
