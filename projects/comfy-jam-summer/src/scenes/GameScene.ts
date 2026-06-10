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
import { ShellSystem } from "../systems/ShellSystem";
import { DIALOGS } from "../config/DialogConfig";
import { WEAPON_COSTS, getEnemyReward } from "../logic/economy";
import { EnemyType } from "../entities/Enemy";
import { AudioManager } from "../audio/AudioManager";

// ── Debug toggles ──────────────────────────────────────────────
const DIALOG_ENABLED = true;
const LIAR_MECHANIC = true;

const SFX_SHOOT: Record<string, string> = {
  watergun: "sfx-shoot-water",
  coconut: "sfx-shoot-coconut",
  volleyball: "sfx-shoot-volley",
  bazooka: "sfx-shoot-bazooka",
};
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
  private hudGoldText!: Phaser.GameObjects.Text;
  private shellSystem!: ShellSystem;
  private audio!: AudioManager;

  constructor() {
    super("GameScene");
  }

  private showDialog(script: typeof DIALOGS[keyof typeof DIALOGS]): void {
    if ((window as any).__DIALOG_DISABLED) return;
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

  private showDefeat(): void {
    const { width, height } = this.scale;
    this.audio.stopMusic();
    this.audio.playSfx("sting-lose");

    this.add
      .image(width / 2, height / 2, "ui-defeat")
      .setOrigin(0.5)
      .setDepth(98);

    this.showDialog(DIALOGS.game_over);

    const btnY = height / 2 + 160;

    const retryBtn = this.add
      .image(width / 2, btnY, "ui-btn-red")
      .setInteractive({ useHandCursor: true })
      .setDisplaySize(200, 60)
      .setDepth(200);

    this.add
      .text(width / 2, btnY, "RETRY", {
        fontFamily: '"Fredoka", system-ui, sans-serif',
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(201);

    retryBtn.on("pointerdown", () => this.scene.restart());
  }

  private showVictory(): void {
    const { width, height } = this.scale;
    this.audio.stopMusic();
    this.audio.playSfx("sting-win");

    this.add
      .image(width / 2, height / 2, "ui-victory")
      .setOrigin(0.5)
      .setDepth(98);

    this.showDialog(DIALOGS.game_victory);

    const btnY = height / 2 + 140;

    const playAgainBtn = this.add
      .image(width / 2, btnY, "ui-btn-red")
      .setInteractive({ useHandCursor: true })
      .setDisplaySize(240, 60)
      .setDepth(200);

    this.add
      .text(width / 2, btnY, "PLAY AGAIN", {
        fontFamily: '"Fredoka", system-ui, sans-serif',
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(201);

    playAgainBtn.on("pointerdown", () => this.scene.restart());
  }

  create(): void {
    const { width, height } = this.scale;
    this.gridOffsetX = (width - GRID_COLS * TILE_SIZE) / 2;
    this.gridOffsetY = (height - GRID_ROWS * TILE_SIZE) / 2;

    // 1. Ocean background + water wobble filter.
    this.ocean = createOcean(this);

    // 2. Shell system — tracks active shells, enemies target these.
    this.shellSystem = new ShellSystem(this, this.gridOffsetX, this.gridOffsetY);

    // 2b. Wave system (created early so shell callbacks can reference it).
    this.waveSystem = new WaveSystem();
    this.waveSystem.forceTruth = !LIAR_MECHANIC;

    // 3. Build system (single source of truth for grid occupancy).
    this.buildSystem = new BuildSystem(this, this.gridOffsetX, this.gridOffsetY);
    this.buildSystem.isShellAt = (col: number, row: number) => {
      return this.shellSystem.shells.some((s) => s.col === col && s.row === row && s.sprite.active);
    };
    this.buildSystem.canAffordBuild = (cost: number) => this.waveSystem.gold >= cost;
    this.buildSystem.onBuildCostPaid = (cost: number) => this.waveSystem.spendGold(cost);

    // 3b. Pathfinding system (BFS on 20x16 sand grid) — created before shell wiring.
    const pathfinding = new PathfindingSystem(this.gridOffsetX, this.gridOffsetY);

    // Shell stolen → decrement lives, re-route enemies to next shell.
    this.shellSystem.onShellStolen = (_col, _row) => {
      this.waveSystem.notifyEnemyReachedCenter();
      this.enemySystem.recalculateAllPaths();
      this.audio.playSfx("sfx-shell-stolen");
    };
    this.shellSystem.onAllShellsGone = () => {
      if (this.waveSystem.phase !== "defeat" && this.waveSystem.phase !== "victory") {
        this.waveSystem.phase = "defeat";
        this.waveSystem.onGameOver?.();
      }
    };

    // 3c. Audio manager.
    this.audio = new AudioManager(this);

    // 4. Island terrain, shells, palms (shells registered in shellSystem).
    buildIsland(this, this.buildSystem, this.gridOffsetX, this.gridOffsetY, this.shellSystem);

    // 4b. Wire pathfinding → buildSystem (marks already-occupied palms as blocked).
    this.buildSystem.setPathfinding(pathfinding);

    // 5. Tower system (auto-attack loop, projectile management).
    this.towerSystem = new TowerSystem(this, this.gridOffsetX, this.gridOffsetY);
    this.towerSystem.onEnemyKilled = (x, y, enemyType) => {
      this.maybeDropSandwich(x, y);
      const reward = getEnemyReward(enemyType as EnemyType);
      this.waveSystem.earnGold(reward);
      this.audio.playSfx("sfx-death");
    };
    this.towerSystem.onFire = (weaponKey) => {
      const key = SFX_SHOOT[weaponKey] ?? "sfx-shoot-water";
      this.audio.playSfx(key);
    };

    // 6. Hover highlight.
    this.highlightSystem = new HighlightSystem(
      this,
      this.buildSystem,
      this.gridOffsetX,
      this.gridOffsetY,
    );

    // 7. HUD panels + toolbar.
    const hudApi: HudApi = buildHud(this, this.buildSystem, (_label) => {
      // Tool mode changed — no-op in production.
    }, this.audio);

    // 7b. Dynamic HUD overlay — wave info, direction, timer, shell count.
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

    this.hudShellText = this.add.text(116, 20, `${this.shellSystem.activeCount}`, {
      fontFamily: '"Fredoka", system-ui, sans-serif',
      fontSize: "16px",
      color: "#e0d0a0",
      stroke: "#3a2a10",
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(10);

    // Gold text — dynamic, updated via onGoldChange.
    this.hudGoldText = this.add.text(40, 20, "120", {
      fontFamily: '"Fredoka", system-ui, sans-serif',
      fontSize: "16px",
      color: "#e0c070",
      stroke: "#3a2a10",
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(10);

    // 7c. Wave system callbacks.
    this.waveSystem.onWaveStart = (wave, intel) => {
      this.hudWaveText.setText(`WAVE ${wave}`);
      this.hudDirText.setText(`INCOMING: ${intel.direction.toUpperCase()}`);
      hudApi.updateIntel(intel.counts);
      if (wave > 1) this.audio.playSfx("sfx-wave");
    };
    this.waveSystem.onBuildTimer = (sec) => {
      this.hudTimerText.setText(sec > 0 ? `Build: ${sec}s` : "");
    };
    this.waveSystem.onShellChange = (_shells) => {
      this.hudShellText.setText(`${this.shellSystem.activeCount}`);
    };
    this.waveSystem.onGoldChange = (gold) => {
      this.hudGoldText.setText(`${gold}`);
    };
    this.waveSystem.onGameOver = () => {
      this.hudWaveText.setText("DEFEAT");
      this.hudTimerText.setText("");
      this.showDefeat();
    };
    this.waveSystem.onVictory = () => {
      this.hudWaveText.setText("VICTORY");
      this.hudTimerText.setText("");
      this.showVictory();
    };

    // 8. Enemy spawner.
    this.enemySystem = new EnemySystem(this, this.gridOffsetX, this.gridOffsetY, pathfinding, this.buildSystem, this.shellSystem);
    this.enemySystem.onEnemyDied = () => this.waveSystem.notifyEnemyDied();
    this.enemySystem.onStructureDamaged = () => this.audio.playSfx("sfx-structure-hit");

    // 7. Weapon wheel for towers.
    if (!(window as any).__WEAPON_WHEEL_DISABLED) {
      this.weaponWheel = new WeaponWheel(this, (label) => {
        if (this.selectedTowerCol >= 0) {
          const cost = WEAPON_COSTS[label] ?? 0;
          if (!this.waveSystem.spendGold(cost)) return;
          this.towerSystem.setWeapon(this.selectedTowerCol, this.selectedTowerRow, label);
        }
      });
    } else {
      this.weaponWheel = new WeaponWheel(this, () => {});
    }

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
      this.audio.playSfx("sfx-build");

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
      this.audio.playSfx("sfx-destroy");
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

    // Start background music.
    this.audio.playMusic("music-game");

    // Start first wave after intro.
    this.time.delayedCall(2000, () => {
      this.waveSystem.startNextWave();
    });

    // Signal test mode readiness after first render.
    this.events.once("render", () => {
      if ((window as any).__TEST__) {
        (window as any).__TEST__.ready = true;
        (window as any).__TEST__.sceneKey = "GameScene";
      }
    });
  }

  update(time: number, delta: number): void {
    try {
      this.ocean.tilePositionX += 0.3;
      this.ocean.tilePositionY += 0.15;
      this.highlightSystem.update(this.input.activePointer);

      // Dialog must update even during defeat/victory so typewriter keeps ticking.
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
      this.waveSystem.update(delta, this.enemySystem.getEnemies().length);

      // Expose test mode state snapshot.
      if ((window as any).__TEST__) {
        (window as any).__TEST__.frameCount++;
        (window as any).__TEST__.state = {
          phase: this.waveSystem.phase,
          wave: this.waveSystem.currentWave + 1,
          shellCount: this.shellSystem.activeCount,
          enemyCount: this.enemySystem.getEnemies().length,
          towerCount: this.buildSystem.getOccupiedCells().length,
          toolMode: this.buildSystem.toolMode,
          dialogVisible: this.dialogBox.visible,
        };
      }
    } catch (err) {
      console.error("Game loop crashed:", err);
      this.scene.pause();
      this.showErrorScreen();
    }
  }

  private showErrorScreen(): void {
    const { width, height } = this.scale;
    const bg = this.add.graphics().setDepth(300);
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, width, height);

    this.add.text(width / 2, height / 2, "Something went wrong.\nPlease refresh the page.", {
      fontFamily: '"Fredoka", system-ui, sans-serif',
      fontSize: "22px",
      color: "#ffffff",
      align: "center",
    }).setOrigin(0.5).setDepth(301);
  }
}
