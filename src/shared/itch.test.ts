import { describe, expect, it } from 'vitest'
import { itchWidgetSrc } from './itch'

describe('itchWidgetSrc', () => {
  it('passes the theme’s colours as itch.io expects them, without the #', () => {
    const src = itchWidgetSrc(4427662, {
      bg: '#101216',
      fg: '#ECE9E4',
      link: 'ff6a00',
      border: '#2a2c30',
    })
    const url = new URL(src)
    expect(url.origin + url.pathname).toBe('https://itch.io/embed/4427662')
    expect(url.searchParams.get('bg_color')).toBe('101216')
    expect(url.searchParams.get('fg_color')).toBe('ece9e4')
    expect(url.searchParams.get('link_color')).toBe('ff6a00')
    expect(url.searchParams.get('border_color')).toBe('2a2c30')
  })
})
