import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'

// The theme button, singularity's way: the same smoked glass as the content
// panels, floating over the bulb, with ember light marking where the roulette
// has got to.

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu)
  const active = menu.entries.find((e) => e.id === menu.activeId)
  return (
    <div className="s-theme" {...m.rootProps}>
      <button className="s-theme-trigger" {...m.triggerProps}>
        <span className="s-theme-label">Theme</span>
        <span>{active?.name}</span>
      </button>
      {m.open && (
        <div className="s-theme-panel" {...m.panelProps}>
          <ul {...m.menuProps}>
            {menu.entries.map((e, i) => (
              <li key={e.id} role="none">
                <button className="s-theme-item" {...m.itemProps(i)}>
                  <img src={e.preview} alt="" width={112} height={70} decoding="async" />
                  <span className="s-theme-text">
                    <span className="s-theme-name">
                      {e.name}
                      {e.id === menu.activeId && <em>inside now</em>}
                    </span>
                    <span className="s-theme-desc">{e.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="s-theme-hint">Press Theme again to fall into a random one.</p>
        </div>
      )}
      <span className="s-sr" role="status" aria-live="polite">
        {m.status}
      </span>
    </div>
  )
}
