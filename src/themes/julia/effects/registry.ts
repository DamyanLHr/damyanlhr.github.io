import type { PlateEffect } from '../../../content/types'
import type { GlMode } from './effects-gl'
import { attractor } from './layers/attractor'
import { braid } from './layers/braid'
import { buddha } from './layers/buddha'
import { dust } from './layers/dust'
import type { LayerFactory } from './layers/layer'
import { murmuration } from './layers/murmuration'
import { roots } from './layers/roots'
import { coral, life, pendulum } from './layers/sims'
import { terrain } from './layers/terrain'

// Every effect the julia theme can play, in one place: the project bands, the
// cards, and the gallery all read this. An effect is either a mode of the
// band's own shader, developed out of the Julia set in place, or a layer drawn
// on a canvas laid over the band.

export interface EffectInfo {
  id: PlateEffect
  name: string
  /** one sentence on what you are looking at, for the gallery */
  blurb: string
  /** how to play it, for a pointer and for a finger */
  pointer: string
  touch: string
  kind: 'mode' | 'layer'
  mode?: GlMode
  layer?: LayerFactory
  /** the swaptube source it follows, when it follows one */
  credit?: string
  /**
   * For pictures that are not the Julia set of the constant (the Mandelbrot
   * plane, Newton's basins): the half-extents of the plane to frame, so the
   * band fits that box instead of measuring a set.
   */
  frame?: { along: number; across: number }
  /** the constant the gallery shows it with */
  constant: { re: number; im: number }
}

const info = (e: EffectInfo) => e

