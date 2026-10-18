import { renderJulia } from './fractal'
import { createEffectGl, type EffectState } from './effects/effects-gl'
import type { PlaneView } from './effects/view'
import { easeInOut, easeOut, travelPose, type Pose } from './travel'

// julia's persistent stage: one canvas for the whole visit. Pages never get
// their own backdrop; each one hands the stage a pose, and the set travels
// there from wherever it is, so a second navigation mid-trip simply retargets.
// On a project page the same set then develops into that project's effect in
// place, so the picture you followed there is the one you play with.
//
// GL draws every frame of a trip. The CPU floor path can't, so there each page
// gets a still render of the plain set and the brightness change is a CSS
// fade. Under reduced motion every change is a cut.

export type Follow = 'off' | 'window' | HTMLElement

export interface Stage {
  /**
   * Move the set to a page's pose. `travel: false` cuts (resize, first paint);
   * `preview` is the quicker trip a pointed-at card asks for.
   */
  setPose: (pose: Pose, opts?: { travel?: boolean; preview?: boolean }) => void
  /**
   * Draw only the top `px` CSS pixels once the set has landed (a band page,
   * where nothing below the band shows), or everything (null).
   */
  setClip: (px: number | null) => void
  /**
   * The set's lean toward the pointer: everywhere with ambient drift and a
   * hold-to-lean-in (the home hero), or only while the pointer is over one
   * element (a band, where leaning in would push the set past its edges).
   */
  setFollow: (follow: Follow) => void
  /** Develop an effect out of the plain set, or (null) dissolve back into it. */
  setEffect: (state: EffectState | null, opts?: { delay?: number }) => void
  /** Change the running effect's inputs: lamp, trap, ripple, time, and so on. */
  setState: (state: Partial<EffectState>) => void
  /** The scroll dive's zoom and the cursor effect's bend, on top of the pose. */
  setLens: (lens: { spanMul?: number; off?: [number, number]; bend?: [number, number] }) => void
  /** The plane as it is drawn now, for anything drawn over it or reading input. */
  view: () => PlaneView | null
  /** Milliseconds until the current trip arrives. */
  eta: () => number
  /** Whether effects can run on this stage (WebGL and motion allowed). */
  readonly effects: boolean
  dispose: () => void
}

const TRAVEL_MS = 950
/** A card's preview is frequent and small, so it travels quicker. */
const PREVIEW_MS = 650
const CONDENSE_MS = 1100
const DEVELOP_MS = 600
const DISSOLVE_MS = 300
const MAX_ITER = 170
/** Frames slower than this, on average, drop the render to 3/4 resolution. */
const SLOW_FRAME_MS = 22

