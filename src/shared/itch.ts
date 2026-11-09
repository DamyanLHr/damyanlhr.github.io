// itch.io's store widget, tinted: its embed page takes the card's colours as
// query parameters, so each theme can make it its own.

/** The widget's colours, as hex (with or without the #). */
export interface WidgetPalette {
  bg: string
  fg: string
  link: string
  border: string
}

/** itch.io's store widget in the theme's colours. */
export function itchWidgetSrc(id: number, p: WidgetPalette): string {
  const hex = (c: string) => c.replace(/^#/, '').toLowerCase()
  const q = new URLSearchParams({
    bg_color: hex(p.bg),
    fg_color: hex(p.fg),
    link_color: hex(p.link),
    border_color: hex(p.border),
  })
  return `https://itch.io/embed/${id}?${q}`
}
