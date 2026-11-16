/** Measured horizontal square-frame strips; no spacing or margins.
 * Lizard intentionally uses its nine-frame attack strip as the death sequence.
 */
export const deathSheets: Record<string, { size: number; frames: number }> = {
  'death/warrior': {
    size: 192,
    frames: 4,
  },
  'death/archer': {
    size: 192,
    frames: 5,
  },
  'death/lancer': {
    size: 320,
    frames: 5,
  },
  'death/monk': {
    size: 192,
    frames: 4,
  },
  'death/skull': {
    size: 192,
    frames: 5,
  },
  'death/paddle_fish': {
    size: 192,
    frames: 5,
  },
  'death/harpoon_fish': {
    size: 192,
    frames: 4,
  },
  'death/goblin_lancer': {
    size: 256,
    frames: 5,
  },
  'death/shaman': {
    size: 192,
    frames: 5,
  },
  'death/thief': {
    size: 192,
    frames: 5,
  },
  'death/snake': {
    size: 192,
    frames: 4,
  },
  'death/turtle': {
    size: 320,
    frames: 6,
  },
  'death/minotaur': {
    size: 320,
    frames: 4,
  },
  'death/gnoll': {
    size: 192,
    frames: 5,
  },
  'death/spider': {
    size: 192,
    frames: 5,
  },
  'death/panda': {
    size: 256,
    frames: 4,
  },
  'death/lizard': {
    size: 192,
    frames: 9,
  },
  'death/bear': {
    size: 256,
    frames: 5,
  },
  'death/gnome': {
    size: 192,
    frames: 4,
  },
  'death/ogre': {
    size: 384,
    frames: 10,
  },
  'death/dragon': {
    size: 144,
    frames: 7,
  },
  'death/mage': {
    size: 128,
    frames: 5,
  },
  'death/knight': {
    size: 192,
    frames: 6,
  },
  'death/werewolf': {
    size: 196,
    frames: 10,
  },
  'death/demon': {
    size: 192,
    frames: 10,
  },
  'death/stone_golem': {
    size: 192,
    frames: 9,
  },
  'death/lizardman': {
    size: 196,
    frames: 12,
  },
  'death/cerberus': {
    size: 128,
    frames: 10,
  },
  'death/skeleton_mage': {
    size: 128,
    frames: 10,
  },
  'death/gryphon': {
    size: 192,
    frames: 7,
  },
  'death/headless_horseman': {
    size: 192,
    frames: 10,
  },
  'death/pyromancer': {
    size: 128,
    frames: 10,
  },
  'death/dwarf': {
    size: 128,
    frames: 9,
  },
  'death/gargoyle': {
    size: 192,
    frames: 7,
  },
  'death/satyr_archer': {
    size: 128,
    frames: 8,
  },
  'death/centaur': {
    size: 192,
    frames: 8,
  },
  'death/berserker': {
    size: 192,
    frames: 6,
  },
  'death/horseman': {
    size: 320,
    frames: 6,
  },
  'death/king': {
    size: 192,
    frames: 6,
  },
  'death/swordsman': {
    size: 320,
    frames: 6,
  },
  'death/blue/warrior': {
    size: 192,
    frames: 4,
  },
  'death/blue/archer': {
    size: 192,
    frames: 5,
  },
  'death/blue/lancer': {
    size: 320,
    frames: 5,
  },
  'death/blue/monk': {
    size: 192,
    frames: 4,
  },
  'death/blue/berserker': {
    size: 192,
    frames: 6,
  },
  'death/blue/horseman': {
    size: 320,
    frames: 6,
  },
  'death/blue/king': {
    size: 192,
    frames: 6,
  },
  'death/blue/swordsman': {
    size: 320,
    frames: 6,
  },
  'death/yellow/warrior': {
    size: 192,
    frames: 4,
  },
  'death/yellow/archer': {
    size: 192,
    frames: 5,
  },
  'death/yellow/lancer': {
    size: 320,
    frames: 5,
  },
  'death/yellow/monk': {
    size: 192,
    frames: 4,
  },
  'death/yellow/berserker': {
    size: 192,
    frames: 6,
  },
  'death/yellow/horseman': {
    size: 320,
    frames: 6,
  },
  'death/yellow/king': {
    size: 192,
    frames: 6,
  },
  'death/yellow/swordsman': {
    size: 320,
    frames: 6,
  },
  'death/red/warrior': {
    size: 192,
    frames: 4,
  },
  'death/red/archer': {
    size: 192,
    frames: 5,
  },
  'death/red/lancer': {
    size: 320,
    frames: 5,
  },
  'death/red/monk': {
    size: 192,
    frames: 4,
  },
  'death/red/berserker': {
    size: 192,
    frames: 6,
  },
  'death/red/horseman': {
    size: 320,
    frames: 6,
  },
  'death/red/king': {
    size: 192,
    frames: 6,
  },
  'death/red/swordsman': {
    size: 320,
    frames: 6,
  },
  'death/purple/warrior': {
    size: 192,
    frames: 4,
  },
  'death/purple/archer': {
    size: 192,
    frames: 5,
  },
  'death/purple/lancer': {
    size: 320,
    frames: 5,
  },
  'death/purple/monk': {
    size: 192,
    frames: 4,
  },
  'death/purple/berserker': {
    size: 192,
    frames: 6,
  },
  'death/purple/horseman': {
    size: 320,
    frames: 6,
  },
  'death/purple/king': {
    size: 192,
    frames: 6,
  },
  'death/purple/swordsman': {
    size: 320,
    frames: 6,
  },
};

