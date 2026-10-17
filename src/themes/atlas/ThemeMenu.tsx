import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'

// The theme button, atlas's way: one more entry in the ruled index, under its
// own rubric heading. It opens a catalogue: the plate you point at, engraved
// large in a double-ruled frame with its caption beneath, beside a numbered
// list of plates. The roulette's cursor is a printer's hand.

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu)
  const active = menu.entries.find((e) => e.id === menu.activeId)
  const shown = menu.entries[m.shown] ?? active
  const no = NUMERALS[m.shown] ?? String(m.shown + 1)
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
          <div className="a-theme-body">
            <figure className="a-theme-lens" aria-hidden="true">
              <span className="a-theme-plate">
                {menu.entries.map((e, i) => (
                  <img
                    key={e.id}
                    src={e.preview}
                    alt=""
                    width={340}
                    height={212}
                    decoding="async"
                    data-shown={m.shown === i || undefined}
                  />
                ))}
              </span>
              <figcaption>
                <span className="a-theme-cap">
                  Plate {no}. {shown?.name}
                </span>
                <span className="a-theme-desc">{shown?.description}</span>
              </figcaption>
            </figure>
            <ul {...m.menuProps}>
              {menu.entries.map((e, i) => (
                <li key={e.id} role="none">
                  <button className="a-theme-item" {...m.itemProps(i)}>
                    <span className="a-theme-hand" aria-hidden="true">
                      ☞
                    </span>
                    <span className="a-theme-no">{NUMERALS[i] ?? i + 1}.</span>
                    <span className="a-theme-name">{e.name}</span>
                    <span className="a-sr">
                      {e.id === menu.activeId ? ' (this plate). ' : '. '}
                      {e.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="a-theme-foot">Press the plate name again to be sent to one at random.</p>
        </div>
      )}
      <span className="a-sr" role="status" aria-live="polite">
        {m.status}
      </span>
    </div>
  )
}
