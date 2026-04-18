export interface ClassStats {
  hp: number; mp: number; atk: number; def: number; mag: number; spd: number;
}

export interface ClassGrowth {
  hp: number; mp: number; atk: number; def: number; mag: number; spd: number;
}

export interface HeroClass {
  id: string;
  name: string;
  role: string;
  portraitKey: string;
  battleSpritePrefix: string;
  baseStats: ClassStats;
  growth: ClassGrowth;
  abilities: string[];  // spell IDs
}

export const HERO_CLASSES: HeroClass[] = [
  {
    id: 'fighter',
    name: 'Fighter',
    role: 'Physical DPS',
    portraitKey: 'class_fighter',
    battleSpritePrefix: 'fighter',
    baseStats: { hp: 120, mp: 10, atk: 14, def: 12, mag: 3, spd: 8 },
    growth:    { hp: 12,  mp: 1,  atk: 2,  def: 2,  mag: 0, spd: 1 },
    abilities: [],
  },
  {
    id: 'mage',
    name: 'Mage',
    role: 'Magic DPS',
    portraitKey: 'class_mage',
    battleSpritePrefix: 'mage',
    baseStats: { hp: 60, mp: 50, atk: 4, def: 5, mag: 15, spd: 7 },
    growth:    { hp: 6,  mp: 5,  atk: 0, def: 1, mag: 2,  spd: 1 },
    abilities: ['fire', 'blizzard', 'thunder'],
  },
  {
    id: 'paladin',
    name: 'Paladin',
    role: 'Tank / Hybrid',
    portraitKey: 'class_paladin',
    battleSpritePrefix: 'paladin',
    baseStats: { hp: 100, mp: 20, atk: 10, def: 15, mag: 8, spd: 5 },
    growth:    { hp: 10,  mp: 2,  atk: 1,  def: 2,  mag: 1, spd: 0 },
    abilities: ['cure', 'protect'],
  },
  {
    id: 'rogue',
    name: 'Rogue',
    role: 'Fast DPS',
    portraitKey: 'class_rogue',
    battleSpritePrefix: 'rogue',
    baseStats: { hp: 70, mp: 15, atk: 12, def: 6, mag: 5, spd: 14 },
    growth:    { hp: 7,  mp: 1,  atk: 2,  def: 1, mag: 0, spd: 2 },
    abilities: ['poison'],
  },
  {
    id: 'priest',
    name: 'Priest',
    role: 'Healer',
    portraitKey: 'class_priest',
    battleSpritePrefix: 'priest',
    baseStats: { hp: 80, mp: 45, atk: 5, def: 8, mag: 13, spd: 6 },
    growth:    { hp: 8,  mp: 4,  atk: 0, def: 1, mag: 2,  spd: 1 },
    abilities: ['cure', 'protect'],
  },
  {
    id: 'valkyrie',
    name: 'Valkyrie',
    role: 'Balanced',
    portraitKey: 'class_valkyrie',
    battleSpritePrefix: 'valkyrie',
    baseStats: { hp: 90, mp: 25, atk: 11, def: 10, mag: 9, spd: 10 },
    growth:    { hp: 9,  mp: 2,  atk: 1,  def: 1,  mag: 1, spd: 1 },
    abilities: ['fire', 'cure'],
  },
];
