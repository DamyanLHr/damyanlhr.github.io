import { emberLut, fitCanvas, lutIndex, type LayerFactory } from './layer'

// Buddhabrot ember. Instead of colouring where a point starts, every place
// an escaping orbit passes through is counted, and the counts are shown as a
// long exposure: the figure builds up out of the dark as you watch. Points in
// the main cardioid and the period-2 bulb never escape, so they are skipped
// before iterating.

const MAX = 400
/** orbits per frame for every 100k pixels, so a bigger canvas fills as fast */
const RATE = 2300

export const buddha: LayerFactory = (canvas) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  let hist: Float32Array | null = null
  let img: ImageData | null = null
  let born = 0
  const orbit = new Float32Array(MAX * 2)

  const reset = () => {
    hist?.fill(0)
    born = performance.now()
  }
  const sample = (n: number, w: number, h: number) => {
    if (!hist) return
    const s = h / 2.9
    for (let i = 0; i < n; i++) {
      const cr = Math.random() * 3 - 2
      const ci = Math.random() * 3 - 1.5
      const q = (cr - 0.25) ** 2 + ci * ci
      if (q * (q + (cr - 0.25)) < 0.25 * ci * ci || (cr + 1) ** 2 + ci * ci < 0.0625) continue
      let zr = 0
      let zi = 0
      let k = 0
      for (; k < MAX && zr * zr + zi * zi < 16; k++) {
        const t = zr * zr - zi * zi + cr
        zi = 2 * zr * zi + ci
        zr = t
        orbit[k * 2] = zr
        orbit[k * 2 + 1] = zi
      }
      if (k >= MAX || k < 8) continue
      // the figure stands upright: the real axis runs down the picture
      for (let j = 0; j < k; j++) {
        const x = (orbit[j * 2 + 1] * s + w / 2) | 0
        const y = (orbit[j * 2] * s + h * 0.62) | 0
        if (x >= 0 && y >= 0 && x < w && y < h) hist[y * w + x] += 1
      }
    }
  }
  const draw = (w: number, h: number) => {
    if (!hist) return
    if (!img || img.width !== w || img.height !== h) img = ctx.createImageData(w, h)
    let mx = 1
    for (let i = 0; i < hist.length; i++) if (hist[i] > mx) mx = hist[i]
    const lm = Math.log(1 + mx)
    const d = img.data
    const lut = emberLut()
    // faint paths stay dark until they have been crossed often
    for (let i = 0, p = 0; i < hist.length; i++, p += 4) {
      const c = lutIndex(0.97 * Math.pow(Math.log(1 + hist[i]) / lm, 1.9))
      d[p] = lut[c]
      d[p + 1] = lut[c + 1]
      d[p + 2] = lut[c + 2]
      d[p + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }
  const size = () => {
    const [w, h] = fitCanvas(canvas, 1100, 1.5)
    if (!hist || hist.length !== w * h) {
      hist = new Float32Array(w * h)
      reset()
    }
    return [w, h] as const
  }

  return {
    frame() {
      const [w, h] = size()
      if (performance.now() - born > 45000) reset()
      sample((RATE * w * h) / 1e5, w, h)
      draw(w, h)
      return true
    },
    still() {
      const [w, h] = size()
      sample((RATE * 12 * w * h) / 1e5, w, h)
      draw(w, h)
    },
    press: reset,
    resize() {
      hist = null
    },
  }
}
