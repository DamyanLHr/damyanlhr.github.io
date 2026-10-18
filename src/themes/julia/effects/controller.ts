import type { PlateEffect } from '../../../content/types'
import { easeOut } from '../travel'
import type { EffectState, GlMode } from './effects-gl'
import type { OrbitTrace } from './orbit-trace'
import { createRidgelines } from './ridgelines'
import { createStardust } from './stardust'
import { attractingCycle, diveAim, toPlane, type PlaneView } from './view'

// One project effect, running on a surface. The surface is either the band
// on a project page (drawn by the stage, so the set you followed there is the
// one that develops) or a project card (drawn by the shared card renderer).
// The controller owns what the effect does: its input, its animation, and
// pausing when nobody can see it.
//
// Input is the same for mouse and touch where it can be. On touch the band
// only takes taps and sideways drags (touch-action: pan-y), so an up or down
// swipe still scrolls the page: a tap places or triggers, a sideways drag
// plays. The dive is a press and hold, or a pinch.

export interface EffectSurface {
  /** takes the input, and is the area the effect fills */
  host: HTMLElement
  /** the plane as drawn now, mapped over `box()` */
  view: () => PlaneView | null
  box: () => DOMRect
  /** whether the GL effects can run here; otherwise they show the plain set */
  gl: boolean
  /** motion allowed: loops, autopilot and developing animate */
  live: boolean
  develop: (state: EffectState | null) => void
  setState: (state: Partial<EffectState>) => void
  setLens: (lens: { spanMul?: number; off?: [number, number]; bend?: [number, number] }) => void
  /** a 2D canvas over the host for stardust and ridgelines, with the plane in its own pixels */
  layer: () => { canvas: HTMLCanvasElement; view: PlaneView } | null
  showLayer: (on: boolean) => void
  trace: OrbitTrace | null
}

export interface EffectOptions {
  /** take pointer and touch input (the band); cards are links, so they do not */
  input: boolean
  /** with no hand on it, the effect plays itself (a live card) */
  autopilot: boolean
  /** a wave on arrival, so the band says what it does before it is asked */
  greet?: boolean
  /** the wheel dives (the band); over a card it stays the page's scroll */
  wheel?: boolean
}

const GL_MODE: Partial<Record<PlateEffect, GlMode>> = {
  relief: 'relief',
  ripple: 'ripple',
  cursor: 'plain',
  'field-lines': 'field',
  'orbit-traps': 'traps',
  'scroll-dive': 'plain',
  heartbeat: 'heartbeat',
}

const RIPPLE_MS = 1600
const MAX_ITER = 170
const TAP_PX = 8
const TAP_MS = 300
const HOLD_MS = 260

interface Handlers {
  /** the point under a hovering mouse or a sideways-dragging finger */
  move?: (x: number, y: number) => void
  /** a click (mouse down) or a tap */
  press?: (x: number, y: number) => void
  /** a held button or finger: dive in while held */
  hold?: (on: boolean) => void
  /** two fingers: the ratio of their spread to where it started */
  pinch?: (ratio: number) => void
  leave?: () => void
}

