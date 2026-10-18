import type { Complex } from './travel'

// Fitting a set to the box it is shown in. A Julia set is point-symmetric
// about 0, so all a box needs to know is which way the set lies and how far it
// reaches. Both are measured from the set itself, glow included, because the
// glow is part of the picture: a box that cuts it off shows a hard edge where
// the render stops.

export interface SetShape {
  /** direction of the long axis, radians */
  axis: number
  /** half-length along the long axis, and across it */
  along: number
  across: number
}

const GRID = 128
const REACH = 2
/** Points that stay this long are already lit, so they count as the set. */
const LIT = 10
/** Ignore the furthest stray grains, so dust does not shrink the whole set. */
const KEEP = 0.985

const cache = new Map<string, SetShape>()

export function measureSet(c: Complex): SetShape {
  const key = `${c.re.toFixed(5)},${c.im.toFixed(5)}`
  const hit = cache.get(key)
  if (hit) return hit
  const xs: number[] = []
  const ys: number[] = []
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const x0 = ((gx + 0.5) / GRID - 0.5) * 2 * REACH
      const y0 = ((gy + 0.5) / GRID - 0.5) * 2 * REACH
      let x = x0
      let y = y0
      // only "has it lasted LIT steps" matters, so stop there: the measure
      // runs once per card and per page, and this keeps it to a few ms
      let k = 0
      for (; k < LIT && x * x + y * y < 16; k++) {
        const t = x * x - y * y + c.re
        y = 2 * x * y + c.im
        x = t
      }
      if (k >= LIT) {
        xs.push(x0)
        ys.push(y0)
      }
    }
  }
  // Symmetric about 0, so the covariance needs no mean.
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (let i = 0; i < xs.length; i++) {
    sxx += xs[i] * xs[i]
    syy += ys[i] * ys[i]
    sxy += xs[i] * ys[i]
  }
  const axis = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const ca = Math.cos(axis)
  const sa = Math.sin(axis)
  const along: number[] = []
  const across: number[] = []
  for (let i = 0; i < xs.length; i++) {
    along.push(Math.abs(xs[i] * ca + ys[i] * sa))
    across.push(Math.abs(-xs[i] * sa + ys[i] * ca))
  }
  const pct = (a: number[]) => {
    if (a.length === 0) return 1
    a.sort((p, q) => p - q)
    return a[Math.min(a.length - 1, Math.floor(a.length * KEEP))] + (2 * REACH) / GRID
  }
  const shape = { axis, along: pct(along), across: pct(across) }
  cache.set(key, shape)
  return shape
}

export interface Box {
  /** the box, in the pixels of the canvas the set is drawn on */
  left: number
  top: number
  width: number
  height: number
}

export interface Fit {
  /** the set's centre as a fraction of the canvas */
  x: number
  y: number
  span: number
  angle: number
}

/**
 * The placement that shows the whole set, glow and all, as large as `box`
 * allows, with its long axis lying along the box's long side.
 *
 * `fill` is how much of the box the set may take in each direction; the rest
 * is breathing room for the glow to fade out before the edge.
 */
export function fitToBox(
  c: Complex,
  box: Box,
  canvas: { width: number; height: number },
  fill: { x: number; y: number } = { x: 0.9, y: 0.86 },
): Fit {
  return place(measureSet(c), box, canvas, fill)
}

/**
 * The same placement for a picture that is not a Julia set (the Mandelbrot
 * plane, Newton's basins): a box of the plane, centred on 0, with the given
 * half-extents along x and y.
 */
export function fitExtent(
  frame: { along: number; across: number },
  box: Box,
  canvas: { width: number; height: number },
  fill: { x: number; y: number } = { x: 0.9, y: 0.86 },
): Fit {
  return place({ axis: 0, along: frame.along, across: frame.across }, box, canvas, fill)
}

function place(
  shape: SetShape,
  box: Box,
  canvas: { width: number; height: number },
  fill: { x: number; y: number },
): Fit {
  const wide = box.width >= box.height
  // Screen x maps to the plane direction `angle`, so laying the long axis
  // along x means turning by the axis itself; along y, a quarter turn more.
  const angle = wide ? shape.axis : shape.axis - Math.PI / 2
  const spanX = wide ? shape.along : shape.across
  const spanY = wide ? shape.across : shape.along
  const pxPerUnit = Math.min(
    (fill.x * box.width) / (2 * spanX),
    (fill.y * box.height) / (2 * spanY),
  )
  return {
    x: (box.left + box.width / 2) / canvas.width,
    y: (box.top + box.height / 2) / canvas.height,
    span: Math.min(canvas.width, canvas.height) / pxPerUnit,
    angle,
  }
}
