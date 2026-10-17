import type { ComponentType } from 'react'
import type { SiteContent } from '../content/types'
import type { Route } from './routes'
import type { ThemeMenu } from './theme-menu'

// The theme contract (TECHNOLOGY.md §3.2). A theme owns 100% of presentation; it
// receives the whole content model + current route and builds its own world.
// Themes may import content/ and shared/ — never another theme, never the shell.

export interface Requirements {
  webgpu?: boolean
  webgl2?: boolean
  /** Requires the visitor NOT to prefer reduced motion and NOT to request data saving. */
  motionOK?: boolean
  minDeviceMemoryGB?: number
  finePointer?: boolean
}

export interface ThemeProps {
  content: SiteContent
  route: Route
  navigate: (path: string) => void
  /**
   * Every listed theme plus how to switch. Each theme MUST render a theme
   * button in its own top bar, in its own visual language, driven by
   * `useThemeMenu` from shared/theme-menu (docs/ADDING-A-THEME.md).
   */
  themeMenu: ThemeMenu
}

export interface ThemeModule {
  Root: ComponentType<ThemeProps>
}

export interface ThemeDescriptor {
  id: string
  /** Label in the theme switcher. */
  name: string
  description: string
  /** Screenshot of the theme's landing page, shown in the theme menu. */
  preview: string
  requirements: Requirements
  /** Preference among qualifying themes — higher wins auto-resolution. */
  weight: number
  /** Shown in the switcher UI (URL ?theme= works regardless). */
  listed: boolean
  /** Dynamic import → each theme is its own code-split chunk. */
  load: () => Promise<ThemeModule>
}
