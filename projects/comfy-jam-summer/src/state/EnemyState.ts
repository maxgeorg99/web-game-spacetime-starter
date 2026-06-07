import { EnemyKind } from "../config/WaveConfig";

export type EnemyStatus = "moving" | "attacking" | "dead";

export interface EnemyState {
  id: number;
  type: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  state: EnemyStatus;
  attackTarget: { col: number; row: number } | null;
  path: Array<{ x: number; y: number }>;
  pathIndex: number;
  size: number;
}

export function createEnemyState(
  id: number,
  type: EnemyKind,
  x: number,
  y: number,
  hp: number,
  speed: number,
  size: number,
): EnemyState {
  return {
    id,
    type,
    x,
    y,
    hp,
    maxHp: hp,
    speed,
    state: "moving",
    attackTarget: null,
    path: [],
    pathIndex: 0,
    size,
  };
}
