import Phaser from "phaser";
import { ToolMode, TILE_SIZE, DEPTH } from "../config/constants";
import { tileKey, gridToWorld } from "../utils/gridUtils";

export class BuildSystem {
  private scene: Phaser.Scene;
  toolMode: ToolMode = "none";
  occupied: Set<string> = new Set();
  private placedObjects: Map<string, Phaser.GameObjects.Image> = new Map();
  gridOffsetX: number;
  gridOffsetY: number;
  onTowerClick?: (x: number, y: number) => void;
  onPlace?: (col: number, row: number, mode: "tower" | "wall") => void;
  onDestroy?: (col: number, row: number) => void;

  constructor(scene: Phaser.Scene, gridOffsetX: number, gridOffsetY: number) {
    this.scene = scene;
    this.gridOffsetX = gridOffsetX;
    this.gridOffsetY = gridOffsetY;
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
      this.placeTower(col, row);
    } else if (this.toolMode === "build-wall") {
      this.placeWall(col, row, !pointer.rightButtonDown());
    }
  }

  private placeTower(col: number, row: number): void {
    const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
    const img = this.scene.add
      .image(x, y, "sandtower")
      .setDisplaySize(TILE_SIZE, TILE_SIZE)
      .setDepth(DEPTH.structure)
      .setInteractive({ useHandCursor: true });

    img.on("pointerdown", () => {
      if (this.toolMode === "destroy") return;
      this.onTowerClick?.(x, y);
    });

    const key = tileKey(col, row);
    this.occupied.add(key);
    this.placedObjects.set(key, img);
    this.onPlace?.(col, row, "tower");
  }

  private placeWall(col: number, row: number, horizontal: boolean): void {
    const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
    const img = this.scene.add
      .image(x, y, horizontal ? "wall-h" : "wall-v")
      .setDisplaySize(TILE_SIZE, TILE_SIZE)
      .setDepth(DEPTH.structure);

    const key = tileKey(col, row);
    this.occupied.add(key);
    this.placedObjects.set(key, img);
    this.onPlace?.(col, row, "wall");
  }

  private destroyAt(col: number, row: number): void {
    const key = tileKey(col, row);
    const obj = this.placedObjects.get(key);
    if (!obj) return;

    obj.destroy();
    this.placedObjects.delete(key);
    this.occupied.delete(key);
    this.onDestroy?.(col, row);
  }

  isOccupied(col: number, row: number): boolean {
    return this.occupied.has(tileKey(col, row));
  }
}
