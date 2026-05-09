import Phaser from "phaser";

export class ComboHud {
  private icon: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Graphics;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    const { width } = scene.scale;

    this.bg = scene.add.graphics();
    this.bg.setDepth(25);

    this.icon = scene.add.image(0, 0, "icon-combo");
    this.icon.setDisplaySize(24, 24);
    this.icon.setOrigin(0.5);

    this.label = scene.add.text(16, 0, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "18px",
      color: "#ffd700",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0, 0.5);

    this.container = scene.add.container(width / 2, 32, [this.bg, this.icon, this.label]);
    this.container.setDepth(25);
    this.container.setVisible(false);
  }

  show(tier: number): void {
    if (tier <= 0) {
      this.container.setVisible(false);
      return;
    }

    this.container.setVisible(true);
    this.label.setText(`Combo x${tier}`);

    const textW = this.label.width;
    const totalW = 24 + 4 + textW + 20;

    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.6);
    this.bg.fillRoundedRect(-totalW / 2, -16, totalW, 32, 8);
    this.bg.lineStyle(2, 0xffd700, 0.8);
    this.bg.strokeRoundedRect(-totalW / 2, -16, totalW, 32, 8);

    this.icon.setX(-totalW / 2 + 16);
    this.label.setX(-totalW / 2 + 34);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }
}
