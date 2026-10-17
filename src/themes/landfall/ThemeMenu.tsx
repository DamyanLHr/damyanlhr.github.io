import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'

// The theme button, landfall's way. It wears the island's own marker (a glass
// pill with a dot), because that is the one control a visitor here has already
// learned to press. The panel is the hero card's glass holding a postcard of
// the world you point at, labelled with a marker like a town on the map; the
// list beside it is the places you could sail to.

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu)
  const active = menu.entries.find((e) => e.id === menu.activeId)
  const shown = menu.entries[m.shown] ?? active
  return (
    <div className="lf-theme" {...m.rootProps}>
      <button className="lf-theme-trigger" {...m.triggerProps}>
        <i aria-hidden="true" />
        <span className="lf-theme-label">Theme</span>
        <span>{active?.name}</span>
      </button>
      {m.open && (
        <div className="lf-theme-panel" {...m.panelProps}>
          <figure className="lf-theme-lens" aria-hidden="true">
            <span className="lf-theme-card">
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
              <span className="lf-theme-tag">
                <i />
                {shown?.name}
              </span>
            </span>
            <figcaption>{shown?.description}</figcaption>
          </figure>
          <div className="lf-theme-side">
            <ul {...m.menuProps}>
              {menu.entries.map((e, i) => (
                <li key={e.id} role="none">
                  <button className="lf-theme-item" {...m.itemProps(i)}>
                    <i aria-hidden="true" />
                    <span>{e.name}</span>
                    {e.id === menu.activeId && <em>you are here</em>}
                    <span className="lf-sr">{e.description}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="lf-theme-hint">Press Theme again to land somewhere at random.</p>
          </div>
        </div>
      )}
      <span className="lf-sr" role="status" aria-live="polite">
        {m.status}
      </span>
    </div>
  )
}
