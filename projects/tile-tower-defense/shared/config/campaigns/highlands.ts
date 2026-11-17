import type { WaveDef } from '../types';

/** Highlands v1: foothill scouts, armored columns and mountain guardians. */
export const highlandsWaves = [
  {
    id: 'highlands-foothill-scouts',
    interval: 1.5,
    healthMultiplier: 1,
    groups: [
      {
        unit: 'gnome',
        count: 7,
      },
    ],
  },
  {
    id: 'highlands-mossy-trail',
    interval: 1.25,
    healthMultiplier: 1.1,
    groups: [
      {
        unit: 'gnome',
        count: 6,
      },
      {
        unit: 'dwarf',
        count: 3,
      },
    ],
  },
  {
    id: 'highlands-pine-runners',
    interval: 0.7,
    healthMultiplier: 1.25,
    groups: [
      {
        unit: 'gnoll',
        count: 12,
      },
      {
        unit: 'gnome',
        count: 6,
      },
    ],
  },
  {
    id: 'highlands-stone-guard',
    interval: 1.1,
    healthMultiplier: 1.4,
    groups: [
      {
        unit: 'dwarf',
        count: 8,
      },
      {
        unit: 'bear',
        count: 2,
      },
    ],
  },
  {
    id: 'highlands-first-ascent',
    interval: 0.9,
    healthMultiplier: 1.5,
    groups: [
      {
        unit: 'gnome',
        count: 8,
      },
      {
        unit: 'dwarf',
        count: 6,
      },
      {
        unit: 'bear',
        count: 3,
      },
    ],
  },
  {
    id: 'highlands-wild-pass',
    interval: 0.65,
    healthMultiplier: 1.65,
    groups: [
      {
        unit: 'gnoll',
        count: 14,
      },
      {
        unit: 'satyr_archer',
        count: 8,
      },
    ],
  },
  {
    id: 'highlands-iron-column',
    interval: 0.8,
    healthMultiplier: 1.8,
    groups: [
      {
        unit: 'dwarf',
        count: 16,
      },
      {
        unit: 'gnome',
        count: 10,
      },
    ],
  },
  {
    id: 'highlands-bear-country',
    interval: 1.1,
    healthMultiplier: 1.8,
    groups: [
      {
        unit: 'bear',
        count: 8,
      },
      {
        unit: 'dwarf',
        count: 8,
      },
    ],
  },
  {
    id: 'highlands-ridge-riders',
    interval: 0.6,
    healthMultiplier: 1.9,
    groups: [
      {
        unit: 'centaur',
        count: 10,
      },
      {
        unit: 'satyr_archer',
        count: 12,
      },
      {
        unit: 'gnoll',
        count: 10,
      },
    ],
  },
  {
    id: 'highlands-granite-gate',
    interval: 1,
    healthMultiplier: 2,
    groups: [
      {
        unit: 'dwarf',
        count: 12,
      },
      {
        unit: 'ogre',
        count: 4,
      },
      {
        unit: 'bear',
        count: 6,
      },
    ],
  },
  {
    id: 'highlands-highland-herd',
    interval: 1,
    healthMultiplier: 2.1,
    groups: [
      {
        unit: 'minotaur',
        count: 6,
      },
      {
        unit: 'bear',
        count: 8,
      },
      {
        unit: 'satyr_archer',
        count: 10,
      },
    ],
  },
  {
    id: 'highlands-peak-wings',
    interval: 0.7,
    healthMultiplier: 2.2,
    groups: [
      {
        unit: 'gryphon',
        count: 6,
      },
      {
        unit: 'dwarf',
        count: 14,
      },
      {
        unit: 'centaur',
        count: 8,
      },
    ],
  },
  {
    id: 'highlands-ancient-stones',
    interval: 1.1,
    healthMultiplier: 2.3,
    groups: [
      {
        unit: 'stone_golem',
        count: 4,
      },
      {
        unit: 'dwarf',
        count: 16,
      },
      {
        unit: 'bear',
        count: 8,
      },
    ],
  },
  {
    id: 'highlands-ravine-rush',
    interval: 0.55,
    healthMultiplier: 2.4,
    groups: [
      {
        unit: 'gnoll',
        count: 18,
      },
      {
        unit: 'centaur',
        count: 14,
      },
      {
        unit: 'minotaur',
        count: 6,
      },
    ],
  },
  {
    id: 'highlands-mountain-kings',
    interval: 1.2,
    healthMultiplier: 2.4,
    groups: [
      {
        unit: 'ogre',
        count: 10,
      },
      {
        unit: 'stone_golem',
        count: 5,
      },
      {
        unit: 'dwarf',
        count: 12,
      },
    ],
  },
  {
    id: 'highlands-summit-guard',
    interval: 0.8,
    healthMultiplier: 2.5,
    groups: [
      {
        unit: 'dwarf',
        count: 22,
      },
      {
        unit: 'bear',
        count: 10,
      },
      {
        unit: 'gryphon',
        count: 6,
      },
    ],
  },
  {
    id: 'highlands-storm-ridge',
    interval: 0.65,
    healthMultiplier: 2.6,
    groups: [
      {
        unit: 'gryphon',
        count: 10,
      },
      {
        unit: 'satyr_archer',
        count: 18,
      },
      {
        unit: 'minotaur',
        count: 8,
      },
    ],
  },
  {
    id: 'highlands-living-mountain',
    interval: 1.1,
    healthMultiplier: 2.7,
    groups: [
      {
        unit: 'stone_golem',
        count: 8,
      },
      {
        unit: 'ogre',
        count: 10,
      },
      {
        unit: 'dwarf',
        count: 16,
      },
    ],
  },
  {
    id: 'highlands-last-ascent',
    interval: 0.55,
    healthMultiplier: 2.8,
    groups: [
      {
        unit: 'centaur',
        count: 18,
      },
      {
        unit: 'bear',
        count: 14,
      },
      {
        unit: 'gryphon',
        count: 10,
      },
      {
        unit: 'minotaur',
        count: 8,
      },
    ],
  },
  {
    id: 'highlands-crown-of-stone',
    interval: 0.95,
    healthMultiplier: 3,
    groups: [
      {
        unit: 'dwarf',
        count: 24,
      },
      {
        unit: 'stone_golem',
        count: 10,
      },
      {
        unit: 'ogre',
        count: 12,
      },
      {
        unit: 'gryphon',
        count: 8,
      },
    ],
  },
] as const satisfies readonly WaveDef[];
