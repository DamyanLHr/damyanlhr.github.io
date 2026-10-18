import { useEffect, useRef, type ReactNode } from 'react'
import type { Project } from '../../content/types'
import { effectConstant, effectFor } from './fractal'
import { fitToBox } from './fit'
import { attachEffect } from './effects/controller'
import { cardSurface } from './effects/thumbs'
import type { PlaneView } from './effects/view'

// A project card that shows the project's own effect. At rest it is a still
// of that effect. Under the mouse it comes alive and answers the pointer; on a
// phone the card nearest the middle of the screen plays itself. Only one card
// is ever live, and all of them are drawn by one shared renderer.

/** The share of the card the set may take when the title block can't be measured. */
const ART = 0.56

export function EffectCard({
  project,
  live,
  onPoint,
  className,
  children,
  href,
  onClick,
}: {
  project: Project
  /** play on its own (the phone's centred card) */
  live: boolean
  /** the mouse arrived (true) or left (false) */
  onPoint?: (on: boolean) => void
  className: string
  children: ReactNode
  href: string
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  const card = useRef<HTMLAnchorElement>(null)
  const art = useRef<HTMLCanvasElement>(null)
  const pointed = useRef(false)
  const swap = useRef<((mode: 'still' | 'pointer' | 'auto') => void) | null>(null)
  const effect = effectFor(project)
  const { re, im } = effectConstant(project)

  useEffect(() => {
    const host = card.current
    const canvas = art.current
    if (!host || !canvas) return
    const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let detach: (() => void) | null = null
    let mode: 'still' | 'pointer' | 'auto' = 'still'

    const base = (): PlaneView => {
      const w = canvas.clientWidth || 1
      const h = canvas.clientHeight || 1
      // The set takes the room above the title block, whatever height the
      // block wraps to, so the two never overlap.
      const body = host.querySelector<HTMLElement>('.j-card-body')
      const room = body ? Math.max(h * 0.4, body.offsetTop - 4) : h * ART
      const fit = fitToBox(
        { re, im },
        { left: 0, top: 0, width: w, height: room },
        { width: w, height: h },
        { x: 0.86, y: 0.84 },
      )
      return { re, im, span: fit.span, cx: fit.x, cy: fit.y, angle: fit.angle, off: [0, 0] }
    }
    const run = (next: typeof mode) => {
      mode = next
      detach?.()
      const playing = next !== 'still' && motion
      detach = attachEffect(effect, cardSurface(host, canvas, base(), playing), {
        input: next === 'pointer',
        autopilot: next === 'auto',
      })
    }
    swap.current = run
    run(pointed.current ? 'pointer' : 'still')

    let resizeTimer = 0
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => run(mode), 160)
    })
    ro.observe(canvas)
    return () => {
      window.clearTimeout(resizeTimer)
      ro.disconnect()
      detach?.()
      swap.current = null
    }
  }, [effect, re, im])

  useEffect(() => {
    if (!pointed.current) swap.current?.(live ? 'auto' : 'still')
  }, [live])

  return (
    <a
      ref={card}
      href={href}
      onClick={onClick}
      className={className}
      data-effect={effect}
      data-slug={project.slug}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return
        pointed.current = true
        swap.current?.('pointer')
        onPoint?.(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return
        pointed.current = false
        swap.current?.(live ? 'auto' : 'still')
        onPoint?.(false)
      }}
    >
      <canvas ref={art} className="j-card-art" aria-hidden="true" />
      {children}
    </a>
  )
}
