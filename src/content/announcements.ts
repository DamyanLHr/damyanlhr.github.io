import type { Announcement } from './types'

// "Up next" — the blog pulse. Newest first. Every theme surfaces these on the
// landing and projects pages (see docs/ADDING-CONTENT.md).
export const announcements: Announcement[] = [
  {
    id: 'extensible-terrain-generation',
    title: 'Extensible Terrain Generation',
    body: 'A C++ and Vulkan terrain pipeline designed to take new generators without being rebuilt around each one. First personal graphics project on the road to Delft.',
  },
  {
    id: 'davincis-black-market-bird-dealer',
    title: "Davinci's Black Market Bird Dealer",
    body: 'The next university project, in production now for Game Design 1 at TU/e.',
  },
]
