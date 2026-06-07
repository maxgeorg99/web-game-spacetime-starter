import { EnemyKind } from "../config/WaveConfig";

export type WavePhase = "build" | "spawning" | "fighting" | "victory" | "defeat";

export interface WaveIntel {
  direction: string;
  counts: { type: EnemyKind; count: number }[];
}

export interface WaveState {
  phase: WavePhase;
  currentWave: number;
  buildTimer: number;
  spawnQueue: Array<{ type: EnemyKind; edge: string }>;
  spawnTimer: number;
  enemiesAlive: number;
  shellCount: number;
  intel: WaveIntel | null;
  forceTruth: boolean;
}

export function createWaveState(): WaveState {
  return {
    phase: "build",
    currentWave: 0,
    buildTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    enemiesAlive: 0,
    shellCount: 15,
    intel: null,
    forceTruth: false,
  };
}
