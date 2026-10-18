import type { PlateEffect } from '../../../content/types'
import { cardioidEdge, nearestEdgeTheta, type Complex } from '../travel'

// The plane behind a plate, and the small pieces of maths more than one effect
// needs. Every julia drawing uses the same mapping (it matches fractal-gl.ts and
// renderJulia): a screen offset from the set's centre, scaled so `span` covers
// the shorter side, turned by `angle`, then shifted by `off`.

export interface PlaneView {
  re: number
  im: number
  span: number
  /** the set's centre in the canvas, 0..1 */
  cx: number
  cy: number
  angle: number
  /** a shift of the plane under the centre, for zooming toward a point */
  off: [number, number]
}

type Box = { left: number; top: number; width: number; height: number }

/** A point on screen (client px) to the complex plane under it. */
export function toPlane(x: number, y: number, box: Box, v: PlaneView): [number, number] {
  const s = v.span / Math.min(box.width, box.height)
  const dx = (x - box.left - v.cx * box.width) * s
  const dy = (y - box.top - v.cy * box.height) * s
  const ca = Math.cos(v.angle)
  const sa = Math.sin(v.angle)
  return [dx * ca - dy * sa + v.off[0], dx * sa + dy * ca + v.off[1]]
}

/** A point of the plane to canvas pixels, for a canvas of w by h. */
export function toScreen(
  z: [number, number],
  w: number,
  h: number,
  v: PlaneView,
): [number, number] {
  const s = Math.min(w, h) / v.span
  const zx = z[0] - v.off[0]
  const zy = z[1] - v.off[1]
  const ca = Math.cos(v.angle)
  const sa = Math.sin(v.angle)
  return [(zx * ca + zy * sa) * s + v.cx * w, (-zx * sa + zy * ca) * s + v.cy * h]
}

/** The orbit of z under z² + c, until it escapes or runs out of steps. */
export function orbit(
  z0: [number, number],
  re: number,
  im: number,
  steps = 80,
): [number, number][] {
  const out: [number, number][] = [z0]
  let [x, y] = z0
  for (let k = 0; k < steps; k++) {
    const t = x * x - y * y + re
    y = 2 * x * y + im
    x = t
    out.push([x, y])
    if (x * x + y * y > 16) break
  }
  return out
}

/**
 * The cycle every interior point is pulled toward, or null when c has none
 * we can see (it is outside the set, or the cycle is longer than 8).
 */
export function attractingCycle(re: number, im: number): [number, number][] | null {
  let x = 0
  let y = 0
  for (let k = 0; k < 4000; k++) {
    const t = x * x - y * y + re
    y = 2 * x * y + im
    x = t
    if (x * x + y * y > 16) return null
  }
  const cyc: [number, number][] = [[x, y]]
  for (let k = 0; k < 8; k++) {
    const t = x * x - y * y + re
    y = 2 * x * y + im
    x = t
    if (Math.hypot(x - cyc[0][0], y - cyc[0][1]) < 1e-5) return cyc
    cyc.push([x, y])
  }
  return null
}

/**
 * Where a dive should head: the escaping point with the longest escape time
 * near the middle of the view, which is where the set is most intricate.
 * Diving at an arbitrary point goes into flat colour or flat black. A fixed
 * grid, so the same project always dives to the same place.
 */
export function diveAim(re: number, im: number, maxIter = 165): [number, number] {
  let aim: [number, number] = [0, 0]
  let best = -1
  for (let gy = 0; gy < 40; gy++) {
    for (let gx = 0; gx < 60; gx++) {
      const p: [number, number] = [((gx + 0.5) / 60 - 0.5) * 2.4, ((gy + 0.5) / 40 - 0.5) * 1.5]
      let [x, y] = p
      let k = 0
      for (; k < maxIter && x * x + y * y < 16; k++) {
        const t = x * x - y * y + re
        y = 2 * x * y + im
        x = t
      }
      if (k < maxIter && k > best) {
        best = k
        aim = p
      }
    }
  }
  return aim
}

/**
 * The same plane, seen through a smaller canvas laid over part of a bigger
 * one: same scale, same placement on screen. Lets a 2D effect drawn on a
 * band-sized layer line up exactly with the set the stage draws beneath it.
 */
export function subView(
  v: PlaneView,
  outer: { width: number; height: number },
  inner: { left: number; top: number; width: number; height: number },
): PlaneView {
  const pxPerUnit = Math.min(outer.width, outer.height) / v.span
  return {
    ...v,
    span: Math.min(inner.width, inner.height) / pxPerUnit,
    cx: (v.cx * outer.width - inner.left) / inner.width,
    cy: (v.cy * outer.height - inner.top) / inner.height,
  }
}

/**
 * The constant an effect is shown with. Heartbeat needs an interior with an
 * attracting cycle to beat in; a project whose own constant has none is moved
 * just inside the cardioid, beside where it was.
 */
export function constantForEffect(c: Complex, effect: PlateEffect): Complex {
  if (effect !== 'heartbeat' || attractingCycle(c.re, c.im)) return { re: c.re, im: c.im }
  return cardioidEdge(nearestEdgeTheta(c), 0.92)
}
