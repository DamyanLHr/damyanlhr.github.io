import type { PlateEffect } from '../../../content/types'
import { easeOut } from '../travel'
import type { EffectState } from './effects-gl'
import type { OrbitTrace } from './orbit-trace'
import { EFFECT_INFO } from './registry'
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
//
// The band also plays from the keyboard: Tab to it, then the arrows move the
// point (lamp, trap, hawk, dial), Enter or Space presses, + and - dive, and
// Escape lets go.

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
  /** a card: how it starts (see EffectHandle.setMode) */
  mode?: CardMode
}

/**
 * A card at rest shows a still; under the mouse it answers the pointer; the
 * phone's centred card plays itself.
 */
export type CardMode = 'still' | 'pointer' | 'auto'

export interface EffectHandle {
  detach: () => void
  /**
   * Switch a card between still, pointer and autopilot on the same running
   * effect: nothing is rebuilt, so a flock keeps flying where it was and a
   * card that goes back to rest keeps its last frame.
   */
  setMode: (mode: CardMode) => void
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
  /** the keyboard's dive: + or - */
  zoom?: (step: number) => void
  leave?: () => void
}

const KEY_STEP = 0.05

/**
 * Mouse and touch, folded into the few gestures the effects understand, and
 * the keyboard when `keys` (the band; a card is a link, and its Enter opens it).
 */
function bindInput(host: HTMLElement, h: Handlers, keys = true): () => void {
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

  // The keyboard drives a point of its own, as a fraction of the host, and
  // turns it into the same calls a pointer would make.
  const key = [0.5, 0.5]
  const keyAt = () => {
    const r = host.getBoundingClientRect()
    return [r.left + key[0] * r.width, r.top + key[1] * r.height] as const
  }
  const keydown = (e: KeyboardEvent) => {
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const a = arrows[e.key]
    if (a) {
      key[0] = Math.min(0.98, Math.max(0.02, key[0] + a[0] * KEY_STEP))
      key[1] = Math.min(0.98, Math.max(0.02, key[1] + a[1] * KEY_STEP))
      h.move?.(...keyAt())
    } else if (e.key === 'Enter' || e.key === ' ') {
      h.move?.(...keyAt())
      h.press?.(...keyAt())
    } else if (e.key === '+' || e.key === '=') h.zoom?.(1)
    else if (e.key === '-' || e.key === '_') h.zoom?.(-1)
    else if (e.key === 'Escape') {
      h.leave?.()
      host.blur()
    } else return
    e.preventDefault()
  }

  host.addEventListener('pointerdown', down)
  host.addEventListener('pointermove', move)
  host.addEventListener('pointerup', up)
  host.addEventListener('pointercancel', up)
  host.addEventListener('pointerleave', leave)
  if (keys) host.addEventListener('keydown', keydown)
  window.addEventListener('pointerup', stopHold)
  return () => {
    stopHold()
    host.removeEventListener('keydown', keydown)
    host.removeEventListener('pointerdown', down)
    host.removeEventListener('pointermove', move)
    host.removeEventListener('pointerup', up)
    host.removeEventListener('pointercancel', up)
    host.removeEventListener('pointerleave', leave)
    window.removeEventListener('pointerup', stopHold)
  }
}

