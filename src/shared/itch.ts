import type { ItchCard, LinkRef, Project } from '../content/types'

// A project's itch.io card takes the place of its plain itch.io button: the
// card says everything the button did, with the cover and tagline besides.

/** Matches an itch.io page however its address is written. */
const same = (a: string, b: string) => a.replace(/\/+$/, '') === b.replace(/\/+$/, '')

/**
 * The project's itch.io card, if it has one, and the links that are left once
 * the card has taken the itch.io one. `label` is that link's own wording, so
 * the card's call to action says what the button said.
 */
export function splitLinks(
  project: Pick<Project, 'links' | 'embeds'>,
  cards: Record<string, ItchCard>,
): { card: { data: ItchCard; label: string } | null; rest: LinkRef[] } {
  const ref = project.embeds?.find((e) => e.kind === 'itch')
  const data = ref?.kind === 'itch' ? cards[String(ref.id)] : undefined
  if (!data) return { card: null, rest: project.links }
  const link = project.links.find((l) => same(l.url, data.url))
  return {
    card: { data, label: link?.label ?? 'Play on itch.io' },
    rest: project.links.filter((l) => l !== link),
  }
}

/** The small print under the tagline: what it costs, and whether it plays in the browser. */
export function itchMeta(card: ItchCard): string {
  const price = card.price > 0 ? `$${card.price.toFixed(2)}` : 'Free'
  // only what itch.io says for sure: a game that is not in the browser may be
  // a download, or not out yet
  return card.browser ? `${price} · Plays in the browser` : price
}
