import Phaser from "phaser";

export class HpBar {
  private base: Phaser.GameObjects.Image;
  private fill: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, baseKey: string, fillKey: string) {
    this.base = scene.add.image(x, y, baseKey);
    this.fill = scene.add.image(x, y, fillKey);

    this.label = scene.add.text(x, y, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);
  }

  setPercent(value: number): void {
    const fillWidth = this.base.displayWidth * Math.max(0, Math.min(1, value));
    this.fill.setDisplaySize(fillWidth, this.fill.displayHeight);
  }

  setText(text: string): void {
    this.label.setText(text);
  }

  setDepth(depth: number): void {
    this.base.setDepth(depth);
    this.fill.setDepth(depth);
    this.label.setDepth(depth + 1);
  }

  destroy(): void {
    this.base.destroy();
    this.fill.destroy();
    this.label.destroy();
  }
}
