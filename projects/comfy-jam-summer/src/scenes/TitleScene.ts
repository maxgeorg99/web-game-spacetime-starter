import Phaser from "phaser";

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
        fontFamily: "system-ui, sans-serif",
        fontSize: "52px",
        color: "#e0d0a0",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 40, "Protect the Pearl", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "24px",
        color: "#b0c0c0",
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(width / 2, height / 2 + 60, "[ START ]", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    startText.setInteractive({ useHandCursor: true });
    startText.on("pointerover", () => startText.setColor("#e0d0a0"));
    startText.on("pointerout", () => startText.setColor("#ffffff"));
    startText.on("pointerdown", () => {
      this.scene.start("GameScene");
    });

    this.add
      .text(width / 2, height - 40, "Comfy Jam Summer 2025", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#5a7a8a",
      })
      .setOrigin(0.5);
  }
}
