import Phaser from "phaser";
import { ToolMode, TILE_SIZE } from "../config/constants";
import { isInteriorSand, worldToGrid } from "../utils/gridUtils";
import { BuildSystem } from "./BuildSystem";

export class HighlightSystem {
  private graphics: Phaser.GameObjects.Graphics;
  private buildSystem: BuildSystem;
  private gridOffsetX: number;
  private gridOffsetY: number;

  constructor(
    scene: Phaser.Scene,
    buildSystem: BuildSystem,
    gridOffsetX: number,
    gridOffsetY: number,
  ) {
    this.graphics = scene.add.graphics().setDepth(5);
    this.buildSystem = buildSystem;
    this.gridOffsetX = gridOffsetX;
    this.gridOffsetY = gridOffsetY;
  }

  update(pointer: Phaser.Input.Pointer): void {
    this.graphics.clear();

    const mode: ToolMode = this.buildSystem.toolMode;
    if (mode === "none") return;

    const { col, row } = worldToGrid(pointer.x, pointer.y, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
    const x = this.gridOffsetX + col * TILE_SIZE + TILE_SIZE / 2;
    const y = this.gridOffsetY + row * TILE_SIZE + TILE_SIZE / 2;
    const occupied = this.buildSystem.isOccupied(col, row);

    if (mode === "build-tower" || mode === "build-wall") {
      const ok = isInteriorSand(col, row) && !occupied;
      this.graphics.fillStyle(ok ? 0x00ff00 : 0xff0000, 0.3);
      this.graphics.fillRect(x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    } else if (mode === "destroy") {
      if (occupied) {
        this.graphics.fillStyle(0xff0000, 0.4);
        this.graphics.fillRect(x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}
