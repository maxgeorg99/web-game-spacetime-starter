import Phaser from "phaser";
import { ManifestEntry } from "../types";
import { getAudioManager } from "../audio/AudioManager";

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
    bg.fillStyle(0x1a0a0a, 1);
    bg.fillRoundedRect(width / 2 - barW / 2, height / 2 - barH / 2, barW, barH, 6);
    bg.lineStyle(2, 0x3a2020, 1);
    bg.strokeRoundedRect(width / 2 - barW / 2, height / 2 - barH / 2, barW, barH, 6);

    const fill = this.add.graphics();

    const loadingText = this.add
      .text(width / 2, height / 2 + 30, "Loading...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#e0c060",
      })
      .setOrigin(0.5);

    const onProgress = (value: number) => {
      fill.clear();
      const fillW = (barW - 4) * value;
      if (fillW > 0) {
        fill.fillStyle(0xff3e3e, 1);
        fill.fillRoundedRect(width / 2 - barW / 2 + 2, height / 2 - barH / 2 + 2, fillW, barH - 4, 4);
      }
      loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
    };

    const onComplete = () => {
      this.load.off("progress", onProgress);
      this.load.off("complete", onComplete);
      loadingText.destroy();
      bg.destroy();
      fill.destroy();
      getAudioManager(this).playAmbient(this);
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

    for (const a of manifest.audio) {
      this.load.audio(a.key, `assets/${a.path}`);
    }
  }
}
