import Phaser from "phaser";
import { WEAPONS } from "../config/WeaponConfig";
import { WEAPON_COSTS } from "../logic/economy";

const WHEEL_WEAPONS: Array<{ label: string; icon: string; color: number }> = [
  { label: "volleyball", icon: WEAPONS.volleyball.icon, color: 0xf7738e },
  { label: "coconut", icon: WEAPONS.coconut.icon, color: 0x5ab9a2 },
  { label: "watergun", icon: WEAPONS.watergun.icon, color: 0x367c50 },
  { label: "bazooka", icon: WEAPONS.bazooka.icon, color: 0x702d51 },
];

const WHEEL_RADIUS = 72;

export type WeaponSelectedHandler = (label: string) => void;

export class WeaponWheel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private backdrop: Phaser.GameObjects.Zone | null = null;
  private onSelect: WeaponSelectedHandler;
  public isOpen = false;

  constructor(scene: Phaser.Scene, onSelect: WeaponSelectedHandler) {
    this.scene = scene;
    this.onSelect = onSelect;
    scene.events.on("shutdown", () => this.hide());
    scene.events.on("destroy", () => this.hide());
  }

  show(x: number, y: number): void {
    if (this.container) this.hide();

    this.isOpen = true;
    this.scene.input.setTopOnly(true);

    this.backdrop = this.scene.add
      .zone(0, 0, this.scene.scale.width, this.scene.scale.height)
      .setOrigin(0)
      .setDepth(19)
      .setInteractive();

    this.backdrop.once("pointerdown", () => this.hide());

    this.container = this.scene.add.container(x, y).setDepth(20);

    // Draw 4-quarter pie wheel.
    for (let i = 0; i < WHEEL_WEAPONS.length; i++) {
      const startAngle = (Math.PI * 2 * i) / WHEEL_WEAPONS.length - Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2) / WHEEL_WEAPONS.length;

      // Quarter slice.
      this.container.add(
        this.scene.add
          .graphics()
          .fillStyle(WHEEL_WEAPONS[i].color, 0.85)
          .slice(0, 0, WHEEL_RADIUS, startAngle, endAngle, false)
          .fillPath()
          .lineStyle(2, 0xffffff, 0.5)
          .slice(0, 0, WHEEL_RADIUS, startAngle, endAngle, false)
          .strokePath(),
      );

      // Icon in the middle of each quarter.
      const midAngle = (startAngle + endAngle) / 2;
      const iconDist = WHEEL_RADIUS * 0.55;
      const ix = Math.cos(midAngle) * iconDist;
      const iy = Math.sin(midAngle) * iconDist;

      this.container.add(
        this.scene.add.image(ix, iy, WHEEL_WEAPONS[i].icon).setDisplaySize(32, 32),
      );

      // Cost label on each slice (price → icon).
      const cost = WEAPON_COSTS[WHEEL_WEAPONS[i].label] ?? 0;
      const costDist = WHEEL_RADIUS * 0.72;
      const cx = Math.cos(midAngle) * costDist;
      const cy = Math.sin(midAngle) * costDist;

      if (cost > 0) {
        this.container.add(
          this.scene.add.text(cx - 6, cy + 1, `${cost}`, {
            fontFamily: '"Fredoka", system-ui, sans-serif',
            fontSize: "12px",
            color: "#ffd700",
            stroke: "#000000",
            strokeThickness: 2,
          }).setOrigin(1, 0.5),
        );
        this.container.add(
          this.scene.add.image(cx, cy, "icon-gold").setOrigin(0, 0.5).setDisplaySize(12, 12),
        );
      } else {
        this.container.add(
          this.scene.add.text(cx, cy + 1, "FREE", {
            fontFamily: '"Fredoka", system-ui, sans-serif',
            fontSize: "10px",
            color: "#44cc44",
            stroke: "#000000",
            strokeThickness: 2,
          }).setOrigin(0.5),
        );
      }
    }

    // Outer ring.
    this.container.add(
      this.scene.add
        .graphics()
        .lineStyle(2, 0xffffff, 0.6)
        .strokeCircle(0, 0, WHEEL_RADIUS),
    );

    // Quarter hit zones.
    for (let i = 0; i < WHEEL_WEAPONS.length; i++) {
      const midAngle =
        (Math.PI * 2 * i) / WHEEL_WEAPONS.length +
        Math.PI / WHEEL_WEAPONS.length -
        Math.PI / 2;
      const hx = Math.cos(midAngle) * (WHEEL_RADIUS / 2);
      const hy = Math.sin(midAngle) * (WHEEL_RADIUS / 2);

      const zone = this.scene.add
        .zone(hx, hy, WHEEL_RADIUS, WHEEL_RADIUS)
        .setInteractive({ useHandCursor: true });

      const idx = i;
      zone.on(
        "pointerdown",
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          this.onSelect(WHEEL_WEAPONS[idx].label);
          this.hide();
        },
      );

      this.container.add(zone);
    }
  }

  hide(): void {
    this.isOpen = false;
    this.scene.input.setTopOnly(false);
    if (this.backdrop) {
      this.backdrop.destroy();
      this.backdrop = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
