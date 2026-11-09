import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import cards from '../src/content/itch.json'

// scripts/itch.mjs saves each itch.io card's cover beside its data; a card
// whose cover was not committed would show a broken image.
describe('itch.io cards', () => {
  it('has every cover it names', () => {
    for (const [id, card] of Object.entries(cards)) {
      if (!card.cover) continue
      expect(card.cover, id).toMatch(/^\/itch\/\d+\.png$/)
      expect(existsSync(join('public', card.cover)), card.cover).toBe(true)
    }
  })
})
