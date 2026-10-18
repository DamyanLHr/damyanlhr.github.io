import { measureSet } from '../../fit'
import { fitCanvas, type LayerFactory } from './layer'

// Ridgelines as a flyover. Escape time is lifted into a heightfield and drawn
// as ridgelines, back to front, each row filled with the ground so it hides
// the rows behind it, the way a game draws a landscape. The landscape streams
// toward you: each new row is generated as it comes over the horizon, from a
// constant that drifts, so the range ahead is always new. It is extensible
// terrain generation, run on a Julia set. A sideways pointer or drag steers.

export const ROWS = 60
const COLS = 160
const MAX = 90
/** rows per second coming toward the viewer */
const SPEED = 7

/**
 * A fixed number of rows that only ever advances: the nearest row falls off
 * the front as a new one is made at the horizon.
 */
export class RowRing {
  rows: Float32Array[]
  readonly count: number
  private make: (index: number) => Float32Array
  constructor(count: number, make: (index: number) => Float32Array) {
    this.count = count
    this.make = make
    this.rows = Array.from({ length: count }, (_, i) => make(count - i))
  }
  /** Advance by one row; `next` is the new row's index past the horizon. */
  advance(next: number) {
    this.rows.pop()
    this.rows.unshift(this.make(next))
  }
}

export const terrain: LayerFactory = (canvas, view, opts) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const shape = measureSet(view)
  const ca = Math.cos(shape.axis)
  const sa = Math.sin(shape.axis)
  const reachX = shape.along * 1.08
  const reachY = shape.across * 1.3
  const STEP = (2 * reachY) / (ROWS * 0.8)
  let t = 0
  // the constant wanders a little way and back, so the range keeps changing
  // without ever leaving this project's neighbourhood
  const cAt = (s: number): [number, number] => [
    view.re + 0.03 * Math.sin(s * 0.09),
    view.im + 0.035 * Math.cos(s * 0.07),
  ]
  // the flight path bounces between the set's edges, so the ground under it
  // is always the set and never the empty plane beyond
  const across = (i: number) => {
    const span = 2 * reachY
    const p = (((i * STEP) % (2 * span)) + 2 * span) % (2 * span)
    return (p < span ? p : 2 * span - p) - reachY
  }
  const makeRow = (i: number) => {
    const [cr, ci] = cAt(t)
    const row = new Float32Array(COLS)
    const dy = across(i)
    for (let q = 0; q < COLS; q++) {
      const dx = (q / (COLS - 1) - 0.5) * 2 * reachX
      let x = dx * ca - dy * sa
      let y = dx * sa + dy * ca
      let k = 0
      for (; k < MAX && x * x + y * y < 16; k++) {
        const nx = x * x - y * y + cr
        y = 2 * x * y + ci
        x = nx
      }
      row[q] = k >= MAX ? 1 : Math.pow(k / MAX, 0.55)
    }
    return row
  }
  let next = ROWS + 1
  const ring = new RowRing(ROWS, makeRow)
  let frac = 0
  let steer = 0
  let amp = 0
  const born = performance.now()

  const draw = () => {
    const [W, H] = fitCanvas(canvas, 1200, 2)
    const d = Math.min(window.devicePixelRatio || 1, 2)
    ctx.fillStyle = '#0a0b0d'
    ctx.fillRect(0, 0, W, H)
    for (let r = 0; r < ROWS; r++) {
      const depth = Math.min(1, (r + frac) / (ROWS - 1))
      const y0 = H * (0.18 + 0.72 * depth)
      const sc = 0.6 + 0.4 * depth
      const height = H * 0.24 * sc * amp
      const hr = ring.rows[r]
      const X = (q: number) =>
        W / 2 + ((q / (COLS - 1) - 0.5) * W * 0.74 + steer * (1 - depth) * W * 0.12) * sc
      const ridge = new Path2D()
      for (let q = 0; q < COLS; q++) {
        const x = X(q)
        const y = y0 - hr[q] * height
        if (q === 0) ridge.moveTo(x, y)
        else ridge.lineTo(x, y)
      }
      const ground = new Path2D(ridge)
      ground.lineTo(X(COLS - 1), H)
      ground.lineTo(X(0), H)
      ground.closePath()
      ctx.fillStyle = '#0a0b0d'
      ctx.fill(ground)
      // rows come out of the haze at the horizon rather than popping in
      const haze = Math.min(1, depth * 4)
      ctx.strokeStyle = `rgba(255,${(60 + 120 * depth) | 0},${(20 + 60 * depth) | 0},${(0.3 + 0.65 * depth) * haze})`
      ctx.lineWidth = d * (0.6 + 0.8 * depth)
      ctx.stroke(ridge)
    }
  }

  return {
    frame(now, dt) {
      t = now / 1000
      // develop: the flat plane lifts into terrain, then the flight begins
      amp = Math.min(1, (now - born) / 900)
      amp = 1 - Math.pow(1 - amp, 3)
      if (opts.autopilot) steer = 0.35 * Math.sin(t * 0.5)
      frac += Math.min(dt, 0.05) * SPEED
      while (frac >= 1) {
        frac -= 1
        ring.advance(next++)
      }
      draw()
      return true
    },
    still() {
      amp = 1
      draw()
    },
    point(fx) {
      steer = (fx - 0.5) * 1.2
    },
    leave() {
      steer = 0
    },
    resize() {},
  }
}
