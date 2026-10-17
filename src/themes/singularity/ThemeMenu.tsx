import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'

// The theme button, singularity's way: the content panels' smoked glass, with
// a viewport onto the world you point at, rimmed in ember light. During the
// random pick the viewport cuts between worlds and flares on the one it lands.

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu)
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
          <figure className="s-theme-lens" aria-hidden="true">
            <span className="s-theme-port">
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
              <span className="s-theme-lens-name">{shown?.name}</span>
              <span className="s-theme-lens-desc">{shown?.description}</span>
            </figcaption>
          </figure>
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
