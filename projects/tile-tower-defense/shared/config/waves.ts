import type { WaveDef } from './types';
export const waves = [
  {
    id: 'first-footsteps',
    interval: 1.5,
    healthMultiplier: 1,
    groups: [{ unit: 'goblin', count: 7 }],
  },
  {
    id: 'raiding-party',
    interval: 1.2,
    healthMultiplier: 1.1,
    groups: [
      { unit: 'goblin', count: 6 },
      { unit: 'raider', count: 3 },
    ],
  },
  {
    id: 'green-tide',
    interval: 0.65,
    healthMultiplier: 1.3,
    groups: [
      { unit: 'goblin', count: 16 },
      { unit: 'raider', count: 4 },
    ],
  },
  {
    id: 'heavy-footfall',
    interval: 1.1,
    healthMultiplier: 1.4,
    groups: [
      { unit: 'raider', count: 7 },
      { unit: 'brute', count: 2 },
    ],
  },
  {
    id: 'last-light',
    interval: 0.85,
    healthMultiplier: 1.6,
    groups: [
      { unit: 'goblin', count: 10 },
      { unit: 'raider', count: 8 },
      { unit: 'brute', count: 4 },
    ],
  },
  {
    id: 'marsh-runners',
    interval: 0.75,
    healthMultiplier: 1.7,
    groups: [
      {
        unit: 'snake',
        count: 12,
      },
      {
        unit: 'spider',
        count: 10,
      },
      {
        unit: 'gnoll',
        count: 8,
      },
    ],
  },
  {
    id: 'rising-tide',
    interval: 0.55,
    healthMultiplier: 1.8,
    groups: [
      {
        unit: 'paddle_fish',
        count: 16,
      },
      {
        unit: 'harpoon_fish',
        count: 16,
      },
    ],
  },
  {
    id: 'bone-banner',
    interval: 0.8,
    healthMultiplier: 1.9,
    groups: [
      {
        unit: 'goblin_lancer',
        count: 12,
      },
      {
        unit: 'skull',
        count: 10,
      },
      {
        unit: 'shaman',
        count: 6,
      },
    ],
  },
  {
    id: 'wildwood-dash',
    interval: 0.45,
    healthMultiplier: 2,
    groups: [
      {
        unit: 'gnome',
        count: 12,
      },
      {
        unit: 'thief',
        count: 12,
      },
      {
        unit: 'satyr_archer',
        count: 12,
      },
    ],
  },
  {
    id: 'scaled-column',
    interval: 0.85,
    healthMultiplier: 2,
    groups: [
      {
        unit: 'turtle',
        count: 8,
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
    id: 'forest-giants',
    interval: 0.95,
    healthMultiplier: 2.1,
    groups: [
      {
        unit: 'panda',
        count: 10,
      },
      {
        unit: 'bear',
        count: 8,
      },
      {
        unit: 'minotaur',
        count: 6,
      },
    ],
  },
  {
    id: 'ashen-procession',
    interval: 0.5,
    healthMultiplier: 2.2,
    groups: [
      {
        unit: 'skeleton_mage',
        count: 14,
      },
      {
        unit: 'pyromancer',
        count: 12,
      },
      {
        unit: 'mage',
        count: 10,
      },
    ],
  },
  {
    id: 'iron-company',
    interval: 0.8,
    healthMultiplier: 2.3,
    groups: [
      {
        unit: 'dwarf',
        count: 14,
      },
      {
        unit: 'knight',
        count: 12,
      },
    ],
  },
  {
    id: 'moonlit-hunt',
    interval: 0.65,
    healthMultiplier: 2.4,
    groups: [
      {
        unit: 'werewolf',
        count: 12,
      },
      {
        unit: 'gryphon',
        count: 10,
      },
      {
        unit: 'centaur',
        count: 10,
      },
    ],
  },
  {
    id: 'mountain-breakers',
    interval: 1.25,
    healthMultiplier: 2.4,
    groups: [
      {
        unit: 'ogre',
        count: 6,
      },
      {
        unit: 'stone_golem',
        count: 6,
      },
    ],
  },
  {
    id: 'hollow-cavalcade',
    interval: 0.8,
    healthMultiplier: 2.5,
    groups: [
      {
        unit: 'gargoyle',
        count: 10,
      },
      {
        unit: 'headless_horseman',
        count: 12,
      },
    ],
  },
  {
    id: 'hellgate',
    interval: 0.9,
    healthMultiplier: 2.6,
    groups: [
      {
        unit: 'demon',
        count: 12,
      },
      {
        unit: 'cerberus',
        count: 10,
      },
    ],
  },
  {
    id: 'dragonfall',
    interval: 0.75,
    healthMultiplier: 2.7,
    groups: [
      {
        unit: 'gryphon',
        count: 12,
      },
      {
        unit: 'dragon',
        count: 14,
      },
      {
        unit: 'pyromancer',
        count: 10,
      },
    ],
  },
  {
    id: 'gathering-storm',
    interval: 0.65,
    healthMultiplier: 2.8,
    groups: [
      {
        unit: 'werewolf',
        count: 14,
      },
      {
        unit: 'stone_golem',
        count: 6,
      },
      {
        unit: 'demon',
        count: 12,
      },
      {
        unit: 'headless_horseman',
        count: 8,
      },
    ],
  },
  {
    id: 'last-horizon',
    interval: 0.7,
    healthMultiplier: 3,
    groups: [
      {
        unit: 'knight',
        count: 12,
      },
      {
        unit: 'cerberus',
        count: 12,
      },
      {
        unit: 'dragon',
        count: 14,
      },
      {
        unit: 'ogre',
        count: 8,
      },
    ],
  },
] as const satisfies readonly WaveDef[];
