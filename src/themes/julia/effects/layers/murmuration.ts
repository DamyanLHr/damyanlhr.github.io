import { ember } from '../../fractal'
import { fitCanvas, planeAt, type LayerFactory } from './layer'

// Murmuration: a flock over the Julia set behind it. Each bird follows the
// three boids rules (keep apart, match neighbours, close ranks) and the set's
// own field: it drifts along the level lines and is drawn toward the edge,
// so the flock wheels around the set and settles along its outline. The
// pointer is a hawk; the flock opens around it.

const N = 900
const GW = 160
const GH = 90
const CELL = 0.05
const GRIDW = Math.ceil(1 / CELL) + 1
export const MAX_SPEED = 0.0045
export const MIN_SPEED = 0.0014

export interface Flock {
  x: Float32Array
  y: Float32Array
  vx: Float32Array
  vy: Float32Array
}

/** One step of the flock over a field sampled in 0..1 layer coordinates. */
export function flockStep(
  f: Flock,
  field: (u: number, v: number) => number,
  hawk: [number, number] | null,
) {
  const n = f.x.length
  const buckets = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const key = ((f.x[i] / CELL) | 0) + ((f.y[i] / CELL) | 0) * GRIDW
    let b = buckets.get(key)
    if (!b) buckets.set(key, (b = []))
    b.push(i)
  }
  for (let i = 0; i < n; i++) {
    let ax = 0
    let ay = 0
    let cx = 0
    let cy = 0
    let sx = 0
    let sy = 0
    let m = 0
    const kx = (f.x[i] / CELL) | 0
    const ky = (f.y[i] / CELL) | 0
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++) {
        const b = buckets.get(kx + ox + (ky + oy) * GRIDW)
        if (!b) continue
        for (const j of b) {
          if (j === i) continue
          const dx = f.x[j] - f.x[i]
          const dy = f.y[j] - f.y[i]
          const d2 = dx * dx + dy * dy
          if (d2 > CELL * CELL) continue
          ax += f.vx[j]
          ay += f.vy[j]
          cx += dx
          cy += dy
          m++
          if (d2 < 0.00025) {
            sx -= dx / (d2 + 1e-6)
            sy -= dy / (d2 + 1e-6)
          }
        }
      }
    let fx = 0
    let fy = 0
    if (m) {
      fx += (ax / m - f.vx[i]) * 0.05 + (cx / m) * 0.0016
      fy += (ay / m - f.vy[i]) * 0.05 + (cy / m) * 0.0016
    }
    fx += sx * 0.0000035
    fy += sy * 0.0000035
    // the set's field: along its level lines, and in toward its edge
    const e = 0.012
    const v0 = field(f.x[i], f.y[i])
    const gx = field(f.x[i] + e, f.y[i]) - field(f.x[i] - e, f.y[i])
    const gy = field(f.x[i], f.y[i] + e) - field(f.x[i], f.y[i] - e)
    const gl = Math.hypot(gx, gy) + 1e-6
    const toward = v0 < 0.35 ? 1 : v0 > 0.9 ? -1 : 0.15
    fx += (gx / gl) * 0.00012 * toward + (-gy / gl) * 0.00009
    fy += (gy / gl) * 0.00012 * toward + (gx / gl) * 0.00009
    if (hawk) {
      const dx = f.x[i] - hawk[0]
      const dy = f.y[i] - hawk[1]
      const d2 = dx * dx + dy * dy
      if (d2 < 0.02) {
        fx += (dx / (d2 + 0.002)) * 0.00006
        fy += (dy / (d2 + 0.002)) * 0.00006
      }
    }
    // keep off the edges, as a force like any other, so the speed limits hold
    if (f.x[i] < 0.02) fx += 0.0004
    if (f.x[i] > 0.98) fx -= 0.0004
    if (f.y[i] < 0.04) fy += 0.0004
    if (f.y[i] > 0.96) fy -= 0.0004
    f.vx[i] += fx
    f.vy[i] += fy
    const sp = Math.hypot(f.vx[i], f.vy[i])
    if (sp > MAX_SPEED) {
      f.vx[i] *= MAX_SPEED / sp
      f.vy[i] *= MAX_SPEED / sp
    } else if (sp < MIN_SPEED) {
      f.vx[i] *= MIN_SPEED / (sp + 1e-9)
      f.vy[i] *= MIN_SPEED / (sp + 1e-9)
    }
    f.x[i] += f.vx[i]
    f.y[i] += f.vy[i]
  }
}

