export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  xpReward: number;
  goldReward: number;
  spritePrefix: string;
  frameSize: number;
}

// Tier 1 — Emerald Forest
export const ENEMIES: Record<string, EnemyDef> = {
  gnome: {
    id: 'gnome', name: 'Gnome',
    hp: 35, atk: 8, def: 4, mag: 3, spd: 6,
    xpReward: 12, goldReward: 5,
    spritePrefix: 'gnome', frameSize: 192,
  },
  skull: {
    id: 'skull', name: 'Skull',
    hp: 25, atk: 10, def: 2, mag: 5, spd: 8,
    xpReward: 10, goldReward: 4,
    spritePrefix: 'skeleton_mage', frameSize: 128,
  },
  bear: {
    id: 'bear', name: 'Bear',
    hp: 60, atk: 12, def: 6, mag: 2, spd: 4,
    xpReward: 18, goldReward: 8,
    spritePrefix: 'bear', frameSize: 256,
  },
};
