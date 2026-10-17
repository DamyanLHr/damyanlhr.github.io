import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'

// The theme button, debug's way: it looks like what it is, a value you can
// change. The list shows the facts the menu runs on (id, whether this device
// can run it); the preview of the entry under the cursor sits beside it, and
// the roulette cursor is a `>`.

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu)
  const shown = menu.entries[m.shown]
  return (
    <div className="debug-theme" {...m.rootProps}>
      <button className="debug-theme-trigger" {...m.triggerProps}>
        theme = <span>&quot;{menu.activeId}&quot;</span>
      </button>
      {m.open && (
        <div className="debug-theme-panel" {...m.panelProps}>
          <ul {...m.menuProps}>
            {menu.entries.map((e, i) => (
              <li key={e.id} role="none">
                <button className="debug-theme-item" {...m.itemProps(i)}>
                  <span className="debug-theme-cursor" aria-hidden="true">
                    &gt;
                  </span>
                  <span>
                    {e.id}
                    {e.id === menu.activeId && <span className="debug-dim"> (active)</span>}
                    {!e.runnable && <span className="debug-dim"> (unsupported here)</span>}
                  </span>
                  <span className="debug-sr">{e.description}</span>
                </button>
              </li>
            ))}
          </ul>
          <figure className="debug-theme-lens" aria-hidden="true">
            {menu.entries.map((e, i) => (
              <img
                key={e.id}
                src={e.preview}
                alt=""
                width={240}
                height={150}
                decoding="async"
                data-shown={m.shown === i || undefined}
              />
            ))}
            <figcaption className="debug-dim">{shown?.description}</figcaption>
          </figure>
          <p className="debug-dim debug-theme-hint">activate the trigger again: random pick</p>
        </div>
      )}
      <span className="debug-sr" role="status" aria-live="polite">
        {m.status}
      </span>
    </div>
  )
}
