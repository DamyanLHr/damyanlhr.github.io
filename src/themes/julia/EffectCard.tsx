import { useEffect, useRef, type ReactNode } from 'react'
import type { PlateEffect } from '../../content/types'
import { fitExtent, fitToBox } from './fit'
import { EFFECT_INFO } from './effects/registry'
import { attachEffect } from './effects/controller'
import { cardSurface } from './effects/thumbs'
import type { PlaneView } from './effects/view'

// A card that shows an effect: a project's own, or a gallery tile's. At rest it is a still
// of that effect. Under the mouse it comes alive and answers the pointer; on a
// phone the card nearest the middle of the screen plays itself. Only one card
// is ever live, and all of them are drawn by one shared renderer.

/** The share of the card the set may take when the title block can't be measured. */
const ART = 0.56

export function EffectCard({
  effect,
  c,
  slug,
  live,
  onPoint,
  className,
  children,
  href,
  onClick,
}: {
  effect: PlateEffect
  /** the constant the effect is shown with */
  c: { re: number; im: number }
  /** names the card for the phone's centred-card tracking */
  slug: string
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
  const { re, im } = c
  const frame = EFFECT_INFO[effect].frame

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
      const box = { left: 0, top: 0, width: w, height: room }
      const fill = { x: 0.86, y: 0.84 }
      const fit = frame
        ? fitExtent(frame, box, { width: w, height: h }, fill)
        : fitToBox({ re, im }, box, { width: w, height: h }, fill)
      return { re, im, span: fit.span, cx: fit.x, cy: fit.y, angle: fit.angle, off: [0, 0] }
    }
    // Nothing is drawn until the card comes near the screen: a page of
    // twenty stills, each a few hundred thousand iterations, would otherwise
    // all render at once on arrival.
    let near = false
    const run = (next: typeof mode) => {
      mode = next
      if (!near) return
      detach?.()
      const playing = next !== 'still' && motion
      detach = attachEffect(effect, cardSurface(host, canvas, base(), playing), {
        input: next === 'pointer',
        autopilot: next === 'auto',
      })
    }
    swap.current = run
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || near) return
        near = true
        io.disconnect()
        run(pointed.current ? 'pointer' : mode)
      },
      { rootMargin: '300px 0px' },
    )
    io.observe(host)

    let resizeTimer = 0
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => run(mode), 160)
    })
    ro.observe(canvas)
    return () => {
      io.disconnect()
      window.clearTimeout(resizeTimer)
      ro.disconnect()
      detach?.()
      swap.current = null
    }
  }, [effect, re, im, frame])

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
      data-slug={slug}
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
