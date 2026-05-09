import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, "Demon Overlord\n— bootstrap OK —", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "32px",
        color: "#e0c060",
        align: "center",
      })
      .setOrigin(0.5);
  }
}