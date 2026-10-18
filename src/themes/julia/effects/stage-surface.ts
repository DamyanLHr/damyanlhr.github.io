import type { Stage } from '../stage'
import type { EffectSurface } from './controller'
import type { OrbitTrace } from './orbit-trace'
import { subView } from './view'

// The band on a project page as an effect surface. The stage draws the GL
// effects itself, over the whole canvas; stardust and ridgelines are drawn on
// a layer canvas the stage host keeps exactly over the band, in the same
// plane, so they line up with the set beneath them.

export function stageSurface(
  stage: Stage,
  band: HTMLElement,
  canvas: HTMLCanvasElement,
  layer: HTMLCanvasElement,
  trace: OrbitTrace | null,
  live: boolean,
): EffectSurface {
  return {
    host: band,
    view: () => stage.view(),
    box: () => canvas.getBoundingClientRect(),
    gl: stage.effects,
    live,
    develop: (state) => stage.setEffect(state),
    setState: (state) => stage.setState(state),
    setLens: (lens) => stage.setLens(lens),
    layer() {
      const v = stage.view()
      if (!v) return null
      const c = canvas.getBoundingClientRect()
      const b = band.getBoundingClientRect()
      const inner = { left: b.left - c.left, top: b.top - c.top, width: b.width, height: b.height }
      Object.assign(layer.style, {
        left: `${inner.left}px`,
        top: `${inner.top}px`,
        width: `${inner.width}px`,
        height: `${inner.height}px`,
      })
      return { canvas: layer, view: subView(v, { width: c.width, height: c.height }, inner) }
    },
    showLayer(on) {
      layer.dataset.on = on ? 'true' : 'false'
      // the plain set beneath steps aside, so it never shows through the
      // layer's faded edges
      const host = layer.parentElement
      if (host) host.dataset.layer = on ? 'on' : 'off'
    },
    trace,
  }
}
