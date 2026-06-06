import Phaser from "phaser";
import { COLORS, FONT } from "../config/constants";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d2840, 0x0d2840, 0x2a6b8a, 0x2a6b8a, 1);
    bg.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, height / 2 - 100, "Sandcastle TD", {
        ...FONT.title,
        color: COLORS.sandText,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 40, "Protect the Pearl", {
        fontFamily: FONT.family,
        fontSize: "24px",
        color: COLORS.subtitle,
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(width / 2, height / 2 + 60, "[ START ]", {
        fontFamily: FONT.family,
        fontSize: "32px",
        color: COLORS.white,
      })
      .setOrigin(0.5);

    startText.setInteractive({ useHandCursor: true });
    startText.on("pointerover", () => startText.setColor(COLORS.titleHover));
    startText.on("pointerout", () => startText.setColor(COLORS.white));
    startText.on("pointerdown", () => {
      this.scene.start("GameScene");
    });

    this.add
      .text(width / 2, height - 40, "Comfy Jam Summer 2025", {
        fontFamily: FONT.family,
        fontSize: "16px",
        color: COLORS.footer,
      })
      .setOrigin(0.5);
  }
}
