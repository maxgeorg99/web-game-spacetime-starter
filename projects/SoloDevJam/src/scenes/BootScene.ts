import Phaser from "phaser";

interface ManifestSpritesheet {
  id: string;
  keyPrefix: string;
  frameWidth: number;
  frameHeight: number;
  animations: Array<{
    suffix: string;
    path: string;
    endFrame: number;
    frameRate: number;
    repeat: number;
  }>;
}

interface ManifestEntry {
  spritesheets: ManifestSpritesheet[];
  images: Array<{ key: string; path: string }>;
  audio: Array<{ key: string; path: string }>;
}

let baseBar: Phaser.GameObjects.Image;
let fillBar: Phaser.GameObjects.Image;
let loadingText: Phaser.GameObjects.Text;

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.json("assets", "assets/assets.json");
    this.load.image("bar-big-base", "assets/ui/bars/bigbar_base.png");
    this.load.image("bar-big-fill", "assets/ui/bars/bigbar_fill.png");
  }

  create(): void {
    const manifest = this.cache.json.get("assets") as ManifestEntry;
    this.registry.set("assets", manifest);

    const { width, height } = this.scale;

    loadingText = this.add
      .text(width / 2, height / 2 + 30, "Loading...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#e0c060",
      })
      .setOrigin(0.5);

    baseBar = this.add.image(width / 2, height / 2, "bar-big-base");
    fillBar = this.add.image(width / 2, height / 2, "bar-big-fill");

    fillBar.setDisplaySize(0, fillBar.displayHeight);

    const onProgress = (value: number) => {
      fillBar.setDisplaySize(baseBar.displayWidth * value, fillBar.displayHeight);
      loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
    };

    const onComplete = () => {
      this.load.off("progress", onProgress);
      this.load.off("complete", onComplete);
      loadingText.destroy();
      baseBar.destroy();
      fillBar.destroy();
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
