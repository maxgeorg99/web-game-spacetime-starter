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

// ── Design tokens ──────────────────────────────────────────────

export const COLORS = {
  sandText: "#e0d0a0",
  gold: "#ffd700",
  goldResource: "#e0c070",
  white: "#ffffff",
  brownStroke: "#3a2a10",
  blackStroke: "#000000",
  navyStroke: "#1a1a2e",
  teal: "#5a7a8a",
  footer: "#5a7a8a",
  subtitle: "#b0c0c0",
  titleHover: "#e0d0a0",
} as const;

export const COLOR_NUM = {
  teal: 0x5a9a8a,
  portraitBg: 0x98d8a0,
  dialogBg: 0x1a2a4a,
  bootBg: 0x0a1a2a,
  bootFill: 0x6ac8e0,
  bootBorder: 0x3a5070,
  highlightOk: 0x00ff00,
  highlightBad: 0xff0000,
  white: 0xffffff,
  black: 0x000000,
} as const;

export const DEPTH = {
  terrain: 0,
  decoration: 1,
  structure: 2,
  enemy: 3,
  highlight: 5,
  hud: 10,
  weaponWheelBackdrop: 19,
  weaponWheel: 20,
  dialog: 100,
} as const;

export const FONT = {
  family: '"Fredoka", system-ui, sans-serif',
  body: {
    fontFamily: '"Fredoka", system-ui, sans-serif' as string,
    fontSize: "14px" as string,
    color: COLORS.white,
  },
  hud: {
    fontFamily: '"Fredoka", system-ui, sans-serif' as string,
    fontSize: "16px" as string,
    strokeThickness: 3,
  },
  label: {
    fontFamily: '"Fredoka", system-ui, sans-serif' as string,
    fontSize: "13px" as string,
    strokeThickness: 3,
  },
  title: {
    fontFamily: '"Fredoka", system-ui, sans-serif' as string,
    fontSize: "52px" as string,
  },
} as const;
