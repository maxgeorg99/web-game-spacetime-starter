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
  DEPTH,
} from "../config/constants";
import {
  isSand,
  isInteriorSand,
  coastFrame,
  tileKey,
  gridToWorld,
} from "../utils/gridUtils";
import { BuildSystem } from "../systems/BuildSystem";
import { ShellSystem } from "../systems/ShellSystem";

export function buildIsland(
  scene: Phaser.Scene,
  buildSystem: BuildSystem,
  offsetX: number,
  offsetY: number,
  shellSystem?: ShellSystem,
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

  // Build set of cells blocked by palm trees (each palm occupies its tile + tile above + tile below).
  const palmBlocked = new Set<string>();
  for (const [col, row] of PALM_POSITIONS) {
    palmBlocked.add(tileKey(col, row));
    palmBlocked.add(tileKey(col, row - 1));
    palmBlocked.add(tileKey(col, row + 1));
  }

  // Scatter exactly 15 shells on random interior sand cells (excluding palm-blocked cells).
  const candidates: { col: number; row: number }[] = [];
  for (let row = ISLAND_TOP; row <= ISLAND_BOTTOM; row++) {
    for (let col = ISLAND_LEFT; col <= ISLAND_RIGHT; col++) {
      if (isInteriorSand(col, row) && !palmBlocked.has(tileKey(col, row))) {
        candidates.push({ col, row });
      }
    }
  }
  Phaser.Math.RND.shuffle(candidates);
  const shellCount = Math.min(15, candidates.length);
  for (let i = 0; i < shellCount; i++) {
    const { col, row } = candidates[i];
    const textureKey = Phaser.Math.RND.pick(SHELL_KEYS);
    if (shellSystem) {
      shellSystem.addShell(col, row, textureKey);
    } else {
      const { x, y } = gridToWorld(col, row, offsetX, offsetY, TILE_SIZE);
      scene.add
        .image(x, y, textureKey)
        .setDisplaySize(TILE_SIZE, TILE_SIZE)
        .setDepth(DEPTH.decoration);
    }
  }

  // Fixed palm trees.
  for (const [col, row] of PALM_POSITIONS) {
    const { x, y } = gridToWorld(col, row, offsetX, offsetY, TILE_SIZE);
    scene.add
      .image(x, y, "palm")
      .setDisplaySize(TILE_SIZE * 3, TILE_SIZE * 3)
      .setDepth(DEPTH.decoration);

    buildSystem.occupied.add(tileKey(col, row));
    buildSystem.occupied.add(tileKey(col, row - 1));
    buildSystem.occupied.add(tileKey(col, row + 1));
  }
}
