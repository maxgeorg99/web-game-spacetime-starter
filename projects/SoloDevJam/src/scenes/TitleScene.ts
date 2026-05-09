import Phaser from "phaser";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    const { width, height } = this.scale;

    const bg = this.add.image(width / 2, height / 2, "screen-title-bg");
    bg.setDisplaySize(width, height);

    this.add
      .text(width / 2, height / 2 - 60, "Demon Overlord", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        color: "#e0c060",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2, "Everything has a cost", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#c0a050",
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(width / 2, height / 2 + 80, "[ Start Run ]", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    startText.setInteractive({ useHandCursor: true });
    startText.on("pointerover", () => startText.setColor("#e0c060"));
    startText.on("pointerout", () => startText.setColor("#ffffff"));
    startText.on("pointerdown", () => {
      if (this.scene.isActive("CombatScene")) {
        this.scene.start("CombatScene");
      }
    });
  }
}
