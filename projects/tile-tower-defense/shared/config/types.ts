/** Data only: keep these definitions serializable for later catalog seeding. Distances are tiles; time is seconds. */
export interface ProjectileDef {
  art: string;
  speed: number;
}
export interface TowerDef {
  avatar: string;
  projectile: ProjectileDef;
  id: string;
  art: string;
  cost: number;
  damage: number;
  range: number;
  cooldown: number;
  splash: number;
}
export interface UnitDef {
  projectile?: ProjectileDef;
  avatar: string;
  id: string;
  art: string;
  health: number;
  damage: number;
  range: number;
  cooldown: number;
  speed: number;
  meatCost: number;
  recruitable: boolean;
  reward: number;
  leak: number;
}
export type Stat = 'damage' | 'range' | 'attackSpeed' | 'splash';
export interface SkillNode {
  icon: string;
  id: string;
  branch: number;
  tier: number;
  maxRank: number;
  goldCost: number;
  requires?: { id: string; rank: number };
  stat: Stat | 'magic';
  branchPoints?: number;
  capstone?: boolean;
  perRank: number;
}
export interface SkillTree {
  pointLimit?: number;
  tower: string;
  branchIds: readonly string[];
  nodes: readonly SkillNode[];
}
export interface WaveDef {
  id: string;
  interval: number;
  healthMultiplier: number;
  groups: readonly { unit: string; count: number }[];
}
export interface TileDef {
  id: string;
  color: number;
  art?: string;
  buildable: boolean;
  goldIncome: number;
  meatIncome: number;
}
