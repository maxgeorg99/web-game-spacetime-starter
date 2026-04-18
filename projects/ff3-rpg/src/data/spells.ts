export interface SpellDef {
  id: string;
  name: string;
  mpCost: number;
  target: 'enemy' | 'ally';
  element: string;
  effect: 'damage' | 'heal' | 'buff_def';
  iconKey: string;
}

export const SPELLS: Record<string, SpellDef> = {
  fire: {
    id: 'fire', name: 'Fire', mpCost: 8,
    target: 'enemy', element: 'Fire', effect: 'damage',
    iconKey: 'fire_spell',
  },
  blizzard: {
    id: 'blizzard', name: 'Blizzard', mpCost: 8,
    target: 'enemy', element: 'Ice', effect: 'damage',
    iconKey: 'ice_spell',
  },
  thunder: {
    id: 'thunder', name: 'Thunder', mpCost: 8,
    target: 'enemy', element: 'Lightning', effect: 'damage',
    iconKey: 'lightning_spell',
  },
  cure: {
    id: 'cure', name: 'Cure', mpCost: 6,
    target: 'ally', element: 'Holy', effect: 'heal',
    iconKey: 'healing_spell',
  },
  poison: {
    id: 'poison', name: 'Poison', mpCost: 5,
    target: 'enemy', element: 'Dark', effect: 'damage',
    iconKey: 'poison_dagger',
  },
  protect: {
    id: 'protect', name: 'Protect', mpCost: 5,
    target: 'ally', element: 'None', effect: 'buff_def',
    iconKey: 'fortify_spell',
  },
};
