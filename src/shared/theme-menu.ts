import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type {
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'

// The theme menu (PLAN Phase 8). The shell hands every theme a `ThemeMenu`; the
// theme draws the button and the dropdown in its own visual language, and this
// hook owns the behaviour so all five behave the same way:
//
//   - a fine pointer resting on the button opens the dropdown
//   - a click while the dropdown is closed only opens it (touch, keyboard)
//   - a click once the dropdown is showing runs a short roulette over the list
//     and switches to a random theme this device can run, never the current one
//   - picking an entry directly switches to that entry
//
// Motion per emil-design-eng: the roulette is a rare, deliberate moment, so it
// may take about a second; everything the visitor does often stays instant.

export interface ThemeMenuEntry {
  id: string
  name: string
  description: string
  /** URL of a small screenshot of the theme's landing page. */
  preview: string
  /**
   * False when this device fails the theme's requirements. Such a theme can
   * still be picked by hand (it degrades on its own), but never at random.
   */
  runnable: boolean
}

export interface ThemeMenu {
  entries: ThemeMenuEntry[]
  activeId: string
  pick: (id: string) => void
}

/** Uniform pick among runnable entries other than the current one. */
export function pickRandom(
  entries: ThemeMenuEntry[],
  activeId: string,
  rng: () => number = Math.random,
): ThemeMenuEntry | null {
  const pool = entries.filter((e) => e.runnable && e.id !== activeId)
  if (pool.length === 0) return null
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]
}

/** Total time the highlight spends travelling before it settles, in ms. */
export const ROULETTE_MS = 1000
/** How long the winner stays highlighted before the site switches. */
export const ROULETTE_HOLD_MS = 320

/**
 * The highlight's path: at least one full lap from `from`, ending on `to`, with
 * gaps that lengthen towards the end so it visibly slows into the winner.
 * Returns the index shown at each step and how long it is shown.
 */
export function rouletteSteps(
  count: number,
  from: number,
  to: number,
  totalMs: number = ROULETTE_MS,
): { index: number; ms: number }[] {
  if (count <= 0) return []
  const start = from < 0 ? count - 1 : from
  const distance = (((to - start) % count) + count) % count
  const steps = Math.max(1, count + distance)
  const weights = Array.from({ length: steps }, (_, k) => 1 + 4 * (k / steps) ** 2)
  const sum = weights.reduce((a, b) => a + b, 0)
  return weights.map((w, k) => ({ index: (start + k + 1) % count, ms: (w / sum) * totalMs }))
}

/** How long a reel spins before it settles on the winner. */
export const SPIN_MS = 1400

/**
 * Where a reel strip lands for a spin: `laps` full turns past the current
 * slot, then on to `to`. The strip repeats its entries, so the returned slot
 * shows the same picture as `to` itself; after the spin the strip jumps back
 * to `to` with no visible change.
 */
export function reelSpinTarget(to: number, count: number, laps = 3): number {
  return laps * count + to
}

/**
 * The strip's vertical offset that centres slot `slot` in the window, given
 * the distance from one cell to the next (`pitch`), a cell's own height and
 * the window's height.
 */
export function reelOffset(slot: number, pitch: number, cellH: number, windowH: number): number {
  return windowH / 2 - slot * pitch - cellH / 2
}

/** A pointer passing over the bar on its way to a link should not open it. */
const HOVER_INTENT_MS = 90
/** A click this soon after a hover-open still counts as the opening click. */
const OPEN_GRACE_MS = 140
/** Room to cross the gap between the button and the panel. */
const CLOSE_GRACE_MS = 160

