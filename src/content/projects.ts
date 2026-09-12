import type { Project } from './types'

export const projects: Project[] = [
  {
    slug: 'extensible-terrain-generation',
    title: 'Extensible Terrain Generation',
    category: 'personal',
    status: 'coming-soon',
    tools: ['C++', 'Vulkan'],
    summary:
      'A terrain generator in C++ and Vulkan, built so new generation algorithms can be added without rewriting the pipeline around them. The first personal graphics project on the road to Delft. In progress.',
    links: [],
  },
  {
    slug: 'dont-break-glass',
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
      members: ['damianhr', 'Davidd', 'smarty123', 'BungerColumbus', 'Eyn_Zayan'],
    },
    tools: ['Unity', 'C#'],
    summary:
      'A point-and-click adventure in the vein of old flash escape-room games, with the player stuck in a time loop and solving their way out of it. Rated 5.0/5 on itch.io. No generative AI used.',
    links: [{ label: 'Play on itch.io', url: 'https://damianhr.itch.io/dont-break-glass' }],
  },
  {
    slug: 'kill-bunny',
    title: 'Kill Bunny',
    category: 'jam',
    status: 'released',
    year: 2026,
    event: 'Totem Game Jam 2026',
    role: 'Scrum Master & Programmer',
    team: {
      name: 'Kartof',
      size: 6,
      members: ['damianhr', 'BungerColumbus', 'smarty123', 'Midas5665', 'Eyn_Zayan', 'Davidd'],
    },
    tools: ['Unity', 'C#'],
    summary:
      'An isometric hack-and-slash built around managing your character’s rage while cutting through thieves in a forest, told in comic panels. Its itch.io tagline: “Opportunity makes a thief, but a thief makes his own gallows.” No generative AI used.',
    links: [
      { label: 'Play in browser on itch.io', url: 'https://damianhr.itch.io/kill-bunny' },
      { label: 'Repository', url: 'https://github.com/DamianLHr/TGJ2026_Kartof' },
    ],
  },
  {
    slug: 'five-more-minutes',
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
      members: ['damianhr', 'Davidd', 'smarty123', 'Midas5665', 'Bunger', 'ssvuet', 'Eyn_Zayan'],
    },
    tools: ['Unity', 'C#'],
    summary:
      'You wake up one minute before a deadline. Find the final version of the file, recover the password you forgot, get past two-factor authentication, and do it while everything in your room is trying to distract you. No generative AI used.',
    links: [
      { label: 'Play on itch.io', url: 'https://damianhr.itch.io/5-more-minutes' },
      { label: 'Repository', url: 'https://github.com/DamianLHr/GMTK2026_Kartof' },
    ],
  },
  {
    slug: 'davincis-black-market-bird-dealer',
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
      { label: 'Repository', url: 'https://github.com/DamianLHr/Digital-Twinning-Suspension' },
      {
        label: 'Windows build + final presentation (Releases)',
        url: 'https://github.com/DamianLHr/Digital-Twinning-Suspension/releases/latest',
      },
    ],
  },
  {
    slug: 'blood-of-hedon',
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
        url: 'https://github.com/DamianLHr/Blood-of-Hedon/releases/latest',
      },
    ],
  },
  {
    slug: 'olympian-onslaught',
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
    links: [{ label: 'Repository', url: 'https://github.com/DamianLHr/Olympian-Onslaught' }],
  },
]
