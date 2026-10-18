import { useEffect, useRef } from 'react'
import type { Route } from '../../shared/routes'
import type { SiteContent } from '../../content/types'
import { projectC, ROUTE_C } from './fractal'
import { createOrbitTrace, type OrbitTrace } from './effects/orbit-trace'
import { createStage, type Stage } from './stage'
import { poseFor, type Complex } from './travel'

// The set behind every julia page. It is mounted once in Root and outlives
// every route change, so leaving a page never tears the picture down: the
// constant travels along the edge of the Mandelbrot set to the next page's.

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

function constantFor(route: Route, content: SiteContent): Complex {
  if (route.kind === 'project') {
    const project = content.projects.find((p) => p.slug === route.slug)
    return project ? projectC(project) : ROUTE_C.notFound
  }
  return ROUTE_C[route.kind]
}

function kindFor(route: Route, content: SiteContent) {
  if (route.kind === 'project' && !content.projects.some((p) => p.slug === route.slug))
    return 'notFound'
  return route.kind
}

export function Backdrop({ route, content }: { route: Route; content: SiteContent }) {
  const host = useRef<HTMLDivElement>(null)
  const engine = useRef<Stage | null>(null)
  const tracer = useRef<OrbitTrace | null>(null)
  const kind = kindFor(route, content)
  const c = constantFor(route, content)
  const { re, im } = c

  // The canvas is made here rather than rendered, so a remount (StrictMode,
  // a theme switch and back) always gets a fresh one: a disposed GL context
  // stays lost on the canvas it was taken from.
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.className = 'j-stage-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    const overlay = document.createElement('canvas')
    overlay.className = 'j-stage-trace'
    host.current?.append(canvas, overlay)
    const stage = createStage(canvas)
    engine.current = stage
    tracer.current = createOrbitTrace(overlay, () => stage.view() ?? FALLBACK_VIEW)
    return () => {
      stage.dispose()
      tracer.current?.dispose()
      engine.current = null
      tracer.current = null
      canvas.remove()
      overlay.remove()
    }
  }, [])

  useEffect(() => {
    const stage = engine.current
    if (!stage) return
    const mq = window.matchMedia(NARROW)
    stage.setPose(poseFor(kind, { re, im }, mq.matches))
    stage.setFollow(kind === 'home')
    const onChange = () => stage.setPose(poseFor(kind, { re, im }, mq.matches), { travel: false })
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [kind, re, im])

  // The hero's orbit trace: the path of the point under the mouse. Only on
  // home, where the set is the subject; on the reading pages it would be a
  // distraction moving behind the text.
  useEffect(() => {
    const trace = tracer.current
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

  return <div ref={host} className="j-stage" data-pose={kind} aria-hidden="true" />
}
