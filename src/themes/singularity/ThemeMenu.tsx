import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'
import { REEL_REPEAT, useReel } from '../../shared/useReel'

// The theme button, singularity's way: the content panels' smoked glass, and a
// strip of worlds lit from behind running past a viewport. The random pick
// spins it; the viewport flares with ember light on the world it lands on.

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu, { reel: true })
  const reel = useReel(m, menu.entries.length)
  const active = menu.entries.find((e) => e.id === menu.activeId)
  const shown = menu.entries[m.shown] ?? active
  return (
    <div className="s-theme" {...m.rootProps}>
      <button className="s-theme-trigger" {...m.triggerProps}>
        <span className="s-theme-label">Theme</span>
        <span>{active?.name}</span>
      </button>
      {m.open && (
        <div className="s-theme-panel" {...m.panelProps}>
          <div className="s-theme-reel" ref={reel.windowRef} aria-hidden="true">
            <div className="s-theme-strip" ref={reel.stripRef}>
              {Array.from({ length: REEL_REPEAT }, (_, lap) =>
                menu.entries.map((e) => (
                  <img
                    key={`${lap}-${e.id}`}
                    src={e.preview}
                    alt=""
                    width={320}
                    height={200}
                    decoding="async"
                  />
                )),
              )}
            </div>
            <span className="s-theme-port" />
          </div>
          <div className="s-theme-side">
            <ul {...m.menuProps}>
              {menu.entries.map((e, i) => (
                <li key={e.id} role="none">
                  <button className="s-theme-item" {...m.itemProps(i)}>
                    <span>{e.name}</span>
                    {e.id === menu.activeId && <em>inside now</em>}
                    <span className="s-sr">{e.description}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="s-theme-caption" aria-hidden="true">
              {shown?.description}
            </p>
            <p className="s-theme-hint">Press Theme again to fall into a random one.</p>
          </div>
        </div>
      )}
      <span className="s-sr" role="status" aria-live="polite">
        {m.status}
      </span>
    </div>
  )
}
