import Phaser from 'phaser';
import { volcanoScenery } from '../shared/config/presentation';

/** Small native canvases keep the backdrop's stepped silhouettes at the terrain's pixel scale. */
export function volcanoTextures(scene: Phaser.Scene) {
  const keys = ['volcano-ridge-far-v2', 'volcano-crater-v2', 'volcano-ridge-near-v2'] as const;
  for (const [layer, key] of keys.entries()) {
    if (scene.textures.exists(key)) {
      continue;
    }
    const texture = scene.textures.createCanvas(key, 640, 320)!;
    const ctx = texture.context;
    const colors = volcanoScenery.colors;
    const polygon = (color: string, points: number[][]) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach(([x, y], index) => {
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.fill();
    };
    if (layer !== 1) {
      polygon(layer === 0 ? colors.distant : colors.foreground, [
        [0, 220],
        [38, 206],
        [64, 174],
        [90, 174],
        [124, 126],
        [150, 146],
        [176, 140],
        [218, 188],
        [264, 204],
        [308, 184],
        [342, 144],
        [368, 148],
        [404, 110],
        [436, 142],
        [466, 138],
        [510, 190],
        [556, 172],
        [604, 210],
        [640, 216],
        [640, 320],
        [0, 320],
      ]);
      if (layer === 2) {
        polygon(colors.rockLit, [
          [64, 174],
          [124, 126],
          [112, 186],
          [78, 210],
          [38, 230],
        ]);
        polygon(colors.rockLit, [
          [342, 144],
          [404, 110],
          [390, 168],
          [358, 188],
          [308, 206],
        ]);
        polygon(colors.lavaShadow, [
          [470, 246],
          [492, 236],
          [538, 242],
          [552, 250],
          [520, 254],
          [486, 252],
        ]);
        polygon(colors.lava, [
          [486, 246],
          [502, 242],
          [532, 246],
          [518, 250],
        ]);
      }
    } else {
      // Broad asymmetric cone, with shadow and lit faces rather than one flat triangle.
      polygon(colors.rock, [
        [24, 302],
        [94, 258],
        [150, 198],
        [206, 138],
        [244, 72],
        [274, 62],
        [314, 68],
        [346, 58],
        [382, 76],
        [410, 134],
        [458, 194],
        [518, 246],
        [614, 302],
        [640, 320],
        [0, 320],
      ]);
      polygon(colors.rockLit, [
        [244, 72],
        [278, 90],
        [252, 154],
        [224, 184],
        [206, 230],
        [150, 260],
        [94, 298],
        [24, 302],
        [150, 198],
        [206, 138],
      ]);
      polygon(colors.rockShade, [
        [346, 80],
        [382, 76],
        [410, 134],
        [458, 194],
        [518, 246],
        [614, 302],
        [460, 282],
        [388, 202],
        [362, 140],
      ]);
      polygon(colors.facet, [
        [296, 104],
        [286, 172],
        [264, 206],
        [250, 270],
        [216, 304],
        [308, 278],
        [320, 216],
        [310, 164],
      ]);
      polygon(colors.facet, [
        [386, 150],
        [426, 212],
        [470, 240],
        [436, 234],
        [406, 200],
      ]);
      // Low-key orange halo, then a bright inner crater with a thick dark rim.
      polygon(colors.lavaShadow, [
        [242, 72],
        [270, 58],
        [346, 54],
        [384, 74],
        [370, 94],
        [296, 108],
        [252, 94],
      ]);
      polygon(colors.crater, [
        [250, 72],
        [280, 64],
        [342, 62],
        [374, 76],
        [356, 90],
        [292, 100],
        [258, 88],
      ]);
      polygon(colors.lava, [
        [266, 78],
        [290, 72],
        [338, 70],
        [358, 78],
        [340, 86],
        [294, 92],
        [272, 86],
      ]);
      polygon(colors.lavaCore, [
        [282, 78],
        [312, 74],
        [338, 76],
        [328, 82],
        [298, 86],
      ]);
      // Branched lava flow with a dark cooled crust on either side.
      const river = [
        [298, 92],
        [310, 98],
        [298, 128],
        [310, 150],
        [302, 178],
        [326, 204],
        [314, 234],
        [338, 270],
        [330, 304],
      ];
      for (const [color, width] of [
        [colors.crater, 15],
        [colors.lavaShadow, 10],
        [colors.lava, 6],
        [colors.lavaCore, 2],
      ] as const) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = 'bevel';
        ctx.beginPath();
        river.forEach(([x, y], index) => {
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      }
      polygon(colors.lavaShadow, [
        [310, 150],
        [342, 174],
        [356, 206],
        [380, 230],
        [376, 236],
        [350, 210],
        [336, 178],
        [306, 156],
      ]);
      // Sparse cooled rock shelves help the cone read at overview scale.
      for (const [x, y, width] of [
        [182, 214, 22],
        [228, 160, 14],
        [248, 248, 24],
        [372, 242, 20],
        [432, 260, 28],
        [354, 132, 12],
      ]) {
        ctx.fillStyle = colors.rockShade;
        ctx.fillRect(x, y, width, 4);
      }
    }
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  return keys;
}
