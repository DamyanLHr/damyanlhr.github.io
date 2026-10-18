import type { PlateEffect } from '../../../content/types'
import { renderJulia } from '../fractal'
import { cardioidEdge, easeOut, nearestEdgeTheta } from '../travel'
import { createEffectGl, type EffectState, type GlMode } from './effects-gl'
import { createOrbitTrace } from './orbit-trace'
import { createRidgelines } from './ridgelines'
import { createStardust } from './stardust'
import { attractingCycle, diveAim, toPlane, type PlaneView } from './view'

// A project plate: the project's own set, with the one effect that project was
// given, and the orbit trace over it. Everything waits until the plate is on
// screen, pauses when it leaves, and holds still under reduced motion.

const GL_MODE: Partial<Record<PlateEffect, GlMode>> = {
  relief: 'relief',
  ripple: 'ripple',
  cursor: 'plain',
  'field-lines': 'field',
  'orbit-traps': 'traps',
  'scroll-dive': 'plain',
  heartbeat: 'heartbeat',
}

const RIPPLE_MS = 1300
const MAX_ITER = 170

/** Mounts the effect into `host` and returns its teardown. */
export function mountPlate(host: HTMLElement, effect: PlateEffect, base: PlaneView): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const forceCpu = new URLSearchParams(window.location.search).has('cpufractal')
  const main = document.createElement('canvas')
  const overlay = document.createElement('canvas')
  main.className = 'j-plate-main'
  overlay.className = 'j-plate-trace'
  host.append(main, overlay)

  const view: PlaneView = { ...base, off: [...base.off] }
  // Dust settles onto the whole set, including the outlying grains a plain
  // render loses in the dark, so it needs a wider frame to fit.
  if (effect === 'stardust') view.span = base.span * 1.9
  const cleanups: (() => void)[] = [() => main.remove(), () => overlay.remove()]
  const on = <K extends keyof HTMLElementEventMap>(
    el: HTMLElement | Window,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
    opts?: AddEventListenerOptions,
  ) => {
    el.addEventListener(type, fn as EventListener, opts)
    cleanups.push(() => el.removeEventListener(type, fn as EventListener, opts))
  }
  const plane = (e: PointerEvent | WheelEvent) =>
    toPlane(e.clientX, e.clientY, host.getBoundingClientRect(), view)

  let visible = false
  let started = false
  let raf = 0
  let loop: (() => void) | null = null
  const kick = () => {
    if (!raf && visible && loop) raf = requestAnimationFrame(tickLoop)
  }
  const tickLoop = () => {
    raf = 0
    loop?.()
  }

  // The trace explains any picture that is the plane itself. Ridgelines are a
  // landscape seen from the side, so a path drawn in the plane would lie.
  if (effect !== 'ridgelines') {
    const trace = createOrbitTrace(overlay, () => view)
    if (trace && !reduced) {
      on(host, 'pointermove', (e) => {
        if (e.pointerType === 'mouse')
          trace.trace(e.clientX, e.clientY, host.getBoundingClientRect())
      })
      on(host, 'pointerleave', () => trace.clear())
      cleanups.push(() => trace.dispose())
    }
  }

  const setup = (): (() => void) | void => {
    if (effect === 'stardust') {
      const dust = createStardust(main, view)
      if (!dust) return
      if (reduced) {
        const still = () => (dust.resize(), dust.still())
        still()
        return still
      }
      loop = () => {
        dust.frame()
        kick()
      }
      on(host, 'pointermove', (e) => dust.push(plane(e)))
      on(host, 'pointerleave', () => dust.push(null))
      kick()
      return () => dust.resize()
    }

    if (effect === 'ridgelines') {
      const ridge = createRidgelines(main, view)
      if (!ridge) return
      let tilt = 0
      let lift = 0.5
      const paint = () => ridge.paint(tilt, lift)
      paint()
      if (!reduced) {
        on(host, 'pointermove', (e) => {
          const r = host.getBoundingClientRect()
          tilt = (e.clientX - r.left) / r.width - 0.5
          lift = (e.clientY - r.top) / r.height
          requestAnimationFrame(paint)
        })
      }
      return paint
    }

    const glr = forceCpu ? null : createEffectGl(main)
    if (!glr) {
      // The floor: the plain set, still. The effect is a GPU nicety, the set is not.
      const still = () =>
        renderJulia(main, {
          re: view.re,
          im: view.im,
          span: view.span,
          centerX: view.cx,
          centerY: view.cy,
          angle: view.angle,
        })
      still()
      return still
    }
    cleanups.push(() => glr.dispose())

    const state: EffectState = { mode: GL_MODE[effect] ?? 'plain', maxIter: MAX_ITER }
    let queued = 0
    const paint = () => glr.render(view, state)
    const request = () => {
      if (!queued)
        queued = requestAnimationFrame(() => {
          queued = 0
          paint()
        })
    }
    cleanups.push(() => cancelAnimationFrame(queued))

    if (effect === 'relief') {
      // the lamp starts up and to the left, where a reader expects light
      const r = host.getBoundingClientRect()
      state.p = toPlane(r.left + r.width * 0.12, r.top + r.height * 0.08, r, view)
      if (!reduced) on(host, 'pointermove', (e) => ((state.p = plane(e)), request()))
    }

    if (effect === 'field-lines' || effect === 'orbit-traps') {
      state.p = effect === 'orbit-traps' ? [0, 0] : [9, 9]
      if (!reduced) on(host, 'pointermove', (e) => ((state.p = plane(e)), request()))
      if (effect === 'field-lines') on(host, 'pointerleave', () => ((state.p = [9, 9]), request()))
    }

    if (effect === 'ripple' && !reduced) {
      let t0 = -1
      const ripple = () => {
        t0 = performance.now()
        loop = () => {
          const k = Math.min(1, (performance.now() - t0) / RIPPLE_MS)
          state.ripple = k < 1 ? MAX_ITER * 0.42 * (1 - easeOut(k)) : -2
          paint()
          if (k < 1) kick()
        }
        kick()
      }
      on(host, 'pointerdown', ripple)
      // one wave on arrival, so the plate says what it does before it is asked
      const first = window.setTimeout(ripple, 500)
      cleanups.push(() => window.clearTimeout(first))
    }

    if (effect === 'cursor' && !reduced) {
      on(host, 'pointermove', (e) => {
        const r = host.getBoundingClientRect()
        view.re = base.re + ((e.clientX - r.left) / r.width - 0.5) * 0.09
        view.im = base.im + ((e.clientY - r.top) / r.height - 0.5) * 0.07
        request()
      })
      on(host, 'pointerleave', () => {
        view.re = base.re
        view.im = base.im
        request()
      })
    }

    if (effect === 'heartbeat') {
      // The rings only exist inside the set. A constant with no visible
      // cycle is moved just inside the cardioid, beside where it was.
      let cycle = attractingCycle(view.re, view.im)
      if (!cycle) {
        const c = cardioidEdge(nearestEdgeTheta(view), 0.92)
        view.re = c.re
        view.im = c.im
        cycle = attractingCycle(view.re, view.im)
      }
      state.cycle = cycle
      if (!reduced) {
        loop = () => {
          state.t = performance.now() / 1000
          paint()
          kick()
        }
        kick()
      }
    }

    if (effect === 'scroll-dive' && !reduced) {
      const aim = diveAim(view.re, view.im)
      let depth = 0
      let target = 0
      const apply = () => {
        view.span = base.span * Math.pow(0.0004, depth)
        const pull = Math.min(1, depth * 3)
        view.off = [aim[0] * pull, aim[1] * pull]
        // deeper means more iterations, or the boundary reads as solid inside
        state.maxIter = Math.min(400, MAX_ITER + 300 * depth)
        // centre the aim, not the set, once the dive is under way
        view.cx = base.cx + (0.5 - base.cx) * pull
        view.cy = base.cy + (0.5 - base.cy) * pull
      }
      loop = () => {
        depth += (target - depth) * 0.12
        // it lets go on its own, so nobody is left stuck at the bottom
        target *= 0.985
        apply()
        paint()
        if (Math.abs(target - depth) > 1e-4 || depth > 1e-3) kick()
      }
      on(
        host,
        'wheel',
        (e) => {
          // At either end the wheel goes back to the page, so the plate never
          // traps someone who only meant to scroll past it.
          if ((e.deltaY > 0 && target >= 1) || (e.deltaY < 0 && target <= 0)) return
          e.preventDefault()
          target = Math.max(0, Math.min(1, target + e.deltaY * 0.0012))
          kick()
        },
        { passive: false },
      )
      let hold = 0
      on(host, 'pointerdown', () => {
        window.clearInterval(hold)
        hold = window.setInterval(() => {
          target = Math.min(1, target + 0.02)
          kick()
        }, 30)
      })
      const release = () => window.clearInterval(hold)
      on(window, 'pointerup', release)
      on(window, 'pointercancel', release)
      cleanups.push(release)
    }

    paint()
    return request
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      if (visible && !started) {
        started = true
        const repaint = setup()
        if (repaint) {
          const ro = new ResizeObserver(() => repaint())
          ro.observe(host)
          cleanups.push(() => ro.disconnect())
        }
      }
      kick()
    },
    { threshold: 0.15 },
  )
  io.observe(host)

  return () => {
    io.disconnect()
    cancelAnimationFrame(raf)
    loop = null
    for (const fn of cleanups.reverse()) fn()
  }
}
