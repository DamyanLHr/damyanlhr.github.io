import { emberLut, fitCanvas, lutIndex, type LayerFactory } from './layer'

// A Clifford attractor: x' = sin(a·y) + c·cos(a·x), y' = sin(b·x) + d·cos(b·y).
// Thousands of points follow it at once and leave a fading density, while the
// four numbers drift, so the silk keeps folding into shapes it has not made
// before. The pointer bends a and b.

const P = 6000

export const attractor: LayerFactory = (canvas, _view, opts) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const xs = new Float32Array(P)
  const ys = new Float32Array(P)
  for (let i = 0; i < P; i++) {
    xs[i] = Math.random() * 2 - 1
    ys[i] = Math.random() * 2 - 1
  }
  let dens: Float32Array | null = null
  let img: ImageData | null = null
  let bend: [number, number] = [0, 0]

  const run = (t: number, steps: number, decay: number) => {
    const [w, h] = fitCanvas(canvas, 1400, 1.5)
    if (!dens || dens.length !== w * h) {
      dens = new Float32Array(w * h)
      img = ctx.createImageData(w, h)
    }
    if (opts.autopilot) bend = [0.2 * Math.sin(t * 0.4), 0.2 * Math.cos(t * 0.3)]
    const a = -1.4 + 0.22 * Math.sin(t * 0.07) + bend[0]
    const b = 1.6 + 0.2 * Math.sin(t * 0.05 + 1) + bend[1]
    const c = 1.0 + 0.3 * Math.sin(t * 0.06 + 2)
    const d = 0.7 + 0.25 * Math.sin(t * 0.045 + 3)
    for (let i = 0; i < dens.length; i++) dens[i] *= decay
    const s = Math.min(w / 5, h / 3.5)
    for (let i = 0; i < P; i++) {
      let x = xs[i]
      let y = ys[i]
      for (let k = 0; k < steps; k++) {
        const nx = Math.sin(a * y) + c * Math.cos(a * x)
        const ny = Math.sin(b * x) + d * Math.cos(b * y)
        x = nx
        y = ny
        const px = (x * s + w / 2) | 0
        const py = (y * s + h / 2) | 0
        if (px >= 0 && py >= 0 && px < w && py < h) dens[py * w + px] += 1
      }
      xs[i] = x
      ys[i] = y
    }
    const data = img!.data
    const lut = emberLut()
    // the same silk spread over more pixels lands fewer times on each
    const gain = 0.12 * ((w * h) / 230400) * (2500 / P)
    for (let i = 0, p = 0; i < dens.length; i++, p += 4) {
      const c = lutIndex(0.03 + 0.95 * (1 - Math.exp(-dens[i] * gain)))
      data[p] = lut[c]
      data[p + 1] = lut[c + 1]
      data[p + 2] = lut[c + 2]
      data[p + 3] = 255
    }
    ctx.putImageData(img!, 0, 0)
  }

  return {
    frame(now) {
      run(now / 1000, 24, 0.94)
      return true
    },
    still() {
      run(3, 200, 1)
    },
    point(fx, fy) {
      bend = [(fx - 0.5) * 0.5, (fy - 0.5) * 0.5]
    },
    leave() {
      bend = [0, 0]
    },
    resize() {
      dens = null
    },
  }
}
