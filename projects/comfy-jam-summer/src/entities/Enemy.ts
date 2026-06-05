import Phaser from "phaser";
import { TILE_SIZE } from "../config/constants";

export interface EnemyTypeConfig {
  sheetKey: string;
  animKey: string;
  hp: number;
  speed: number;
  size: number;
}

export class Enemy {
  sprite: Phaser.GameObjects.Sprite;
  speed: number;
  hp: number;
  private dirX: number;
  private dirY: number;
  private targetX: number;
  private targetY: number;

  constructor(
    scene: Phaser.Scene,
    config: EnemyTypeConfig,
    spawnCol: number,
    spawnRow: number,
    targetCol: number,
    targetRow: number,
    offsetX: number,
    offsetY: number,
  ) {
    const x = offsetX + spawnCol * TILE_SIZE + TILE_SIZE / 2;
    const y = offsetY + spawnRow * TILE_SIZE + TILE_SIZE / 2;

    this.targetX = offsetX + targetCol * TILE_SIZE + TILE_SIZE / 2;
    this.targetY = offsetY + targetRow * TILE_SIZE + TILE_SIZE / 2;

    const dx = this.targetX - x;
    const dy = this.targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.dirX = dx / dist;
    this.dirY = dy / dist;

    this.sprite = scene.add
      .sprite(x, y, config.sheetKey)
      .setDisplaySize(TILE_SIZE * config.size, TILE_SIZE * config.size)
      .setDepth(3);

    // Default sprite faces right. Flip horizontally if moving left.
    if (this.dirX < 0) {
      this.sprite.setFlipX(true);
    }

    this.sprite.play(config.animKey);

    this.speed = config.speed;
    this.hp = config.hp;
  }

  update(delta: number): boolean {
    const dx = this.targetX - this.sprite.x;
    const dy = this.targetY - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      this.sprite.destroy();
      return true;
    }

    const step = (this.speed * delta) / 1000;
    this.sprite.x += this.dirX * step;
    this.sprite.y += this.dirY * step;
    return false;
  }
}
