import Phaser from "phaser";
import { GRID_COLS, GRID_ROWS, ISLAND_LEFT, ISLAND_RIGHT, ISLAND_TOP, ISLAND_BOTTOM } from "../config/constants";
import { Enemy } from "../entities/Enemy";

interface EnemyType {
  sheetKey: string;
  animKey: string;
  spawnCol: number;
  spawnRow: number;
  hp: number;
  speed: number;
  size: number;
}

const TYPES: EnemyType[] = [
  {
    sheetKey: "enemy-paddlefish-run",
    animKey: "paddlefish-walk",
    spawnCol: Math.floor(GRID_COLS / 2),
    spawnRow: 0,
    hp: 30,
    speed: 50,
    size: 1.4,
  },
  {
    sheetKey: "enemy-harpoonfish-run",
    animKey: "harpoonfish-walk",
    spawnCol: Math.floor(GRID_COLS / 2),
    spawnRow: GRID_ROWS - 1,
    hp: 50,
    speed: 55,
    size: 1.4,
  },
  {
    sheetKey: "enemy-turtle-walk",
    animKey: "turtle-walk",
    spawnCol: 0,
    spawnRow: Math.floor(GRID_ROWS / 2),
    hp: 80,
    speed: 25,
    size: 1.6,
  },
  {
    sheetKey: "enemy-snake-run",
    animKey: "snake-walk",
    spawnCol: GRID_COLS - 1,
    spawnRow: Math.floor(GRID_ROWS / 2),
    hp: 20,
    speed: 70,
    size: 1.2,
  },
];

export class EnemySystem {
  private scene: Phaser.Scene;
  private enemies: Enemy[] = [];
  private offsetX: number;
  private offsetY: number;
  private spawnTimer = 0;
  private spawnInterval = 3000;
  private typeIndex = 0;

  constructor(scene: Phaser.Scene, offsetX: number, offsetY: number) {
    this.scene = scene;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.createAllAnims();
  }

  private createAllAnims(): void {
    for (const t of TYPES) {
      if (this.scene.anims.exists(t.animKey)) continue;
      this.scene.anims.create({
        key: t.animKey,
        frames: this.scene.anims.generateFrameNumbers(t.sheetKey),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  update(delta: number): void {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      this.spawnEnemy();
    }
    this.enemies = this.enemies.filter((e) => !e.update(delta));
  }

  private spawnEnemy(): void {
    const t = TYPES[this.typeIndex % TYPES.length];
    this.typeIndex++;

    const targetCol = (ISLAND_LEFT + ISLAND_RIGHT) / 2;
    const targetRow = (ISLAND_TOP + ISLAND_BOTTOM) / 2;

    const enemy = new Enemy(
      this.scene,
      t,
      t.spawnCol,
      t.spawnRow,
      targetCol,
      targetRow,
      this.offsetX,
      this.offsetY,
    );

    this.enemies.push(enemy);
  }
}
