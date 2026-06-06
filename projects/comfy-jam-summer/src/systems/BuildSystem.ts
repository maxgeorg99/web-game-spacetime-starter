import Phaser from "phaser";
import { ToolMode, TILE_SIZE, DEPTH } from "../config/constants";
import { tileKey, gridToWorld } from "../utils/gridUtils";
import { PathfindingSystem } from "./PathfindingSystem";

export const MAX_TOWER_HP = 100;
export const MAX_WALL_HP = 60;

const HP_BAR_W = 24;
const HP_BAR_H = 4;
const HP_BAR_OFFSET_Y = -TILE_SIZE / 2 - 6;

export type PlacementMode = "tower" | "wall";
export type ObjectType = "tower" | "wall-h" | "wall-v";

export class BuildSystem {
  private scene: Phaser.Scene;
  toolMode: ToolMode = "none";
  occupied: Set<string> = new Set();
  private placedObjects: Map<string, Phaser.GameObjects.Image> = new Map();
  private typeMap: Map<string, ObjectType> = new Map();
  private structureHp: Map<string, number> = new Map();
  private hpBars: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private pathfinding: PathfindingSystem | null = null;
  gridOffsetX: number;
  gridOffsetY: number;

  onTowerClick?: (x: number, y: number) => void;
  onPlace?: (col: number, row: number, mode: ObjectType) => void;
  onDestroy?: (col: number, row: number, type: ObjectType) => void;
  /** Called when ANY occupancy changes — EnemySystem uses this to recalc paths. */
  onOccupancyChange?: () => void;

  constructor(scene: Phaser.Scene, gridOffsetX: number, gridOffsetY: number) {
    this.scene = scene;
    this.gridOffsetX = gridOffsetX;
    this.gridOffsetY = gridOffsetY;
  }

  setPathfinding(pathfinding: PathfindingSystem): void {
    this.pathfinding = pathfinding;
    pathfinding.markOccupiedSet(this.occupied);
  }

  setToolMode(mode: ToolMode): void {
    this.toolMode = this.toolMode === mode ? "none" : mode;
  }

  handleGridClick(col: number, row: number, pointer: Phaser.Input.Pointer): void {
    if (this.toolMode === "destroy") {
      this.destroyAt(col, row);
      return;
    }

    if (this.occupied.has(tileKey(col, row))) return;

    if (this.toolMode === "build-tower") {
      this.placeStructure(col, row, "tower");
    } else if (this.toolMode === "build-wall") {
      this.placeStructure(col, row, "wall", !pointer.rightButtonDown());
    }
  }

  // ── Placement ───────────────────────────────────────────────────

  private placeStructure(col: number, row: number, mode: PlacementMode, horizontal = true): void {
    // Pathfinding validation.
    if (this.pathfinding) {
      if (!this.pathfinding.canPlaceWall(col, row)) {
        this.flashRed(col, row);
        return;
      }
      this.pathfinding.markBlocked(col, row);
    }

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

    this.occupied.add(key);
    this.placedObjects.set(key, img);
    this.typeMap.set(key, objType);

    // HP init.
    const maxHp = mode === "tower" ? MAX_TOWER_HP : MAX_WALL_HP;
    this.structureHp.set(key, maxHp);
    this.drawHpBar(col, row, maxHp, maxHp);

    this.onPlace?.(col, row, objType);
    this.onOccupancyChange?.();
  }

  // ── Destruction ─────────────────────────────────────────────────

  private destroyAt(col: number, row: number): void {
    const key = tileKey(col, row);
    const obj = this.placedObjects.get(key);
    if (!obj) return;

    obj.destroy();
    this.placedObjects.delete(key);
    this.occupied.delete(key);
    this.structureHp.delete(key);

    const bar = this.hpBars.get(key);
    if (bar) {
      bar.destroy();
      this.hpBars.delete(key);
    }

    const objectType = this.typeMap.get(key) ?? "tower";
    this.typeMap.delete(key);

    if (this.pathfinding) {
      this.pathfinding.markOpen(col, row);
    }

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
    const key = tileKey(col, row);
    if (!this.structureHp.has(key)) return false;

    const current = this.structureHp.get(key)!;
    const newHp = Math.max(0, current - amount);
    this.structureHp.set(key, newHp);

    this.drawHpBar(col, row, newHp, this.getMaxHp(key));

    if (newHp <= 0) {
      this.destroyAt(col, row);
      return true;
    }
    return false;
  }

  repairStructure(col: number, row: number, amount: number): void {
    const key = tileKey(col, row);
    if (!this.structureHp.has(key)) return;

    const maxHp = this.getMaxHp(key);
    const newHp = Math.min(maxHp, this.structureHp.get(key)! + amount);
    this.structureHp.set(key, newHp);
    this.drawHpBar(col, row, newHp, maxHp);
  }

  getHp(col: number, row: number): number {
    return this.structureHp.get(tileKey(col, row)) ?? 0;
  }

  /** True if a damageable structure (tower or wall, not a palm) occupies this cell. */
  hasStructure(col: number, row: number): boolean {
    return this.structureHp.has(tileKey(col, row));
  }

  // ── Queries ─────────────────────────────────────────────────────

  isOccupied(col: number, row: number): boolean {
    return this.occupied.has(tileKey(col, row));
  }

  getType(col: number, row: number): ObjectType | null {
    return this.typeMap.get(tileKey(col, row)) ?? null;
  }

  getSprite(col: number, row: number): Phaser.GameObjects.Image | null {
    return this.placedObjects.get(tileKey(col, row)) ?? null;
  }

  /** Returns cells occupied by damageable structures (towers/walls, excludes palms). */
  getOccupiedCells(): { col: number; row: number }[] {
    const cells: { col: number; row: number }[] = [];
    for (const key of this.structureHp.keys()) {
      const [c, r] = key.split(",").map(Number);
      cells.push({ col: c, row: r });
    }
    return cells;
  }

  // ── HP bar visuals ──────────────────────────────────────────────

  private getMaxHp(key: string): number {
    const obj = this.placedObjects.get(key);
    // Heuristic: towers use sandtower texture.
    if (obj?.texture?.key === "sandtower") return MAX_TOWER_HP;
    return MAX_WALL_HP;
  }

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
