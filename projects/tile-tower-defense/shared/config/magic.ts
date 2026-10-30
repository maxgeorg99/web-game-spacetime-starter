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
const branches = [
  {
    id: 'frost',
    name: 'Frost',
    icon: 'magic/frost-icon',
    nodes: [
      ['attune', 'Chill', 'Unlock slow: 30/40/50% for 2 seconds. Primary target only.'],
      ['duration', 'Lingering winter', '+0.5 seconds of chill per rank.'],
      ['power', 'Ice lance', '+15% bolt damage per rank.'],
      [
        'capstone',
        'Deep freeze',
        'Every 5th cast freezes its primary target for 0.8 seconds. Targets resist another freeze for 3 seconds.',
      ],
    ],
  },
  {
    id: 'fire',
    name: 'Fire',
    icon: 'magic/fire-icon',
    nodes: [
      ['attune', 'Kindle', 'Primary hits burn for 20/40/60% of bolt damage per second.'],
      ['duration', 'Slow embers', '+1 second burn duration per rank (base 3 seconds).'],
      ['power', 'Feed the flame', '+1 maximum burn stack per rank (base 1).'],
      [
        'capstone',
        'Ignition',
        'Every 5th cast bursts on impact for an extra 100% bolt damage within 1.1 tiles.',
      ],
    ],
  },
  {
    id: 'lightning',
    name: 'Lightning',
    icon: 'magic/lightning-icon',
    nodes: [
      [
        'attune',
        'Chain spark',
        'Unlock 2/3/4 additional jumps. Jumps deal damage only.',
      ],
      ['duration', 'Arcing reach', '+0.3 tiles jump range per rank (base 1.2).'],
      ['power', 'Conduction', 'Keep 5% more damage per jump per rank (base 70%).'],
      [
        'capstone',
        'Overcharge',
        'Every 4th cast gains 2 additional jumps with no damage lost between targets.',
      ],
    ],
  },
] as const;
export const mageTree: SkillTree = {
  tower: 'sentinel',
  pointLimit: magicBalance.pointLimit,
  branches: branches.map((branch) => branch.name),
  nodes: branches.flatMap((branch, index) =>
    branch.nodes.map(([suffix, name, description], tier) => ({
      id: `${branch.id}-${suffix}`,
      name,
      description,
      icon: branch.icon,
      branch: index,
      tier: tier + 1,
      maxRank: tier === 3 ? 1 : 3,
      goldCost: [20, 25, 35, 90][tier],
      stat: 'magic' as const,
      perRank: 1,
      ...(tier > 0
        ? { requires: { id: `${branch.id}-${branch.nodes[tier - 1][0]}`, rank: 3 } }
        : {}),
      ...(tier === 3 ? { branchPoints: magicBalance.capstonePoints, capstone: true } : {}),
    })),
  ),
};
