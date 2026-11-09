import { useEffect, useId, useRef, useState } from 'react'
import type { Embed, LinkRef } from '../content/types'
import { itchWidgetSrc, type WidgetPalette } from './itch'

// A project's embeds, for every theme: the playable game, itch.io's store
// widget, and any other iframe. The markup and behaviour are shared; the look
// is the theme's, through class names built from its prefix (`j`, `a`, `s`,
// `lf`, `debug`) and the colours it hands the widget.
//
//   <prefix>-embeds        the stack
//   <prefix>-game          the game's frame; data-state idle | loading | on
//   <prefix>-game-play     the button that loads it
//   <prefix>-game-note     the small print under the button
//   <prefix>-game-status   "Loading…", over the frame while the game starts
//   <prefix>-game-bar      Fullscreen, Stop, and a way out if it never loads
//   <prefix>-widget        itch.io's store widget
//   <prefix>-embed         any other iframe

/** The game first, then the store widget, then anything else. */
const ORDER: Record<Embed['kind'], number> = { 'itch-game': 0, 'itch-widget': 1, iframe: 2 }

/** How long a game may take before the page offers itch.io instead. */
const SLOW_MS = 12000

export function ProjectEmbeds({
  embeds,
  title,
  links,
  prefix,
  palette,
}: {
  embeds: Embed[] | undefined
  /** the project's title, to name the frames for screen readers */
  title: string
  /** the project's links: its itch.io page is the way out if a game won't load */
  links: LinkRef[]
  prefix: string
  palette: WidgetPalette
}) {
  if (!embeds?.length) return null
  const sorted = [...embeds].sort((a, b) => ORDER[a.kind] - ORDER[b.kind])
  const page = links.find((l) => /^https:\/\/[^/]*itch\.io\//.test(l.url))?.url
  return (
    <div className={`${prefix}-embeds`}>
      {sorted.map((e) =>
        e.kind === 'itch-game' ? (
          <PlayableGame key={e.url} embed={e} title={title} page={page} prefix={prefix} />
        ) : e.kind === 'itch-widget' ? (
          <iframe
            key={e.id}
            className={`${prefix}-widget`}
            src={itchWidgetSrc(e.id, palette)}
            title={`${title} on itch.io`}
            height={167}
            loading="lazy"
            style={{ display: 'block', width: '100%', maxWidth: 552, border: 0 }}
          />
        ) : (
          <div key={e.url} className={`${prefix}-embed`} style={{ aspectRatio: e.aspect }}>
            <iframe
              src={e.url}
              title={e.title}
              loading="lazy"
              allowFullScreen
              style={{ display: 'block', width: '100%', height: '100%', border: 0 }}
            />
          </div>
        ),
      )}
    </div>
  )
}

/**
 * The game, behind a button: nothing is downloaded and nothing makes a sound
 * until the visitor asks for it. Until then the panel is a compact strip, not
 * an empty screen. Once loaded the game runs at its own resolution and is
 * scaled down to fit the column, so a 960 wide game in a 700 wide column shows
 * whole instead of cropped (and clicks still land where they look).
 */
function PlayableGame({
  embed,
  title,
  page,
  prefix,
}: {
  embed: Extract<Embed, { kind: 'itch-game' }>
  title: string
  page: string | undefined
  prefix: string
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'on'>('idle')
  const [slow, setSlow] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const play = useRef<HTMLButtonElement>(null)
  const stopped = useRef(false)
  const noteId = useId()
  // a game made for keyboard and mouse says so on a phone, rather than inviting
  const coarse = window.matchMedia('(pointer: coarse)').matches

  useEffect(() => {
    const el = box.current
    const f = frame.current
    if (state === 'idle' || !el || !f) return
    const fit = () => {
      const k = Math.min(1, el.clientWidth / embed.width)
      f.style.transform = `scale(${k})`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [state, embed.width])

  useEffect(() => {
    if (state === 'loading') {
      frame.current?.focus()
      const t = window.setTimeout(() => setSlow(true), SLOW_MS)
      return () => window.clearTimeout(t)
    }
    if (state === 'idle' && stopped.current) {
      stopped.current = false
      play.current?.focus()
    }
  }, [state])

  const start = () => {
    setSlow(false)
    setState('loading')
  }
  const stop = () => {
    stopped.current = true
    setState('idle')
  }

  return (
    <div className={`${prefix}-game-wrap`} style={{ display: 'grid', gap: '0.55rem' }}>
      <div
        ref={box}
        className={`${prefix}-game`}
        data-state={state}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: embed.width,
          aspectRatio: state === 'idle' ? undefined : `${embed.width} / ${embed.height}`,
          overflow: 'hidden',
        }}
      >
        {state === 'idle' ? (
          <button
            ref={play}
            type="button"
            className={`${prefix}-game-play`}
            onClick={start}
            aria-label={`Play ${title} here`}
            aria-describedby={noteId}
            style={{ touchAction: 'manipulation' }}
          >
            <span style={{ maxWidth: '85%', textAlign: 'center', textWrap: 'balance' }}>
              Play {title} here
            </span>
            <small id={noteId} className={`${prefix}-game-note`}>
              {coarse
                ? 'Made for keyboard and mouse: best on a computer.'
                : 'Runs right here, from itch.io. Keyboard and mouse.'}
            </small>
          </button>
        ) : (
          <iframe
            ref={frame}
            src={embed.url}
            title={`${title}, playable`}
            width={embed.width}
            height={embed.height}
            allow="autoplay; fullscreen; gamepad"
            allowFullScreen
            onLoad={() => setState('on')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              border: 0,
              transformOrigin: '0 0',
            }}
          />
        )}
        <p className={`${prefix}-game-status`} aria-live="polite">
          {state === 'loading' ? `Loading ${title}…` : ''}
        </p>
      </div>
      {state !== 'idle' && (
        <div className={`${prefix}-game-bar`}>
          <button type="button" onClick={() => frame.current?.requestFullscreen?.()}>
            Fullscreen
          </button>
          <button type="button" onClick={stop}>
            Stop
          </button>
          {slow && state === 'loading' && page && (
            <a href={page}>Not loading? Open it on itch.io ↗</a>
          )}
        </div>
      )}
    </div>
  )
}
