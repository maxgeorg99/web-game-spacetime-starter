import Phaser from "phaser";

export class HpBar {
  private x: number;
  private y: number;
  private w: number;
  private h: number;
  private bg: Phaser.GameObjects.Graphics;
  private fill: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.w = width;
    this.h = height;

    this.bg = scene.add.graphics();
    this.fill = scene.add.graphics();
    this.drawBg();

    this.label = scene.add.text(x, y, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);
  }

  setPercent(value: number): void {
    this.fill.clear();
    const clamped = Math.max(0, Math.min(1, value));
    const fillW = (this.w - 4) * clamped;
    this.fill.fillStyle(0xff3e3e, 1);
    this.fill.fillRoundedRect(this.x - this.w / 2 + 2, this.y - this.h / 2 + 2, fillW, this.h - 4, 4);
  }

  setText(text: string): void {
    this.label.setText(text);
  }

  setDepth(depth: number): void {
    this.bg.setDepth(depth);
    this.fill.setDepth(depth);
    this.label.setDepth(depth + 1);
  }

  destroy(): void {
    this.bg.destroy();
    this.fill.destroy();
    this.label.destroy();
  }

  private drawBg(): void {
    this.bg.clear();
    this.bg.fillStyle(0x1a0a0a, 1);
    this.bg.fillRoundedRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h, 6);
    this.bg.lineStyle(2, 0x3a2020, 1);
    this.bg.strokeRoundedRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h, 6);
  }
}
