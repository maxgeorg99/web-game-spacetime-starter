import Phaser from "phaser";
import { ToolMode, TILE_SIZE, DEPTH } from "../config/constants";
import { tileKey, gridToWorld } from "../utils/gridUtils";
import { PathfindingSystem } from "./PathfindingSystem";
import { GridState, ObjectType } from "../state/GridState";
import { EventBus } from "../events/GameEvents";
import { BUILD_COSTS } from "../logic/economy";

const HP_BAR_W = 24;
const HP_BAR_H = 4;
const HP_BAR_OFFSET_Y = -TILE_SIZE / 2 - 6;

export type PlacementMode = "tower" | "wall";
export type { ObjectType };

export class BuildSystem {
  private scene: Phaser.Scene;
  gridState: GridState = new GridState();
  private placedObjects: Map<string, Phaser.GameObjects.Image> = new Map();
  private hpBars: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private pathfinding: PathfindingSystem | null = null;
  gridOffsetX: number;
  gridOffsetY: number;
  private eventBus: EventBus;

  onTowerClick?: (x: number, y: number) => void;
  onPlace?: (col: number, row: number, mode: ObjectType) => void;
  onDestroy?: (col: number, row: number, type: ObjectType) => void;
  /** Called when ANY occupancy changes — EnemySystem uses this to recalc paths. */
  onOccupancyChange?: () => void;
  /** Returning false blocks placement. */
  canAffordBuild?: (cost: number) => boolean;
  /** Called after successful placement to deduct cost. */
  onBuildCostPaid?: (cost: number) => void;
  /** Check if a shell exists at this cell (shells block building but not movement). */
  isShellAt?: (col: number, row: number) => boolean;

  constructor(scene: Phaser.Scene, gridOffsetX: number, gridOffsetY: number, eventBus?: EventBus) {
    this.scene = scene;
    this.gridOffsetX = gridOffsetX;
    this.gridOffsetY = gridOffsetY;
    this.eventBus = eventBus ?? new EventBus();
  }

  get toolMode(): ToolMode {
    return this.gridState.toolMode;
  }

  set toolMode(mode: ToolMode) {
    this.gridState.toolMode = mode;
  }

  get occupied(): Set<string> {
    return this.gridState.occupied;
  }

  set occupied(v: Set<string>) {
    this.gridState.occupied = v;
  }

  setPathfinding(pathfinding: PathfindingSystem): void {
    this.pathfinding = pathfinding;
    pathfinding.markOccupiedSet(this.gridState.occupied);
  }

  setToolMode(mode: ToolMode): void {
    if (this.toolMode === mode) {
      this.gridState.setToolMode("none");
    } else {
      this.gridState.setToolMode(mode);
    }
  }

  handleGridClick(col: number, row: number, pointer: Phaser.Input.Pointer): void {
    if (this.toolMode === "destroy") {
      this.destroyAt(col, row);
      return;
    }

    if (this.gridState.isOccupied(col, row)) return;
    if (this.isShellAt?.(col, row)) return;

    if (this.toolMode === "build-tower") {
      this.placeStructure(col, row, "tower");
    } else if (this.toolMode === "build-wall") {
      this.placeStructure(col, row, "wall", !pointer.rightButtonDown());
    }
  }

  // ── Placement ───────────────────────────────────────────────────

  private placeStructure(col: number, row: number, mode: PlacementMode, horizontal = true): void {
    // Affordability check.
    const cost = mode === "tower" ? BUILD_COSTS.tower : BUILD_COSTS.wall;
    if (this.canAffordBuild && !this.canAffordBuild(cost)) {
      this.flashRed(col, row);
      return;
    }

    // Pathfinding validation.
    if (this.pathfinding) {
      if (!this.pathfinding.canPlaceWall(col, row)) {
        this.flashRed(col, row);
        return;
      }
      this.pathfinding.markBlocked(col, row);
    }

    this.onBuildCostPaid?.(cost);

    const key = tileKey(col, row);
    const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);

    let texKey: string;
    let objType: ObjectType;
    if (mode === "tower") {
      texKey = "sandtower";
      objType = "tower";
    } else {
      texKey = horizontal ? "wall-h" : "wall-v";
      objType = horizontal ? "wall-h" : "wall-v";
    }

    const img = this.scene.add
      .image(x, y, texKey)
      .setDisplaySize(TILE_SIZE, TILE_SIZE)
      .setDepth(DEPTH.structure);

    if (mode === "tower") {
      img.setInteractive({ useHandCursor: true });
      img.on("pointerdown", () => {
        if (this.toolMode === "destroy") return;
        this.onTowerClick?.(x, y);
      });
    }

    this.gridState.placeStructure(col, row, objType);
    this.placedObjects.set(key, img);

    const maxHp = this.gridState.getMaxHp(key);
    this.drawHpBar(col, row, maxHp, maxHp);

