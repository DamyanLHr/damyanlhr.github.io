import { measureSet } from '../fit'
import type { PlaneView } from './view'

// Ridgelines: escape time lifted into a heightfield and drawn as ridgelines,
// back to front, each row filled with the ground so it hides the rows behind
// it. The way a game draws a landscape, and the way the terrain project it
// belongs to will. The pointer tilts it and lifts it; `amp` raises it out of
// the flat plane, which is how it develops out of the set.

const ROWS = 70
const COLS = 180
const MAX = 120

export interface Ridgelines {
  /** tilt -0.5..0.5, lift 0..1, amp 0 (flat) .. 1 (full height) */
  paint: (tilt: number, lift: number, amp?: number) => void
}

export function createRidgelines(canvas: HTMLCanvasElement, view: PlaneView): Ridgelines | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const { re, im } = view
  // The terrain covers the whole set, glow included, lying along its long
  // axis whichever way the band runs: a landscape is always seen side on.
  const shape = measureSet(view)
  const ca = Math.cos(shape.axis)
  const sa = Math.sin(shape.axis)
  const reachX = shape.along * 1.08
  const reachY = shape.across * 1.25
  const hf: number[][] = []
  for (let r = 0; r < ROWS; r++) {
    const row: number[] = []
    for (let q = 0; q < COLS; q++) {
      const dx = (q / (COLS - 1) - 0.5) * 2 * reachX
      const dy = (r / (ROWS - 1) - 0.5) * 2 * reachY
      let x = dx * ca - dy * sa
      let y = dx * sa + dy * ca
      let k = 0
      for (; k < MAX && x * x + y * y < 16; k++) {
        const t = x * x - y * y + re
        y = 2 * x * y + im
        x = t
      }
      row.push(k >= MAX ? 1 : Math.pow(k / MAX, 0.55))
    }
    hf.push(row)
  }

  return {
    paint(tilt, lift, amp = 1) {
      const d = Math.min(window.devicePixelRatio || 1, 2)
      const W = Math.max(2, Math.round(canvas.clientWidth * d))
      const H = Math.max(2, Math.round(canvas.clientHeight * d))
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
      }
      ctx.fillStyle = '#0a0b0d'
      ctx.fillRect(0, 0, W, H)
      for (let r = 0; r < ROWS; r++) {
        const depth = r / (ROWS - 1)
        const y0 = H * (0.2 + 0.7 * depth)
        const sc = 0.62 + 0.38 * depth
        const height = H * (0.16 + 0.1 * lift) * sc * amp
        const ridge = new Path2D()
        for (let q = 0; q < COLS; q++) {
          const x = W / 2 + ((q / (COLS - 1) - 0.5) * W * 0.74 + tilt * (1 - depth) * W * 0.1) * sc
          const y = y0 - hf[r][q] * height
          if (q === 0) ridge.moveTo(x, y)
          else ridge.lineTo(x, y)
        }
        // The ground under the ridge hides the rows behind it; only the ridge
        // itself is drawn, so the row ends stay open instead of running off
        // to the corners.
        const ground = new Path2D(ridge)
        ground.lineTo(W * 0.5 + W * 0.37 * sc, H)
        ground.lineTo(W * 0.5 - W * 0.37 * sc, H)
        ground.closePath()
        ctx.fillStyle = '#0a0b0d'
        ctx.fill(ground)
        ctx.strokeStyle = `rgba(255,${Math.floor(60 + 120 * depth)},${Math.floor(20 + 60 * depth)},${0.35 + 0.6 * depth})`
        ctx.lineWidth = d * (0.6 + 0.8 * depth)
        ctx.stroke(ridge)
      }
    },
  }
}
