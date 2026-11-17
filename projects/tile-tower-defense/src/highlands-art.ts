import Phaser from 'phaser';
import { highlandsScenery } from '../shared/config/presentation';

/** Three crisp mountain planes, cached independently from the other biomes. */
export function highlandsTextures(scene: Phaser.Scene): string[] {
  return highlandsScenery.layers.map((_, layer) => {
    const key = `highlands-ridge-${layer}`;
    if (scene.textures.exists(key)) {
      return key;
    }
    const texture = scene.textures.createCanvas(key, 640, 320)!;
    const ctx = texture.context;
    const palette = highlandsScenery.colors;
    const polygon = (points: number[][], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    };
    for (let i = 0; i < 7; i++) {
      const x = i * 112 - 32;
      const peak = 48 + ((i * 37 + layer * 43) % 92);
      const summit = x + 76;
      polygon(
        [
          [x - 42, 320],
          [x + 28, peak + 56],
          [summit, peak],
          [x + 117, peak + 51],
          [x + 192, 320],
        ],
        palette.rock[layer],
      );
      polygon(
        [
          [summit, peak],
          [x + 117, peak + 51],
          [x + 192, 320],
          [x + 82, 320],
          [x + 91, peak + 75],
        ],
        palette.shade[layer],
      );
      polygon(
        [
          [x + 28, peak + 56],
          [summit, peak],
          [x + 91, peak + 30],
          [x + 71, peak + 22],
          [x + 59, peak + 40],
          [x + 47, peak + 36],
        ],
        palette.cap[layer],
      );
      if (layer > 0) {
        polygon(
          [
            [x - 10, 320],
            [x + 33, 226],
            [x + 72, 251],
            [x + 100, 320],
          ],
          palette.moss[layer],
        );
      }
    }
    if (layer === 2) {
      for (let i = 0; i < 25; i++) {
        const x = (i * 83) % 640;
        const base = 282 + (i % 4) * 9;
        const height = 22 + (i % 5) * 8;
        polygon(
          [
            [x - 12, base],
            [x, base - height],
            [x + 12, base],
          ],
          '#354c49',
        );
        ctx.fillStyle = '#354c49';
        ctx.fillRect(x - 2, base - 8, 4, 15);
      }
    }
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return key;
  });
}
