import Phaser from "phaser";
import { WaveDef, WAVES, EnemyKind } from "../config/WaveConfig";

export type WavePhase = "build" | "spawning" | "fighting" | "victory" | "defeat";

export interface WaveIntel {
  direction: string;
  counts: { type: EnemyKind; count: number }[];
}

export class WaveSystem {
  private waves: WaveDef[];
  currentWave = 0;
  phase: WavePhase = "build";
  buildTimer = 0;
  forceTruth = false;
  private spawnQueue: Array<{ type: EnemyKind; edge: string }> = [];
  private spawnTimer = 0;
  private spawnInterval = 800;
  private enemiesAlive = 0;
  private currentDef: WaveDef | null = null;
  shellCount = 15;

  onWaveStart?: (wave: number, intel: WaveIntel) => void;
  onBuildTimer?: (secondsLeft: number) => void;
  onShellChange?: (shells: number) => void;
  onGameOver?: () => void;
  onVictory?: () => void;

  constructor(waves?: WaveDef[]) {
    this.waves = waves ?? WAVES;
  }

  get isBuildPhase(): boolean {
    return this.phase === "build";
  }

  startNextWave(): boolean {
    if (this.phase === "defeat" || this.phase === "victory") return false;

    const def = this.waves[this.currentWave];
    if (!def) return false;

    this.currentDef = def;
    this.phase = "build";
    this.buildTimer = def.buildTimeSec * 1000;

    const intel = this.generateIntel(def);
    this.onWaveStart?.(this.currentWave + 1, intel);

    return true;
  }

  update(delta: number, enemyCount: number): void {
    switch (this.phase) {
      case "build":
        this.updateBuild(delta);
        break;
      case "spawning":
        this.updateSpawning(delta);
        break;
      case "fighting":
        this.updateFighting(enemyCount);
        break;
    }
  }

  /** Call when an enemy dies — decrement alive count. */
  notifyEnemyDied(): void {
    this.enemiesAlive = Math.max(0, this.enemiesAlive - 1);
  }

  /** Call when an enemy reaches the inner ring — decrement shell count. */
  notifyEnemyReachedCenter(): void {
    this.shellCount = Math.max(0, this.shellCount - 1);
    this.onShellChange?.(this.shellCount);
    if (this.shellCount <= 0) {
      this.phase = "defeat";
      this.onGameOver?.();
    }
  }

  /** Queries for EnemySystem — returns the list of enemies to spawn. */
  getSpawnQueue(): Array<{ type: EnemyKind; edge: string }> {
    const snap = [...this.spawnQueue];
    this.spawnQueue = [];
    return snap;
  }

  getSpeedMult(): number {
    return this.currentDef?.speedMult ?? 1;
  }

  getHpMult(): number {
    return this.currentDef?.hpMult ?? 1;
  }

  // ── Private ──────────────────────────────────────────────────────

  private updateBuild(delta: number): void {
    this.buildTimer -= delta;
    this.onBuildTimer?.(Math.max(0, Math.ceil(this.buildTimer / 1000)));

    if (this.buildTimer <= 0) {
      this.beginSpawning();
    }
  }

  private beginSpawning(): void {
    if (!this.currentDef) return;
    this.phase = "spawning";

    // Queue each enemy batch.
    for (const batch of this.currentDef.enemies) {
      for (let i = 0; i < batch.count; i++) {
        const edge = batch.edges[Math.floor(Math.random() * batch.edges.length)];
        this.spawnQueue.push({ type: batch.type, edge });
      }
    }

    // Shuffle for mixed spawns.
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }

    this.spawnTimer = 0;
    this.enemiesAlive = this.spawnQueue.length;
  }

  private updateSpawning(delta: number): void {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval && this.spawnQueue.length > 0) {
      this.spawnTimer -= this.spawnInterval;
      this.spawnQueue.pop();
    }

    // All enemies dispatched → switch to fighting.
    if (this.spawnQueue.length === 0) {
      this.phase = "fighting";
    }
  }

  private updateFighting(enemyCount: number): void {
    if (enemyCount <= 0) {
      this.currentWave++;
      if (this.currentWave >= this.waves.length) {
        this.phase = "victory";
        this.onVictory?.();
      } else {
        this.startNextWave();
      }
    }
  }

  // ── Intel (Liar Mechanic) ────────────────────────────────────────

  private generateIntel(def: WaveDef): WaveIntel {
    const honest = this.forceTruth || Math.random() < def.intelReliability;

    // Actual incoming direction.
    const realEdges = new Set<string>();
    const realCounts: Record<string, number> = {};
    for (const batch of def.enemies) {
      for (const e of batch.edges) realEdges.add(e);
      realCounts[batch.type] = (realCounts[batch.type] ?? 0) + batch.count;
    }

    const direction = honest
      ? [...realEdges][0] ?? "unknown"
      : this.lieDirection(realEdges);

    const counts: { type: EnemyKind; count: number }[] = [];
    for (const type of ["paddlefish", "harpoonfish", "turtle", "snake"] as EnemyKind[]) {
      const real = realCounts[type] ?? 0;
      if (real === 0) continue;
      const shown = honest ? real : Math.max(1, real - Phaser.Math.Between(1, 3));
      counts.push({ type, count: shown });
    }

    return { direction, counts };
  }

  private lieDirection(realEdges: Set<string>): string {
    const all = ["north", "south", "east", "west"];
    const candidates = all.filter((e) => !realEdges.has(e));
    if (candidates.length === 0) return "north";
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
}
