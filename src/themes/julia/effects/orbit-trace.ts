import { orbit, toPlane, toScreen, type PlaneView } from './view'

// B, the orbit trace: the point under the pointer, iterated, drawn as the
// path it takes. Inside the set it spirals in and settles; outside it flies
// off within a few steps. It is the whole picture explained without a number,
// so it sits on top of the home hero and of every project plate. Mouse only:
// on touch there is no hovering, and a finger would hide it anyway.

export interface OrbitTrace {
  /** Trace from a client-space point over `box`. */
  trace: (x: number, y: number, box: DOMRect) => void
  clear: () => void
  dispose: () => void
}

export function createOrbitTrace(
  canvas: HTMLCanvasElement,
  getView: () => PlaneView,
): OrbitTrace | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  let pts: [number, number][] = []
  let age = 0
  let raf = 0

  const size = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(canvas.clientWidth * d)
    const h = Math.round(canvas.clientHeight * d)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
  }

  const render = () => {
    size()
    const d = Math.min(window.devicePixelRatio || 1, 2)
    const v = getView()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const n = Math.min(pts.length, Math.floor(age))
    for (let i = 1; i < n; i++) {
      const a = toScreen(pts[i - 1], canvas.width, canvas.height, v)
      const b = toScreen(pts[i], canvas.width, canvas.height, v)
      // the newest steps are the brightest, so the path reads in order
      const f = 1 - i / (pts.length + 4)
      ctx.strokeStyle = `rgba(255,${120 + 80 * f},${40 + 60 * f},${0.16 + 0.5 * f})`
      ctx.lineWidth = d
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.stroke()
      ctx.fillStyle = `rgba(255,${170 + 60 * f},${90 + 80 * f},${0.3 + 0.6 * f})`
      ctx.beginPath()
      ctx.arc(b[0], b[1], (1.1 + 2 * f) * d, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Drawn out a step and a half per frame, so the eye can follow it.
  const tick = () => {
    age += 1.6
    render()
    raf = age < pts.length + 2 ? requestAnimationFrame(tick) : 0
  }

  return {
    trace(x, y, box) {
      const v = getView()
      pts = orbit(toPlane(x, y, box, v), v.re, v.im)
      age = Math.min(age, 3)
      if (!raf) raf = requestAnimationFrame(tick)
    },
    clear() {
      pts = []
      cancelAnimationFrame(raf)
      raf = 0
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    },
    dispose() {
      cancelAnimationFrame(raf)
    },
  }
}
