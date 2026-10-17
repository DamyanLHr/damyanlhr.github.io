import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'

// The theme button, landfall's way. It wears the island's own marker (a glass
// pill with a dot), because that is the one control a visitor here has already
// learned to press, and the list opens as the same glass the hero card is made
// of. The roulette cursor is the "you are here" ring the keyboard tour uses.

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu)
  const active = menu.entries.find((e) => e.id === menu.activeId)
  return (
    <div className="lf-theme" {...m.rootProps}>
      <button className="lf-theme-trigger" {...m.triggerProps}>
        <i aria-hidden="true" />
        <span className="lf-theme-label">Theme</span>
        <span>{active?.name}</span>
      </button>
      {m.open && (
        <div className="lf-theme-panel" {...m.panelProps}>
          <ul {...m.menuProps}>
            {menu.entries.map((e, i) => (
              <li key={e.id} role="none">
                <button className="lf-theme-item" {...m.itemProps(i)}>
                  <img src={e.preview} alt="" width={104} height={65} decoding="async" />
                  <span className="lf-theme-text">
                    <span className="lf-theme-name">
                      {e.name}
                      {e.id === menu.activeId && <em>you are here</em>}
                    </span>
                    <span className="lf-theme-desc">{e.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="lf-theme-hint">Press Theme again to land somewhere at random.</p>
        </div>
      )}
      <span className="lf-sr" role="status" aria-live="polite">
        {m.status}
      </span>
    </div>
  )
}
