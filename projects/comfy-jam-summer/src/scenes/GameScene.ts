import Phaser from "phaser";
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from "../config/constants";
import { isInteriorSand, worldToGrid } from "../utils/gridUtils";
import { BuildSystem } from "../systems/BuildSystem";
import { HighlightSystem } from "../systems/HighlightSystem";
import { PathfindingSystem } from "../systems/PathfindingSystem";
import { createOcean } from "../objects/OceanBackground";
import { buildIsland } from "../objects/IslandBuilder";
import { buildHud, HudApi } from "../objects/HudOverlay";
import { EnemySystem } from "../systems/EnemySystem";
import { WeaponWheel } from "../systems/WeaponWheel";
import { DialogBox } from "../systems/DialogBox";
import { SnapSystem } from "../systems/SnapSystem";
import { TowerSystem } from "../systems/TowerSystem";
import { WaveSystem } from "../systems/WaveSystem";
import { DIALOGS } from "../config/DialogConfig";

// ── Debug toggles ──────────────────────────────────────────────
const DIALOG_ENABLED = true;
const LIAR_MECHANIC = true;
// ────────────────────────────────────────────────────────────────

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
  private towerSystem!: TowerSystem;
  private waveSystem!: WaveSystem;
  private selectedTowerCol = -1;
  private selectedTowerRow = -1;
  private hudWaveText!: Phaser.GameObjects.Text;
  private hudDirText!: Phaser.GameObjects.Text;
  private hudTimerText!: Phaser.GameObjects.Text;
  private hudShellText!: Phaser.GameObjects.Text;

  constructor() {
    super("GameScene");
  }

  private showDialog(script: typeof DIALOGS[keyof typeof DIALOGS]): void {
    if (DIALOG_ENABLED) this.dialogBox.show(script);
  }

  private sandwichFound = false;

  private maybeDropSandwich(x: number, y: number): void {
    if (this.sandwichFound) return;
    if (Math.random() > 0.05) return;

    this.sandwichFound = true;

    const sandwich = this.add
      .image(x, y, "sandwich")
      .setDisplaySize(32, 32)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });

    // Float up animation.
    this.tweens.add({
      targets: sandwich,
      y: y - 24,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    sandwich.on("pointerdown", () => {
      sandwich.destroy();
      this.waveSystem.forceTruth = true;
      this.showDialog(DIALOGS.sandwich_found);
    });
  }

  private showRetry(): void {
    const { width, height } = this.scale;

    // Dark overlay.
    const overlay = this.add
      .graphics()
      .setDepth(199);
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, width, height);

    // Retry button — centered, bigger.
    const btn = this.add
      .image(width / 2, height / 2 + 60, "ui-btn-red")
      .setInteractive({ useHandCursor: true })
      .setDisplaySize(180, 70)
      .setDepth(200);

    this.add
      .text(width / 2, height / 2 + 60, "RETRY", {
        fontFamily: '"Fredoka", system-ui, sans-serif',
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(201);

    btn.on("pointerdown", () => {
      this.scene.restart();
    });
  }

  create(): void {
    const { width, height } = this.scale;
    this.gridOffsetX = (width - GRID_COLS * TILE_SIZE) / 2;
    this.gridOffsetY = (height - GRID_ROWS * TILE_SIZE) / 2;

    // 1. Ocean background + water wobble filter.
    this.ocean = createOcean(this);

    // 2. Build system (single source of truth for grid occupancy).
    this.buildSystem = new BuildSystem(this, this.gridOffsetX, this.gridOffsetY);

    // 2b. Pathfinding system (BFS on 20x16 sand grid).
    const pathfinding = new PathfindingSystem(this.gridOffsetX, this.gridOffsetY);

    // 3. Island terrain, shells, palms (marks palms in buildSystem.occupied).
    buildIsland(this, this.buildSystem, this.gridOffsetX, this.gridOffsetY);

    // 3b. Wire pathfinding → buildSystem (marks already-occupied palms as blocked).
    this.buildSystem.setPathfinding(pathfinding);

    // 3c. Tower system (auto-attack loop, projectile management).
    this.towerSystem = new TowerSystem(this, this.gridOffsetX, this.gridOffsetY);
    this.towerSystem.onEnemyKilled = (x, y) => {
      this.maybeDropSandwich(x, y);
    };

    // 4. Hover highlight.
    this.highlightSystem = new HighlightSystem(
      this,
      this.buildSystem,
      this.gridOffsetX,
      this.gridOffsetY,
    );

    // 5. HUD panels + toolbar.
    const hudApi: HudApi = buildHud(this, this.buildSystem, (label) => {
      console.log(label, "mode:", this.buildSystem.toolMode);
    });

    // 5b. Dynamic HUD overlay — wave info, direction, timer, shell count.
    this.hudWaveText = this.add.text(width - 16, 16, "WAVE 1", {
      fontFamily: '"Fredoka", system-ui, sans-serif',
      fontSize: "22px",
      color: "#e0d0a0",
      stroke: "#3a2a10",
      strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(10);

    this.hudDirText = this.add.text(width - 16, 44, "INCOMING: ?", {
      fontFamily: '"Fredoka", system-ui, sans-serif',
      fontSize: "14px",
      color: "#ffd700",
      stroke: "#3a2a10",
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(10);

    this.hudTimerText = this.add.text(width - 16, 66, "", {
      fontFamily: '"Fredoka", system-ui, sans-serif',
      fontSize: "16px",
      color: "#ffffff",
      stroke: "#3a2a10",
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(10);

    this.hudShellText = this.add.text(116, 20, "15", {
      fontFamily: '"Fredoka", system-ui, sans-serif',
      fontSize: "16px",
      color: "#e0d0a0",
      stroke: "#3a2a10",
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(10);

    // 5c. Wave system (wave progression, intel, shell tracking).
    this.waveSystem = new WaveSystem();
    this.waveSystem.forceTruth = !LIAR_MECHANIC;
    this.waveSystem.onWaveStart = (wave, intel) => {
      this.hudWaveText.setText(`WAVE ${wave}`);
      this.hudDirText.setText(`INCOMING: ${intel.direction.toUpperCase()}`);
      hudApi.updateIntel(intel.counts);
    };
    this.waveSystem.onBuildTimer = (sec) => {
      this.hudTimerText.setText(sec > 0 ? `Build: ${sec}s` : "");
    };
    this.waveSystem.onShellChange = (shells) => {
      this.hudShellText.setText(`${shells}`);
    };
    this.waveSystem.onGameOver = () => {
      this.hudWaveText.setText("DEFEAT");
      this.hudTimerText.setText("");
      this.showDialog(DIALOGS.game_over);
      this.showRetry();
    };
    this.waveSystem.onVictory = () => {
      this.hudWaveText.setText("VICTORY");
      this.hudTimerText.setText("");
    };

    // 6. Enemy spawner.
    this.enemySystem = new EnemySystem(this, this.gridOffsetX, this.gridOffsetY);
    this.enemySystem.setPathfinding(pathfinding);
    this.enemySystem.setBuildSystem(this.buildSystem);
    this.enemySystem.onEnemyDied = () => this.waveSystem.notifyEnemyDied();
    this.enemySystem.onEnemyReachedCenter = () => this.waveSystem.notifyEnemyReachedCenter();

    // 7. Weapon wheel for towers.
    this.weaponWheel = new WeaponWheel(this, (label) => {
      if (this.selectedTowerCol >= 0) {
        this.towerSystem.setWeapon(this.selectedTowerCol, this.selectedTowerRow, label);
      }
    });

    // 8. Dialog box for lifeguard commentary.
    this.dialogBox = new DialogBox(this);

    // 8b. Snap system — swaps structure textures for connected neighbours.
    const snapSystem = new SnapSystem(this.buildSystem, this.gridOffsetX, this.gridOffsetY);

    this.buildSystem.onTowerClick = (x, y) => {
      const { col, row } = worldToGrid(x, y, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
      this.selectedTowerCol = col;
      this.selectedTowerRow = row;
      this.weaponWheel.show(x, y - 24);
    };

    // Trigger dialogs on first placement + snap refresh + tower lifecycle.
    this.buildSystem.onPlace = (col, row, mode) => {
      snapSystem.refresh(col, row);

      if (mode === "tower") {
        this.towerSystem.addTower(col, row);
        if (!this.firstTowerPlaced) {
          this.firstTowerPlaced = true;
          this.showDialog(DIALOGS.first_tower);
        }
      } else if ((mode === "wall-h" || mode === "wall-v") && !this.firstWallPlaced) {
        this.firstWallPlaced = true;
        this.showDialog(DIALOGS.first_wall);
      }
    };

    this.buildSystem.onDestroy = (col, row, type) => {
      snapSystem.refresh(col, row);
      if (type === "tower") {
        this.towerSystem.removeTower(col, row);
        if (this.selectedTowerCol === col && this.selectedTowerRow === row) {
          this.selectedTowerCol = -1;
          this.selectedTowerRow = -1;
        }
      }
    };

    // When grid occupancy changes, let enemies recalculate blocked paths.
    this.buildSystem.onOccupancyChange = () => {
      this.enemySystem.recalculateAllPaths();
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
      this.showDialog(DIALOGS.game_start);
    });

    // Start first wave after intro.
    this.time.delayedCall(2000, () => {
      this.waveSystem.startNextWave();
    });
  }

  update(time: number, delta: number): void {
    this.ocean.tilePositionX += 0.3;
    this.ocean.tilePositionY += 0.15;
    this.highlightSystem.update(this.input.activePointer);
    this.dialogBox.update(delta);

    if (this.waveSystem.phase === "defeat" || this.waveSystem.phase === "victory") return;

    // Wave spawning — pull from queue.
    const queue = this.waveSystem.getSpawnQueue();
    for (const item of queue) {
      this.enemySystem.spawnFromEdge(
        item.type as any,
        item.edge,
        this.waveSystem.getSpeedMult(),
        this.waveSystem.getHpMult(),
      );
    }

    this.enemySystem.update(delta);
    this.towerSystem.update(time, delta, this.enemySystem.getEnemies());
    this.dialogBox.update(delta);

    this.waveSystem.update(delta, this.enemySystem.getEnemies().length);
  }
}
