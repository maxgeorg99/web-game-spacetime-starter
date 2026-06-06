import Phaser from "phaser";
import { COLORS, FONT } from "../config/constants";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    const { width, height } = this.scale;

    // Full-screen start image.
    this.add
      .image(width / 2, height / 2, "ui-start")
      .setDisplaySize(width, height);

    // Start button.
    const doStart = () => this.scene.start("GameScene");

    const btn = this.add
      .image(width / 2, height / 2 + 200, "ui-btn-red")
      .setInteractive({ useHandCursor: true })
      .setDisplaySize(320, 100);
    btn.on("pointerdown", doStart);

    this.add
      .text(width / 2, height / 2 + 200, "START", {
        fontFamily: FONT.family,
        fontSize: "26px",
        color: COLORS.white,
      })
      .setOrigin(0.5);
  }
}
