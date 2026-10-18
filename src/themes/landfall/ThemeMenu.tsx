import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'
import { REEL_REPEAT, useReel } from '../../shared/useReel'

// The theme button, landfall's way. It wears the island's own marker (a glass
// pill with a dot), because that is the one control a visitor here has already
// learned to press. It opens on a stack of postcards, one per world, sliding
// behind a slot labelled like a town on the map; the random pick riffles the
// stack and lets it settle.

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu, { reel: true })
  const reel = useReel(m, menu.entries.length)
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
          <div className="lf-theme-reel" ref={reel.windowRef} aria-hidden="true">
            <div className="lf-theme-strip" ref={reel.stripRef}>
              {Array.from({ length: REEL_REPEAT }, (_, lap) =>
                menu.entries.map((e) => (
                  <span className="lf-theme-card" key={`${lap}-${e.id}`}>
                    <img src={e.preview} alt="" width={320} height={200} decoding="async" />
                  </span>
                )),
              )}
            </div>
            <span className="lf-theme-slot">
              <span className="lf-theme-tag">
                <i />
                {m.rolling && !m.landed ? '…' : shown?.name}
              </span>
            </span>
          </div>
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
            <p className="lf-theme-caption" aria-hidden="true">
              {shown?.description}
            </p>
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