export const murmuration: LayerFactory = (canvas, view, opts) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  // the field: escape time of the set behind, sampled over the layer
  const field = new Float32Array(GW * GH)
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) {
      let [x, y] = planeAt(canvas, view, (gx + 0.5) / GW, (gy + 0.5) / GH)
      let k = 0
      for (; k < 90 && x * x + y * y < 16; k++) {
        const t = x * x - y * y + view.re
        y = 2 * x * y + view.im
        x = t
      }
      field[gy * GW + gx] = k >= 90 ? 1 : k / 90
    }
  const F = (u: number, v: number) => {
    const gx = Math.max(0, Math.min(GW - 1, (u * GW) | 0))
    const gy = Math.max(0, Math.min(GH - 1, (v * GH) | 0))
    return field[gy * GW + gx]
  }
  const flock: Flock = {
    x: new Float32Array(N),
    y: new Float32Array(N),
    vx: new Float32Array(N),
    vy: new Float32Array(N),
  }
  for (let i = 0; i < N; i++) {
    flock.x[i] = Math.random()
    flock.y[i] = Math.random()
    const a = Math.random() * 7
    flock.vx[i] = Math.cos(a) * 0.002
    flock.vy[i] = Math.sin(a) * 0.002
  }
  let ground: HTMLCanvasElement | null = null
  let hawk: [number, number] | null = null
  let scare = 0

  const draw = () => {
    const [w, h] = fitCanvas(canvas, 1100, 2)
    if (!ground || ground.width !== w || ground.height !== h) {
      // the set itself, faint, so the flock has something to settle on
      ground = document.createElement('canvas')
      ground.width = w
      ground.height = h
      const g = ground.getContext('2d')!
      const im = g.createImageData(w, h)
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const v = F(x / w, y / h)
          const c = v >= 1 ? [20, 12, 13] : ember(v * 1.3)
          const p = (y * w + x) * 4
          im.data[p] = c[0] * 0.5 + 5
          im.data[p + 1] = c[1] * 0.5 + 5.5
          im.data[p + 2] = c[2] * 0.5 + 6.5
          im.data[p + 3] = 255
        }
      g.putImageData(im, 0, 0)
    }
    ctx.drawImage(ground, 0, 0)
    ctx.lineWidth = Math.max(1.2, w / 700)
    ctx.lineCap = 'round'
    const len = Math.max(3.5, w / 220)
    for (let i = 0; i < N; i++) {
      const sp = Math.hypot(flock.vx[i], flock.vy[i]) + 1e-9
      const x = flock.x[i] * w
      const y = flock.y[i] * h
      const lx = (flock.vx[i] / sp) * len
      const ly = (flock.vy[i] / sp) * len
      const c = ember(0.62 + 0.3 * F(flock.x[i], flock.y[i]))
      ctx.strokeStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
      ctx.beginPath()
      ctx.moveTo(x - lx, y - ly)
      ctx.lineTo(x + lx, y + ly)
      ctx.stroke()
    }
  }

  return {
    frame(now) {
      const t = now / 1000
      const h = opts.autopilot
        ? ([0.5 + 0.35 * Math.cos(t * 0.5), 0.5 + 0.3 * Math.sin(t * 0.7)] as [number, number])
        : hawk
      flockStep(flock, F, scare > now ? hawk : h)
      draw()
      return true
    },
    still() {
      for (let i = 0; i < 90; i++) flockStep(flock, F, null)
      draw()
    },
    point(fx, fy) {
      hawk = [fx, fy]
    },
    press(fx, fy) {
      hawk = [fx, fy]
      scare = performance.now() + 900
    },
    leave() {
      hawk = null
    },
    resize() {
      ground = null
    },
  }
}
