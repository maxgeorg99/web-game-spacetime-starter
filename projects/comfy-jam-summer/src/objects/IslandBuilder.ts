import Phaser from "phaser";
import {
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  ISLAND_LEFT,
  ISLAND_RIGHT,
  ISLAND_TOP,
  ISLAND_BOTTOM,
  SAND_FRAME,
  SHELL_KEYS,
  PALM_POSITIONS,
} from "../config/constants";
import {
  isSand,
  isInteriorSand,
  coastFrame,
  tileKey,
  gridToWorld,
} from "../utils/gridUtils";
import { BuildSystem } from "../systems/BuildSystem";

export function buildIsland(
  scene: Phaser.Scene,
  buildSystem: BuildSystem,
  offsetX: number,
  offsetY: number,
): void {
  // Sand and coast tiles.
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (!isSand(col, row)) continue;

      const { x, y } = gridToWorld(col, row, offsetX, offsetY, TILE_SIZE);
      const cf = coastFrame(col, row);
      const frame = cf >= 0 ? cf : SAND_FRAME;

      scene.add
        .image(x, y, "tiles-sheet", frame)
        .setDisplaySize(TILE_SIZE, TILE_SIZE);
    }
  }

  // Scatter shells on interior sand.
  for (let row = ISLAND_TOP; row <= ISLAND_BOTTOM; row++) {
    for (let col = ISLAND_LEFT; col <= ISLAND_RIGHT; col++) {
      if (!isInteriorSand(col, row)) continue;
      if (Math.random() > 0.2) continue;

      const { x, y } = gridToWorld(col, row, offsetX, offsetY, TILE_SIZE);
      scene.add
        .image(x, y, Phaser.Math.RND.pick(SHELL_KEYS))
        .setDisplaySize(TILE_SIZE, TILE_SIZE)
        .setDepth(1);
    }
  }

  // Fixed palm trees.
  for (const [col, row] of PALM_POSITIONS) {
    const { x, y } = gridToWorld(col, row, offsetX, offsetY, TILE_SIZE);
    scene.add
      .image(x, y, "palm")
      .setDisplaySize(TILE_SIZE * 3, TILE_SIZE * 3)
      .setDepth(1);

    buildSystem.occupied.add(tileKey(col, row));
    buildSystem.occupied.add(tileKey(col, row - 1));
    buildSystem.occupied.add(tileKey(col, row + 1));
  }
}
