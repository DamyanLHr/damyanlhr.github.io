import { toPlane, type PlaneView } from '../view'

// The effects that are not a mode of the band's shader draw on a 2D canvas
// of their own: the layer laid over the band, or a card's canvas. They all
// share this shape, so the controller can run any of them on either.

export interface Layer {
  /** Advance and draw one frame. False when nothing will change until input. */
  frame: (t: number, dt: number) => boolean
  /** A resting picture, for reduced motion and for card stills. */
  still: () => void
  /** The pointer over the layer, as fractions of it (0..1). */
  point?: (fx: number, fy: number) => void
  leave?: () => void
  /** A click, a tap, or Enter. */
  press?: (fx: number, fy: number) => void
  resize: () => void
  dispose?: () => void
}

export interface LayerOptions {
  /** nobody's hand on it: play itself (a live card) */
  autopilot: boolean
}

export type LayerFactory = (
  canvas: HTMLCanvasElement,
  view: PlaneView,
  opts: LayerOptions,
) => Layer | null

/** Sizes the canvas to its box (capped, for the CPU's sake) and returns its pixels. */
export function fitCanvas(canvas: HTMLCanvasElement, cap = 900, dprCap = 1.5): [number, number] {
  const d = Math.min(window.devicePixelRatio || 1, dprCap)
  const cw = Math.max(1, canvas.clientWidth)
  const ch = Math.max(1, canvas.clientHeight)
  const scale = Math.min(d, cap / cw)
  const w = Math.max(2, Math.round(cw * scale))
  const h = Math.max(2, Math.round(ch * scale))
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  return [w, h]
}

/** The point of the plane under a fraction of the canvas. */
export function planeAt(canvas: HTMLCanvasElement, v: PlaneView, fx: number, fy: number) {
  const w = Math.max(1, canvas.clientWidth)
  const h = Math.max(1, canvas.clientHeight)
  return toPlane(fx * w, fy * h, { left: 0, top: 0, width: w, height: h }, v)
}

/** Fades an RGBA image toward the page's ground colour, for trails. */
export function fadeToGround(data: Uint8ClampedArray, k: number) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 10 + (data[i] - 10) * k
    data[i + 1] = 11 + (data[i + 1] - 11) * k
    data[i + 2] = 13 + (data[i + 2] - 13) * k
    data[i + 3] = 255
  }
}
