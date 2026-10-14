import { describe, expect, it } from 'vitest'
import { FEATURES } from '../content/meta'
import { parseRoute, routePath, TOP_LEVEL_ROUTES } from './routes'

describe('parseRoute', () => {
  it('parses top-level routes', () => {
    expect(parseRoute('/')).toEqual({ kind: 'home' })
    expect(parseRoute('/cv')).toEqual({ kind: 'cv' })
    expect(parseRoute('/projects')).toEqual({ kind: 'projects' })
  })

  it('serves /interests only while the section is enabled', () => {
    expect(parseRoute('/interests').kind).toBe(FEATURES.interests ? 'interests' : 'notFound')
    expect(TOP_LEVEL_ROUTES.some((r) => r.path === '/interests')).toBe(FEATURES.interests)
  })

  it('parses project slugs', () => {
    expect(parseRoute('/projects/kill-bunny')).toEqual({ kind: 'project', slug: 'kill-bunny' })
  })

  it('tolerates trailing slashes', () => {
    expect(parseRoute('/cv/')).toEqual({ kind: 'cv' })
    expect(parseRoute('/projects/kill-bunny/')).toEqual({ kind: 'project', slug: 'kill-bunny' })
  })

  it('falls through to notFound', () => {
    expect(parseRoute('/nope')).toEqual({ kind: 'notFound', path: '/nope' })
    expect(parseRoute('/projects/UPPER')).toEqual({ kind: 'notFound', path: '/projects/UPPER' })
  })
})

describe('routePath', () => {
  it('round-trips every parseable path', () => {
    for (const path of ['/', '/cv', '/projects', '/projects/kill-bunny', '/interests']) {
      // a disabled section's path still round-trips, as a notFound route
      expect(routePath(parseRoute(path))).toBe(path)
    }
  })

  it('covers all top-level routes', () => {
    for (const r of TOP_LEVEL_ROUTES) {
      expect(parseRoute(r.path).kind).not.toBe('notFound')
    }
  })
})
