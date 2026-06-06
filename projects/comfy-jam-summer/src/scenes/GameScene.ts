import Phaser from "phaser";
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from "../config/constants";
import { isInteriorSand, worldToGrid } from "../utils/gridUtils";
import { BuildSystem } from "../systems/BuildSystem";
import { HighlightSystem } from "../systems/HighlightSystem";
import { createOcean } from "../objects/OceanBackground";
import { buildIsland } from "../objects/IslandBuilder";
import { buildHud } from "../objects/HudOverlay";
import { EnemySystem } from "../systems/EnemySystem";
import { WeaponWheel } from "../systems/WeaponWheel";
import { DialogBox } from "../systems/DialogBox";
import { DIALOGS } from "../config/DialogConfig";

export class GameScene extends Phaser.Scene {
  private ocean!: Phaser.GameObjects.TileSprite;
  private buildSystem!: BuildSystem;
  private highlightSystem!: HighlightSystem;
  private enemySystem!: EnemySystem;
  private weaponWheel!: WeaponWheel;
  private dialogBox!: DialogBox;
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private firstTowerPlaced = false;
  private firstWallPlaced = false;

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

    // 6. Enemy spawner.
    this.enemySystem = new EnemySystem(this, this.gridOffsetX, this.gridOffsetY);

    // 7. Weapon wheel for towers.
    this.weaponWheel = new WeaponWheel(this, (label) => {
      console.log("weapon selected:", label);
    });

    // 8. Dialog box for lifeguard commentary.
    this.dialogBox = new DialogBox(this);

    this.buildSystem.onTowerClick = (x, y) => {
      this.weaponWheel.show(x, y - 24);
    };

    // Trigger dialogs on first placement.
    this.buildSystem.onPlace = (_col, _row, mode) => {
      if (mode === "tower" && !this.firstTowerPlaced) {
        this.firstTowerPlaced = true;
        this.dialogBox.show(DIALOGS.first_tower);
      } else if (mode === "wall" && !this.firstWallPlaced) {
        this.firstWallPlaced = true;
        this.dialogBox.show(DIALOGS.first_wall);
      }
    };

    // 9. Grid click handler.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.weaponWheel.isOpen) return;

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

    // Kick off lifeguard intro after a short delay.
    this.time.delayedCall(600, () => {
      this.dialogBox.show(DIALOGS.game_start);
    });
  }

  update(_time: number, delta: number): void {
    this.ocean.tilePositionX += 0.3;
    this.ocean.tilePositionY += 0.15;
    this.highlightSystem.update(this.input.activePointer);
    this.enemySystem.update(delta);
    this.dialogBox.update(delta);
  }
}
