import type { ThemeDescriptor } from '../shared/theme-contract'
import juliaPreview from '../shared/previews/julia.webp'
import landfallPreview from '../shared/previews/landfall.webp'
import atlasPreview from '../shared/previews/atlas.webp'
import singularityPreview from '../shared/previews/singularity.webp'
import debugPreview from '../shared/previews/debug.webp'

// The theme registry (TECHNOLOGY.md §3.3). Adding a theme = one new descriptor here
// + its folder + a preview (`npm run previews`). The shell resolves against this
// list; nothing else may import theme folders directly. Order here is the order
// of the theme menu.

export const themes: ThemeDescriptor[] = [
  {
    id: 'julia',
    name: 'Julia',
    description: 'An obsidian gallery of live Julia sets, one for every project.',
    preview: juliaPreview,
    requirements: {},
    weight: 20,
    listed: true,
    load: () => import('./julia'),
  },
  {
    id: 'landfall',
    name: 'Landfall',
    description: 'An island carved by simulated rain, with towns, roads and boats.',
    preview: landfallPreview,
    requirements: { webgl2: true },
    // Gate "landfall navigation approved" still open; below julia until then.
    weight: 4,
    listed: true,
    load: () => import('./landfall'),
  },
  {
    id: 'atlas',
    name: 'Atlas',
    description: 'The CV engraved as a 17th-century chart.',
    preview: atlasPreview,
    requirements: {},
    // in build (PLAN Phase 5); reachable from the theme menu until GATE 5b
    weight: 5,
    listed: true,
    load: () => import('./atlas'),
  },
  {
    id: 'singularity',
    name: 'Singularity',
    description: 'A flight through a raymarched fractal bulb. Heavy on the GPU.',
    preview: singularityPreview,
    requirements: { webgl2: true },
    // Parked 2026-08-05: too heavy to be anyone's default. Negative weight keeps it
    // out of auto-resolution entirely; reachable only via the theme menu or ?theme=.
    weight: -2,
    listed: true,
    load: () => import('./singularity'),
  },
  {
    id: 'debug',
    name: 'Debug',
    description: 'The raw content every theme receives, with no styling at all.',
    preview: debugPreview,
    requirements: {},
    weight: -1,
    listed: true,
    load: () => import('./debug'),
  },
]
