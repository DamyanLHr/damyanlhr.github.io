import type { PlaneView } from './view'

// Ridgelines: escape time lifted into a heightfield and drawn as ridgelines,
// back to front, each row filled with the ground so it hides the rows behind
// it. The way a game draws a landscape, and the way the terrain project it
// belongs to will. The pointer tilts it and lifts it.

const ROWS = 70
const COLS = 180
const MAX = 120

export interface Ridgelines {
  paint: (tilt: number, lift: number) => void
}

export function createRidgelines(canvas: HTMLCanvasElement, view: PlaneView): Ridgelines | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const { re, im } = view
  const ca = Math.cos(view.angle)
  const sa = Math.sin(view.angle)
  const hf: number[][] = []
  for (let r = 0; r < ROWS; r++) {
    const row: number[] = []
    for (let q = 0; q < COLS; q++) {
      const dx = (q / (COLS - 1) - 0.5) * 3.2
      const dy = (r / (ROWS - 1) - 0.5) * 2.2
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
    paint(tilt, lift) {
      const d = Math.min(window.devicePixelRatio || 1, 2)
      const W = (canvas.width = Math.max(2, Math.round(canvas.clientWidth * d)))
      const H = (canvas.height = Math.max(2, Math.round(canvas.clientHeight * d)))
      ctx.fillStyle = '#0a0b0d'
      ctx.fillRect(0, 0, W, H)
      for (let r = 0; r < ROWS; r++) {
        const depth = r / (ROWS - 1)
        const y0 = H * (0.18 + 0.72 * depth)
        const sc = 0.55 + 0.45 * depth
        const amp = H * (0.16 + 0.12 * lift) * sc
        ctx.beginPath()
        for (let q = 0; q < COLS; q++) {
          const x = W / 2 + ((q / (COLS - 1) - 0.5) * W * 1.05 + tilt * (1 - depth) * W * 0.12) * sc
          const y = y0 - hf[r][q] * amp
          if (q === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.lineTo(W * 1.2, H)
        ctx.lineTo(-W * 0.2, H)
        ctx.closePath()
        ctx.fillStyle = '#0a0b0d'
        ctx.fill()
        ctx.strokeStyle = `rgba(255,${Math.floor(60 + 120 * depth)},${Math.floor(20 + 60 * depth)},${0.35 + 0.6 * depth})`
        ctx.lineWidth = d * (0.6 + 0.8 * depth)
        ctx.stroke()
      }
    },
  }
}
