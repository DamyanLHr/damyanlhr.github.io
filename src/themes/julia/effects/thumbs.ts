import { renderJulia } from '../fractal'
import { createEffectGl, type EffectGl, type EffectState } from './effects-gl'
import type { EffectSurface } from './controller'
import type { PlaneView } from './view'

// The project cards' renderer. Nine cards with nine WebGL contexts would hit
// the browser's limit and waste memory, so every card is drawn by one shared
// offscreen context and copied into the card's own 2D canvas. Only one card is
// ever live at a time, so one context is plenty.

let shared: { canvas: HTMLCanvasElement; gl: EffectGl | null } | null = null

function sharedGl() {
  if (!shared) {
    const canvas = document.createElement('canvas')
    const forceCpu = new URLSearchParams(window.location.search).has('cpufractal')
    shared = { canvas, gl: forceCpu ? null : createEffectGl(canvas, { preserve: true }) }
  }
  return shared
}

/** A card as an effect surface: the effect is drawn into `canvas`, framed by `base`. */
export function cardSurface(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  base: PlaneView,
  live: boolean,
): EffectSurface {
  const { canvas: off, gl } = sharedGl()
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
    if (off.width !== width || off.height !== height) {
      off.width = width
      off.height = height
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    gl.render(v, fx ?? { mode: 'plain' }, { width, height })
    canvas.getContext('2d')?.drawImage(off, 0, 0)
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
