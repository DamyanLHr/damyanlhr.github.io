import { describe, expect, it } from 'vitest'
import { projects } from '../../content/projects'
import { projectC, ROUTE_C } from './fractal'
import { fitToBox, measureSet, type Box } from './fit'
import type { Complex } from './travel'

// Damyan's rule for the bands: the whole set, glow included, is always inside
// its band, and it is always big. These check both against the lit points of
// each set as the band would draw them.

const canvas = { width: 1440, height: 900 }
const band: Box = { left: 0, top: 64, width: 1440, height: 360 }
const card: Box = { left: 0, top: 0, width: 420, height: 160 }

const constants: [string, Complex][] = [
  ['projects', ROUTE_C.projects],
  ...projects.map((p) => [p.slug, projectC(p)] as [string, Complex]),
]

/** The lit points of a set, in canvas pixels, as `fitToBox` would place them. */
function placed(c: Complex, box: Box) {
  const f = fitToBox(c, box, canvas)
  const pxPerUnit = Math.min(canvas.width, canvas.height) / f.span
  const ca = Math.cos(f.angle)
  const sa = Math.sin(f.angle)
  const pts: [number, number][] = []
  for (let gy = 0; gy < 160; gy++) {
    for (let gx = 0; gx < 160; gx++) {
      const x0 = ((gx + 0.5) / 160 - 0.5) * 4
      const y0 = ((gy + 0.5) / 160 - 0.5) * 4
      let x = x0
      let y = y0
      let k = 0
      for (; k < 120 && x * x + y * y < 16; k++) {
        const t = x * x - y * y + c.re
        y = 2 * x * y + c.im
        x = t
      }
      if (k < 10) continue
      // plane to screen is the inverse turn
      const dx = x0 * ca + y0 * sa
      const dy = -x0 * sa + y0 * ca
      pts.push([f.x * canvas.width + dx * pxPerUnit, f.y * canvas.height + dy * pxPerUnit])
    }
  }
  return pts
}

describe('fitting a set to its band', () => {
  it('measures a set as symmetric extents along its axis', () => {
    const s = measureSet(ROUTE_C.home)
    expect(s.along).toBeGreaterThanOrEqual(s.across)
    expect(s.along).toBeLessThan(2.1)
  })

  for (const [name, c] of constants) {
    it(`keeps all of ${name} inside a band, and big`, () => {
      for (const box of [band, card]) {
        const pts = placed(c, box)
        const inside = pts.filter(
          ([x, y]) =>
            x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height,
        )
        expect(inside.length / pts.length).toBeGreaterThan(0.97)
        const xs = pts.map((p) => p[0]).sort((a, b) => a - b)
        const ys = pts.map((p) => p[1]).sort((a, b) => a - b)
        const at = (a: number[], q: number) => a[Math.floor((a.length - 1) * q)]
        const w = at(xs, 0.99) - at(xs, 0.01)
        const h = at(ys, 0.99) - at(ys, 0.01)
        // big: it reaches most of the way across whichever side binds
        expect(Math.max(w / box.width, h / box.height)).toBeGreaterThan(0.7)
        // and it lies along the band, not across it
        expect(w).toBeGreaterThanOrEqual(h * 0.9)
      }
    })
  }
})
