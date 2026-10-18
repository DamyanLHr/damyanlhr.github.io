# Adding a theme

How to build a new visual world for this site. Written for whoever (human or Claude)
builds theme number 4, 5, 6…

## The one law

**Content ⇄ theme decoupling.** A theme receives the whole content model and the current
route, and owns 100% of presentation. It never defines content, never imports another
theme, never imports the shell. `npm run check` enforces this as a build failure
(scripts/check-boundaries.mjs).

**And the standing quality rule (Damyan, 2026-07-07): every theme must be special and
interesting. Decoupled content is not an excuse for a bland skin — if a theme reads as
a template, it is not done.** Consult the design skills in `.claude/skills/`
(taste-skill pre-flight, emil-design-eng for motion) before and during the build.

## Steps

1. **Create the folder** `src/themes/<id>/` with an `index.tsx` exporting:

   ```tsx
   export function Root({ content, route, navigate, themeMenu }: ThemeProps) { … }
   ```

   `ThemeProps` comes from `src/shared/theme-contract.ts`. Import content types from
   `src/content/types.ts`, route helpers from `src/shared/routes.ts`. CSS lives inside
   the folder and is imported by the theme entry (it code-splits with the theme).

2. **Cover every route.** `route.kind` is `home | cv | projects | project | interests |
   notFound`. The micro-router owns what the URL *is*; your theme owns what navigation
   *feels* like. Internal links: render `<a href={path}>` and call
   `navigate(path)` in onClick with preventDefault (see `InternalLink` in julia for the
   pattern — copy it locally, do not import across themes).

3. **Draw the theme button.** Every theme renders one in its own top bar, styled in
   its own language (julia's is a pill, landfall's is a map marker, atlas's is an
   index entry). Copy one of the existing `ThemeMenu.tsx` files into your folder and
   restyle it; the behaviour comes from `useThemeMenu(themeMenu)` in
   `src/shared/theme-menu.ts`, so do not reimplement it. Spread `rootProps` on the
   wrapper, `triggerProps` on the button, `panelProps` on the dropdown, `menuProps`
   on the list and `itemProps(i)` on each entry; style `[data-highlight]` (the
   roulette cursor) and `[data-instant]` (opened from the keyboard: no transition).
   The dropdown is a reel: call `useThemeMenu(themeMenu, { reel: true })`, hand the
   result to `useReel(m, count)` from `src/shared/useReel.ts`, and render
   `REEL_REPEAT` copies of the previews in the strip it animates
   (`src/themes/julia/ThemeMenu.tsx` is the shortest example). Style
   `[data-rolling]` while it spins and `[data-landed]` once it stops.
   If the theme can fail (no GPU), the bar must stay above the failure screen.

4. **Surface the required content.** Non-negotiable minimums:
   - All projects (with their links) and the CV data.
   - **`content.announcements` ("Up next") on the landing AND projects pages** — this
     site is a blog; the pulse must show in every world.
   - Socials on the landing.
   - A project's `body` (markdown, via react-markdown) on its page, and the
     `builtWithAI` disclosure on both its card and its page.
   - Art DNA (`project.art`, `content.routeArt`) is an *offer*: interpret the facets
     your theme understands, ignore the rest.

5. **Register it** in `src/themes/registry.ts`: one descriptor — `id`, `name`,
   `description`, `requirements` (leave `{}` only if it truly runs everywhere),
   `weight` (see the ladder in the registry; the floor keeps the lowest positive
   weight), `listed: true`, `load: () => import('./<id>')`, and a `preview`: add the id
   to `scripts/capture-previews.mjs`, run `npm run build && npm run previews`, look at
   the webp it writes to `src/shared/previews/` (a blank capture is a failed one), and
   import it in the registry.

6. **Respect the platform rules** (all enforced by review, some by CSS):
   - `prefers-reduced-motion` ⇒ no movement, content fully readable.
   - Hover effects gated behind `@media (hover: hover) and (pointer: fine)`.
   - Interactive elements: visible `:focus-visible`, `:active` feedback, WCAG AA
     contrast.
   - Heavy rendering must degrade (see julia's GL probe + CPU fallback and the
     `?cpufractal` QA override for the pattern). A theme crash auto-falls to the floor
     theme, but do not rely on it.
   - No em-dashes in visible copy (site-wide rule from the taste-skill pre-flight).

7. **Verify before pushing:** `npm run check && npm run lint && npm run test &&
   npm run build`, then walk every route in the browser (desktop + mobile viewport,
   console clean), including `?theme=<id>` while your theme is not yet the default.

8. **Ship behind the theme menu first.** New themes go live with a weight that does not
   auto-win until Damyan approves them at their gate (see PLAN.md); visitors reach them
   via `?theme=<id>` and the theme menu.

## What you get for free

Routing, theme resolution/switching, persistence, error-boundary fallback, content
validation, and the E2E route×theme matrix (it picks up new registry entries
automatically). The `debug` theme (`?theme=debug`) shows exactly what content your
theme receives.
