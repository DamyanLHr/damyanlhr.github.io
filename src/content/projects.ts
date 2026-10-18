import type { Project } from './types'

export const projects: Project[] = [
  {
    slug: 'extensible-terrain-generation',
    art: { effect: 'ridgelines' },
    title: 'Extensible Terrain Generation',
    category: 'personal',
    status: 'coming-soon',
    tools: ['C++', 'Vulkan'],
    summary:
      'A terrain generator in C++ and Vulkan, built so new generation algorithms can be added without rewriting the pipeline around them. The first personal graphics project on the road to Delft. In progress.',
    links: [],
  },
  {
    slug: 'this-site',
    art: { effect: 'scroll-dive' },
    title: 'This Portfolio Site',
    category: 'personal',
    status: 'released',
    year: 2026,
    duration: '~2 months, ongoing',
    role: 'Direction, art direction and review',
    tools: ['TypeScript', 'React', 'Three.js', 'WebGL 2', 'Vite'],
    builtWithAI: true,
    summary:
      'This site, built with an AI agent over roughly two months as a deliberate learning exercise. The direction, the theme concepts and every visual decision are mine; the implementation is not. Listed here so that the rest of this portfolio is read correctly.',
    body: `## Scope

This site was built with an AI agent over roughly two months, as a deliberate
learning exercise. The implementation is not my own work. It is listed here so
that the rest of this portfolio is read correctly.

My contribution was direction: the concept behind each theme, the visual
decisions, the constraints the work ran under, and the review at every stage.

## Languages and proficiency

I have no working proficiency in TypeScript or React, nor in the web stack this
site is built on. The rendering code, the erosion simulation and the application
architecture are not mine, and I could not maintain this repository unaided.

GLSL is the exception. Shader code falls inside my area of study.

## Method

Three documents in the repository carried the work. \`TECHNOLOGY.md\` records the
stack, the capability facts for WebGPU and WebGL 2, the architecture and a
reference library. \`PLAN.md\` is the execution contract: eight phases, each
closing on a named gate, with status markers updated as work landed and failures
recorded alongside the successes. \`CONTENT.md\` holds the copy in draft and
remains the source from which the typed content files are transcribed.

Four rules governed the process throughout.

- **Gates.** A phase closes only on my explicit approval, and nothing is built on
  top of an unapproved gate.
- **Options rather than proposals.** Every subjective decision is presented as
  two or three rendered alternatives, as screenshots or live URLs. Where all of
  them miss, the options are redone rather than refined. Three complete design
  directions were rejected on this basis in September 2026.
- **Continuous deployability.** \`main\` builds and deploys at all times. Each
  theme ships behind \`?theme=<id>\` before it is permitted to win resolution, so
  that review happens on real hardware.
- **Review before presentation.** Console errors, layout faults and motion
  problems are resolved before any work is submitted for approval.

Design decisions went through style tiles: static HTML mockups of a direction,
rendered with real content and reviewed before theme code is written. A set of
design references is vendored into the repository and consulted before any
visible element is built. An editing pass was later run over every string on the
site written by the agent rather than by me.

## Implementation

**Architecture.** Content and presentation are separated at the type level. A
single typed model describes the CV, projects and interests; each theme
implements a contract against it and owns its presentation entirely. A boot shell
probes device capability, resolves a theme by weight, code-splits and lazy-loads
it, and falls back to the floor theme on a crash while preserving the route.
Import boundaries are enforced by a linter as a build failure.

**Julia**, the default theme, renders Julia sets live as a WebGL 2 fragment
shader, with a CPU canvas fallback behind a pixel-readback capability probe.

**Watershed** and **Landfall** present the CV as an eroded island. A particle
hydraulic erosion simulation runs at build time, following Nick McDonald's
SimpleHydrology work: water descends a noise heightmap exchanging sediment with
the ground, and meanders arise from discharge and momentum maps that couple
otherwise independent particles. Three sediment grades sort themselves along the
flow. The result is baked to PNG and read back at runtime, drawn as a displaced
heightmap with colour, sun and occlusion baked into vertex colours, so no
lighting pass is required. The drainage basins the simulation produced define the
regions the CV is laid out across. Landfall adds settlement on top: roads worn
between the towns, coastal traffic, and town sizes derived from terrain quality.

**Atlas** presents the same content as a 17th-century chart with procedurally
engraved coastlines.

**Accessibility** was treated as a gate rather than a final pass. The island
carries a roving tab stop, a live region announcing each location as the camera
travels to it, a flat non-WebGL fallback drawn from the same baked data, recovery
from GL context loss, and reduced-motion paths throughout.

Deployment is by GitHub Actions to GitHub Pages, with a 404 fallback so that deep
links survive on a static host.

## Attribution of design

Every theme concept originates with me: the fractal gallery, the CV as an eroded
island, the engraved chart, and the descent through a fold bulb. The selection
between them and the rejections were mine, as were the constraints the work ran
under, including the requirement that no theme be a generic surface over
decoupled content.

## Relation to the rest of this portfolio

This project is not representative of how I work.

The other projects listed here are written in languages I am proficient in, Java
and C# in particular, and I was responsible for their architecture. Where AI was
used on them it was used sparingly and from a specification: the design and the
required behaviour were already settled, and the tool completed work I had
already specified.

I do not use AI as a substitute for learning within my areas of focus. C++ and
Vulkan are the current case and are being learned directly.
`,
    links: [
      { label: 'Repository', url: 'https://github.com/DamyanLHr/damyanlhr.github.io' },
      { label: 'The site itself', url: 'https://damyanlhr.github.io/' },
    ],
  },
  {
    slug: 'dont-break-glass',
    art: { effect: 'heartbeat' },
    title: "Don't Break Glass",
    category: 'jam',
    status: 'released',
    year: 2025,
    event: 'GMTK Game Jam 2025',
    duration: '~96 h jam',
    role: 'Scrum Master & Programmer',
    team: {
      name: 'Kartof',
      size: 5,
      members: ['damyanhr', 'Davidd', 'smarty123', 'BungerColumbus', 'Eyn_Zayan'],
    },
    tools: ['Unity', 'C#'],
    summary:
      'A point-and-click adventure in the vein of old flash escape-room games, with the player stuck in a time loop and solving their way out of it. Rated 5.0/5 on itch.io. No generative AI used.',
    links: [
      { label: 'Play in browser on itch.io', url: 'https://damyanhr.itch.io/dont-break-glass' },
    ],
  },
  {
    slug: 'kill-bunny',
    art: { effect: 'ripple' },
    title: 'Kill Bunny',
    category: 'jam',
    status: 'released',
    year: 2026,
    event: 'Totem Game Jam 2026',
    role: 'Scrum Master & Programmer',
    team: {
      name: 'Kartof',
      size: 6,
      members: ['damyanhr', 'BungerColumbus', 'smarty123', 'Midas5665', 'Eyn_Zayan', 'Davidd'],
    },
    tools: ['Unity', 'C#'],
    summary:
      'An isometric hack-and-slash built around managing your character’s rage while cutting through thieves in a forest, told in comic panels. Its itch.io tagline: “Opportunity makes a thief, but a thief makes his own gallows.” No generative AI used.',
    links: [
      { label: 'Play in browser on itch.io', url: 'https://damyanhr.itch.io/kill-bunny' },
      { label: 'Repository', url: 'https://github.com/DamyanLHr/TGJ2026_Kartof' },
    ],
  },
  {
    slug: 'five-more-minutes',
    art: { effect: 'stardust' },
    title: '5 More Minutes!',
    category: 'jam',
    status: 'released',
    year: 2026,
    event: 'GMTK Game Jam 2026, theme "Count Down"',
    duration: '~96 h jam',
    role: 'Scrum Master & Programmer',
    team: {
      name: 'Kartof',
      size: 7,
      members: ['damyanhr', 'Davidd', 'smarty123', 'Midas5665', 'Bunger', 'ssvuet', 'Eyn_Zayan'],
    },
    tools: ['Unity', 'C#'],
    summary:
      'You wake up one minute before a deadline. Find the final version of the file, recover the password you forgot, get past two-factor authentication, and do it while everything in your room is trying to distract you. No generative AI used.',
    links: [
      { label: 'Play in browser on itch.io', url: 'https://damyanhr.itch.io/5-more-minutes' },
      { label: 'Repository', url: 'https://github.com/DamyanLHr/GMTK2026_Kartof' },
    ],
  },
  {
    slug: 'davincis-black-market-bird-dealer',
    art: { effect: 'cursor' },
    title: "Davinci's Black Market Bird Dealer",
    category: 'university',
    status: 'coming-soon',
    event: 'Game Design 1, TU/e',
    tools: [],
    summary: 'A Game Design 1 course project at TU/e, in production now.',
    links: [],
  },
  {
    slug: 'digital-twinning-suspension',
    art: { effect: 'relief' },
    title: 'Digital Twinning Suspension',
    category: 'university',
    status: 'released',
    year: 2026,
    event: 'Multidisciplinary CBL project, TU/e',
    duration: '~2 months',
    role: 'Scrum Master & Programmer',
    tools: ['Unity 6000.4.6f1', 'C#', 'Python'],
    summary:
      'A digital twin of an active predictive suspension, running against a real belt-driven test rig. Against a constant damper, the predictive policy cut RMS sprung acceleration by 4.46% and mean peak acceleration by 16.03% on the best-case despiked segment, and placed jolts within about 2 cm of belt travel.',
    links: [
      { label: 'Repository', url: 'https://github.com/DamyanLHr/Digital-Twinning-Suspension' },
      {
        label: 'Windows build + final presentation (Releases)',
        url: 'https://github.com/DamyanLHr/Digital-Twinning-Suspension/releases/latest',
      },
    ],
  },
  {
    slug: 'blood-of-hedon',
    art: { effect: 'orbit-traps' },
    title: 'Blood of Hedon',
    category: 'university',
    status: 'released',
    year: 2025,
    event: '2IRR00 Software Engineering, TU/e (Group 55)',
    duration: '~2 months',
    role: 'Scrum Master & Programmer',
    team: { size: 6 },
    tools: ['Java 21', 'Maven', 'JUnit 5'],
    summary:
      'A roguelike gladiator game with turn-based, card-driven combat in a hand-drawn Roman arena, with about 35 cards, 4 gladiator classes and a mythological bestiary. It runs on a Java engine written from scratch: fixed-timestep loop, layered renderer, spatial-grid collision, event buses and a Unity-style component model.',
    links: [
      {
        label: 'Download the game (JAR, GitHub Releases)',
        url: 'https://github.com/DamyanLHr/Blood-of-Hedon/releases/latest',
      },
    ],
  },
  {
    slug: 'olympian-onslaught',
    art: { effect: 'field-lines' },
    title: 'Olympian Onslaught',
    category: 'university',
    status: 'released',
    year: 2025,
    event: 'Programming course, TU/e',
    duration: '~2 months',
    role: 'Team Leader & Programmer',
    team: { size: 2 },
    tools: ['Java 21', 'Swing'],
    summary:
      'A top-down roguelite set in Greek myth. You play Achilles, holding out for five minutes against waves of monsters with auto-firing weapons, and a maxed weapon paired with a maxed ability fuses into something new, like the Exploding Bow or the Lightning Axe. Built on a Java and Swing engine written from scratch.',
    links: [{ label: 'Repository', url: 'https://github.com/DamyanLHr/Olympian-Onslaught' }],
  },
]
