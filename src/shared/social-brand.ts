import type { LinkRef } from '../content/types'

export type Brand = 'github' | 'itch' | 'steam' | 'spotify' | 'linkedin'

/** Which mark a link gets, from its label or its address. */
export function brandOf(link: LinkRef): Brand | null {
  const s = `${link.label} ${link.url}`.toLowerCase()
  if (s.includes('github')) return 'github'
  if (s.includes('itch')) return 'itch'
  if (s.includes('steam')) return 'steam'
  if (s.includes('spotify')) return 'spotify'
  if (s.includes('linkedin')) return 'linkedin'
  return null
}
