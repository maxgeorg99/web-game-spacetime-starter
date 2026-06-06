import Phaser from "phaser";
import { GRID_COLS, GRID_ROWS, TILE_SIZE, SPAWN_EDGES } from "../config/constants";
import { isSand, worldToGrid } from "../utils/gridUtils";
import { Enemy, EnemyState, EnemyType, EnemyConfig } from "../entities/Enemy";
import { PathfindingSystem, TARGET_COL, TARGET_ROW } from "./PathfindingSystem";
import { BuildSystem } from "./BuildSystem";

export const ENEMY_ATTACK_DPS: Record<EnemyType, number> = {
  paddlefish: 10,
  harpoonfish: 15,
  turtle: 5,
  snake: 8,
};

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  paddlefish: {
    type: "paddlefish",
    walkSheetKey: "enemy-paddlefish-run",
    walkAnimKey: "paddlefish-walk",
    attackSheetKey: "enemy-paddlefish-attack",
    attackAnimKey: "paddlefish-attack",
    hp: 30,
    speed: 50,
    attackDamage: ENEMY_ATTACK_DPS.paddlefish,
    size: 1.4,
  },
  harpoonfish: {
    type: "harpoonfish",
    walkSheetKey: "enemy-harpoonfish-run",
    walkAnimKey: "harpoonfish-walk",
    attackSheetKey: "enemy-harpoonfish-attack",
    attackAnimKey: "harpoonfish-attack",
    hp: 50,
    speed: 55,
    attackDamage: ENEMY_ATTACK_DPS.harpoonfish,
    size: 1.4,
  },
  turtle: {
    type: "turtle",
    walkSheetKey: "enemy-turtle-walk",
    walkAnimKey: "turtle-walk",
    attackSheetKey: "enemy-turtle-attack",
    attackAnimKey: "turtle-attack",
    hp: 80,
    speed: 25,
    attackDamage: ENEMY_ATTACK_DPS.turtle,
    size: 1.6,
  },
  snake: {
    type: "snake",
    walkSheetKey: "enemy-snake-run",
    walkAnimKey: "snake-walk",
    attackSheetKey: "enemy-snake-attack",
    attackAnimKey: "snake-attack",
    hp: 20,
    speed: 70,
    attackDamage: ENEMY_ATTACK_DPS.snake,
    size: 1.2,
  },
};

export class EnemySystem {
  private scene: Phaser.Scene;
  private enemies: Enemy[] = [];
  private pathfinding!: PathfindingSystem;
  private buildSystem!: BuildSystem;
  private offsetX: number;
  private offsetY: number;

  onEnemyDied?: () => void;
  onEnemyReachedCenter?: () => void;

  constructor(scene: Phaser.Scene, offsetX: number, offsetY: number) {
    this.scene = scene;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.createAllAnims();
  }

  setPathfinding(pathfinding: PathfindingSystem): void {
    this.pathfinding = pathfinding;
  }

  setBuildSystem(buildSystem: BuildSystem): void {
    this.buildSystem = buildSystem;
  }

  // ── Wave-based Spawning ──────────────────────────────────────────

  update(delta: number): void {
    for (const enemy of this.enemies) {
      enemy.update(delta);

      if (enemy.state === EnemyState.ATTACKING && enemy.attackTarget) {
        const dmg = (enemy.attackDamage * delta) / 1000;
        const destroyed = this.buildSystem.damageStructure(
          enemy.attackTarget.col,
          enemy.attackTarget.row,
          dmg,
        );
        if (destroyed) {
          this.repathEnemy(enemy);
        }
      }
    }

    const aliveBefore = this.enemies.length;

    for (const enemy of this.enemies) {
      if (enemy.shouldRemove && enemy.state === EnemyState.MOVING) {
        // Reached the center — shell stolen.
        this.onEnemyReachedCenter?.();
      }
      if (enemy.shouldRemove && enemy.sprite.active) {
        enemy.destroy();
      }
    }

    this.enemies = this.enemies.filter((e) => !e.shouldRemove);

    if (this.enemies.length < aliveBefore) {
      this.onEnemyDied?.();
    }
  }