/** Mouse and touch, folded into the few gestures the effects understand. */
function bindInput(host: HTMLElement, h: Handlers): () => void {
  const touches = new Map<number, { x0: number; y0: number; x: number; y: number; t0: number }>()
  let dragging = false
  let holdTimer = 0
  let holding = false
  let pinch0 = 0

  const spread = () => {
    const [a, b] = [...touches.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
  const stopHold = () => {
    window.clearTimeout(holdTimer)
    if (holding) h.hold?.(false)
    holding = false
  }

  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      h.press?.(e.clientX, e.clientY)
      holding = true
      h.hold?.(true)
      return
    }
    touches.set(e.pointerId, {
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      y: e.clientY,
      t0: e.timeStamp,
    })
    if (touches.size === 2) {
      stopHold()
      pinch0 = spread()
    } else {
      dragging = false
      holdTimer = window.setTimeout(() => {
        holding = true
        h.hold?.(true)
      }, HOLD_MS)
    }
  }
  const move = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      h.move?.(e.clientX, e.clientY)
      return
    }
    const t = touches.get(e.pointerId)
    if (!t) return
    t.x = e.clientX
    t.y = e.clientY
    if (touches.size === 2 && pinch0 > 0) {
      h.pinch?.(spread() / pinch0)
      return
    }
    const dx = t.x - t.x0
    const dy = t.y - t.y0
    if (!dragging && Math.hypot(dx, dy) > TAP_PX) {
      // Sideways is play. Up and down belongs to the page, which takes the
      // gesture itself (pan-y) and cancels this pointer.
      dragging = Math.abs(dx) > Math.abs(dy)
      stopHold()
    }
    if (dragging) h.move?.(t.x, t.y)
  }
  const up = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      stopHold()
      return
    }
    const t = touches.get(e.pointerId)
    touches.delete(e.pointerId)
    if (touches.size < 2) pinch0 = 0
    const wasHolding = holding
    stopHold()
    if (!t || e.type === 'pointercancel') return
    const tap =
      !dragging &&
      !wasHolding &&
      Math.hypot(t.x - t.x0, t.y - t.y0) <= TAP_PX &&
      e.timeStamp - t.t0 < TAP_MS
    if (tap) {
      h.move?.(t.x, t.y)
      h.press?.(t.x, t.y)
    }
  }
  const leave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      stopHold()
      h.leave?.()
    }
  }

  host.addEventListener('pointerdown', down)
  host.addEventListener('pointermove', move)
  host.addEventListener('pointerup', up)
  host.addEventListener('pointercancel', up)
  host.addEventListener('pointerleave', leave)
  window.addEventListener('pointerup', stopHold)
  return () => {
    stopHold()
    host.removeEventListener('pointerdown', down)
    host.removeEventListener('pointermove', move)
    host.removeEventListener('pointerup', up)
    host.removeEventListener('pointercancel', up)
    host.removeEventListener('pointerleave', leave)
    window.removeEventListener('pointerup', stopHold)
  }
}

