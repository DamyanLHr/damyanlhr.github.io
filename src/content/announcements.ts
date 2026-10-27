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
    id: 'barca-doro',
    title: "Barca D'Oro",
    body: 'The Game Design 1 project at TU/e, now on itch.io and still in production.',
  },
]
