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
    description: 'Hold the island through the first major assault. The wider world awaits.',
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
    name: 'Marsh runners',
    description: 'Snakes, spiders and gnolls rush the coast. Cover the whole road.',
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
    name: 'Rising tide',
    description: 'Fast fish travel in tight schools. Prepare overlapping fire.',
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
    name: 'The bone banner',
    description: 'Goblin lancers lead skulls and shamans. Do not let the shamans reach the keep.',
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
    name: 'Wildwood dash',
    description: 'Gnomes and thieves race ahead of satyr archers. Range matters.',
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
    name: 'The scaled column',
    description: 'Turtles anchor a column of lizards and lizardmen.',
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
    name: 'Forest giants',
    description: 'Pandas and bears precede a minotaur rear guard. Invest in sustained damage.',
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
    name: 'Ashen procession',
    description: 'Skeleton mages, pyromancers and mages march in close formation.',
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
    name: 'The iron company',
    description: 'Dwarves absorb the opening fire before faster knights arrive.',
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
    name: 'Moonlit hunt',
    description: 'Werewolves, gryphons and centaurs leave little time to react.',
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
    name: 'Mountain breakers',
    description: 'Ogres and stone golems advance slowly with enormous health pools.',
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
    name: 'Hollow cavalcade',
    description: 'Gargoyles draw fire while headless horsemen close the distance.',
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
    name: 'Hellgate',
    description: 'Demons and cerberus punish every breach. Keep damage is severe.',
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
    name: 'Dragonfall',
    description: 'Dragons enter the road behind a fast gryphon vanguard.',
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
    name: 'The gathering storm',
    description: 'Fast raiders, durable golems and demons test every part of your defense.',
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
    name: 'The last horizon',
    description: 'Hold against the final host: knights, cerberus, dragons and an ogre rear guard.',
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
