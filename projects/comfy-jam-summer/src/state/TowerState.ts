export type AimingStrategy = "closest" | "farthest" | "mostHp" | "leastHp";

export interface TowerState {
  col: number;
  row: number;
  weapon: string | null;
  aimingStrategy: AimingStrategy;
  lastFireTime: number;
  level: number;
}

export function createTowerState(
  col: number,
  row: number,
  strategy: AimingStrategy = "closest",
): TowerState {
  return {
    col,
    row,
    weapon: null,
    aimingStrategy: strategy,
    lastFireTime: 0,
    level: 0,
  };
}
