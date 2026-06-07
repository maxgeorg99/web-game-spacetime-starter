import { GridState } from "./GridState";
import { WaveState } from "./WaveState";
import { EnemyState } from "./EnemyState";
import { TowerState } from "./TowerState";
import { EconomyState } from "./EconomyState";
import { TideState } from "./TideState";

export interface ProjectileState {
  id: number;
  x: number;
  y: number;
  weapon: string;
  targetEnemyId: number;
  bounceRemaining: number;
  bouncedTargets: number[];
  dead: boolean;
}

export interface GameFlags {
  firstTowerPlaced: boolean;
  firstWallPlaced: boolean;
  sandwichFound: boolean;
  gameStarted: boolean;
}

export function createGameFlags(): GameFlags {
  return {
    firstTowerPlaced: false,
    firstWallPlaced: false,
    sandwichFound: false,
    gameStarted: false,
  };
}

export interface GameState {
  grid: GridState;
  wave: WaveState;
  enemies: EnemyState[];
  towers: TowerState[];
  projectiles: ProjectileState[];
  economy: EconomyState;
  tide: TideState;
  flags: GameFlags;
}

export function updateState(prev: GameState, patch: Partial<GameState>): GameState {
  return { ...prev, ...patch };
}
