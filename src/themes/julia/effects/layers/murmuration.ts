import { emberLut, fitCanvas, lutIndex, type LayerFactory } from './layer'
import type { PlaneView } from '../view'

// Murmuration: a flock over the Julia set behind it. Each bird follows the
// three boids rules (keep apart, match neighbours, close ranks) and the set's
// own field: it drifts along the level lines and is drawn toward the edge,
// so the flock wheels around the set and settles along its outline. The
// pointer is a hawk; the flock opens around it.
//
// The flock lives in band heights: x runs over 0..aspect and y over 0..1, so
// a bird flies as fast sideways as it does up and down. Speeds and forces are
// per sixtieth of a second and scaled by the frame's real length, so a 120Hz
// screen does not fly them twice as fast.

const N = 900
const GW = 160
const GH = 90
const CELL = 0.05
/** fastest and slowest a bird flies, in band heights per sixtieth of a second */
export const MAX_SPEED = 0.0028
export const MIN_SPEED = 0.0009

export interface Flock {
  x: Float32Array
  y: Float32Array
  vx: Float32Array
  vy: Float32Array
}

// The neighbour grid, kept between steps: a head per cell and a next link per
// bird, rebuilt each step without allocating.
let heads = new Int32Array(0)
let links = new Int32Array(0)

/**
 * One step of the flock. `field` is sampled in fractions of the layer (0..1
 * each way); `hawk` is in the same fractions; `aspect` is the layer's width
 * over its height; `k` is the step's length in sixtieths of a second.
 */
