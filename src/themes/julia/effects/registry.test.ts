import { describe, expect, it } from 'vitest'
import { projects } from '../../../content/projects'
import { EFFECTS } from '../fractal'
import { GALLERY_SLUG } from '../gallery-slug'
import { branchPoints, quinticRoot } from './layers/braid'
import { MAX_SPEED, MIN_SPEED, flockStep, type Flock } from './layers/murmuration'
import { durandKerner } from './layers/roots'
import { RowRing } from './layers/terrain'
import { EFFECT_INFO, GALLERY } from './registry'

describe('effect registry', () => {
  it('describes every effect a project can name', () => {
    for (const id of EFFECTS) {
      const e = EFFECT_INFO[id]
      expect(e, id).toBeDefined()
      expect(e.id).toBe(id)
      expect(e.name.length).toBeGreaterThan(2)
      expect(e.pointer.length).toBeGreaterThan(5)
      expect(e.touch.length).toBeGreaterThan(5)
      expect(e.blurb.length).toBeGreaterThan(20)
      if (e.kind === 'mode') expect(e.mode).toBeDefined()
      else expect(e.layer).toBeDefined()
    }
    expect([...GALLERY].sort()).toEqual([...EFFECTS].sort())
  })

  it('keeps copy free of em dashes', () => {
    for (const e of Object.values(EFFECT_INFO))
      for (const text of [e.name, e.blurb, e.pointer, e.touch]) expect(text).not.toContain('—')
  })

  it('leaves the gallery address to the gallery', () => {
    expect(projects.map((p) => p.slug)).not.toContain(GALLERY_SLUG)
  })
})

describe('the maths behind the new effects', () => {
  it('finds the roots of a known polynomial (z² − 1)', () => {
    // coefficients low to high: -1, 0, 1
    const coef = new Float64Array([-1, 0, 0, 0, 1, 0])
    const roots = new Float64Array([0.4, 0.9, -0.7, -0.2])
    for (let i = 0; i < 60; i++) durandKerner(coef, 2, roots)
    const found = [roots[0], roots[2]].sort((a, b) => a - b)
    expect(found[0]).toBeCloseTo(-1, 6)
    expect(found[1]).toBeCloseTo(1, 6)
    expect(Math.abs(roots[1]) + Math.abs(roots[3])).toBeLessThan(1e-6)
  })

  it('places the quintic branch points where two roots meet', () => {
    for (const c of branchPoints()) {
      expect(Math.hypot(c[0], c[1])).toBeCloseTo(0.8 * Math.pow(0.2, 0.25), 9)
    }
    // a root found by Newton really is one
    const c: [number, number] = [0.3, 0.1]
    const [zr, zi] = quinticRoot(c, [1, 0], 30)
    let pr = zr
    let pi = zi
    for (let j = 0; j < 4; j++) {
      const n = pr * zr - pi * zi
      pi = pr * zi + pi * zr
      pr = n
    }
    expect(Math.hypot(pr - zr - c[0], pi - zi - c[1])).toBeLessThan(1e-9)
  })

  it('keeps every bird of the flock between its speed limits', () => {
    const n = 200
    const f: Flock = {
      x: new Float32Array(n).map(() => Math.random()),
      y: new Float32Array(n).map(() => Math.random()),
      vx: new Float32Array(n).map(() => (Math.random() - 0.5) * 0.02),
      vy: new Float32Array(n).map(() => (Math.random() - 0.5) * 0.02),
    }
    for (let k = 0; k < 50; k++)
      flockStep(f, (u, v) => Math.min(1, Math.hypot(u - 0.5, v - 0.5)), [0.5, 0.5])
    for (let i = 0; i < n; i++) {
      const sp = Math.hypot(f.vx[i], f.vy[i])
      expect(sp).toBeLessThanOrEqual(MAX_SPEED * 1.0001)
      expect(sp).toBeGreaterThanOrEqual(MIN_SPEED * 0.9999)
    }
  })

  it('streams terrain without growing', () => {
    let made = 0
    const ring = new RowRing(12, (i) => {
      made++
      return new Float32Array([i])
    })
    for (let k = 0; k < 40; k++) ring.advance(13 + k)
    expect(ring.rows).toHaveLength(12)
    expect(ring.rows[0][0]).toBe(52)
    expect(made).toBe(52)
  })
})
