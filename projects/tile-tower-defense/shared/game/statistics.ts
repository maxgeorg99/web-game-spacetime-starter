import type { TowerId } from '../config';
import type { Fighter, State, Tower } from './model';
import type { MatchOutcome } from './outcome';

export interface Contribution {
  damage: number;
  kills: number;
  shots: number;
  controlSeconds: number;
}
export interface TowerStatistics extends Contribution {
  built: number;
  goldSpent: number;
}
export interface RunStatistics {
  version: 1;
  partial: boolean;
  seconds: number;
  waves: number;
  damage: number;
  kills: number;
  leaks: number;
  keepDamage: number;
  goldIncome: number;
  meatIncome: number;
  bounty: number;
  buildGold: number;
  upgradeGold: number;
  saleGold: number;
  meatSpent: number;
  sent: number;
  landed: number;
  raidLeaks: number;
  raidDamage: number;
  towers: Partial<Record<TowerId, TowerStatistics>>;
}
export interface DamageSource {
  towerId: number;
  kind: TowerId;
}
export interface RunReport {
  version: 1;
  owner: string;
  name: string;
  outcome: MatchOutcome;
  statistics: RunStatistics;
}
export const contribution = (): Contribution => ({
  damage: 0,
  kills: 0,
  shots: 0,
  controlSeconds: 0,
});
export function freshStatistics(partial = false): RunStatistics {
  return {
    version: 1,
    partial,
    seconds: 0,
    waves: 0,
    damage: 0,
    kills: 0,
    leaks: 0,
    keepDamage: 0,
    goldIncome: 0,
    meatIncome: 0,
    bounty: 0,
    buildGold: 0,
    upgradeGold: 0,
    saleGold: 0,
    meatSpent: 0,
    sent: 0,
    landed: 0,
    raidLeaks: 0,
    raidDamage: 0,
    towers: {},
  };
}
/** Older saves start measuring now; historical counters are deliberately not inferred. */
export function statistics(state: State): RunStatistics {
  return (state.statistics ??= freshStatistics(true));
}
export function towerStatistics(state: State, kind: TowerId): TowerStatistics {
  return (statistics(state).towers[kind] ??= { ...contribution(), built: 0, goldSpent: 0 });
}
export function credit(
  state: State,
  source: DamageSource | undefined,
  key: keyof Contribution,
  amount: number,
) {
  if (!source || amount <= 0) {
    return;
  }
  towerStatistics(state, source.kind)[key] += amount;
  const tower = state.towers.find((t) => t.id === source.towerId);
  if (tower) {
    (tower.statistics ??= contribution())[key] += amount;
  }
}
export function towerSource(tower: Tower): DamageSource {
  return { towerId: tower.id, kind: tower.kind };
}
/** Record effective damage after resistance, capped to remaining HP. Never changes damage rules. */
export function dealDamage(
  state: State | undefined,
  target: Fighter,
  amount: number,
  ally: boolean,
  source?: DamageSource,
) {
  const effective = Math.min(Math.max(0, target.health), Math.max(0, amount));
  target.health -= amount;
  if (!state || !ally || effective <= 0) {
    return;
  }
  const stats = statistics(state);
  stats.damage += effective;
  credit(state, source, 'damage', effective);
  if (target.health <= 0) {
    stats.kills++;
    credit(state, source, 'kills', 1);
  }
}
