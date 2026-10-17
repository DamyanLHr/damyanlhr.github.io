import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'

// The theme button, atlas's way: one more entry in the ruled index, under its
// own rubric heading, and the other worlds laid out as a catalogue of plates
// with engraved frames. The roulette's cursor is a printer's hand.

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu)
  const active = menu.entries.find((e) => e.id === menu.activeId)
  return (
    <div className="a-theme" {...m.rootProps}>
      <p className="a-index-tag" aria-hidden="true">
        PLATES
      </p>
      <button className="a-theme-trigger" {...m.triggerProps}>
        <span className="a-sr">Theme: </span>
        {active?.name}
      </button>
      {m.open && (
        <div className="a-theme-panel" {...m.panelProps}>
          <p className="a-theme-head">A catalogue of the plates</p>
          <ul {...m.menuProps}>
            {menu.entries.map((e, i) => (
              <li key={e.id} role="none">
                <button className="a-theme-item" {...m.itemProps(i)}>
                  <span className="a-theme-hand" aria-hidden="true">
                    ☞
                  </span>
                  <span className="a-theme-plate">
                    <img src={e.preview} alt="" width={120} height={75} decoding="async" />
                  </span>
                  <span className="a-theme-text">
                    <span className="a-theme-name">
                      <span className="a-theme-no">{NUMERALS[i] ?? i + 1}.</span> {e.name}
                      {e.id === menu.activeId && <em> (this plate)</em>}
                    </span>
                    <span className="a-theme-desc">{e.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="a-theme-foot">Press the plate name again to be sent to one at random.</p>
        </div>
      )}
      <span className="a-sr" role="status" aria-live="polite">
        {m.status}
      </span>
    </div>
  )
}
