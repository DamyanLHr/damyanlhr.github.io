import { describe, expect, it } from 'vitest'
import type { ItchCard } from '../content/types'
import { itchMeta, splitLinks } from './itch'

const card: ItchCard = {
  title: 'Kill Bunny',
  url: 'https://damyanhr.itch.io/kill-bunny',
  tagline: 'Isometric hack-n-slash with RAGE elements.',
  author: 'damyanhr',
  price: 0,
  browser: true,
  cover: '/itch/1.png',
}

describe('splitLinks', () => {
  const links = [
    { label: 'Play in browser on itch.io', url: 'https://damyanhr.itch.io/kill-bunny/' },
    { label: 'Repository', url: 'https://github.com/x/y' },
  ]

  it("gives the itch.io link's place, and its wording, to the card", () => {
    const { card: c, rest } = splitLinks(
      { links, embeds: [{ kind: 'itch', id: 1 }] },
      { '1': card },
    )
    expect(c?.label).toBe('Play in browser on itch.io')
    expect(rest.map((l) => l.label)).toEqual(['Repository'])
  })

  it('leaves the links alone without a card', () => {
    expect(splitLinks({ links }, { '1': card })).toEqual({ card: null, rest: links })
  })
})

describe('itchMeta', () => {
  it('says what it costs, and whether it plays in the browser', () => {
    expect(itchMeta(card)).toBe('Free · Plays in the browser')
    expect(itchMeta({ ...card, price: 4.99, browser: false })).toBe('$4.99')
  })
})
