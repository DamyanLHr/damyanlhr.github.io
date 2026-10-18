import { useEffect, useRef } from 'react'
import type { Route } from '../../shared/routes'
import type { PlateEffect, SiteContent } from '../../content/types'
import { effectConstant, effectFor, ROUTE_C } from './fractal'
import { fitExtent, fitToBox } from './fit'
import { attachEffect } from './effects/controller'
import { enqueue, holdUntil } from './effects/idle-queue'
import { createOrbitTrace, type OrbitTrace } from './effects/orbit-trace'
import { EFFECT_INFO } from './effects/registry'
import { stageSurface } from './effects/stage-surface'
import { warmShared } from './effects/thumbs'
import { constantForEffect } from './effects/view'
import { GALLERY_SLUG, galleryEffect, useHash } from './gallery-slug'
import { createStage, type Stage } from './stage'
import type { StageBus } from './stage-bus'
import { poseFor, type Complex, type Pose } from './travel'

// The set behind every julia page. It is mounted once in Root and outlives
// every route change, so leaving a page never tears the picture down: the
// constant travels along the edge of the Mandelbrot set to the next page's.
//
// Home and the CV keep it as a backdrop. On the projects pages it moves into
// a band across the top of the page (the page's `.j-band`), fitted so the
// whole set and its glow sit inside it, as large as the band allows. On a
// project page it then develops into that project's effect, in place.

const NARROW = '(max-width: 760px)'
const FALLBACK_VIEW = {
  re: 0,
  im: 0,
  span: 3,
  cx: 0.5,
  cy: 0.5,
  angle: 0,
  off: [0, 0] as [number, number],
}

function kindFor(route: Route, content: SiteContent) {
  if (route.kind === 'project' && route.slug === GALLERY_SLUG) return 'gallery'
  if (route.kind === 'project' && !content.projects.some((p) => p.slug === route.slug))
    return 'notFound'
  return route.kind
}

/**
 * The pose that fits the picture into the page's band, or null when the page
 * has none: the set itself, measured, or for a picture that is not a Julia
 * set, the box of the plane its effect frames.
 */
function bandPose(
  c: Complex,
  canvas: HTMLCanvasElement,
  frame?: { along: number; across: number },
): Pose | null {
  const band = document.querySelector<HTMLElement>('.j-band')
  if (!band) return null
  const cr = canvas.getBoundingClientRect()
  const br = band.getBoundingClientRect()
  const box = { left: br.left - cr.left, top: br.top - cr.top, width: br.width, height: br.height }
  const size = { width: cr.width, height: cr.height }
  const fit = frame ? fitExtent(frame, box, size) : fitToBox(c, box, size)
  return { re: c.re, im: c.im, ...fit, dim: 1 }
}

