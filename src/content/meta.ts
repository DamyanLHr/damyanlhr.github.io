// Theme-agnostic site identity. First inhabitant of the content layer (PLAN Phase 1
// brings the full SiteContent model; CONTENT.md is the source of truth).
export const SITE = {
  name: 'Damyan Hristov',
  tagline: 'Portfolio Blog',
  url: 'https://damianlhr.github.io/',
  github: 'https://github.com/DamianLHr',
  itch: 'https://damyanhr.itch.io/',
} as const

/**
 * Site-wide switches for whole sections. A disabled section is gone everywhere at
 * once: its route 404s, it leaves every nav, and themes see no content for it.
 */
export const FEATURES = {
  // Hidden 2026-10-14 until the favourites are filled in (CONTENT.md TODO).
  interests: false,
} as const
