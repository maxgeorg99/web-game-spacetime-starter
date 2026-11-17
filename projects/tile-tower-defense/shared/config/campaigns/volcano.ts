import type { WaveDef } from '../types';

/** Volcano v1: twenty authored waves; tune only with a deliberate campaign revision. */
export const volcanoWaves = [
  {
    id: 'volcano-cinder-scouts',
    interval: 1.5,
    healthMultiplier: 1,
    groups: [
      {
        unit: 'gnoll',
        count: 7,
      },
    ],
  },
  {
    id: 'volcano-ash-trail',
    interval: 1.2,
    healthMultiplier: 1.1,
    groups: [
      {
        unit: 'gnoll',
        count: 6,
      },
      {
        unit: 'skull',
        count: 3,
      },
    ],
  },
  {
    id: 'volcano-coal-swarm',
    interval: 0.65,
    healthMultiplier: 1.3,
    groups: [
      {
        unit: 'spider',
        count: 16,
      },
      {
        unit: 'skull',
        count: 4,
      },
    ],
  },
  {
    id: 'volcano-hot-stones',
    interval: 1.1,
    healthMultiplier: 1.4,
    groups: [
      {
        unit: 'skull',
        count: 7,
      },
      {
        unit: 'minotaur',
        count: 2,
      },
    ],
  },
  {
    id: 'volcano-first-flame',
    interval: 0.85,
    healthMultiplier: 1.6,
    groups: [
      {
        unit: 'gnoll',
        count: 10,
      },
      {
        unit: 'pyromancer',
        count: 8,
      },
      {
        unit: 'minotaur',
        count: 4,
      },
    ],
  },
  {
    id: 'volcano-ember-rush',
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
    id: 'volcano-spark-storm',
    interval: 0.55,
    healthMultiplier: 1.8,
    groups: [
      {
        unit: 'spider',
        count: 16,
      },
      {
        unit: 'pyromancer',
        count: 16,
      },
    ],
  },
  {
    id: 'volcano-charred-banner',
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
        unit: 'pyromancer',
        count: 6,
      },
    ],
  },
  {
    id: 'volcano-smoke-runners',
    interval: 0.45,
    healthMultiplier: 2,
    groups: [
      {
        unit: 'thief',
        count: 12,
      },
      {
        unit: 'gnoll',
        count: 12,
      },
      {
        unit: 'pyromancer',
        count: 12,
      },
    ],
  },
  {
    id: 'volcano-basalt-guard',
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
    id: 'volcano-furnace-mouth',
    interval: 0.95,
    healthMultiplier: 2.1,
    groups: [
      {
        unit: 'minotaur',
        count: 10,
      },
      {
        unit: 'cerberus',
        count: 6,
      },
      {
        unit: 'demon',
        count: 4,
      },
    ],
  },
  {
    id: 'volcano-pyre-procession',
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
    id: 'volcano-iron-and-ash',
    interval: 0.8,
    healthMultiplier: 2.3,
    groups: [
      {
        unit: 'dwarf',
        count: 14,
      },
      {
        unit: 'gargoyle',
        count: 10,
      },
    ],
  },
  {
    id: 'volcano-hellhound-run',
    interval: 0.65,
    healthMultiplier: 2.4,
    groups: [
      {
        unit: 'werewolf',
        count: 12,
      },
      {
        unit: 'cerberus',
        count: 8,
      },
      {
        unit: 'pyromancer',
        count: 10,
      },
    ],
  },
  {
    id: 'volcano-mountain-heart',
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
    id: 'volcano-obsidian-wings',
    interval: 0.8,
    healthMultiplier: 2.5,
    groups: [
      {
        unit: 'gargoyle',
        count: 10,
      },
      {
        unit: 'dragon',
        count: 10,
      },
    ],
  },
  {
    id: 'volcano-infernal-gate',
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
    id: 'volcano-dragon-crater',
    interval: 0.75,
    healthMultiplier: 2.7,
    groups: [
      {
        unit: 'gargoyle',
        count: 10,
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
    id: 'volcano-eruption',
    interval: 0.65,
    healthMultiplier: 2.8,
    groups: [
      {
        unit: 'pyromancer',
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
        unit: 'cerberus',
        count: 8,
      },
    ],
  },
  {
    id: 'volcano-volcanic-crown',
    interval: 0.7,
    healthMultiplier: 3,
    groups: [
      {
        unit: 'gargoyle',
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