    this.eventBus.emit({ type: "STRUCTURE_PLACED", col, row, structureType: objType });
    this.onPlace?.(col, row, objType);
    this.onOccupancyChange?.();
  }

  // ── Destruction ─────────────────────────────────────────────────

  private destroyAt(col: number, row: number): void {
    const key = tileKey(col, row);

    const objectType = this.gridState.getType(col, row) ?? "tower";

    if (this.placedObjects.has(key)) {
      this.placedObjects.get(key)!.destroy();
      this.placedObjects.delete(key);
    }

    this.gridState.destroyStructure(col, row);

    const bar = this.hpBars.get(key);
    if (bar) {
      bar.destroy();
      this.hpBars.delete(key);
    }

    if (this.pathfinding) {
      this.pathfinding.markOpen(col, row);
    }

    this.eventBus.emit({ type: "STRUCTURE_DESTROYED", col, row });
    this.onDestroy?.(col, row, objectType);
    this.onOccupancyChange?.();
  }

  /** Public destroy — used by enemy attack logic when HP reaches 0. */
  destroyStructure(col: number, row: number): void {
    this.destroyAt(col, row);
  }

  // ── HP ──────────────────────────────────────────────────────────

  /**
   * Deal damage to the structure at grid position.
   * Returns true if the structure was destroyed.
   */
  damageStructure(col: number, row: number, amount: number): boolean {
    const result = this.gridState.damageStructure(col, row, amount);

    if (result.destroyed) {
      // Clean up sprites without touching gridState again
      const key = tileKey(col, row);
      const obj = this.placedObjects.get(key);
      if (obj) {
        obj.destroy();
        this.placedObjects.delete(key);
      }
      const bar = this.hpBars.get(key);
      if (bar) {
        bar.destroy();
        this.hpBars.delete(key);
      }
      if (this.pathfinding) {
        this.pathfinding.markOpen(col, row);
      }
      this.eventBus.emit({ type: "STRUCTURE_DESTROYED", col, row });
      this.onDestroy?.(col, row, this.gridState.getType(col, row) ?? "tower");
      this.onOccupancyChange?.();
      return true;
    }

    this.drawHpBar(col, row, result.hp, result.maxHp);
    this.eventBus.emit({ type: "STRUCTURE_DAMAGED", col, row, hp: result.hp, maxHp: result.maxHp });
    return false;
  }

  repairStructure(col: number, row: number, amount: number): void {
    const structure = this.gridState.getStructure(col, row);
    if (!structure) return;

    const newHp = Math.min(structure.maxHp, structure.hp + amount);
    structure.hp = newHp;
    this.drawHpBar(col, row, newHp, structure.maxHp);
  }

  getHp(col: number, row: number): number {
    return this.gridState.getStructure(col, row)?.hp ?? 0;
  }

  /** True if a damageable structure (tower or wall, not a palm) occupies this cell. */
  hasStructure(col: number, row: number): boolean {
    return this.gridState.hasStructure(col, row);
  }

  // ── Queries ─────────────────────────────────────────────────────

  isOccupied(col: number, row: number): boolean {
    return this.gridState.isOccupied(col, row) || (this.isShellAt?.(col, row) ?? false);
  }

  getType(col: number, row: number): ObjectType | null {
    return this.gridState.getType(col, row);
  }

  getSprite(col: number, row: number): Phaser.GameObjects.Image | null {
    return this.placedObjects.get(tileKey(col, row)) ?? null;
  }

  /** Returns cells occupied by damageable structures (towers/walls, excludes palms). */
  getOccupiedCells(): { col: number; row: number }[] {
    return this.gridState.getOccupiedCells();
  }

  // ── HP bar visuals ──────────────────────────────────────────────

  private drawHpBar(col: number, row: number, hp: number, maxHp: number): void {
    const key = tileKey(col, row);
    let gfx = this.hpBars.get(key);
    if (!gfx) {
      gfx = this.scene.add.graphics().setDepth(DEPTH.hud);
      this.hpBars.set(key, gfx);
    }

    // Hide bar when at full HP.
    if (hp >= maxHp) {
      gfx.clear();
      return;
    }

    const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
    const bx = x - HP_BAR_W / 2;
    const by = y + HP_BAR_OFFSET_Y;
    const ratio = hp / maxHp;

    gfx.clear();

    gfx.fillStyle(0x000000, 0.6);
    gfx.fillRect(bx, by, HP_BAR_W, HP_BAR_H);

    const color = ratio > 0.6 ? 0x44cc44 : ratio > 0.3 ? 0xcccc44 : 0xcc4444;
    const fillW = Math.max(0, ratio * HP_BAR_W);
    gfx.fillStyle(color, 0.9);
    gfx.fillRect(bx, by, fillW, HP_BAR_H);
  }

  // ── Feedback ────────────────────────────────────────────────────

  private flashRed(col: number, row: number): void {
    const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
    const flash = this.scene.add
      .graphics()
      .setDepth(DEPTH.highlight);
    flash.fillStyle(0xff0000, 0.5);
    flash.fillRect(x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      ease: "Power2",
      onComplete: () => flash.destroy(),
    });
  }
}
