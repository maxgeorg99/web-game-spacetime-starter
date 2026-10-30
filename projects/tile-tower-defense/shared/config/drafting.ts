import type { TileId } from './island';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export const rarityColors: Record<Rarity, number> = {
  common: 0x859c79,
  uncommon: 0x4d9caa,
  rare: 0xa27ac1,
  legendary: 0xd3a544,
};
export const discoveries: Record<TileId, { rarity: Rarity; weight: number; unlock: number }> = {
  meadow: { rarity: 'common', weight: 5, unlock: 1 },
  forest: { rarity: 'common', weight: 5, unlock: 1 },
  farm: { rarity: 'common', weight: 5, unlock: 1 },
  quarry: { rarity: 'uncommon', weight: 3, unlock: 1 },
  orchard: { rarity: 'uncommon', weight: 3, unlock: 2 },
  watchpost: { rarity: 'uncommon', weight: 3, unlock: 1 },
  shrine: { rarity: 'rare', weight: 2, unlock: 2 },
  windmill: { rarity: 'rare', weight: 2, unlock: 2 },
  relic: { rarity: 'legendary', weight: 1, unlock: 3 },
};
export const terrainBonuses = {
  groveGold: 4,
  pastureMeat: 2,
  quarryGold: 6,
  orchardMeat: 2,
  perchRange: 0.25,
  shrineDamage: 0.2,
  shrineRadius: 2,
  relicHealing: 3,
  windmillSpeed: 0.15,
  windmillRadius: 2,
} as const;