export function createStage(canvas: HTMLCanvasElement): Stage {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  // ?cpufractal forces the CPU floor path (QA tool for the fallback rendering)
  const forceCpu = new URLSearchParams(window.location.search).has('cpufractal')
  const glr = forceCpu ? null : createEffectGl(canvas)
  const animated = glr !== null && !reduced

  let shown: Pose | null = null
  let trip: { from: Pose; to: Pose; t0: number; ms: number; ease: (k: number) => number } | null =
    null
  let clip: number | null = null
  let condenseT0: number | null = null
  let follow: Follow = 'off'
  const cur = { dre: 0, dim: 0, spanMul: 1 }
  const tgt = { dre: 0, dim: 0, spanMul: 1 }
  const drift = { dre: 0, dim: 0 }
  let lastInput = performance.now()

  let fx: EffectState = { mode: 'plain', amount: 0 }
  let develop: { from: number; to: number; t0: number; ms: number } | null = null
  const lens = { spanMul: 1, off: [0, 0] as [number, number], bend: [0, 0] as [number, number] }

  let raf = 0
  let running = false
  let disposed = false
  let visible = true
  let cpuTimer: number | undefined
  let scale = 1
  let slowFrames = 0
  let lastFrame = 0

  if (!animated) canvas.style.transition = 'opacity 420ms cubic-bezier(0.23, 1, 0.32, 1)'

  const current = (): PlaneView | null => {
    if (!shown) return null
    return {
      re: shown.re + cur.dre + lens.bend[0],
      im: shown.im + cur.dim + lens.bend[1],
      span: shown.span * cur.spanMul * lens.spanMul,
      cx: shown.x,
      cy: shown.y,
      angle: shown.angle,
      off: lens.off,
    }
  }

  const draw = (maxIter: number) => {
    const v = current()
    if (!v || !shown) return
    if (glr) {
      // The dim is drawn into the picture rather than set as the canvas's
      // opacity: written every frame of a trip, an opacity would restart its
      // CSS transition each time and always trail the set.
      const rows =
        clip !== null && !trip
          ? clip * (canvas.height / Math.max(1, canvas.clientHeight))
          : undefined
      glr.render(
        v,
        { ...fx, maxIter: Math.min(maxIter, fx.maxIter ?? maxIter) },
        { scale },
        {
          dim: shown.dim,
          clip: rows,
        },
      )
    } else {
      canvas.style.opacity = String(shown.dim)
      renderJulia(
        canvas,
        { re: v.re, im: v.im, span: v.span, centerX: v.cx, centerY: v.cy, angle: v.angle, maxIter },
        1,
      )
    }
  }

  // A still render (CPU path, or reduced motion) waits for the dust to settle
  // instead of drawing every request: on the CPU it is a full screen each time.
  const drawStill = () => {
    window.clearTimeout(cpuTimer)
    cpuTimer = window.setTimeout(() => !disposed && draw(fx.maxIter ?? MAX_ITER), 60)
  }

  const followSettled = () =>
    Math.abs(tgt.dre + drift.dre - cur.dre) < 0.0006 &&
    Math.abs(tgt.dim + drift.dim - cur.dim) < 0.0006 &&
    Math.abs(tgt.spanMul - cur.spanMul) < 0.004

  const loop = (t: number) => {
    if (disposed) return
    if (!visible) {
      running = false
      return
    }
    let busy = false

    // A frame budget: a phone that cannot hold the full resolution gets a
    // slightly softer picture rather than a stutter.
    if (lastFrame && scale === 1) {
      slowFrames = t - lastFrame > SLOW_FRAME_MS ? slowFrames + 1 : Math.max(0, slowFrames - 1)
      if (slowFrames > 30) scale = 0.75
    }
    // seconds since the last frame, in sixtieths, so the follow eases at the
    // same pace on a 60Hz and a 120Hz screen
    const steps = lastFrame ? Math.min(6, ((t - lastFrame) / 1000) * 60) : 1
    lastFrame = t

    if (trip) {
      const k = Math.min(1, Math.max(0, (t - trip.t0) / trip.ms))
      shown = travelPose(trip.from, trip.to, trip.ease(k))
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

    if (develop) {
      const k = Math.min(1, Math.max(0, (t - develop.t0) / develop.ms))
      fx = { ...fx, amount: develop.from + (develop.to - develop.from) * easeOut(k) }
      if (k >= 1) {
        if (develop.to === 0) fx = { mode: 'plain', amount: 0 }
        develop = null
      } else busy = true
    }

    // The hero's own life: it leans toward the pointer and drifts while you
    // are around, then comes to rest a few seconds after you stop.
    const idle = t - lastInput
    if (follow === 'window' && finePointer) {
      const amp = idle < 4000 ? 1 : Math.max(0, 1 - (idle - 4000) / 1500)
      drift.dre = Math.sin(t * 0.00012) * 0.015 * amp
      drift.dim = Math.cos(t * 0.00009) * 0.015 * amp
      if (idle < 5600) busy = true
    } else {
      drift.dre = 0
      drift.dim = 0
    }
    const ease = 1 - Math.pow(1 - 0.14, steps)
    cur.dre += (tgt.dre + drift.dre - cur.dre) * ease
    cur.dim += (tgt.dim + drift.dim - cur.dim) * ease
    cur.spanMul += (tgt.spanMul - cur.spanMul) * ease
    if (!followSettled()) busy = true

    draw(maxIter)
    if (busy) raf = requestAnimationFrame(loop)
    else {
      running = false
      lastFrame = 0
    }
  }

  const wake = () => {
    if (disposed) return
    if (!animated) {
      drawStill()
      return
    }
    if (running || !visible) return
    running = true
    raf = requestAnimationFrame(loop)
  }

  const onPointer = (e: PointerEvent) => {
    if (follow === 'off' || e.pointerType !== 'mouse') return
    lastInput = performance.now()
    if (follow === 'window') {
      tgt.dre = (e.clientX / window.innerWidth - 0.5) * 0.075
      tgt.dim = (e.clientY / window.innerHeight - 0.5) * 0.06
    } else {
      // A band leans less, and only while the pointer is over it.
      const r = follow.getBoundingClientRect()
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      tgt.dre = inside ? ((e.clientX - r.left) / r.width - 0.5) * 0.05 : 0
      tgt.dim = inside ? ((e.clientY - r.top) / r.height - 0.5) * 0.04 : 0
    }
    wake()
  }
  // Holding the button down leans into the hero; letting go lets it back out.
  const onDown = () => {
    if (follow !== 'window') return
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
  const resizer = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      if (!running) draw(MAX_ITER)
    }, 160)
  })
  resizer.observe(canvas)

  // On the projects pages the stage scrolls away with the band; there is no
  // point drawing a picture nobody can see.
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) wake()
  })
  seen.observe(canvas)

  return {
    effects: animated,
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
        // An effect dissolves before the set sets off, so it never travels
        // half developed.
        const now = performance.now()
        const wait = develop && develop.to === 0 ? Math.max(0, develop.t0 + develop.ms - now) : 0
        // A set already on its way keeps its speed: the new trip leaves at
        // once instead of easing in from a standstill again.
        const moving = trip !== null && now >= trip.t0 && now < trip.t0 + trip.ms
        trip = {
          from: shown!,
          to: pose,
          t0: now + wait,
          ms: opts.preview ? PREVIEW_MS : TRAVEL_MS,
          ease: moving ? easeOut : easeInOut,
        }
      }
      wake()
    },
    setClip(px) {
      if (clip === px) return
      clip = px
      if (!running && glr) draw(fx.maxIter ?? MAX_ITER)
    },
    setFollow(next) {
      follow = next
      tgt.dre = 0
      tgt.dim = 0
      tgt.spanMul = 1
      wake()
    },
    setEffect(state, opts = {}) {
      const now = performance.now()
      const amount = fx.amount ?? 0
      if (state === null) {
        if (amount === 0 && !develop) {
          fx = { mode: 'plain', amount: 0 }
          return
        }
        develop = { from: amount, to: 0, t0: now, ms: animated ? DISSOLVE_MS : 0 }
      } else {
        fx = { ...state, amount: state.mode === fx.mode ? amount : 0 }
        develop = {
          from: fx.amount ?? 0,
          to: 1,
          t0: now + (opts.delay ?? 0),
          ms: animated ? DEVELOP_MS : 0,
        }
        if (!animated) fx.amount = 1
      }
      wake()
    },
    setState(state) {
      fx = { ...fx, ...state }
      wake()
    },
    setLens(next) {
      if (next.spanMul !== undefined) lens.spanMul = next.spanMul
      if (next.off) lens.off = next.off
      if (next.bend) lens.bend = next.bend
      wake()
    },
    view: current,
    eta() {
      return trip ? Math.max(0, trip.t0 + trip.ms - performance.now()) : 0
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
      resizer.disconnect()
      seen.disconnect()
      glr?.dispose()
    },
  }
}