/** Map movement textures to death textures, including saved legacy unit IDs. */
export const deathArt: Record<string, string> = {
  'units/warrior': 'death/warrior',
  'units/archer': 'death/archer',
  'units/lancer': 'death/lancer',
  'units/monk': 'death/monk',
  'units/skull': 'death/skull',
  'units/paddle_fish': 'death/paddle_fish',
  'units/harpoon_fish': 'death/harpoon_fish',
  'units/goblin_lancer': 'death/goblin_lancer',
  'units/shaman': 'death/shaman',
  'units/thief': 'death/thief',
  'units/snake': 'death/snake',
  'units/turtle': 'death/turtle',
  'units/minotaur': 'death/minotaur',
  'units/gnoll': 'death/gnoll',
  'units/spider': 'death/spider',
  'units/panda': 'death/panda',
  'units/lizard': 'death/lizard',
  'units/bear': 'death/bear',
  'units/gnome': 'death/gnome',
  'units/ogre': 'death/ogre',
  'units/dragon': 'death/dragon',
  'units/mage': 'death/mage',
  'units/knight': 'death/knight',
  'units/werewolf': 'death/werewolf',
  'units/demon': 'death/demon',
  'units/stone_golem': 'death/stone_golem',
  'units/lizardman': 'death/lizardman',
  'units/cerberus': 'death/cerberus',
  'units/skeleton_mage': 'death/skeleton_mage',
  'units/gryphon': 'death/gryphon',
  'units/headless_horseman': 'death/headless_horseman',
  'units/pyromancer': 'death/pyromancer',
  'units/dwarf': 'death/dwarf',
  'units/gargoyle': 'death/gargoyle',
  'units/satyr_archer': 'death/satyr_archer',
  'units/centaur': 'death/centaur',
  'units/berserker': 'death/berserker',
  'units/horseman': 'death/horseman',
  'units/king': 'death/king',
  'units/swordsman': 'death/swordsman',
  'factions/blue/units/warrior': 'death/blue/warrior',
  'factions/blue/units/archer': 'death/blue/archer',
  'factions/blue/units/lancer': 'death/blue/lancer',
  'factions/blue/units/monk': 'death/blue/monk',
  'factions/blue/units/berserker': 'death/blue/berserker',
  'factions/blue/units/horseman': 'death/blue/horseman',
  'factions/blue/units/king': 'death/blue/king',
  'factions/blue/units/swordsman': 'death/blue/swordsman',
  'factions/yellow/units/warrior': 'death/yellow/warrior',
  'factions/yellow/units/archer': 'death/yellow/archer',
  'factions/yellow/units/lancer': 'death/yellow/lancer',
  'factions/yellow/units/monk': 'death/yellow/monk',
  'factions/yellow/units/berserker': 'death/yellow/berserker',
  'factions/yellow/units/horseman': 'death/yellow/horseman',
  'factions/yellow/units/king': 'death/yellow/king',
  'factions/yellow/units/swordsman': 'death/yellow/swordsman',
  'factions/red/units/warrior': 'death/red/warrior',
  'factions/red/units/archer': 'death/red/archer',
  'factions/red/units/lancer': 'death/red/lancer',
  'factions/red/units/monk': 'death/red/monk',
  'factions/red/units/berserker': 'death/red/berserker',
  'factions/red/units/horseman': 'death/red/horseman',
  'factions/red/units/king': 'death/red/king',
  'factions/red/units/swordsman': 'death/red/swordsman',
  'factions/purple/units/warrior': 'death/purple/warrior',
  'factions/purple/units/archer': 'death/purple/archer',
  'factions/purple/units/lancer': 'death/purple/lancer',
  'factions/purple/units/monk': 'death/purple/monk',
  'factions/purple/units/berserker': 'death/purple/berserker',
  'factions/purple/units/horseman': 'death/purple/horseman',
  'factions/purple/units/king': 'death/purple/king',
  'factions/purple/units/swordsman': 'death/purple/swordsman',
  squire: 'death/blue/warrior',
  'factions/blue/squire': 'death/blue/warrior',
  'factions/yellow/squire': 'death/yellow/warrior',
  'factions/red/squire': 'death/red/warrior',
  'factions/purple/squire': 'death/purple/warrior',
  ranger: 'death/blue/archer',
  'factions/blue/ranger': 'death/blue/archer',
  'factions/yellow/ranger': 'death/yellow/archer',
  'factions/red/ranger': 'death/red/archer',
  'factions/purple/ranger': 'death/purple/archer',
  guardian: 'death/blue/lancer',
  'factions/blue/guardian': 'death/blue/lancer',
  'factions/yellow/guardian': 'death/yellow/lancer',
  'factions/red/guardian': 'death/red/lancer',
  'factions/purple/guardian': 'death/purple/lancer',
  swarm: 'death/spider',
  raider: 'death/snake',
  siege: 'death/turtle',
};

export const deathPresentation = {
  framesPerSecond: 12,
  holdMilliseconds: 150,
  fadeMilliseconds: 350,
  maxBodies: 64,
} as const;
