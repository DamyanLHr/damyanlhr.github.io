import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import { FEATURES } from '../../content/meta'
import type { InterestSection, Project, SiteContent } from '../../content/types'
import type { ThemeProps } from '../../shared/theme-contract'
import { FractalCanvas } from './FractalCanvas'
import { EffectCard } from './EffectCard'
import type { StageBus } from './stage-bus'
import { EFFECT_INFO } from './effects/registry'
import { GALLERY_SLUG } from './gallery-slug'
import { effectConstant, effectFor, paramsFor } from './fractal'
import { SocialLink } from '../../shared/social-icons'

type Nav = ThemeProps['navigate']

export function InternalLink({
  to,
  navigate,
  className,
  children,
  current,
}: {
  to: string
  navigate: Nav
  className?: string
  children: ReactNode
  /** marks the link as the page you are on */
  current?: boolean
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigate(to)
  }
  return (
    <a
      href={to}
      className={className}
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
    >
      {children}
    </a>
  )
}

export function Home({ content, navigate }: { content: SiteContent; navigate: Nav }) {
  return (
    <section className="j-home">
      <div className="j-home-scrim" aria-hidden="true" />
      <div className="j-home-copy j-enter">
        <p className="j-eyebrow">{content.profile.tagline}</p>
        <h1 className="j-title">
          Damyan
          <br />
          Hristov
        </h1>
        <p className="j-sub">
          Game development, engines and graphics. Computer Science and Engineering at TU/e, class of
          2027.
        </p>
        <nav className="j-big-links" aria-label="Sections">
          <InternalLink to="/cv" navigate={navigate}>
            CV
          </InternalLink>
          <InternalLink to="/projects" navigate={navigate}>
            Projects
          </InternalLink>
          {FEATURES.interests && (
            <InternalLink to="/interests" navigate={navigate}>
              Interests
            </InternalLink>
          )}
        </nav>
        <div className="j-socials">
          {content.profile.socials.map((s) => (
            <SocialLink key={s.url} link={s} />
          ))}
        </div>
      </div>
      {content.announcements.length > 0 && (
        <InternalLink to="/projects" navigate={navigate} className="j-ticker">
          <span className="j-ticker-tag">Up next</span>
          <span className="j-ticker-items">
            {content.announcements.map((a) => a.title).join('  ·  ')}
          </span>
        </InternalLink>
      )}
    </section>
  )
}

