import { useEffect, useRef } from 'react'
import type { Route } from '../../shared/routes'
import type { SiteContent } from '../../content/types'
import { projectC, ROUTE_C } from './fractal'
import { createStage, type Stage } from './stage'
import { poseFor, type Complex } from './travel'

// The set behind every julia page. It is mounted once in Root and outlives
// every route change, so leaving a page never tears the picture down: the
// constant travels along the edge of the Mandelbrot set to the next page's.

const NARROW = '(max-width: 760px)'

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
    host.current?.append(canvas)
    engine.current = createStage(canvas)
    return () => {
      engine.current?.dispose()
      engine.current = null
      canvas.remove()
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

  return <div ref={host} className="j-stage" data-pose={kind} aria-hidden="true" />
}
