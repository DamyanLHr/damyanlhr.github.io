import { createStardust } from '../stardust'
import { planeAt, type LayerFactory } from './layer'

// Stardust as a layer: the inverse-iteration dust from ../stardust.ts, with
// the pointer scattering it and a tap scattering it harder.

export const dust: LayerFactory = (canvas, view) => {
  const d = createStardust(canvas, view)
  if (!d) return null
  let pushUntil = 0
  return {
    frame(t) {
      if (pushUntil && t > pushUntil) {
        d.push(null)
        pushUntil = 0
      }
      d.frame()
      return true
    },
    still() {
      d.resize()
      d.still()
    },
    point(fx, fy) {
      d.push(planeAt(canvas, view, fx, fy))
    },
    press(fx, fy) {
      d.push(planeAt(canvas, view, fx, fy))
      pushUntil = performance.now() + 400
    },
    leave() {
      d.push(null)
    },
    resize: d.resize,
  }
}
