import Phaser from "phaser";
import { COLORS, COLOR_NUM, FONT } from "../config/constants";
import { ManifestEntry } from "../types";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.json("assets", "assets/assets.json");
  }

  create(): void {
    const manifest = this.cache.json.get("assets") as ManifestEntry;
    this.registry.set("assets", manifest);

    const { width, height } = this.scale;

    const barW = 260;
    const barH = 20;

    const bg = this.add.graphics();
    bg.fillStyle(COLOR_NUM.bootBg, 1);
    bg.fillRoundedRect(width / 2 - barW / 2, height / 2 - barH / 2, barW, barH, 6);
    bg.lineStyle(2, COLOR_NUM.bootBorder, 1);
    bg.strokeRoundedRect(width / 2 - barW / 2, height / 2 - barH / 2, barW, barH, 6);

    const fill = this.add.graphics();

    const loadingText = this.add
      .text(width / 2, height / 2 + 30, "Loading...", {
        fontFamily: FONT.family,
        fontSize: "18px",
        color: COLORS.sandText,
      })
      .setOrigin(0.5);

    const onProgress = (value: number) => {
      fill.clear();
      const fillW = (barW - 4) * value;
      if (fillW > 0) {
        fill.fillStyle(COLOR_NUM.bootFill, 1);
        fill.fillRoundedRect(
          width / 2 - barW / 2 + 2,
          height / 2 - barH / 2 + 2,
          fillW,
          barH - 4,
          4,
        );
      }
      loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
    };

    const onComplete = () => {
      this.load.off("progress", onProgress);
      this.load.off("complete", onComplete);
      loadingText.destroy();
      bg.destroy();
      fill.destroy();
      this.scene.start("TitleScene");
    };

    this.load.on("progress", onProgress);
    this.load.on("complete", onComplete);

    this.queueManifestAssets(manifest);
    this.load.start();
  }

  private queueManifestAssets(manifest: ManifestEntry): void {
    for (const sheet of manifest.spritesheets) {
      for (const anim of sheet.animations) {
        const key = `${sheet.keyPrefix}-${anim.suffix}`;
        this.load.spritesheet(key, `assets/${anim.path}`, {
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight,
          endFrame: anim.endFrame,
        });
      }
    }

    for (const img of manifest.images) {
      this.load.image(img.key, `assets/${img.path}`);
    }
  }
}
