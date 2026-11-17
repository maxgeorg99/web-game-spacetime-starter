import Phaser from 'phaser';
import { oceanScenery } from '../shared/config/presentation';

/** Bounded, decorative backdrop; never participates in gameplay or input. */
export class OceanAtmosphere {
  private layers: Phaser.GameObjects.Image[] = [];
  private bubbles: Phaser.GameObjects.Image[] = [];

  constructor(private scene: Phaser.Scene) {
    for (let layer = 0; layer < 3; layer++) {
      const key = `ocean-reef-${layer}`;
      if (!scene.textures.exists(key)) {
        const texture = scene.textures.createCanvas(key, 640, 320)!;
        const ctx = texture.context;
        const colors = oceanScenery.colors;
        ctx.fillStyle = colors.rock[layer];
        ctx.beginPath();
        ctx.moveTo(0, 320);
        for (let x = 0; x <= 640; x += 16) {
          const y = 210 + Math.sin(x * 0.017 + layer * 2) * 35 + Math.cos(x * 0.039) * 15;
          ctx.lineTo(x, Math.round(y / 4) * 4);
        }
        ctx.lineTo(640, 320);
        ctx.fill();
        for (let i = 0; i < 14; i++) {
          const x = (i * 107 + layer * 59) % 640;
          const y = 225 + Math.sin(x * 0.017 + layer * 2) * 35;
          const tall = 24 + (i % 5) * 11;
          ctx.fillStyle = i % 3 === 0 ? colors.coral[layer] : colors.kelp[layer];
          // Stepped sea fans and branching coral keep the terrain's crisp silhouette.
          ctx.fillRect(x, y - tall, 4, tall);
          for (let j = 0; j < 3; j++) {
            const branchY = y - tall + j * 12;
            const direction = (i + j) % 2 ? 1 : -1;
            ctx.fillRect(x + Math.min(0, direction * 12), branchY + 6, 16, 4);
            ctx.fillRect(x + direction * 12, branchY - 5, 4, 14);
          }
          ctx.fillStyle = colors.ledge[layer];
          ctx.fillRect(x - 12, y + 4, 28 + (i % 3) * 8, 4);
        }
        texture.refresh();
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      this.layers.push(
        scene.add
          .image(0, 0, key)
          .setDepth(-970 + layer * 20)
          .setAlpha(0.72),
      );
    }
    const rayKey = 'ocean-light-rays';
    if (!scene.textures.exists(rayKey)) {
      const texture = scene.textures.createCanvas(rayKey, 640, 320)!;
      const ctx = texture.context;
      const gradient = ctx.createLinearGradient(0, 0, 0, 320);
      gradient.addColorStop(0, '#b9e6ce55');
      gradient.addColorStop(1, '#b9e6ce00');
      ctx.fillStyle = gradient;
      for (let i = 0; i < 5; i++) {
        const x = i * 130 - 100;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 22, 0);
        ctx.lineTo(x + 190, 320);
        ctx.lineTo(x + 110, 320);
        ctx.fill();
      }
      texture.refresh();
    }
    this.layers.push(scene.add.image(0, 0, rayKey).setDepth(-980).setAlpha(0.48));
    const bubbleKey = 'ocean-bubble';
    if (!scene.textures.exists(bubbleKey)) {
      const texture = scene.textures.createCanvas(bubbleKey, 12, 12)!;
      const ctx = texture.context;
      ctx.strokeStyle = '#a9dbd3';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(6, 6, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#d9efe0';
      ctx.fillRect(3, 3, 2, 2);
      texture.refresh();
    }
    for (let i = 0; i < oceanScenery.bubbleCount; i++) {
      this.bubbles.push(scene.add.image(0, 0, bubbleKey).setDepth(-900));
    }
  }

  update(time: number, reducedMotion: boolean) {
    const { width, height, zoom, scrollX, scrollY } = this.scene.cameras.main;
    const left = scrollX + width / 2 - width / (2 * zoom);
    const top = scrollY + height / 2 - height / (2 * zoom);
    const cx = scrollX + width / 2 - 500;
    const cy = scrollY + height / 2 - 302;
    for (let i = 0; i < 3; i++) {
      const layer = oceanScenery.layers[i];
      const parallax = reducedMotion ? 0 : layer.parallax;
      const size =
        Math.max(width, height * 1.5) * layer.width * (reducedMotion ? 1 : zoom ** layer.zoomPower);
      this.layers[i]
        .setPosition(
          left + (width * layer.x - cx * parallax) / zoom,
          top + (height * layer.y - cy * parallax * 0.5) / zoom,
        )
        .setDisplaySize(size / zoom, size / 2 / zoom);
    }
    this.layers[3]
      .setPosition(left + (width * 0.5 + Math.sin(time * 0.13) * 8) / zoom, top + height / 2 / zoom)
      .setDisplaySize((width + 40) / zoom, height / zoom);
    for (let i = 0; i < this.bubbles.length; i++) {
      const span = height + 40;
      const y = span - ((i * 137 + time * (8 + (i % 4))) % span);
      const x = ((i * 233.7) % width) + Math.sin(time * 0.4 + i) * 9;
      const size = 5 + (i % 4) * 2;
      this.bubbles[i]
        .setVisible(!reducedMotion)
        .setPosition(left + x / zoom, top + y / zoom)
        .setDisplaySize(size / zoom, size / zoom)
        .setAlpha(Math.min(0.3, y / 100, (span - y) / 100));
    }
  }

  destroy() {
    for (const image of [...this.layers, ...this.bubbles]) {
      image.destroy();
    }
  }
}
