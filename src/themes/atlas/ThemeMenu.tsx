import { useThemeMenu, type ThemeMenu as Menu } from '../../shared/theme-menu'
import { REEL_REPEAT, useReel } from '../../shared/useReel'

// The theme button, atlas's way: one more entry in the ruled index, under its
// own rubric heading. It opens a folio: engraved plates turning past a frame,
// printed in sepia, with a numbered list beside them and a printer's hand on
// the plate in view. The plate the random pick stops on comes up in full
// colour with a rubric frame.

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export function ThemeMenu({ menu }: { menu: Menu }) {
  const m = useThemeMenu(menu, { reel: true })
  const reel = useReel(m, menu.entries.length)
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
          <p className="a-theme-head">A folio of the plates</p>
          <div className="a-theme-body">
            <div className="a-theme-folio">
              <div className="a-theme-reel" ref={reel.windowRef} aria-hidden="true">
                <div className="a-theme-strip" ref={reel.stripRef}>
                  {Array.from({ length: REEL_REPEAT }, (_, lap) =>
                    menu.entries.map((e) => (
                      <span className="a-theme-plate" key={`${lap}-${e.id}`}>
                        <img src={e.preview} alt="" width={300} height={188} decoding="async" />
                      </span>
                    )),
                  )}
                </div>
                <span className="a-theme-frame" />
              </div>
              <p className="a-theme-cap" aria-hidden="true">
                {m.rolling && !m.landed ? ' ' : `Plate ${no}. ${shown?.name}`}
              </p>
              <p className="a-theme-desc" aria-hidden="true">
                {m.rolling && !m.landed ? ' ' : shown?.description}
              </p>
            </div>
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
          <p className="a-theme-foot">Press the plate name again to turn to one at random.</p>
        </div>
      )}
      <span className="a-sr" role="status" aria-live="polite">
        {m.status}
      </span>
    </div>
  )
}
