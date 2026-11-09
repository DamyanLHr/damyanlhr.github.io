import { useEffect, useId, useRef, useState } from 'react'
import type { Embed, ItchCard as ItchData, LinkRef } from '../content/types'
import { itchMeta } from './itch'

// A project's embeds and its itch.io card, for every theme. The markup and
// behaviour are shared; the look is the theme's, through class names built
// from its prefix (`j`, `a`, `s`, `lf`, `debug`).
//
//   <prefix>-itch          the itch.io card, in the project's links
//   <prefix>-itch-cover    its cover
//   <prefix>-itch-text     tagline and small print
//   <prefix>-itch-meta     the small print: price, browser or download
//   <prefix>-itch-cta      the call to action, worded like the link it replaces
//   <prefix>-embeds        the stack under the summary
//   <prefix>-game          the game's frame; data-state idle | loading | on
//   <prefix>-game-play     the button that loads it
//   <prefix>-game-note     the small print under the button
//   <prefix>-game-status   "Loading…", over the frame while the game starts
//   <prefix>-game-bar      Fullscreen, Stop, and a way out if it never loads
//   <prefix>-embed         any other iframe

/** How long a game may take before the page offers itch.io instead. */
const SLOW_MS = 12000

/**
 * The game's itch.io page as a card: its cover, its tagline, what it costs and
 * how it plays, and the call to action of the link it replaces. One link, one
 * stop in the tab order. Everything in it was saved by `npm run itch`, so it
 * never waits on itch.io (whose live widget is rate limited per visitor).
 */
export function ItchCard({
  data,
  label,
  prefix,
}: {
  data: ItchData
  label: string
  prefix: string
}) {
  return (
    <a className={`${prefix}-itch`} href={data.url}>
      {data.cover && (
        // decorative: the page's own title already names the game
        <img
          className={`${prefix}-itch-cover`}
          src={data.cover}
          alt=""
          width={360}
          height={286}
          loading="lazy"
          decoding="async"
        />
      )}
      <span className={`${prefix}-itch-text`}>
        {data.tagline && <span className={`${prefix}-itch-tagline`}>{data.tagline}</span>}
        <span className={`${prefix}-itch-meta`}>{itchMeta(data)}</span>
        <span className={`${prefix}-itch-cta`}>{label}</span>
      </span>
    </a>
  )
}

/** The playable game first, then anything else. The itch.io card lives in the links. */
export function ProjectEmbeds({
  embeds,
  title,
  links,
  prefix,
}: {
  embeds: Embed[] | undefined
  /** the project's title, to name the frames for screen readers */
  title: string
  /** the project's links: its itch.io page is the way out if a game won't load */
  links: LinkRef[]
  prefix: string
}) {
  const shown = (embeds ?? []).filter((e) => e.kind !== 'itch')
  if (!shown.length) return null
  const sorted = [...shown].sort(
    (a, b) => Number(b.kind === 'itch-game') - Number(a.kind === 'itch-game'),
  )
  const page = links.find((l) => /^https:\/\/[^/]*itch\.io\//.test(l.url))?.url
  return (
    <div className={`${prefix}-embeds`}>
      {sorted.map((e) =>
        e.kind === 'itch-game' ? (
          <PlayableGame key={e.url} embed={e} title={title} page={page} prefix={prefix} />
        ) : e.kind === 'iframe' ? (
          <div key={e.url} className={`${prefix}-embed`} style={{ aspectRatio: e.aspect }}>
            <iframe
              src={e.url}
              title={e.title}
              loading="lazy"
              allowFullScreen
              style={{ display: 'block', width: '100%', height: '100%', border: 0 }}
            />
          </div>
        ) : null,
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
