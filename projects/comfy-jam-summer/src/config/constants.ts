export const TILE_SIZE = 40;
export const GRID_COLS = 20;
export const GRID_ROWS = 16;

export const ISLAND_MARGIN_X = 3;
export const ISLAND_MARGIN_Y = 3;
export const ISLAND_LEFT = ISLAND_MARGIN_X;
export const ISLAND_RIGHT = GRID_COLS - 1 - ISLAND_MARGIN_X;
export const ISLAND_TOP = ISLAND_MARGIN_Y;
export const ISLAND_BOTTOM = GRID_ROWS - 1 - ISLAND_MARGIN_Y;

// Frame indices into beach_tiles.png (20 frames per row).
export const SAND_FRAME = 148;
export const COAST_NW = 127;
export const COAST_N = 128;
export const COAST_NE = 129;
export const COAST_W = 147;
export const COAST_E = 149;
export const COAST_SW = 167;
export const COAST_S = 168;
export const COAST_SE = 169;

export const SHELL_KEYS = [
  "shell-black",
  "shell-green",
  "shell-brown",
  "shell-red",
  "shell-pink",
  "shell-yellow",
];

export const PALM_POSITIONS: [number, number][] = [
  [6, 6],
  [14, 8],
  [14, 3],
];

export type ToolMode = "none" | "build-tower" | "build-wall" | "destroy";
