// Pure maths for julia's persistent stage: where the set sits on each page, and
// the road its constant takes between two pages. No DOM here, so all of it is
// tested in travel.test.ts.

export interface Complex {
  re: number
  im: number
}

/** Everything a page decides about the set behind it. */
export interface Pose extends Complex {
  /** where the set's centre sits in the viewport, 0..1 */
  x: number
  y: number
  /** viewport scale, higher = smaller set */
  span: number
  angle: number
  /** 1 = full strength, 0 = gone into the ground colour */
  dim: number
}

export type PoseKind = 'home' | 'cv' | 'projects' | 'project' | 'interests' | 'notFound'

/**
 * The pose for a page. Home is the hero, standing beside the name. The reading
 * pages turn it down and push it off the text column: the CV drifts right, the
 * project index recedes behind the mosaic, and a project page keeps its own
 * constant on the right, under its plate.
 */
export function poseFor(kind: PoseKind, c: Complex, narrow: boolean): Pose {
  const { re, im } = c
  switch (kind) {
    case 'home':
      return narrow
        ? { re, im, x: 0.5, y: 0.3, span: 2.7, angle: -0.7, dim: 1 }
        : { re, im, x: 0.66, y: 0.46, span: 2.25, angle: -0.7, dim: 1 }
    case 'cv':
    case 'interests':
      return narrow
        ? { re, im, x: 0.5, y: 0.2, span: 3.2, angle: -0.35, dim: 0.42 }
        : { re, im, x: 0.84, y: 0.52, span: 2.6, angle: -0.35, dim: 0.42 }
    case 'projects':
      return { re, im, x: 0.5, y: 0.55, span: narrow ? 3 : 2.2, angle: 0.25, dim: 0.3 }
    case 'project':
      return narrow
        ? { re, im, x: 0.5, y: 0.26, span: 3, angle: 0.3, dim: 0.35 }
        : { re, im, x: 0.78, y: 0.5, span: 2.1, angle: 0.3, dim: 0.35 }
    case 'notFound':
      return {
        re,
        im,
        x: 0.5,
        y: narrow ? 0.24 : 0.28,
        span: narrow ? 3.4 : 2.9,
        angle: 0,
        dim: 0.6,
      }
  }
}

/** Just inside the main cardioid's boundary, so every set on the road is connected. */
export const EDGE_R = 0.997

/**
 * A point on the edge of the Mandelbrot set's main cardioid. Straight across,
 * the road would cut through the middle, where every Julia set is a plain blob;
 * outside the edge it breaks into dust. Along the edge, every set on the way is
 * a real, detailed one.
 */
export function cardioidEdge(theta: number, r = EDGE_R): Complex {
  return {
    re: r * (Math.cos(theta) / 2 - Math.cos(2 * theta) / 4),
    im: r * (Math.sin(theta) / 2 - Math.sin(2 * theta) / 4),
  }
}

const STEPS = 1440

/** The angle of the edge point nearest to c, to a quarter of a degree. */
export function nearestEdgeTheta(c: Complex): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < STEPS; i++) {
    const th = -Math.PI + (i / STEPS) * 2 * Math.PI
    const e = cardioidEdge(th)
    const d = Math.hypot(e.re - c.re, e.im - c.im)
    if (d < bestD) {
      bestD = d
      best = th
    }
  }
  return best
}

/** Below this, two constants are neighbours and the road goes straight. */
export const DIRECT = 0.12
/** Share of the trip spent getting onto the edge, and again getting off it. */
const LEG = 0.18

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const lerpC = (a: Complex, b: Complex, k: number): Complex => ({
  re: lerp(a.re, b.re, k),
  im: lerp(a.im, b.im, k),
})

/**
 * The constant at progress k (0..1) of the trip from one page's set to the
 * next. Neighbours go direct. Anything further leaves for the nearest point of
 * the edge, runs along it, and steps off at the point nearest the destination.
 */
export function cPath(from: Complex, to: Complex, k: number): Complex {
  if (k <= 0) return { re: from.re, im: from.im }
  if (k >= 1) return { re: to.re, im: to.im }
  if (Math.hypot(from.re - to.re, from.im - to.im) < DIRECT) return lerpC(from, to, k)
  const t0 = nearestEdgeTheta(from)
  const t1 = nearestEdgeTheta(to)
  if (k < LEG) return lerpC(from, cardioidEdge(t0), k / LEG)
  if (k > 1 - LEG) return lerpC(cardioidEdge(t1), to, (k - (1 - LEG)) / LEG)
  return cardioidEdge(lerp(t0, t1, (k - LEG) / (1 - 2 * LEG)))
}

/** The pose at progress k of a trip. Placement eases straight; the constant takes the road. */
export function travelPose(from: Pose, to: Pose, k: number): Pose {
  return {
    ...cPath(from, to, k),
    x: lerp(from.x, to.x, k),
    y: lerp(from.y, to.y, k),
    span: lerp(from.span, to.span, k),
    angle: lerp(from.angle, to.angle, k),
    dim: lerp(from.dim, to.dim, k),
  }
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