/** Starts the effect on the surface; returns its teardown. */
export function attachEffect(
  effect: PlateEffect,
  s: EffectSurface,
  opts: EffectOptions,
): () => void {
  const cleanups: (() => void)[] = []
  const handlers: Handlers = {}
  const plane = (x: number, y: number): [number, number] | null => {
    const v = s.view()
    return v ? toPlane(x, y, s.box(), v) : null
  }
  /** a point of the host, as fractions of it, in the plane */
  const at = (fx: number, fy: number) => {
    const r = s.host.getBoundingClientRect()
    return plane(r.left + r.width * fx, r.top + r.height * fy)
  }

  // ---- the frame loop: runs while the surface is visible and something moves
  let visible = false
  let raf = 0
  let tick: ((t: number) => boolean) | null = null
  const frame = (t: number) => {
    raf = 0
    if (!visible || !tick) return
    if (tick(t)) raf = requestAnimationFrame(frame)
  }
  // Under reduced motion nothing animates on its own or eases; input that
  // places something (a lamp, a trap) still answers, as a still.
  const kick = () => {
    if (!raf && visible && tick && s.live) raf = requestAnimationFrame(frame)
  }
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    kick()
  })
  io.observe(s.host)
  cleanups.push(
    () => io.disconnect(),
    () => cancelAnimationFrame(raf),
  )

  // ---- the orbit trace: heartbeat only, where the path settling into the
  // cycle is the whole point
  if (effect === 'heartbeat' && s.trace && opts.input) {
    const trace = s.trace
    const box = () => s.box()
    handlers.move = (x, y) => trace.trace(x, y, box())
    handlers.leave = () => trace.clear()
    cleanups.push(() => trace.clear())
  }

  // A slow wander for a card nobody is pointing at.
  const wander = (t: number, phase = 0) =>
    at(0.5 + 0.34 * Math.cos(t * 0.00045 + phase), 0.42 + 0.26 * Math.sin(t * 0.00063 + phase))

  // ---------------------------------------------------------------- 2D effects
  if (effect === 'stardust' || effect === 'ridgelines') {
    const layer = s.layer()
    if (!layer) return () => cleanups.forEach((fn) => fn())
    s.showLayer(true)
    cleanups.push(() => s.showLayer(false))

    if (effect === 'stardust') {
      const dust = createStardust(layer.canvas, layer.view)
      if (dust) {
        let pushUntil = 0
        const layerPlane = (x: number, y: number): [number, number] =>
          toPlane(x, y, layer.canvas.getBoundingClientRect(), layer.view)
        handlers.move = (x, y) => dust.push(layerPlane(x, y))
        handlers.press = (x, y) => {
          dust.push(layerPlane(x, y))
          pushUntil = performance.now() + 400
          kick()
        }
        handlers.leave = () => dust.push(null)
        if (!s.live) dust.still()
        else {
          tick = (t) => {
            if (pushUntil && t > pushUntil) {
              dust.push(null)
              pushUntil = 0
            }
            dust.frame()
            return true
          }
        }
        const ro = new ResizeObserver(() =>
          s.live ? dust.resize() : (dust.resize(), dust.still()),
        )
        ro.observe(layer.canvas)
        cleanups.push(() => ro.disconnect())
      }
    } else {
      const ridge = createRidgelines(layer.canvas, layer.view)
      if (ridge) {
        let tilt = 0
        let lift = 0.5
        let amp = s.live ? 0 : 1
        const t0 = performance.now()
        const r = () => s.host.getBoundingClientRect()
        handlers.move = (x, y) => {
          tilt = (x - r().left) / r().width - 0.5
          lift = Math.min(1, Math.max(0, (y - r().top) / r().height))
          kick()
          if (!s.live) ridge.paint(tilt, lift, amp)
        }
        let rising = s.live
        tick = (t) => {
          // develop: the plane lifts into terrain
          if (rising) {
            amp = easeOut(Math.min(1, (t - t0) / 900))
            rising = amp < 1
          }
          if (opts.autopilot) tilt = 0.4 * Math.sin(t * 0.0006)
          ridge.paint(tilt, lift, amp)
          return rising || opts.autopilot
        }
        ridge.paint(tilt, lift, amp)
        const ro = new ResizeObserver(() => ridge.paint(tilt, lift, amp))
        ro.observe(layer.canvas)
        cleanups.push(() => ro.disconnect())
      }
    }
    if (opts.input) cleanups.push(bindInput(s.host, handlers))
    kick()
    return () => cleanups.reverse().forEach((fn) => fn())
  }

  // ---------------------------------------------------------------- GL effects
  const state: EffectState = { mode: GL_MODE[effect] ?? 'plain', maxIter: MAX_ITER }
  const v0 = s.view()
  if (!v0) return () => cleanups.forEach((fn) => fn())

  if (effect === 'relief') {
    // the lamp starts up and to the left, where a reader expects light
    state.p = at(0.14, 0.1) ?? [-1, -1]
    handlers.move = (x, y) => {
      const p = plane(x, y)
      if (p) s.setState({ p })
    }
  }

  if (effect === 'field-lines' || effect === 'orbit-traps') {
    state.p = effect === 'orbit-traps' ? [0, 0] : [9, 9]
    handlers.move = (x, y) => {
      const p = plane(x, y)
      if (p) s.setState({ p })
    }
    if (effect === 'field-lines') handlers.leave = () => s.setState({ p: [9, 9] })
  }

  if (effect === 'heartbeat') {
    state.cycle = attractingCycle(v0.re, v0.im)
    state.t = 0
  }

  if (effect === 'cursor') {
    handlers.move = (x, y) => {
      const r = s.host.getBoundingClientRect()
      s.setLens({
        bend: [((x - r.left) / r.width - 0.5) * 0.09, ((y - r.top) / r.height - 0.5) * 0.07],
      })
    }
    handlers.leave = () => s.setLens({ bend: [0, 0] })
    cleanups.push(() => s.setLens({ bend: [0, 0] }))
  }

  // ripple
  let rippleT0 = -1
  const ripple = () => {
    rippleT0 = performance.now()
    kick()
  }
  if (effect === 'ripple') {
    handlers.press = ripple
    if (opts.greet && s.live) {
      const first = window.setTimeout(ripple, 900)
      cleanups.push(() => window.clearTimeout(first))
    }
  }

  // scroll dive
  let depth = 0
  let target = 0
  let held = false
  let pinchFrom = 0
  const aim = effect === 'scroll-dive' ? diveAim(v0.re, v0.im) : ([0, 0] as [number, number])
  if (effect === 'scroll-dive') {
    handlers.hold = (on) => {
      held = on
      kick()
    }
    handlers.pinch = (ratio) => {
      if (!pinchFrom) pinchFrom = target
      target = Math.max(0, Math.min(1, pinchFrom + Math.log(ratio) * 0.5))
      kick()
    }
    if (opts.input && opts.wheel) {
      const wheel = (e: WheelEvent) => {
        // At either end the wheel goes back to the page, so the band never
        // traps someone who only meant to scroll past it.
        if ((e.deltaY > 0 && target >= 1) || (e.deltaY < 0 && target <= 0)) return
        e.preventDefault()
        target = Math.max(0, Math.min(1, target + e.deltaY * 0.0012))
        kick()
      }
      s.host.addEventListener('wheel', wheel, { passive: false })
      const endPinch = () => (pinchFrom = 0)
      s.host.addEventListener('pointerup', endPinch)
      cleanups.push(() => {
        s.host.removeEventListener('wheel', wheel)
        s.host.removeEventListener('pointerup', endPinch)
      })
    }
    cleanups.push(() => s.setLens({ spanMul: 1, off: [0, 0] }))
  }

  tick = (t) => {
    let more = false
    if (effect === 'heartbeat') {
      s.setState({ t: t / 1000 })
      more = true
    }
    if (effect === 'ripple') {
      if (opts.autopilot && (rippleT0 < 0 || t - rippleT0 > 2600)) rippleT0 = t
      if (rippleT0 >= 0) {
        const k = Math.min(1, (t - rippleT0) / RIPPLE_MS)
        s.setState({ ripple: k < 1 ? MAX_ITER * 0.42 * (1 - easeOut(k)) : -2 })
        if (k < 1) more = true
        else rippleT0 = -1
      }
      more ||= opts.autopilot
    }
    if (effect === 'scroll-dive') {
      if (held) target = Math.min(1, target + 0.012)
      if (opts.autopilot) target = 0.3 + 0.3 * Math.sin(t * 0.0004 - Math.PI / 2)
      depth += (target - depth) * 0.12
      // it lets go on its own, so nobody is left stuck at the bottom
      if (!held && !pinchFrom && !opts.autopilot) target *= 0.985
      const pull = Math.min(1, depth * 3)
      s.setLens({ spanMul: Math.pow(0.0004, depth), off: [aim[0] * pull, aim[1] * pull] })
      s.setState({ maxIter: Math.min(400, MAX_ITER + 300 * depth) })
      more = held || opts.autopilot || Math.abs(target - depth) > 1e-4 || depth > 1e-3
    }
    if (
      opts.autopilot &&
      (effect === 'relief' || effect === 'field-lines' || effect === 'orbit-traps')
    ) {
      const p = wander(t)
      if (p) s.setState({ p })
      more = true
    }
    if (opts.autopilot && effect === 'cursor') {
      s.setLens({ bend: [0.035 * Math.cos(t * 0.0005), 0.03 * Math.sin(t * 0.0007)] })
      more = true
    }
    return more
  }

  s.develop(state)
  cleanups.push(() => s.develop(null))
  if (opts.input) cleanups.push(bindInput(s.host, handlers))
  if (s.live) kick()
  return () => cleanups.reverse().forEach((fn) => fn())
}
