import { describe, expect, it } from 'vitest'
import { ROUTE_C } from './fractal'
import {
  cardioidEdge,
  cPath,
  DIRECT,
  nearestEdgeTheta,
  poseFor,
  travelPose,
  type Complex,
} from './travel'

const dist = (a: Complex, b: Complex) => Math.hypot(a.re - b.re, a.im - b.im)

/** Distance from c to the cardioid edge, by dense sampling. */
function offEdge(c: Complex) {
  let best = Infinity
  for (let i = 0; i < 4000; i++)
    best = Math.min(best, dist(c, cardioidEdge((i / 4000) * 2 * Math.PI)))
  return best
}

const far = [ROUTE_C.home, ROUTE_C.interests] as const

describe('cardioid road', () => {
  it('finds the edge point nearest a constant', () => {
    const th = 1.1
    expect(nearestEdgeTheta(cardioidEdge(th))).toBeCloseTo(th, 2)
  })

  it('starts and ends exactly on the two pages', () => {
    const [a, b] = far
    expect(cPath(a, b, 0)).toEqual({ re: a.re, im: a.im })
    expect(cPath(a, b, 1)).toEqual({ re: b.re, im: b.im })
  })

  it('runs along the edge for the middle of a long trip', () => {
    const [a, b] = far
    expect(dist(a, b)).toBeGreaterThan(DIRECT)
    for (let k = 0.2; k <= 0.8; k += 0.05) expect(offEdge(cPath(a, b, k))).toBeLessThan(0.002)
  })

  it('never jumps', () => {
    const [a, b] = far
    let prev = cPath(a, b, 0)
    for (let i = 1; i <= 500; i++) {
      const next = cPath(a, b, i / 500)
      expect(dist(prev, next)).toBeLessThan(0.02)
      prev = next
    }
  })

  it('goes straight between neighbours', () => {
    const a = ROUTE_C.home
    const b = { re: a.re + 0.03, im: a.im - 0.02 }
    const mid = cPath(a, b, 0.5)
    expect(mid.re).toBeCloseTo(a.re + 0.015, 9)
    expect(mid.im).toBeCloseTo(a.im - 0.01, 9)
  })

  it('moves placement with the constant', () => {
    const from = poseFor('home', ROUTE_C.home, false)
    const to = poseFor('cv', ROUTE_C.cv, false)
    const end = travelPose(from, to, 1)
    expect(travelPose(from, to, 0)).toEqual(from)
    for (const key of Object.keys(to) as (keyof typeof to)[])
      expect(end[key]).toBeCloseTo(to[key], 12)
    expect(travelPose(from, to, 0.5).dim).toBeCloseTo((from.dim + to.dim) / 2, 9)
  })
})
