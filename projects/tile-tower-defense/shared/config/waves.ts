import type { WaveDef } from './types';
export const waves = [
  {
    id: 'first-footsteps',
    name: 'First footsteps',
    description: 'A scouting party approaches. Build near the bend.',
    interval: 1.5,
    healthMultiplier: 1,
    groups: [{ unit: 'goblin', count: 7 }],
  },
  {
    id: 'raiding-party',
    name: 'Raiding party',
    description: 'Serpents follow a spider vanguard. Cover the bend with towers.',
    interval: 1.2,
    healthMultiplier: 1.1,
    groups: [
      { unit: 'goblin', count: 6 },
      { unit: 'raider', count: 3 },
    ],
  },
  {
    id: 'green-tide',
    name: 'The green tide',
    description: 'A close-packed swarm. Splash damage earns its keep.',
    interval: 0.65,
    healthMultiplier: 1.3,
    groups: [
      { unit: 'goblin', count: 16 },
      { unit: 'raider', count: 4 },
    ],
  },
  {
    id: 'heavy-footfall',
    name: 'Heavy footfall',
    description: 'The first siege tortoises. Specialize your towers.',
    interval: 1.1,
    healthMultiplier: 1.4,
    groups: [
      { unit: 'raider', count: 7 },
      { unit: 'brute', count: 2 },
    ],
  },
  {
    id: 'last-light',
    name: 'Last light',
    description: 'Hold the island through one final assault.',
    interval: 0.85,
    healthMultiplier: 1.6,
    groups: [
      { unit: 'goblin', count: 10 },
      { unit: 'raider', count: 8 },
      { unit: 'brute', count: 4 },
    ],
  },
] as const satisfies readonly WaveDef[];
