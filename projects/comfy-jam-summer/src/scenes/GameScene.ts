import Phaser from "phaser";
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from "../config/constants";
import { isInteriorSand, worldToGrid } from "../utils/gridUtils";
import { BuildSystem } from "../systems/BuildSystem";
import { HighlightSystem } from "../systems/HighlightSystem";
import { createOcean } from "../objects/OceanBackground";
import { buildIsland } from "../objects/IslandBuilder";
import { buildHud } from "../objects/HudOverlay";

export class GameScene extends Phaser.Scene {
  private ocean!: Phaser.GameObjects.TileSprite;
  private buildSystem!: BuildSystem;
  private highlightSystem!: HighlightSystem;
  private gridOffsetX = 0;
  private gridOffsetY = 0;

  constructor() {
    super("GameScene");
  }

  create(): void {
    const { width, height } = this.scale;
    this.gridOffsetX = (width - GRID_COLS * TILE_SIZE) / 2;
    this.gridOffsetY = (height - GRID_ROWS * TILE_SIZE) / 2;

    // 1. Ocean background + water wobble filter.
    this.ocean = createOcean(this);

    // 2. Build system (single source of truth for grid occupancy).
    this.buildSystem = new BuildSystem(this, this.gridOffsetX, this.gridOffsetY);

    // 3. Island terrain, shells, palms, central tower.
    buildIsland(this, this.buildSystem, this.gridOffsetX, this.gridOffsetY);

    // 4. Hover highlight.
    this.highlightSystem = new HighlightSystem(
      this,
      this.buildSystem,
      this.gridOffsetX,
      this.gridOffsetY,
    );

    // 5. HUD panels + toolbar.
    buildHud(this, this.buildSystem, (label) => {
      console.log(label, "mode:", this.buildSystem.toolMode);
    });

    // 6. Grid click handler.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const { col, row } = worldToGrid(
        pointer.x,
        pointer.y,
        this.gridOffsetX,
        this.gridOffsetY,
        TILE_SIZE,
      );

      if (
        this.buildSystem.toolMode !== "destroy" &&
        (!isInteriorSand(col, row) || this.buildSystem.isOccupied(col, row))
      ) return;

      this.buildSystem.handleGridClick(col, row, pointer);
    });
  }

  update(): void {
    this.ocean.tilePositionX += 0.3;
    this.ocean.tilePositionY += 0.15;
    this.highlightSystem.update(this.input.activePointer);
  }
}
