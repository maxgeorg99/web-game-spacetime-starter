import Phaser from "phaser";
import { RunState } from "../state/RunState";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    const { width, height } = this.scale;

    // Deep violet → blood red gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x07000e, 0x07000e, 0x2a0008, 0x2a0008, 1);
    bg.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, height / 2 - 60, "Pay in Blood", {
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
      const runState = new RunState();
      this.registry.set("runState", runState);
      this.scene.start("MapScene");
    });

    if (this.cache.audio.exists("music-title")) {
      this.sound.play("music-title", { loop: true });
    }
  }
}