export function Cv({ content, navigate }: { content: SiteContent; navigate: Nav }) {
  const { cv } = content
  return (
    <section className="j-page j-enter">
      <header className="j-page-head">
        <p className="j-print-only j-print-name">
          {content.profile.name} · {content.profile.url.replace(/^https?:\/\//, '')}
        </p>
        <h1>CV</h1>
        <div className="j-cv-actions">
          {content.profile.cvPdf && (
            <a className="j-btn j-btn-primary" href={content.profile.cvPdf} download>
              Download CV (PDF)
            </a>
          )}
          {content.profile.email && <Email address={content.profile.email} />}
        </div>
      </header>

      <h2 className="j-h2">Education</h2>
      {cv.education.map((e) => (
        <article className="j-entry" key={e.school}>
          <h3>{e.program}</h3>
          <p className="j-meta">
            {e.school} · {e.location} · {e.start} to {e.end}
          </p>
          <ul>
            {e.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </article>
      ))}

      <h2 className="j-h2">Experience</h2>
      {cv.experience.map((e) => (
        <article className="j-entry" key={e.company}>
          <h3>
            {e.role} · {e.company}
          </h3>
          <p className="j-meta">
            {e.start} to {e.end}
            {e.teamSize ? ` · team of ~${e.teamSize}` : ''}
            {e.tools.length > 0 ? ` · ${e.tools.join(', ')}` : ''}
          </p>
          <p>{e.summary}</p>
          <ul>
            {e.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          {e.links.map((l) => (
            <a className="j-out" key={l.url} href={l.url}>
              {l.label}
            </a>
          ))}
        </article>
      ))}

      <h2 className="j-h2">Plans</h2>
      <p className="j-prose">{cv.plans}</p>

      <h2 className="j-h2">Proficiencies</h2>
      <p className="j-prose">
        {cv.proficiencies.spoken.map((s) => `${s.language} (${s.level})`).join(' · ')}
      </p>
      <div className="j-profs">
        {[...cv.proficiencies.programming, ...cv.proficiencies.expanding].map((p) => (
          <article className="j-entry" key={p.name}>
            <h3>{p.name}</h3>
            <p>{p.evidence}</p>
            <p className="j-meta">
              proven by:{' '}
              {p.projectSlugs.map((slug, i) => (
                <span key={slug}>
                  {i > 0 && ' · '}
                  <InternalLink to={`/projects/${slug}`} navigate={navigate}>
                    {content.projects.find((pr) => pr.slug === slug)?.title ?? slug}
                  </InternalLink>
                </span>
              ))}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

// Mosaic weights for the four-column grid, in roster order, so every row fills
// exactly: (2+1+1)(1+2+1)(1+2+1). A slug missing here falls back to 1, which
// can leave a ragged row, so this map moves whenever a project is added.
const CARD_SPAN: Record<string, number> = {
  'this-site': 2,
  'dont-break-glass': 1,
  'kill-bunny': 1,
  'five-more-minutes': 1,
  'digital-twinning-suspension': 2,
  'blood-of-hedon': 1,
  'olympian-onslaught': 1,
  // the flyover needs room to read as a landscape
  'extensible-terrain-generation': 2,
  'barca-doro': 1,
}

const CHIP: Record<Project['category'], string> = {
  personal: 'personal',
  jam: 'game jam',
  university: 'university',
}

/** Released work first, in roster order, then what is in progress. */
function roster(content: SiteContent) {
  const released = content.projects.filter((p) => p.status === 'released')
  const coming = content.projects.filter((p) => p.status !== 'released')
  return [...released, ...coming]
}

export function ProjectsIndex({
  content,
  navigate,
  bus,
}: {
  content: SiteContent
  navigate: Nav
  bus: StageBus
}) {
  const projects = roster(content)
  const [liveSlug, setLiveSlug] = useState<string | null>(null)
  const mosaic = useRef<HTMLDivElement>(null)
  const timers = useRef({ intent: 0, leave: 0 })

  // Pointing at a card sends the band's set to that card's constant after a
  // short intent, so sweeping across the grid does not set it running about.
  const point = (p: Project, on: boolean) => {
    const t = timers.current
    window.clearTimeout(t.intent)
    window.clearTimeout(t.leave)
    if (on) t.intent = window.setTimeout(() => bus.preview(effectConstant(p)), 120)
    else t.leave = window.setTimeout(() => bus.preview(null), 600)
  }
  useEffect(() => {
    const t = timers.current
    return () => {
      window.clearTimeout(t.intent)
      window.clearTimeout(t.leave)
    }
  }, [])

  // On a phone nothing hovers, so the card in the middle of the screen is the
  // live one, and it changes as you scroll.
  useEffect(() => {
    const grid = mosaic.current
    if (!grid || window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setLiveSlug((e.target as HTMLElement).dataset.slug ?? null)
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    grid.querySelectorAll('.j-card').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div className="j-band" aria-hidden="true" />
      <section className="j-page j-page-wide j-enter">
        <header className="j-page-head j-page-head-tabs">
          <h1>Projects</h1>
          <WorkTabs current="work" navigate={navigate} />
        </header>

        <div className="j-mosaic" ref={mosaic}>
          {projects.map((p) => {
            const coming = p.status !== 'released'
            const to = `/projects/${p.slug}`
            return (
              <EffectCard
                key={p.slug}
                effect={effectFor(p)}
                c={effectConstant(p)}
                slug={p.slug}
                live={liveSlug === p.slug}
                onPoint={(on) => point(p, on)}
                href={to}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(to)
                }}
                className={`j-card j-span-${CARD_SPAN[p.slug] ?? 1}`}
              >
                <span className="j-card-scrim" aria-hidden="true" />
                <span className="j-card-body">
                  <span className="j-chips">
                    {coming && <span className="j-chip j-chip-soon">in progress</span>}
                    <span className="j-chip">{CHIP[p.category]}</span>
                    {/* The disclosure travels with the card, not just the page it
                        links to: a reader who never opens the project still sees it. */}
                    {p.builtWithAI && <span className="j-chip j-chip-ai">built with AI</span>}
                  </span>
                  <span className="j-card-title">{p.title}</span>
                  <span className="j-meta">
                    {[p.year, p.event, p.role].filter(Boolean).join(' · ')}
                  </span>
                  <span className="j-card-summary">{p.summary}</span>
                </span>
              </EffectCard>
            )
          })}
        </div>
      </section>
    </>
  )
}

/**
 * An email address as text you can select, with a button that copies it. A
 * bare mailto link does nothing for anyone without a mail app set up, which
 * is most people on a laptop.
 */
export function Email({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  const text = useRef<HTMLSpanElement>(null)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // no clipboard: select the address so a copy shortcut works
      const r = document.createRange()
      if (text.current) r.selectNodeContents(text.current)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(r)
    }
  }
  return (
    <span className="j-email">
      <span ref={text} className="j-email-address">
        {address}
      </span>
      <button type="button" className="j-email-copy" onClick={copy} aria-live="polite">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  )
}

/** Work and Gallery: the two halves of the projects section, in this theme. */
export function WorkTabs({ current, navigate }: { current: 'work' | 'gallery'; navigate: Nav }) {
  return (
    <nav className="j-tabs" aria-label="Projects">
      <InternalLink
        to="/projects"
        navigate={navigate}
        className={current === 'work' ? 'j-tab j-tab-on' : 'j-tab'}
        current={current === 'work'}
      >
        Work
      </InternalLink>
      <InternalLink
        to={`/projects/${GALLERY_SLUG}`}
        navigate={navigate}
        className={current === 'gallery' ? 'j-tab j-tab-on' : 'j-tab'}
        current={current === 'gallery'}
      >
        Gallery
      </InternalLink>
    </nav>
  )
}

export function ProjectPage({
  content,
  slug,
  navigate,
}: {
  content: SiteContent
  slug: string
  navigate: Nav
}) {
  const project = content.projects.find((p) => p.slug === slug)
  if (!project) return <NotFound path={`/projects/${slug}`} navigate={navigate} />
  const facts: [string, string][] = []
  if (project.year) facts.push(['Year', String(project.year)])
  if (project.event) facts.push(['Where', project.event])
  if (project.role) facts.push(['Role', project.role])
  if (project.duration) facts.push(['Duration', project.duration])
  if (project.team?.size) facts.push(['Team', `${project.team.size} people`])
  if (project.tools.length > 0) facts.push(['Tools', project.tools.join(', ')])
  const note = EFFECT_INFO[effectFor(project)]
  return (
    <>
      <div className="j-band j-band-tall">
        <p className="j-band-note">
          <span className="j-band-name">{note.name}</span>
          <span className="j-band-how j-how-pointer">{note.pointer}</span>
          <span className="j-band-how j-how-touch">{note.touch}</span>
        </p>
      </div>
      <section className="j-project j-enter">
        <div className="j-rail">
          <InternalLink to="/projects" navigate={navigate} className="j-back">
            &larr; all projects
          </InternalLink>
          <h1 className="j-project-title">{project.title}</h1>
          <span className="j-chips">
            {project.status !== 'released' && (
              <span className="j-chip j-chip-soon">in progress</span>
            )}
            <span className="j-chip">{CHIP[project.category]}</span>
            {project.builtWithAI && <span className="j-chip j-chip-ai">built with AI</span>}
          </span>
          <div className="j-actions">
            {project.links.map((l, i) => (
              <a key={l.url} href={l.url} className={i === 0 ? 'j-btn j-btn-primary' : 'j-btn'}>
                {l.label}
              </a>
            ))}
            {project.links.length === 0 && <p className="j-meta">links land here once it ships</p>}
          </div>
          <dl className="j-facts">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="j-story">
          {project.builtWithAI && <p className="j-ai-flag">Built with AI</p>}
          <p className="j-lead">{project.summary}</p>
          {project.body && (
            <div className="j-body">
              <Markdown>{project.body}</Markdown>
            </div>
          )}
          {project.team?.members && (
            <p className="j-meta">with {project.team.members.join(', ')}</p>
          )}
        </div>
      </section>
    </>
  )
}

export function Interests({ content }: { content: SiteContent }) {
  return (
    <section className="j-page j-enter">
      <header className="j-page-head">
        <h1>Interests</h1>
      </header>
      <div className="j-interests">
        {content.interests.map((section: InterestSection, i: number) => (
          <article className="j-interest" key={section.id}>
            <FractalCanvas
              params={{ ...paramsFor(section.id, i * 3 + 1), maxIter: 90 }}
              live="bloom"
              className="j-interest-wash"
            />
            <h2>{section.title}</h2>
            <p>{section.body}</p>
            {section.links.map((l) => (
              <a className="j-out" key={l.url} href={l.url}>
                {l.label}
              </a>
            ))}
          </article>
        ))}
      </div>
    </section>
  )
}

export function NotFound({ path, navigate }: { path: string; navigate: Nav }) {
  return (
    <section className="j-page j-enter j-404">
      <h1>Nothing at this address</h1>
      <p className="j-meta">{path} escaped the set.</p>
      <InternalLink to="/" navigate={navigate} className="j-btn j-btn-primary">
        Back home
      </InternalLink>
    </section>
  )
}
