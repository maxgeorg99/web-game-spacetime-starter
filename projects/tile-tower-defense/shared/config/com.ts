import type { TowerId } from './towers';

/** Stable captain IDs and normal-price preferences, shared by policy and picker. */
export const comCaptains = [
  {
    id: 'rook',
    name: 'Rook Emberwake',
    portrait: 'captains/rook',
    decisionSeconds: 0.9,
    raidSeconds: 8,
    raidPassengers: 2,
    initialTowers: 2,
    wavesPerTower: 3,
    goldWeight: 0.8,
    meatWeight: 3.5,
    healingWeight: 5,
    towerWeights: { watchtower: 1.7, catapult: 1, sentinel: 0.7 },
    units: ['warrior', 'berserker', 'horseman'],
    upgradeBranch: 0,
    attackFirst: true,
    targetWeakness: 1.5,
  },
  {
    id: 'mara',
    name: 'Mara Stoneguard',
    portrait: 'captains/mara',
    decisionSeconds: 1.3,
    raidSeconds: 20,
    raidPassengers: 4,
    initialTowers: 3,
    wavesPerTower: 2,
    goldWeight: 1.2,
    meatWeight: 0.8,
    healingWeight: 12,
    towerWeights: { watchtower: 0.8, catapult: 1.1, sentinel: 2.4 },
    units: ['lancer', 'king', 'swordsman'],
    upgradeBranch: 0,
    attackFirst: false,
    targetWeakness: 0.4,
  },
  {
    id: 'ivo',
    name: 'Ivo Goldleaf',
    portrait: 'captains/ivo',
    decisionSeconds: 1.6,
    raidSeconds: 16,
    raidPassengers: 6,
    initialTowers: 2,
    wavesPerTower: 2,
    goldWeight: 2.6,
    meatWeight: 1.8,
    healingWeight: 4,
    towerWeights: { watchtower: 0.9, catapult: 2.3, sentinel: 1 },
    units: ['archer', 'monk', 'swordsman'],
    upgradeBranch: 1,
    attackFirst: false,
    targetWeakness: 1,
  },
] as const satisfies readonly {
  id: string;
  name: string;
  portrait: string;
  decisionSeconds: number;
  raidSeconds: number;
  raidPassengers: number;
  initialTowers: number;
  wavesPerTower: number;
  goldWeight: number;
  meatWeight: number;
  healingWeight: number;
  towerWeights: Record<TowerId, number>;
  units: readonly string[];
  upgradeBranch: number;
  attackFirst: boolean;
  targetWeakness: number;
}[];
export type ComCaptainId = (typeof comCaptains)[number]['id'];
export function comCaptain(id: string | undefined, slot = 1) {
  return (
    comCaptains.find((captain) => captain.id === id) ?? comCaptains[(slot + 2) % comCaptains.length]
  );
}
export const comBalance = { maxTowers: 10, variation: 0.65, responseHealth: 0.45 } as const;
