import type { CV } from './types'

export const cv: CV = {
  education: [
    {
      school: 'Eindhoven University of Technology (TU/e)',
      program: 'BSc Computer Science and Engineering',
      location: 'Eindhoven, the Netherlands',
      start: '2024-09',
      end: '2027 (expected)',
      details: ['Currently in the 3rd year, class finishing in 2027.'],
    },
    {
      school: 'National Gymnasium of Natural Sciences and Mathematics "Academician Lyubomir Chakalov"',
      program: 'Secondary education: Mathematics & Informatics major with German',
      location: 'Sofia, Bulgaria',
      start: '2019-09',
      end: '2024-05',
      details: [
        'Mathematics & Informatics major class with German language.',
        'Additional specialization in Information Technologies (10th to 12th grade).',
        'State Baccalaureate Examination in Advanced Mathematics (20.05.2024).',
      ],
    },
  ],
  experience: [
    {
      company: 'Totem',
      role: 'Lead Programmer',
      start: '2025-09-01',
      end: '2026-06-30',
      teamSize: 15,
      tools: ['Unity', 'C#', 'Netcode for GameObjects'],
      summary: 'An asymmetric multiplayer game, still in beta, built by a team of about 15.',
      highlights: [
        'Networked pub/sub event bus, with JSON event serialization, routed per arcade machine to the sub-scene that owns it.',
        'Lobby and session flow: Unity Services initialization, relay integration, session create and join, player list, and asymmetric player-role assignment.',
        'Sub-scene "arcade machine" system: minigames running on in-world screens via render textures, with sub-scene lifecycle and validation, client-authority management, and runner and proxy object culling.',
        'Arcade transport: carrying a player from the 3D world into a machine\u2019s 2D sub-scene and back out again.',
        'The 2D player controller: a kinematic collision handler, the movement controller built on top of it, and camera follow.',
        'The 3D player controller: movement and the interact action.',
      ],
      links: [{ label: 'Totem on LinkedIn', url: 'https://nl.linkedin.com/company/totem-game-dev' }],
    },
    {
      company: 'INDEAVR (Data Strategy Services department)',
      role: 'Intern',
      start: '2022-06',
      end: '2022-07',
      tools: ['Google Analytics', 'JavaScript', 'git'],
      summary:
        'Internship at INDEAVR in Sofia, an IT outsourcing provider serving many Fortune 2000 companies.',
      highlights: [
        "Made numerous client companies' sites GDPR-compliant by setting up their cookie consent.",
        "Helped migrate the department's wiki, working with in-house libraries, git, and Microsoft tooling.",
        "Got a first-hand look at company operation via presentations from each of the department's team members.",
        'Worked with an assigned tutor, then with the small team responsible for the wiki.',
      ],
      links: [],
    },
  ],
  plans:
    'Masters in Delft with Computer Graphics; heading toward game, engine, and tooling development.',
  proficiencies: {
    spoken: [
      { language: 'Bulgarian', level: 'native' },
      { language: 'English', level: 'C1' },
      { language: 'German', level: 'B1' },
    ],
    programming: [
      {
        name: 'Java',
        evidence: 'Massive projects, including a custom game engine built from scratch.',
        projectSlugs: ['blood-of-hedon', 'olympian-onslaught'],
      },
      {
        name: 'C# & Unity',
        evidence: 'Professional and jam game development, plus a physical-rig digital twin.',
        projectSlugs: ['digital-twinning-suspension', 'kill-bunny', 'dont-break-glass'],
      },
      {
        name: 'Python',
        evidence:
          'Stochastic simulations, plotting and data analysis, plus two further university projects in Python that the course did not allow us to publish.',
        projectSlugs: ['digital-twinning-suspension'],
      },
    ],
    expanding: [
      {
        name: 'C++ & Vulkan',
        evidence: 'Actively learning, for the computer-graphics track in Delft.',
        projectSlugs: ['extensible-terrain-generation'],
      },
    ],
  },
}
