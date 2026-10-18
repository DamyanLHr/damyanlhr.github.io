// Julia-set renderer for the julia theme — 2D canvas, no GPU, floor-friendly.
// Direction A "obsidian gallery": ember palette on near-black (Gate 2a).

import type { PlateEffect, Project } from '../../content/types'
import { constantForEffect } from './effects/view'

export interface JuliaParams {
  re: number
  im: number
  /** viewport scale, higher = more zoomed out (default 3.0) */
  span?: number
  maxIter?: number
  /** where the set is centered in the canvas, 0..1 (default 0.5/0.5) */
  centerX?: number
  centerY?: number
  /** rotation of the set in radians (galaxy tilt) */
  angle?: number
}

/** Curated constants that render well — indexed by content seed/slug so every
 * project keeps a stable fractal identity (its art-DNA fallback). */
export const C_POOL: JuliaParams[] = [
  { re: -0.7269, im: 0.1889 },
  { re: -0.8, im: 0.156 },
  { re: 0.285, im: 0.01, span: 2.6 },
  { re: -0.4, im: 0.6 },
  { re: -0.70176, im: -0.3842 },
  { re: -0.835, im: -0.2321 },
  { re: 0.35, im: 0.35, span: 2.6 },
  { re: -0.54, im: 0.54 },
]

export function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * MurmurHash3's finalizer.
 *
 * `hashString` is `h * 31 + c`, which has almost no avalanche: slugs of similar
 * length and shape come out with similar bits, so deriving several independent
 * numbers from one of its results gives several correlated numbers. Running it
 * through this first is what makes the offsets below actually independent.
 */
function mix(x: number): number {
  let h = x | 0
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** How far a slug may pull its constant away from the curated pool entry. */
const SPREAD = 0.045

/**
 * The stable fractal identity for a piece of content.
 *
 * A pool index alone does not give one. Eight constants and a weak hash sent
 * three project slugs to index 6 and two more to index 7, so six of the eight
 * projects rendered as the same two pictures and the mosaic read as duplicates.
 *
 * The pool still picks the neighbourhood, because those constants are curated to
 * render well. Each slug then pulls its own c a little way off that entry and
 * turns it, which changes the shape rather than merely rotating the same one.
 *
 * MUST STAY DETERMINISTIC: a project's identity is derived, never stored, so the
 * same slug has to give the same picture on every device and every build.
 * `fractal.test.ts` holds the roster apart by {@link SPREAD}, so a new project
 * that lands on top of an existing one fails the build rather than shipping as a
 * duplicate card.
 */
export function paramsFor(slug: string, seed?: number): JuliaParams {
  const h = mix(seed ?? hashString(slug))
  const g = mix(h ^ 0x9e3779b9)
  const base = C_POOL[h % C_POOL.length]
  const unit = (x: number) => (x % 4096) / 4096 - 0.5
  return {
    ...base,
    re: base.re + unit(h >>> 8) * SPREAD * 2,
    im: base.im + unit(g) * SPREAD * 2,
    angle: (base.angle ?? 0) + ((g >>> 12) % 360) * (Math.PI / 180),
  }
}

/** Per-route fractal identities: the constant the stage travels to on each page. */
export const ROUTE_C = {
  home: { re: -0.7269, im: 0.1889 },
  cv: { re: -0.8, im: 0.156 },
  // long and spiralled, so it fills the wide band on the projects page
  projects: { re: -0.8, im: 0.18 },
  interests: { re: -0.4, im: 0.6 },
  notFound: { re: -0.835, im: -0.2321 },
} satisfies Record<string, JuliaParams>

/** A project's constant: the one its content names, else the one its slug derives. */
export function projectC(project: Project): JuliaParams {
  if (project.art?.fractal?.type === 'julia' && project.art.fractal.params) {
    const { re, im } = project.art.fractal.params
    if (re !== undefined && im !== undefined) return { re, im }
  }
  return paramsFor(project.slug, project.art?.seed)
}

/** Every plate effect, in the order a slug's hash indexes them. Append only. */
export const EFFECTS: readonly PlateEffect[] = [
  'relief',
  'ripple',
  'cursor',
  'stardust',
  'field-lines',
  'orbit-traps',
  'ridgelines',
  'scroll-dive',
  'heartbeat',
]

/** A project's plate effect: the one its content pins, else one its slug derives. */
export function effectFor(project: Project): PlateEffect {
  return project.art?.effect ?? EFFECTS[mix(hashString(project.slug) ^ 0x51ed27) % EFFECTS.length]
}

/**
 * The constant a project is shown with wherever its effect runs: its band, its
 * card, and the band's preview when its card is pointed at. The same as
 * `projectC`, except where the effect needs a different neighbourhood.
 */
export function effectConstant(project: Project): { re: number; im: number } {
  return constantForEffect(projectC(project), effectFor(project))
}

// Heated ember stops (accent #ff6a00 family)
const EMBER: [number, number, number][] = [
  [10, 11, 13],
  [70, 12, 16],
  [188, 38, 22],
  [255, 106, 0],
  [255, 178, 92],
  [255, 236, 200],
]

function ember(v: number): [number, number, number] {
  const t = Math.min(0.999, Math.max(0, v)) * (EMBER.length - 1)
  const i = Math.floor(t)
  const f = t - i
  const a = EMBER[i]
  const b = EMBER[i + 1]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

/** Renders the set. `quality` scales the internal resolution (1 = crisp, ~0.3 =
 * fast morph frame that the browser upscales — used while animating). */
export function renderJulia(canvas: HTMLCanvasElement, params: JuliaParams, quality = 1): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25) * quality
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return
  const w = (canvas.width = Math.max(2, Math.round(rect.width * dpr)))
  const h = (canvas.height = Math.max(2, Math.round(rect.height * dpr)))
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(w, h)
  const { re, im } = params
  const max = params.maxIter ?? 150
  const scale = (params.span ?? 3.0) / Math.min(w, h)
  const cx = w * (params.centerX ?? 0.5)
  const cy = h * (params.centerY ?? 0.5)
  const cosA = Math.cos(params.angle ?? 0)
  const sinA = Math.sin(params.angle ?? 0)
  let p = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) * scale
      const dy = (y - cy) * scale
      let zr = dx * cosA - dy * sinA
      let zi = dx * sinA + dy * cosA
      let i = 0
      while (i < max && zr * zr + zi * zi < 16) {
        const t = zr * zr - zi * zi + re
        zi = 2 * zr * zi + im
        zr = t
        i++
      }
      let c: [number, number, number]
      if (i === max) {
        // interior: faint ember-tinged depth instead of a flat void
        const v2 = Math.min(4, zr * zr + zi * zi)
        c = [14 + v2 * 9, 8 + v2 * 3, 9 + v2 * 1.5]
      } else {
        c = ember(((i - Math.log2(Math.log2(zr * zr + zi * zi))) / max) * 2.2)
      }
      img.data[p++] = c[0]
      img.data[p++] = c[1]
      img.data[p++] = c[2]
      img.data[p++] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}