  /** Spawn one enemy at a random position on the given edge. */
  spawnFromEdge(type: EnemyType, edge: string, speedMult = 1, hpMult = 1): void {
    const points = SPAWN_EDGES[edge];
    if (!points || points.length === 0) return;

    const slot = points[Math.floor(Math.random() * points.length)];
    const config = { ...ENEMY_CONFIGS[type] };

    config.speed *= speedMult;
    config.hp = Math.round(config.hp * hpMult);

    const spawnX = this.offsetX + slot.col * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = this.offsetY + slot.row * TILE_SIZE + TILE_SIZE / 2;

    const enemy = new Enemy(this.scene, config, spawnX, spawnY);

    const sandEntry = this.findNearestSand(slot.col, slot.row);
    const entryX = this.offsetX + sandEntry.col * TILE_SIZE + TILE_SIZE / 2;

    const path = this.pathfinding.findPath(sandEntry.col, sandEntry.row, TARGET_COL, TARGET_ROW);

    if (path) {
      const worldPath = this.pathfinding.pathToWorld(path);
      if (sandEntry.col !== slot.col || sandEntry.row !== slot.row) {
        worldPath.unshift({ x: entryX, y: spawnY });
      }
      enemy.setWaypoints(worldPath);
    } else {
      this.engageNearestStructure(enemy, sandEntry.col, sandEntry.row);
    }

    this.enemies.push(enemy);
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  /** Called when grid occupancy changes — recalculates paths for all active enemies. */
  recalculateAllPaths(): void {
    for (const enemy of this.enemies) {
      const { col, row } = worldToGrid(
        enemy.sprite.x,
        enemy.sprite.y,
        this.offsetX,
        this.offsetY,
        TILE_SIZE,
      );
      this.repathFrom(enemy, col, row);
    }
  }

  // ── internal ────────────────────────────────────────────────────

  /** Find the nearest sand cell toward the center from a spawn position. */
  private findNearestSand(col: number, row: number): { col: number; row: number } {
    const dCol = Math.sign(TARGET_COL - col);
    const dRow = Math.sign(TARGET_ROW - row);

    let c = col;
    let r = row;
    while (c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS) {
      if (isSand(c, r)) return { col: c, row: r };
      c += dCol;
      r += dRow;
    }
    return { col: TARGET_COL, row: TARGET_ROW };
  }

  /** Attempt to find a new path when a structure is destroyed. */
  private repathEnemy(enemy: Enemy): void {
    const { col, row } = worldToGrid(
      enemy.sprite.x,
      enemy.sprite.y,
      this.offsetX,
      this.offsetY,
      TILE_SIZE,
    );
    this.repathFrom(enemy, col, row);
  }

  /** Core repathing logic from a given grid position. */
  private repathFrom(enemy: Enemy, col: number, row: number): void {
    const path = this.pathfinding.findPath(col, row, TARGET_COL, TARGET_ROW);
    if (path) {
      enemy.setWaypoints(this.pathfinding.pathToWorld(path));
      return;
    }

    const reachable = this.pathfinding.findNearestReachable(col, row, TARGET_COL, TARGET_ROW);

    if (reachable.col !== col || reachable.row !== row) {
      const reachPath = this.pathfinding.findPath(col, row, reachable.col, reachable.row);
      if (reachPath) {
        const worldPath = this.pathfinding.pathToWorld(reachPath);
        // When the enemy reaches this cell, switch to attacking the blocking structure.
        enemy.setWaypoints(worldPath, () => {
          this.engageNearestStructure(enemy, reachable.col, reachable.row);
        });
        return;
      }
    }

    this.engageNearestStructure(enemy, reachable.col, reachable.row);
  }

  /**
   * Enemy is at (or moving to) the nearest reachable cell and cannot
   * path to the center. Attack the adjacent damageable structure that
   * blocks further progress toward the target.
   */
  private engageNearestStructure(enemy: Enemy, fromCol: number, fromRow: number): void {
    // Check the cell in the direction toward the center first (the actual blocker).
    const dCol = Math.sign(TARGET_COL - fromCol);
    const dRow = Math.sign(TARGET_ROW - fromRow);

    const priority: { col: number; row: number }[] = [];
    if (dCol !== 0) priority.push({ col: fromCol + dCol, row: fromRow });
    if (dRow !== 0) priority.push({ col: fromCol, row: fromRow + dRow });
    if (dCol !== 0 && dRow !== 0) priority.push({ col: fromCol + dCol, row: fromRow + dRow });

    for (const p of priority) {
      if (this.buildSystem.hasStructure(p.col, p.row)) {
        const worldPos = this.pathfinding.cellToWorld(p.col, p.row);
        enemy.startAttacking(p, worldPos.x);
        return;
      }
    }

    // Fallback: check all 4 cardinal neighbors for any damageable structure.
    const neighbors = [
      { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
      { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
    ];
    for (const { dc, dr } of neighbors) {
      const nc = fromCol + dc;
      const nr = fromRow + dr;
      if (this.buildSystem.hasStructure(nc, nr)) {
        const worldPos = this.pathfinding.cellToWorld(nc, nr);
        enemy.startAttacking({ col: nc, row: nr }, worldPos.x);
        return;
      }
    }

    // No adjacent damageable structure — blocked by palms or edge. Cannot progress.
    enemy.shouldRemove = true;
  }

  // ── Animations ──────────────────────────────────────────────────

  private createAllAnims(): void {
    for (const config of Object.values(ENEMY_CONFIGS)) {
      if (!this.scene.anims.exists(config.walkAnimKey)) {
        this.scene.anims.create({
          key: config.walkAnimKey,
          frames: this.scene.anims.generateFrameNumbers(config.walkSheetKey),
          frameRate: 8,
          repeat: -1,
        });
      }
      if (!this.scene.anims.exists(config.attackAnimKey)) {
        this.scene.anims.create({
          key: config.attackAnimKey,
          frames: this.scene.anims.generateFrameNumbers(config.attackSheetKey),
          frameRate: 14,
          repeat: -1,
        });
      }
    }
  }
}
