import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
// metadata only: years, team sizes and tool lists get lining figures that line up
import '@fontsource/ibm-plex-mono/400.css'
import { useLayoutEffect, useRef, useState } from 'react'
import type { ThemeProps } from '../../shared/theme-contract'
import { routePath } from '../../shared/routes'
import { FEATURES } from '../../content/meta'
import { Backdrop } from './Backdrop'
import { createStageBus } from './stage-bus'
import { Gallery } from './Gallery'
import { GALLERY_SLUG } from './gallery-slug'
import { ThemeMenu } from './ThemeMenu'
import { Cv, Home, Interests, InternalLink, NotFound, ProjectPage, ProjectsIndex } from './views'
import './julia.css'

// `julia` — the 2D-fractal floor theme, direction A "obsidian gallery" (Gate 2a):
// near-black, ember accent, Space Grotesk, real canvas-rendered Julia sets, and the
// fractal palette as the interaction language. One Julia set lives behind every
// page (Backdrop) and travels between them; each page only gives it a pose.

const NAV = [
  { to: '/cv', label: 'CV' },
  { to: '/projects', label: 'Projects' },
  { to: '/interests', label: 'Interests' },
].filter((n) => n.to !== '/interests' || FEATURES.interests)

export function Root({ content, route, navigate, themeMenu }: ThemeProps) {
  const path = routePath(route)
  const [bus] = useState(createStageBus)
  // Where we came from: a project opened from the projects page waits for the
  // set to arrive before its text rises.
  const previous = useRef<string | null>(null)
  const late = route.kind === 'project' && previous.current === 'projects'

  // Every page opens at its top. The band pages scroll the stage with them,
  // so a page that opened part way down would open with its set off screen.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    previous.current = route.kind
  }, [path, route.kind])

  return (
    <div className="julia">
      <Backdrop route={route} content={content} bus={bus} />
      <header className="j-nav">
        <InternalLink to="/" navigate={navigate} className="j-mark">
          DH
        </InternalLink>
        <div className="j-nav-right">
          <nav aria-label="Sections">
            {NAV.map((n) => (
              <InternalLink
                key={n.to}
                to={n.to}
                navigate={navigate}
                className={path.startsWith(n.to) ? 'j-nav-link j-active' : 'j-nav-link'}
              >
                {n.label}
              </InternalLink>
            ))}
          </nav>
          <ThemeMenu menu={themeMenu} />
        </div>
      </header>

      {route.kind === 'home' && <Home content={content} navigate={navigate} />}
      {route.kind === 'cv' && <Cv content={content} navigate={navigate} />}
      {route.kind === 'projects' && (
        <ProjectsIndex content={content} navigate={navigate} bus={bus} />
      )}
      {route.kind === 'project' && route.slug === GALLERY_SLUG && <Gallery navigate={navigate} />}
      {route.kind === 'project' && route.slug !== GALLERY_SLUG && (
        <ProjectPage content={content} slug={route.slug} navigate={navigate} late={late} />
      )}
      {route.kind === 'interests' && <Interests content={content} />}
      {route.kind === 'notFound' && <NotFound path={route.path} navigate={navigate} />}

      {route.kind !== 'home' && (
        <footer className="j-foot">
          <span>{content.profile.name}</span>
          <span className="j-foot-links">
            {content.profile.socials.map((s) => (
              <a key={s.url} href={s.url}>
                {s.label}
              </a>
            ))}
          </span>
        </footer>
      )}
    </div>
  )
}
