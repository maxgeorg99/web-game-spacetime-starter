import type { SkillTree } from './types';
export const schools = ['frost', 'fire', 'lightning'] as const;
export type School = (typeof schools)[number];
export type MageAspect = School | 'arcane';
export const magicBalance = {
  pointLimit: 15,
  capstonePoints: 9,
  freezeEvery: 5,
  freezeSeconds: 0.8,
  freezeImmunity: 3,
  igniteEvery: 5,
  igniteRadius: 1.1,
  stormEvery: 4,
  stormExtraJumps: 2,
  slowBase: 0.2,
  slowPerRank: 0.1,
  slowDuration: 2,
  durationPerRank: 0.5,
  frostDamagePerRank: 0.15,
  burnPerRank: 0.2,
  burnSeconds: 3,
  burnDurationPerRank: 1,
  chainRange: 1.2,
  chainRangePerRank: 0.3,
  chainRetention: 0.7,
  chainRetentionPerRank: 0.05,
} as const;
export const magicColors: Record<MageAspect, number> = {
  arcane: 0xc7a2ff,
  frost: 0x8eeaff,
  fire: 0xffa348,
  lightning: 0xf1e58c,
};
const nodeIds = ['attune', 'duration', 'power', 'capstone'] as const;
export const mageTree: SkillTree = {
  tower: 'sentinel',
  pointLimit: magicBalance.pointLimit,
  branchIds: schools,
  nodes: schools.flatMap((school, index) =>
    nodeIds.map((suffix, tier) => ({
      id: `${school}-${suffix}`,
      icon: `magic/${school}-icon`,
      branch: index,
      tier: tier + 1,
      maxRank: tier === 3 ? 1 : 3,
      goldCost: [20, 25, 35, 90][tier],
      stat: 'magic' as const,
      perRank: 1,
      ...(tier > 0 ? { requires: { id: `${school}-${nodeIds[tier - 1]}`, rank: 3 } } : {}),
      ...(tier === 3 ? { branchPoints: magicBalance.capstonePoints, capstone: true } : {}),
    })),
  ),
};
