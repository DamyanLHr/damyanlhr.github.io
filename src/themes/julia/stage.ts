import { renderJulia } from './fractal'
import { createGlJulia } from './fractal-gl'
import { easeInOut, easeOut, travelPose, type Pose } from './travel'
import type { PlaneView } from './effects/view'

// julia's persistent stage: one canvas for the whole visit. Pages never get
// their own backdrop; each one hands the stage a pose, and the set travels
// there from wherever it is, so a second navigation mid-trip simply retargets.
//
// GL draws every frame of a trip. The CPU floor path can't, so there each page
// gets a still render and the brightness change is a CSS fade. Under reduced
// motion every change is a cut.

export interface Stage {
  /** Move the set to a page's pose. `travel: false` cuts (resize, first paint). */
  setPose: (pose: Pose, opts?: { travel?: boolean }) => void
  /** Pointer follow and ambient drift, for the home hero only. */
  setFollow: (on: boolean) => void
  /** The plane as it was last drawn, for anything drawn over it. */
  view: () => PlaneView | null
  dispose: () => void
}

const TRAVEL_MS = 950
const CONDENSE_MS = 1100
const MAX_ITER = 170

export function createStage(canvas: HTMLCanvasElement): Stage {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  // ?cpufractal forces the CPU floor path (QA tool for the fallback rendering)
  const forceCpu = new URLSearchParams(window.location.search).has('cpufractal')
  const glr = forceCpu ? null : createGlJulia(canvas)
  const animated = glr !== null && !reduced

  let shown: Pose | null = null
  let trip: { from: Pose; to: Pose; t0: number } | null = null
  let condenseT0: number | null = null
  let follow = false
  const cur = { dre: 0, dim: 0, spanMul: 1 }
  const tgt = { dre: 0, dim: 0, spanMul: 1 }
  const drift = { dre: 0, dim: 0 }
  let lastInput = performance.now()
  let raf = 0
  let running = false
  let disposed = false
  let cpuTimer: number | undefined

  if (!animated) canvas.style.transition = 'opacity 420ms cubic-bezier(0.23, 1, 0.32, 1)'

  const draw = (maxIter: number) => {
    if (!shown) return
    canvas.style.opacity = String(shown.dim)
    const params = {
      re: shown.re + cur.dre,
      im: shown.im + cur.dim,
      span: shown.span * cur.spanMul,
      centerX: shown.x,
      centerY: shown.y,
      angle: shown.angle,
      maxIter,
    }
    if (glr) glr.render(params)
    else renderJulia(canvas, params, 1)
  }

  // A still render (CPU path, or reduced motion) waits for the dust to settle
  // instead of drawing every request: on the CPU it is a full screen each time.
  const drawStill = () => {
    window.clearTimeout(cpuTimer)
    cpuTimer = window.setTimeout(() => !disposed && draw(MAX_ITER), 60)
  }

  const followSettled = () =>
    Math.abs(tgt.dre + drift.dre - cur.dre) < 0.0006 &&
    Math.abs(tgt.dim + drift.dim - cur.dim) < 0.0006 &&
    Math.abs(tgt.spanMul - cur.spanMul) < 0.004

  const loop = (t: number) => {
    if (disposed) return
    let busy = false

    if (trip) {
      const k = Math.min(1, (t - trip.t0) / TRAVEL_MS)
      shown = travelPose(trip.from, trip.to, easeInOut(k))
      if (k >= 1) {
        shown = trip.to
        trip = null
      } else busy = true
    }

    let maxIter = MAX_ITER
    if (condenseT0 !== null) {
      const k = Math.min(1, (t - condenseT0) / CONDENSE_MS)
      maxIter = Math.round(2 + (MAX_ITER - 2) * easeOut(k))
      if (k >= 1) condenseT0 = null
      else busy = true
    }

    // The hero's own life: it leans toward the pointer and drifts while you
    // are around, then comes to rest a few seconds after you stop.
    const idle = t - lastInput
    if (follow && finePointer) {
      const amp = idle < 4000 ? 1 : Math.max(0, 1 - (idle - 4000) / 1500)
      drift.dre = Math.sin(t * 0.00012) * 0.015 * amp
      drift.dim = Math.cos(t * 0.00009) * 0.015 * amp
      if (idle < 5600) busy = true
    } else {
      drift.dre = 0
      drift.dim = 0
    }
    cur.dre += (tgt.dre + drift.dre - cur.dre) * 0.14
    cur.dim += (tgt.dim + drift.dim - cur.dim) * 0.14
    cur.spanMul += (tgt.spanMul - cur.spanMul) * 0.14
    if (!followSettled()) busy = true

    draw(maxIter)
    if (busy) raf = requestAnimationFrame(loop)
    else running = false
  }

  const wake = () => {
    if (!animated || running || disposed) return
    running = true
    raf = requestAnimationFrame(loop)
  }

  const onPointer = (e: PointerEvent) => {
    if (!follow) return
    lastInput = performance.now()
    tgt.dre = (e.clientX / window.innerWidth - 0.5) * 0.075
    tgt.dim = (e.clientY / window.innerHeight - 0.5) * 0.06
    wake()
  }
  // Holding the button down leans into the set; letting go lets it back out.
  const onDown = () => {
    if (!follow) return
    lastInput = performance.now()
    tgt.spanMul = 0.72
    wake()
  }
  const onUp = () => {
    if (tgt.spanMul === 1) return
    lastInput = performance.now()
    tgt.spanMul = 1
    wake()
  }
  if (animated && finePointer) {
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  let resizeTimer: number | undefined
  const observer = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      if (!running) draw(MAX_ITER)
    }, 160)
  })
  observer.observe(canvas)

  return {
    setPose(pose, opts = {}) {
      const first = shown === null
      if (!animated) {
        shown = pose
        drawStill()
        return
      }
      if (first) {
        // First arrival: the set condenses out of the plane, one iteration at a time.
        shown = pose
        condenseT0 = performance.now()
      } else if (opts.travel === false) {
        if (trip) trip.to = pose
        else shown = pose
      } else {
        trip = { from: shown!, to: pose, t0: performance.now() }
      }
      wake()
    },
    setFollow(on) {
      follow = on
      if (!on) {
        tgt.dre = 0
        tgt.dim = 0
        tgt.spanMul = 1
      }
      wake()
    },
    view() {
      if (!shown) return null
      return {
        re: shown.re + cur.dre,
        im: shown.im + cur.dim,
        span: shown.span * cur.spanMul,
        cx: shown.x,
        cy: shown.y,
        angle: shown.angle,
        off: [0, 0],
      }
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      window.clearTimeout(cpuTimer)
      window.clearTimeout(resizeTimer)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      observer.disconnect()
      glr?.dispose()
    },
  }
}
