import type { ThemeProps } from '../../shared/theme-contract'
import { EffectCard } from './EffectCard'
import { EFFECT_INFO, GALLERY } from './effects/registry'
import { constantForEffect } from './effects/view'
import { chooseEffect, galleryEffect, useHash } from './gallery-slug'
import { WorkTabs } from './views'

// The gallery: every effect this theme can play. The band at the top is the
// same stage as a project page; choosing a tile sends the set there and
// develops that effect in place, so the gallery is a project page you can
// flip through. Each effect has its own address (#id), so one can be shared.

export function Gallery({ navigate }: { navigate: ThemeProps['navigate'] }) {
  useHash()
  const current = galleryEffect()
  const info = EFFECT_INFO[current]
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <>
      <div className="j-band j-band-gallery">
        <p className="j-band-note">
          <span className="j-band-name">{info.name}</span>
          <span className="j-band-how j-how-pointer">{info.pointer}</span>
          <span className="j-band-how j-how-touch">{info.touch}</span>
          {info.credit && <span className="j-band-credit">after 2swap&rsquo;s swaptube</span>}
        </p>
      </div>
      <section className="j-page j-page-wide j-enter">
        <header className="j-page-head j-page-head-tabs">
          <h1>Gallery</h1>
          <WorkTabs current="gallery" navigate={navigate} />
        </header>
        <p className="j-gallery-lede">
          Every effect this theme can play, live. The ones on the projects are here, and the rest
          are waiting for projects of their own. Choose one to play it above.
        </p>

        <div className="j-mosaic j-gallery">
          {GALLERY.map((id, i) => {
            const e = EFFECT_INFO[id]
            return (
              <EffectCard
                key={id}
                effect={id}
                c={constantForEffect(e.constant, id)}
                slug={id}
                live={false}
                href={`#${id}`}
                onClick={(ev) => {
                  ev.preventDefault()
                  chooseEffect(id)
                  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
                }}
                className={[
                  'j-card j-tile',
                  // two wide tiles up front, so 22 tiles fill the rows of four
                  i < 2 ? 'j-tile-wide' : '',
                  id === current ? 'j-tile-on' : '',
                ].join(' ')}
              >
                <span className="j-card-scrim" aria-hidden="true" />
                <span className="j-card-body">
                  {e.credit && (
                    <span className="j-chips">
                      <span className="j-chip">after swaptube</span>
                    </span>
                  )}
                  <span className="j-card-title">{e.name}</span>
                  <span className="j-card-summary">{e.blurb}</span>
                </span>
              </EffectCard>
            )
          })}
        </div>

        <section className="j-credits" aria-labelledby="j-credits-h">
          <h2 className="j-h2" id="j-credits-h">
            Credits
          </h2>
          <p className="j-prose">
            The effects marked after swaptube follow the mathematics of{' '}
            <a href="https://github.com/2swap/swaptube">swaptube</a>, the renderer 2swap makes his
            videos with, which he has released into the public domain. These are browser rewrites,
            not his code; the repository sits beside this site&rsquo;s source for reference.
          </p>
          <ul className="j-credit-list">
            {GALLERY.filter((id) => EFFECT_INFO[id].credit).map((id) => (
              <li key={id}>
                <span>{EFFECT_INFO[id].name}</span>
                <span className="j-meta">{EFFECT_INFO[id].credit}</span>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </>
  )
}