function finePointer(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface ThemeMenuOptions {
  /**
   * The random pick is a reel spin the theme animates itself (`spin` tells it
   * where to and for how long) rather than a highlight stepping down the list.
   */
  reel?: boolean
}

export function useThemeMenu(menu: ThemeMenu, options: ThemeMenuOptions = {}) {
  const { entries, activeId, pick } = menu
  const reel = options.reel ?? false
  /** The reel spin in progress: the entry it lands on and how long it takes. */
  const [spin, setSpin] = useState<{ to: number; ms: number } | null>(null)
  const [open, setOpen] = useState(false)
  const [rolling, setRolling] = useState(false)
  /** The roulette has stopped on its winner and is holding before the switch. */
  const [landed, setLanded] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  /** The entry the pointer or focus is on, for the theme's preview lens. */
  const [hover, setHover] = useState(-1)
  const [status, setStatus] = useState('')
  /** Opened from the keyboard: show it at once, keyboard actions never animate. */
  const [instant, setInstant] = useState(false)
  const menuId = useId()

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const openedAt = useRef(0)
  const closeTimer = useRef<number | undefined>(undefined)
  const openTimer = useRef<number | undefined>(undefined)
  const rollTimers = useRef<number[]>([])
  /** Item to focus once the panel has rendered (keyboard opening). */
  const pendingFocus = useRef<number | null>(null)

  const clearRoll = useCallback(() => {
    for (const t of rollTimers.current) window.clearTimeout(t)
    rollTimers.current = []
  }, [])

  const show = useCallback((fromKeyboard = false) => {
    window.clearTimeout(closeTimer.current)
    window.clearTimeout(openTimer.current)
    setInstant(fromKeyboard)
    setOpen((was) => {
      if (!was) openedAt.current = performance.now()
      return true
    })
  }, [])

  const hide = useCallback(
    (returnFocus: boolean) => {
      window.clearTimeout(closeTimer.current)
      window.clearTimeout(openTimer.current)
      clearRoll()
      setRolling(false)
      setLanded(false)
      setSpin(null)
      setHighlight(-1)
      setHover(-1)
      setOpen(false)
      if (returnFocus) triggerRef.current?.focus()
    },
    [clearRoll],
  )

  const roll = useCallback(() => {
    const winner = pickRandom(entries, activeId)
    if (!winner) return
    const to = entries.findIndex((e) => e.id === winner.id)
    const from = entries.findIndex((e) => e.id === activeId)
    setRolling(true)
    setStatus(`Picking a theme at random`)

    const land = () => {
      setHighlight(to)
      setLanded(true)
      setStatus(`Switching to ${winner.name}`)
      rollTimers.current.push(window.setTimeout(() => pick(winner.id), ROULETTE_HOLD_MS))
    }

    if (reducedMotion()) {
      land()
      return
    }
    if (reel) {
      // the theme spins its strip for SPIN_MS; the list waits for the landing
      setSpin({ to, ms: SPIN_MS })
      rollTimers.current.push(window.setTimeout(land, SPIN_MS))
      return
    }
    let at = 0
    const steps = rouletteSteps(entries.length, from, to)
    steps.forEach((s, k) => {
      rollTimers.current.push(
        window.setTimeout(() => {
          if (k === steps.length - 1) land()
          else setHighlight(s.index)
        }, at),
      )
      at += s.ms
    })
  }, [entries, activeId, pick, reel])

  // outside press and Escape close; leaving focus closes
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) hide(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        hide(true)
      }
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open, hide])

  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current)
      window.clearTimeout(openTimer.current)
      clearRoll()
    },
    [clearRoll],
  )

  const focusItem = useCallback(
    (i: number) => {
      const n = entries.length
      itemRefs.current[((i % n) + n) % n]?.focus()
    },
    [entries.length],
  )

  // Not requestAnimationFrame: a theme with a busy render loop can hold a frame
  // back for seconds on a slow GPU, and focus should not wait on the artwork.
  useLayoutEffect(() => {
    if (open && pendingFocus.current !== null) {
      focusItem(pendingFocus.current)
      pendingFocus.current = null
    }
  }, [open, focusItem])

  const openAndFocus = (i: number) => {
    if (open) focusItem(i)
    else {
      pendingFocus.current = i
      show(true)
    }
  }

  const rootProps = {
    ref: rootRef,
    onPointerEnter: (e: ReactPointerEvent) => {
      if (e.pointerType !== 'mouse' || !finePointer()) return
      window.clearTimeout(closeTimer.current)
      if (open) return
      window.clearTimeout(openTimer.current)
      openTimer.current = window.setTimeout(() => show(), HOVER_INTENT_MS)
    },
    onPointerLeave: (e: ReactPointerEvent) => {
      if (e.pointerType !== 'mouse' || rolling) return
      window.clearTimeout(openTimer.current)
      window.clearTimeout(closeTimer.current)
      closeTimer.current = window.setTimeout(() => hide(false), CLOSE_GRACE_MS)
    },
    onBlur: (e: FocusEvent) => {
      if (rolling) return
      const next = e.relatedTarget as Node | null
      if (next && rootRef.current?.contains(next)) return
      // focus moved somewhere else on the page (Tab out), not just lost to a click
      if (next) hide(false)
    },
  }

  const triggerProps = {
    ref: triggerRef,
    type: 'button' as const,
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: (e: MouseEvent) => {
      if (rolling) return
      // closed, or only just opened by the pointer arriving: this click opens it
      if (!open || performance.now() - openedAt.current < OPEN_GRACE_MS) {
        // keyboard activation (Enter/Space) arrives as a click with no pointer
        if (e.detail === 0)
          openAndFocus(
            Math.max(
              0,
              entries.findIndex((x) => x.id === activeId),
            ),
          )
        else show()
        return
      }
      roll()
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        openAndFocus(e.key === 'ArrowDown' ? 0 : entries.length - 1)
      }
    },
  }

  /** The panel around the list: room for a heading or a hint. */
  const panelProps = {
    'data-rolling': rolling || undefined,
    'data-landed': landed || undefined,
    'data-instant': instant || undefined,
  }

  /** The list itself. Only menu items may live inside a role="menu". */
  const menuProps = {
    id: menuId,
    role: 'menu' as const,
    'aria-label': 'Themes',
    'aria-busy': rolling || undefined,
    onKeyDown: (e: KeyboardEvent) => {
      const i = itemRefs.current.findIndex((el) => el === document.activeElement)
      if (e.key === 'ArrowDown') focusItem(i + 1)
      else if (e.key === 'ArrowUp') focusItem(i - 1)
      else if (e.key === 'Home') focusItem(0)
      else if (e.key === 'End') focusItem(entries.length - 1)
      else return
      e.preventDefault()
      // themes listen on window for their own keys (landfall travels on the
      // arrows); a key the menu used is not theirs as well
      e.stopPropagation()
    },
  }

  const activeIndex = entries.findIndex((e) => e.id === activeId)
  /**
   * Which entry a preview lens should show: the roulette's cursor while it
   * runs, else whatever the visitor is pointing at, else the current theme.
   */
  const shown = highlight >= 0 ? highlight : hover >= 0 ? hover : activeIndex

  const itemProps = (i: number) => {
    const entry = entries[i]
    return {
      ref: (el: HTMLButtonElement | null) => {
        itemRefs.current[i] = el
      },
      type: 'button' as const,
      role: 'menuitemradio' as const,
      'aria-checked': entry.id === activeId,
      tabIndex: -1,
      'data-highlight': highlight === i || undefined,
      'data-active': entry.id === activeId || undefined,
      'data-shown': shown === i || undefined,
      onPointerEnter: (e: ReactPointerEvent) => {
        if (e.pointerType === 'mouse' && !rolling) setHover(i)
      },
      onFocus: () => {
        if (!rolling) setHover(i)
      },
      onClick: () => {
        if (rolling) return
        if (entry.id === activeId) {
          hide(true)
          return
        }
        pick(entry.id)
      },
    }
  }

  return {
    open,
    rolling,
    highlight,
    shown,
    spin,
    landed,
    instant,
    status,
    rootProps,
    triggerProps,
    panelProps,
    menuProps,
    itemProps,
  }
}
