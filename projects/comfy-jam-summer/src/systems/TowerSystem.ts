import Phaser from "phaser";
import { Tower, AimingStrategy } from "../entities/Tower";
import { Projectile } from "../entities/Projectile";
import { Enemy } from "../entities/Enemy";
import { WeaponDef, WEAPONS } from "../config/WeaponConfig";
import { TILE_SIZE, DEPTH } from "../config/constants";
import { tileKey, gridToWorld } from "../utils/gridUtils";

const WEAPON_ICON_SIZE = TILE_SIZE * 0.5;

export class TowerSystem {
  private scene: Phaser.Scene;
  private towers: Map<string, Tower> = new Map();
  private projectiles: Projectile[] = [];
  private weaponIcons: Map<string, Phaser.GameObjects.Image> = new Map();
  private gridOffsetX: number;
  private gridOffsetY: number;

  onEnemyKilled?: (x: number, y: number) => void;

  constructor(scene: Phaser.Scene, gridOffsetX: number, gridOffsetY: number) {
    this.scene = scene;
    this.gridOffsetX = gridOffsetX;
    this.gridOffsetY = gridOffsetY;
    this.createProjectileAnims();
  }

  private createProjectileAnims(): void {
    if (!this.scene.anims.exists("water-ball-fly")) {
      this.scene.anims.create({
        key: "water-ball-fly",
        frames: this.scene.anims.generateFrameNumbers("water-ball-startup"),
        frameRate: 16,
        repeat: -1,
      });
    }
    if (!this.scene.anims.exists("water-blast-fly")) {
      this.scene.anims.create({
        key: "water-blast-fly",
        frames: this.scene.anims.generateFrameNumbers("water-blast-startup"),
        frameRate: 16,
        repeat: -1,
      });
    }
  }

  addTower(col: number, row: number): Tower {
    const key = tileKey(col, row);
    if (this.towers.has(key)) return this.towers.get(key)!;

    const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
    const tower = new Tower(col, row, x, y);

    this.towers.set(key, tower);
    return tower;
  }

  removeTower(col: number, row: number): void {
    const key = tileKey(col, row);
    this.towers.delete(key);

    const icon = this.weaponIcons.get(key);
    if (icon) {
      icon.destroy();
      this.weaponIcons.delete(key);
    }
  }

  setWeapon(col: number, row: number, weaponKey: string): void {
    const key = tileKey(col, row);
    const tower = this.towers.get(key);
    if (!tower) return;

    const weapon = WEAPONS[weaponKey];
    if (!weapon) return;

    tower.setWeapon(weapon);
    this.drawWeaponIcon(col, row, weapon);
  }

  setStrategy(col: number, row: number, strategy: AimingStrategy): void {
    const key = tileKey(col, row);
    const tower = this.towers.get(key);
    if (tower) {
      tower.aimingStrategy = strategy;
    }
  }

  getTower(col: number, row: number): Tower | undefined {
    return this.towers.get(tileKey(col, row));
  }

  update(time: number, delta: number, enemies: Enemy[]): void {
    for (const tower of this.towers.values()) {
      if (!tower.weapon) continue;
      if (!tower.canFire(time)) continue;

      const target = tower.pickTarget(enemies);
      if (!target) continue;

      tower.fire(time);

      if (tower.weapon.beam) {
        this.spawnBeam(tower, target, enemies);
      } else {
        const proj = new Projectile(
          this.scene,
          tower.worldX,
          tower.worldY,
          tower.weapon,
          target,
        );
        this.projectiles.push(proj);
      }
    }

    // Remove dead enemies.
    for (const proj of this.projectiles) {
      const done = proj.update(delta, enemies);
      if (done) {
        proj.destroy();
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.sprite.active);

    // Clean up dead enemies.
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].hp <= 0 && enemies[i].sprite.active) {
        if (this.onEnemyKilled) {
          this.onEnemyKilled(enemies[i].sprite.x, enemies[i].sprite.y);
        }
        enemies[i].sprite.destroy();
      }
    }
  }

  private spawnBeam(tower: Tower, target: Enemy, _enemies: Enemy[]): void {
    const weapon = tower.weapon!;
    const dx = target.sprite.x - tower.worldX;
    const dy = target.sprite.y - tower.worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const beam = this.scene.add
      .sprite(tower.worldX, tower.worldY, weapon.projSheet)
      .setOrigin(0, 0.5)
      .setDisplaySize(dist, weapon.projSize)
      .setDepth(DEPTH.enemy + 1)
      .setRotation(Math.atan2(dy, dx));

    if (weapon.projAnim) {
      beam.play(weapon.projAnim);
    }

    // Hitscan — immediate damage + knockback.
    target.hp -= weapon.damage;

    if (weapon.knockback) {
      const kd = dist || 1;
      target.sprite.x += (dx / kd) * weapon.knockback;
      target.sprite.y += (dy / kd) * weapon.knockback;
    }

    // Remove beam after animation plays.
    this.scene.time.delayedCall(300, () => {
      beam.destroy();
    });
  }

  private drawWeaponIcon(col: number, row: number, weapon: WeaponDef): void {
    const key = tileKey(col, row);

    let icon = this.weaponIcons.get(key);
    if (icon) {
      icon.setTexture(weapon.icon);
    } else {
      const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
      icon = this.scene.add
        .image(x, y - TILE_SIZE * 0.15, weapon.icon)
        .setDisplaySize(WEAPON_ICON_SIZE, WEAPON_ICON_SIZE)
        .setDepth(DEPTH.structure + 1);
      this.weaponIcons.set(key, icon);
    }
  }
}
