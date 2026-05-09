import Phaser from "phaser";

export class CombatScene extends Phaser.Scene {
  private playerHp = 80;
  private maxHp = 80;

  constructor() {
    super("CombatScene");
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#1a0a0a");

    const anims = this.anims;
    const manifest = this.registry.get("assets") as {
      spritesheets: Array<{
        id: string;
        keyPrefix: string;
        frameWidth: number;
        frameHeight: number;
        animations: Array<{
          suffix: string;
          path: string;
          endFrame: number;
          frameRate: number;
          repeat: number;
        }>;
      }>;
    };

    for (const sheet of manifest.spritesheets) {
      for (const animDef of sheet.animations) {
        const key = `${sheet.keyPrefix}-${animDef.suffix}`;
        if (!anims.exists(key)) {
          anims.create({
            key,
            frames: anims.generateFrameNumbers(key, {
              start: 0,
              end: animDef.endFrame,
            }),
            frameRate: animDef.frameRate,
            repeat: animDef.repeat,
          });
        }
      }
    }

    const demon = this.add.sprite(width * 0.25, height * 0.5, "char-demon-idle");
    demon.play("char-demon-idle");

    const skull = this.add.sprite(width * 0.75, height * 0.5, "enemy-skull-idle");
    skull.play("enemy-skull-idle");

    this.add
      .text(width / 2, height - 30, "Combat — Phase 2 coming soon", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#888",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 30, `Player HP: ${this.playerHp}/${this.maxHp}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#e06060",
      })
      .setOrigin(0.5);
  }
}
