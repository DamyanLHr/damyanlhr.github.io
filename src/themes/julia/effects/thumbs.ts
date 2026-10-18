import { renderJulia } from '../fractal'
import { createEffectGl, type EffectGl, type EffectState } from './effects-gl'
import type { EffectSurface } from './controller'
import type { PlaneView } from './view'

// The project cards' renderer. Nine cards with nine WebGL contexts would hit
// the browser's limit and waste memory, so every card is drawn by one shared
// offscreen context and copied into the card's own 2D canvas. Only one card is
// ever live at a time, so one context is plenty.

// The simulations (pendulum, life, coral) run in the same context, so the
// whole site holds at most two: the stage's and this one.

let shared: { canvas: HTMLCanvasElement; gl: EffectGl | null } | null = null

export function sharedGl() {
  if (!shared) {
    const canvas = document.createElement('canvas')
    const forceCpu = new URLSearchParams(window.location.search).has('cpufractal')
    shared = {
      canvas,
      gl: forceCpu ? null : createEffectGl(canvas, { preserve: true, parallel: true }),
    }
  }
  return shared
}

/**
 * Creates the shared context ahead of need, so its shader compiles while the
 * visitor is still reading the page they are on rather than in the first
 * frames of the projects page.
 */
export function warmShared() {
  const { gl } = sharedGl()
  gl?.ready()
}

/** The shared context itself, for the simulations; null without WebGL. */
export function sharedContext(): WebGL2RenderingContext | null {
  const s = sharedGl()
  return s.gl ? s.canvas.getContext('webgl2') : null
}

/**
 * Copies the frame just drawn (w by h, in the bottom-left corner of the shared
 * canvas, which only ever grows) into a target canvas of the same size.
 */
export function copyTo(target: HTMLCanvasElement, w: number, h: number) {
  const { canvas } = sharedGl()
  const ctx = target.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(canvas, 0, canvas.height - h, w, h, 0, 0, target.width, target.height)
}

/** A card as an effect surface: the effect is drawn into `canvas`, framed by `base`. */
export function cardSurface(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  base: PlaneView,
  live: boolean,
): EffectSurface {
  const { gl } = sharedGl()
  let fx: EffectState | null = null
  const lens = { spanMul: 1, off: [0, 0] as [number, number], bend: [0, 0] as [number, number] }
  let queued = 0

  const view = (): PlaneView => ({
    ...base,
    re: base.re + lens.bend[0],
    im: base.im + lens.bend[1],
    span: base.span * lens.spanMul,
    off: lens.off,
  })

  const render = () => {
    queued = 0
    const v = view()
    if (!gl) {
      renderJulia(canvas, {
        re: v.re,
        im: v.im,
        span: v.span,
        centerX: v.cx,
        centerY: v.cy,
        angle: v.angle,
      })
      return
    }
    const d = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(2, Math.round(canvas.clientWidth * d))
    const height = Math.max(2, Math.round(canvas.clientHeight * d))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    // still compiling: keep what the card shows and try again next frame
    if (!gl.render(v, fx ?? { mode: 'plain' }, { width, height })) {
      request()
      return
    }
    copyTo(canvas, width, height)
  }
  const request = () => {
    if (!queued) queued = requestAnimationFrame(render)
  }

  return {
    host,
    view,
    box: () => canvas.getBoundingClientRect(),
    gl: gl !== null,
    live,
    develop(state) {
      fx = state ? { ...state, amount: 1 } : null
      request()
    },
    setState(state) {
      fx = { ...(fx ?? { mode: 'plain' }), ...state }
      request()
    },
    setLens(next) {
      if (next.spanMul !== undefined) lens.spanMul = next.spanMul
      if (next.off) lens.off = next.off
      if (next.bend) lens.bend = next.bend
      request()
    },
    layer: () => ({ canvas, view: view() }),
    showLayer: () => {},
    trace: null,
  }
}
