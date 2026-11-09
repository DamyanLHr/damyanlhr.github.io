// Theme-agnostic content model — the "data" side of the content ⇄ theme decoupling
// (TECHNOLOGY.md §3.1). Content files may import ONLY from src/content/.

/** The live effect on a project's plate in the julia theme. Other themes may read
 * it as a hint about the project's character, or ignore it. */
export type PlateEffect =
  | 'relief'
  | 'ripple'
  | 'cursor'
  | 'stardust'
  | 'field-lines'
  | 'orbit-traps'
  | 'ridgelines'
  | 'scroll-dive'
  | 'heartbeat'
  | 'root-bloom'
  | 'quintic-braid'
  | 'shape-shifter'
  | 'mandel-julia'
  | 'pendulum'
  | 'life'
  | 'ship-tricorn'
  | 'newton'
  | 'phoenix'
  | 'buddhabrot'
  | 'attractor'
  | 'coral'
  | 'murmuration'

/** Per-project / per-route visual identity ("art DNA"). Facets are an offer to
 * themes, never an obligation: a theme reads what it understands, ignores the rest. */
export interface ArtDNA {
  seed?: number
  palette?: string[]
  accent?: string
  fractal?: {
    type: 'mandelbulb' | 'mandelbox' | 'julia' | 'mandelbrot'
    params?: Record<string, number>
    /** 1:1 Mandelbulber parameter file in assets/fractals/ */
    fractFile?: string
  }
  /** Pinned so it never moves when the roster changes; unset derives one from the slug. */
  effect?: PlateEffect
}

export interface LinkRef {
  label: string
  url: string
}

export interface Profile {
  name: string
  tagline: string
  url: string
  pfpUrl: string
  socials: LinkRef[]
  /** shown as text with a copy button, never only as a mailto link */
  email?: string
  /** a print-ready PDF of the CV, served from public/ */
  cvPdf?: string
}

export interface EducationEntry {
  school: string
  program: string
  location: string
  start: string
  end: string
  details: string[]
}

export interface ExperienceEntry {
  company: string
  role: string
  start: string
  end: string
  teamSize?: number
  tools: string[]
  summary: string
  highlights: string[]
  links: LinkRef[]
}

export interface SpokenLanguage {
  language: string
  level: string
}

export interface ProgrammingProficiency {
  name: string
  evidence: string
  /** Slugs of projects that prove it — validated against the project roster. */
  projectSlugs: string[]
}

export interface Proficiencies {
  spoken: SpokenLanguage[]
  programming: ProgrammingProficiency[]
  expanding: ProgrammingProficiency[]
}

export interface CV {
  education: EducationEntry[]
  experience: ExperienceEntry[]
  plans: string
  proficiencies: Proficiencies
}

export type ProjectCategory = 'personal' | 'jam' | 'university'

export interface Project {
  slug: string
  title: string
  category: ProjectCategory
  status: 'released' | 'coming-soon'
  year?: number
  /** Jam or course the project belongs to. */
  event?: string
  duration?: string
  role?: string
  team?: { name?: string; size?: number; members?: string[] }
  tools: string[]
  summary: string
  /**
   * Set when the project was built with generative AI, which every theme has to
   * say on the card and on the page. Absent is not a claim either way: the
   * projects that were built without it say so in their own summary, the way
   * their itch.io pages do.
   */
  builtWithAI?: boolean
  /** Markdown body for the project subpage (rendered by each theme's own renderer). */
  body?: string
  links: LinkRef[]
  /**
   * Embedded on the project's own page, below its summary: the game itself,
   * itch.io's store widget, or anything else that comes as an iframe. See
   * docs/ADDING-CONTENT.md for where each one is copied from.
   */
  embeds?: Embed[]
  art?: ArtDNA
}

/**
 * Something a project page shows.
 *
 * - `itch`: the game's itch.io page, as a card in the project's links (it
 *   takes the place of the plain itch.io button), by the number in its
 *   `https://itch.io/embed/<id>` widget snippet. What the card says comes from
 *   src/content/itch.json, which `npm run itch` (and a weekly workflow) reads
 *   off itch.io, so the site never asks itch.io when someone visits.
 * - `itch-game`: the playable build, from the game's itch.io dashboard (Edit
 *   game, Distribute, Embed game): the snippet's `src` and its width and height.
 *   It loads only when the visitor presses play.
 * - `iframe`: any other embed (a trailer, a 3D viewer), with a title for
 *   screen readers and its width over height.
 */
export type Embed =
  | { kind: 'itch'; id: number }
  | { kind: 'itch-game'; url: string; width: number; height: number }
  | { kind: 'iframe'; url: string; title: string; aspect: number }

export interface InterestSection {
  id: string
  title: string
  body: string
  links: LinkRef[]
}

/** Route-level art facets: lets themes (e.g. singularity's bulb) re-color per page. */
export interface RouteArt {
  home?: ArtDNA
  cv?: ArtDNA
  projects?: ArtDNA
  interests?: ArtDNA
}

/** Blog-style announcement about what is coming next. Every theme must surface
 * these (at minimum on the landing and projects pages). */
export interface Announcement {
  id: string
  title: string
  body: string
  links?: LinkRef[]
}

export interface SiteContent {
  profile: Profile
  cv: CV
  projects: Project[]
  interests: InterestSection[]
  announcements: Announcement[]
  routeArt: RouteArt
  /** itch.io cards by game id (src/content/itch.json, written by `npm run itch`) */
  itch: Record<string, ItchCard>
}

/** What a game's itch.io page says about itself, saved by `npm run itch`. */
export interface ItchCard {
  title: string
  /** the game's itch.io page */
  url: string
  tagline: string
  author: string
  /** in dollars; 0 is free */
  price: number
  /** whether it plays in the browser on itch.io */
  browser: boolean
  /** the cover, served from public/itch/, or null when the game has none */
  cover: string | null
}
