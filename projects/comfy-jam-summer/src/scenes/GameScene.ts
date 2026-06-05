import Phaser from "phaser";
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from "../config/constants";

const O = 0; // Ocean
const S = 1; // Sand
const C = 2; // SandCastle

const MAP: number[][] = [
  [O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O],
  [O,O,O,O,O,O,O,S,S,S,S,S,S,O,O,O,O,O,O,O],
  [O,O,O,O,S,S,S,S,S,S,S,S,S,S,S,O,O,O,O,O],
  [O,O,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,O,O,O],
  [O,O,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,O,O],
  [O,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,O],
  [O,S,S,S,S,S,S,S,S,C,S,S,S,S,S,S,S,S,S,O],
  [O,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,O],
  [O,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,O,O],
  [O,O,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,O,O],
  [O,O,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,O,O,O],
  [O,O,O,S,S,S,S,S,S,S,S,S,S,S,S,S,O,O,O,O],
  [O,O,O,O,S,S,S,S,S,S,S,S,S,S,O,O,O,O,O,O],
  [O,O,O,O,O,O,O,S,S,S,S,O,O,O,O,O,O,O,O,O],
  [O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O],
  [O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O],
];

const WATER_FRAMES = [12, 13, 14, 15];
const SAND_FRAMES = [4, 5, 6, 7, 24, 25, 26, 27, 44, 45, 46, 47, 64, 65, 66, 67];

type EdgeMask = { N: boolean; S: boolean; E: boolean; W: boolean };

function shoreFrame(mask: EdgeMask): number {
  const { N, S, E, W } = mask;
  const count = [N, S, E, W].filter(Boolean).length;

  if (count === 0) return -1; // interior sand

  // 4-sided (island tile floating in water)
  if (N && S && E && W) return Phaser.Math.Between(0, 1) ? 130 : 131;

  // 3-sided peninsulas
  if (N && S && E) return 144;  // missing W
  if (N && S && W) return 146;  // missing E
  if (N && E && W) return 128;  // missing S
  if (S && E && W) return 125;  // missing N

  // 2-sided corners
  if (N && E) return 164; // NE corner
  if (N && W) return 166; // NW corner
  if (S && E) return 124; // SE corner
  if (S && W) return 126; // SW corner

  // 1-sided straight edges
  if (N) return 128; // N edge
  if (S) return 125; // S edge
  if (E) return 146; // E edge
  if (W) return 144; // W edge

  return -1;
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create(): void {
    const { width, height } = this.scale;
    const offsetX = (width - GRID_COLS * TILE_SIZE) / 2;
    const offsetY = (height - GRID_ROWS * TILE_SIZE) / 2;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = MAP[row]?.[col] ?? O;
        const x = offsetX + col * TILE_SIZE + TILE_SIZE / 2;
        const y = offsetY + row * TILE_SIZE + TILE_SIZE / 2;

        if (tile === O) {
          const frame = WATER_FRAMES[Phaser.Math.Between(0, WATER_FRAMES.length - 1)];
          this.add.image(x, y, "tiles-sheet", frame).setDisplaySize(TILE_SIZE, TILE_SIZE);
          continue;
        }

        if (tile === C) {
          this.add.image(x, y, "tiles-sheet", 64).setDisplaySize(TILE_SIZE, TILE_SIZE);
          continue;
        }

        const mask: EdgeMask = {
          N: (MAP[row - 1]?.[col] ?? O) === O,
          S: (MAP[row + 1]?.[col] ?? O) === O,
          E: (MAP[row]?.[col + 1] ?? O) === O,
          W: (MAP[row]?.[col - 1] ?? O) === O,
        };

        const sf = shoreFrame(mask);
        if (sf >= 0) {
          this.add.image(x, y, "tiles-sheet", sf).setDisplaySize(TILE_SIZE, TILE_SIZE);
        } else {
          const frame = SAND_FRAMES[Phaser.Math.Between(0, SAND_FRAMES.length - 1)];
          this.add.image(x, y, "tiles-sheet", frame).setDisplaySize(TILE_SIZE, TILE_SIZE);
        }
      }
    }

    const hudText = this.add
      .text(width / 2, height - 20, "Protect the pearl!", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#e0d0a0",
        stroke: "#1a3a5c",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    hudText.setAlpha(0.8);
  }
}
