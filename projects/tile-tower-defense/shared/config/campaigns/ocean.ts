import type { WaveDef } from '../types';

/** Deep Ocean v1: shoals, armored turtles and sunken guardians; no new unit abilities. */
export const oceanWaves = [
  {
    id: 'ocean-reef-scouts',
    interval: 1.5,
    healthMultiplier: 1,
    groups: [
      {
        unit: 'paddle_fish',
        count: 7,
      },
    ],
  },
  {
    id: 'ocean-tidal-trail',
    interval: 1.2,
    healthMultiplier: 1.1,
    groups: [
      {
        unit: 'paddle_fish',
        count: 6,
      },
      {
        unit: 'harpoon_fish',
        count: 3,
      },
    ],
  },
  {
    id: 'ocean-silver-shoal',
    interval: 0.65,
    healthMultiplier: 1.3,
    groups: [
      {
        unit: 'paddle_fish',
        count: 16,
      },
      {
        unit: 'harpoon_fish',
        count: 4,
      },
    ],
  },
  {
    id: 'ocean-shell-guard',
    interval: 1.1,
    healthMultiplier: 1.4,
    groups: [
      {
        unit: 'harpoon_fish',
        count: 7,
      },
      {
        unit: 'turtle',
        count: 3,
      },
    ],
  },
  {
    id: 'ocean-first-surge',
    interval: 0.85,
    healthMultiplier: 1.6,
    groups: [
      {
        unit: 'paddle_fish',
        count: 10,
      },
      {
        unit: 'lizardman',
        count: 8,
      },
      {
        unit: 'turtle',
        count: 4,
      },
    ],
  },
  {
    id: 'ocean-kelp-runners',
    interval: 0.65,
    healthMultiplier: 1.7,
    groups: [
      {
        unit: 'snake',
        count: 14,
      },
      {
        unit: 'paddle_fish',
        count: 12,
      },
      {
        unit: 'lizard',
        count: 8,
      },
    ],
  },
  {
    id: 'ocean-harpoon-current',
    interval: 0.5,
    healthMultiplier: 1.8,
    groups: [
      {
        unit: 'harpoon_fish',
        count: 20,
      },
      {
        unit: 'paddle_fish',
        count: 16,
      },
    ],
  },
  {
    id: 'ocean-reef-banner',
    interval: 0.85,
    healthMultiplier: 1.9,
    groups: [
      {
        unit: 'lizardman',
        count: 12,
      },
      {
        unit: 'turtle',
        count: 6,
      },
      {
        unit: 'shaman',
        count: 6,
      },
    ],
  },
  {
    id: 'ocean-riptide',
    interval: 0.4,
    healthMultiplier: 2,
    groups: [
      {
        unit: 'snake',
        count: 16,
      },
      {
        unit: 'paddle_fish',
        count: 16,
      },
      {
        unit: 'harpoon_fish',
        count: 12,
      },
    ],
  },
  {
    id: 'ocean-coral-bastion',
    interval: 0.9,
    healthMultiplier: 2,
    groups: [
      {
        unit: 'turtle',
        count: 12,
      },
      {
        unit: 'lizard',
        count: 10,
      },
      {
        unit: 'lizardman',
        count: 10,
      },
    ],
  },
  {
    id: 'ocean-sunken-guardians',
    interval: 1,
    healthMultiplier: 2.1,
    groups: [
      {
        unit: 'turtle',
        count: 12,
      },
      {
        unit: 'stone_golem',
        count: 3,
      },
      {
        unit: 'harpoon_fish',
        count: 10,
      },
    ],
  },
  {
    id: 'ocean-abyssal-rites',
    interval: 0.55,
    healthMultiplier: 2.2,
    groups: [
      {
        unit: 'shaman',
        count: 14,
      },
      {
        unit: 'mage',
        count: 10,
      },
      {
        unit: 'lizardman',
        count: 12,
      },
    ],
  },
  {
    id: 'ocean-shell-and-stone',
    interval: 0.95,
    healthMultiplier: 2.3,
    groups: [
      {
        unit: 'turtle',
        count: 14,
      },
      {
        unit: 'stone_golem',
        count: 4,
      },
      {
        unit: 'lizardman',
        count: 10,
      },
    ],
  },
  {
    id: 'ocean-undertow',
    interval: 0.5,
    healthMultiplier: 2.4,
    groups: [
      {
        unit: 'snake',
        count: 18,
      },
      {
        unit: 'harpoon_fish',
        count: 18,
      },
      {
        unit: 'turtle',
        count: 8,
      },
    ],
  },
  {
    id: 'ocean-trench-colossi',
    interval: 1.25,
    healthMultiplier: 2.4,
    groups: [
      {
        unit: 'stone_golem',
        count: 8,
      },
      {
        unit: 'turtle',
        count: 12,
      },
    ],
  },
  {
    id: 'ocean-drowned-legion',
    interval: 0.7,
    healthMultiplier: 2.5,
    groups: [
      {
        unit: 'lizardman',
        count: 18,
      },
      {
        unit: 'turtle',
        count: 12,
      },
      {
        unit: 'mage',
        count: 10,
      },
    ],
  },
  {
    id: 'ocean-blackwater',
    interval: 0.6,
    healthMultiplier: 2.6,
    groups: [
      {
        unit: 'harpoon_fish',
        count: 20,
      },
      {
        unit: 'shaman',
        count: 12,
      },
      {
        unit: 'stone_golem',
        count: 5,
      },
    ],
  },
  {
    id: 'ocean-deep-pressure',
    interval: 0.85,
    healthMultiplier: 2.7,
    groups: [
      {
        unit: 'turtle',
        count: 20,
      },
      {
        unit: 'stone_golem',
        count: 8,
      },
      {
        unit: 'harpoon_fish',
        count: 12,
      },
    ],
  },
  {
    id: 'ocean-maelstrom',
    interval: 0.45,
    healthMultiplier: 2.8,
    groups: [
      {
        unit: 'snake',
        count: 20,
      },
      {
        unit: 'harpoon_fish',
        count: 20,
      },
      {
        unit: 'turtle',
        count: 14,
      },
      {
        unit: 'mage',
        count: 10,
      },
    ],
  },
  {
    id: 'ocean-ocean-crown',
    interval: 0.75,
    healthMultiplier: 3,
    groups: [
      {
        unit: 'harpoon_fish',
        count: 20,
      },
      {
        unit: 'turtle',
        count: 24,
      },
      {
        unit: 'stone_golem',
        count: 10,
      },
      {
        unit: 'lizardman',
        count: 12,
      },
    ],
  },
] as const satisfies readonly WaveDef[];
