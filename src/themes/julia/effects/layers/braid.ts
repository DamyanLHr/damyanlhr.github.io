import { ember } from '../../fractal'
import { fitCanvas, type LayerFactory } from './layer'

// Quintic braid, after 2swap's swaptube (root_fractal.cu, find_roots.cuh).
// The five roots of z⁵ − z − c, tracked as c loops once around one of the
// four branch points, where two roots meet. Each loop braids those two and
// leaves them swapped, which is the geometry behind there being no formula
// for the quintic. The inset is the plane of c, with its branch points.

/** The four values of c where z⁵ − z − c has a double root: c = −0.8·z, z⁴ = 1/5. */
export function branchPoints(): [number, number][] {
  const r = Math.pow(0.2, 0.25)
  return [0, 1, 2, 3].map((k) => {
    const a = (k * Math.PI) / 2
    return [-0.8 * r * Math.cos(a), -0.8 * r * Math.sin(a)]
  })
}

/** Newton steps on z⁵ − z − c from a starting guess. */
export function quinticRoot(c: [number, number], z: [number, number], steps = 6): [number, number] {
  let [zr, zi] = z
  for (let it = 0; it < steps; it++) {
    let qr = zr
    let qi = zi
    for (let j = 0; j < 3; j++) {
      const n = qr * zr - qi * zi
      qi = qr * zi + qi * zr
      qr = n
    }
    const pr = qr * zr - qi * zi
    const pi = qr * zi + qi * zr
    const fr = pr - zr - c[0]
    const fi = pi - zi - c[1]
    const dr = 5 * qr - 1
    const di = 5 * qi
    const dd = dr * dr + di * di || 1e-12
    zr -= (fr * dr + fi * di) / dd
    zi -= (fi * dr - fr * di) / dd
  }
  return [zr, zi]
}

const TRAIL = 420

export const braid: LayerFactory = (canvas) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const bz = branchPoints()
  let c: [number, number] = [bz[0][0] + 0.32, bz[0][1]]
  let rs: [number, number][] = [0, 1, 2, 3, 4].map((k) => [
    Math.cos(k * 1.256 + 0.3),
    Math.sin(k * 1.256 + 0.3),
  ])
  // let the five guesses settle onto five distinct roots
  for (let it = 0; it < 60; it++) rs = rs.map((z) => quinticRoot(c, z, 1))
  const trails: [number, number][][] = rs.map(() => [])
  const COLS = [ember(0.55), ember(0.66), ember(0.78), ember(0.9), [255, 255, 255] as const]
  let phase = 0
  let which = 0
  let steer: [number, number] | null = null
  // c is only taken by hand after a click or tap; hovering alone leaves the
  // loop running, so the band keeps braiding while you read beside it
  let holding = false

  const draw = () => {
    const [w, h] = fitCanvas(canvas, 900, 2)
    ctx.fillStyle = '#0a0b0d'
    ctx.fillRect(0, 0, w, h)
    const s = Math.min(w, h) / 2.5
    const X = (z: [number, number]) => w * 0.45 + z[0] * s
    const Y = (z: [number, number]) => h / 2 - z[1] * s
    const lw = Math.max(1.4, w / 500)
    for (let k = 0; k < 5; k++) {
      const tr = trails[k]
      const [r, g, b] = COLS[k]
      for (let i = 1; i < tr.length; i++) {
        ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${(i / tr.length) * 0.9})`
        ctx.lineWidth = lw
        ctx.beginPath()
        ctx.moveTo(X(tr[i - 1]), Y(tr[i - 1]))
        ctx.lineTo(X(tr[i]), Y(tr[i]))
        ctx.stroke()
      }
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`
      ctx.shadowColor = ctx.fillStyle
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(X(rs[k]), Y(rs[k]), lw * 2.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }
    // the plane of c
    const iw = w * 0.24
    const ih = iw * 0.75
    const ix = w - iw - w * 0.03
    const iy = h - ih - h * 0.06
    const is = iw / 2.2
    ctx.fillStyle = 'rgba(17,19,23,.92)'
    ctx.fillRect(ix, iy, iw, ih)
    ctx.strokeStyle = 'rgba(236,233,228,.18)'
    ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1)
    ctx.fillStyle = 'rgba(236,233,228,.55)'
    for (const b of bz) {
      ctx.beginPath()
      ctx.arc(ix + iw / 2 + b[0] * is, iy + ih / 2 - b[1] * is, lw * 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#ff6a00'
    ctx.beginPath()
    ctx.arc(ix + iw / 2 + c[0] * is, iy + ih / 2 - c[1] * is, lw * 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(138,143,152,.9)'
    ctx.font = `${Math.max(9, iw * 0.07)}px "IBM Plex Mono", monospace`
    ctx.fillText('c', ix + 6, iy + Math.max(12, iw * 0.08))
  }

  const advance = (dt: number) => {
    if (steer) c = steer
    else {
      phase += dt * 0.55
      if (phase > 2 * Math.PI) {
        phase -= 2 * Math.PI
        which = (which + 1) % 4
      }
      const b = bz[which]
      c = [b[0] + 0.32 * Math.cos(phase), b[1] + 0.32 * Math.sin(phase)]
    }
    for (let k = 0; k < 5; k++) {
      rs[k] = quinticRoot(c, rs[k])
      trails[k].push(rs[k])
      if (trails[k].length > TRAIL) trails[k].shift()
    }
  }

  return {
    frame(_t, dt) {
      advance(Math.min(dt, 0.05))
      draw()
      return true
    },
    still() {
      for (let i = 0; i < 300; i++) advance(1 / 60)
      draw()
    },
    point(fx, fy) {
      if (holding) steer = [(fx - 0.5) * 1.9, -(fy - 0.5) * 1.2]
    },
    press(fx, fy) {
      holding = !holding
      steer = holding ? [(fx - 0.5) * 1.9, -(fy - 0.5) * 1.2] : null
    },
    leave() {
      holding = false
      steer = null
    },
    resize() {},
  }
}
