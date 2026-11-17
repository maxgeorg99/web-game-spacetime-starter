import Phaser from 'phaser';
import { OceanAtmosphere } from './OceanAtmosphere';
import { highlandsTextures } from './highlands-art';
import { volcanoTextures } from './volcano-art';
import { highlandsScenery, lavaAtmosphere, volcanoScenery } from '../shared/config/presentation';
import { biomeDef, type BiomeId } from '../shared/config/biomes';

/** Presentation only: biome-specific clouds, fireballs or underwater scenery, always behind the islands. */
export class IslandAtmosphere {
  private sky: Phaser.GameObjects.Image;
  private clouds: { image: Phaser.GameObjects.Image; seed: number; layer: number }[] = [];
  private drift = 0;
  private ocean?: OceanAtmosphere;
  private mountains: Phaser.GameObjects.Image[] = [];
  private fireballs: {
    image: Phaser.GameObjects.Image;
    trail: Phaser.GameObjects.Image[];
    seed: number;
  }[] = [];
  private motion = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(
    private scene: Phaser.Scene,
    readonly biome: BiomeId = 'sky',
  ) {
    const atmosphere = biomeDef(biome).sky;
    const skyKey = `island-sky-${biome}`;
    if (!scene.textures.exists(skyKey)) {
      const texture = scene.textures.createCanvas(skyKey, 8, 256)!;
      const context = texture.context;
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, atmosphere.skyTop);
      gradient.addColorStop(0.55, atmosphere.skyMiddle);
      gradient.addColorStop(1, atmosphere.skyBottom);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 8, 256);
      texture.refresh();
    }
    for (let variant = 0; variant < (biome === 'sky' || biome === 'highlands' ? 3 : 0); variant++) {
      const key = `island-cloud-${biome}-${variant}`;
      if (scene.textures.exists(key)) {
        continue;
      }
      // Small source silhouettes keep the stepped edges at the terrain's pixel scale.
      const texture = scene.textures.createCanvas(key, 128, 64)!;
      const context = texture.context;
      const lobes = [
        [
          [23, 38, 14],
          [44, 29, 20],
          [69, 25, 23],
          [93, 36, 17],
          [109, 42, 10],
        ],
        [
          [19, 41, 11],
          [38, 34, 17],
          [61, 24, 22],
          [84, 31, 20],
          [105, 41, 13],
        ],
        [
          [20, 37, 13],
          [43, 28, 22],
          [67, 35, 18],
          [88, 30, 20],
          [108, 40, 12],
        ],
      ][variant];
      for (const [color, offset] of [
        [atmosphere.cloudShade, 5],
        [atmosphere.cloudLight, 0],
      ] as const) {
        context.fillStyle = color;
        for (const [x, y, radius] of lobes) {
          // Horizontal strips produce deliberate pixel steps, without blurred vector edges.
          for (let dy = -radius; dy < radius; dy += 2) {
            const half = Math.floor(Math.sqrt(radius * radius - dy * dy) / 2) * 2;
            context.fillRect(x - half, y + dy + offset, half * 2, 2);
          }
        }
        context.fillRect(22, 38 + offset, 84, 12);
      }
      texture.refresh();
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.sky = scene.add.image(0, 0, skyKey).setDepth(-1000);
    for (
      let i = 0;
      i < (biome === 'sky' || biome === 'highlands' ? atmosphere.cloudCount : 0);
      i++
    ) {
      const layer = i % 3;
      this.clouds.push({
        image: scene.add
          .image(0, 0, `island-cloud-${biome}-${i % 3}`)
          .setDepth(-900 + layer)
          .setAlpha([0.22, 0.34, 0.48][layer])
          .setFlipX(i % 2 === 0),
        seed: i,
        layer,
      });
    }
    if (biome === 'volcano') {
      this.mountains = volcanoTextures(scene).map((key, index) =>
        scene.add
          .image(0, 0, key)
          .setDepth(volcanoScenery.layers[index].depth)
          .setAlpha(volcanoScenery.layers[index].alpha),
      );
      for (let seed = 0; seed < lavaAtmosphere.count; seed++) {
        const trail = Array.from({ length: lavaAtmosphere.trailCount }, () =>
          scene.add.image(0, 0, lavaAtmosphere.art).setDepth(-801).setVisible(false),
        );
        this.fireballs.push({
          image: scene.add.image(0, 0, lavaAtmosphere.art).setDepth(-800).setVisible(false),
          trail,
          seed,
        });
      }
    }
    if (biome === 'highlands') {
      this.mountains = highlandsTextures(scene).map((key, index) =>
        scene.add
          .image(0, 0, key)
          .setDepth(highlandsScenery.layers[index].depth)
          .setAlpha(highlandsScenery.layers[index].alpha),
      );
      for (const { image } of this.clouds) {
        image.setAlpha(0.12).setDepth(-910);
      }
    }
    if (biome === 'ocean') {
      this.ocean = new OceanAtmosphere(scene);
    }
    this.update(0);
  }

  destroy() {
    this.sky.destroy();
    this.ocean?.destroy();
    for (const image of this.mountains) {
      image.destroy();
    }
    for (const { image } of this.clouds) {
      image.destroy();
    }
    for (const { image, trail } of this.fireballs) {
      image.destroy();
      for (const spark of trail) {
        spark.destroy();
      }
    }
  }

  update(delta: number) {
    if (!this.motion.matches && !document.hidden) {
      this.drift += Math.min(delta, 100) / 1000;
    }
    this.ocean?.update(this.drift, this.motion.matches);
    const camera = this.scene.cameras.main;
    const { width, height, zoom, scrollX, scrollY } = camera;
    const left = scrollX + width / 2 - width / (2 * zoom);
    const top = scrollY + height / 2 - height / (2 * zoom);
    this.sky
      .setPosition(scrollX + width / 2, scrollY + height / 2)
      .setDisplaySize(width / zoom + 4, height / zoom + 4);
    // Camera-center coordinates stay stable during viewport resize. Each depth plane
    // translates and scales differently as the player pans or zooms around the world.
    const centerX = scrollX + width / 2 - 500;
    const centerY = scrollY + height / 2 - 302;
    for (const [index, image] of this.mountains.entries()) {
      const layer = (this.biome === 'highlands' ? highlandsScenery : volcanoScenery).layers[index];
      const parallax = this.motion.matches ? 0 : layer.parallax;
      const scale = this.motion.matches ? 1 : Math.pow(zoom, layer.zoomPower);
      const screenWidth = Math.max(width, height * 1.4) * layer.width * scale;
      image
        .setPosition(
          left + (width * layer.x - centerX * parallax) / zoom,
          top + (height * layer.y - centerY * parallax * 0.55) / zoom,
        )
        .setDisplaySize(screenWidth / zoom, screenWidth / 2 / zoom);
    }
    for (const { image, trail, seed } of this.fireballs) {
      const duration = lavaAtmosphere.flightSeconds + (seed % 3) * 0.25;
      const period = duration + lavaAtmosphere.pauseSeconds + (seed % 2) * 0.8;
      const phase = (this.drift + seed * 1.73) % period;
      const active = phase < duration && !this.motion.matches;
      image.setVisible(active);
      for (const spark of trail) {
        spark.setVisible(false);
      }
      if (!active) {
        continue;
      }
      const startX = width * (0.1 + seed * 0.15) - centerX * 0.16;
      const baseline = height * (0.88 + (seed % 3) * 0.05) - centerY * 0.08;
      const rise = Math.min(280, height * (0.24 + (seed % 3) * 0.06));
      const travel = Math.min(100, width * 0.1) * (seed % 2 ? -1 : 1);
      // A ballistic arc: rise, pause briefly at the apex, and fall tail-first behind the board.
      const place = (
        sprite: Phaser.GameObjects.Image,
        progress: number,
        scale: number,
        alpha: number,
      ) => {
        const x = startX + travel * progress;
        const y = baseline - 4 * rise * progress * (1 - progress);
        const angle = Math.atan2(-4 * rise * (1 - 2 * progress), travel);
        const size = lavaAtmosphere.size * (0.8 + (seed % 3) * 0.12) * scale;
        const fade = Math.min(1, progress * 12, (1 - progress) * 12);
        sprite
          .setPosition(left + x / zoom, top + y / zoom)
          .setDisplaySize(size / zoom, size / zoom)
          .setRotation(angle)
          .setAlpha(alpha * fade)
          .setVisible(true);
      };
      const progress = phase / duration;
      place(image, progress, 1, 0.85);
      for (let i = 0; i < trail.length; i++) {
        const previous = progress - (i + 1) * lavaAtmosphere.trailDelay;
        if (previous > 0) {
          place(trail[i], previous, 0.6 - i * 0.12, 0.3 - i * 0.07);
        }
      }
    }
    const wrap = (value: number, span: number) => ((value % span) + span) % span;
    for (const { image, seed, layer } of this.clouds) {
      const size =
        (160 + layer * 95 + (seed % 4) * 24) * Math.min(1.25, Math.max(0.7, width / 1200));
      const margin = size;
      const spanX = width + margin * 2;
      const spanY = height + margin;
      const parallax = this.motion.matches ? 0 : 0.035 + layer * 0.025;
      const x =
        wrap(seed * 431.7 + this.drift * (3 + layer * 3) - scrollX * parallax, spanX) - margin;
      const y = wrap(seed * 237.3 - scrollY * parallax * 0.5, spanY) - margin / 2;
      image
        .setPosition(left + x / zoom, top + y / zoom)
        .setDisplaySize(
          (size / zoom) * (this.biome === 'highlands' ? 2.5 : 1),
          size / ((this.biome === 'highlands' ? 4 : 2) * zoom),
        );
    }
  }
}
