import { WeaponDef } from "../config/WeaponConfig";
import { Enemy } from "./Enemy";

export type AimingStrategy = "closest" | "farthest" | "mostHp" | "leastHp";

export class Tower {
  col: number;
  row: number;
  worldX: number;
  worldY: number;
  weapon: WeaponDef | null = null;
  aimingStrategy: AimingStrategy;
  lastFireTime = 0;

  constructor(
    col: number,
    row: number,
    worldX: number,
    worldY: number,
    aimingStrategy: AimingStrategy = "closest",
  ) {
    this.col = col;
    this.row = row;
    this.worldX = worldX;
    this.worldY = worldY;
    this.aimingStrategy = aimingStrategy;
  }

  setWeapon(weapon: WeaponDef): void {
    this.weapon = weapon;
    this.lastFireTime = 0;
  }

  canFire(now: number): boolean {
    if (!this.weapon) return false;
    return now - this.lastFireTime >= this.weapon.fireRate * 1000;
  }

  fire(now: number): void {
    this.lastFireTime = now;
  }

  pickTarget(enemies: Enemy[]): Enemy | null {
    if (!this.weapon) return null;

    const inRange = enemies.filter((e) => {
      const dx = e.sprite.x - this.worldX;
      const dy = e.sprite.y - this.worldY;
      return Math.sqrt(dx * dx + dy * dy) <= this.weapon!.range;
    });

    if (inRange.length === 0) return null;

    switch (this.aimingStrategy) {
      case "closest":
        inRange.sort((a, b) => this.dist(a) - this.dist(b));
        break;
      case "farthest":
        inRange.sort((a, b) => this.dist(b) - this.dist(a));
        break;
      case "mostHp":
        inRange.sort((a, b) => b.hp - a.hp);
        break;
      case "leastHp":
        inRange.sort((a, b) => a.hp - b.hp);
        break;
    }

    return inRange[0];
  }

  private dist(enemy: Enemy): number {
    const dx = enemy.sprite.x - this.worldX;
    const dy = enemy.sprite.y - this.worldY;
    return dx * dx + dy * dy;
  }
}
