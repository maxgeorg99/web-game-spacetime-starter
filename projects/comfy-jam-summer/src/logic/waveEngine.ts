import { WaveDef, WAVES, EnemyKind } from "../config/WaveConfig";
import { WaveState, WaveIntel } from "../state/WaveState";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function tickBuild(state: WaveState, delta: number): number {
  const newTimer = Math.max(0, state.buildTimer - delta);
  state.buildTimer = newTimer;
  return newTimer;
}

export function generateSpawns(def: WaveDef): Array<{ type: EnemyKind; edge: string }> {
  const queue: Array<{ type: EnemyKind; edge: string }> = [];
  for (const batch of def.enemies) {
    for (let i = 0; i < batch.count; i++) {
      const edge = pick(batch.edges);
      queue.push({ type: batch.type, edge });
    }
  }
  return queue;
}

export function generateIntel(def: WaveDef, forceTruth: boolean): WaveIntel {
  const honest = forceTruth || Math.random() < def.intelReliability;

  const realEdges = new Set<string>();
  const realCounts: Record<string, number> = {};
  for (const batch of def.enemies) {
    for (const e of batch.edges) realEdges.add(e);
    realCounts[batch.type] = (realCounts[batch.type] ?? 0) + batch.count;
  }

  const direction = honest
    ? [...realEdges][0] ?? "unknown"
    : lieDirection(realEdges);

  const counts: { type: EnemyKind; count: number }[] = [];
  for (const type of ["paddlefish", "harpoonfish", "turtle", "snake"] as EnemyKind[]) {
    const real = realCounts[type] ?? 0;
    if (real === 0) continue;
    const shown = honest ? real : Math.max(1, real - randBetween(1, 3));
    counts.push({ type, count: shown });
  }

  return { direction, counts };
}

function lieDirection(realEdges: Set<string>): string {
  const all = ["north", "south", "east", "west"];
  const candidates = all.filter((e) => !realEdges.has(e));
  if (candidates.length === 0) return "north";
  return pick(candidates);
}

export function getSpeedMult(_state: WaveState, def: WaveDef): number {
  return def.speedMult;
}

export function getHpMult(_state: WaveState, def: WaveDef): number {
  return def.hpMult;
}

export { WAVES as DEFAULT_WAVES };
export type { WaveDef, EnemyKind };
