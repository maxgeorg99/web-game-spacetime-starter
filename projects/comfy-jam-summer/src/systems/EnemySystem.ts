import Phaser from "phaser";
import { GRID_COLS, GRID_ROWS, TILE_SIZE, SPAWN_EDGES } from "../config/constants";
import { isSand, worldToGrid } from "../utils/gridUtils";
import { Enemy, EnemyState, EnemyType } from "../entities/Enemy";
import { ENEMY_CONFIGS } from "../config/EnemyConfig";
import { PathfindingSystem, TARGET_COL, TARGET_ROW } from "./PathfindingSystem";
import { BuildSystem } from "./BuildSystem";
import { ShellSystem } from "./ShellSystem";

export class EnemySystem {
  private scene: Phaser.Scene;
  private enemies: Enemy[] = [];
  private pathfinding: PathfindingSystem;
  private buildSystem: BuildSystem;
  private shellSystem: ShellSystem;
  private offsetX: number;
  private offsetY: number;

  onEnemyDied?: () => void;
  onEnemyReachedCenter?: () => void;
  onStructureDamaged?: () => void;

  constructor(
    scene: Phaser.Scene,
    offsetX: number,
    offsetY: number,
    pathfinding: PathfindingSystem,
    buildSystem: BuildSystem,
    shellSystem: ShellSystem,
  ) {
    this.scene = scene;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.pathfinding = pathfinding;
    this.buildSystem = buildSystem;
    this.shellSystem = shellSystem;
    this.createAllAnims();
  }

  // ── Wave-based Spawning ──────────────────────────────────────────

  update(delta: number): void {
    for (const enemy of this.enemies) {
      if (enemy.shouldRemove || enemy.hp <= 0) continue;
      enemy.update(delta);

      if (enemy.state === EnemyState.ATTACKING && enemy.attackTarget) {
        const dmg = (enemy.attackDamage * delta) / 1000;
        const destroyed = this.buildSystem.damageStructure(
          enemy.attackTarget.col,
          enemy.attackTarget.row,
          dmg,
        );
        this.onStructureDamaged?.();
        if (destroyed) {
          this.repathEnemy(enemy);
        }
      }
    }

    const aliveBefore = this.enemies.length;

    for (const enemy of this.enemies) {
      if (enemy.shouldRemove && enemy.state === EnemyState.MOVING) {
        // Enemy reached waypoint end — try stealing a shell.
        // Notification handled by ShellSystem.onShellStolen callback chain.
        const { col, row } = worldToGrid(
          enemy.sprite.x,
          enemy.sprite.y,
          this.offsetX,
          this.offsetY,
          TILE_SIZE,
        );
        this.shellSystem.tryStealShell(col, row);
      }
    }

    for (const enemy of this.enemies) {
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
    const entryY = this.offsetY + sandEntry.row * TILE_SIZE + TILE_SIZE / 2;

    // Pathfind to nearest shell (or fall back to center).
    const target = this.findBestTarget(spawnX, spawnY);
    const path = this.pathfinding.findPath(sandEntry.col, sandEntry.row, target.col, target.row);

    if (path) {
      const worldPath = this.pathfinding.pathToWorld(path);
      if (sandEntry.col !== slot.col || sandEntry.row !== slot.row) {
        worldPath.unshift({ x: entryX, y: entryY });
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
      if (enemy.shouldRemove) continue;
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

  /** Find the best target for an enemy — nearest shell or fallback to center. */
  private findBestTarget(worldX: number, worldY: number): { col: number; row: number } {
    const shell = this.shellSystem.findNearestGrid(worldX, worldY);
    if (shell) return shell;
    return { col: TARGET_COL, row: TARGET_ROW };
  }

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
    const target = this.findBestTarget(enemy.sprite.x, enemy.sprite.y);
    const path = this.pathfinding.findPath(col, row, target.col, target.row);
    if (path) {
      enemy.setWaypoints(this.pathfinding.pathToWorld(path));
      return;
    }

    const reachable = this.pathfinding.findNearestReachable(col, row, target.col, target.row);

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
    const target = this.findBestTarget(enemy.sprite.x, enemy.sprite.y);
    const dCol = Math.sign(target.col - fromCol);
    const dRow = Math.sign(target.row - fromRow);

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
