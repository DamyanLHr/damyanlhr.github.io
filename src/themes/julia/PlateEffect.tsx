import { useEffect, useRef } from 'react'
import type { PlateEffect as Effect, Project } from '../../content/types'
import { effectFor, projectC } from './fractal'
import { mountPlate } from './effects/plate'

// The plate on a project page. Each project has its own effect (see effectFor),
// and the caption says what the picture is doing and, where there is a pointer
// to do it with, how to play with it.

const NOTES: Record<Effect, { what: string; how: string }> = {
  relief: {
    what: 'Relief light. The set’s derivative becomes a surface, lit like carved obsidian.',
    how: 'Move the pointer to carry the lamp.',
  },
  ripple: {
    what: 'Equipotential ripple. Hairline contours of the field around the set.',
    how: 'Press the plate to send a wave out through them.',
  },
  cursor: {
    what: 'Every point of the plane holds a different Julia set, and this one leans toward the pointer.',
    how: 'Move across the plate to bend it.',
  },
  stardust: {
    what: 'Stardust. Particles run the iteration backwards and fall onto the set.',
    how: 'Sweep through to scatter them.',
  },
  'field-lines': {
    what: 'Field lines. The paths that run in from infinity and land on the set.',
    how: 'The ones near the pointer light up.',
  },
  'orbit-traps': {
    what: 'Orbit traps. Each point is shaded by how close its path passes to a trap.',
    how: 'The pointer moves the trap.',
  },
  ridgelines: {
    what: 'Ridgelines. Escape time lifted into terrain and drawn back to front, the way a game draws a landscape.',
    how: 'Move across it to tilt it.',
  },
  'scroll-dive': {
    what: 'A dive toward the most detailed part of the set, as deep as the GPU’s precision goes.',
    how: 'Scroll over the plate to fall in. It eases back out on its own.',
  },
  heartbeat: {
    what: 'Heartbeat. Inside the set every point is pulled toward one cycle, and the rings show how long each takes to arrive.',
    how: 'Point anywhere to watch a path settle into it.',
  },
}

const TRACE = 'Point anywhere to trace that point’s orbit.'

export function PlateEffect({ project }: { project: Project }) {
  const host = useRef<HTMLDivElement>(null)
  const effect = effectFor(project)
  const { re, im, angle = 0 } = projectC(project)

  useEffect(() => {
    if (!host.current) return
    return mountPlate(host.current, effect, {
      re,
      im,
      span: 2.1,
      cx: 0.5,
      cy: 0.5,
      angle,
      off: [0, 0],
    })
  }, [effect, re, im, angle])

  const note = NOTES[effect]
  return (
    <figure className="j-plate" data-effect={effect}>
      <div ref={host} className="j-plate-art" aria-hidden="true" />
      <figcaption className="j-plate-note">
        {note.what}{' '}
        <span className="j-plate-how">
          {note.how}
          {effect !== 'ridgelines' && effect !== 'heartbeat' && ` ${TRACE}`}
        </span>
      </figcaption>
    </figure>
  )
}
