import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { reelOffset, reelSpinTarget } from './theme-menu'

// The reel's mechanics, shared so every theme's strip moves the same way and
// only its look differs. A theme renders a window element and, inside it, a
// strip holding its preview cells repeated REEL_REPEAT times; this hook moves
// the strip.
//
//   - pointing at an entry slides the strip to it: 240 ms, strong ease-out,
//     and interruptible, because each move starts from wherever the strip is
//   - a spin runs three laps and slows into the winner, blurred while fast
//   - reduced motion and keyboard opening move it without animating

/** How many times the strip repeats its cells: enough for a 3-lap spin. */
export const REEL_REPEAT = 4

const SLIDE_MS = 240
const SLIDE_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'
/** Fast off the mark, a long deceleration: a wheel that was given a shove. */
const SPIN_EASE = 'cubic-bezier(0.12, 0.6, 0.2, 1)'

interface ReelState {
  open: boolean
  shown: number
  spin: { to: number; ms: number } | null
  instant: boolean
}

export function useReel(m: ReelState, count: number, blur = true) {
  const windowRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const slot = useRef(0)

  const geometry = useCallback(() => {
    const strip = stripRef.current
    const win = windowRef.current
    const first = strip?.firstElementChild as HTMLElement | null
    if (!strip || !win || !first) return null
    const gap = parseFloat(getComputedStyle(strip).rowGap) || 0
    return { pitch: first.offsetHeight + gap, cellH: first.offsetHeight, winH: win.clientHeight }
  }, [])

  const moveTo = useCallback(
    (to: number, ms: number, easing = SLIDE_EASE) => {
      const strip = stripRef.current
      const g = geometry()
      if (!strip || !g) return null
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // where the strip is right now, even mid-animation, so a new move picks
      // up from there instead of jumping back to where the last one began
      const current = new DOMMatrixReadOnly(getComputedStyle(strip).transform).m42
      for (const a of strip.getAnimations()) a.cancel()
      const y = reelOffset(to, g.pitch, g.cellH, g.winH)
      strip.style.transform = `translateY(${y}px)`
      slot.current = to
      if (ms <= 0 || reduced) return null
      return strip.animate(
        [{ transform: `translateY(${current}px)` }, { transform: `translateY(${y}px)` }],
        { duration: ms, easing },
      )
    },
    [geometry],
  )

  // opening: the strip is already on the shown entry, no slide in
  const wasOpen = useRef(false)
  useLayoutEffect(() => {
    if (m.open && !wasOpen.current) moveTo(m.shown, 0)
    wasOpen.current = m.open
  }, [m.open, m.shown, moveTo])

  useEffect(() => {
    if (!m.open || m.spin) return
    if (slot.current % count === m.shown) return
    moveTo(m.shown, m.instant ? 0 : SLIDE_MS)
  }, [m.open, m.shown, m.spin, m.instant, count, moveTo])

  useEffect(() => {
    if (!m.spin) return
    const strip = stripRef.current
    // start from the same picture one lap down, so every spin covers the
    // same distance whatever was showing
    moveTo(slot.current % count, 0)
    const run = moveTo(reelSpinTarget(m.spin.to, count), m.spin.ms, SPIN_EASE)
    if (blur && run && strip) {
      strip.animate(
        [{ filter: 'blur(1.5px)' }, { filter: 'blur(1.5px)', offset: 0.62 }, { filter: 'blur(0)' }],
        { duration: m.spin.ms },
      )
    }
    const to = m.spin.to
    if (run) run.onfinish = () => moveTo(to, 0)
    else moveTo(to, 0)
  }, [m.spin, count, blur, moveTo])

  // a resize changes the cell height; keep the same entry centred
  useEffect(() => {
    const win = windowRef.current
    if (!m.open || !win) return
    const ro = new ResizeObserver(() => moveTo(slot.current, 0))
    ro.observe(win)
    return () => ro.disconnect()
  }, [m.open, moveTo])

  return { windowRef, stripRef }
}
