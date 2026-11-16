import Phaser from 'phaser';
import { atmosphere } from '../shared/config/presentation';

/** Presentation only: a screen-filling sky and a bounded pool of clouds below the islands. */
export class IslandAtmosphere {
  private sky: Phaser.GameObjects.Image;
  private clouds: { image: Phaser.GameObjects.Image; seed: number; layer: number }[] = [];
  private drift = 0;
  private motion = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private scene: Phaser.Scene) {
    if (!scene.textures.exists('island-sky')) {
      const texture = scene.textures.createCanvas('island-sky', 8, 256)!;
      const context = texture.context;
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, atmosphere.skyTop);
      gradient.addColorStop(0.55, atmosphere.skyMiddle);
      gradient.addColorStop(1, atmosphere.skyBottom);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 8, 256);
      texture.refresh();
    }
    for (let variant = 0; variant < 3; variant++) {
      const key = `island-cloud-${variant}`;
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
    this.sky = scene.add.image(0, 0, 'island-sky').setDepth(-1000);
    for (let i = 0; i < atmosphere.cloudCount; i++) {
      const layer = i % 3;
      this.clouds.push({
        image: scene.add
          .image(0, 0, `island-cloud-${i % 3}`)
          .setDepth(-900 + layer)
          .setAlpha([0.22, 0.34, 0.48][layer])
          .setFlipX(i % 2 === 0),
        seed: i,
        layer,
      });
    }
    this.update(0);
  }

  update(delta: number) {
    if (!this.motion.matches && !document.hidden) {
      this.drift += Math.min(delta, 100) / 1000;
    }
    const camera = this.scene.cameras.main;
    const { width, height, zoom, scrollX, scrollY } = camera;
    const left = scrollX + width / 2 - width / (2 * zoom);
    const top = scrollY + height / 2 - height / (2 * zoom);
    this.sky
      .setPosition(scrollX + width / 2, scrollY + height / 2)
      .setDisplaySize(width / zoom + 4, height / zoom + 4);
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
        .setDisplaySize(size / zoom, size / (2 * zoom));
    }
  }
}