/** Starts the effect on the surface. */
export function attachEffect(
  effect: PlateEffect,
  s: EffectSurface,
  opts: EffectOptions,
): EffectHandle {
  const cleanups: (() => void)[] = []
  const handlers: Handlers = {}
  // a card's mode; the band always plays, steered by hand
  let autopilot = opts.mode ? opts.mode === 'auto' : opts.autopilot
  let playing = opts.mode !== 'still'
  let pointer: (() => void) | null = null
  let onMode: (() => void) | null = null
  const handle: EffectHandle = {
    detach: () => cleanups.reverse().forEach((fn) => fn()),
    setMode(mode) {
      autopilot = mode === 'auto'
      playing = mode !== 'still'
      onMode?.()
      if (mode === 'pointer') pointer ??= bindInput(s.host, handlers, false)
      else if (pointer) {
        pointer()
        pointer = null
        handlers.leave?.()
      }
      if (!playing) {
        cancelAnimationFrame(raf)
        raf = 0
        lastT = 0
      } else kick()
    },
  }
  cleanups.push(() => pointer?.())
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
  let lastT = 0
  // dt in seconds: everything that moves is paced by it, not by frames, so a
  // 120Hz display does not play the effects twice as fast
  let tick: ((t: number, dt: number) => boolean) | null = null
  const frame = (t: number) => {
    raf = 0
    if (!visible || !tick) {
      lastT = 0
      return
    }
    const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 1 / 60
    lastT = t
    if (tick(t, dt)) raf = requestAnimationFrame(frame)
    else lastT = 0
  }
  // Under reduced motion nothing animates on its own or eases; input that
  // places something (a lamp, a trap) still answers, as a still.
  const kick = () => {
    if (!raf && visible && tick && s.live && playing) raf = requestAnimationFrame(frame)
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
    // with motion reduced the path appears whole instead of being drawn out
    handlers.move = (x, y) => trace.trace(x, y, box(), !s.live)
    handlers.leave = () => trace.clear()
    cleanups.push(() => trace.clear())
  }

  // A slow wander for a card nobody is pointing at.
  const wander = (t: number, phase = 0) =>
    at(0.5 + 0.34 * Math.cos(t * 0.00045 + phase), 0.42 + 0.26 * Math.sin(t * 0.00063 + phase))

  const info = EFFECT_INFO[effect]

  // The band takes the keyboard: it becomes a stop in the tab order, named
  // for what it is and how to play it.
  if (opts.input) {
    const host = s.host
    const before = { tab: host.getAttribute('tabindex'), label: host.getAttribute('aria-label') }
    host.tabIndex = 0
    host.setAttribute('role', 'application')
    host.setAttribute(
      'aria-label',
      `${info.name}. Arrow keys move, Enter acts, plus and minus dive.`,
    )
    cleanups.push(() => {
      if (before.tab === null) host.removeAttribute('tabindex')
      host.removeAttribute('role')
      if (before.label === null) host.removeAttribute('aria-label')
      else host.setAttribute('aria-label', before.label)
    })
  }

  // ---------------------------------------------------------------- layers
  if (info.kind === 'layer' && info.layer) {
    const slot = s.layer()
    if (!slot) return handle
    const layerOpts = { autopilot }
    onMode = () => (layerOpts.autopilot = autopilot)
    const layer = info.layer(slot.canvas, slot.view, layerOpts)
    if (!layer) return handle
    s.showLayer(true)
    cleanups.push(
      () => s.showLayer(false),
      () => layer.dispose?.(),
    )
    const frac = (x: number, y: number): [number, number] => {
      const r = slot.canvas.getBoundingClientRect()
      return [(x - r.left) / Math.max(1, r.width), (y - r.top) / Math.max(1, r.height)]
    }
    if (s.live) {
      handlers.move = (x, y) => layer.point?.(...frac(x, y))
      handlers.press = (x, y) => layer.press?.(...frac(x, y))
      handlers.leave = () => layer.leave?.()
      tick = (t, dt) => layer.frame(t, dt)
    }
    if (!s.live || !playing) layer.still()
    // A ResizeObserver reports once as soon as it starts observing; only a
    // real change of size is worth redrawing a still for.
    let size = [slot.canvas.clientWidth, slot.canvas.clientHeight]
    const ro = new ResizeObserver(() => {
      const next = [slot.canvas.clientWidth, slot.canvas.clientHeight]
      if (next[0] === size[0] && next[1] === size[1]) return
      size = next
      layer.resize()
      if (!s.live || !playing) layer.still()
    })
    ro.observe(slot.canvas)
    cleanups.push(() => ro.disconnect())
    if (opts.input) cleanups.push(bindInput(s.host, handlers))
    kick()
    return handle
  }

  // ---------------------------------------------------------------- GL effects
  const state: EffectState = { mode: info.mode ?? 'plain', maxIter: MAX_ITER }
  // the five other pictures read the pointer as a dial across the band, and
  // all of them keep moving on their own
  const dial =
    info.mode === 'shape' ||
    info.mode === 'mandjul' ||
    info.mode === 'ship' ||
    info.mode === 'phoenix' ||
    info.mode === 'newton'
  const v0 = s.view()
  if (!v0) return handle

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

  if (dial) {
    state.q = [0, 0]
    state.t = 0
    handlers.move = (x, y) => {
      const r = s.host.getBoundingClientRect()
      const q: [number, number] = [
        ((x - r.left) / r.width) * 2 - 1,
        ((y - r.top) / r.height) * 2 - 1,
      ]
      // Newton's first root goes where the pointer is, in the plane
      if (info.mode === 'newton') s.setState({ q, p: plane(x, y) ?? [9, 9] })
      else s.setState({ q })
    }
    handlers.leave = () => s.setState({ q: [0, 0], p: [9, 9] })
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
  // Under reduced motion the dive cannot move, so it takes no input at all:
  // a wheel it swallowed would only stop the page scrolling.
  if (effect === 'scroll-dive' && s.live) {
    handlers.hold = (on) => {
      held = on
      kick()
    }
    handlers.pinch = (ratio) => {
      if (!pinchFrom) pinchFrom = target
      target = Math.max(0, Math.min(1, pinchFrom + Math.log(ratio) * 0.5))
      kick()
    }
    handlers.zoom = (step) => {
      target = Math.max(0, Math.min(1, target + step * 0.15))
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

  tick = (t, dt) => {
    let more = false
    // the dive's rates are per sixtieth of a second
    const n = dt * 60
    if (dial) {
      s.setState({ t: t / 1000 })
      if (autopilot) s.setState({ q: [0.6 * Math.sin(t * 0.0005), 0.5 * Math.cos(t * 0.0004)] })
      more = true
    }
    if (effect === 'heartbeat') {
      s.setState({ t: t / 1000 })
      more = true
    }
    if (effect === 'ripple') {
      if (autopilot && (rippleT0 < 0 || t - rippleT0 > 2600)) rippleT0 = t
      if (rippleT0 >= 0) {
        const k = Math.min(1, (t - rippleT0) / RIPPLE_MS)
        s.setState({ ripple: k < 1 ? MAX_ITER * 0.42 * (1 - easeOut(k)) : -2 })
        if (k < 1) more = true
        else rippleT0 = -1
      }
      more ||= autopilot
    }
    if (effect === 'scroll-dive') {
      if (held) target = Math.min(1, target + 0.012 * n)
      if (autopilot) target = 0.3 + 0.3 * Math.sin(t * 0.0004 - Math.PI / 2)
      depth += (target - depth) * (1 - Math.pow(1 - 0.12, n))
      // it lets go on its own, so nobody is left stuck at the bottom
      if (!held && !pinchFrom && !autopilot) target *= Math.pow(0.985, n)
      const pull = Math.min(1, depth * 3)
      s.setLens({ spanMul: Math.pow(0.0004, depth), off: [aim[0] * pull, aim[1] * pull] })
      s.setState({ maxIter: Math.min(400, MAX_ITER + 300 * depth) })
      more = held || autopilot || Math.abs(target - depth) > 1e-4 || depth > 1e-3
    }
    if (
      autopilot &&
      (effect === 'relief' || effect === 'field-lines' || effect === 'orbit-traps')
    ) {
      const p = wander(t)
      if (p) s.setState({ p })
      more = true
    }
    if (autopilot && effect === 'cursor') {
      s.setLens({ bend: [0.035 * Math.cos(t * 0.0005), 0.03 * Math.sin(t * 0.0007)] })
      more = true
    }
    return more
  }

  s.develop(state)
  cleanups.push(() => s.develop(null))
  if (opts.input) cleanups.push(bindInput(s.host, handlers))
  kick()
  return handle
}
