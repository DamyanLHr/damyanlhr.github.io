import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'
import { REEL_REPEAT, useReel } from '../../shared/useReel'

// The theme button, julia's way: a quiet pill in the bar, and a reel of
// obsidian film behind a window ticked with ember sprockets. Pointing at a
// name runs the strip to that world; the random pick spins it and lets it
// slow into the winner.

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu, { reel: true })
  const reel = useReel(m, menu.entries.length)
  const active = menu.entries.find((e) => e.id === menu.activeId)
  const shown = menu.entries[m.shown] ?? active
  return (
    <div className="j-theme" {...m.rootProps}>
      <button className="j-theme-trigger" {...m.triggerProps}>
        <span className="j-theme-label">Theme</span>
        <span className="j-theme-name">{active?.name}</span>
      </button>
      {m.open && (
        <div className="j-theme-panel" {...m.panelProps}>
          <div className="j-theme-reel" ref={reel.windowRef} aria-hidden="true">
            <div className="j-theme-strip" ref={reel.stripRef}>
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
            <span className="j-theme-window" />
          </div>
          <div className="j-theme-side">
            <ul {...m.menuProps}>
              {menu.entries.map((e, i) => (
                <li key={e.id} role="none">
                  <button className="j-theme-item" {...m.itemProps(i)}>
                    <span>{e.name}</span>
                    {e.id === menu.activeId && <span className="j-theme-now">current</span>}
                    <span className="j-sr">{e.description}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="j-theme-caption" aria-hidden="true">
              {shown?.description}
            </p>
            <p className="j-theme-hint">Press Theme again to spin for a random one.</p>
          </div>
        </div>
      )}
      <span className="j-sr" role="status" aria-live="polite">
        {m.status}
      </span>
    </div>
  )
}
