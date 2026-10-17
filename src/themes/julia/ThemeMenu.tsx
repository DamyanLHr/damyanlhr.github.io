import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'

// The theme button, julia's way: a quiet pill in the bar, an obsidian panel that
// grows out of it, ember only where something is actually happening.

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu)
  const active = menu.entries.find((e) => e.id === menu.activeId)
  return (
    <div className="j-theme" {...m.rootProps}>
      <button className="j-theme-trigger" {...m.triggerProps}>
        <span className="j-theme-label">Theme</span>
        <span className="j-theme-name">{active?.name}</span>
      </button>
      {m.open && (
        <div className="j-theme-panel" {...m.panelProps}>
          <ul {...m.menuProps}>
            {menu.entries.map((e, i) => (
              <li key={e.id} role="none">
                <button className="j-theme-item" {...m.itemProps(i)}>
                  <img src={e.preview} alt="" width={112} height={70} decoding="async" />
                  <span className="j-theme-text">
                    <span className="j-theme-item-name">
                      {e.name}
                      {e.id === menu.activeId && <span className="j-theme-now">current</span>}
                    </span>
                    <span className="j-theme-desc">{e.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="j-theme-hint">Press Theme again for a random one.</p>
        </div>
      )}
      <span className="j-sr" role="status" aria-live="polite">
        {m.status}
      </span>
    </div>
  )
}
