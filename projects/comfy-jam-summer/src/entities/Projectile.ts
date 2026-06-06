import Phaser from "phaser";
import { WeaponDef } from "../config/WeaponConfig";
import { Enemy } from "./Enemy";
import { DEPTH } from "../config/constants";

export class Projectile {
  sprite: Phaser.GameObjects.Sprite;
  speed: number;
  damage: number;
  target: Enemy;
  private splash?: { radius: number; damagePercent: number };
  private knockback?: number;
  private bounceRemaining: number;
  private bouncedTargets: Set<Enemy>;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    weapon: WeaponDef,
    target: Enemy,
  ) {
    this.sprite = scene.add
      .sprite(x, y, weapon.projSheet)
      .setDisplaySize(weapon.projSize, weapon.projSize)
      .setDepth(DEPTH.enemy + 1);

    const angle = Math.atan2(target.sprite.y - y, target.sprite.x - x);
    this.sprite.setRotation(angle);

    if (weapon.projAnim) {
      this.sprite.play(weapon.projAnim);
    }

    this.speed = weapon.projectileSpeed;
    this.damage = weapon.damage;
    this.target = target;
    this.splash = weapon.splash;
    this.knockback = weapon.knockback;
    this.bounceRemaining = weapon.bounce ?? 0;
    this.bouncedTargets = new Set([target]);
  }

  /** Returns true when the projectile should be removed. */
  update(delta: number, enemies: Enemy[]): boolean {
    if (!this.target.sprite.active) {
      return this.tryBounce(enemies);
    }

    const dx = this.target.sprite.x - this.sprite.x;
    const dy = this.target.sprite.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 14) {
      this.applyHit(enemies);
      return true;
    }

    const step = (this.speed * delta) / 1000;
    if (dist > 0) {
      this.sprite.x += (dx / dist) * step;
      this.sprite.y += (dy / dist) * step;
    }

    return false;
  }

  private applyHit(enemies: Enemy[]): void {
    this.target.hp -= this.damage;

    if (this.splash) {
      for (const e of enemies) {
        if (e === this.target) continue;
        const ex = e.sprite.x - this.target.sprite.x;
        const ey = e.sprite.y - this.target.sprite.y;
        if (Math.sqrt(ex * ex + ey * ey) <= this.splash.radius) {
          e.hp -= this.damage * this.splash.damagePercent;
        }
      }
    }

    if (this.knockback) {
      const kx = this.target.sprite.x - this.sprite.x;
      const ky = this.target.sprite.y - this.sprite.y;
      const kd = Math.sqrt(kx * kx + ky * ky) || 1;
      this.target.sprite.x += (kx / kd) * this.knockback;
      this.target.sprite.y += (ky / kd) * this.knockback;
    }
  }

  private tryBounce(enemies: Enemy[]): boolean {
    if (this.bounceRemaining <= 0) return true;

    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e.sprite.active || this.bouncedTargets.has(e)) continue;
      const dx = e.sprite.x - this.sprite.x;
      const dy = e.sprite.y - this.sprite.y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }

    if (!best) return true;

    this.bounceRemaining--;
    this.bouncedTargets.add(best);
    this.target = best;
    const angle = Math.atan2(best.sprite.y - this.sprite.y, best.sprite.x - this.sprite.x);
    this.sprite.setRotation(angle);
    return false;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