export const EFFECT_INFO: Record<PlateEffect, EffectInfo> = {
  // ---------------------------------------------------------------- new
  'root-bloom': info({
    id: 'root-bloom',
    name: 'Root bloom',
    blurb:
      'Every polynomial whose coefficients are one of two numbers, and all of their roots at once. As the second number circles, the lace breathes and tears open.',
    pointer: 'Move sideways to turn the second coefficient. Click to jump it.',
    touch: 'Drag sideways to turn the second coefficient. Tap to jump it.',
    kind: 'layer',
    layer: roots,
    credit: 'src/CUDA/root_fractal.cu',
    constant: { re: -0.8, im: 0.18 },
  }),
  'quintic-braid': info({
    id: 'quintic-braid',
    name: 'Quintic braid',
    blurb:
      'The five roots of z⁵ − z − c as c loops around a branch point. Each loop braids two roots and leaves them swapped, which is why the quintic has no formula.',
    pointer: 'Click to take hold of c, then move to steer it.',
    touch: 'Tap to take hold of c, then drag sideways to steer it.',
    kind: 'layer',
    layer: braid,
    credit: 'src/CUDA/root_fractal.cu, find_roots.cuh',
    constant: { re: -0.8, im: 0.18 },
  }),
  'shape-shifter': info({
    id: 'shape-shifter',
    name: 'Shape-shifter',
    blurb:
      'z ← zˣ + c with the exponent itself moving, from 2 through 3 and off into complex powers. The Mandelbrot set grows lobes, twists and splits.',
    pointer: 'Move sideways to push the exponent.',
    touch: 'Drag sideways to push the exponent.',
    kind: 'mode',
    mode: 'shape',
    credit: 'src/CUDA/mandelbrot.cu',
    frame: { along: 1.75, across: 1.35 },
    constant: { re: -0.8, im: 0.18 },
  }),
  'mandel-julia': info({
    id: 'mandel-julia',
    name: 'Mandelbrot to Julia',
    blurb:
      'Each pixel slides from being c to being the starting point, so the map of every Julia set folds into a single one and opens out again.',
    pointer: 'Move to choose which Julia set it folds into.',
    touch: 'Drag sideways to choose which Julia set it folds into.',
    kind: 'mode',
    mode: 'mandjul',
    credit: 'src/CUDA/mandelbrot.cu',
    frame: { along: 1.6, across: 1.25 },
    constant: { re: -0.7269, im: 0.1889 },
  }),
  pendulum: info({
    id: 'pendulum',
    name: 'Pendulum chaos',
    blurb:
      'Every pixel a double pendulum released from its own two angles, all simulated at once. Calm regions stay smooth while chaos crackles out from their edges.',
    pointer: 'Click to release them all again.',
    touch: 'Tap to release them all again.',
    kind: 'layer',
    layer: pendulum,
    credit: 'src/CUDA/pendulum_fractal.cu',
    constant: { re: -0.8, im: 0.18 },
  }),
  life: info({
    id: 'life',
    name: 'Life on the edge',
    blurb:
      "Conway's Game of Life, seeded from the outline of a Julia set. The edge boils into gliders and oscillators that leave ember trails.",
    pointer: 'Click to reseed from a nearby set.',
    touch: 'Tap to reseed from a nearby set.',
    kind: 'layer',
    layer: life,
    credit: 'src/Scenes/Math/ConwayScene.cpp',
    constant: { re: -0.7269, im: 0.1889 },
  }),
  'ship-tricorn': info({
    id: 'ship-tricorn',
    name: 'Ship and tricorn',
    blurb:
      'The Mandelbrot set, the Burning Ship and the Tricorn are one formula with two switches. Blending the switches turns one slowly into the next.',
    pointer: 'Move to lean between them.',
    touch: 'Drag sideways to lean between them.',
    kind: 'mode',
    mode: 'ship',
    credit: 'src/CUDA/complex_functions.cuh',
    // the Burning Ship reaches much further below the axis than the others
    frame: { along: 2.05, across: 1.8 },
    constant: { re: -0.8, im: 0.18 },
  }),
  newton: info({
    id: 'newton',
    name: "Newton's basins",
    blurb:
      "Newton's method on a polynomial whose four roots drift. Each colour is every starting point that ends at one root, and the borders between them are fractal.",
    pointer: 'Move to carry a root.',
    touch: 'Tap or drag sideways to carry a root.',
    kind: 'mode',
    mode: 'newton',
    frame: { along: 1.6, across: 1.05 },
    constant: { re: -0.8, im: 0.18 },
  }),
  phoenix: info({
    id: 'phoenix',
    name: 'Phoenix',
    blurb:
      'A fractal that remembers its previous step. The memory slowly breathes, so the feathers open and fold.',
    pointer: 'Move sideways to change its memory.',
    touch: 'Drag sideways to change its memory.',
    kind: 'mode',
    mode: 'phoenix',
    frame: { along: 1.2, across: 0.72 },
    constant: { re: -0.8, im: 0.18 },
  }),
  buddhabrot: info({
    id: 'buddhabrot',
    name: 'Buddhabrot ember',
    blurb:
      'Instead of colouring where points start, it paints every place their escaping orbits pass. The figure builds up out of the dark like a long exposure.',
    pointer: 'Click to start a fresh exposure.',
    touch: 'Tap to start a fresh exposure.',
    kind: 'layer',
    layer: buddha,
    constant: { re: -0.8, im: 0.18 },
  }),
  attractor: info({
    id: 'attractor',
    name: 'Strange attractor',
    blurb:
      'Thousands of points following four numbers that drift, so the silk keeps folding into shapes it has never made before.',
    pointer: 'Move to bend the silk.',
    touch: 'Drag sideways to bend the silk.',
    kind: 'layer',
    layer: attractor,
    constant: { re: -0.8, im: 0.18 },
  }),
  coral: info({
    id: 'coral',
    name: 'Coral',
    blurb:
      'Two chemicals reacting and spreading, seeded by a Julia set. The set grows coral, and the coral grows out into the dark.',
    pointer: 'Click to seed new growth.',
    touch: 'Tap to seed new growth.',
    kind: 'layer',
    layer: coral,
    constant: { re: -0.8, im: 0.156 },
  }),
  murmuration: info({
    id: 'murmuration',
    name: 'Murmuration',
    blurb:
      'A flock wheeling over a Julia set, following its field lines and settling along its edge.',
    pointer: 'Your pointer is a hawk; the flock opens around it.',
    touch: 'Tap or drag sideways to send a hawk through the flock.',
    kind: 'layer',
    layer: murmuration,
    constant: { re: -0.7399, im: -0.3447 },
  }),
  // ---------------------------------------------------------------- on the projects
  heartbeat: info({
    id: 'heartbeat',
    name: 'Heartbeat',
    blurb:
      'Inside the set every point is pulled toward one cycle, and the rings show how long each takes to arrive.',
    pointer: 'Point anywhere to watch its path settle into the beat.',
    touch: 'Tap anywhere to watch its path settle into the beat.',
    kind: 'mode',
    mode: 'heartbeat',
    constant: { re: -0.6676, im: -0.3933 },
  }),
  ripple: info({
    id: 'ripple',
    name: 'Equipotential ripple',
    blurb: 'Hairline contours of the field around the set, and a wave that runs out through them.',
    pointer: 'Click to send a wave through the field.',
    touch: 'Tap to send a wave through the field.',
    kind: 'mode',
    mode: 'ripple',
    constant: { re: -0.7566, im: 0.1432 },
  }),
  stardust: info({
    id: 'stardust',
    name: 'Stardust',
    blurb: 'Particles run the iteration backwards and fall onto the set, drawing its outline.',
    pointer: 'Sweep through to scatter it.',
    touch: 'Tap or drag sideways to scatter it.',
    kind: 'layer',
    layer: dust,
    constant: { re: -0.8439, im: -0.2404 },
  }),
  relief: info({
    id: 'relief',
    name: 'Relief light',
    blurb: "The set's derivative becomes a surface, lit like carved obsidian.",
    pointer: 'Move to carry the lamp.',
    touch: 'Tap or drag sideways to move the lamp.',
    kind: 'mode',
    mode: 'relief',
    constant: { re: -0.8728, im: -0.2667 },
  }),
  'orbit-traps': info({
    id: 'orbit-traps',
    name: 'Orbit traps',
    blurb: 'Each point is shaded by how close its path passes to a trap, like worked metal.',
    pointer: 'Move to carry the trap.',
    touch: 'Tap or drag sideways to move the trap.',
    kind: 'mode',
    mode: 'traps',
    constant: { re: -0.5223, im: 0.5184 },
  }),
  'field-lines': info({
    id: 'field-lines',
    name: 'Field lines',
    blurb: 'The paths that run in from infinity and land on the set.',
    pointer: 'The lines near the pointer light up.',
    touch: 'Tap or drag sideways to light the lines.',
    kind: 'mode',
    mode: 'field',
    constant: { re: -0.7355, im: 0.1729 },
  }),
  'scroll-dive': info({
    id: 'scroll-dive',
    name: 'Scroll dive',
    blurb: 'A fall toward the most detailed part of the set, as deep as the GPU can see.',
    pointer: 'Scroll or hold to fall in.',
    touch: 'Hold or pinch to fall in.',
    kind: 'mode',
    mode: 'plain',
    constant: { re: -0.7269, im: 0.1889 },
  }),
  ridgelines: info({
    id: 'ridgelines',
    name: 'Ridgelines',
    blurb:
      'Escape time lifted into terrain and flown over, generated a row at a time as it comes over the horizon.',
    pointer: 'Move sideways to steer the flight.',
    touch: 'Drag sideways to steer the flight.',
    kind: 'layer',
    layer: terrain,
    constant: { re: -0.7138, im: -0.3501 },
  }),
  cursor: info({
    id: 'cursor',
    name: 'Every point holds a different set',
    blurb:
      'Each point of the plane is the constant of a different Julia set; this one leans toward yours.',
    pointer: 'Move to bend this one.',
    touch: 'Drag sideways to bend it.',
    kind: 'mode',
    mode: 'plain',
    constant: { re: -0.7399, im: -0.3447 },
  }),
}

/** The gallery's order: the new effects first, then those already on projects. */
export const GALLERY: PlateEffect[] = Object.keys(EFFECT_INFO) as PlateEffect[]
