import { describe, expect, it } from 'vitest'
import { projects } from '../../content/projects'
import { interests } from '../../content/interests'
import { C_POOL, EFFECTS, effectFor, paramsFor } from './fractal'

// Every project's fractal is its identity on this theme: it is the card art in
// the mosaic and the hero on its own page. Two projects resolving to the same
// picture is a visible bug, and that is exactly what shipped: three slugs hashed
// to one pool entry and two more to another, so six of eight projects were two
// pictures sitting next to each other in the same grid.
//
// These call `paramsFor` the way the views do (see views.tsx): projects by slug,
// interests by id with an index seed.

/** Below this, two sets are the same picture to anyone looking at the page. */
const MIN_SEPARATION = 0.02

const projectParams = projects.map((p) => [p.slug, paramsFor(p.slug)] as const)
const interestParams = interests.map((s, i) => [s.id, paramsFor(s.id, i * 3 + 1)] as const)

/**
 * Only compared within a group, on purpose. Project cards share one mosaic and
 * have to be told apart at a glance; interest washes sit on a different page at
 * 16% opacity behind text. A project and an interest landing near each other is
 * not something anyone can see.
 */
function clashesWithin(group: readonly (readonly [string, { re: number; im: number }])[]) {
  const out: string[] = []
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const [an, a] = group[i]
      const [bn, b] = group[j]
      const d = Math.hypot(a.re - b.re, a.im - b.im)
      if (d < MIN_SEPARATION) out.push(`${an} and ${bn} are ${d.toFixed(4)} apart`)
    }
  }
  return out
}

describe('paramsFor', () => {
  it('is deterministic', () => {
    for (const p of projects) expect(paramsFor(p.slug)).toEqual(paramsFor(p.slug))
  })

  it('gives every project a visually distinct constant', () => {
    expect(clashesWithin(projectParams)).toEqual([])
  })

  it('gives every interest a visually distinct wash', () => {
    expect(clashesWithin(interestParams)).toEqual([])
  })

  it('stays in the neighbourhood of a curated constant', () => {
    // The pool entries are curated to render well. Wandering too far off one is
    // how a card ends up an empty field or a solid blob.
    for (const [name, p] of [...projectParams, ...interestParams]) {
      const nearest = Math.min(...C_POOL.map((c) => Math.hypot(p.re - c.re, p.im - c.im)))
      expect(nearest, `${name} drifted off the pool`).toBeLessThan(0.08)
    }
  })

  it('spreads the projects across the pool rather than piling onto one entry', () => {
    const used = new Map<number, number>()
    for (const [, p] of projectParams) {
      let best = 0
      let bestD = Infinity
      C_POOL.forEach((c, i) => {
        const d = Math.hypot(p.re - c.re, p.im - c.im)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      used.set(best, (used.get(best) ?? 0) + 1)
    }
    // No single curated constant may carry more than a third of the roster.
    expect(Math.max(...used.values())).toBeLessThanOrEqual(Math.ceil(projects.length / 3))
  })
})

describe('plate effects', () => {
  // A plate effect is part of a project's identity the same way its constant
  // is. Two released projects sharing one while another sits unused is a
  // roster that could have told them apart and didn't.
  it('gives every released project its own effect while any are left', () => {
    const released = projects.filter((p) => p.status === 'released')
    const used = released.map(effectFor)
    const unused = EFFECTS.filter((e) => !used.includes(e))
    const shared = used.filter((e, i) => used.indexOf(e) !== i)
    if (unused.length > 0) expect(shared).toEqual([])
  })

  it('derives one for a project that does not pin it', () => {
    const fx = effectFor({ ...projects[0], slug: 'a-new-project', art: undefined })
    expect(EFFECTS).toContain(fx)
    expect(effectFor({ ...projects[0], slug: 'a-new-project', art: undefined })).toBe(fx)
  })
})