export function Backdrop({
  route,
  content,
  bus,
}: {
  route: Route
  content: SiteContent
  bus: StageBus
}) {
  const host = useRef<HTMLDivElement>(null)
  const parts = useRef<{
    stage: Stage
    canvas: HTMLCanvasElement
    layer: HTMLCanvasElement
    trace: OrbitTrace | null
    curtain: HTMLDivElement
  } | null>(null)
  const kind = kindFor(route, content)
  const project =
    route.kind === 'project' ? content.projects.find((p) => p.slug === route.slug) : undefined
  // the gallery's effect follows the address, so each tile is a link
  const hash = useHash()
  const effect: PlateEffect | null =
    kind === 'gallery' ? galleryEffect() : project ? effectFor(project) : null
  const c: Complex =
    kind === 'gallery' && effect
      ? constantForEffect(EFFECT_INFO[effect].constant, effect)
      : project
        ? effectConstant(project)
        : ROUTE_C[kind === 'project' || kind === 'gallery' ? 'notFound' : kind]
  const { re, im } = c
  const frame = effect ? EFFECT_INFO[effect].frame : undefined
  const banded = kind === 'projects' || kind === 'project' || kind === 'gallery'

  // The canvases are made here rather than rendered, so a remount (StrictMode,
  // a theme switch and back) always gets fresh ones: a disposed GL context
  // stays lost on the canvas it was taken from.
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.className = 'j-stage-canvas'
    const layer = document.createElement('canvas')
    layer.className = 'j-stage-layer'
    const overlay = document.createElement('canvas')
    overlay.className = 'j-stage-trace'
    // the page's ground, drawn over everything under the band (see edge())
    const curtain = document.createElement('div')
    curtain.className = 'j-stage-curtain'
    host.current?.append(canvas, layer, overlay, curtain)
    const stage = createStage(canvas)
    const trace = createOrbitTrace(overlay, () => stage.view() ?? FALLBACK_VIEW)
    parts.current = { stage, canvas, layer, trace, curtain }
    // The cards' renderer compiles its shader while the first page is read,
    // not in the first frames of the projects page.
    const warm = window.setTimeout(() => enqueue(warmShared), 1500)
    return () => {
      window.clearTimeout(warm)
      stage.dispose()
      trace?.dispose()
      parts.current = null
      canvas.remove()
      layer.remove()
      overlay.remove()
      curtain.remove()
    }
  }, [])

  // The pose, and on a project page the effect once the set has arrived.
  useEffect(() => {
    const p = parts.current
    if (!p) return
    const { stage, canvas, layer, trace, curtain } = p
    const mq = window.matchMedia(NARROW)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pose = () =>
      (banded ? bandPose({ re, im }, canvas, frame) : null) ??
      poseFor(kind === 'gallery' ? 'project' : kind, { re, im }, mq.matches)

    stage.setPose(pose())
    // stills and other deferrable work wait until the set has landed
    holdUntil(performance.now() + stage.eta())
    const band = document.querySelector<HTMLElement>('.j-band')
    // Nothing the stage draws may show below the band: a dive or a field line
    // that reaches past it fades out just under the band's edge instead. The
    // curtain is the page's ground, moved by a transform (the compositor's
    // work, unlike the mask it replaces), and the stage stops drawing the rows
    // it covers.
    const edge = (moving: boolean) => {
      let end: number | null = null
      if (banded && band)
        end = band.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top + 48
      stage.setClip(end)
      if (!moving) curtain.style.transition = 'none'
      curtain.style.transform = end === null ? '' : `translateY(calc(${end}px - 4rem))`
      if (!moving) {
        void curtain.offsetHeight
        curtain.style.transition = ''
      }
    }
    edge(true)
    stage.setFollow(kind === 'home' ? 'window' : kind === 'projects' && band ? band : 'off')

    let detach: (() => void) | null = null
    let timer = 0
    const attach = () => {
      detach?.()
      detach = null
      if ((kind !== 'project' && kind !== 'gallery') || !effect || !band) return
      detach = attachEffect(effect, stageSurface(stage, band, canvas, layer, trace, !reduced), {
        input: true,
        autopilot: false,
        greet: true,
        wheel: true,
      }).detach
    }
    // Travel first, then develop: the effect starts once the set has arrived.
    timer = window.setTimeout(attach, stage.eta())

    let resizeTimer = 0
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        stage.setPose(pose(), { travel: false })
        edge(false)
        if (detach) attach()
      }, 200)
    }
    window.addEventListener('resize', onResize)
    mq.addEventListener('change', onResize)

    // Pointing at a project card sends the band's set to that project's
    // constant, so the click that follows only has to develop the effect.
    bus.listen(
      kind === 'projects'
        ? (to) => {
            const target = to ?? ROUTE_C.projects
            const next = bandPose(target, canvas)
            if (next) stage.setPose(next, { preview: true })
          }
        : null,
    )

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      mq.removeEventListener('change', onResize)
      bus.listen(null)
      detach?.()
    }
  }, [kind, re, im, banded, effect, frame, bus, hash])

  // The hero's orbit trace: the path of the point under the mouse. Only on
  // home, where the set is the subject; on the reading pages it would be a
  // distraction moving behind the text.
  useEffect(() => {
    const trace = parts.current?.trace
    const box = host.current
    if (!trace || !box || kind !== 'home') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') trace.trace(e.clientX, e.clientY, box.getBoundingClientRect())
    }
    const onLeave = () => trace.clear()
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      trace.clear()
    }
  }, [kind])

  return (
    <div
      ref={host}
      className="j-stage"
      data-pose={kind}
      data-band={banded ? 'true' : undefined}
      aria-hidden="true"
    />
  )
}
