import { toScreen, type PlaneView } from './view'

// Stardust: thousands of particles run the iteration backwards, z ← ±√(z − c).
// Run backwards, the Julia set is what everything falls onto, so the dust
// draws the set's own outline. The pointer scatters it; it finds its way back.

const N = 9000

export interface Stardust {
  /** One step of the fall, drawn with the trails fading. */
  frame: () => void
  /** A finished still, for reduced motion: no trails, just where the dust lies. */
  still: () => void
  /** The pointer, in the plane, or null when it leaves. */
  push: (p: [number, number] | null) => void
  resize: () => void
}

export function createStardust(canvas: HTMLCanvasElement, view: PlaneView): Stardust | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const pts = new Float32Array(N * 2)
  for (let i = 0; i < N; i++) {
    pts[i * 2] = (Math.random() - 0.5) * 3.6
    pts[i * 2 + 1] = (Math.random() - 0.5) * 2.4
  }
  let img: ImageData | null = null
  let push: [number, number] | null = null

  const resize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 1.5)
    const w = Math.max(2, Math.round(canvas.clientWidth * d))
    const h = Math.max(2, Math.round(canvas.clientHeight * d))
    canvas.width = w
    canvas.height = h
    img = ctx.createImageData(w, h)
    // the ground colour, so the trails fade into the page rather than to black
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = 10
      img.data[i + 1] = 11
      img.data[i + 2] = 13
      img.data[i + 3] = 255
    }
  }

  const step = (plot: boolean) => {
    if (!img) return
    const { re, im } = view
    const w = img.width
    const h = img.height
    const d = img.data
    for (let i = 0; i < N; i++) {
      let x = pts[i * 2] - re
      let y = pts[i * 2 + 1] - im
      const r = Math.sqrt(Math.hypot(x, y))
      const a = Math.atan2(y, x) / 2
      const sg = Math.random() < 0.5 ? 1 : -1
      x = sg * r * Math.cos(a)
      y = sg * r * Math.sin(a)
      if (push) {
        const dx = x - push[0]
        const dy = y - push[1]
        if (dx * dx + dy * dy < 0.08) {
          x += dx * 3
          y += dy * 3
        }
      }
      pts[i * 2] = x
      pts[i * 2 + 1] = y
      if (!plot) continue
      const [sx, sy] = toScreen([x, y], w, h, view)
      const px = sx | 0
      const py = sy | 0
      if (px >= 0 && py >= 0 && px < w && py < h) {
        const o = (py * w + px) * 4
        d[o] = Math.min(255, d[o] + 90)
        d[o + 1] = Math.min(255, d[o + 1] + 46)
        d[o + 2] = Math.min(255, d[o + 2] + 14)
      }
    }
  }

  const fade = () => {
    if (!img) return
    const d = img.data
    // toward the ground colour, not toward zero
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 10 + (d[i] - 10) * 0.86
      d[i + 1] = 11 + (d[i + 1] - 11) * 0.84
      d[i + 2] = 13 + (d[i + 2] - 13) * 0.82
    }
  }

  resize()
  return {
    frame() {
      fade()
      step(true)
      if (img) ctx.putImageData(img, 0, 0)
    },
    still() {
      for (let k = 0; k < 30; k++) step(false)
      for (let k = 0; k < 6; k++) step(true)
      if (img) ctx.putImageData(img, 0, 0)
    },
    push(p) {
      push = p
    },
    resize,
  }
}
