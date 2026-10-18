import { ember } from '../../fractal'
import { fadeToGround, fitCanvas, type LayerFactory } from './layer'

// Root bloom, after 2swap's swaptube (src/CUDA/root_fractal.cu): every
// polynomial of degree N-1 whose coefficients are each one of two numbers,
// c1 = 1 and c2, and all of their roots at once. With c2 = -1 these are the
// Littlewood polynomials; turning c2 around the circle tears the lace open
// and closes it again. Colour comes from which coefficients are c2, as in
// swaptube, mapped onto the ember palette.
//
// The roots are found by Durand-Kerner iteration, warm-started from the last
// frame's roots, so each frame costs two sweeps however far c2 has moved.

const N = 10
const DEG = N - 1
const COUNT = 1 << N

/** One Durand-Kerner sweep over a monic-normalised polynomial's roots, in place. */
export function durandKerner(coef: Float64Array, deg: number, roots: Float64Array, at = 0) {
  const lr = coef[deg * 2]
  const li = coef[deg * 2 + 1]
  const ld = lr * lr + li * li
  for (let k = 0; k < deg; k++) {
    const o = at + k * 2
    const zr = roots[o]
    const zi = roots[o + 1]
    let pr = coef[deg * 2]
    let pi = coef[deg * 2 + 1]
    for (let j = deg - 1; j >= 0; j--) {
      const nr = pr * zr - pi * zi + coef[j * 2]
      pi = pr * zi + pi * zr + coef[j * 2 + 1]
      pr = nr
    }
    // p(z) / leading coefficient, over the product of distances to the others
    const qr = (pr * lr + pi * li) / ld
    const qi = (pi * lr - pr * li) / ld
    let dr = 1
    let di = 0
    for (let m = 0; m < deg; m++) {
      if (m === k) continue
      const om = at + m * 2
      const ar = zr - roots[om]
      const ai = zi - roots[om + 1]
      const nr = dr * ar - di * ai
      di = dr * ai + di * ar
      dr = nr
    }
    const dd = dr * dr + di * di || 1e-12
    roots[o] = zr - (qr * dr + qi * di) / dd
    roots[o + 1] = zi - (qi * dr - qr * di) / dd
  }
}

function splat(d: Uint8ClampedArray, p: number, col: number[], k: number) {
  const g = 0.9 * k
  d[p] += col[0] * g
  d[p + 1] += col[1] * g
  d[p + 2] += col[2] * g
}

export const roots: LayerFactory = (canvas, _view, opts) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const R = new Float64Array(COUNT * DEG * 2)
  for (let i = 0; i < COUNT; i++)
    for (let k = 0; k < DEG; k++) {
      const a = (2 * Math.PI * k) / DEG + 0.4
      R[(i * DEG + k) * 2] = 1.1 * Math.cos(a)
      R[(i * DEG + k) * 2 + 1] = 1.1 * Math.sin(a)
    }
  // bit-reversed index, so neighbouring polynomials get neighbouring shades
  const shade = Array.from({ length: COUNT }, (_, i) => {
    let r = 0
    for (let b = 0; b < N; b++) if (i & (1 << b)) r |= 1 << (N - 1 - b)
    return ember(0.38 + 0.6 * (r / COUNT))
  })
  const co = new Float64Array(N * 2)
  let img: ImageData | null = null
  let turn = 0
  let jump = 0
  let t = 0

  const step = (sweeps: number, glow: number) => {
    const [w, h] = fitCanvas(canvas, 1400, 2)
    if (!img || img.width !== w || img.height !== h) {
      img = ctx.createImageData(w, h)
      fadeToGround(img.data, 0)
    }
    const d = img.data
    fadeToGround(d, glow)
    const ang = Math.PI + 1.15 * Math.sin(t * 0.11) + turn + jump
    const mag = 1 + 0.12 * Math.sin(t * 0.17)
    const c2r = mag * Math.cos(ang)
    const c2i = mag * Math.sin(ang)
    const s = Math.min(w, h) / 3.4
    for (let i = 0; i < COUNT; i++) {
      for (let b = 0; b < N; b++) {
        const on = i & (1 << b)
        co[b * 2] = on ? c2r : 1
        co[b * 2 + 1] = on ? c2i : 0
      }
      for (let it = 0; it < sweeps; it++) durandKerner(co, DEG, R, i * DEG * 2)
      const col = shade[i]
      // each root is shared between the four pixels around it, so the lace
      // stays fine and unbroken instead of stepping from pixel to pixel
      for (let k = 0; k < DEG; k++) {
        const o = (i * DEG + k) * 2
        const fx = R[o] * s + w / 2 - 0.5
        const fy = -R[o + 1] * s + h / 2 - 0.5
        const x = Math.floor(fx)
        const y = Math.floor(fy)
        if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) continue
        const ax = fx - x
        const ay = fy - y
        splat(d, (y * w + x) * 4, col, (1 - ax) * (1 - ay))
        splat(d, (y * w + x + 1) * 4, col, ax * (1 - ay))
        splat(d, ((y + 1) * w + x) * 4, col, (1 - ax) * ay)
        splat(d, ((y + 1) * w + x + 1) * 4, col, ax * ay)
      }
    }
    ctx.putImageData(img, 0, 0)
  }

  return {
    frame(now) {
      t = now / 1000
      if (opts.autopilot) turn = 0.6 * Math.sin(t * 0.3)
      step(2, 0.8)
      return true
    },
    still() {
      t = 4
      step(14, 0)
      for (let k = 0; k < 4; k++) step(1, 1)
    },
    point(fx) {
      turn = (fx - 0.5) * 1.8
    },
    press() {
      jump += 1.7
    },
    resize() {
      img = null
    },
  }
}