export function flockStep(
  f: Flock,
  field: (u: number, v: number) => number,
  hawk: [number, number] | null,
  aspect = 1,
  k = 1,
) {
  const n = f.x.length
  const gw = Math.ceil(aspect / CELL) + 1
  const gh = Math.ceil(1 / CELL) + 1
  if (heads.length < gw * gh) heads = new Int32Array(gw * gh)
  if (links.length < n) links = new Int32Array(n)
  heads.fill(-1, 0, gw * gh)
  const cellOf = (x: number, y: number) =>
    Math.max(0, Math.min(gw - 1, (x / CELL) | 0)) +
    Math.max(0, Math.min(gh - 1, (y / CELL) | 0)) * gw
  for (let i = 0; i < n; i++) {
    const c = cellOf(f.x[i], f.y[i])
    links[i] = heads[c]
    heads[c] = i
  }
  const hx = hawk ? hawk[0] * aspect : 0
  const hy = hawk ? hawk[1] : 0
  const at = (x: number, y: number) => field(x / aspect, y)
  const e = 0.012
  for (let i = 0; i < n; i++) {
    let ax = 0
    let ay = 0
    let cx = 0
    let cy = 0
    let sx = 0
    let sy = 0
    let m = 0
    const kx = Math.max(0, Math.min(gw - 1, (f.x[i] / CELL) | 0))
    const ky = Math.max(0, Math.min(gh - 1, (f.y[i] / CELL) | 0))
    for (let oy = -1; oy <= 1; oy++) {
      const yy = ky + oy
      if (yy < 0 || yy >= gh) continue
      for (let ox = -1; ox <= 1; ox++) {
        const xx = kx + ox
        if (xx < 0 || xx >= gw) continue
        for (let j = heads[xx + yy * gw]; j >= 0; j = links[j]) {
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
    }
    let fx = 0
    let fy = 0
    if (m) {
      fx += (ax / m - f.vx[i]) * 0.05 + (cx / m) * 0.001
      fy += (ay / m - f.vy[i]) * 0.05 + (cy / m) * 0.001
    }
    fx += sx * 0.0000022
    fy += sy * 0.0000022
    // the set's field: along its level lines, and in toward its edge
    const v0 = at(f.x[i], f.y[i])
    const gx = at(f.x[i] + e, f.y[i]) - at(f.x[i] - e, f.y[i])
    const gy = at(f.x[i], f.y[i] + e) - at(f.x[i], f.y[i] - e)
    const gl = Math.hypot(gx, gy) + 1e-6
    const toward = v0 < 0.35 ? 1 : v0 > 0.9 ? -1 : 0.15
    fx += (gx / gl) * 0.000075 * toward + (-gy / gl) * 0.000056
    fy += (gy / gl) * 0.000075 * toward + (gx / gl) * 0.000056
    if (hawk) {
      const dx = f.x[i] - hx
      const dy = f.y[i] - hy
      const d2 = dx * dx + dy * dy
      if (d2 < 0.02) {
        fx += (dx / (d2 + 0.002)) * 0.00004
        fy += (dy / (d2 + 0.002)) * 0.00004
      }
    }
    // keep off the edges, as a force like any other, so the speed limits hold
    if (f.x[i] < 0.03) fx += 0.00025
    if (f.x[i] > aspect - 0.03) fx -= 0.00025
    if (f.y[i] < 0.04) fy += 0.00025
    if (f.y[i] > 0.96) fy -= 0.00025
    f.vx[i] += fx * k
    f.vy[i] += fy * k
    const sp = Math.hypot(f.vx[i], f.vy[i])
    if (sp > MAX_SPEED) {
      f.vx[i] *= MAX_SPEED / sp
      f.vy[i] *= MAX_SPEED / sp
    } else if (sp < MIN_SPEED) {
      f.vx[i] *= MIN_SPEED / (sp + 1e-9)
      f.vy[i] *= MIN_SPEED / (sp + 1e-9)
    }
    f.x[i] += f.vx[i] * k
    f.y[i] += f.vy[i] * k
  }
}

/** The plane under a fraction of a box of cw by ch CSS pixels (toPlane, unrolled). */
function mapper(v: PlaneView, cw: number, ch: number) {
  const s = v.span / Math.min(cw, ch)
  const ca = Math.cos(v.angle)
  const sa = Math.sin(v.angle)
  return (fx: number, fy: number, out: [number, number]) => {
    const dx = (fx - v.cx) * cw * s
    const dy = (fy - v.cy) * ch * s
    out[0] = dx * ca - dy * sa + v.off[0]
    out[1] = dx * sa + dy * ca + v.off[1]
  }
}

/** Shades a bird takes, from the set's outside to its edge. */
const SHADES = 8

export const murmuration: LayerFactory = (canvas, view, opts) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const cw = Math.max(1, canvas.clientWidth)
  const ch = Math.max(1, canvas.clientHeight)
  let aspect = cw / ch
  const map = mapper(view, cw, ch)
  const z: [number, number] = [0, 0]
  const escape = (fx: number, fy: number, max: number) => {
    map(fx, fy, z)
    let [x, y] = z
    let k = 0
    for (; k < max && x * x + y * y < 16; k++) {
      const t = x * x - y * y + view.re
      y = 2 * x * y + view.im
      x = t
    }
    return { k, r2: x * x + y * y }
  }
  // the field: escape time of the set behind, sampled over the layer
  const field = new Float32Array(GW * GH)
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) {
      const { k } = escape((gx + 0.5) / GW, (gy + 0.5) / GH, 60)
      field[gy * GW + gx] = k >= 60 ? 1 : k / 60
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
    flock.x[i] = Math.random() * aspect
    flock.y[i] = Math.random()
    const a = Math.random() * 7
    flock.vx[i] = Math.cos(a) * MIN_SPEED * 1.5
    flock.vy[i] = Math.sin(a) * MIN_SPEED * 1.5
  }
  const lut = emberLut()
  const shades = Array.from({ length: SHADES }, (_, b) => {
    const c = lutIndex(0.62 + (0.3 * (b + 0.5)) / SHADES)
    return `rgb(${lut[c]},${lut[c + 1]},${lut[c + 2]})`
  })
  let ground: HTMLCanvasElement | null = null
  let hawk: [number, number] | null = null
  let scare = 0

  const draw = () => {
    const [w, h] = fitCanvas(canvas, 1100, 2)
    if (!ground || ground.width !== w || ground.height !== h) {
      // the set itself, faint, so the flock has something to settle on. It is
      // worked out per pixel, smoothly, rather than read off the flock's
      // coarse field, so it stays crisp at any size.
      ground = document.createElement('canvas')
      ground.width = w
      ground.height = h
      const g = ground.getContext('2d')!
      const im = g.createImageData(w, h)
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const { k, r2 } = escape((x + 0.5) / w, (y + 0.5) / h, 60)
          const p = (y * w + x) * 4
          if (k >= 60) {
            im.data[p] = 15
            im.data[p + 1] = 11
            im.data[p + 2] = 13
          } else {
            const v = (k + 1 - Math.log2(Math.log2(r2) / 2)) / 60
            const c = lutIndex(v * 1.3)
            im.data[p] = lut[c] * 0.5 + 5
            im.data[p + 1] = lut[c + 1] * 0.5 + 5.5
            im.data[p + 2] = lut[c + 2] * 0.5 + 6.5
          }
          im.data[p + 3] = 255
        }
      g.putImageData(im, 0, 0)
    }
    ctx.drawImage(ground, 0, 0)
    ctx.lineWidth = Math.max(1.2, w / 700)
    ctx.lineCap = 'round'
    const len = Math.max(3.5, w / 220)
    const sx = w / aspect
    // one path per shade, rather than a stroke per bird
    for (let b = 0; b < SHADES; b++) {
      ctx.beginPath()
      for (let i = 0; i < N; i++) {
        const u = flock.x[i] / aspect
        const shade = Math.min(SHADES - 1, (F(u, flock.y[i]) * SHADES) | 0)
        if (shade !== b) continue
        const sp = Math.hypot(flock.vx[i], flock.vy[i]) + 1e-9
        const x = flock.x[i] * sx
        const y = flock.y[i] * h
        const lx = (flock.vx[i] / sp) * len
        const ly = (flock.vy[i] / sp) * len
        ctx.moveTo(x - lx, y - ly)
        ctx.lineTo(x + lx, y + ly)
      }
      ctx.strokeStyle = shades[b]
      ctx.stroke()
    }
  }

  return {
    frame(now, dt) {
      const t = now / 1000
      const h = opts.autopilot
        ? ([0.5 + 0.35 * Math.cos(t * 0.5), 0.5 + 0.3 * Math.sin(t * 0.7)] as [number, number])
        : hawk
      flockStep(flock, F, scare > now ? hawk : h, aspect, Math.min(3, dt * 60))
      draw()
      return true
    },
    still() {
      for (let i = 0; i < 90; i++) flockStep(flock, F, null, aspect)
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
      // keep the flock where it was across a change of shape
      const next = Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight)
      for (let i = 0; i < N; i++) flock.x[i] *= next / aspect
      aspect = next
    },
  }
}
