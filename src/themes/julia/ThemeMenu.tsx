import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'

// The theme button, julia's way: a quiet pill in the bar, and a panel that is
// mostly picture. One large plate shows whichever world you point at; the
// names sit beside it as a short index. During the random pick the plate cuts
// from world to world and settles on the winner.

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu)
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
          <figure className="j-theme-lens" aria-hidden="true">
            <span className="j-theme-plate">
              {menu.entries.map((e, i) => (
                <img
                  key={e.id}
                  src={e.preview}
                  alt=""
                  width={360}
                  height={225}
                  decoding="async"
                  data-shown={m.shown === i || undefined}
                />
              ))}
            </span>
            <figcaption>
              <span className="j-theme-lens-name">{shown?.name}</span>
              <span className="j-theme-lens-desc">{shown?.description}</span>
            </figcaption>
          </figure>
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
            <p className="j-theme-hint">Press Theme again for a random one.</p>
          </div>
        </div>
      )}
      <span className="j-sr" role="status" aria-live="polite">
        {m.status}
      </span>
    </div>
  )
}
