import Phaser from "phaser";
import { TILE_SIZE, DEPTH } from "../config/constants";

export type EnemyType = "paddlefish" | "harpoonfish" | "turtle" | "snake";

export enum EnemyState {
  MOVING = "moving",
  ATTACKING = "attacking",
}

export interface EnemyConfig {
  type: EnemyType;
  walkSheetKey: string;
  walkAnimKey: string;
  attackSheetKey: string;
  attackAnimKey: string;
  hp: number;
  speed: number;
  attackDamage: number;
  size: number;
}

export class Enemy {
  sprite: Phaser.GameObjects.Sprite;
  config: EnemyConfig;
  state: EnemyState = EnemyState.MOVING;
  hp: number;
  speed: number;

  private waypoints: { x: number; y: number }[] = [];
  private waypointIndex = 0;
  shouldRemove = false;

  attackTarget: { col: number; row: number } | null = null;
  attackDamage: number;

  private walkSheetKey: string;
  private walkAnimKey: string;
  private attackSheetKey: string;
  private attackAnimKey: string;
  private onReachedDestination: (() => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    config: EnemyConfig,
    spawnWorldX: number,
    spawnWorldY: number,
  ) {
    this.config = config;
    this.walkSheetKey = config.walkSheetKey;
    this.walkAnimKey = config.walkAnimKey;
    this.attackSheetKey = config.attackSheetKey;
    this.attackAnimKey = config.attackAnimKey;
    this.speed = config.speed;
    this.hp = config.hp;
    this.attackDamage = config.attackDamage;

    this.sprite = scene.add
      .sprite(spawnWorldX, spawnWorldY, config.walkSheetKey)
      .setDisplaySize(TILE_SIZE * config.size, TILE_SIZE * config.size)
      .setDepth(DEPTH.enemy);

    this.sprite.play(config.walkAnimKey);
  }

  setWaypoints(
    worldWaypoints: { x: number; y: number }[],
    onReached?: () => void,
  ): void {
    this.waypoints = worldWaypoints;
    this.waypointIndex = 0;
    this.state = EnemyState.MOVING;
    this.shouldRemove = false;
    this.attackTarget = null;
    this.onReachedDestination = onReached ?? null;
    this.playWalkAnim();
    this.faceNextWaypoint();
  }

  startAttacking(target: { col: number; row: number }, targetWorldX: number): void {
    this.attackTarget = target;
    this.state = EnemyState.ATTACKING;
    this.shouldRemove = false;
    this.sprite.setFlipX(targetWorldX < this.sprite.x);
    this.playAttackAnim();
  }

  update(delta: number): void {
    if (this.state === EnemyState.MOVING) {
      this.updateMoving(delta);
    }
  }

  private updateMoving(delta: number): void {
    if (this.waypoints.length === 0 || this.waypointIndex >= this.waypoints.length) {
      if (this.onReachedDestination) {
        this.onReachedDestination();
        this.onReachedDestination = null;
      } else {
        this.shouldRemove = true;
      }
      return;
    }

    const target = this.waypoints[this.waypointIndex];
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      this.waypointIndex++;
      if (this.waypointIndex >= this.waypoints.length) {
        if (this.onReachedDestination) {
          this.onReachedDestination();
          this.onReachedDestination = null;
        } else {
          this.shouldRemove = true;
        }
        return;
      }
      this.faceNextWaypoint();
      return;
    }

    const step = (this.speed * delta) / 1000;
    this.sprite.x += (dx / dist) * step;
    this.sprite.y += (dy / dist) * step;
  }

  private faceNextWaypoint(): void {
    if (this.waypointIndex < this.waypoints.length) {
      const wp = this.waypoints[this.waypointIndex];
      this.sprite.setFlipX(wp.x < this.sprite.x);
    }
  }

  private playWalkAnim(): void {
    if (this.sprite.texture.key !== this.walkSheetKey) {
      this.sprite.setTexture(this.walkSheetKey);
    }
    this.sprite.play(this.walkAnimKey);
  }

  private playAttackAnim(): void {
    if (this.sprite.texture.key !== this.attackSheetKey) {
      this.sprite.setTexture(this.attackSheetKey);
    }
    this.sprite.play(this.attackAnimKey);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
